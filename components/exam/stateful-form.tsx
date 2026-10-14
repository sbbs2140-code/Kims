"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/exam/admin/actions";
import { btnPrimary } from "@/lib/exam/ui";

// 서버 액션의 결과 메시지와 오류 목록을 폼 아래에 보여 주는 공통 폼.
export function StatefulForm({
  action,
  submitLabel,
  children,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  submitLabel: string;
  children: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, {} as FormState);

  return (
    <form action={formAction} className="space-y-5">
      {children}
      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? "저장 중" : submitLabel}
        </button>
        {state.message && (
          <p
            role={state.ok ? "status" : "alert"}
            className={`text-sm font-semibold ${state.ok ? "text-text" : "text-accent"}`}
          >
            {state.message}
          </p>
        )}
      </div>
      {state.errors && state.errors.length > 0 && (
        <ul role="alert" className="max-h-60 space-y-1 overflow-auto rounded-xl bg-surface-tint p-4 text-sm">
          {state.errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
    </form>
  );
}
