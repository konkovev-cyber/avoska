'use client';

import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Play, Volume2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export default function RightSidebar() {
    const pathname = usePathname();
    // Only show on home page or search page or category page
    // Hide on chat, profile, auth pages, ad details (maybe?)
    const shouldShow = ['/', '/search', '/category'].some(p => pathname === p || pathname.startsWith('/category'));
    // Or just show everywhere except admin/auth?
    // User said "main site web version". Let's show on main pages.
    // If we want it everywhere on desktop, we can just remove this check.
    // Usually ads are everywhere.

    // For now, let's keep it simple and show it everywhere except /admin, /login, /register
    const isHidden = pathname.startsWith('/admin') || pathname.startsWith('/login') || pathname.startsWith('/register');

    if (isHidden) return null;

    return (
        <aside className="hidden xl:flex flex-col gap-4 w-[320px] shrink-0 p-4 sticky top-24 h-[calc(100vh-6rem)] overflow-y-auto scrollbar-none">

            {/* Ad Block 1 - Video Style */}
            <div className="w-full bg-card rounded-3xl overflow-hidden shadow-sm border border-border/50 group relative aspect-[4/5] flex flex-col">
                <div className="relative flex-1 bg-black">
                    <img
                        src="/categories/hobby.jpg" // Placeholder
                        alt="Ad"
                        className="w-full h-full object-cover opacity-80 group-hover:opacity-60 transition-opacity"
                    />
                    <div className="absolute top-3 right-3 px-2 py-0.5 bg-black/40 backdrop-blur-md rounded-md text-[9px] font-black uppercase tracking-widest text-white/70">
                        Реклама
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                            <Play className="fill-white text-white translate-x-0.5 h-5 w-5" />
                        </div>
                    </div>
                    <div className="absolute bottom-3 left-3 flex items-center gap-2">
                        <div className="p-1.5 bg-black/40 backdrop-blur-md rounded-full text-white/70">
                            <Volume2 className="h-4 w-4" />
                        </div>
                    </div>
                </div>
                <div className="p-4 bg-surface">
                    <button className="w-full py-3 bg-foreground text-background rounded-xl font-black text-sm uppercase tracking-wider hover:opacity-90 transition-opacity">
                        Перейти
                    </button>
                </div>
            </div>

            {/* Ad Block 2 - Bank Style - Sticky bottom of sidebar? */}
            <div className="w-full bg-[#FFDD2D] rounded-3xl overflow-hidden shadow-sm border border-transparent group relative aspect-square flex flex-col">
                <div className="absolute top-3 right-3 px-2 py-0.5 bg-black/10 backdrop-blur-md rounded-md text-[9px] font-black uppercase tracking-widest text-black/40">
                    Реклама
                </div>
                <div className="p-6 flex flex-col h-full relative z-10">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center mb-4 shadow-sm">
                        <span className="font-black text-black">T</span>
                    </div>
                    <h3 className="text-2xl font-black text-black leading-tight mb-2">
                        Доходность вклада 15%
                    </h3>
                    <p className="text-black/70 font-bold text-xs leading-relaxed mb-auto">
                        Откройте накопительный вклад на 6 месяцев со ставкой 14.56%
                    </p>
                    <button className="mt-4 w-full py-3 bg-black text-white rounded-xl font-black text-sm uppercase tracking-wider hover:scale-[1.02] transition-transform shadow-lg">
                        Оформить
                    </button>
                </div>
                {/* Decorative image part */}
                <div className="absolute right-0 bottom-0 w-1/2 h-full opacity-20 bg-gradient-to-l from-black/20 to-transparent pointer-events-none" />
            </div>

            {/* Footer Links / Legal (Optional, often in sidebar) */}
            <div className="mt-auto pt-4 text-[10px] text-muted-foreground font-medium text-center">
                © 2024 Авоська+ <br />
                <Link href="/privacy" className="hover:underline">Конфиденциальность</Link> • <Link href="/terms" className="hover:underline">Оферта</Link>
            </div>
        </aside>
    );
}
