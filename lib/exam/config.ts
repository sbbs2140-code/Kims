// 시험 감독 배정 앱 설정값. 코딩 없이 이 파일 위쪽 숫자만 고치면 된다.
// 점수와 하루 한도는 앱의 '설정' 화면에서도 바꿀 수 있고, 아래 값은 처음 시작값이다.

// 학년별 학급 수 (학년당 11반)
export const CLASSES_PER_GRADE: Record<number, number> = { 1: 11, 2: 11, 3: 11 };

// 하루 최대 교시 수
export const MAX_PERIOD = 3;

// 점수 처음값 (정감독 > 부감독 > 자율감독)
export const DEFAULT_SCORES = { main: 1.0, sub: 0.8, free: 0.5 };

// 하루 최대 감독 교시 수 처음값
export const DEFAULT_MAX_DAY = { exam: 2, free: 2 };

// 담당자 로그인: 5회 틀리면 10분 동안 막음
export const LOGIN_MAX_FAILS = 5;
export const LOGIN_BLOCK_MINUTES = 10;

// 로그인 유지 시간(시간)
export const SESSION_HOURS = 12;

// 화면에 보이는 문구
export const LABELS = {
  appName: "시험 감독 배정",
  roleMain: "정감독",
  roleSub: "부감독",
  roleFree: "자율감독",
};

// 한 학급에 필요한 감독 수: 시험은 정감독 1 + 부감독 1, 자율은 1
export const NEED_PER_CLASS = { 시험: 2, 자율: 1 } as const;
