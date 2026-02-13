import type { Metadata } from "next";
// import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import Header from "@/components/layout/Header";
import ConditionalFooter from "@/components/layout/ConditionalFooter";
import BottomNav from "@/components/layout/BottomNav";
import PageAnimatePresence from "@/components/layout/PageAnimatePresence";
import RightSidebar from "@/components/layout/RightSidebar";
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

        {/* Main Layout Container */}
        <div className="flex-1 flex max-w-[1500px] mx-auto w-full">
          <main className="flex-1 min-w-0 pb-32 lg:pb-0">
            <PageAnimatePresence>
              {children}
            </PageAnimatePresence>
          </main>

          {/* Right Sidebar - PC Only */}
          <RightSidebar />
        </div>

        <BottomNav />
        <Toaster />
      </body>
    </html>
  );
}

