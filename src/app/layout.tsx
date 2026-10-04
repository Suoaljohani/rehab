import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic, Noto_Naskh_Arabic } from "next/font/google";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

const plex = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-plex",
  display: "swap",
});

const naskh = Noto_Naskh_Arabic({
  subsets: ["arabic"],
  weight: ["500", "600", "700"],
  variable: "--font-naskh",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "مَسار — منصة التأهيل الطبي", template: "%s · مَسار" },
  description: "رعايتك التأهيلية لا تتوقف بانتهاء الجلسة. منصة رقمية تربط الجلسات الحضورية بالبرنامج المنزلي.",
  applicationName: "مَسار",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#F7F3EE",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={`${plex.variable} ${naskh.variable}`}>
      <body className="min-h-dvh">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[200] focus:rounded-[10px] focus:bg-ink focus:px-4 focus:py-2 focus:text-ivory">
          تخطَّ إلى المحتوى
        </a>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
