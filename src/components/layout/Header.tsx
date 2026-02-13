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

export default function Header() {
    const [user, setUser] = useState<User | null>(null);
    const [city, setCity] = useState<string>('...');
    const [cities, setCities] = useState<any[]>([]);
    const [showCityPicker, setShowCityPicker] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [theme, setInternalTheme] = useState<Theme>('system');
    const router = useRouter();

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
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
            .subscribe();

        return () => {
            subscription.unsubscribe();
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchUnread = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        try {
            const { count, error } = await supabase
                .from('messages')
                .select('*', { count: 'exact', head: true })
                .eq('receiver_id', session.user.id)
                .eq('is_read', false);

            if (!error && count !== null) {
                setUnreadCount(count);
            }
        } catch (err) {
            // Probably is_read column missing
            console.log('fetchUnread error (might be missing column):', err);
        }
    };

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
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
        <header className="sticky top-0 z-[100] bg-background/80 backdrop-blur-2xl border-b border-border/50 pt-safe">
            <div className="max-w-[1400px] mx-auto px-4 md:px-8 h-16 md:h-24 flex items-center gap-3 md:gap-8">
                {/* Logo - Hide on mobile to prioritize Search */}
                <Link href="/" className="hidden md:flex shrink-0 items-center gap-0.5 group">
                    <span className="text-2xl md:text-3xl font-black text-primary tracking-tighter group-hover:scale-105 transition-transform">Авоська+</span>
                </Link>

                {/* Mobile Logo Icon only if needed, but maybe Search is better? 
                    Let's keep a very small logo or remove it for "App Feel" if Search uses "Search in City".
                */}
                <Link href="/" className="hidden shrink-0">
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-black text-xs">A+</div>
                </Link>

                {/* City Picker & Filter - Mobile */}
                <div className="md:hidden shrink-0">
                    <button
                        onClick={() => setShowCityPicker(!showCityPicker)}
                        className="flex items-center justify-center w-10 h-10 bg-surface rounded-xl border border-border/50 text-muted-foreground active:scale-95 transition-transform"
                    >
                        <ChevronDown className={cn("h-5 w-5 transition-transform", showCityPicker && "rotate-180")} />
                    </button>
                    {/* Mobile City Dropdown */}
                    {showCityPicker && (
                        <>
                            <div className="fixed inset-0 z-[110] bg-black/20 backdrop-blur-sm" onClick={() => setShowCityPicker(false)} />
                            <div className="absolute top-[calc(100%+0.5rem)] left-4 w-64 bg-background border border-border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 z-[120]">
                                <div className="p-3 border-b border-border/50 bg-muted/30">
                                    <div className="text-xs font-black uppercase tracking-widest text-muted-foreground">Выберите город</div>
                                </div>
                                <div className="max-h-[60vh] overflow-y-auto p-2 space-y-1">
                                    {cities.map((c) => (
                                        <button
                                            key={c.name}
                                            onClick={() => handleCityChange(c.name)}
                                            className={cn(
                                                "w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all active:scale-[0.98]",
                                                c.name === city ? "bg-primary text-white shadow-lg shadow-primary/20" : "hover:bg-muted text-foreground"
                                            )}
                                        >
                                            {c.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* City Picker - Desktop */}
                <div className="relative shrink-0 hidden md:block">
                    <button
                        onClick={() => setShowCityPicker(!showCityPicker)}
                        className="flex items-center gap-2 px-3 py-2 hover:bg-surface rounded-xl transition-all active:scale-95 border border-transparent hover:border-border max-w-[180px]"
                    >
                        <MapPin className="h-4 w-4 text-primary shrink-0" />
                        <span className="text-[11px] font-black uppercase tracking-wider truncate">{city}</span>
                        <ChevronDown className={cn("h-3 w-3 text-muted transition-transform shrink-0", showCityPicker && "rotate-180")} />
                    </button>

                    {showCityPicker && (
                        <>
                            <div className="fixed inset-0 z-[110]" onClick={() => setShowCityPicker(false)} />
                            <div className="absolute top-full left-0 mt-2 w-64 bg-background border border-border rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-[120]">
                                <div className="max-h-60 overflow-y-auto p-2 space-y-1">
                                    {cities.map((c) => (
                                        <button
                                            key={c.name}
                                            onClick={() => handleCityChange(c.name)}
                                            className={cn(
                                                "w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all active:scale-[0.98]",
                                                c.name === city ? "bg-primary text-white" : "hover:bg-muted"
                                            )}
                                        >
                                            {c.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Search Bar */}
                <div className="flex-1 min-w-0 max-w-2xl">
                    <form onSubmit={handleSearch} className="relative group w-full">
                        <input
                            type="text"
                            placeholder={`Поиск в ${city === '...' || city === 'Все города' ? 'Авоське' : 'г. ' + city}`}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full h-11 md:h-12 pl-4 md:pl-5 pr-12 md:pr-14 rounded-2xl bg-surface border border-border hover:border-primary/50 focus:border-primary focus:shadow-xl focus:shadow-primary/5 transition-all text-[16px] md:text-sm font-bold outline-none placeholder:text-muted-foreground/60"
                        />
                        <button
                            type="submit"
                            title="Найти"
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 w-8 md:h-9 md:w-11 bg-primary text-white rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all"
                        >
                            <Search className="h-4 w-4 md:h-5 md:w-5" />
                        </button>
                    </form>
                </div>

                {/* Desktop Actions */}
                <div className="hidden xl:flex items-center gap-2">
                    <Link href="/favorites" className="p-3 hover:bg-surface rounded-2xl transition-all group relative" title="Избранное">
                        <Heart className="h-6 w-6 text-muted-foreground group-hover:text-foreground" />
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
                        {theme === 'light' ? (
                            <Moon className="h-6 w-6 text-muted-foreground group-hover:text-foreground transition-transform group-hover:-rotate-12" />
                        ) : (
                            <Sun className="h-6 w-6 text-yellow-400 group-hover:text-yellow-300 transition-transform group-hover:rotate-12" />
                        )}
                    </button>

                    {
                        user && (
                            <Link href="/notifications" className="p-3 hover:bg-surface rounded-2xl transition-all group relative" title="Уведомления">
                                <Bell className="h-6 w-6 text-muted-foreground group-hover:text-foreground" />
                                {unreadCount > 0 && (
                                    <span className="absolute top-2.5 right-2.5 w-3 h-3 bg-red-500 rounded-full border-2 border-background animate-pulse" />
                                )}
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
                < div className="xl:hidden flex items-center gap-1" >
                    {/* Only show Notifications on mobile header, others are in BottomNav */}
                    {
                        user && (
                            <Link href="/notifications" className="p-2.5 hover:bg-surface rounded-xl block relative">
                                <Bell className="h-6 w-6 text-muted-foreground" />
                                {unreadCount > 0 && (
                                    <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-background animate-pulse" />
                                )}
                            </Link>
                        )
                    }
                </div >
            </div >
        </header >
    );
}
