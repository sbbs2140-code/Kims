import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/exam/print-button";
import { ScoreTable, TimetableView } from "@/components/exam/schedule-view";
import { requireAdmin } from "@/lib/exam/auth";
import { currentAssignments, loadTermData, toScheduleInput } from "@/lib/exam/data";
import { checkAssignments } from "@/lib/exam/schedule";

export default async function PrintAllPage({ params }: PageProps<"/exam/admin/timetable/[termId]/print">) {
  await requireAdmin();
  const { termId } = await params;
  const d = await loadTermData(termId);
  if (!d) notFound();

  const result = checkAssignments(toScheduleInput(d), currentAssignments(d));
  const names = new Map(d.allTeachers.map((t) => [t.id, t.name]));
  const totals = result.stats.map((s) => s.total);
  const range = totals.length ? Math.max(...totals) - Math.min(...totals) : 0;

  return (
    <div className="space-y-12">
      <section className="no-print">
        <Link href={`/exam/admin/timetable/${termId}/assign`} className="text-sm font-semibold text-accent hover:underline">
          감독 편성
        </Link>
        <p className="mt-4 max-w-[40rem] text-base text-text-muted">
          전체 시간표와 점수표입니다. 인쇄 창에서 대상을 PDF로 저장으로 고르면 파일로 저장됩니다.
        </p>
        <div className="mt-6"><PrintButton /></div>
      </section>

      <section>
        <h1 className="text-3xl leading-[1.25] font-bold tracking-[-0.02em]">{d.term.name} 시험 감독 시간표</h1>
        <p className="mt-2 text-sm text-text-subtle">교사별 점수 합계의 차이는 최대 {range.toFixed(1)}점입니다.</p>
      </section>

      <section className="print-break">
        <h2 className="mb-4 text-xl font-semibold">교사별 점수</h2>
        <ScoreTable stats={result.stats} />
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold">교시별 배정</h2>
        <TimetableView slots={d.slots} assignments={d.assignments} names={names} />
      </section>
    </div>
  );
}
