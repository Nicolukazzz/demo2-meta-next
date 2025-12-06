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
  const base =
    [
      "neon-card",
      "relative overflow-hidden rounded-2xl",
      "border border-white/10 ring-1 ring-indigo-500/15",
      "bg-slate-900/60 backdrop-blur",
      "shadow-lg shadow-cyan-500/20",
      "before:pointer-events-none before:absolute before:inset-[-45%] before:-z-10",
      "before:bg-gradient-to-r before:from-indigo-500/15 before:via-cyan-400/10 before:to-fuchsia-500/15",
      "before:opacity-60 before:blur-3xl before:content-['']",
    ].join(" ");
  const animationClass = animated && !reduce ? "animate-card-fade" : "";
  return <div className={cx(base, animationClass, className)}>{children}</div>;
}
