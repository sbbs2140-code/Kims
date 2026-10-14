import Link from "next/link";
import { requireAdmin } from "@/lib/exam/auth";
import { LABELS } from "@/lib/exam/config";
import { btnDanger } from "@/lib/exam/ui";
import { logoutAction } from "../actions";

const nav = [
  { href: "/exam/admin", label: "시험" },
  { href: "/exam/admin/teachers", label: "교사 명단" },
  { href: "/exam/admin/settings", label: "점수 설정" },
];

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <>
      <header className="no-print border-b border-border">
        <div className="mx-auto flex min-h-16 max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-2 md:px-8">
          <Link href="/exam/admin" className="font-bold tracking-[-0.01em]">
            {LABELS.appName}
          </Link>
          <nav aria-label="담당자 메뉴" className="flex flex-wrap items-center gap-x-6">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} className="py-3 text-base font-semibold text-text-muted hover:text-accent">
                {n.label}
              </Link>
            ))}
            <form action={logoutAction}>
              <button type="submit" className={btnDanger}>
                로그아웃
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-12 md:px-8 lg:py-16">{children}</main>
    </>
  );
}
