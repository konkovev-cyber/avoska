'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import { Search, PlusCircle, User as UserIcon, LogOut, MessageSquare, Heart, MapPin } from 'lucide-react';
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
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
            <div className="container mx-auto px-4 py-2 flex items-center gap-2 sm:gap-4">
                {/* Logo */}
                <Link href="/" className="shrink-0 flex items-center gap-0.5 group">
                    <span className="text-2xl font-black text-primary tracking-tighter group-hover:opacity-80 transition-opacity">
                        <span className="sm:hidden">А</span>
                        <span className="hidden sm:inline">Авоська</span>
                    </span>
                    <span className="text-2xl font-black text-accent">+</span>
                </Link>

                {/* Search Bar */}
                <div className="flex-1 flex items-center min-w-0">
                    <form onSubmit={handleSearch} className="flex-1 relative flex items-center">
                        <div className="flex-1 relative">
                            <input
                                type="text"
                                placeholder="Поиск"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full py-2 px-10 rounded-xl bg-surface border-2 border-transparent focus:border-primary/50 outline-none text-sm transition-all"
                            />
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted h-4 w-4" />
                        </div>
                        <button type="submit" className="hidden md:block ml-2 px-5 py-2 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors">
                            Найти
                        </button>
                    </form>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 sm:gap-3 shrink-0">
                    <Link href="/favorites" className="p-2 hover:bg-surface rounded-full transition-colors group" title="Избранное">
                        <Heart className="h-5 w-5 sm:h-6 sm:w-6 transition-colors group-hover:text-red-500" />
                    </Link>
                    <Link href="/chat" className="p-2 hover:bg-surface rounded-full transition-colors" title="Сообщения">
                        <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6" />
                    </Link>

                    <Link
                        href="/ads/create"
                        className="p-1.5 sm:p-2 sm:bg-accent sm:text-white sm:px-4 sm:py-2 sm:rounded-xl sm:font-black hover:bg-opacity-90 transition-all sm:shadow-sm text-sm flex items-center gap-1.5 sm:gap-2"
                    >
                        <PlusCircle className="h-5 w-5 sm:h-5 sm:w-5" />
                        <span className="hidden sm:inline">Разместить</span>
                    </Link>

                    {user ? (
                        <>
                            <Link href="/profile" className="p-2 hover:bg-surface rounded-full transition-colors relative" title="Профиль">
                                <UserIcon className="h-6 w-6" />
                            </Link>
                            <button onClick={handleLogout} className="p-2 hover:text-destructive transition-colors hidden sm:block" title="Выйти">
                                <LogOut className="h-6 w-6" />
                            </button>
                        </>
                    ) : (
                        <Link href="/login" className="flex items-center gap-2 text-sm font-bold hover:text-primary transition-colors ml-2">
                            <UserIcon className="h-5 w-5" />
                            <span>Вход</span>
                        </Link>
                    )}
                </div>
            </div>
        </header>
    );
}
