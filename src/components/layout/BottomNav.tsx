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
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center gap-1 min-w-[64px] transition-colors",
                                isActive ? "text-primary" : "text-muted hover:text-foreground"
                            )}
                        >
                            <Icon className={cn("h-6 w-6", isActive && "fill-current")} />
                            <span className="text-[10px] font-bold uppercase tracking-tighter">{item.label}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
