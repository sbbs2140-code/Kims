import { ArrowRight, ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import { apps } from "@/lib/apps";
import { AppIcon } from "./app-icon";
import { Reveal } from "./reveal";

const pinned = apps.filter((app) => app.pinned);

export function Hero() {
  return (
    <section
      id="top"
      className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-12 pb-20 md:px-8 lg:min-h-[calc(100dvh-4.5rem)] lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 lg:pt-8"
    >
      <Reveal>
        <h1 className="text-4xl leading-[1.2] font-bold tracking-[-0.02em] lg:text-6xl">
          학교에서 쓰는 웹 앱,
          <br />
          한곳에서 찾고 엽니다
        </h1>
        <p className="mt-6 max-w-[34rem] text-base text-text-muted lg:text-lg">
          수업, 생활지도, 행정 앱을 모아 두었습니다. 검색해서 바로 열고, 새
          앱은 등록을 요청하세요.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <a
            href="#apps"
            className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 font-semibold text-on-accent transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[0.98]"
          >
            앱 바로가기
            <ArrowRight size={18} weight="bold" aria-hidden="true" />
          </a>
          <a
            href="#register"
            className="rounded-full border border-border px-6 py-3 font-semibold transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[0.98]"
          >
            등록 안내
          </a>
        </div>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-[0_8px_30px_rgb(28_25_23/0.06)] lg:p-8">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-xl font-semibold tracking-[-0.01em]">
              자주 쓰는 앱
            </h2>
            <span className="text-sm text-text-subtle">
              전체 {apps.length}개 중 {pinned.length}개
            </span>
          </div>

          <ul className="mt-6 divide-y divide-border">
            {pinned.map((app) => (
              <li key={app.id}>
                <a
                  href={app.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group -mx-2 flex items-center gap-4 rounded-xl px-2 py-4 transition-colors hover:bg-bg focus-visible:outline-2 focus-visible:outline-accent"
                >
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-surface-tint text-accent">
                    <AppIcon name={app.icon} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{app.name}</span>
                    <span className="block text-sm text-text-subtle">
                      {app.category} · {app.audience.join(", ")}
                    </span>
                  </span>
                  <ArrowUpRight
                    size={20}
                    aria-hidden="true"
                    className="shrink-0 text-text-subtle transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent"
                  />
                  <span className="sr-only">(새 창)</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </Reveal>
    </section>
  );
}
