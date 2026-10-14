import Link from "next/link";
import { PrintButton } from "@/components/exam/print-button";
import { ScoreTable, TimetableView } from "@/components/exam/schedule-view";
import { loadPublished } from "@/lib/exam/public";

export const dynamic = "force-dynamic";

export default async function AllPage({ params }: PageProps<"/exam/[termId]/all">) {
  const { termId } = await params;
  const { data, result } = await loadPublished(termId);
  const names = new Map(data.allTeachers.map((t) => [t.id, t.name]));
  const totals = result.stats.map((s) => s.total);
  const range = totals.length ? Math.max(...totals) - Math.min(...totals) : 0;

  return (
    <main className="mx-auto max-w-6xl px-4 py-16 md:px-8 lg:py-24">
      <Link href={`/exam/${termId}`} className="no-print text-sm font-semibold text-accent hover:underline">{data.term.name}</Link>
      <h1 className="mt-2 text-3xl leading-[1.25] font-bold tracking-[-0.02em] lg:text-4xl">전체 시간표와 점수</h1>
      <div className="mt-6"><PrintButton /></div>

      <section className="mt-12" aria-labelledby="fair">
        <h2 id="fair" className="text-xl font-semibold">교사별 점수</h2>
        <p className="mt-2 text-sm text-text-subtle">점수 합계의 차이는 최대 {range.toFixed(1)}점입니다. 이월은 같은 학년도 앞선 시험의 점수입니다.</p>
        <div className="mt-4"><ScoreTable stats={result.stats} /></div>
      </section>

      <section className="mt-12" aria-labelledby="plan">
        <h2 id="plan" className="text-xl font-semibold">교시별 배정</h2>
        <div className="mt-4">
          <TimetableView slots={data.slots} assignments={data.assignments} names={names} />
        </div>
      </section>
    </main>
  );
}
