import Link from "next/link";
import { notFound } from "next/navigation";
import { StatefulForm } from "@/components/exam/stateful-form";
import { requireAdmin } from "@/lib/exam/auth";
import { loadTermData } from "@/lib/exam/data";
import { card } from "@/lib/exam/ui";
import { saveUnavailableAction } from "../../../../actions";

const weekday = new Intl.DateTimeFormat("ko-KR", { weekday: "short", timeZone: "UTC" });

export default async function UnavailablePage({ params }: PageProps<"/exam/admin/timetable/[termId]/unavailable">) {
  await requireAdmin();
  const { termId } = await params;
  const d = await loadTermData(termId);
  if (!d) notFound();

  const cols = [...new Map(d.slots.map((s) => [`${s.exam_date}|${s.period}`, s])).values()].map((s) => ({
    key: `${s.exam_date}|${s.period}`,
    date: s.exam_date,
    period: s.period,
  }));
  const checked = new Set(d.unavailable.map((u) => `${u.teacher_id}|${u.exam_date}|${u.period}`));

  return (
    <div className="space-y-8">
      <section>
        <Link href={`/exam/admin/timetable/${termId}`} className="text-sm font-semibold text-accent hover:underline">
          {d.term.name} 시간표
        </Link>
        <h1 className="mt-2 text-3xl leading-[1.25] font-bold tracking-[-0.02em] lg:text-4xl">불가 교시 입력</h1>
        <p className="mt-4 max-w-[40rem] text-base text-text-muted">
          연수, 출장, 휴가처럼 감독을 설 수 없는 교시에 체크합니다. 체크한 교시에는 배정하지 않습니다. 한 번 저장하면 체크하지 않은 칸은 해제됩니다.
        </p>
      </section>

      {cols.length === 0 || d.teachers.length === 0 ? (
        <p className="text-base text-text-muted">시간표와 교사 명단이 모두 있어야 입력할 수 있습니다.</p>
      ) : (
        <section className={card}>
          <StatefulForm action={saveUnavailableAction} submitLabel="불가 교시 저장">
            <input type="hidden" name="term_id" value={termId} />
            <div className="max-h-[70vh] overflow-auto rounded-xl border border-border">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">교사별 불가 교시 선택표</caption>
                <thead className="sticky top-0 z-10 bg-surface">
                  <tr className="border-b border-border">
                    <th scope="col" className="sticky left-0 z-20 bg-surface px-4 py-3 font-semibold">교사</th>
                    {cols.map((c) => (
                      <th key={c.key} scope="col" className="px-3 py-3 text-center font-semibold whitespace-nowrap">
                        {Number(c.date.slice(5, 7))}/{Number(c.date.slice(8, 10))}
                        ({weekday.format(new Date(`${c.date}T00:00:00Z`))})
                        <span className="block text-xs font-normal text-text-subtle">{c.period}교시</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {d.teachers.map((t) => (
                    <tr key={t.id}>
                      <th scope="row" className="sticky left-0 bg-surface px-4 py-2 font-semibold whitespace-nowrap">
                        {t.name}
                        {t.homeroom_grade ? (
                          <span className="ml-2 text-xs font-normal text-text-subtle">
                            {t.homeroom_grade}-{t.homeroom_class}
                          </span>
                        ) : null}
                      </th>
                      {cols.map((c) => {
                        const v = `${t.id}|${c.key}`;
                        return (
                          <td key={c.key} className="px-3 py-2 text-center">
                            <input
                              type="checkbox"
                              name="u"
                              value={v}
                              defaultChecked={checked.has(v)}
                              aria-label={`${t.name} ${c.date} ${c.period}교시 불가`}
                              className="size-5 accent-[var(--color-accent)]"
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </StatefulForm>
        </section>
      )}
    </div>
  );
}
