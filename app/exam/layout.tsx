import type { Metadata } from "next";
import { LABELS } from "@/lib/exam/config";

export const metadata: Metadata = {
  title: `${LABELS.appName} | 온빛중학교`,
  description: "중간고사와 기말고사 감독교사를 공정하게 배정하고 확인합니다.",
  robots: { index: false, follow: false },
};

export default function ExamLayout({ children }: LayoutProps<"/exam">) {
  return <div className="min-h-dvh">{children}</div>;
}
