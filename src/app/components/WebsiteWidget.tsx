"use client";

import React, { useState, useCallback, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";

interface WebsiteWidgetProps {
    clientId: string;
    customBookingUrl?: string;
    className?: string;
}

export function WebsiteWidget({ clientId, customBookingUrl, className = "" }: WebsiteWidgetProps) {
    const [copied, setCopied] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const qrRef = useRef<HTMLDivElement>(null);

    // URL única para este negocio basada en su clientId
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

    const handleDownloadQR = useCallback(async () => {
        if (!qrRef.current) return;

        setDownloading(true);
        try {
            const svg = qrRef.current.querySelector("svg");
            if (!svg) return;

            // Create canvas from SVG
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            if (!ctx) return;

            // Set canvas size (larger for better quality)
            const size = 400;
            canvas.width = size;
            canvas.height = size;

            // Create image from SVG
            const svgData = new XMLSerializer().serializeToString(svg);
            const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
            const url = URL.createObjectURL(svgBlob);

            const img = new Image();
            img.onload = () => {
                // White background
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(0, 0, size, size);

                // Draw QR with padding
                const padding = 20;
                ctx.drawImage(img, padding, padding, size - padding * 2, size - padding * 2);

                // Download
                const link = document.createElement("a");
                link.download = `qr-reservas-${clientId}.png`;
                link.href = canvas.toDataURL("image/png");
                link.click();

                URL.revokeObjectURL(url);
                setDownloading(false);
            };
            img.onerror = () => {
                console.error("Failed to load QR image");
                setDownloading(false);
            };
            img.src = url;
        } catch (e) {
            console.error("Failed to download QR:", e);
            setDownloading(false);
        }
    }, [clientId]);

    return (
        <div className={`space-y-6 ${className}`}>
            {/* Main URL Card */}
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-6 backdrop-blur-sm">
                <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                        </svg>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                            Tu enlace de reservas
                        </p>
                        <p className="mt-1 text-sm text-slate-300 break-all font-mono bg-slate-900/50 rounded-lg px-3 py-2 border border-white/5">
                            {bookingUrl}
                        </p>
                    </div>
                </div>

                {/* Buttons */}
                <div className="mt-5 grid grid-cols-2 gap-3">
                    <button
                        onClick={handleCopy}
                        className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${copied
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/30"
                            : "bg-indigo-500 text-white hover:bg-indigo-600 shadow-lg shadow-indigo-500/25"
                            }`}
                    >
                        {copied ? (
                            <>
                                <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                                <span>¡Copiado!</span>
                            </>
                        ) : (
                            <>
                                <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                <span>Copiar enlace</span>
                            </>
                        )}
                    </button>
                    <a
                        href={bookingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold bg-white/10 text-white border border-white/10 hover:bg-white/20 transition-colors"
                    >
                        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        <span>Ver página</span>
                    </a>
                </div>
            </div>

            {/* QR Code Card - Real QR */}
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-6">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                    {/* QR Code Display */}
                    <div
                        ref={qrRef}
                        className="flex items-center justify-center p-4 bg-white rounded-xl shadow-lg"
                    >
                        <QRCodeSVG
                            value={bookingUrl}
                            size={140}
                            level="H"
                            includeMargin={false}
                            bgColor="#ffffff"
                            fgColor="#1e293b"
                        />
                    </div>

                    {/* QR Info */}
                    <div className="flex-1 text-center sm:text-left">
                        <p className="text-lg font-semibold text-white">Código QR de tu negocio</p>
                        <p className="mt-1 text-sm text-slate-400">
                            Imprime este código y colócalo en tu local. Tus clientes pueden escanearlo para reservar directamente.
                        </p>

                        {/* Download Button */}
                        <button
                            onClick={handleDownloadQR}
                            disabled={downloading}
                            className="mt-4 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-purple-500 text-white hover:bg-purple-600 transition-colors shadow-lg shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                        >
                            {downloading ? (
                                <>
                                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    <span>Descargando...</span>
                                </>
                            ) : (
                                <>
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                    <span>Descargar QR</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Tips Card */}
            <div className="rounded-xl border border-indigo-400/20 bg-indigo-500/10 p-4">
                <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/30 text-indigo-300">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-indigo-200">💡 Consejo</p>
                        <p className="mt-1 text-xs text-indigo-300/80">
                            Comparte tu enlace en Instagram, Facebook, o imprime el QR para que tus clientes reserven 24/7 desde cualquier lugar.
                        </p>
                    </div>
                </div>
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
