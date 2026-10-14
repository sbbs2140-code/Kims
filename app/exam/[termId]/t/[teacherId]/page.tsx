import Link from "next/link";
import { notFound } from "next/navigation";
import { dateLabel } from "@/components/exam/schedule-view";
import { LABELS } from "@/lib/exam/config";
import { assertUuid, loadPublished } from "@/lib/exam/public";
import { card } from "@/lib/exam/ui";

export const dynamic = "force-dynamic";

export default async function MyPage({ params }: PageProps<"/exam/[termId]/t/[teacherId]">) {
  const { termId, teacherId } = await params;
  assertUuid(teacherId);
  const { data, result } = await loadPublished(termId);
  const me = data.teachers.find((t) => t.id === teacherId);
  if (!me) notFound();

  const slotById = new Map(data.slots.map((s) => [s.id, s]));
  const roleName = { main: LABELS.roleMain, sub: LABELS.roleSub, free: LABELS.roleFree };
  const mine = data.assignments
    .filter((a) => a.teacher_id === teacherId)
    .flatMap((a) => {
      const s = slotById.get(a.slot_id);
      return s ? [{ a, s }] : [];
    })
    .sort((x, y) => x.s.exam_date.localeCompare(y.s.exam_date) || x.s.period - y.s.period);

  const stat = result.stats.find((s) => s.id === teacherId);
  const totals = result.stats.map((s) => s.total);
  const avg = totals.length ? totals.reduce((a, b) => a + b, 0) / totals.length : 0;

  return (
    <main className="mx-auto max-w-4xl px-4 py-16 md:px-8 lg:py-24">
      <Link href={`/exam/${termId}`} className="text-sm font-semibold text-accent hover:underline">{data.term.name}</Link>
      <h1 className="mt-2 text-3xl leading-[1.25] font-bold tracking-[-0.02em] lg:text-4xl">{me.name} 선생님 감독표</h1>

      {stat && (
        <p className="mt-4 text-base text-text-muted">
          {LABELS.roleMain} {stat.main}회, {LABELS.roleSub} {stat.sub}회, {LABELS.roleFree} {stat.free}회. 이번 점수 {stat.score.toFixed(1)}점, 이월 포함 합계 {stat.total.toFixed(1)}점입니다. (전체 평균 {avg.toFixed(1)}점)
        </p>
      )}

      {mine.length === 0 ? (
        <p className={`${card} mt-8 text-base`}>이번 시험에는 배정된 감독이 없습니다.</p>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="w-full min-w-[32rem] text-left text-sm">
            <caption className="sr-only">내 감독 일정</caption>
            <thead className="border-b border-border text-text-muted">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">날짜</th>
                <th scope="col" className="px-4 py-3 font-semibold">교시</th>
                <th scope="col" className="px-4 py-3 font-semibold">역할</th>
                <th scope="col" className="px-4 py-3 font-semibold">학급</th>
                <th scope="col" className="px-4 py-3 font-semibold">내용</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {mine.map(({ a, s }) => (
                <tr key={a.id}>
                  <td className="px-4 py-3">{dateLabel(s.exam_date)}</td>
                  <td className="px-4 py-3">{s.period}교시</td>
                  <td className="px-4 py-3 font-semibold">
                    {roleName[a.role]}
                    {a.changed_after_publish && <span className="ml-2 rounded-full border border-border px-2 py-0.5 text-xs">변경됨</span>}
                  </td>
                  <td className="px-4 py-3">{s.grade}학년 {s.class_no}반</td>
                  <td className="px-4 py-3">{s.kind}{s.subject ? ` (${s.subject})` : ""}{s.place ? `, ${s.place}` : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
