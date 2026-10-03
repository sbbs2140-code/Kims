"use client";

import { useId, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowUpRight, MagnifyingGlass, X } from "@phosphor-icons/react/dist/ssr";
import { apps, categories, type Category } from "@/lib/apps";
import { AppIcon } from "./app-icon";
import { StatusBadge } from "./status-badge";

type Filter = Category | "전체";
const filters: Filter[] = ["전체", ...categories];

export function AppDirectory() {
  const [filter, setFilter] = useState<Filter>("전체");
  const [query, setQuery] = useState("");
  const reduce = useReducedMotion();
  const searchId = useId();

  const counts = useMemo(() => {
    const result: Record<Filter, number> = { 전체: apps.length, 수업: 0, 생활지도: 0, 행정: 0 };
    for (const app of apps) result[app.category] += 1;
    return result;
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return apps.filter((app) => {
      if (filter !== "전체" && app.category !== filter) return false;
      if (!q) return true;
      return [app.name, app.description, ...app.audience]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [filter, query]);

  function reset() {
    setFilter("전체");
    setQuery("");
  }

  return (
    <div>
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div
          role="group"
          aria-label="분류"
          className="flex flex-wrap gap-2"
        >
          {filters.map((item) => {
            const active = item === filter;
            return (
              <button
                key={item}
                type="button"
                aria-pressed={active}
                onClick={() => setFilter(item)}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[0.98] ${
                  active
                    ? "border-text bg-text text-bg"
                    : "border-border text-text-muted hover:text-text"
                }`}
              >
                {item}
                <span className={active ? "ml-1.5 opacity-70" : "ml-1.5 text-text-subtle"}>
                  {counts[item]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="md:w-72">
          <label htmlFor={searchId} className="mb-2 block text-sm font-semibold">
            앱 검색
          </label>
          <div className="relative">
            <MagnifyingGlass
              size={18}
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-text-subtle"
            />
            <input
              id={searchId}
              type="search"
              name="app-search"
              autoComplete="off"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="예: 상담, 학생…"
              className="h-12 w-full rounded-xl border border-border bg-surface pr-4 pl-11 text-base placeholder:text-text-subtle focus:border-accent focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            />
          </div>
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {visible.length}개 앱이 보입니다.
      </p>

      {visible.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-border px-6 py-14 text-center">
          <p className="text-lg font-semibold">찾는 앱이 없습니다</p>
          <p className="mt-2 text-text-muted">
            다른 낱말로 검색하거나 분류를 전체로 바꿔 보세요.
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-6 inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[0.98]"
          >
            <X size={16} aria-hidden="true" />
            검색 초기화
          </button>
        </div>
      ) : (
        <motion.ul layout={!reduce} className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          <AnimatePresence initial={false} mode="popLayout">
            {visible.map((app) => {
              const open = app.status !== "준비 중";
              const body = (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <span className="grid size-12 place-items-center rounded-xl bg-surface-tint text-accent">
                      <AppIcon name={app.icon} size={24} />
                    </span>
                    <StatusBadge status={app.status} />
                  </div>
                  <h3 className="mt-6 text-xl leading-[1.4] font-semibold tracking-[-0.01em]">
                    {app.name}
                  </h3>
                  <p className="mt-2 flex-1 text-text-muted">{app.description}</p>
                  <div className="mt-6 flex items-center justify-between gap-4 border-t border-border pt-4 text-sm">
                    <span className="text-text-subtle">
                      {app.category} · {app.audience.join(", ")}
                    </span>
                    {open ? (
                      <ArrowUpRight
                        size={20}
                        aria-hidden="true"
                        className="text-text-subtle transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent"
                      />
                    ) : null}
                  </div>
                </>
              );

              return (
                <motion.li
                  key={app.id}
                  layout={!reduce}
                  initial={reduce ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="flex"
                >
                  {open ? (
                    <a
                      href={app.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex w-full flex-col rounded-2xl border border-border bg-surface p-6 transition-shadow hover:shadow-[0_8px_30px_rgb(28_25_23/0.08)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent lg:p-8"
                    >
                      {body}
                      <span className="sr-only">(새 창)</span>
                    </a>
                  ) : (
                    <div
                      aria-disabled="true"
                      className="flex w-full flex-col rounded-2xl border border-dashed border-border bg-surface p-6 lg:p-8"
                    >
                      {body}
                    </div>
                  )}
                </motion.li>
              );
            })}
          </AnimatePresence>
        </motion.ul>
      )}
    </div>
  );
}
