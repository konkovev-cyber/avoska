import type { Metadata } from "next";
import Script from "next/script";
import { Toaster } from "sonner";
import Header from "@/components/layout/Header";
import ConditionalFooter from "@/components/layout/ConditionalFooter";
import BottomNav from "@/components/layout/BottomNav";
import PageAnimatePresence from "@/components/layout/PageAnimatePresence";
import AppUpdateCheck from "@/components/ui/AppUpdateCheck";
import ServiceWorkerRegistration from "@/components/notifications/ServiceWorkerRegistration";
import "./globals.css";

export const metadata: Metadata = {
  title: "Авоська+ | Доска объявлений",
  description: "Покупай и продавай легко с Авоська+",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: '48x48' },
    ],
    apple: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
  },
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
      <head />
      <body
        className="antialiased flex flex-col min-h-screen"
        suppressHydrationWarning
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
        <ServiceWorkerRegistration />
        <Toaster />

        {/* Yandex Maps API */}
        <Script
          src="https://api-maps.yandex.ru/2.1/?lang=ru_RU&apikey=d446ac2a-b5c1-4b45-86de-d25432622c8a"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
