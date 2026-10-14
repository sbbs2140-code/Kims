import Link from "next/link";
import { LABELS } from "@/lib/exam/config";
import { btnSecondary, card } from "@/lib/exam/ui";

export default function ExamHome() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-20 md:px-8 lg:py-32">
      <h1 className="text-4xl leading-[1.2] font-bold tracking-[-0.02em] lg:text-6xl">
        {LABELS.appName}
      </h1>
      <p className="mt-4 max-w-[40rem] text-base text-text-muted lg:text-lg">
        선생님별 감독표와 전체 시간표를 확인하는 화면은 준비 중입니다. 담당 선생님은 아래에서 시간표와 명단을 입력할 수 있습니다.
      </p>
      <div className={`${card} mt-8`}>
        <h2 className="text-xl font-semibold">담당자 전용</h2>
        <p className="mt-2 text-sm text-text-muted">
          교사 명단, 시험 시간표, 점수 설정을 관리합니다.
        </p>
        <Link href="/exam/admin" className={`${btnSecondary} mt-6`}>
          담당자 로그인
        </Link>
      </div>
    </main>
  );
}
