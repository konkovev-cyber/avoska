'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import { Search, PlusCircle, User as UserIcon, LogOut, MessageSquare, Heart, MapPin, UserCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function Header() {
    const [user, setUser] = useState<User | null>(null);
    const router = useRouter();

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/');
        router.refresh();
    };

    const [searchQuery, setSearchQuery] = useState('');

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
        }
    };

    return (
        <header className="sticky top-0 z-[100] bg-background/95 backdrop-blur-md border-b border-border transition-all">
            <div className="container mx-auto px-4 h-14 flex items-center gap-3 max-w-[1400px]">
                {/* Logo - Conditional: Full on Web, A+ on Mobile */}
                <Link href="/" className="shrink-0 flex items-center gap-0.5 group">
                    <span className="text-2xl font-black text-primary tracking-tighter group-hover:opacity-80 transition-opacity">
                        {typeof window !== 'undefined' && (window.location.protocol === 'capacitor:' || window.location.protocol === 'ionic:') ? 'А' : 'Авоська'}
                    </span>
                    <span className="text-2xl font-black text-accent">+</span>
                </Link>

                {/* Search Bar - Streamlined like Avito */}
                <div className="flex-1 min-w-0">
                    <form onSubmit={handleSearch} className="relative group">
                        <input
                            type="text"
                            placeholder="Поиск объявлений"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full h-10 pl-9 pr-12 rounded-full bg-surface/50 border border-border group-focus-within:bg-surface group-focus-within:border-primary/50 group-focus-within:shadow-sm transition-all text-sm font-medium outline-none"
                        />
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted h-4 w-4 group-focus-within:text-primary transition-colors" />
                        <button
                            type="submit"
                            className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-primary text-white rounded-full active:scale-90 transition-all"
                        >
                            <Search className="h-4 w-4" />
                        </button>
                    </form>
                </div>

                {/* Desktop Actions (Hidden on Mobile, handled by BottomNav) */}
                <div className="hidden lg:flex items-center gap-4">
                    <Link href="/favorites" className="p-2 hover:bg-surface rounded-full transition-colors relative" title="Избранное">
                        <Heart className="h-6 w-6" />
                    </Link>
                    <Link href="/chat" className="p-2 hover:bg-surface rounded-full transition-colors relative" title="Сообщения">
                        <MessageSquare className="h-6 w-6" />
                    </Link>
                    <Link
                        href="/ads/create"
                        className="bg-primary text-white px-5 py-2 rounded-xl font-black text-sm hover:opacity-90 shadow-sm transition-all"
                    >
                        Разместить
                    </Link>

                    {user ? (
                        <div className="flex items-center gap-2 pl-2 border-l border-border">
                            <Link href="/profile" className="p-2 hover:bg-surface rounded-full" title="Профиль">
                                <UserIcon className="h-6 w-6" />
                            </Link>
                            <button onClick={handleLogout} className="p-2 hover:text-destructive" title="Выйти">
                                <LogOut className="h-5 w-5" />
                            </button>
                        </div>
                    ) : (
                        <Link href="/login" className="text-sm font-bold hover:text-primary px-2">Войти</Link>
                    )}
                </div>

                {/* Mobile Actions */}
                <div className="lg:hidden flex items-center gap-1">
                    {user ? (
                        <Link href="/profile" className="p-2 hover:bg-surface rounded-full block">
                            <UserIcon className="h-6 w-6 text-foreground/80" />
                        </Link>
                    ) : (
                        <Link href="/login" className="p-2 hover:bg-surface rounded-full text-primary" title="Войти">
                            <UserCircle className="h-7 w-7" />
                        </Link>
                    )}
                </div>
            </div>
        </header>
    );
}
