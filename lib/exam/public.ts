import "server-only";
import { notFound } from "next/navigation";
import { requireTeacher } from "./auth";
import { loadTermData, toScheduleInput, currentAssignments, type TermData } from "./data";
import { checkAssignments, type ScheduleResult } from "./schedule";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function assertUuid(v: string) {
  if (!UUID.test(v)) notFound();
}

// 교사용 화면에서 쓰는 공개된 시험 데이터. 공개되지 않았으면 404.
export async function loadPublished(
  termId: string,
  next: string,
): Promise<{ data: TermData; result: ScheduleResult }> {
  assertUuid(termId);
  await requireTeacher(next);
  const data = await loadTermData(termId);
  if (!data || !data.term.published) notFound();
  const result = checkAssignments(toScheduleInput(data), currentAssignments(data));
  return { data, result };
}
