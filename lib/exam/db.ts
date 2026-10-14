import "server-only";
import { createClient } from "@supabase/supabase-js";

// 서비스 키는 서버에서만 쓴다. 브라우저로 내려가는 코드에 넣지 않는다.
// Vercel 환경변수: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
export function db() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 환경변수가 필요함");
  }
  return createClient(url, key, { auth: { persistSession: false } });
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
