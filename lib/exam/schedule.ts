// 감독 자동 편성과 규칙 검사. DB와 무관한 순수 함수라서 따로 테스트할 수 있다.
import { LABELS } from "./config";

export type Role = "main" | "sub" | "free";

export type SlotIn = {
  id: string;
  exam_date: string;
  period: number;
  grade: number;
  class_no: number;
  kind: "시험" | "자율";
  subject: string | null;
};

export type TeacherIn = {
  id: string;
  name: string;
  homeroom_grade: number | null;
  homeroom_class: number | null;
  subject: string | null;
};

export type ScheduleInput = {
  slots: SlotIn[];
  teachers: TeacherIn[]; // 배정 대상(활성) 교사만
  unavailable: Set<string>; // `${teacherId}|${date}|${period}`
  scores: { main: number; sub: number; free: number };
  maxDay: { exam: number; free: number };
  prior: Map<string, number>; // 이전 시험에서 이어받은 점수
  fixed: { slotId: string; role: Role; teacherId: string }[]; // 잠긴 칸
  // 출제 과목 교사 제외 범위: period = 그 교시 전체, room = 그 과목 시험실만
  subjectRule?: "period" | "room";
  seed?: number;
  timeLimitMs?: number;
};

export type Assignment = { slotId: string; role: Role; teacherId: string | null };

export type TeacherStat = {
  id: string;
  name: string;
  main: number;
  sub: number;
  free: number;
  score: number; // 이번 시험 점수
  prior: number;
  total: number; // 이월 포함
};

export type ScheduleResult = {
  assignments: Assignment[];
  stats: TeacherStat[];
  violations: string[]; // 어긴 규칙(있으면 안 됨)
  warnings: string[]; // 피하지 못한 소프트 규칙
  unfilled: number;
};

const roleName: Record<Role, string> = {
  main: LABELS.roleMain,
  sub: LABELS.roleSub,
  free: LABELS.roleFree,
};

type Unit = {
  slotId: string;
  role: Role;
  date: string;
  period: number;
  day: number;
  ts: number;
  classId: number;
  grade: number;
  class_no: number;
  slotIdx: number;
  subject: string | null;
};

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Ctx = ReturnType<typeof build>;

function build(input: ScheduleInput) {
  const { slots, teachers } = input;
  const n = teachers.length;
  const dates = [...new Set(slots.map((s) => s.exam_date))].sort();
  const dayIdx = new Map(dates.map((d, i) => [d, i]));
  const tsKeys = [...new Set(slots.map((s) => `${s.exam_date}|${s.period}`))].sort();
  const tsIdx = new Map(tsKeys.map((k, i) => [k, i]));
  const tIdx = new Map(teachers.map((t, i) => [t.id, i]));

  const units: Unit[] = [];
  slots.forEach((s, slotIdx) => {
    const roles: Role[] = s.kind === "시험" ? ["main", "sub"] : ["free"];
    for (const role of roles) {
      units.push({
        slotId: s.id,
        role,
        date: s.exam_date,
        period: s.period,
        day: dayIdx.get(s.exam_date)!,
        ts: tsIdx.get(`${s.exam_date}|${s.period}`)!,
        classId: (s.grade - 1) * 30 + (s.class_no - 1),
        grade: s.grade,
        class_no: s.class_no,
        slotIdx,
        subject: s.kind === "시험" ? (s.subject?.trim() || null) : null,
      });
    }
  });

  const tsUnits: number[][] = tsKeys.map(() => []);
  units.forEach((u, i) => tsUnits[u.ts].push(i));

  // 해당 교시에 시험으로 출제되는 과목의 교과 교사는 그 교시 전체에서 제외한다.
  const excluded: Uint8Array[] = tsKeys.map(() => new Uint8Array(n));
  const subjectsByTs: Set<string>[] = tsKeys.map(() => new Set());
  for (const s of slots) {
    if (s.kind === "시험" && s.subject) {
      subjectsByTs[tsIdx.get(`${s.exam_date}|${s.period}`)!].add(s.subject.trim());
    }
  }
  const rule = input.subjectRule ?? "period";
  const tSubject = teachers.map((t) => t.subject?.trim() || null);
  if (rule === "period") {
    teachers.forEach((t, ti) => {
      const sub = tSubject[ti];
      if (!sub) return;
      subjectsByTs.forEach((set, ts) => {
        if (set.has(sub)) excluded[ts][ti] = 1;
      });
    });
  }

  const unavail: Uint8Array[] = tsKeys.map((k) => {
    const arr = new Uint8Array(n);
    teachers.forEach((t, ti) => {
      if (input.unavailable.has(`${t.id}|${k}`)) arr[ti] = 1;
    });
    return arr;
  });

  const homeClass = teachers.map((t) =>
    t.homeroom_grade && t.homeroom_class
      ? (t.homeroom_grade - 1) * 30 + (t.homeroom_class - 1)
      : -1,
  );

  const prior = teachers.map((t) => input.prior.get(t.id) ?? 0);
  return { n, dates, tsKeys, tIdx, units, tsUnits, excluded, unavail, homeClass, prior, input, rule, tSubject };
}

