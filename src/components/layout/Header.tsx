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
        <header className="sticky top-0 z-[100] bg-background/80 backdrop-blur-2xl border-b border-border/50">
            <div className="max-w-[1400px] mx-auto px-4 md:px-8 h-20 md:h-24 flex items-center gap-4 md:gap-8">
                {/* Logo */}
                <Link href="/" className="shrink-0 flex items-center gap-0.5 group">
                    <span className="text-2xl md:text-3xl font-black text-primary tracking-tighter group-hover:scale-105 transition-transform inline-block">Авоська+</span>
                </Link>

                {/* City Picker */}
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
                                                "w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all",
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
                            placeholder="Поиск..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full h-10 md:h-11 pl-10 pr-10 rounded-xl bg-muted/50 border border-transparent focus:bg-background focus:border-primary/50 focus:shadow-sm transition-all text-sm font-medium outline-none"
                        />
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted h-4 w-4 group-focus-within:text-primary transition-colors" />
                        <button
                            type="submit"
                            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 md:h-10 px-4 md:px-6 bg-primary text-white rounded-xl font-black text-xs md:text-sm active:scale-95 transition-all shadow-lg shadow-primary/20 hover:opacity-90 flex items-center justify-center gap-2"
                        >
                            <span className="hidden md:inline">Найти</span>
                            <Search className="h-4 w-4 md:hidden" />
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

                    <button
                        onClick={toggleTheme}
                        className="p-3 hover:bg-surface rounded-2xl transition-all group"
                        title={theme === 'dark' ? 'Светлая тема' : 'Темная тема'}
                    >
                        {theme === 'dark' ? <Sun className="h-6 w-6 text-orange-400" /> : <Moon className="h-6 w-6 text-muted-foreground group-hover:text-foreground" />}
                    </button>

                    {user && (
                        <Link href="/notifications" className="p-3 hover:bg-surface rounded-2xl transition-all group relative" title="Уведомления">
                            <Bell className="h-6 w-6 text-muted-foreground group-hover:text-foreground" />
                            {unreadCount > 0 && (
                                <span className="absolute top-2.5 right-2.5 w-3 h-3 bg-red-500 rounded-full border-2 border-background animate-pulse" />
                            )}
                        </Link>
                    )}

                    <div className="mx-2 w-px h-8 bg-border/50" />

                    <Link
                        href="/ads/create"
                        className="bg-primary text-white px-6 py-3 rounded-2xl font-black text-sm hover:opacity-90 shadow-xl shadow-primary/20 transition-all hover:-translate-y-0.5"
                    >
                        Разместить
                    </Link>

                    {user ? (
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
                    )}
                </div>

                {/* Mobile Actions Drawer Toggler (simplified for now) */}
                <div className="xl:hidden flex items-center gap-1">
                    <button
                        onClick={toggleTheme}
                        className="p-2.5 hover:bg-surface rounded-xl transition-colors"
                    >
                        {theme === 'dark' ? <Sun className="h-6 w-6 text-orange-400" /> : <Moon className="h-6 w-6 text-muted-foreground" />}
                    </button>
                    {user && (
                        <Link href="/notifications" className="p-2.5 hover:bg-surface rounded-xl block relative">
                            <Bell className="h-6 w-6 text-muted-foreground" />
                            {unreadCount > 0 && (
                                <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-background animate-pulse" />
                            )}
                        </Link>
                    )}
                    {user ? (
                        <Link href="/profile" className="p-1 px-2 hover:bg-surface rounded-xl flex items-center">
                            <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center overflow-hidden border border-border shadow-sm">
                                {user.user_metadata?.avatar_url ? (
                                    <img src={user.user_metadata.avatar_url} className="w-full h-full object-cover" />
                                ) : (
                                    <UserIcon className="h-5 w-5 text-accent" />
                                )}
                            </div>
                        </Link>
                    ) : (
                        <Link href="/login" className="p-2.5 hover:bg-surface rounded-xl text-primary" title="Войти">
                            <UserCircle className="h-8 w-8" />
                        </Link>
                    )}
                </div>
            </div>
        </header>
    );
}
