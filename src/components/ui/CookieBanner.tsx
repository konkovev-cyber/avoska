'use client';

import { useState, useEffect } from 'react';
import { X, Cookie } from 'lucide-react';
import Link from 'next/link';

export default function CookieBanner() {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Проверяем, было ли уже получено согласие
        const consent = localStorage.getItem('cookie_consent');
        if (!consent) {
            // Небольшая задержка перед показом для лучшего UX
            const timer = setTimeout(() => setIsVisible(true), 1000);
            return () => clearTimeout(timer);
        }
    }, []);

    const acceptCookies = () => {
        localStorage.setItem('cookie_consent', 'true');
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 md:bottom-4 md:left-4 md:right-auto z-50 animate-in slide-in-from-bottom-10 fade-in duration-500">
            <div className="bg-surface border border-border shadow-2xl md:rounded-[2rem] rounded-t-[2rem] p-5 md:p-6 md:max-w-sm flex gap-4 items-start relative pb-8 md:pb-6">
                <button
                    onClick={() => setIsVisible(false)}
                    className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors p-1"
                >
                    <X className="h-4 w-4" />
                </button>

                <div className="p-3 bg-primary/10 rounded-2xl text-primary shrink-0 hidden md:block">
                    <Cookie className="h-6 w-6" />
                </div>

                <div className="flex-1 shrink-0 pt-1">
                    <div className="flex items-center gap-2 mb-2 md:hidden text-primary">
                        <Cookie className="h-5 w-5" />
                        <h3 className="font-bold text-sm">Использование файлов Cookie</h3>
                    </div>
                    <p className="text-xs font-medium text-muted-foreground leading-relaxed mb-4">
                        Мы используем файлы cookie для обеспечения безопасности, авторизации и улучшения работы сервиса.
                        Продолжая работу с сайтом, вы принимаете условия <Link href="/privacy" className="text-primary font-semibold hover:underline">Политики обработки ПДн</Link>.
                    </p>
                    <button
                        onClick={acceptCookies}
                        className="w-full bg-primary text-white font-bold text-xs uppercase tracking-widest py-3 rounded-xl hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 active:scale-95"
                    >
                        Понятно, согласен
                    </button>
                </div>
            </div>
        </div>
    );
}
