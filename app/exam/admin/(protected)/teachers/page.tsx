import { StatefulForm } from "@/components/exam/stateful-form";
import { requireAdmin } from "@/lib/exam/auth";
import { db, type Teacher } from "@/lib/exam/db";
import { btnDanger, btnPrimary, btnSecondary, card, hint, input, label, textarea } from "@/lib/exam/ui";
import {
  addTeacherAction,
  deleteTeacherAction,
  importTeachersAction,
  updateTeacherAction,
} from "../../actions";

export default async function TeachersPage() {
  await requireAdmin();
  const { data } = await db().from("exam_teachers").select("*").order("name");
  const teachers = (data ?? []) as Teacher[];
  const active = teachers.filter((t) => t.is_active).length;

  return (
    <div className="space-y-12">
      <section>
        <h1 className="text-3xl leading-[1.25] font-bold tracking-[-0.02em] lg:text-4xl">교사 명단</h1>
        <p className="mt-4 max-w-[40rem] text-base text-text-muted">
          감독에 들어가는 선생님만 올립니다. 관리자는 올리지 않습니다. 현재 {teachers.length}명 중 {active}명이 배정 대상입니다.
        </p>
      </section>

      <section className={card} aria-labelledby="paste-teachers">
        <h2 id="paste-teachers" className="text-xl font-semibold">
          한꺼번에 붙여넣기
        </h2>
        <p className={hint}>
          엑셀에서 이름, 담임 학급, 출제 교과 세 칸을 복사해 붙여넣습니다. 이미 있는 이름은 정보만 갱신됩니다.
        </p>
        <div className="mt-6">
          <StatefulForm action={importTeachersAction} submitLabel="명단 저장">
            <div>
              <label htmlFor="paste" className={label}>
                명단
              </label>
              <textarea
                id="paste"
                name="paste"
                rows={8}
                required
                spellCheck={false}
                placeholder={"이름\t담임\t출제교과\n교사A\t2-3\t국어\n교사B\t\t수학"}
                className={textarea}
              />
              <p className={hint}>담임이 아니면 비워 둡니다. 담임은 2-3 처럼 학년-반으로 씁니다.</p>
            </div>
          </StatefulForm>
        </div>
      </section>

      <section className={card} aria-labelledby="add-teacher">
        <h2 id="add-teacher" className="text-xl font-semibold">
          한 명씩 추가
        </h2>
        <form action={addTeacherAction} className="mt-6 grid gap-5 md:grid-cols-4 md:items-end">
          <div>
            <label htmlFor="n-name" className={label}>
              이름
            </label>
            <input id="n-name" name="name" required className={input} />
          </div>
          <div>
            <label htmlFor="n-hr" className={label}>
              담임 학급
            </label>
            <input id="n-hr" name="homeroom" placeholder="예: 2-3" className={input} />
          </div>
          <div>
            <label htmlFor="n-sub" className={label}>
              출제 교과
            </label>
            <input id="n-sub" name="subject" className={input} />
          </div>
          <button type="submit" className={btnPrimary}>
            추가
          </button>
        </form>
      </section>

      <section aria-labelledby="teacher-list">
        <h2 id="teacher-list" className="text-xl font-semibold">
          등록된 선생님
        </h2>
        {teachers.length === 0 ? (
          <p className="mt-4 text-base text-text-muted">아직 등록된 선생님이 없습니다. 위에서 명단을 붙여넣어 주세요.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border rounded-2xl border border-border bg-surface">
            {teachers.map((t) => (
              <li key={t.id} className="p-4 md:px-6">
                <form action={updateTeacherAction} className="grid gap-3 md:grid-cols-[1fr_8rem_9rem_auto_auto] md:items-center">
                  <input type="hidden" name="id" value={t.id} />
                  <input name="name" defaultValue={t.name} required aria-label="이름" className={input} />
                  <input
                    name="homeroom"
                    defaultValue={t.homeroom_grade ? `${t.homeroom_grade}-${t.homeroom_class}` : ""}
                    placeholder="담임 학급"
                    aria-label="담임 학급"
                    className={input}
                  />
                  <input name="subject" defaultValue={t.subject ?? ""} placeholder="출제 교과" aria-label="출제 교과" className={input} />
                  <label className="flex h-12 items-center gap-2 text-sm font-semibold">
                    <input type="checkbox" name="is_active" defaultChecked={t.is_active} className="size-5 accent-[var(--color-accent)]" />
                    배정 대상
                  </label>
                  <span className="flex items-center gap-1">
                    <button type="submit" className={btnSecondary}>
                      저장
                    </button>
                    <button type="submit" formAction={deleteTeacherAction} className={btnDanger}>
                      삭제
                    </button>
                  </span>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
