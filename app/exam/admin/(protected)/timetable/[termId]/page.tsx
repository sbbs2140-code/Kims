import Link from "next/link";
import { notFound } from "next/navigation";
import { StatefulForm } from "@/components/exam/stateful-form";
import { requireAdmin } from "@/lib/exam/auth";
import { NEED_PER_CLASS } from "@/lib/exam/config";
import { db, type Slot } from "@/lib/exam/db";
import { btnDanger, card, hint, label, textarea } from "@/lib/exam/ui";
import { clearSlotsAction, importSlotsAction } from "../../../actions";

type Group = {
  key: string;
  date: string;
  period: number;
  exam: Record<number, number>;
  free: Record<number, number>;
  need: number;
};

const weekday = new Intl.DateTimeFormat("ko-KR", { weekday: "short", timeZone: "UTC" });

function dateLabel(iso: string) {
  const d = new Date(`${iso}T00:00:00Z`);
  return `${Number(iso.slice(5, 7))}월 ${Number(iso.slice(8, 10))}일 (${weekday.format(d)})`;
}

export default async function TimetablePage({ params }: PageProps<"/exam/admin/timetable/[termId]">) {
  await requireAdmin();
  const { termId } = await params;
  const supabase = db();

  const { data: term } = await supabase.from("exam_terms").select("*").eq("id", termId).single();
  if (!term) notFound();

  const [{ data: slotData }, { count: activeCount }] = await Promise.all([
    supabase
      .from("exam_slots")
      .select("*")
      .eq("term_id", termId)
      .order("exam_date")
      .order("period")
      .limit(5000),
    supabase.from("exam_teachers").select("id", { count: "exact", head: true }).eq("is_active", true),
  ]);
  const slots = (slotData ?? []) as Slot[];
  const teachers = activeCount ?? 0;

  const groups = new Map<string, Group>();
  for (const s of slots) {
    const key = `${s.exam_date}|${s.period}`;
    const g = groups.get(key) ?? { key, date: s.exam_date, period: s.period, exam: {}, free: {}, need: 0 };
    const bucket = s.kind === "시험" ? g.exam : g.free;
    bucket[s.grade] = (bucket[s.grade] ?? 0) + 1;
    g.need += NEED_PER_CLASS[s.kind];
    groups.set(key, g);
  }
  const rows = [...groups.values()];

  const fmt = (b: Record<number, number>) =>
    Object.entries(b)
      .map(([g, n]) => `${g}학년 ${n}반`)
      .join(", ") || "-";

  return (
    <div className="space-y-12">
      <section>
        <Link href="/exam/admin" className="text-sm font-semibold text-accent hover:underline">
          시험 목록
        </Link>
        <h1 className="mt-2 text-3xl leading-[1.25] font-bold tracking-[-0.02em] lg:text-4xl">{term.name}</h1>
        <p className="mt-4 max-w-[40rem] text-base text-text-muted">
          시험 시간표를 엑셀에서 복사해 붙여넣습니다. 같은 칸을 다시 붙여넣으면 내용이 갱신됩니다.
        </p>
      </section>

      <section className={card} aria-labelledby="paste-slots">
        <h2 id="paste-slots" className="text-xl font-semibold">
          시간표 붙여넣기
        </h2>
        <p className={hint}>
          칸 순서는 날짜, 교시, 학년, 반, 구분(시험 또는 자율), 과목, 장소입니다. 반에는 전체, 3, 1-5, 1,3,5 처럼 쓸 수 있습니다. 과목과 장소는 비워도 됩니다.
        </p>
        <div className="mt-6">
          <StatefulForm action={importSlotsAction} submitLabel="시간표 저장">
            <input type="hidden" name="term_id" value={termId} />
            <div>
              <label htmlFor="paste" className={label}>
                시간표
              </label>
              <textarea
                id="paste"
                name="paste"
                rows={10}
                required
                spellCheck={false}
                placeholder={
                  "날짜\t교시\t학년\t반\t구분\t과목\t장소\n11/3\t1\t1\t전체\t시험\t국어\n11/3\t1\t2\t전체\t자율\t\t각 교실\n11/3\t2\t1\t전체\t시험\t수학"
                }
                className={textarea}
              />
            </div>
            <label className="flex items-start gap-3 text-sm">
              <input type="checkbox" name="replace" className="mt-0.5 size-5 accent-[var(--color-accent)]" />
              <span>
                기존 시간표를 모두 지우고 새로 넣기
                <span className="block text-text-subtle">이미 한 감독 배정도 함께 지워집니다.</span>
              </span>
            </label>
          </StatefulForm>
        </div>
      </section>

      <section aria-labelledby="slot-summary">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 id="slot-summary" className="text-xl font-semibold">
            입력된 시간표
          </h2>
          {slots.length > 0 && (
            <form action={clearSlotsAction}>
              <input type="hidden" name="term_id" value={termId} />
              <button type="submit" className={btnDanger}>
                시간표 전체 지우기
              </button>
            </form>
          )}
        </div>
        {rows.length === 0 ? (
          <p className="mt-4 text-base text-text-muted">아직 입력된 시간표가 없습니다. 위에 붙여넣어 주세요.</p>
        ) : (
          <>
            <p className="mt-2 text-sm text-text-subtle">
              배정 대상 교사는 {teachers}명입니다. 필요 인원이 교사 수보다 많은 교시는 표시됩니다. 담임 제외와 불가 교시는 편성 단계에서 다시 확인합니다.
            </p>
            <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-surface">
              <table className="w-full min-w-[40rem] text-left text-sm">
                <caption className="sr-only">날짜와 교시별 시험, 자율 학급과 필요 인원</caption>
                <thead className="border-b border-border text-text-muted">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-semibold">날짜</th>
                    <th scope="col" className="px-4 py-3 font-semibold">교시</th>
                    <th scope="col" className="px-4 py-3 font-semibold">시험</th>
                    <th scope="col" className="px-4 py-3 font-semibold">자율</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">필요 인원</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((g) => (
                    <tr key={g.key}>
                      <td className="px-4 py-3">{dateLabel(g.date)}</td>
                      <td className="px-4 py-3">{g.period}교시</td>
                      <td className="px-4 py-3">{fmt(g.exam)}</td>
                      <td className="px-4 py-3">{fmt(g.free)}</td>
                      <td className={`px-4 py-3 text-right font-semibold ${g.need > teachers ? "text-accent" : ""}`}>
                        {g.need}명{g.need > teachers ? " (교사 부족)" : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
