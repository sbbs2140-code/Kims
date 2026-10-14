import Link from "next/link";
import { notFound } from "next/navigation";
import { dateLabel } from "@/components/exam/schedule-view";
import { StatefulForm } from "@/components/exam/stateful-form";
import { requireAdmin } from "@/lib/exam/auth";
import { LABELS } from "@/lib/exam/config";
import { currentAssignments, loadTermData, toScheduleInput } from "@/lib/exam/data";
import { assertUuid } from "@/lib/exam/public";
import { recommend, type Role } from "@/lib/exam/schedule";
import { card, hint, input, label } from "@/lib/exam/ui";
import { setAssignmentAction } from "../../../../../actions";

export default async function EditSlotPage({
  params,
}: PageProps<"/exam/admin/timetable/[termId]/assign/[slotId]">) {
  await requireAdmin();
  const { termId, slotId } = await params;
  assertUuid(slotId);
  const d = await loadTermData(termId);
  const slot = d?.slots.find((s) => s.id === slotId);
  if (!d || !slot) notFound();

  const roles: { role: Role; title: string }[] =
    slot.kind === "시험"
      ? [{ role: "main", title: LABELS.roleMain }, { role: "sub", title: LABELS.roleSub }]
      : [{ role: "free", title: LABELS.roleFree }];

  const input0 = toScheduleInput(d);
  const list = currentAssignments(d);
  const names = new Map(d.allTeachers.map((t) => [t.id, t.name]));

  return (
    <div className="space-y-8">
      <section>
        <Link href={`/exam/admin/timetable/${termId}/assign`} className="text-sm font-semibold text-accent hover:underline">
          감독 편성
        </Link>
        <h1 className="mt-2 text-3xl leading-[1.25] font-bold tracking-[-0.02em] lg:text-4xl">
          {slot.grade}학년 {slot.class_no}반 {slot.kind}
        </h1>
        <p className="mt-4 text-base text-text-muted">
          {dateLabel(slot.exam_date)} {slot.period}교시{slot.subject ? `, ${slot.subject}` : ""}
        </p>
      </section>

      {roles.map(({ role, title }) => {
        const current = d.assignments.find((a) => a.slot_id === slotId && a.role === role);
        const cands = recommend(input0, list, slotId, role);
        const ok = cands.filter((c) => c.ok);
        const bad = cands.filter((c) => !c.ok);
        const id = `t-${role}`;
        return (
          <section key={role} className={card} aria-labelledby={`h-${role}`}>
            <h2 id={`h-${role}`} className="text-xl font-semibold">{title}</h2>
            <p className="mt-2 text-base text-text-muted">
              현재: {current?.teacher_id ? names.get(current.teacher_id) ?? "알 수 없음" : "미배정"}
            </p>
            <div className="mt-6">
              <StatefulForm action={setAssignmentAction} submitLabel="저장">
                <input type="hidden" name="term_id" value={termId} />
                <input type="hidden" name="slot_id" value={slotId} />
                <input type="hidden" name="role" value={role} />
                <div>
                  <label htmlFor={id} className={label}>배정할 선생님</label>
                  <select id={id} name="teacher_id" defaultValue={current?.teacher_id ?? ""} className={input}>
                    <option value="">비워 두기</option>
                    {current?.teacher_id && (
                      <option value={current.teacher_id}>현재 배정: {names.get(current.teacher_id)}</option>
                    )}
                    <optgroup label="추천 (규칙 위반 없음, 점수 합계가 낮은 순)">
                      {ok.map((c) => (
                        <option key={c.teacherId} value={c.teacherId}>
                          {c.name} (배정 후 {c.total.toFixed(1)}점)
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="규칙을 어기게 되는 선생님">
                      {bad.map((c) => (
                        <option key={c.teacherId} value={c.teacherId}>
                          {c.name}: {c.reasons[0]?.replace(`${c.name}: `, "") ?? "규칙 위반"}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                  <p className={hint}>추천 {ok.length}명, 규칙 위반 {bad.length}명</p>
                </div>
                <label className="flex items-start gap-3 text-sm">
                  <input type="checkbox" name="locked" defaultChecked={current?.locked} className="mt-0.5 size-5 accent-[var(--color-accent)]" />
                  <span>이 칸 잠그기<span className="block text-text-subtle">다시 편성해도 바뀌지 않습니다.</span></span>
                </label>
                <label className="flex items-start gap-3 text-sm">
                  <input type="checkbox" name="force" className="mt-0.5 size-5 accent-[var(--color-accent)]" />
                  <span>규칙을 어기더라도 배정<span className="block text-text-subtle">불가피한 경우에만 체크하세요.</span></span>
                </label>
              </StatefulForm>
            </div>
          </section>
        );
      })}
    </div>
  );
}
