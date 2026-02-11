'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import { Search, PlusCircle, User as UserIcon, LogOut, MessageSquare, Heart } from 'lucide-react';
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
        <header className="sticky top-0 z-50 bg-surface border-b border-border shadow-sm">
            <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
                {/* Logo */}
                <Link href="/" className="text-2xl font-black text-primary flex items-center gap-1">
                    <span>Авоська</span>
                    <span className="text-accent">+</span>
                </Link>

                {/* Search Bar */}
                <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-xl relative">
                    <input
                        type="text"
                        placeholder="Поиск объявлений..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full p-2 pl-10 rounded-full bg-background border border-border focus:ring-2 focus:ring-primary outline-none text-sm transition-all"
                    />
                    <Search className="absolute left-3 top-2.5 text-muted h-4 w-4" />
                </form>

                {/* Actions */}
                <div className="flex items-center gap-4">
                    {user ? (
                        <>
                            <Link href="/favorites" className="p-2 hover:bg-background rounded-full transition-colors relative" title="Избранное">
                                <Heart className="h-5 w-5" />
                            </Link>
                            <Link href="/chat" className="p-2 hover:bg-background rounded-full transition-colors relative" title="Сообщения">
                                <MessageSquare className="h-5 w-5" />
                            </Link>
                            <div className="flex items-center gap-2 border-l pl-4 border-border">
                                <Link href="/profile" className="flex items-center gap-2 hover:text-primary transition-colors">
                                    <UserIcon className="h-5 w-5" />
                                    <span className="hidden lg:inline text-sm font-medium">Профиль</span>
                                </Link>
                                <button onClick={handleLogout} className="p-2 hover:text-destructive transition-colors" title="Выйти">
                                    <LogOut className="h-5 w-5" />
                                </button>
                            </div>
                        </>
                    ) : (
                        <Link href="/login" className="text-sm font-semibold hover:text-primary transition-colors">
                            Вход и регистрация
                        </Link>
                    )}

                    <Link
                        href="/ads/create"
                        className="flex items-center gap-2 bg-accent text-white px-4 py-2 rounded-full font-bold hover:bg-opacity-90 transition-all shadow-md"
                    >
                        <PlusCircle className="h-5 w-5" />
                        <span className="hidden sm:inline">Разместить</span>
                    </Link>
                </div>
            </div>

            {/* Mobile Search Bar */}
            <div className="md:hidden px-4 pb-3">
                <form onSubmit={handleSearch} className="relative">
                    <input
                        type="text"
                        placeholder="Поиск..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full p-2 pl-10 rounded-full bg-background border border-border focus:ring-2 focus:ring-primary outline-none text-sm"
                    />
                    <Search className="absolute left-3 top-2.5 text-muted h-4 w-4" />
                </form>
            </div>
        </header>
    );
}