function score(ctx: Ctx, role: Role) {
  return ctx.input.scores[role];
}

type Eval = { cost: number; hard: string[]; soft: string[] };

// 규칙 위반과 공정성 점수를 한 번에 계산한다. collect가 true면 설명 문구도 만든다.
function evaluate(ctx: Ctx, assign: Int32Array, collect: boolean): Eval {
  const { n, units, tsKeys, dates, input } = ctx;
  const hard: string[] = [];
  const soft: string[] = [];
  let cost = 0;
  let hardCount = 0;
  const nd = dates.length;
  const total = ctx.prior.slice();
  const cnt = { main: new Int32Array(n), sub: new Int32Array(n), free: new Int32Array(n) };
  const examLoad = new Int32Array(n * nd);
  const freeLoad = new Int32Array(n * nd);
  const classCount = new Int16Array(n * 90);
  const seen = new Uint8Array(n * tsKeys.length);
  const pair = new Map<string, number>();
  const mainOf = new Map<number, number>();
  let unfilled = 0;

  const addHard = (msg: () => string) => {
    hardCount++;
    if (collect) hard.push(msg());
  };

  units.forEach((u, i) => {
    const ti = assign[i];
    if (ti < 0) {
      unfilled++;
      if (collect)
        hard.push(
          `${u.date} ${u.period}교시 ${u.grade}학년 ${u.class_no}반 ${roleName[u.role]} 자리가 비어 있음`,
        );
      return;
    }
    const name = () => input.teachers[ti].name;
    const where = () => `${u.date} ${u.period}교시`;
    if (ctx.unavail[u.ts][ti]) addHard(() => `${name()}: ${where()} 불가 교시에 배정됨`);
    if (seen[ti * tsKeys.length + u.ts])
      addHard(() => `${name()}: ${where()}에 두 곳 이상 배정됨`);
    seen[ti * tsKeys.length + u.ts] = 1;
    if (ctx.excluded[u.ts][ti])
      addHard(() => `${name()}: ${where()} 출제 과목 교사인데 배정됨`);
    if (ctx.rule === "room" && u.subject && ctx.tSubject[ti] === u.subject)
      addHard(() => `${name()}: ${where()} 자기 교과 시험실에 배정됨`);
    if (ctx.homeClass[ti] === u.classId)
      addHard(() => `${name()}: 담임 학급(${u.grade}학년 ${u.class_no}반) 감독에 배정됨`);

    total[ti] += score(ctx, u.role);
    cnt[u.role][ti]++;
    if (u.role === "free") freeLoad[ti * nd + u.day]++;
    else examLoad[ti * nd + u.day]++;
    classCount[ti * 90 + u.classId]++;
    if (u.role === "main") mainOf.set(u.slotIdx, ti);
    else if (u.role === "sub") {
      const m = mainOf.get(u.slotIdx);
      if (m !== undefined) {
        const key = m < ti ? `${m}|${ti}` : `${ti}|${m}`;
        pair.set(key, (pair.get(key) ?? 0) + 1);
      }
    }
  });

  for (let ti = 0; ti < n; ti++) {
    for (let d = 0; d < nd; d++) {
      const e = examLoad[ti * nd + d];
      const f = freeLoad[ti * nd + d];
      if (e > input.maxDay.exam)
        addHard(
          () => `${input.teachers[ti].name}: ${dates[d]} 정·부감독 ${e}교시 (한도 ${input.maxDay.exam})`,
        );
      if (f > input.maxDay.free)
        addHard(
          () => `${input.teachers[ti].name}: ${dates[d]} 자율감독 ${f}교시 (한도 ${input.maxDay.free})`,
        );
      const load = e + f;
      cost += load * load * 5; // 하루에 몰리지 않고 고르게 퍼지도록
      if (load >= 2) cost += (load - 1) * 20;
    }
    for (let c = 0; c < 90; c++) {
      const k = classCount[ti * 90 + c];
      if (k > 1) {
        cost += (k - 1) * 2000;
        if (collect)
          soft.push(
            `${input.teachers[ti].name}: ${Math.floor(c / 30) + 1}학년 ${(c % 30) + 1}반에 ${k}번 배정됨`,
          );
      }
    }
  }

  const mean = total.reduce((a, b) => a + b, 0) / Math.max(n, 1);
  const meanMain = cnt.main.reduce((a, b) => a + b, 0) / Math.max(n, 1);
  const meanSub = cnt.sub.reduce((a, b) => a + b, 0) / Math.max(n, 1);
  for (let ti = 0; ti < n; ti++) {
    cost += (total[ti] - mean) ** 2 * 60;
    cost += (cnt.main[ti] - meanMain) ** 2 * 25;
    cost += (cnt.sub[ti] - meanSub) ** 2 * 25;
  }
  for (const [key, k] of pair) {
    if (k > 1) {
      cost += (k - 1) * 300;
      if (collect) {
        const [a, b] = key.split("|").map(Number);
        soft.push(`${input.teachers[a].name}와 ${input.teachers[b].name}가 같은 짝으로 ${k}번 묶임`);
      }
    }
  }

  // 규칙을 어기느니 빈 자리로 남기는 쪽이 낫다.
  cost += hardCount * 10_000_000 + unfilled * 1_000_000;
  return { cost, hard, soft };
}

