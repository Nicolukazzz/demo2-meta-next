"use client";

import React, { useState } from "react";

interface BusinessLogoProps {
    logoUrl?: string;
    businessName: string;
    size?: "sm" | "md" | "lg" | "xl";
    primaryColor?: string;
    className?: string;
}

const sizeClasses = {
    sm: "h-8 w-8 text-sm",
    md: "h-10 w-10 text-base",
    lg: "h-12 w-12 text-lg",
    xl: "h-16 w-16 text-2xl",
};

export function BusinessLogo({
    logoUrl,
    businessName,
    size = "md",
    primaryColor = "#7c3aed",
    className = "",
}: BusinessLogoProps) {
    const [imageError, setImageError] = useState(false);

    // Get first letter of business name
    const firstLetter = businessName?.trim()?.[0]?.toUpperCase() || "?";

    // Check if we should show the image
    const showImage = logoUrl && logoUrl.trim() !== "" && !imageError;

    if (showImage) {
        return (
            <div className={`${sizeClasses[size]} rounded-xl overflow-hidden shrink-0 ${className}`}>
                <img
                    src={logoUrl}
                    alt={`Logo de ${businessName}`}
                    className="h-full w-full object-cover"
                    onError={() => setImageError(true)}
                />
            </div>
        );
    }

    // Fallback: Show first letter with gradient background
    return (
        <div
            className={`${sizeClasses[size]} rounded-xl flex items-center justify-center font-bold text-white shrink-0 ${className}`}
            style={{
                background: `linear-gradient(135deg, ${primaryColor}, ${adjustColor(primaryColor, -20)})`,
            }}
        >
            {firstLetter}
        </div>
    );
}

// Helper to darken/lighten a hex color
function adjustColor(hex: string, amount: number): string {
    // Remove # if present
    hex = hex.replace(/^#/, "");

    // Parse hex
    let r = parseInt(hex.substring(0, 2), 16);
    let g = parseInt(hex.substring(2, 4), 16);
    let b = parseInt(hex.substring(4, 6), 16);

    // Adjust
    r = Math.max(0, Math.min(255, r + amount));
    g = Math.max(0, Math.min(255, g + amount));
    b = Math.max(0, Math.min(255, b + amount));

    // Convert back to hex
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

export default BusinessLogo;
