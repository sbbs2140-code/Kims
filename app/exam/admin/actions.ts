"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { login, logout, requireAdmin } from "@/lib/exam/auth";
import { db } from "@/lib/exam/db";
import { parseTeachers, parseTimetable } from "@/lib/exam/parse";

export type FormState = {
  ok?: boolean;
  message?: string;
  errors?: string[];
};

function text(fd: FormData, key: string) {
  return String(fd.get(key) ?? "").trim();
}

function fail(error: { message: string }): FormState {
  return { ok: false, message: `저장하지 못했습니다. ${error.message}` };
}

// ---------- 로그인 ----------

export async function loginAction(_: FormState, fd: FormData): Promise<FormState> {
  const result = await login(String(fd.get("password") ?? ""));
  if (!result.ok) return { ok: false, message: result.message };
  redirect("/exam/admin");
}

export async function logoutAction() {
  await logout();
  redirect("/exam/admin/login");
}

// ---------- 시험(학기) ----------

export async function createTermAction(fd: FormData) {
  await requireAdmin();
  const school_year = Number(text(fd, "school_year"));
  const semester = Number(text(fd, "semester"));
  const kind = text(fd, "kind") === "기말" ? "기말" : "중간";
  if (!school_year || (semester !== 1 && semester !== 2)) return;

  const name = `${school_year}학년도 ${semester}학기 ${kind}고사`;
  const { data, error } = await db()
    .from("exam_terms")
    .insert({ name, school_year, semester, kind })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  redirect(`/exam/admin/timetable/${data.id}`);
}

export async function deleteTermAction(fd: FormData) {
  await requireAdmin();
  await db().from("exam_terms").delete().eq("id", text(fd, "id"));
  revalidatePath("/exam/admin");
}

// ---------- 교사 ----------

function homeroom(raw: string): { grade: number | null; cls: number | null } | null {
  const s = raw.replace(/\s+/g, "");
  if (!s) return { grade: null, cls: null };
  const m = s.match(/^(\d)[-학](\d{1,2})반?$/);
  if (!m) return null;
  return { grade: Number(m[1]), cls: Number(m[2]) };
}

export async function addTeacherAction(fd: FormData) {
  await requireAdmin();
  const name = text(fd, "name");
  const hr = homeroom(text(fd, "homeroom"));
  if (!name || !hr) return;
  await db().from("exam_teachers").insert({
    name,
    homeroom_grade: hr.grade,
    homeroom_class: hr.cls,
    subject: text(fd, "subject") || null,
  });
  revalidatePath("/exam/admin/teachers");
}

export async function updateTeacherAction(fd: FormData) {
  await requireAdmin();
  const hr = homeroom(text(fd, "homeroom"));
  const name = text(fd, "name");
  if (!name || !hr) return;
  await db()
    .from("exam_teachers")
    .update({
      name,
      homeroom_grade: hr.grade,
      homeroom_class: hr.cls,
      subject: text(fd, "subject") || null,
      is_active: fd.get("is_active") === "on",
    })
    .eq("id", text(fd, "id"));
  revalidatePath("/exam/admin/teachers");
}

export async function deleteTeacherAction(fd: FormData) {
  await requireAdmin();
  await db().from("exam_teachers").delete().eq("id", text(fd, "id"));
  revalidatePath("/exam/admin/teachers");
}

