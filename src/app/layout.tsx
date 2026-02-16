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
      <head>
        {/* Yandex.Metrika counter */}
        <script
          type="text/javascript"
          dangerouslySetInnerHTML={{
            __html: `
              (function(m,e,t,r,i,k,a){
                m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
                m[i].l=1*new Date();
                for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
                k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
              })(window, document,'script','https://mc.yandex.ru/metrika/tag.js?id=106841974', 'ym');
              ym(106841974, 'init', {ssr:true, webvisor:true, clickmap:true, ecommerce:"dataLayer", referrer: document.referrer, url: location.href, accurateTrackBounce:true, trackLinks:true});
            `
          }}
        />
        <noscript>
          <div>
            <img src="https://mc.yandex.ru/watch/106841974" style={{position:'absolute', left:'-9999px'}} alt="" />
          </div>
        </noscript>
        {/* /Yandex.Metrika counter */}
      </head>
      <body
        className="antialiased flex flex-col min-h-screen"
      >
        <Header />

        {/* Main Layout Container */}
        <div className="flex-1 max-w-[1500px] mx-auto w-full flex flex-col">
          <main className="flex-1 min-w-0">
            <PageAnimatePresence>
              {children}
            </PageAnimatePresence>
          </main>
        </div>

        <ConditionalFooter />
        <BottomNav />
        <AppUpdateCheck />
        <Toaster />
        {/* Yandex Maps API */}
        <script src="https://api-maps.yandex.ru/2.1/?lang=ru_RU&apikey=87870950-716b-4560-9d04-58a44b58153b" type="text/javascript"></script>
      </body>
    </html>
  );
}

