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
        <header className="sticky top-0 z-50 bg-white border-b border-border">
            {/* Main Header */}
            <div className="container mx-auto px-4 py-3 flex items-center gap-4">
                {/* Logo */}
                <Link href="/" className="shrink-0 flex items-center gap-1">
                    <span className="text-2xl font-black text-primary tracking-tighter">Авоська</span>
                    <span className="text-2xl font-black text-accent">+</span>
                </Link>

                {/* Categories Button */}
                <div className="hidden lg:flex items-center gap-4">
                    <Link href="/categories" className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl font-bold hover:bg-primary/90 transition-all text-sm whitespace-nowrap">
                        <div className="flex flex-col gap-0.5">
                            <div className="w-4 h-0.5 bg-white rounded-full"></div>
                            <div className="w-4 h-0.5 bg-white rounded-full"></div>
                            <div className="w-4 h-0.5 bg-white rounded-full"></div>
                        </div>
                        Все категории
                    </Link>
                    <Link href="/help" className="text-sm font-bold text-muted hover:text-primary transition-colors">
                        Помощь
                    </Link>
                </div>

                {/* Search Bar Container */}
                <div className="flex-1 flex items-center max-w-3xl">
                    <form onSubmit={handleSearch} className="flex-1 relative group">
                        <input
                            type="text"
                            placeholder="Поиск по объявлениям"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full py-2.5 pl-4 pr-16 rounded-xl border-2 border-primary outline-none text-sm placeholder:text-muted"
                        />
                        <button type="submit" className="absolute right-0 top-0 bottom-0 px-5 bg-primary text-white rounded-r-lg font-bold text-sm hover:bg-primary/90 transition-colors">
                            Найти
                        </button>
                    </form>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 shrink-0">
                    <Link href="/favorites" className="p-2 hover:bg-surface rounded-full transition-colors relative group" title="Избранное">
                        <Heart className="h-6 w-6 group-hover:text-red-500 transition-colors" />
                    </Link>
                    <Link href="/chat" className="p-2 hover:bg-surface rounded-full transition-colors relative" title="Сообщения">
                        <MessageSquare className="h-6 w-6" />
                    </Link>

                    <Link
                        href="/ads/create"
                        className="hidden sm:flex items-center gap-2 bg-accent text-white px-5 py-2.5 rounded-xl font-black hover:bg-opacity-90 transition-all shadow-md text-sm"
                    >
                        Разместить объявление
                    </Link>

                    {user ? (
                        <>
                            <Link href="/profile" className="p-2 hover:bg-surface rounded-full transition-colors relative" title="Профиль">
                                <UserIcon className="h-6 w-6" />
                            </Link>
                            <button onClick={handleLogout} className="p-2 hover:text-destructive transition-colors" title="Выйти">
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

            {/* Mobile Search Bar Extra */}
            <div className="md:hidden px-4 pb-3">
                <form onSubmit={handleSearch} className="relative">
                    <input
                        type="text"
                        placeholder="Поиск..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full p-2.5 pl-10 rounded-xl bg-surface border border-border outline-none text-sm"
                    />
                    <Search className="absolute left-3 top-3 text-muted h-4 w-4" />
                </form>
            </div>
        </header>
    );
}
