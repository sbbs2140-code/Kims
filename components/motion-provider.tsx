"use client";

import { MotionConfig } from "motion/react";

// 운영체제의 "동작 줄이기" 설정을 따라 이동·크기 애니메이션을 끈다.
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
