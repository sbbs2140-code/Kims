import Link from "next/link";
import { redirect } from "next/navigation";
import { StatefulForm } from "@/components/exam/stateful-form";
import { isTeacher, safeNext, teacherPasswordConfigured } from "@/lib/exam/auth";
import { LABELS } from "@/lib/exam/config";
import { hint, input, label } from "@/lib/exam/ui";
import { teacherLoginAction } from "../admin/actions";

export const dynamic = "force-dynamic";

export default async function EnterPage({ searchParams }: PageProps<"/exam/enter">) {
  const sp = await searchParams;
  const next = safeNext(typeof sp.next === "string" ? sp.next : undefined);
  if (await isTeacher()) redirect(next);
  const configured = teacherPasswordConfigured();

  return (
    <main className="mx-auto max-w-md px-4 py-20 md:px-8 lg:py-32">
      <h1 className="text-3xl leading-[1.25] font-bold tracking-[-0.02em]">{LABELS.appName}</h1>
      <p className="mt-4 text-base text-text-muted">
        선생님 전용 화면입니다. 교무실에서 안내받은 비밀번호를 입력해 주세요.
      </p>
      <div className="mt-8">
        {configured ? (
          <StatefulForm action={teacherLoginAction} submitLabel="들어가기">
            <input type="hidden" name="next" value={next} />
            <div>
              <label htmlFor="password" className={label}>교사용 비밀번호</label>
              <input id="password" name="password" type="password" required autoComplete="current-password" className={input} />
              <p className={hint}>한 번 입력하면 12시간 동안 다시 묻지 않습니다.</p>
            </div>
          </StatefulForm>
        ) : (
          <p role="alert" className="rounded-xl bg-surface-tint p-4 text-base">
            교사용 비밀번호가 아직 설정되지 않았습니다. 담당 선생님께 문의해 주세요.
          </p>
        )}
      </div>
      <p className="mt-10 text-sm text-text-subtle">
        담당자는 <Link href="/exam/admin/login" className="font-semibold text-accent hover:underline">담당자 로그인</Link>으로 들어갑니다.
      </p>
    </main>
  );
}
