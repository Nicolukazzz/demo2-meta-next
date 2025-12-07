"use client";

import React from "react";
import { useTheme } from "@/lib/theme/ThemeContext";
import { usePrefersReducedMotion } from "./animation/usePrefersReducedMotion";

type Props = {
    className?: string;
    children: React.ReactNode;
    animated?: boolean;
    variant?: "card" | "panel";
};

function cx(...classes: Array<string | undefined | null | false>) {
    return classes.filter(Boolean).join(" ");
}

export default function Surface({ className, children, animated = true, variant = "card" }: Props) {
    const { colors } = useTheme();
    const reduce = usePrefersReducedMotion();

    const base = "relative overflow-hidden rounded-[18px] border transition-all";
    const animationClass = animated && !reduce ? "animate-card-fade" : "";

    // Dynamic styles based on mirror settings
    // We use CSS variables if available for initial render, but also JS state for updates
    const mirrorEnabled = colors.cardMirrorEnabled;
    const intensity = colors.cardMirrorIntensity / 100; // 0 to 1

    const style: React.CSSProperties = {
        borderColor: "var(--brand-primary-soft, rgba(99, 102, 241, 0.22))",
    };

    if (mirrorEnabled) {
        // Mirror effect: lighter background, more glass-like
        style.background = `
      radial-gradient(circle at 20% 20%, rgba(99, 102, 241, ${0.06 + 0.1 * intensity}), transparent 35%),
      radial-gradient(circle at 80% 10%, rgba(16, 185, 129, ${0.06 + 0.1 * intensity}), transparent 35%),
      radial-gradient(circle at 50% 90%, rgba(56, 189, 248, ${0.05 + 0.1 * intensity}), transparent 40%),
      rgba(15, 23, 42, ${0.88 - 0.2 * intensity})
    `;
        style.backdropFilter = `blur(${12 + 8 * intensity}px)`;
        style.boxShadow = `0 18px 50px -38px rgba(79, 70, 229, ${0.45 + 0.2 * intensity})`;
    } else {
        // Flat / Standard dark card
        style.background = "rgba(15, 23, 42, 0.95)";
        style.backdropFilter = "none";
        style.boxShadow = "none";
    }

    return (
        <div className={cx(base, animationClass, className)} style={style}>
            {mirrorEnabled && (
                <div
                    className="pointer-events-none absolute inset-[-40%] z-0 opacity-[0.08]"
                    style={{
                        background: `conic-gradient(from 120deg, var(--brand-primary), var(--brand-secondary), var(--brand-tertiary), var(--brand-primary))`,
                        filter: "blur(55px)",
                    }}
                />
            )}
            <div className="relative z-10">{children}</div>
        </div>
    );
}
