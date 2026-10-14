import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { LOGIN_BLOCK_MINUTES, LOGIN_MAX_FAILS, SESSION_HOURS } from "./config";
import { db } from "./db";

// 비밀번호는 Vercel 환경변수에만 둔다. DB에는 저장하지 않는다.
//   EXAM_ADMIN_PASSWORD   : 담당자(편성·수정)
//   EXAM_TEACHER_PASSWORD : 교사 공용(감독표 조회)
type Kind = "admin" | "teacher";

const COOKIE: Record<Kind, string> = { admin: "exam_admin", teacher: "exam_teacher" };
const ENV: Record<Kind, string> = { admin: "EXAM_ADMIN_PASSWORD", teacher: "EXAM_TEACHER_PASSWORD" };

function configured(kind: Kind) {
  return Boolean(process.env[ENV[kind]] && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function secret(kind: Kind) {
  const pw = process.env[ENV[kind]];
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!pw || !key) throw new Error(`${ENV[kind]} 환경변수가 필요함`);
  // 비밀번호를 바꾸면 이미 발급된 로그인이 모두 무효가 된다.
  return `${kind}:${pw}:${key}`;
}

function sign(kind: Kind, expires: number) {
  return createHmac("sha256", secret(kind)).update(String(expires)).digest("hex");
}

function safeEqual(a: string, b: string) {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

async function hasSession(kind: Kind): Promise<boolean> {
  if (!configured(kind)) return false;
  const token = (await cookies()).get(COOKIE[kind])?.value;
  if (!token) return false;
  const [exp, sig] = token.split(".");
  const expires = Number(exp);
  if (!sig || !Number.isFinite(expires) || expires < Date.now()) return false;
  return safeEqual(sig, sign(kind, expires));
}

export const isAdmin = () => hasSession("admin");

// 교사 비밀번호로 들어왔거나 담당자로 로그인한 경우
export async function isTeacher(): Promise<boolean> {
  return (await hasSession("teacher")) || (await hasSession("admin"));
}

export function teacherPasswordConfigured() {
  return configured("teacher");
}

// 서버 액션과 보호된 화면의 첫 줄에서 호출한다.
export async function requireAdmin() {
  if (!(await isAdmin())) redirect("/exam/admin/login");
}

// 교사용 화면의 첫 줄에서 호출한다. 로그인 뒤 돌아올 경로를 넘긴다.
export async function requireTeacher(next: string) {
  if (!(await isTeacher())) redirect(`/exam/enter?next=${encodeURIComponent(next)}`);
}

// 로그인 뒤 돌아갈 경로는 이 앱 안의 /exam 아래로만 허용한다.
export function safeNext(value: string | null | undefined, fallback = "/exam") {
  if (!value || !value.startsWith("/exam") || value.startsWith("//") || value.includes("\\")) return fallback;
  if (value.startsWith("/exam/admin")) return fallback;
  return value;
}

async function clientIp() {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "unknown").trim();
}

export type LoginResult = { ok: true } | { ok: false; message: string };

async function loginAs(kind: Kind, password: string): Promise<LoginResult> {
  if (!configured(kind)) {
    return {
      ok: false,
      message:
        kind === "teacher"
          ? "교사용 비밀번호가 아직 설정되지 않았습니다. 담당 선생님께 문의해 주세요."
          : "담당자 비밀번호가 아직 설정되지 않았습니다.",
    };
  }
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

  const ok = safeEqual(password, process.env[ENV[kind]] ?? "\0never");
  await supabase.from("exam_admin_attempts").insert({ ip, ok });
  if (!ok) return { ok: false, message: "비밀번호가 맞지 않습니다." };

  const expires = Date.now() + SESSION_HOURS * 3_600_000;
  (await cookies()).set(COOKIE[kind], `${expires}.${sign(kind, expires)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/exam",
    maxAge: SESSION_HOURS * 3600,
  });
  return { ok: true };
}

export const login = (password: string) => loginAs("admin", password);
export const teacherLogin = (password: string) => loginAs("teacher", password);

export async function logout() {
  (await cookies()).delete({ name: COOKIE.admin, path: "/exam" });
}

export async function teacherLogout() {
  (await cookies()).delete({ name: COOKIE.teacher, path: "/exam" });
}
