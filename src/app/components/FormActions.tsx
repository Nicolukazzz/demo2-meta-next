import React from "react";

type Props = {
  children: React.ReactNode;
  className?: string;
};

export function FormActions({ children, className }: Props) {
  return (
    <div
      className={["flex flex-wrap items-center justify-end gap-3 pt-4", className]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}

