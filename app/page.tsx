import {
  ArrowUpRight,
  MagnifyingGlass,
  Megaphone,
  Plus,
  SquaresFour,
} from "@phosphor-icons/react/dist/ssr";
import { AppDirectory } from "@/components/app-directory";
import { Hero } from "@/components/hero";
import { Reveal } from "@/components/reveal";
import { SiteHeader } from "@/components/site-header";
import { REGISTER_URL, news } from "@/lib/apps";

const steps = [
  {
    icon: MagnifyingGlass,
    title: "찾기",
    body: "분류를 고르거나 앱 이름, 사용 대상으로 검색합니다.",
  },
  {
    icon: SquaresFour,
    title: "열기",
    body: "카드를 누르면 새 창에서 앱이 열립니다. 이 페이지는 그대로 남습니다.",
  },
  {
    icon: Plus,
    title: "등록하기",
    body: "목록에 없는 앱은 등록을 요청합니다. 확인 후 알맞은 분류에 추가합니다.",
  },
];

const dateFormat = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "long",
  timeZone: "UTC",
});

function formatDate(value: string) {
  return dateFormat.format(new Date(`${value}T00:00:00Z`));
}

export default function Home() {
  return (
    <>
      <a
        href="#apps"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-accent focus:px-4 focus:py-2 focus:text-on-accent"
      >
        본문으로 건너뛰기
      </a>
      <SiteHeader />

      <main>
        <Hero />

        <section id="apps" className="border-t border-border py-20 lg:py-32">
          <div className="mx-auto max-w-6xl px-4 md:px-8">
            <Reveal>
              <h2 className="text-3xl leading-[1.25] font-bold tracking-[-0.02em] lg:text-4xl">
                앱 목록
              </h2>
              <p className="mt-4 max-w-[40rem] text-text-muted lg:text-lg">
                분류별로 모아 보거나 검색해서 찾을 수 있습니다.
              </p>
            </Reveal>
            <div className="mt-10">
              <AppDirectory />
            </div>
          </div>
        </section>

        <section id="guide" className="bg-surface py-20 lg:py-32">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 md:px-8 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
            <Reveal className="lg:sticky lg:top-28 lg:self-start">
              <h2 className="text-3xl leading-[1.25] font-bold tracking-[-0.02em] lg:text-4xl">
                이렇게 씁니다
              </h2>
              <p className="mt-4 max-w-[28rem] text-text-muted lg:text-lg">
                로그인 없이 바로 쓰는 안내 페이지입니다. 각 앱의 로그인은 앱에서
                따로 합니다.
              </p>
            </Reveal>

            <ol className="space-y-10">
              {steps.map((step, index) => (
                <li key={step.title}>
                  <Reveal delay={index * 0.06} className="flex gap-6 border-t border-border pt-10">
                    <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-surface-tint text-accent">
                      <step.icon size={24} aria-hidden="true" />
                    </span>
                    <div>
                      <h3 className="text-xl leading-[1.4] font-semibold tracking-[-0.01em]">
                        {step.title}
                      </h3>
                      <p className="mt-2 max-w-[32rem] text-text-muted">{step.body}</p>
                    </div>
                  </Reveal>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="news" className="py-20 lg:py-32">
          <div className="mx-auto max-w-6xl px-4 md:px-8">
            <Reveal className="flex items-center gap-3">
              <Megaphone size={28} aria-hidden="true" className="text-accent" />
              <h2 className="text-3xl leading-[1.25] font-bold tracking-[-0.02em] lg:text-4xl">
                최근 소식
              </h2>
            </Reveal>

            <ul className="mt-10 divide-y divide-border border-y border-border">
              {news.map((item, index) => (
                <li key={item.date + item.title}>
                  <Reveal
                    delay={index * 0.06}
                    className="grid gap-2 py-8 md:grid-cols-[12rem_1fr] md:gap-8"
                  >
                    <time dateTime={item.date} className="text-sm text-text-subtle md:pt-1">
                      {formatDate(item.date)}
                    </time>
                    <div>
                      <h3 className="text-xl leading-[1.4] font-semibold tracking-[-0.01em]">
                        {item.title}
                      </h3>
                      <p className="mt-2 text-text-muted">{item.body}</p>
                    </div>
                  </Reveal>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="register" className="mx-auto max-w-6xl px-4 pb-20 md:px-8 lg:pb-32">
          <Reveal className="rounded-2xl bg-surface-tint px-6 py-14 md:px-12 lg:flex lg:items-center lg:justify-between lg:gap-12 lg:py-20">
            <div>
              <h2 className="text-3xl leading-[1.25] font-bold tracking-[-0.02em] lg:text-4xl">
                새 앱을 등록하려면
              </h2>
              <p className="mt-4 max-w-[36rem] text-text-muted lg:text-lg">
                앱 이름, 주소, 사용 대상을 적어 보내 주세요. 확인한 뒤 목록에
                추가합니다.
              </p>
            </div>
            <a
              href={REGISTER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 inline-flex shrink-0 items-center gap-2 rounded-full bg-accent px-6 py-3 font-semibold whitespace-nowrap text-on-accent transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[0.98] lg:mt-0"
            >
              등록 요청하기
              <ArrowUpRight size={18} weight="bold" aria-hidden="true" />
              <span className="sr-only">(새 창)</span>
            </a>
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-10 text-sm text-text-subtle md:flex-row md:justify-between md:px-8">
          <p>온빛중학교 웹 앱 모음</p>
          <p>앱 추가와 수정은 등록 안내를 참고해 주세요.</p>
        </div>
      </footer>
    </>
  );
}
