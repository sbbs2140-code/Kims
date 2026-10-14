import { dateLabel } from "@/components/exam/schedule-view";
import { LABELS } from "@/lib/exam/config";
import type { AssignmentRow } from "@/lib/exam/data";
import type { Slot } from "@/lib/exam/db";
import { roleName, teacherRows } from "@/lib/exam/export";
import type { TeacherStat } from "@/lib/exam/schedule";
import { card } from "@/lib/exam/ui";

// 선생님 한 명의 감독표. 화면과 인쇄에 같이 쓴다.
export function TeacherSheet({
  termName,
  name,
  teacherId,
  slots,
  assignments,
  stat,
  average,
}: {
  termName: string;
  name: string;
  teacherId: string;
  slots: Slot[];
  assignments: AssignmentRow[];
  stat?: TeacherStat;
  average: number;
}) {
  const mine = teacherRows(slots, assignments, teacherId);

  return (
    <article>
      <p className="text-sm font-semibold text-text-muted">{termName}</p>
      <h2 className="mt-1 text-3xl leading-[1.25] font-bold tracking-[-0.02em]">{name} 선생님 감독표</h2>
      {stat && (
        <p className="mt-3 text-base text-text-muted">
          {LABELS.roleMain} {stat.main}회, {LABELS.roleSub} {stat.sub}회, {LABELS.roleFree} {stat.free}회. 이번 점수 {stat.score.toFixed(1)}점, 이월 포함 합계 {stat.total.toFixed(1)}점입니다. (전체 평균 {average.toFixed(1)}점)
        </p>
      )}
      {mine.length === 0 ? (
        <p className={`${card} mt-6 text-base`}>이번 시험에는 배정된 감독이 없습니다.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="w-full min-w-[32rem] text-left text-sm">
            <caption className="sr-only">{name} 선생님 감독 일정</caption>
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
    </article>
  );
}
