import React from "react";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

type Props = {
  children: React.ReactNode;
  className?: string;
};

export function AnimatedModal({ children, className }: Props) {
  const reduce = usePrefersReducedMotion();
  const contentClass = [
    "animate-modal-in",
    reduce ? "motion-reduce:animate-none" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div className="animate-overlay-fade">
      <div className={contentClass}>{children}</div>
    </div>
  );
}

