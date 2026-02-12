import type { Metadata } from "next";
// import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import Header from "@/components/layout/Header";
import ConditionalFooter from "@/components/layout/ConditionalFooter";
import BottomNav from "@/components/layout/BottomNav";
import PageAnimatePresence from "@/components/layout/PageAnimatePresence";
import "./globals.css";

// const geistSans = Geist({
//   variable: "--font-geist-sans",
//   subsets: ["latin"],
// });

// const geistMono = Geist_Mono({
//   variable: "--font-geist-mono",
//   subsets: ["latin"],
// });

export const viewport = {
  themeColor: "#22C55E",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: 0,
};

export const metadata: Metadata = {
  title: "Авоська+ | Доска объявлений",
  description: "Покупай and продавай легко с Авоська+",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Авоська+",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body
        className="antialiased flex flex-col min-h-screen"
      >
        <Header />
        <main className="flex-1 pb-20 lg:pb-0">
          <PageAnimatePresence>
            {children}
          </PageAnimatePresence>
        </main>
        <BottomNav />
        <Toaster />
      </body>
    </html>
  );
}

