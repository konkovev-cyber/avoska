import type { Metadata } from "next";
import Script from "next/script";
import { Toaster } from "sonner";
import Header from "@/components/layout/Header";
import ConditionalFooter from "@/components/layout/ConditionalFooter";
import BottomNav from "@/components/layout/BottomNav";
import PageAnimatePresence from "@/components/layout/PageAnimatePresence";
import AppUpdateCheck from "@/components/ui/AppUpdateCheck";
import ServiceWorkerRegistration from "@/components/notifications/ServiceWorkerRegistration";
import CookieBanner from "@/components/ui/CookieBanner";
import SupabaseStatus from "@/components/ui/SupabaseStatus";
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
      <head>
        <style dangerouslySetInnerHTML={{
          __html: `
          #splash {
            position: fixed;
            inset: 0;
            z-index: 99999;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: #F5F5F5;
            transition: opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1);
          }
          .dark #splash { background: #020617; }
          #splash.fade-out { opacity: 0; pointer-events: none; }
          
          .splash-container {
            position: relative;
            display: flex;
            flex-direction: column;
            align-items: center;
            animation: splashEnter 1.2s cubic-bezier(0.22, 1, 0.36, 1) forwards;
          }

          .splash-logo-box {
            position: relative;
            width: 300px;
            max-width: 85vw;
            border-radius: 2.5rem;
            overflow: hidden;
            box-shadow: 0 30px 60px rgba(0,0,0,0.12);
            background: white;
            border: 1px solid rgba(0,0,0,0.05);
          }
          .dark .splash-logo-box { 
            background: #1e293b;
            box-shadow: 0 30px 60px rgba(0,0,0,0.4);
            border-color: rgba(255,255,255,0.05);
          }

          .splash-logo { 
            display: block; 
            width: 100%; 
            height: auto;
            transform: scale(1.05);
            transition: transform 3s ease-out;
          }
          #splash:not(.fade-out) .splash-logo {
            transform: scale(1);
          }

          .splash-glow {
            position: absolute;
            inset: -40px;
            background: radial-gradient(circle, rgba(46, 125, 50, 0.25) 0%, transparent 70%);
            filter: blur(20px);
            z-index: -1;
            animation: pulseGlow 4s infinite ease-in-out;
          }

          .splash-bar {
            width: 220px;
            max-width: 65vw;
            height: 4px;
            background: rgba(0,0,0,0.05);
            border-radius: 10px;
            margin-top: 48px;
            overflow: hidden;
            position: relative;
          }
          .dark .splash-bar { background: rgba(255,255,255,0.05); }
          
          .splash-bar-fill {
            height: 100%;
            width: 0;
            border-radius: 10px;
            background: linear-gradient(90deg, #2E7D32, #FF6D00, #2E7D32);
            background-size: 200% 100%;
            animation: barGrow 2.8s cubic-bezier(0.65, 0, 0.35, 1) forwards, gradientShift 2s infinite linear;
          }

          @keyframes splashEnter {
            from { opacity: 0; transform: translateY(30px) scale(0.9); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }

          @keyframes pulseGlow {
            0%, 100% { opacity: 0.4; transform: scale(1); }
            50% { opacity: 0.8; transform: scale(1.15); }
          }

          @keyframes barGrow {
            0% { width: 0; }
            40% { width: 35%; }
            70% { width: 85%; }
            100% { width: 100%; }
          }

          @keyframes gradientShift {
            0% { background-position: 0% 50%; }
            100% { background-position: 200% 50%; }
          }
        `}} />
        <script dangerouslySetInnerHTML={{
          __html: `
          (function() {
            // Scroll restore
            if (sessionStorage.getItem('home_restore')) {
              var y = parseInt(sessionStorage.getItem('home_scrollY') || '0', 10);
              if (y > 0) {
                window.__scrollRestore = y;
                var s = document.createElement('style');
                s.id = 'scroll-restore-style';
                s.textContent = '#root-content { visibility: hidden !important }';
                document.head.appendChild(s);
              }
            }

            // PWA & APK Versioning (Hard Reset on Update)
            if (typeof window !== 'undefined') {
              try {
                // Robust Splash Hide Logic
                var splashHidden = false;
                function hideSplash() {
                  if (splashHidden) return;
                  splashHidden = true;
                  var splash = document.getElementById('splash');
                  if (splash) {
                    splash.classList.add('fade-out');
                    setTimeout(function() { splash.style.display = 'none'; }, 1000);
                  }
                }

                window.addEventListener('load', hideSplash);
                setTimeout(hideSplash, 3500); // Fail-safe
                window.__hideSplash = hideSplash;

              } catch (e) {
                console.error('Core script error:', e);
              }
            }
          })();
        `}} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "Авоська+",
              "url": "https://avoska.ru",
              "potentialAction": {
                "@type": "SearchAction",
                "target": "https://avoska.ru/search?q={search_term_string}",
                "query-input": "required name=search_term_string"
              }
            })
          }}
        />
      </head>
      <body
        className="antialiased flex flex-col min-h-screen"
        suppressHydrationWarning
      >
        <div id="splash">
          <div className="splash-container">
            <div className="splash-glow"></div>
            <div className="splash-logo-box">
              <img src="/splash_logo.png" alt="Авоська+" className="splash-logo" />
            </div>
            <div className="splash-bar">
              <div className="splash-bar-fill"></div>
            </div>
          </div>
        </div>

        <div id="root-content" className="flex-1 flex flex-col min-h-screen">
          <Header />

          {/* Main Layout Container */}
          <div className="flex-1 max-w-[1500px] mx-auto w-full">
            <main className="flex-1 min-w-0 pb-40 lg:pb-0 pt-safe">
              <PageAnimatePresence>
                {children}
              </PageAnimatePresence>
            </main>
          </div>

          <ConditionalFooter />
          <BottomNav />
        </div>

        {/* <AppUpdateCheck /> */}
        <ServiceWorkerRegistration />
        <CookieBanner />
        <SupabaseStatus />
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
