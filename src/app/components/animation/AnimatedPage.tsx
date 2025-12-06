import React from "react";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

type Props = {
  children: React.ReactNode;
  className?: string;
};

export function AnimatedPage({ children, className }: Props) {
  const reduce = usePrefersReducedMotion();
  const cls = [
    "animate-page-fade",
    "motion-safe:animate-page-fade",
    reduce ? "motion-reduce:animate-none" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return <div className={cls}>{children}</div>;
}

