import { LABELS } from "./config";
import type { AssignmentRow } from "./data";
import type { Slot } from "./db";
import type { Role, TeacherStat } from "./schedule";

export const roleName: Record<Role, string> = {
  main: LABELS.roleMain,
  sub: LABELS.roleSub,
  free: LABELS.roleFree,
};

// 한 교사가 맡은 칸을 날짜, 교시 순으로 모은다.
export function teacherRows(slots: Slot[], assignments: AssignmentRow[], teacherId: string) {
  const slotById = new Map(slots.map((s) => [s.id, s]));
  return assignments
    .filter((a) => a.teacher_id === teacherId)
    .flatMap((a) => {
      const s = slotById.get(a.slot_id);
      return s ? [{ a, s }] : [];
    })
    .sort((x, y) => x.s.exam_date.localeCompare(y.s.exam_date) || x.s.period - y.s.period);
}

type Cell = string | number | null | undefined;

// 엑셀에서 열 때 한글이 깨지지 않도록 BOM을 붙이고, 수식으로 읽히는 시작 문자는 막는다.
export function toCsv(rows: Cell[][]): string {
  const esc = (v: Cell) => {
    let s = v === null || v === undefined ? "" : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "﻿" + rows.map((r) => r.map(esc).join(",")).join("\r\n") + "\r\n";
}

export function allCsv(slots: Slot[], assignments: AssignmentRow[], names: Map<string, string>) {
  const get = (slotId: string, role: Role) => {
    const a = assignments.find((x) => x.slot_id === slotId && x.role === role);
    return a?.teacher_id ? (names.get(a.teacher_id) ?? "") : "";
  };
  const rows: Cell[][] = [
    ["날짜", "교시", "학년", "반", "구분", "과목", "장소", LABELS.roleMain + "/" + LABELS.roleFree, LABELS.roleSub],
  ];
  for (const s of slots) {
    rows.push([
      s.exam_date,
      s.period,
      s.grade,
      s.class_no,
      s.kind,
      s.subject,
      s.place,
      get(s.id, s.kind === "시험" ? "main" : "free"),
      s.kind === "시험" ? get(s.id, "sub") : "",
    ]);
  }
  return toCsv(rows);
}

export function teachersCsv(
  slots: Slot[],
  assignments: AssignmentRow[],
  teachers: { id: string; name: string }[],
) {
  const rows: Cell[][] = [["교사", "날짜", "교시", "역할", "학년", "반", "구분", "과목", "장소"]];
  for (const t of teachers) {
    for (const { a, s } of teacherRows(slots, assignments, t.id)) {
      rows.push([t.name, s.exam_date, s.period, roleName[a.role], s.grade, s.class_no, s.kind, s.subject, s.place]);
    }
  }
  return toCsv(rows);
}

export function scoresCsv(stats: TeacherStat[]) {
  const rows: Cell[][] = [
    ["교사", LABELS.roleMain, LABELS.roleSub, LABELS.roleFree, "이번 점수", "이월", "합계"],
  ];
  for (const s of stats) rows.push([s.name, s.main, s.sub, s.free, s.score, s.prior, s.total]);
  return toCsv(rows);
}
