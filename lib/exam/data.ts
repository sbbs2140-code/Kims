import "server-only";
import { DEFAULT_MAX_DAY, DEFAULT_SCORES } from "./config";
import { db, type Settings, type Slot, type Teacher, type Term } from "./db";
import type { Assignment, Role, ScheduleInput } from "./schedule";

const PAGE = 1000; // Supabase 기본 응답 한도

async function fetchAll<T>(
  run: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await run(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }
  return out;
}

export type AssignmentRow = {
  id: string;
  slot_id: string;
  role: Role;
  teacher_id: string | null;
  locked: boolean;
};

export type TermData = {
  term: Term;
  settings: Settings;
  slots: Slot[];
  teachers: Teacher[]; // 활성 교사만
  allTeachers: Teacher[];
  unavailable: { id: string; teacher_id: string; exam_date: string; period: number }[];
  assignments: AssignmentRow[];
  prior: Map<string, number>;
};

export async function loadTermData(termId: string): Promise<TermData | null> {
  const supabase = db();
  const { data: term } = await supabase.from("exam_terms").select("*").eq("id", termId).single();
  if (!term) return null;

  const [settingsRes, slots, allTeachers, unavailable] = await Promise.all([
    supabase.from("exam_settings").select("*").eq("id", 1).single(),
    fetchAll<Slot>((a, b) =>
      supabase.from("exam_slots").select("*").eq("term_id", termId)
        .order("exam_date").order("period").order("grade").order("class_no").range(a, b),
    ),
    fetchAll<Teacher>((a, b) => supabase.from("exam_teachers").select("*").order("name").range(a, b)),
    fetchAll<{ id: string; teacher_id: string; exam_date: string; period: number }>((a, b) =>
      supabase.from("exam_unavailable").select("id,teacher_id,exam_date,period").eq("term_id", termId).range(a, b),
    ),
  ]);

  const slotIds = new Set(slots.map((s) => s.id));
  const allAssignments = slotIds.size
    ? await fetchAll<AssignmentRow & { exam_slots: unknown }>((a, b) =>
        supabase
          .from("exam_assignments")
          .select("id,slot_id,role,teacher_id,locked,exam_slots!inner(term_id)")
          .eq("exam_slots.term_id", termId)
          .range(a, b),
      )
    : [];

  const settings: Settings = settingsRes.data ?? {
    score_main: DEFAULT_SCORES.main,
    score_sub: DEFAULT_SCORES.sub,
    score_free: DEFAULT_SCORES.free,
    max_day_exam: DEFAULT_MAX_DAY.exam,
    max_day_free: DEFAULT_MAX_DAY.free,
  };

  // 같은 학년도에서 먼저 만든 시험의 점수를 이어받는다.
  const prior = new Map<string, number>();
  const { data: earlier } = await supabase
    .from("exam_terms")
    .select("id")
    .eq("school_year", term.school_year)
    .lt("created_at", term.created_at);
  const earlierIds = (earlier ?? []).map((t) => t.id);
  if (earlierIds.length) {
    const rows = await fetchAll<{ role: Role; teacher_id: string | null; exam_slots: unknown }>(
      (a, b) =>
        supabase
          .from("exam_assignments")
          .select("role,teacher_id,exam_slots!inner(term_id)")
          .in("exam_slots.term_id", earlierIds)
          .range(a, b),
    );
    const w = { main: settings.score_main, sub: settings.score_sub, free: settings.score_free };
    for (const r of rows) {
      if (r.teacher_id) prior.set(r.teacher_id, (prior.get(r.teacher_id) ?? 0) + w[r.role]);
    }
  }

  return {
    term: term as Term,
    settings,
    slots,
    teachers: allTeachers.filter((t) => t.is_active),
    allTeachers,
    unavailable,
    assignments: allAssignments.map(({ id, slot_id, role, teacher_id, locked }) => ({
      id, slot_id, role, teacher_id, locked,
    })),
    prior,
  };
}

export function toScheduleInput(d: TermData, extra: Partial<ScheduleInput> = {}): ScheduleInput {
  return {
    slots: d.slots,
    teachers: d.teachers,
    unavailable: new Set(d.unavailable.map((u) => `${u.teacher_id}|${u.exam_date}|${u.period}`)),
    scores: { main: d.settings.score_main, sub: d.settings.score_sub, free: d.settings.score_free },
    maxDay: { exam: d.settings.max_day_exam, free: d.settings.max_day_free },
    prior: d.prior,
    fixed: d.assignments
      .filter((a) => a.locked && a.teacher_id)
      .map((a) => ({ slotId: a.slot_id, role: a.role, teacherId: a.teacher_id! })),
    ...extra,
  };
}

export function currentAssignments(d: TermData): Assignment[] {
  return d.assignments.map((a) => ({ slotId: a.slot_id, role: a.role, teacherId: a.teacher_id }));
}
