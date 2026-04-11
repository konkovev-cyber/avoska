'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import {
    Package, Users, Settings, Trash2, CheckCircle2,
    ShieldCheck, ImageIcon, Star,
    LayoutGrid, Flag, Search, X, Bot, Menu, ChevronRight, LogOut, List, Grid3x3, Clock
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Ad, Profile, City, Report, Banner, AdCategory, Review } from '@/lib/types';

import { AdsTable } from '@/components/admin/AdsTable';
import { UsersTable } from '@/components/admin/UsersTable';
import { BannersSection } from '@/components/admin/BannersSection';
import { SettingsSection } from '@/components/admin/SettingsSection';
import { CategoriesSection } from '@/components/admin/CategoriesSection';

export default function AdminDashboard() {
    const [isAdmin, setIsAdmin] = useState(false);
    const [activeTab, setActiveTab] = useState<'ads' | 'moderation' | 'users' | 'banners' | 'reports' | 'categories' | 'reviews' | 'settings'>('moderation');
    const [stats, setStats] = useState({ ads: 0, users: 0, pending: 0, cities: 0, categories: 0 });

    const [ads, setAds] = useState<Ad[]>([]);
    const [users, setUsers] = useState<Profile[]>([]);
    const [cities, setCities] = useState<City[]>([]);
    const [reports, setReports] = useState<Report[]>([]);
    const [banners, setBanners] = useState<Banner[]>([]);
    const [categories, setCategories] = useState<AdCategory[]>([]);
    const [reviews, setReviews] = useState<Review[]>([]);

    const [bannersEnabled, setBannersEnabled] = useState(true);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [currentUserId, setCurrentUserId] = useState('');

    const [tgChatId, setTgChatId] = useState('');
    const [tgNotifyNewAds, setTgNotifyNewAds] = useState(true);
    const [tgNotifyNewUsers, setTgNotifyNewUsers] = useState(true);
    const [tgSaving, setTgSaving] = useState(false);

    const router = useRouter();

    useEffect(() => {
        checkAdmin();
    }, []);

    const checkAdmin = async () => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push('/login');
                return;
            }

            const { data: profile } = await supabase.from('profiles').select('role, email').eq('id', session.user.id).single();
            const ADMIN_EMAILS = ['ht-elk@yandex.ru', 'dron-vbg@yandex.ru', 'konkev@bk.ru', 'konkovev@gmail.com'];
            const userEmail = session.user.email || profile?.email;

            if (profile?.role !== 'admin' && !ADMIN_EMAILS.includes(userEmail || '')) {
                toast.error('Доступ запрещен');
                router.push('/');
                return;
            }

            setCurrentUserId(session.user.id);
            setIsAdmin(true);
            await fetchData();
            await loadTelegramSettings(session.user.id);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const loadTelegramSettings = async (userId: string) => {
        const { data } = await supabase.from('admin_settings').select('*').eq('user_id', userId).single();
        if (data) {
            setTgChatId(data.telegram_chat_id || '');
            setTgNotifyNewAds(data.notify_new_ads !== false);
            setTgNotifyNewUsers(data.notify_new_users !== false);
        }
    };

    const fetchData = async () => {
        const [adsRes, usersRes, citiesRes, reportsRes, bannersRes, categoriesRes, reviewsRes, settingsRes] = await Promise.all([
            supabase.from('ads').select('*').order('created_at', { ascending: false }).limit(500),
            supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(500),
            supabase.from('cities').select('*').order('name'),
            supabase.from('reports').select('*, ad:ads(title), reporter:profiles!reporter_id(full_name)').order('created_at', { ascending: false }).limit(200),
            supabase.from('banners').select('*').order('created_at', { ascending: false }),
            supabase.from('categories').select('*').order('name'),
            supabase.from('reviews').select('*, reviewer:profiles!reviewer_id(full_name)').order('created_at', { ascending: false }).limit(200),
            supabase.from('app_settings').select('*').eq('key', 'banners_enabled').single()
        ]);

        const dedupe = <T extends { id: string }>(arr: T[]) => Array.from(new Map(arr.map(item => [item.id, item])).values());

        setAds(dedupe((adsRes.data || []) as Ad[]));
        setUsers(dedupe((usersRes.data || []) as Profile[]));
        setCities(dedupe((citiesRes.data || []) as City[]));
        setReports(dedupe((reportsRes.data || []) as Report[]));
        setBanners(dedupe((bannersRes.data || []) as Banner[]));
        setCategories(dedupe((categoriesRes.data || []) as AdCategory[]));
        setReviews(dedupe((reviewsRes.data || []) as Review[]));
        setBannersEnabled(settingsRes.data?.value === 'true');

        setStats({
            ads: adsRes.data?.length || 0,
            users: usersRes.data?.length || 0,
            pending: adsRes.data?.filter(a => a.status === 'pending').length || 0,
            cities: citiesRes.data?.length || 0,
            categories: categoriesRes.data?.length || 0
        });
    };

    const saveTelegramSettings = async (): Promise<void> => {
        setTgSaving(true);
        try {
            const { error } = await supabase.from('admin_settings').upsert({
                user_id: currentUserId,
                telegram_chat_id: tgChatId.trim(),
                notify_new_ads: tgNotifyNewAds,
                notify_new_users: tgNotifyNewUsers,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });
            if (error) throw error;
            toast.success('Настройки сохранены');
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setTgSaving(false);
        }
    };

    const testTg = async (): Promise<void> => {
        if (!tgChatId.trim()) {
            toast.error('Введите Chat ID');
            return;
        }
        try {
            const { data } = await supabase.functions.invoke('notify-test', { body: { chatId: tgChatId.trim() } });
            if (data?.success) toast.success('Тест отправлен');
            else toast.error('Ошибка отправки');
        } catch (e: any) {
            toast.error(e.message);
        }
    };

    if (loading || !isAdmin) {
        return <div className="min-h-screen bg-background flex items-center justify-center"><Bot className="h-10 w-10 text-primary animate-bounce" /></div>;
    }

    const menuItems = [
        { id: 'moderation', label: 'Модерация', icon: ShieldCheck, count: stats.pending, color: 'text-orange-500' },
        { id: 'ads', label: 'Объявления', icon: Package, count: stats.ads },
        { id: 'users', label: 'Юзеры', icon: Users, count: stats.users },
        { id: 'banners', label: 'Реклама', icon: ImageIcon },
        { id: 'categories', label: 'Категории', icon: LayoutGrid },
        { id: 'reports', label: 'Жалобы', icon: Flag, count: reports.length, color: 'text-red-500' },
        { id: 'reviews', label: 'Отзывы', icon: Star },
        { id: 'settings', label: 'Настройки', icon: Settings },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#f0f4f0] via-[#fafcfa] to-[#eef5ee] dark:from-background dark:via-background dark:to-background flex flex-col md:flex-row">
            {/* Sidebar */}
            <aside className={cn(
                "w-full md:w-64 bg-gradient-to-b from-[#1a3a1a] via-[#1e3e1e] to-[#243524] text-white border-b md:border-b-0 md:border-r border-white/10 flex-shrink-0 transition-all",
                isMenuOpen ? "fixed inset-0 z-[150] overflow-y-auto" : "relative md:sticky md:top-0 z-[40]"
            )}>
                <div className="p-6 flex items-center justify-between border-b border-white/10">
                    <Link prefetch={false} href="/" className="flex items-center gap-2 group">
                        <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-emerald-600 rounded-lg flex items-center justify-center text-white font-semibold group-hover:rotate-12 transition-transform shadow-lg shadow-green-500/30">A+</div>
                        <span className="font-bold text-lg tracking-tighter uppercase text-white">Панель</span>
                    </Link>
                    <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden p-2 hover:bg-white/10 rounded-xl text-white">
                        {isMenuOpen ? <X /> : <Menu />}
                    </button>
                </div>

                <nav className={cn("p-3 space-y-1", isMenuOpen && "pb-24")}>
                    {menuItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => { setActiveTab(item.id as any); setIsMenuOpen(false); }}
                            className={cn(
                                "w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all group",
                                activeTab === item.id ? "bg-white/15 text-white shadow-lg shadow-black/10 backdrop-blur-sm border border-white/10" : "hover:bg-white/10 text-white/60 hover:text-white"
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <item.icon className={cn("h-5 w-5", activeTab === item.id ? "text-green-300" : (item.color || "text-white/50"))} />
                                <span className="text-xs font-semibold uppercase tracking-widest">{item.label}</span>
                            </div>
                            {item.count !== undefined && item.count > 0 && (
                                <span className={cn(
                                    "px-2 py-0.5 rounded-full text-[10px] font-semibold",
                                    activeTab === item.id ? "bg-green-400 text-green-900" : "bg-white/15 text-green-300"
                                )}>{item.count}</span>
                            )}
                        </button>
                    ))}
                    <button onClick={() => router.push('/')} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white/40 hover:bg-red-500/20 hover:text-red-400 transition-all mt-10">
                        <LogOut className="h-5 w-5" />
                        <span className="text-xs font-semibold uppercase tracking-widest">Выйти</span>
                    </button>
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0">
                <header className="h-16 md:h-20 bg-white/80 dark:bg-surface/80 backdrop-blur-xl border-b border-border/30 px-6 flex items-center justify-between sticky top-0 z-40">
                    <div className="flex items-center gap-4 flex-1">
                        <h2 className="font-semibold text-sm uppercase tracking-[0.2em] hidden lg:block">
                            {menuItems.find(i => i.id === activeTab)?.label}
                        </h2>
                        <div className="relative max-w-md w-full ml-0 md:ml-4">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Поиск в этом разделе..."
                                className="w-full bg-green-50/50 dark:bg-muted/50 border border-green-200/50 dark:border-border/40 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all"
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 md:gap-4 ml-4">
                        <div className="flex items-center bg-green-50/50 dark:bg-muted/30 p-1 rounded-xl border border-green-200/30 dark:border-border/20">
                            <button onClick={() => setViewMode('table')} className={cn("p-1.5 rounded-lg transition-all", viewMode === 'table' ? "bg-surface text-primary shadow-sm" : "text-muted-foreground")}><List className="h-4 w-4" /></button>
                            <button onClick={() => setViewMode('grid')} className={cn("p-1.5 rounded-lg transition-all", viewMode === 'grid' ? "bg-surface text-primary shadow-sm" : "text-muted-foreground")}><Grid3x3 className="h-4 w-4" /></button>
                        </div>
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-700 flex items-center justify-center text-white text-xs font-semibold shadow-lg shadow-green-500/20">A</div>
                    </div>
                </header>

                <div className="p-4 md:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-y-auto">
                    {activeTab === 'moderation' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h1 className="text-2xl font-bold tracking-tight uppercase">Модерация ({ads.filter(a => a.status === 'pending').length})</h1>
                                <button onClick={fetchData} className="p-2.5 bg-white dark:bg-surface border border-green-200/50 dark:border-border/40 rounded-xl hover:bg-green-50 dark:hover:bg-muted transition-all">
                                    <Clock className="h-5 w-5 text-muted-foreground" />
                                </button>
                            </div>
                            <AdsTable ads={ads.filter(a => a.status === 'pending')} viewMode={viewMode} onUpdate={fetchData} searchQuery={searchQuery} />
                        </div>
                    )}

                    {activeTab === 'ads' && (
                        <div className="space-y-6">
                            <h1 className="text-2xl font-bold tracking-tight uppercase">Все объявления</h1>
                            <AdsTable ads={ads} viewMode={viewMode} onUpdate={fetchData} searchQuery={searchQuery} />
                        </div>
                    )}

                    {activeTab === 'users' && (
                        <div className="space-y-6">
                            <h1 className="text-2xl font-bold tracking-tight uppercase">Пользователи</h1>
                            <UsersTable users={users} onUpdate={fetchData} searchQuery={searchQuery} />
                        </div>
                    )}

                    {activeTab === 'banners' && (
                        <BannersSection banners={banners} onUpdate={fetchData} bannersEnabled={bannersEnabled} setBannersEnabled={setBannersEnabled} />
                    )}

                    {activeTab === 'categories' && (
                        <div className="space-y-6">
                            <h1 className="text-2xl font-bold tracking-tight uppercase">Категории</h1>
                            <CategoriesSection categories={categories} onUpdate={fetchData} />
                        </div>
                    )}

                    {activeTab === 'reports' && (
                        <div className="bg-white dark:bg-surface rounded-2xl border border-green-200/30 dark:border-border/40 overflow-hidden shadow-sm">
                            <div className="p-6 border-b border-green-200/40 dark:border-border/40 bg-gradient-to-r from-green-50/80 to-emerald-50/40 dark:bg-muted/10">
                                <h3 className="font-semibold uppercase tracking-widest text-sm">Жалобы ({reports.length})</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-green-50/40 dark:bg-muted/30 border-b border-green-200/40 dark:border-border/40">
                                            <th className="p-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Отправитель</th>
                                            <th className="p-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Объявление</th>
                                            <th className="p-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Причина</th>
                                            <th className="p-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground text-right">Удалить жаждобу</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-green-100/60 dark:divide-border/40">
                                        {reports.map((r) => (
                                            <tr key={r.id} className="hover:bg-green-50/30 dark:hover:bg-muted/20 transition-colors">
                                                <td className="p-4 text-sm font-semibold">{r.reporter?.full_name || 'Incognito'}</td>
                                                <td className="p-4 text-sm">
                                                    <Link prefetch={false} href={`/ad?id=${r.ad_id}`} className="text-primary hover:underline font-semibold transition-all">{r.ad?.title || 'Удалено'}</Link>
                                                </td>
                                                <td className="p-4 text-xs font-medium text-muted-foreground">{r.reason}</td>
                                                <td className="p-4 text-right">
                                                    <button onClick={async () => { if (confirm('Удалить жалобу?')) { await supabase.from('reports').delete().eq('id', r.id); fetchData(); } }} className="p-2 hover:bg-red-500/10 text-red-500 rounded-lg">
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'reviews' && (
                        <div className="bg-white dark:bg-surface rounded-2xl border border-green-200/30 dark:border-border/40 overflow-hidden shadow-sm">
                            <div className="p-6 border-b border-green-200/40 dark:border-border/40 bg-gradient-to-r from-green-50/80 to-emerald-50/40 dark:bg-muted/10">
                                <h3 className="font-semibold uppercase tracking-widest text-sm">Отзывы</h3>
                            </div>
                            <div className="divide-y divide-green-100/60 dark:divide-border/40">
                                {reviews.map(rev => (
                                    <div key={rev.id} className="p-6 flex items-start justify-between hover:bg-green-50/30 dark:hover:bg-muted/10 transition-all">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-semibold text-sm">{rev.reviewer?.full_name}</span>
                                                <div className="flex gap-0.5">
                                                    {[...Array(5)].map((_, i) => (
                                                        <Star key={i} className={cn("h-3 w-3", i < rev.rating ? "text-orange-400 fill-current" : "text-muted/40")} />
                                                    ))}
                                                </div>
                                            </div>
                                            <p className="text-sm font-medium">{rev.content}</p>
                                            <p className="text-[10px] text-muted-foreground mt-2 uppercase font-semibold tracking-widest">{new Date(rev.created_at).toLocaleDateString()}</p>
                                        </div>
                                        <button onClick={async () => { if (confirm('Удалить отзыв?')) { await supabase.from('reviews').delete().eq('id', rev.id); fetchData(); } }} className="p-2 hover:bg-red-500/10 text-red-500 rounded-lg">
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'settings' && (
                        <div className="space-y-6">
                            <h1 className="text-2xl font-bold tracking-tight uppercase">Настройки системы</h1>
                            <SettingsSection
                                tgChatId={tgChatId} setTgChatId={setTgChatId}
                                tgNotifyNewAds={tgNotifyNewAds} setTgNotifyNewAds={setTgNotifyNewAds}
                                tgNotifyNewUsers={tgNotifyNewUsers} setTgNotifyNewUsers={setTgNotifyNewUsers}
                                onSaveTg={saveTelegramSettings} onTestTg={testTg} tgSaving={tgSaving}
                                cities={cities} onUpdateCities={fetchData}
                            />
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
