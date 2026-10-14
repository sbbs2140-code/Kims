import { redirect } from "next/navigation";
import { StatefulForm } from "@/components/exam/stateful-form";
import { isAdmin } from "@/lib/exam/auth";
import { input, label } from "@/lib/exam/ui";
import { loginAction } from "../actions";

export default async function LoginPage() {
  if (await isAdmin()) redirect("/exam/admin");

  return (
    <main className="mx-auto max-w-md px-4 py-20 md:px-8 lg:py-32">
      <h1 className="text-3xl leading-[1.25] font-bold tracking-[-0.02em]">담당자 로그인</h1>
      <p className="mt-4 text-base text-text-muted">
        시험 감독 편성은 담당자만 할 수 있습니다.
      </p>
      <div className="mt-8">
        <StatefulForm action={loginAction} submitLabel="로그인">
          <div>
            <label htmlFor="password" className={label}>
              담당자 비밀번호
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className={input}
            />
          </div>
        </StatefulForm>
      </div>
    </main>
  );
}
