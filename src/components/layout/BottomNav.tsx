'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, Heart, PlusSquare, MessageSquare, User as UserIcon, Home as HomeIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export default function BottomNav() {
    const pathname = usePathname();
    const [unreadCount, setUnreadCount] = useState(0);
    const [favoritesCount, setFavoritesCount] = useState(0);
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchUnread();
                fetchFavoritesCount();
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchUnread();
                fetchFavoritesCount();
            }
        });

        // Real-time subscriptions
        const msgChannel = supabase.channel('bottom-messages')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => fetchUnread())
            .subscribe();

        const favChannel = supabase.channel('bottom-favorites')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'favorites' }, () => fetchFavoritesCount())
            .subscribe();

        return () => {
            subscription.unsubscribe();
            supabase.removeChannel(msgChannel);
            supabase.removeChannel(favChannel);
        };
    }, []);

    const fetchUnread = async () => {
        // Disabled by user request
        setUnreadCount(0);
    };

    const fetchFavoritesCount = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const { count } = await supabase
            .from('favorites')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', session.user.id);
        if (count !== null) setFavoritesCount(count);
    };

    const navItems = [
        { label: 'Главная', href: '/', icon: HomeIcon },
        { label: 'Избранное', href: '/favorites', icon: Heart },
        { label: 'Разместить', href: '/ads/create', icon: PlusSquare },
        { label: 'Сообщения', href: '/chat', icon: MessageSquare },
        { label: 'Профиль', href: user ? '/profile' : '/login', icon: UserIcon },
    ];

    return (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border z-[100] pb-safe shadow-[0_-8px_30px_rgb(0,0,0,0.06)]">
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
                                "flex flex-col items-center justify-center gap-1 min-w-[60px] h-12 transition-all active:scale-90 relative",
                                isActive ? "text-primary" : "text-muted"
                            )}
                        >
                            <Icon className={cn("h-6 w-6 transition-transform", isActive ? "scale-110" : "opacity-70")} />
                            {item.label === 'Избранное' && favoritesCount > 0 && (
                                <span className="absolute top-1 right-2 w-4 h-4 bg-primary text-white text-[8px] font-black rounded-full flex items-center justify-center border-2 border-background">
                                    {favoritesCount}
                                </span>
                            )}
                            {item.label === 'Сообщения' && (
                                // Read status badges removed by request
                                null
                            )}
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
