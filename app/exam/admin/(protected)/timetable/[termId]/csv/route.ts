import { isAdmin } from "@/lib/exam/auth";
import { currentAssignments, loadTermData, toScheduleInput } from "@/lib/exam/data";
import { allCsv, scoresCsv, teachersCsv } from "@/lib/exam/export";
import { assertUuid } from "@/lib/exam/public";
import { checkAssignments } from "@/lib/exam/schedule";

const FILES = { all: "시간표", teachers: "교사별", scores: "점수" } as const;

export async function GET(request: Request, ctx: RouteContext<"/exam/admin/timetable/[termId]/csv">) {
  // 담당자만 내려받을 수 있다.
  if (!(await isAdmin())) return new Response("로그인이 필요합니다.", { status: 401 });

  const { termId } = await ctx.params;
  assertUuid(termId);
  const type = new URL(request.url).searchParams.get("type") as keyof typeof FILES | null;
  if (!type || !(type in FILES)) return new Response("type은 all, teachers, scores 중 하나입니다.", { status: 400 });

  const d = await loadTermData(termId);
  if (!d) return new Response("시험을 찾을 수 없습니다.", { status: 404 });

  const names = new Map(d.allTeachers.map((t) => [t.id, t.name]));
  let body: string;
  if (type === "all") body = allCsv(d.slots, d.assignments, names);
  else if (type === "teachers") body = teachersCsv(d.slots, d.assignments, d.teachers);
  else body = scoresCsv(checkAssignments(toScheduleInput(d), currentAssignments(d)).stats);

  const filename = `${d.term.name}_${FILES[type]}.csv`;
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="exam-${type}.csv"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "no-store",
    },
  });
}
