"use client";

import { btnSecondary } from "@/lib/exam/ui";

// 브라우저 인쇄 창을 연다. 인쇄 대상을 'PDF로 저장'으로 고르면 PDF 파일이 된다.
export function PrintButton({ label = "인쇄 또는 PDF 저장" }: { label?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className={`${btnSecondary} no-print`}>
      {label}
    </button>
  );
}