export async function importTeachersAction(
  _: FormState,
  fd: FormData,
): Promise<FormState> {
  await requireAdmin();
  const { rows, errors } = parseTeachers(text(fd, "paste"));
  if (errors.length) return { ok: false, message: "고칠 곳이 있어 저장하지 않았습니다.", errors };
  if (!rows.length) return { ok: false, message: "붙여넣은 내용이 없습니다." };

  const supabase = db();
  const { data: existing, error: e1 } = await supabase
    .from("exam_teachers")
    .select("id,name");
  if (e1) return fail(e1);
  const byName = new Map((existing ?? []).map((t) => [t.name, t.id]));

  const toInsert = rows.filter((r) => !byName.has(r.name));
  const toUpdate = rows.filter((r) => byName.has(r.name));
  if (toInsert.length) {
    const { error } = await supabase.from("exam_teachers").insert(toInsert);
    if (error) return fail(error);
  }
  for (const r of toUpdate) {
    const { error } = await supabase
      .from("exam_teachers")
      .update({
        homeroom_grade: r.homeroom_grade,
        homeroom_class: r.homeroom_class,
        subject: r.subject,
      })
      .eq("id", byName.get(r.name)!);
    if (error) return fail(error);
  }
  revalidatePath("/exam/admin/teachers");
  return {
    ok: true,
    message: `새로 ${toInsert.length}명 추가, ${toUpdate.length}명 정보 갱신했습니다.`,
  };
}

// ---------- 시간표 ----------

export async function importSlotsAction(
  _: FormState,
  fd: FormData,
): Promise<FormState> {
  await requireAdmin();
  const termId = text(fd, "term_id");
  const supabase = db();

  const { data: term } = await supabase
    .from("exam_terms")
    .select("school_year")
    .eq("id", termId)
    .single();
  if (!term) return { ok: false, message: "시험 정보를 찾을 수 없습니다." };

  const { rows, errors } = parseTimetable(text(fd, "paste"), term.school_year);
  if (errors.length) return { ok: false, message: "고칠 곳이 있어 저장하지 않았습니다.", errors };
  if (!rows.length) return { ok: false, message: "붙여넣은 내용이 없습니다." };

  if (fd.get("replace") === "on") {
    const { error } = await supabase.from("exam_slots").delete().eq("term_id", termId);
    if (error) return fail(error);
  }

  const payload = rows.map((r) => ({ ...r, term_id: termId }));
  for (let i = 0; i < payload.length; i += 500) {
    const { error } = await supabase
      .from("exam_slots")
      .upsert(payload.slice(i, i + 500), {
        onConflict: "term_id,exam_date,period,grade,class_no",
      });
    if (error) return fail(error);
  }
  revalidatePath(`/exam/admin/timetable/${termId}`);
  return { ok: true, message: `학급 칸 ${rows.length}개를 저장했습니다.` };
}

export async function clearSlotsAction(fd: FormData) {
  await requireAdmin();
  const termId = text(fd, "term_id");
  await db().from("exam_slots").delete().eq("term_id", termId);
  revalidatePath(`/exam/admin/timetable/${termId}`);
}

// ---------- 설정 ----------

export async function saveSettingsAction(
  _: FormState,
  fd: FormData,
): Promise<FormState> {
  await requireAdmin();
  const n = (k: string) => Number(text(fd, k));
  const score_main = n("score_main");
  const score_sub = n("score_sub");
  const score_free = n("score_free");
  const max_day_exam = n("max_day_exam");
  const max_day_free = n("max_day_free");

  if ([score_main, score_sub, score_free].some((v) => !(v > 0 && v <= 10)))
    return { ok: false, message: "점수는 0보다 크고 10 이하로 입력해 주세요." };
  if (!(score_main >= score_sub && score_sub >= score_free))
    return { ok: false, message: "점수는 정감독 ≥ 부감독 ≥ 자율감독 순서여야 합니다." };
  if (![max_day_exam, max_day_free].every((v) => Number.isInteger(v) && v >= 1 && v <= 9))
    return { ok: false, message: "하루 한도는 1~9 사이 정수로 입력해 주세요." };

  const { error } = await db()
    .from("exam_settings")
    .update({
      score_main,
      score_sub,
      score_free,
      max_day_exam,
      max_day_free,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);
  if (error) return fail(error);
  revalidatePath("/exam/admin/settings");
  return { ok: true, message: "설정을 저장했습니다." };
}
