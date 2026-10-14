import Link from "next/link";
import { notFound } from "next/navigation";
import { ScoreTable, TimetableView } from "@/components/exam/schedule-view";
import { StatefulForm } from "@/components/exam/stateful-form";
import { requireAdmin } from "@/lib/exam/auth";
import { currentAssignments, loadTermData, toScheduleInput } from "@/lib/exam/data";
import { checkAssignments } from "@/lib/exam/schedule";
import { btnPrimary, btnSecondary, card, hint } from "@/lib/exam/ui";
import { autoAssignAction, lockAllAction, togglePublishAction } from "../../../../actions";

export default async function AssignPage({ params }: PageProps<"/exam/admin/timetable/[termId]/assign">) {
  await requireAdmin();
  const { termId } = await params;
  const d = await loadTermData(termId);
  if (!d) notFound();

  const hasAny = d.assignments.some((a) => a.teacher_id);
  const result = hasAny ? checkAssignments(toScheduleInput(d), currentAssignments(d)) : null;
  const names = new Map(d.allTeachers.map((t) => [t.id, t.name]));
  const totals = result?.stats.map((s) => s.total) ?? [];
  const range = totals.length ? Math.max(...totals) - Math.min(...totals) : 0;
  const lockedCount = d.assignments.filter((a) => a.locked).length;
  const changedCount = d.assignments.filter((a) => a.changed_after_publish).length;

  return (
    <div className="space-y-12">
      <section>
        <Link href={`/exam/admin/timetable/${termId}`} className="text-sm font-semibold text-accent hover:underline">
          {d.term.name} 시간표
        </Link>
        <h1 className="mt-2 text-3xl leading-[1.25] font-bold tracking-[-0.02em] lg:text-4xl">감독 편성</h1>
        <p className="mt-4 max-w-[40rem] text-base text-text-muted">
          점수 합계의 차이가 가장 작아지도록 자동으로 배정합니다. 담임 학급, 출제 과목, 불가 교시, 하루 한도, 같은 학급 반복을 지킵니다.
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

      {hasAny && (
        <section className={card} aria-labelledby="publish">
          <h2 id="publish" className="text-xl font-semibold">교사에게 공개</h2>
          <p className="mt-2 text-base text-text-muted">
            현재 <strong>{d.term.published ? "공개 중" : "비공개"}</strong>입니다.
            {d.term.published
              ? ` 공개한 뒤 바뀐 칸이 ${changedCount}개 있고, 교사 화면에 변경됨으로 표시됩니다.`
              : " 공개하면 선생님들이 /exam 에서 이름을 골라 감독표를 볼 수 있습니다."}
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <form action={togglePublishAction}>
              <input type="hidden" name="term_id" value={termId} />
              <input type="hidden" name="publish" value={d.term.published ? "0" : "1"} />
              <button type="submit" className={d.term.published ? btnSecondary : btnPrimary}>
                {d.term.published ? "공개 중지" : "공개하기"}
              </button>
            </form>
            <form action={lockAllAction}>
              <input type="hidden" name="term_id" value={termId} />
              <input type="hidden" name="lock" value={lockedCount > 0 ? "0" : "1"} />
              <button type="submit" className={btnSecondary}>
                {lockedCount > 0 ? `잠금 모두 풀기 (${lockedCount}칸)` : "배정된 칸 모두 잠그기"}
              </button>
            </form>
          </div>
          <p className={hint}>공개한 뒤 사정이 생기면 발표한 칸은 잠그고, 바뀐 곳만 다시 편성하세요.</p>
        </section>
      )}

      {hasAny && (
        <section className={card} aria-labelledby="output">
          <h2 id="output" className="text-xl font-semibold">출력</h2>
          <p className={hint}>인쇄 화면에서 대상을 PDF로 저장으로 고르면 PDF 파일이 됩니다. 엑셀 파일은 한글 문서에 붙여넣기 쉽게 표 형태로 내려받습니다.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={`/exam/admin/timetable/${termId}/print`} className={btnSecondary}>전체 시간표 인쇄</Link>
            <Link href={`/exam/admin/timetable/${termId}/print/teachers`} className={btnSecondary}>교사별 감독표 인쇄</Link>
          </div>
          <div className="mt-3 flex flex-wrap gap-3">
            <a href={`/exam/admin/timetable/${termId}/csv?type=all`} className={btnSecondary}>엑셀 전체 시간표</a>
            <a href={`/exam/admin/timetable/${termId}/csv?type=teachers`} className={btnSecondary}>엑셀 교사별 일정</a>
            <a href={`/exam/admin/timetable/${termId}/csv?type=scores`} className={btnSecondary}>엑셀 점수표</a>
          </div>
        </section>
      )}

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
                  <p className={hint}>빈 자리가 많으면 그 교시의 필요 인원이 배정 가능한 교사 수보다 많은 것입니다. 불가 교시 화면에서 교시별 가능 인원을 확인해 주세요.</p>
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
              교사별 점수 합계의 차이는 최대 {range.toFixed(1)}점입니다. (이월 포함, 정감독 {d.settings.score_main}, 부감독 {d.settings.score_sub}, 자율 {d.settings.score_free})
            </p>
            <div className="mt-4"><ScoreTable stats={result.stats} /></div>
          </section>

          <section aria-labelledby="plan">
            <h2 id="plan" className="text-xl font-semibold">교시별 배정</h2>
            <p className={hint}>칸을 바꾸려면 변경을 누르세요. 규칙을 어기지 않는 선생님을 점수가 낮은 순으로 추천합니다.</p>
            <div className="mt-4">
              <TimetableView
                slots={d.slots}
                assignments={d.assignments}
                names={names}
                editHref={(slotId) => `/exam/admin/timetable/${termId}/assign/${slotId}`}
              />
            </div>
          </section>
        </>
      )}
    </div>
  );
}
