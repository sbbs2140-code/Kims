import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/exam/print-button";
import { TeacherSheet } from "@/components/exam/teacher-sheet";
import { requireAdmin } from "@/lib/exam/auth";
import { currentAssignments, loadTermData, toScheduleInput } from "@/lib/exam/data";
import { checkAssignments } from "@/lib/exam/schedule";

export default async function PrintTeachersPage({ params }: PageProps<"/exam/admin/timetable/[termId]/print/teachers">) {
  await requireAdmin();
  const { termId } = await params;
  const d = await loadTermData(termId);
  if (!d) notFound();

  const result = checkAssignments(toScheduleInput(d), currentAssignments(d));
  const totals = result.stats.map((s) => s.total);
  const average = totals.length ? totals.reduce((a, b) => a + b, 0) / totals.length : 0;
  const statById = new Map(result.stats.map((s) => [s.id, s]));

  return (
    <div>
      <section className="no-print mb-12">
        <Link href={`/exam/admin/timetable/${termId}/assign`} className="text-sm font-semibold text-accent hover:underline">
          감독 편성
        </Link>
        <p className="mt-4 max-w-[40rem] text-base text-text-muted">
          선생님 {d.teachers.length}명의 감독표가 한 명당 한 장씩 나옵니다. 인쇄 창에서 대상을 PDF로 저장으로 고르면 한 파일로 저장됩니다.
        </p>
        <div className="mt-6"><PrintButton label="전체 인쇄 또는 PDF 저장" /></div>
      </section>

      {d.teachers.map((t) => (
        <div key={t.id} className="print-break mb-16 print:mb-0">
          <TeacherSheet
            termName={d.term.name}
            name={t.name}
            teacherId={t.id}
            slots={d.slots}
            assignments={d.assignments}
            stat={statById.get(t.id)}
            average={average}
          />
        </div>
      ))}
    </div>
  );
}
