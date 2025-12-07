"use client";

import Surface from "./Surface";

type Props = {
    className?: string;
    children: React.ReactNode;
    animated?: boolean;
};

export default function NeonCard({ className, children, animated = true }: Props) {
    return <Surface className={className} animated={animated} variant="card">{children}</Surface>;
}
