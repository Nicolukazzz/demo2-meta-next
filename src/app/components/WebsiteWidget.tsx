"use client";

import React, { useState, useCallback } from "react";

interface WebsiteWidgetProps {
    clientId: string;
    customBookingUrl?: string;
    className?: string;
}

export function WebsiteWidget({ clientId, customBookingUrl, className = "" }: WebsiteWidgetProps) {
    const [copied, setCopied] = useState(false);

    const bookingUrl = customBookingUrl
        || (typeof window !== "undefined"
            ? `${window.location.origin}/book/${clientId}`
            : `/book/${clientId}`);

    const handleCopy = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(bookingUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (e) {
            console.error("Failed to copy:", e);
        }
    }, [bookingUrl]);

    return (
        <div className={`rounded-xl border border-white/10 bg-slate-800/60 p-4 ${className}`}>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400 mb-3">
                Sitio Web
            </p>

            <p className="text-xs text-slate-300 break-all font-mono bg-slate-900/50 rounded-lg px-3 py-2 mb-3">
                {bookingUrl}
            </p>

            <div className="grid grid-cols-2 gap-2">
                <button
                    onClick={handleCopy}
                    className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${copied
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/30"
                            : "bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 hover:bg-indigo-500/30"
                        }`}
                >
                    {copied ? (
                        <>
                            <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            <span>Copiado</span>
                        </>
                    ) : (
                        <>
                            <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            <span>Copiar</span>
                        </>
                    )}
                </button>
                <a
                    href={bookingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10 transition-colors"
                >
                    <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    <span>Ver</span>
                </a>
            </div>
        </div>
    );
}

export function WebsiteLinkCompact({ clientId, customBookingUrl }: { clientId: string; customBookingUrl?: string }) {
    const [copied, setCopied] = useState(false);

    const bookingUrl = customBookingUrl
        || (typeof window !== "undefined"
            ? `${window.location.origin}/book/${clientId}`
            : `/book/${clientId}`);

    const handleCopy = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(bookingUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (e) {
            console.error("Failed to copy:", e);
        }
    }, [bookingUrl]);

    return (
        <div className="rounded-lg bg-indigo-500/10 border border-indigo-400/20 p-3">
            <p className="text-xs text-slate-400 mb-2">Tu sitio web</p>
            <p className="text-xs text-indigo-300 break-all font-mono mb-3">{bookingUrl}</p>
            <div className="grid grid-cols-2 gap-2">
                <button
                    onClick={handleCopy}
                    className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${copied
                            ? "bg-emerald-500/20 text-emerald-300"
                            : "bg-indigo-500/20 text-indigo-200 hover:bg-indigo-500/30"
                        }`}
                >
                    {copied ? (
                        <>
                            <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            <span>Copiado</span>
                        </>
                    ) : (
                        <>
                            <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            <span>Copiar</span>
                        </>
                    )}
                </button>
                <a
                    href={bookingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/10 text-white hover:bg-white/15 transition-colors"
                >
                    <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    <span>Ver</span>
                </a>
            </div>
        </div>
    );
}

export default WebsiteWidget;
