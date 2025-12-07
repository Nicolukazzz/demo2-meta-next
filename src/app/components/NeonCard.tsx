import React from "react";
import { usePrefersReducedMotion } from "./animation/usePrefersReducedMotion";

type Props = {
  className?: string;
  children: React.ReactNode;
  animated?: boolean;
};

function cx(...classes: Array<string | undefined | null | false>) {
  return classes.filter(Boolean).join(" ");
}

export default function NeonCard({ className, children, animated = true }: Props) {
  const reduce = usePrefersReducedMotion();
  const base = ["neon-card relative overflow-hidden"].join(" ");
  const animationClass = animated && !reduce ? "animate-card-fade" : "";
  return <div className={cx(base, animationClass, className)}>{children}</div>;
}