function greedy(ctx: Ctx, fixedAssign: Int32Array, random: () => number): Int32Array {
  const { n, units, tsUnits, tsKeys, dates, input } = ctx;
  const nd = dates.length;
  const assign = fixedAssign.slice();
  const total = ctx.prior.slice();
  const cnt = { main: new Int32Array(n), sub: new Int32Array(n), free: new Int32Array(n) };
  const examLoad = new Int32Array(n * nd);
  const freeLoad = new Int32Array(n * nd);
  const classCount = new Int16Array(n * 90);
  const busy = new Uint8Array(n * tsKeys.length);

  const place = (i: number, ti: number) => {
    const u = units[i];
    assign[i] = ti;
    total[ti] += score(ctx, u.role);
    cnt[u.role][ti]++;
    if (u.role === "free") freeLoad[ti * nd + u.day]++;
    else examLoad[ti * nd + u.day]++;
    classCount[ti * 90 + u.classId]++;
    busy[ti * tsKeys.length + u.ts] = 1;
  };
  units.forEach((_, i) => {
    if (fixedAssign[i] >= 0) place(i, fixedAssign[i]);
  });

  // 후보가 적은 교시부터 채운다.
  const order = tsUnits
    .map((list, ts) => {
      let avail = 0;
      for (let t = 0; t < n; t++) {
        if (!ctx.unavail[ts][t] && !ctx.excluded[ts][t]) avail++;
      }
      return { ts, key: avail - list.length + random() * 2 };
    })
    .sort((a, b) => a.key - b.key);

  const roleOrder: Record<Role, number> = { main: 0, sub: 1, free: 2 };
  for (const { ts } of order) {
    const list = tsUnits[ts]
      .filter((i) => assign[i] < 0)
      .sort((a, b) => roleOrder[units[a].role] - roleOrder[units[b].role] || random() - 0.5);
    for (const i of list) {
      const u = units[i];
      let best = -1;
      let bestCost = Infinity;
      for (let t = 0; t < n; t++) {
        if (ctx.unavail[ts][t] || ctx.excluded[ts][t] || busy[t * tsKeys.length + ts]) continue;
        if (ctx.homeClass[t] === u.classId) continue;
        if (ctx.rule === "room" && u.subject && ctx.tSubject[t] === u.subject) continue;
        const e = examLoad[t * nd + u.day];
        const f = freeLoad[t * nd + u.day];
        if (u.role === "free" ? f >= input.maxDay.free : e >= input.maxDay.exam) continue;
        const c =
          (total[t] + score(ctx, u.role)) * 10 +
          cnt[u.role][t] * 3 +
          (e + f) * 4 +
          classCount[t * 90 + u.classId] * 60 +
          random() * 1.5;
        if (c < bestCost) {
          bestCost = c;
          best = t;
        }
      }
      if (best >= 0) place(i, best);
    }
  }
  return assign;
}

