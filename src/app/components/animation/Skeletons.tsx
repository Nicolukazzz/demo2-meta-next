import React from "react";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

type SkeletonProps = { className?: string };

const shimmer =
  "relative overflow-hidden isolate before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.6s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent";

export function SkeletonCard({ className }: SkeletonProps) {
  const reduce = usePrefersReducedMotion();
  const base =
    "rounded-2xl border border-white/10 bg-white/5 backdrop-blur h-24 " +
    (reduce ? "" : shimmer);
  return <div className={[base, className].filter(Boolean).join(" ")} />;
}

export function SkeletonLine({ className }: SkeletonProps) {
  const reduce = usePrefersReducedMotion();
  const base =
    "h-3 rounded-full bg-white/10 " + (reduce ? "" : shimmer);
  return <div className={[base, className].filter(Boolean).join(" ")} />;
}

export function SkeletonListItem({ className }: SkeletonProps) {
  return (
    <div className={["rounded-xl border border-white/5 bg-white/5 p-3", className].filter(Boolean).join(" ")}>
      <SkeletonLine className="mb-2 w-1/2" />
      <SkeletonLine className="w-1/3" />
    </div>
  );
}

