"use client";

import { useState } from "react";
import { useMotionValueEvent, useScroll } from "motion/react";

const links = [
  { href: "#apps", label: "앱 목록" },
  { href: "#guide", label: "이용 방법" },
  { href: "#news", label: "소식" },
];

export function SiteHeader() {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);

  // 기준선을 넘을 때만 상태가 바뀌므로 스크롤마다 다시 그리지 않는다.
  useMotionValueEvent(scrollY, "change", (y) => {
    const next = y > 8;
    if (next !== scrolled) setScrolled(next);
  });

  return (
    <header
      className={`sticky top-0 z-40 transition-colors duration-200 ${
        scrolled
          ? "border-b border-border bg-bg/80 backdrop-blur-md"
          : "border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-4 md:h-[4.5rem] md:px-8">
        <a
          href="#top"
          className="flex items-center gap-2.5 rounded-lg font-bold tracking-[-0.01em] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        >
          <span
            aria-hidden="true"
            className="grid size-8 place-items-center rounded-lg bg-accent text-sm font-bold text-on-accent"
          >
            온
          </span>
          <span>온빛중 웹 앱 모음</span>
        </a>

        <nav aria-label="주요 메뉴" className="hidden md:block">
          <ul className="flex items-center gap-8 text-[0.9375rem] text-text-muted">
            {links.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="rounded transition-colors hover:text-text focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <a
          href="#apps"
          className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[0.98]"
        >
          앱 바로가기
        </a>
      </div>
    </header>
  );
}
