import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/exam/print-button";
import { TeacherSheet } from "@/components/exam/teacher-sheet";
import { assertUuid, loadPublished } from "@/lib/exam/public";

export const dynamic = "force-dynamic";

export default async function MyPage({ params }: PageProps<"/exam/[termId]/t/[teacherId]">) {
  const { termId, teacherId } = await params;
  assertUuid(teacherId);
  const { data, result } = await loadPublished(termId);
  const me = data.teachers.find((t) => t.id === teacherId);
  if (!me) notFound();

  const totals = result.stats.map((s) => s.total);
  const average = totals.length ? totals.reduce((a, b) => a + b, 0) / totals.length : 0;

  return (
    <main className="mx-auto max-w-4xl px-4 py-16 md:px-8 lg:py-24">
      <Link href={`/exam/${termId}`} className="no-print text-sm font-semibold text-accent hover:underline">
        {data.term.name}
      </Link>
      <div className="mt-2">
        <TeacherSheet
          termName={data.term.name}
          name={me.name}
          teacherId={teacherId}
          slots={data.slots}
          assignments={data.assignments}
          stat={result.stats.find((s) => s.id === teacherId)}
          average={average}
        />
      </div>
      <div className="mt-8">
        <PrintButton />
      </div>
    </main>
  );
}
