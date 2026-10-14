// DESIGN.md 5~6장 규칙에 맞춘 공통 클래스. 버튼은 알약, 카드는 16px, 입력창은 12px.
const focus =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

export const btnPrimary = `inline-flex h-12 items-center justify-center gap-2 rounded-full bg-accent px-6 text-base font-semibold text-on-accent transition-colors hover:bg-accent-hover active:scale-[0.98] disabled:opacity-60 ${focus}`;

export const btnSecondary = `inline-flex h-12 items-center justify-center gap-2 rounded-full border border-border bg-transparent px-6 text-base font-semibold text-text transition-colors hover:bg-surface-tint active:scale-[0.98] ${focus}`;

export const btnDanger = `inline-flex h-12 items-center justify-center rounded-full px-4 text-base font-semibold text-text-muted underline-offset-4 hover:text-accent hover:underline ${focus}`;

export const input = `h-12 w-full rounded-xl border border-border bg-surface px-4 text-base text-text focus:border-accent focus:outline-none ${focus}`;

export const textarea = `w-full rounded-xl border border-border bg-surface p-4 font-mono text-sm leading-relaxed text-text focus:border-accent focus:outline-none ${focus}`;

export const card = "rounded-2xl border border-border bg-surface p-6 lg:p-8";

export const label = "mb-2 block text-sm font-semibold text-text";
export const hint = "mt-2 text-sm text-text-subtle";
