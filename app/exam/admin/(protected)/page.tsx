import Link from "next/link";
import { requireAdmin } from "@/lib/exam/auth";
import { db, type Term } from "@/lib/exam/db";
import { btnDanger, btnPrimary, btnSecondary, card, input, label } from "@/lib/exam/ui";
import { createTermAction, deleteTermAction } from "../actions";

export default async function TermsPage() {
  await requireAdmin();
  const { data } = await db()
    .from("exam_terms")
    .select("*")
    .order("created_at", { ascending: false });
  const terms = (data ?? []) as Term[];
  const thisYear = new Date().getFullYear();

  return (
    <div className="space-y-12">
      <section>
        <h1 className="text-3xl leading-[1.25] font-bold tracking-[-0.02em] lg:text-4xl">시험</h1>
        <p className="mt-4 max-w-[40rem] text-base text-text-muted">
          중간고사와 기말고사를 하나씩 만들고, 시험마다 시간표와 감독 배정을 따로 관리합니다.
        </p>
      </section>

      <section className={card} aria-labelledby="new-term">
        <h2 id="new-term" className="text-xl font-semibold">
          새 시험 만들기
        </h2>
        <form action={createTermAction} className="mt-6 grid gap-5 md:grid-cols-4 md:items-end">
          <div>
            <label htmlFor="school_year" className={label}>
              학년도
            </label>
            <input id="school_year" name="school_year" type="number" required defaultValue={thisYear} className={input} />
          </div>
          <div>
            <label htmlFor="semester" className={label}>
              학기
            </label>
            <select id="semester" name="semester" className={input} defaultValue="2">
              <option value="1">1학기</option>
              <option value="2">2학기</option>
            </select>
          </div>
          <div>
            <label htmlFor="kind" className={label}>
              종류
            </label>
            <select id="kind" name="kind" className={input}>
              <option value="중간">중간고사</option>
              <option value="기말">기말고사</option>
            </select>
          </div>
          <button type="submit" className={btnPrimary}>
            만들기
          </button>
        </form>
      </section>

      <section aria-labelledby="term-list">
        <h2 id="term-list" className="text-xl font-semibold">
          만든 시험
        </h2>
        {terms.length === 0 ? (
          <p className="mt-4 text-base text-text-muted">아직 만든 시험이 없습니다. 위에서 먼저 만들어 주세요.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border rounded-2xl border border-border bg-surface">
            {terms.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-4 p-4 md:px-6">
                <span className="text-base font-semibold">{t.name}</span>
                <span className="flex flex-wrap items-center gap-2">
                  <Link href={`/exam/admin/timetable/${t.id}`} className={btnSecondary}>
                    시간표 입력
                  </Link>
                  <form action={deleteTermAction}>
                    <input type="hidden" name="id" value={t.id} />
                    <button type="submit" className={btnDanger}>
                      삭제
                    </button>
                  </form>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
