import Link from "next/link";
import { LABELS } from "@/lib/exam/config";
import type { AssignmentRow } from "@/lib/exam/data";
import type { Slot } from "@/lib/exam/db";
import type { TeacherStat } from "@/lib/exam/schedule";

const weekday = new Intl.DateTimeFormat("ko-KR", { weekday: "short", timeZone: "UTC" });

export function dateLabel(iso: string) {
  const d = new Date(`${iso}T00:00:00Z`);
  return `${Number(iso.slice(5, 7))}월 ${Number(iso.slice(8, 10))}일 (${weekday.format(d)})`;
}

const badge = "ml-2 rounded-full border border-border px-2 py-0.5 text-xs font-semibold text-text-muted";

// 교시별 학급 배정표. editHref를 주면 담당자용 '변경' 링크가 붙는다.
export function TimetableView({
  slots,
  assignments,
  names,
  editHref,
  highlightTeacherId,
}: {
  slots: Slot[];
  assignments: AssignmentRow[];
  names: Map<string, string>;
  editHref?: (slotId: string) => string;
  highlightTeacherId?: string;
}) {
  const byKey = new Map(assignments.map((a) => [`${a.slot_id}|${a.role}`, a]));
  const groups = new Map<string, Slot[]>();
  for (const s of slots) {
    const k = `${s.exam_date}|${s.period}`;
    groups.set(k, [...(groups.get(k) ?? []), s]);
  }

  const cell = (slotId: string, role: "main" | "sub" | "free") => {
    const a = byKey.get(`${slotId}|${role}`);
    if (!a?.teacher_id) return <span className="text-accent">미배정</span>;
    const mine = a.teacher_id === highlightTeacherId;
    return (
      <span className={mine ? "font-bold text-accent" : ""}>
        {names.get(a.teacher_id) ?? "알 수 없음"}
        {a.locked && editHref ? <span className={badge}>잠금</span> : null}
        {a.changed_after_publish ? <span className={badge}>변경됨</span> : null}
      </span>
    );
  };

  return (
    <div className="space-y-8">
      {[...groups.entries()].map(([k, list]) => {
        const [date, period] = k.split("|");
        return (
          <div key={k}>
            <h3 className="text-base font-semibold">
              {dateLabel(date)} {period}교시
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
                    {editHref && <th scope="col" className="px-4 py-2 font-semibold"><span className="sr-only">관리</span></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {list.map((s) => (
                    <tr key={s.id}>
                      <td className="px-4 py-2">{s.grade}학년 {s.class_no}반</td>
                      <td className="px-4 py-2">{s.kind}{s.subject ? ` (${s.subject})` : ""}</td>
                      <td className="px-4 py-2">{cell(s.id, s.kind === "시험" ? "main" : "free")}</td>
                      <td className="px-4 py-2">{s.kind === "시험" ? cell(s.id, "sub") : "-"}</td>
                      {editHref && (
                        <td className="px-4 py-2 text-right">
                          <Link href={editHref(s.id)} className="font-semibold text-accent hover:underline">
                            변경
                          </Link>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ScoreTable({ stats, highlightId }: { stats: TeacherStat[]; highlightId?: string }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
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
          {stats.map((s) => (
            <tr key={s.id} className={s.id === highlightId ? "bg-surface-tint" : ""}>
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
  );
}
