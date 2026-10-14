import Link from "next/link";
import { requireTeacher } from "@/lib/exam/auth";
import { db, type Term } from "@/lib/exam/db";
import { LABELS } from "@/lib/exam/config";
import { btnSecondary, card } from "@/lib/exam/ui";

export const dynamic = "force-dynamic";

export default async function ExamHome() {
  await requireTeacher("/exam");
  const { data } = await db()
    .from("exam_terms")
    .select("*")
    .eq("published", true)
    .order("created_at", { ascending: false });
  const terms = (data ?? []) as Term[];

  return (
    <main className="mx-auto max-w-3xl px-4 py-20 md:px-8 lg:py-32">
      <h1 className="text-4xl leading-[1.2] font-bold tracking-[-0.02em] lg:text-6xl">{LABELS.appName}</h1>
      <p className="mt-4 max-w-[40rem] text-base text-text-muted lg:text-lg">
        시험을 고르고 선생님 이름을 선택하면 내 감독표를 볼 수 있습니다.
      </p>

      <section className="mt-12" aria-labelledby="terms">
        <h2 id="terms" className="text-xl font-semibold">공개된 시험</h2>
        {terms.length === 0 ? (
          <p className="mt-4 text-base text-text-muted">아직 공개된 감독표가 없습니다. 담당 선생님이 공개하면 여기에 나타납니다.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border rounded-2xl border border-border bg-surface">
            {terms.map((t) => (
              <li key={t.id}>
                <Link href={`/exam/${t.id}`} className="flex items-center justify-between gap-4 p-4 text-base font-semibold hover:bg-surface-tint md:px-6">
                  {t.name}
                  <span aria-hidden="true" className="text-accent">보기</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className={`${card} mt-12`}>
        <h2 className="text-xl font-semibold">담당자 전용</h2>
        <p className="mt-2 text-sm text-text-muted">교사 명단, 시험 시간표, 편성과 수정은 담당자만 할 수 있습니다.</p>
        <Link href="/exam/admin" className={`${btnSecondary} mt-6`}>담당자 로그인</Link>
      </div>
    </main>
  );
}
