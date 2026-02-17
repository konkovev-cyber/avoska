'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import { Search, PlusCircle, User as UserIcon, LogOut, MessageSquare, Heart, MapPin, UserCircle, ChevronDown, Bell, Moon, Sun } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getStoredCity, setStoredCity, initCity } from '@/lib/geo';
import { getTheme, setTheme, initTheme, Theme } from '@/lib/theme';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import ResponsiveSelect from '@/components/ui/ResponsiveSelect';

export default function Header() {
    const [user, setUser] = useState<User | null>(null);
    const [city, setCity] = useState<string>('Все города');
    const [cities, setCities] = useState<any[]>([]);
    const [showCityPicker, setShowCityPicker] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [favoritesCount, setFavoritesCount] = useState(0);
    const [theme, setInternalTheme] = useState<Theme>('system');
    const [isCapacitor, setIsCapacitor] = useState(false);
    const router = useRouter();

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
        });

        // Initialize city
        initCity().then(setCity);

        // Fetch cities for picker
        supabase.from('cities').select('name').order('is_default', { ascending: false }).then(({ data }) => {
            if (data) {
                setCities([{ name: 'Все города' }, ...data]);
            }
        });

        // Initialize theme
        initTheme();
        setInternalTheme(getTheme());

        // Initial unread count
        fetchUnread();

        // Subscribe to messages for unread count
        const channel = supabase.channel('header-messages')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
                fetchUnread();
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, () => {
                fetchUnread();
            })
            .subscribe();

        // Subscription for favorites
        const favChannel = supabase.channel('header-favorites')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'favorites' }, () => {
                fetchFavoritesCount();
            })
            .subscribe();

        // Detect Capacitor
        setIsCapacitor(typeof window !== 'undefined' && (window as any).Capacitor !== undefined);

        return () => {
            subscription.unsubscribe();
            supabase.removeChannel(channel);
            supabase.removeChannel(favChannel);
        };
    }, []);

    const fetchFavoritesCount = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const { count } = await supabase
            .from('favorites')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', session.user.id);
        if (count !== null) setFavoritesCount(count);
    };

    const fetchUnread = async () => {
        // Unread status disabled by user request
        setUnreadCount(0);
    };

    const toggleTheme = () => {
        let current = theme;
        if (current === 'system' && typeof window !== 'undefined') {
            current = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        const newTheme = current === 'light' ? 'dark' : 'light';
        setInternalTheme(newTheme);
        setTheme(newTheme);
    };

    const handleCityChange = (newCity: string) => {
        setCity(newCity);
        setStoredCity(newCity);
        setShowCityPicker(false);
        toast.success(`Город изменен на ${newCity}`);
        router.refresh();
    };

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
        <header className="sticky top-0 z-[100] bg-background border-b border-border/50 pt-safe shadow-sm">
            <div className="max-w-7xl mx-auto px-4 md:px-6 h-14 md:h-16 flex items-center gap-3 lg:gap-8">
                {!isCapacitor && (
                    <>
                        <Link href="/" className="hidden lg:flex shrink-0 items-center group gap-2">
                            <div className="w-10 h-10 bg-primary flex items-center justify-center rounded-xl shadow-lg shadow-primary/20 group-hover:scale-105 group-hover:rotate-3 transition-all duration-300">
                                <span className="text-white font-black text-xl tracking-tighter">А+</span>
                            </div>
                            <div className="flex flex-col h-10 justify-between py-0.5">
                                <span className="text-2xl font-black text-foreground tracking-tighter group-hover:text-primary transition-colors leading-none">Авоська+</span>
                                <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 leading-none">Полезное совсем рядом</span>
                            </div>
                        </Link>

                        <Link href="/" className="lg:hidden shrink-0 flex items-center group">
                            <div className="flex items-center gap-1.5 active:scale-95 transition-transform">
                                <div className="w-9 h-9 bg-primary flex items-center justify-center rounded-xl shadow-lg shadow-primary/20">
                                    <span className="text-white font-black text-lg tracking-tighter">А+</span>
                                </div>
                            </div>
                        </Link>
                    </>
                )}

                {/* City Picker & Filter - Mobile */}
                <div className="lg:hidden flex-shrink-1 min-w-0">
                    <ResponsiveSelect
                        value={city}
                        onChange={handleCityChange}
                        options={cities.map(c => ({ value: c.name, label: c.name }))}
                        placeholder="Город"
                        prefixIcon={<MapPin className="h-3 w-3 text-primary shrink-0" />}
                        triggerClassName="h-10 !px-2.5 bg-surface rounded-xl border border-border/50 text-foreground !flex items-center gap-1 [&>svg:last-child]:h-3 [&>svg:last-child]:w-3 min-w-[70px] max-w-[110px] text-[10px] font-black uppercase tracking-tight shadow-sm active:scale-95 transition-all"
                    />
                </div>

                {/* City Picker - Desktop */}
                <div className="relative shrink-0 hidden lg:block">
                    <ResponsiveSelect
                        value={city}
                        onChange={handleCityChange}
                        options={cities.map(c => ({ value: c.name, label: c.name }))}
                        placeholder="Город"
                        prefixIcon={<MapPin className="h-4 w-4 text-primary shrink-0" />}
                        triggerClassName="!h-auto !w-auto bg-transparent border-transparent hover:bg-surface !px-3 !py-2 rounded-xl transition-all active:scale-95 border border-transparent hover:border-border max-w-[180px] text-[11px] font-black uppercase tracking-wider [&>svg:last-child]:h-3 [&>svg:last-child]:w-3"
                    />
                </div>

                {/* Search Bar */}
                <div className="flex-1 min-w-0">
                    <form onSubmit={handleSearch} className="relative group w-full">
                        <input
                            type="text"
                            placeholder={city === '...' || city === 'Все города' ? 'Авоська' : 'г. ' + city}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full h-10 md:h-12 pl-4 md:pl-5 pr-10 md:pr-14 rounded-2xl bg-surface border border-border hover:border-primary/50 focus:border-primary focus:shadow-xl focus:shadow-primary/5 transition-all text-[13px] md:text-sm font-bold outline-none placeholder:text-muted-foreground/60"
                        />
                        <button
                            type="submit"
                            title="Найти"
                            className="absolute right-0.5 top-1/2 -translate-y-1/2 h-9 w-9 md:h-9 md:w-11 bg-primary text-white rounded-[14px] flex items-center justify-center shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all"
                        >
                            <Search className="h-4 w-4 md:h-5 md:w-5" />
                        </button>
                    </form>
                </div>

                {/* Desktop Actions */}
                <div className="hidden lg:flex items-center gap-2">
                    <Link href="/favorites" className="p-3 hover:bg-surface rounded-2xl transition-all group relative" title="Избранное">
                        <Heart className="h-6 w-6 text-muted-foreground group-hover:text-foreground" />
                        {favoritesCount > 0 && (
                            <span className="absolute top-2.5 right-2.5 w-4 h-4 bg-primary text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-background">
                                {favoritesCount}
                            </span>
                        )}
                    </Link>
                    <Link href="/chat" className="p-3 hover:bg-surface rounded-2xl transition-all group relative" title="Сообщения">
                        <MessageSquare className="h-6 w-6 text-muted-foreground group-hover:text-foreground" />
                    </Link>
                    {/* Theme Toggle - Hidden on mobile to save space */}
                    <button
                        onClick={toggleTheme}
                        className="hidden md:block p-3 hover:bg-surface rounded-2xl transition-all group relative"
                        title="Сменить тему"
                    >
                        {(() => {
                            let effective = theme;
                            if (effective === 'system' && typeof window !== 'undefined') {
                                effective = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                            }
                            return effective === 'light' ? (
                                <Moon className="h-6 w-6 text-muted-foreground group-hover:text-foreground transition-transform group-hover:-rotate-12" />
                            ) : (
                                <Sun className="h-6 w-6 text-yellow-400 group-hover:text-yellow-300 transition-transform group-hover:rotate-12" />
                            );
                        })()}
                    </button>

                    {
                        user && !isCapacitor && (
                            <Link href="/notifications" className="p-3 hover:bg-surface rounded-2xl transition-all group relative" title="Уведомления">
                                <Bell className="h-6 w-6 text-muted-foreground group-hover:text-foreground" />
                            </Link>
                        )
                    }

                    <div className="mx-2 w-px h-8 bg-border/50" />

                    <Link
                        href="/ads/create"
                        className="bg-primary text-white px-6 py-3 rounded-2xl font-black text-sm hover:opacity-90 shadow-xl shadow-primary/20 transition-all hover:-translate-y-0.5"
                    >
                        Разместить
                    </Link>

                    {
                        user ? (
                            <div className="flex items-center gap-2 ml-2">
                                <Link href="/profile" className="p-1 rounded-2xl overflow-hidden border-2 border-primary/20 hover:border-primary transition-all shadow-sm">
                                    <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center overflow-hidden">
                                        {user.user_metadata?.avatar_url ? (
                                            <img src={user.user_metadata.avatar_url} className="w-full h-full object-cover" />
                                        ) : (
                                            <UserIcon className="h-5 w-5 text-accent" />
                                        )}
                                    </div>
                                </Link>
                                <button onClick={handleLogout} className="p-3 hover:text-destructive transition-colors" title="Выйти">
                                    <LogOut className="h-5 w-5" />
                                </button>
                            </div>
                        ) : (
                            <Link href="/login" className="text-sm font-black uppercase tracking-widest hover:text-primary px-4 py-2 border-2 border-transparent hover:border-primary/20 rounded-2xl transition-all ml-2">Войти</Link>
                        )
                    }
                </div >

                {/* Mobile Actions - Simplified */}
                <div className="lg:hidden flex items-center gap-1">
                    {
                        user && !isCapacitor && (
                            <Link href="/notifications" className="p-2.5 hover:bg-surface rounded-xl block relative">
                                <Bell className="h-6 w-6 text-muted-foreground" />
                            </Link>
                        )
                    }
                </div >
            </div >
        </header >
    );
}
