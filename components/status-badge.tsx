import type { Status } from "@/lib/apps";

// "운영 중"은 기본 상태라 표시하지 않고, 점검·준비 중일 때만 알린다.
export function StatusBadge({ status }: { status: Status }) {
  if (status === "운영 중") return null;
  return (
    <span className="shrink-0 rounded-full border border-border px-2.5 py-0.5 text-xs text-text-muted">
      {status}
    </span>
  );
}
