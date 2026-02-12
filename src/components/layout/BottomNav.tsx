'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, Heart, PlusSquare, MessageSquare, User as UserIcon, Home as HomeIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export default function BottomNav() {
    const pathname = usePathname();
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
        });
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });
        return () => subscription.unsubscribe();
    }, []);

    const navItems = [
        { label: 'Главная', href: '/', icon: HomeIcon },
        { label: 'Избранное', href: '/favorites', icon: Heart },
        { label: 'Разместить', href: '/ads/create', icon: PlusSquare },
        { label: 'Сообщения', href: '/chat', icon: MessageSquare },
        { label: 'Профиль', href: user ? '/profile' : '/login', icon: UserIcon },
    ];

    return (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-border z-[100] pb-safe">
            <div className="flex items-center justify-around py-2">
                {navItems.map((item, idx) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    const isCreate = item.label === 'Разместить';

                    if (isCreate) {
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="relative -top-6 flex flex-col items-center group active:scale-90 transition-all"
                            >
                                <div className="w-14 h-14 bg-primary text-white rounded-2xl flex items-center justify-center shadow-xl shadow-primary/40 border-4 border-background">
                                    <Icon className="h-7 w-7" />
                                </div>
                                <span className="text-[9px] font-black uppercase tracking-tighter mt-1 text-primary">{item.label}</span>
                            </Link>
                        );
                    }

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center justify-center gap-1 min-w-[60px] h-12 transition-all active:scale-90",
                                isActive ? "text-primary" : "text-muted"
                            )}
                        >
                            <Icon className={cn("h-6 w-6 transition-transform", isActive ? "scale-110" : "opacity-70")} />
                            <span className={cn(
                                "text-[9px] font-black uppercase tracking-tighter transition-all",
                                isActive ? "opacity-100" : "opacity-50"
                            )}>{item.label}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
