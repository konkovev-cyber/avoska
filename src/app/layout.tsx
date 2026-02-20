import type { Metadata } from "next";
// import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import Header from "@/components/layout/Header";
import ConditionalFooter from "@/components/layout/ConditionalFooter";
import BottomNav from "@/components/layout/BottomNav";
import PageAnimatePresence from "@/components/layout/PageAnimatePresence";
import AppUpdateCheck from "@/components/ui/AppUpdateCheck";
import "./globals.css";

// const geistSans = Geist({
//   variable: "--font-geist-sans",
//   subsets: ["latin"],
// });

// const geistMono = Geist_Mono({
//   variable: "--font-geist-mono",
//   subsets: ["latin"],
// });

export const metadata: Metadata = {
  title: "Авоська+ | Доска объявлений",
  description: "Покупай и продавай легко с Авоська+",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Авоська+",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: 0,
  themeColor: "#22C55E",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body
        className="antialiased flex flex-col min-h-screen"
      >
        <Header />

        {/* Main Layout Container */}
        <div className="flex-1 max-w-[1500px] mx-auto w-full">
          <main className="flex-1 min-w-0 pb-34 lg:pb-0 pt-safe">
            <PageAnimatePresence>
              {children}
            </PageAnimatePresence>
          </main>
        </div>

        <ConditionalFooter />
        <BottomNav />
        <AppUpdateCheck />
        <Toaster />
        {/* Yandex Maps API - ключ загружается из переменной окружения */}
        <script 
          src={`https://api-maps.yandex.ru/2.1/?lang=ru_RU&apikey=${process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY || ''}`} 
          type="text/javascript"
        />
      </body>
    </html>
  );
}

