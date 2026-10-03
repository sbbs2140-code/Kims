// 앱 목록 데이터. 아래 항목은 예시이므로 실제 앱 이름과 주소(href)로 바꿔서 사용한다.
// 새 앱을 추가하려면 배열에 항목 하나를 더 넣으면 된다.

export type Category = "수업" | "생활지도" | "행정";
export type Audience = "교사" | "학생" | "학부모";
export type Status = "운영 중" | "점검 중" | "준비 중";
export type IconKey =
  | "book"
  | "checklist"
  | "exam"
  | "quiz"
  | "calendar"
  | "heart"
  | "rules"
  | "letter"
  | "document"
  | "package";

export type SchoolApp = {
  id: string;
  name: string;
  description: string;
  category: Category;
  audience: Audience[];
  status: Status;
  href: string;
  icon: IconKey;
  pinned?: boolean;
};

export const categories: Category[] = ["수업", "생활지도", "행정"];

export const apps: SchoolApp[] = [
  {
    id: "hanja-cards",
    name: "한자 카드 학습",
    description: "배운 한자를 카드로 복습하고 스스로 점검합니다.",
    category: "수업",
    audience: ["학생"],
    status: "운영 중",
    href: "#",
    icon: "book",
    pinned: true,
  },
  {
    id: "class-progress",
    name: "학급별 진도표",
    description: "반마다 다른 진도를 한 표에서 기록하고 비교합니다.",
    category: "수업",
    audience: ["교사"],
    status: "운영 중",
    href: "#",
    icon: "checklist",
    pinned: true,
  },
  {
    id: "rubric-grader",
    name: "수행평가 채점 도우미",
    description: "루브릭 기준으로 채점하고 결과를 학급별로 정리합니다.",
    category: "수업",
    audience: ["교사"],
    status: "운영 중",
    href: "#",
    icon: "exam",
  },
  {
    id: "unit-quiz",
    name: "단원 퀴즈",
    description: "단원을 마치면 짧은 퀴즈로 이해도를 확인합니다.",
    category: "수업",
    audience: ["학생"],
    status: "준비 중",
    href: "#",
    icon: "quiz",
  },
  {
    id: "counseling",
    name: "상담 예약",
    description: "학생과 학부모가 빈 시간을 골라 상담을 신청합니다.",
    category: "생활지도",
    audience: ["학생", "학부모"],
    status: "운영 중",
    href: "#",
    icon: "calendar",
    pinned: true,
  },
  {
    id: "character-log",
    name: "인성교육 활동 기록",
    description: "학급별 인성교육 활동과 참여 결과를 남깁니다.",
    category: "생활지도",
    audience: ["교사"],
    status: "운영 중",
    href: "#",
    icon: "heart",
  },
  {
    id: "school-rules",
    name: "학교생활규정 안내",
    description: "자주 묻는 규정을 검색해서 바로 확인합니다.",
    category: "생활지도",
    audience: ["학생", "학부모"],
    status: "점검 중",
    href: "#",
    icon: "rules",
  },
  {
    id: "newsletter",
    name: "가정통신문 작성",
    description: "학교 문서 형식에 맞춘 가정통신문 초안을 만듭니다.",
    category: "행정",
    audience: ["교사"],
    status: "운영 중",
    href: "#",
    icon: "letter",
    pinned: true,
  },
  {
    id: "draft-helper",
    name: "기안문 도우미",
    description: "제목, 관련 근거, 붙임을 형식에 맞게 정리합니다.",
    category: "행정",
    audience: ["교사"],
    status: "운영 중",
    href: "#",
    icon: "document",
  },
  {
    id: "supplies",
    name: "물품 신청",
    description: "필요한 물품을 신청하고 처리 상태를 확인합니다.",
    category: "행정",
    audience: ["교사"],
    status: "준비 중",
    href: "#",
    icon: "package",
  },
];

// 최근 소식. 날짜와 내용도 예시이므로 실제 소식으로 바꾼다.
export type NewsItem = { date: string; title: string; body: string };

export const news: NewsItem[] = [
  {
    date: "2026-09-29",
    title: "기안문 도우미를 추가했습니다",
    body: "행정 분류에서 바로 열 수 있습니다.",
  },
  {
    date: "2026-09-22",
    title: "학교생활규정 안내 점검",
    body: "개정 규정을 반영하는 동안 일부 검색이 제한됩니다.",
  },
  {
    date: "2026-09-15",
    title: "상담 예약에 학부모 신청을 열었습니다",
    body: "학부모도 같은 화면에서 상담 시간을 고를 수 있습니다.",
  },
];

// 앱 등록 요청을 받을 주소. 설문지나 메일 주소로 바꾼다.
export const REGISTER_URL = "#";
