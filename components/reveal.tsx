"use client";

import { motion } from "motion/react";

// 화면에 들어올 때 한 번 아래에서 올라오며 나타난다.
// 움직임 줄이기 설정이면 MotionProvider가 이동을 끄고 투명도만 바꾼다.
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
