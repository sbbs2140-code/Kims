import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { LOGIN_BLOCK_MINUTES, LOGIN_MAX_FAILS, SESSION_HOURS } from "./config";
import { db } from "./db";

// 담당자 비밀번호는 Vercel 환경변수 EXAM_ADMIN_PASSWORD 에만 둔다. DB에는 저장하지 않는다.
const COOKIE = "exam_admin";

function secret() {
  const pw = process.env.EXAM_ADMIN_PASSWORD;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!pw || !key) throw new Error("EXAM_ADMIN_PASSWORD 환경변수가 필요함");
  // 비밀번호를 바꾸면 이미 발급된 로그인이 모두 무효가 된다.
  return `${pw}:${key}`;
}

function sign(expires: number) {
  return createHmac("sha256", secret()).update(String(expires)).digest("hex");
}

function safeEqual(a: string, b: string) {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export async function isAdmin(): Promise<boolean> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return false;
  const [exp, sig] = token.split(".");
  const expires = Number(exp);
  if (!sig || !Number.isFinite(expires) || expires < Date.now()) return false;
  return safeEqual(sig, sign(expires));
}

// 서버 액션과 보호된 화면의 첫 줄에서 호출한다.
export async function requireAdmin() {
  if (!(await isAdmin())) redirect("/exam/admin/login");
}

async function clientIp() {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "unknown").trim();
}

export type LoginResult = { ok: true } | { ok: false; message: string };

export async function login(password: string): Promise<LoginResult> {
  const ip = await clientIp();
  const supabase = db();
  const since = new Date(Date.now() - LOGIN_BLOCK_MINUTES * 60_000).toISOString();

  const { count } = await supabase
    .from("exam_admin_attempts")
    .select("id", { count: "exact", head: true })
    .eq("ip", ip)
    .eq("ok", false)
    .gte("created_at", since);
  if ((count ?? 0) >= LOGIN_MAX_FAILS) {
    return {
      ok: false,
      message: `비밀번호를 여러 번 틀렸습니다. ${LOGIN_BLOCK_MINUTES}분 뒤에 다시 시도해 주세요.`,
    };
  }

  const ok = safeEqual(password, process.env.EXAM_ADMIN_PASSWORD ?? "\0never");
  await supabase.from("exam_admin_attempts").insert({ ip, ok });
  if (!ok) return { ok: false, message: "비밀번호가 맞지 않습니다." };

  const expires = Date.now() + SESSION_HOURS * 3_600_000;
  (await cookies()).set(COOKIE, `${expires}.${sign(expires)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/exam",
    maxAge: SESSION_HOURS * 3600,
  });
  return { ok: true };
}

export async function logout() {
  (await cookies()).delete({ name: COOKIE, path: "/exam" });
}
