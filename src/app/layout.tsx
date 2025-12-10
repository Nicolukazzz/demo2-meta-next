import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import ThemeProvider from "@/lib/theme/ThemeContext";
import { DEFAULT_BRAND_THEME } from "@/lib/theme";

const poppins = Poppins({
  variable: "--font-poppins",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Reserbox Dashboard",
  description: "Gestiona las reservas de tu negocio de manera fácil y eficiente",
};

const themeScript = `
(function() {
  try {
    var stored = localStorage.getItem("reserva-saas-theme");
    var fallback = ${JSON.stringify(DEFAULT_BRAND_THEME)};
    var colors = fallback;
    if (stored) {
      var parsed = JSON.parse(stored);
      colors = {
        primary: parsed.primary || fallback.primary,
        secondary: parsed.secondary || fallback.secondary,
        tertiary: parsed.tertiary || fallback.tertiary,
        cardMirrorEnabled: parsed.cardMirrorEnabled !== undefined ? parsed.cardMirrorEnabled : fallback.cardMirrorEnabled,
        cardMirrorIntensity: parsed.cardMirrorIntensity !== undefined ? parsed.cardMirrorIntensity : fallback.cardMirrorIntensity
      };
    }
    var root = document.documentElement;
    root.setAttribute("data-theme-ready", "true");
    root.style.setProperty("--brand-primary", colors.primary);
    root.style.setProperty("--brand-secondary", colors.secondary);
    root.style.setProperty("--brand-tertiary", colors.tertiary);
    root.style.setProperty("--brand-primary-soft", colors.primary + "40");
    root.style.setProperty("--brand-secondary-soft", colors.secondary + "40");
    root.style.setProperty("--brand-tertiary-soft", colors.tertiary + "40");
    root.style.setProperty("--brand-primary-hover", colors.primary);
    root.style.setProperty("--brand-secondary-hover", colors.secondary);
    root.style.setProperty("--brand-tertiary-hover", colors.tertiary);
    root.style.setProperty("--brand-gradient", "linear-gradient(135deg, " + colors.primary + ", " + colors.secondary + ", " + colors.tertiary + ")");
    
    // Mirror settings
    if (colors.cardMirrorEnabled === false) {
       root.style.setProperty("--card-mirror-enabled", "0");
    } else {
       root.style.setProperty("--card-mirror-enabled", "1");
    }
    root.style.setProperty("--card-mirror-intensity", (colors.cardMirrorIntensity || 50).toString());
  } catch (e) {
    document.documentElement.setAttribute("data-theme-ready", "true");
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${poppins.variable} antialiased`}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
