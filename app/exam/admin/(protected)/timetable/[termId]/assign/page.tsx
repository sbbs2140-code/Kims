import Link from "next/link";
import { notFound } from "next/navigation";
import { StatefulForm } from "@/components/exam/stateful-form";
import { requireAdmin } from "@/lib/exam/auth";
import { LABELS } from "@/lib/exam/config";
import { currentAssignments, loadTermData, toScheduleInput } from "@/lib/exam/data";
import { card, hint } from "@/lib/exam/ui";
import { checkAssignments } from "@/lib/exam/schedule";
import { autoAssignAction } from "../../../../actions";

const weekday = new Intl.DateTimeFormat("ko-KR", { weekday: "short", timeZone: "UTC" });

export default async function AssignPage({ params }: PageProps<"/exam/admin/timetable/[termId]/assign">) {
  await requireAdmin();
  const { termId } = await params;
  const d = await loadTermData(termId);
  if (!d) notFound();

  const hasAny = d.assignments.some((a) => a.teacher_id);
  const result = hasAny ? checkAssignments(toScheduleInput(d), currentAssignments(d)) : null;
  const name = new Map(d.allTeachers.map((t) => [t.id, t.name]));
  const byKey = new Map(d.assignments.map((a) => [`${a.slot_id}|${a.role}`, a]));

  const groups = new Map<string, typeof d.slots>();
  for (const s of d.slots) {
    const k = `${s.exam_date}|${s.period}`;
    groups.set(k, [...(groups.get(k) ?? []), s]);
  }

  const totals = result?.stats.map((s) => s.total) ?? [];
  const range = totals.length ? Math.max(...totals) - Math.min(...totals) : 0;
  const cell = (slotId: string, role: "main" | "sub" | "free") => {
    const a = byKey.get(`${slotId}|${role}`);
    return a?.teacher_id ? name.get(a.teacher_id) ?? "알 수 없음" : "미배정";
  };

  return (
    <div className="space-y-12">
      <section>
        <Link href={`/exam/admin/timetable/${termId}`} className="text-sm font-semibold text-accent hover:underline">
          {d.term.name} 시간표
        </Link>
        <h1 className="mt-2 text-3xl leading-[1.25] font-bold tracking-[-0.02em] lg:text-4xl">감독 편성</h1>
        <p className="mt-4 max-w-[40rem] text-base text-text-muted">
          점수 합계의 차이가 가장 작아지도록 자동으로 배정합니다. 담임 학급, 출제 과목, 불가 교시, 하루 한도, 같은 학급 반복을 모두 지킵니다.
        </p>
      </section>

      <section className={card} aria-labelledby="run">
        <h2 id="run" className="text-xl font-semibold">자동 편성</h2>
        <p className={hint}>다시 실행하면 잠기지 않은 칸은 새로 배정됩니다. 소요 시간은 몇 초입니다.</p>
        <div className="mt-6">
          <StatefulForm action={autoAssignAction} submitLabel={hasAny ? "다시 편성" : "자동 편성"}>
            <input type="hidden" name="term_id" value={termId} />
          </StatefulForm>
        </div>
      </section>

      {result && (
        <>
          {(result.violations.length > 0 || result.warnings.length > 0) && (
            <section aria-labelledby="issues" className="rounded-2xl bg-surface-tint p-6 lg:p-8">
              <h2 id="issues" className="text-xl font-semibold">확인할 내용</h2>
              {result.violations.length > 0 && (
                <>
                  <p className="mt-3 text-sm font-semibold text-accent">지키지 못한 규칙 {result.violations.length}건</p>
                  <ul className="mt-2 max-h-60 list-disc space-y-1 overflow-auto pl-5 text-sm">
                    {result.violations.slice(0, 50).map((v) => <li key={v}>{v}</li>)}
                  </ul>
                  {result.violations.length > 50 && <p className={hint}>나머지 {result.violations.length - 50}건은 표시하지 않았습니다.</p>}
                  <p className={hint}>빈 자리가 많으면 그 교시의 필요 인원이 배정 가능한 교사 수보다 많은 것입니다. 시간표의 학년 구성이나 불가 교시를 확인해 주세요.</p>
                </>
              )}
              {result.warnings.length > 0 && (
                <>
                  <p className="mt-4 text-sm font-semibold">피하지 못한 권장 규칙 {result.warnings.length}건</p>
                  <ul className="mt-2 max-h-40 list-disc space-y-1 overflow-auto pl-5 text-sm">
                    {result.warnings.slice(0, 30).map((v) => <li key={v}>{v}</li>)}
                  </ul>
                </>
              )}
            </section>
          )}

          <section aria-labelledby="fair">
            <h2 id="fair" className="text-xl font-semibold">공정성 확인</h2>
            <p className="mt-2 text-sm text-text-subtle">
              교사별 점수 합계의 차이는 최대 {range.toFixed(1)}점입니다. (이월 점수 포함, 정감독 {d.settings.score_main}, 부감독 {d.settings.score_sub}, 자율 {d.settings.score_free})
            </p>
            <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-surface">
              <table className="w-full min-w-[40rem] text-left text-sm">
                <caption className="sr-only">교사별 감독 횟수와 점수</caption>
                <thead className="border-b border-border text-text-muted">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-semibold">교사</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">{LABELS.roleMain}</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">{LABELS.roleSub}</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">{LABELS.roleFree}</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">이번 점수</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">이월</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">합계</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {result.stats.map((s) => (
                    <tr key={s.id}>
                      <th scope="row" className="px-4 py-2 font-semibold">{s.name}</th>
                      <td className="px-4 py-2 text-right">{s.main}</td>
                      <td className="px-4 py-2 text-right">{s.sub}</td>
                      <td className="px-4 py-2 text-right">{s.free}</td>
                      <td className="px-4 py-2 text-right">{s.score.toFixed(1)}</td>
                      <td className="px-4 py-2 text-right">{s.prior.toFixed(1)}</td>
                      <td className="px-4 py-2 text-right font-semibold">{s.total.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section aria-labelledby="plan">
            <h2 id="plan" className="text-xl font-semibold">교시별 배정</h2>
            <div className="mt-4 space-y-8">
              {[...groups.entries()].map(([k, list]) => {
                const [date, period] = k.split("|");
                return (
                  <div key={k}>
                    <h3 className="text-base font-semibold">
                      {Number(date.slice(5, 7))}월 {Number(date.slice(8, 10))}일 ({weekday.format(new Date(`${date}T00:00:00Z`))}) {period}교시
                    </h3>
                    <div className="mt-2 overflow-x-auto rounded-2xl border border-border bg-surface">
                      <table className="w-full min-w-[32rem] text-left text-sm">
                        <caption className="sr-only">{date} {period}교시 학급별 감독</caption>
                        <thead className="border-b border-border text-text-muted">
                          <tr>
                            <th scope="col" className="px-4 py-2 font-semibold">학급</th>
                            <th scope="col" className="px-4 py-2 font-semibold">구분</th>
                            <th scope="col" className="px-4 py-2 font-semibold">{LABELS.roleMain} / {LABELS.roleFree}</th>
                            <th scope="col" className="px-4 py-2 font-semibold">{LABELS.roleSub}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {list.map((s) => (
                            <tr key={s.id}>
                              <td className="px-4 py-2">{s.grade}학년 {s.class_no}반</td>
                              <td className="px-4 py-2">{s.kind}{s.subject ? ` (${s.subject})` : ""}</td>
                              <td className="px-4 py-2">{s.kind === "시험" ? cell(s.id, "main") : cell(s.id, "free")}</td>
                              <td className="px-4 py-2">{s.kind === "시험" ? cell(s.id, "sub") : "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
