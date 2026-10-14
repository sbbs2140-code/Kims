import "server-only";
import { createClient } from "@supabase/supabase-js";

// 서비스 키는 서버에서만 쓴다. 브라우저로 내려가는 코드에 넣지 않는다.
// Vercel 환경변수: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
export function db() {
  // 붙여넣을 때 따라오기 쉬운 공백과 줄바꿈을 지운다.
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error("SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 환경변수가 필요함");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

// 서비스 키의 모양만 알려 준다. 키 값 자체는 돌려주지 않는다.
export function describeKey(): string[] {
  const raw = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const url = (process.env.SUPABASE_URL ?? "").trim();
  const key = raw.trim();
  const out: string[] = [];
  if (!key) return ["SUPABASE_SERVICE_ROLE_KEY가 비어 있음"];
  out.push(`길이 ${key.length}자`);
  if (raw !== key) out.push("앞뒤에 공백 또는 줄바꿈이 있었음(자동으로 지웠음)");
  if (/\s/.test(key)) out.push("키 중간에 공백 또는 줄바꿈이 있음 (잘못 붙여넣은 것)");
  if (/["']/.test(key)) out.push("따옴표가 들어 있음 (따옴표 없이 키만 넣어야 함)");
  if (key.startsWith("SUPABASE_") || key.includes("=")) out.push("변수 이름이나 = 가 함께 붙어 있음 (키 값만 넣어야 함)");
  if (key.startsWith("sb_secret_")) out.push("형식: secret 키(sb_secret_...) - 서버용으로 올바른 형식");
  else if (key.startsWith("sb_publishable_")) out.push("형식: publishable 키 - 공개용이라 서버용으로 쓰면 안 됨");
  else if (key.startsWith("eyJ")) {
    try {
      const payload = JSON.parse(Buffer.from(key.split(".")[1] ?? "", "base64url").toString("utf8"));
      const role = String(payload.role ?? "알 수 없음");
      const ref = String(payload.ref ?? "알 수 없음");
      out.push(`형식: 기존(JWT) 키, 역할=${role}${role === "service_role" ? " (올바름)" : " (service_role이어야 함)"}`);
      const urlRef = url.replace(/^https?:\/\//, "").split(".")[0];
      out.push(`키의 프로젝트 번호=${ref}, 주소의 프로젝트 번호=${urlRef}${ref === urlRef ? " (일치)" : " (서로 다름: 다른 프로젝트의 키임)"}`);
    } catch {
      out.push("형식: eyJ로 시작하지만 해석할 수 없음 (일부만 복사되었을 가능성)");
    }
  } else out.push(`형식을 알 수 없음 (시작 글자 ${key.slice(0, 4)})`);
  return out;
}

export type Term = {
  id: string;
  name: string;
  school_year: number;
  semester: number;
  kind: "중간" | "기말";
  published: boolean;
  created_at: string;
};

export type Teacher = {
  id: string;
  name: string;
  homeroom_grade: number | null;
  homeroom_class: number | null;
  subject: string | null;
  is_active: boolean;
};

export type Settings = {
  score_main: number;
  score_sub: number;
  score_free: number;
  max_day_exam: number;
  max_day_free: number;
  subject_rule: "period" | "room";
};

export type Slot = {
  id: string;
  term_id: string;
  exam_date: string;
  period: number;
  grade: number;
  class_no: number;
  kind: "시험" | "자율";
  subject: string | null;
  place: string | null;
};
