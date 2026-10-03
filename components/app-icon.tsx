import {
  BookOpenText,
  CalendarCheck,
  EnvelopeSimple,
  Exam,
  FileText,
  HandHeart,
  ListChecks,
  Package,
  Question,
  Scales,
} from "@phosphor-icons/react/dist/ssr";
import type { IconKey } from "@/lib/apps";

const icons = {
  book: BookOpenText,
  checklist: ListChecks,
  exam: Exam,
  quiz: Question,
  calendar: CalendarCheck,
  heart: HandHeart,
  rules: Scales,
  letter: EnvelopeSimple,
  document: FileText,
  package: Package,
} satisfies Record<IconKey, unknown>;

export function AppIcon({ name, size = 22 }: { name: IconKey; size?: number }) {
  const Icon = icons[name];
  return <Icon size={size} aria-hidden="true" />;
}