function improve(ctx: Ctx, start: Int32Array, locked: Uint8Array, random: () => number, limitMs: number) {
  const { n, units } = ctx;
  let cur = start.slice();
  let curCost = evaluate(ctx, cur, false).cost;
  const free = units.map((_, i) => i).filter((i) => !locked[i]);
  if (free.length < 2 || n < 2) return cur;
  const deadline = Date.now() + limitMs;
  for (let it = 0; ; it++) {
    if ((it & 255) === 0 && Date.now() > deadline) break;
    const a = free[Math.floor(random() * free.length)];
    const next = cur.slice();
    if (random() < 0.5) {
      const b = free[Math.floor(random() * free.length)];
      if (a === b || cur[a] === cur[b]) continue;
      next[a] = cur[b];
      next[b] = cur[a];
    } else {
      const t = Math.floor(random() * n);
      if (t === cur[a]) continue;
      next[a] = t;
    }
    const c = evaluate(ctx, next, false).cost;
    if (c < curCost) {
      cur = next;
      curCost = c;
    }
  }
  return cur;
}

function summarize(ctx: Ctx, assign: Int32Array): TeacherStat[] {
  const { input, units } = ctx;
  const stats: TeacherStat[] = input.teachers.map((t, ti) => ({
    id: t.id,
    name: t.name,
    main: 0,
    sub: 0,
    free: 0,
    score: 0,
    prior: ctx.prior[ti],
    total: ctx.prior[ti],
  }));
  units.forEach((u, i) => {
    const ti = assign[i];
    if (ti < 0) return;
    stats[ti][u.role]++;
    stats[ti].score += score(ctx, u.role);
    stats[ti].total += score(ctx, u.role);
  });
  for (const s of stats) {
    s.score = Math.round(s.score * 100) / 100;
    s.total = Math.round(s.total * 100) / 100;
  }
  return stats;
}

function toResult(ctx: Ctx, assign: Int32Array): ScheduleResult {
  const ev = evaluate(ctx, assign, true);
  return {
    assignments: ctx.units.map((u, i) => ({
      slotId: u.slotId,
      role: u.role,
      teacherId: assign[i] >= 0 ? ctx.input.teachers[assign[i]].id : null,
    })),
    stats: summarize(ctx, assign),
    violations: ev.hard,
    warnings: ev.soft,
    unfilled: assign.filter((v) => v < 0).length,
  };
}

function fixedArrays(ctx: Ctx) {
  const index = new Map(ctx.units.map((u, i) => [`${u.slotId}|${u.role}`, i]));
  const fixedAssign = new Int32Array(ctx.units.length).fill(-1);
  const locked = new Uint8Array(ctx.units.length);
  for (const f of ctx.input.fixed) {
    const i = index.get(`${f.slotId}|${f.role}`);
    const ti = ctx.tIdx.get(f.teacherId);
    if (i === undefined || ti === undefined) continue;
    fixedAssign[i] = ti;
    locked[i] = 1;
  }
  return { fixedAssign, locked };
}

export function autoSchedule(input: ScheduleInput): ScheduleResult {
  const ctx = build(input);
  const { fixedAssign, locked } = fixedArrays(ctx);
  const seed = input.seed ?? 20260101;
  const limit = input.timeLimitMs ?? 3000;

  let best: Int32Array | null = null;
  let bestCost = Infinity;
  const tries = 25;
  for (let k = 0; k < tries; k++) {
    const g = greedy(ctx, fixedAssign, rng(seed + k * 7919));
    const c = evaluate(ctx, g, false).cost;
    if (c < bestCost) {
      best = g;
      bestCost = c;
    }
  }
  const improved = improve(ctx, best!, locked, rng(seed ^ 0x9e3779b9), limit);
  return toResult(ctx, improved);
}

// 이미 배정된 결과가 규칙을 지키는지 검사한다. (수정 화면에서 사용)
export function checkAssignments(input: ScheduleInput, list: Assignment[]): ScheduleResult {
  const ctx = build(input);
  const index = new Map(ctx.units.map((u, i) => [`${u.slotId}|${u.role}`, i]));
  const assign = new Int32Array(ctx.units.length).fill(-1);
  for (const a of list) {
    const i = index.get(`${a.slotId}|${a.role}`);
    const ti = a.teacherId ? ctx.tIdx.get(a.teacherId) : undefined;
    if (i !== undefined && ti !== undefined) assign[i] = ti;
  }
  return toResult(ctx, assign);
}
