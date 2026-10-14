import Link from "next/link";
import { loadPublished } from "@/lib/exam/public";
import { btnSecondary } from "@/lib/exam/ui";

export const dynamic = "force-dynamic";

export default async function TermPage({ params }: PageProps<"/exam/[termId]">) {
  const { termId } = await params;
  const { data } = await loadPublished(termId, `/exam/${termId}`);

  return (
    <main className="mx-auto max-w-4xl px-4 py-16 md:px-8 lg:py-24">
      <Link href="/exam" className="text-sm font-semibold text-accent hover:underline">시험 목록</Link>
      <h1 className="mt-2 text-3xl leading-[1.25] font-bold tracking-[-0.02em] lg:text-4xl">{data.term.name}</h1>
      <p className="mt-4 text-base text-text-muted">선생님 이름을 누르면 내 감독표가 열립니다.</p>

      <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {data.teachers.map((t) => (
          <li key={t.id}>
            <Link
              href={`/exam/${termId}/t/${t.id}`}
              className="flex h-12 items-center justify-center rounded-xl border border-border bg-surface px-3 text-base font-semibold hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {t.name}
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-12">
        <Link href={`/exam/${termId}/all`} className={btnSecondary}>전체 시간표와 점수</Link>
      </div>
    </main>
  );
}
