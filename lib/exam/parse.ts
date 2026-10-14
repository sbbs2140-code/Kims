import { CLASSES_PER_GRADE, MAX_PERIOD } from "./config";

export type SlotKind = "시험" | "자율";

export type ParsedSlot = {
  exam_date: string; // YYYY-MM-DD
  period: number;
  grade: number;
  class_no: number;
  kind: SlotKind;
  subject: string | null;
  place: string | null;
};

export type ParsedTeacher = {
  name: string;
  homeroom_grade: number | null;
  homeroom_class: number | null;
  subject: string | null;
};

export type ParseResult<T> = { rows: T[]; errors: string[] };

function splitLine(line: string): string[] {
  const sep = line.includes("\t") ? "\t" : line.includes(",") ? "," : null;
  const cells = sep ? line.split(sep) : line.split(/\s{2,}/);
  return cells.map((c) => c.trim());
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function validDate(y: number, m: number, d: number) {
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
  );
}

// 2026-11-03, 2026.11.3, 2026/11/3, 11/3, 11.3, 11월 3일 모두 허용한다.
// 연도가 없으면 학년도 기준으로 3~12월은 같은 해, 1~2월은 다음 해로 본다.
export function parseDate(raw: string, schoolYear: number): string | null {
  const s = raw.replace(/\(.*?\)/g, "").replace(/\s+/g, "").replace(/\.$/, "");
  let m = s.match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})$/);
  if (m) {
    const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
    return validDate(y, mo, d) ? `${y}-${pad(mo)}-${pad(d)}` : null;
  }
  m = s.match(/^(\d{1,2})[./-](\d{1,2})$/) ?? s.match(/^(\d{1,2})월(\d{1,2})일?$/);
  if (m) {
    const [mo, d] = [Number(m[1]), Number(m[2])];
    const y = mo >= 3 ? schoolYear : schoolYear + 1;
    return validDate(y, mo, d) ? `${y}-${pad(mo)}-${pad(d)}` : null;
  }
  return null;
}

// '전체', '3', '3반', '1-5', '1,3,5', '1-5,8' 를 학급 번호 목록으로 바꾼다.
export function parseClasses(raw: string, grade: number): number[] | null {
  const max = CLASSES_PER_GRADE[grade];
  const s = raw.replace(/\s+/g, "").replace(/반/g, "");
  if (s === "" || s === "전체" || s === "전학급") {
    return Array.from({ length: max }, (_, i) => i + 1);
  }
  const out = new Set<number>();
  for (const part of s.split(/[,;]/)) {
    const r = part.match(/^(\d+)[-~](\d+)$/);
    if (r) {
      const [a, b] = [Number(r[1]), Number(r[2])];
      if (a > b) return null;
      for (let i = a; i <= b; i++) out.add(i);
    } else if (/^\d+$/.test(part)) {
      out.add(Number(part));
    } else {
      return null;
    }
  }
  const list = [...out].sort((a, b) => a - b);
  if (list.length === 0 || list.some((n) => n < 1 || n > max)) return null;
  return list;
}

function num(raw: string, suffix: string): number | null {
  const s = raw.replace(/\s+/g, "").replace(suffix, "");
  return /^\d+$/.test(s) ? Number(s) : null;
}

// 시간표 붙여넣기: 날짜, 교시, 학년, 반, 구분, 과목, 장소(선택)
export function parseTimetable(
  text: string,
  schoolYear: number,
): ParseResult<ParsedSlot> {
  const rows: ParsedSlot[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();

  text.split(/\r?\n/).forEach((line, idx) => {
    if (!line.trim()) return;
    const no = idx + 1;
    const c = splitLine(line);
    if (idx === 0 && /날짜|교시|학년/.test(c[0] + (c[1] ?? "") + (c[2] ?? ""))) return;
    if (c.length < 5) {
      errors.push(`${no}행: 칸이 부족함 (날짜, 교시, 학년, 반, 구분 필요)`);
      return;
    }
    const date = parseDate(c[0], schoolYear);
    const period = num(c[1], "교시");
    const grade = num(c[2], "학년");
    const kindRaw = c[4].replace(/\s+/g, "");
    const kind: SlotKind | null = kindRaw.startsWith("시험")
      ? "시험"
      : kindRaw.startsWith("자율")
        ? "자율"
        : null;

    if (!date) return void errors.push(`${no}행: 날짜를 읽을 수 없음 (${c[0]})`);
    if (period === null || period < 1 || period > MAX_PERIOD)
      return void errors.push(`${no}행: 교시는 1~${MAX_PERIOD} (${c[1]})`);
    if (grade === null || !CLASSES_PER_GRADE[grade])
      return void errors.push(`${no}행: 학년은 1~3 (${c[2]})`);
    if (!kind) return void errors.push(`${no}행: 구분은 시험 또는 자율 (${c[4]})`);
    const classes = parseClasses(c[3], grade);
    if (!classes)
      return void errors.push(
        `${no}행: 반을 읽을 수 없음 (${c[3]}). 예: 전체, 3, 1-5, 1,3,5`,
      );

    const subject = c[5]?.trim() || null;
    const place = c[6]?.trim() || null;
    for (const class_no of classes) {
      const key = `${date}|${period}|${grade}|${class_no}`;
      if (seen.has(key)) {
        errors.push(`${no}행: ${grade}학년 ${class_no}반이 같은 교시에 중복됨`);
        continue;
      }
      seen.add(key);
      rows.push({ exam_date: date, period, grade, class_no, kind, subject, place });
    }
  });

  return { rows, errors };
}

// 교사 명단 붙여넣기: 이름, 담임(예: 2-3), 출제교과(선택)
export function parseTeachers(text: string): ParseResult<ParsedTeacher> {
  const rows: ParsedTeacher[] = [];
  const errors: string[] = [];
  const names = new Set<string>();

  text.split(/\r?\n/).forEach((line, idx) => {
    if (!line.trim()) return;
    const no = idx + 1;
    const c = splitLine(line);
    if (idx === 0 && c[0] === "이름") return;
    const name = c[0];
    if (!name) return void errors.push(`${no}행: 이름이 비어 있음`);
    if (names.has(name)) return void errors.push(`${no}행: 이름이 중복됨 (${name})`);
    names.add(name);

    let homeroom_grade: number | null = null;
    let homeroom_class: number | null = null;
    const hr = (c[1] ?? "").replace(/\s+/g, "");
    if (hr && hr !== "-" && hr !== "없음") {
      const m = hr.match(/^(\d)[-학](\d{1,2})반?$/);
      const g = m ? Number(m[1]) : 0;
      const k = m ? Number(m[2]) : 0;
      if (!m || !CLASSES_PER_GRADE[g] || k < 1 || k > CLASSES_PER_GRADE[g]) {
        return void errors.push(`${no}행: 담임 학급을 읽을 수 없음 (${c[1]}). 예: 2-3`);
      }
      homeroom_grade = g;
      homeroom_class = k;
    }
    rows.push({ name, homeroom_grade, homeroom_class, subject: c[2]?.trim() || null });
  });

  return { rows, errors };
}
