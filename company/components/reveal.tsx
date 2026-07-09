"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

interface RevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export default function Reveal({ children, className = "", delay = 0 }: RevealProps) {
  const reduce = useReducedMotion();
  const hidden = { opacity: 0, y: 22 };
  const visible = { opacity: 1, y: 0 };

  return (
    <motion.div
      data-reveal="true"
      className={className}
      initial={reduce ? false : hidden}
      animate={reduce ? visible : undefined}
      whileInView={reduce ? undefined : visible}
      viewport={{ once: true, amount: 0.22 }}
      transition={reduce ? { duration: 0 } : { duration: 0.55, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
