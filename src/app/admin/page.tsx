'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import {
    BarChart3,
    Package,
    Users,
    MapPin,
    Settings,
    Trash2,
    CheckCircle,
    XCircle,
    ExternalLink,
    Plus,
    ShieldCheck,
    Ban,
    AlertCircle,
    Image as ImageIcon
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function AdminDashboard() {
    const [isAdmin, setIsAdmin] = useState(false);
    const [activeTab, setActiveTab] = useState<'ads' | 'users' | 'cities' | 'banners' | 'reports'>('ads');
    const [stats, setStats] = useState({ ads: 0, users: 0, pending: 0, cities: 0 });
    const [ads, setAds] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [cities, setCities] = useState<any[]>([]);
    const [reports, setReports] = useState<any[]>([]);
    const [banners, setBanners] = useState<any[]>([]);
    const [newCity, setNewCity] = useState('');

    // Banner form state
    const [bannerTitle, setBannerTitle] = useState('');
    const [bannerContent, setBannerContent] = useState('');
    const [bannerImage, setBannerImage] = useState('');
    const [bannerLink, setBannerLink] = useState('');

    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        checkAdmin();
    }, []);

    const checkAdmin = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return router.push('/login');

        const { data: profile } = await supabase.from('profiles').select('role, email').eq('id', session.user.id).single();

        const ADMIN_EMAILS = ['ht-elk@yandex.ru', 'dron-vbg@yandex.ru', 'konkev@bk.ru'];
        const userEmail = session.user.email || profile?.email;

        if (profile?.role !== 'admin' && !ADMIN_EMAILS.includes(userEmail || '')) {
            toast.error('Доступ запрещен');
            return router.push('/');
        }

        setIsAdmin(true);
        fetchData();
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const [adsRes, usersRes, citiesRes, reportsRes, bannersRes] = await Promise.all([
                supabase.from('ads').select('*, profiles!user_id(full_name, email)').order('created_at', { ascending: false }),
                supabase.from('profiles').select('*').order('created_at', { ascending: false }),
                supabase.from('cities').select('*').order('name'),
                supabase.from('reports').select('*, reporter:profiles(full_name), ad:ads(title)').order('created_at', { ascending: false }),
                supabase.from('banners').select('*').order('created_at', { ascending: false })
            ]);

            if (adsRes.error) {
                console.error('Ads fetch error:', adsRes.error);
                toast.error('Ошибка объявлений: ' + adsRes.error.message);
                const { data: simpleAds } = await supabase.from('ads').select('*').order('created_at', { ascending: false });
                if (simpleAds) setAds(simpleAds);
            } else {
                setAds(adsRes.data || []);
            }

            setUsers(usersRes.data || []);
            setCities(citiesRes.data || []);
            setReports(reportsRes.data || []);
            setBanners(bannersRes.data || []);

            const allAdsCount = adsRes.data?.length || 0;
            const pendingAdsCount = (adsRes.data || []).filter((a: any) => a.status === 'pending').length;

            setStats({
                ads: allAdsCount,
                users: usersRes.data?.length || 0,
                pending: pendingAdsCount,
                cities: citiesRes.data?.length || 0
            });
        } catch (err: any) {
            console.error('Global fetch error:', err);
            toast.error('Ошибка загрузки данных');
        } finally {
            setLoading(false);
        }
    };

    const statusLabels: Record<string, { label: string, color: string }> = {
        'active': { label: 'Активно', color: 'text-green-600' },
        'pending': { label: 'На модерации', color: 'text-orange-500' },
        'rejected': { label: 'Отклонено', color: 'text-red-500' },
        'closed': { label: 'Закрыто', color: 'text-muted' },
        'archived': { label: 'В архиве', color: 'text-muted' }
    };

    const handleApprove = async (id: string) => {
        const { error } = await supabase.from('ads').update({ status: 'active' }).eq('id', id);
        if (!error) { toast.success('Одобрено'); fetchData(); }
    };

    const handleReject = async (id: string) => {
        const { error } = await supabase.from('ads').update({ status: 'rejected' }).eq('id', id);
        if (!error) { toast.success('Отклонено'); fetchData(); }
    };

    const deleteAd = async (id: string) => {
        if (!confirm('Удалить объявление навсегда?')) return;
        const { error } = await supabase.from('ads').delete().eq('id', id);
        if (!error) {
            toast.success('Удалено');
            fetchData();
        }
    };

    const handleVerifyUser = async (user: any) => {
        const { error } = await supabase.from('profiles').update({ is_verified: !user.is_verified }).eq('id', user.id);
        if (!error) { toast.success('Статус верификации изменен'); fetchData(); }
    };

    const handleBanUser = async (user: any) => {
        const { error } = await supabase.from('profiles').update({ is_banned: !user.is_banned }).eq('id', user.id);
        if (!error) { toast.success(user.is_banned ? 'Разбанен' : 'Забанен'); fetchData(); }
    };

    const addCity = async () => {
        if (!newCity.trim()) return;
        const { error } = await supabase.from('cities').insert({ name: newCity.trim() });
        if (!error) {
            toast.success('Город добавлен');
            setNewCity('');
            fetchData();
        } else {
            toast.error('Ошибка или такой город уже есть');
        }
    };

    const deleteCity = async (id: string) => {
        if (!confirm('Удалить город?')) return;
        const { error } = await supabase.from('cities').delete().eq('id', id);
        if (!error) fetchData();
    };

    const addBanner = async (e: React.FormEvent) => {
        e.preventDefault();
        const { error } = await supabase.from('banners').insert({
            title: bannerTitle,
            content: bannerContent,
            image_url: bannerImage,
            link_url: bannerLink
        });
        if (!error) {
            toast.success('Баннер добавлен');
            setBannerTitle(''); setBannerContent(''); setBannerImage(''); setBannerLink('');
            fetchData();
        }
    };

    const deleteBanner = async (id: string) => {
        const { error } = await supabase.from('banners').delete().eq('id', id);
        if (!error) fetchData();
    };

    if (!isAdmin || loading) return <div className="p-20 text-center flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p>Загрузка панели управления...</p>
    </div>;

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <h1 className="text-4xl font-black flex items-center gap-3">
                    <Settings className="h-10 w-10 text-primary" /> Админка
                </h1>
                <div className="flex gap-2 p-1 rounded-2xl overflow-x-auto max-w-full">
                    {(['ads', 'users', 'cities', 'banners', 'reports'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={cn(
                                "px-6 py-3 rounded-xl text-sm font-black capitalize transition-all whitespace-nowrap",
                                activeTab === tab ? "bg-primary text-white shadow-lg" : "bg-muted text-muted-foreground hover:bg-muted/80"
                            )}
                        >
                            {tab === 'ads' ? `Объявления (${stats.pending})` :
                                tab === 'users' ? 'Люди' :
                                    tab === 'cities' ? 'Города' :
                                        tab === 'banners' ? 'Баннеры' : 'Жалобы'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-surface p-4 rounded-3xl border border-border">
                    <div className="text-xs font-bold text-muted uppercase mb-1">Всего объявлений</div>
                    <div className="text-2xl font-black">{stats.ads}</div>
                </div>
                <div className="bg-surface p-4 rounded-3xl border border-border">
                    <div className="text-xs font-bold text-muted uppercase mb-1">На модерации</div>
                    <div className="text-2xl font-black text-orange-500">{stats.pending}</div>
                </div>
                <div className="bg-surface p-4 rounded-3xl border border-border">
                    <div className="text-xs font-bold text-muted uppercase mb-1">Пользователей</div>
                    <div className="text-2xl font-black">{stats.users}</div>
                </div>
                <div className="bg-surface p-4 rounded-3xl border border-border">
                    <div className="text-xs font-bold text-muted uppercase mb-1">Городов</div>
                    <div className="text-2xl font-black">{stats.cities}</div>
                </div>
            </div>

            {/* Content Area */}
            <div className="bg-surface rounded-3xl border border-border shadow-sm min-h-[500px]">
                {activeTab === 'ads' && (
                    <div className="divide-y divide-border">
                        {ads.map(ad => (
                            <div key={ad.id} className="group hover:bg-muted/30 transition-colors relative">
                                <div className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                    <Link href={`/ad?id=${ad.id}`} className="flex items-center gap-4 flex-1">
                                        <div className="w-16 h-16 bg-muted rounded-2xl overflow-hidden shrink-0 shadow-sm">
                                            {ad.images?.[0] && <img src={ad.images[0]} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />}
                                        </div>
                                        <div>
                                            <div className="font-black text-lg line-clamp-1 group-hover:text-primary transition-colors">{ad.title}</div>
                                            <div className="text-sm text-muted">
                                                {ad.profiles?.full_name || 'Загрузка...'} • <span className={cn(
                                                    "font-bold",
                                                    statusLabels[ad.status]?.color || 'text-muted'
                                                )}>{statusLabels[ad.status]?.label || ad.status}</span>
                                            </div>
                                        </div>
                                    </Link>
                                    <div className="flex gap-2 w-full md:w-auto relative z-10">
                                        {ad.status === 'pending' && (
                                            <>
                                                <button onClick={() => handleApprove(ad.id)} className="flex-1 md:flex-none bg-green-500 hover:bg-green-600 text-white px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 font-bold transition-all shadow-md"><CheckCircle className="h-4 w-4" /> Одобрить</button>
                                                <button onClick={() => handleReject(ad.id)} className="flex-1 md:flex-none bg-red-500 hover:bg-red-600 text-white px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 font-bold transition-all shadow-md"><XCircle className="h-4 w-4" /> Отклонить</button>
                                            </>
                                        )}
                                        <button onClick={() => deleteAd(ad.id)} className="p-2.5 text-destructive hover:bg-red-50 rounded-xl transition-colors" title="Удалить"><Trash2 /></button>
                                        <Link href={`/ad?id=${ad.id}`} target="_blank" className="p-2.5 hover:bg-muted rounded-xl text-primary transition-colors"><ExternalLink /></Link>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {ads.length === 0 && <div className="p-20 text-center text-muted">Нет объявлений</div>}
                    </div>
                )}

                {activeTab === 'users' && (
                    <div className="p-6 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {users.map(u => (
                            <div key={u.id} className="bg-background p-6 rounded-3xl border border-border flex flex-col justify-between">
                                <div>
                                    <div className="font-black text-lg flex items-center gap-2">
                                        {u.full_name}
                                        {u.is_verified && <CheckCircle className="h-4 w-4 text-primary" />}
                                        {u.is_banned && <Ban className="h-4 w-4 text-destructive" />}
                                    </div>
                                    <div className="text-sm text-muted mb-6">{u.email}</div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleVerifyUser(u)} className={cn("flex-1 py-2 rounded-xl text-xs font-bold", u.is_verified ? "bg-primary/10 text-primary" : "bg-muted")}>
                                        {u.is_verified ? "Удалить галку" : "Верифицировать"}
                                    </button>
                                    <button onClick={() => handleBanUser(u)} className={cn("flex-1 py-2 rounded-xl text-xs font-bold", u.is_banned ? "bg-green-100 text-green-700" : "bg-red-50 text-red-600")}>
                                        {u.is_banned ? "Разбанить" : "Бан"}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'cities' && (
                    <div className="p-6">
                        <div className="flex gap-4 mb-8">
                            <input value={newCity} onChange={e => setNewCity(e.target.value)} placeholder="Название города" className="flex-1 p-3 rounded-2xl bg-background border border-border outline-none" />
                            <button onClick={addCity} className="bg-primary text-white px-6 py-3 rounded-2xl font-black">Добавить</button>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {cities.map(c => (
                                <div key={c.id} className="bg-background p-4 rounded-2xl border border-border flex items-center justify-between group">
                                    <span className="font-bold">{c.name}</span>
                                    <button onClick={() => deleteCity(c.id)} className="text-destructive opacity-0 group-hover:opacity-100"><Trash2 className="h-4 w-4" /></button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'banners' && (
                    <div className="p-6 space-y-8">
                        <form onSubmit={addBanner} className="grid md:grid-cols-2 gap-4 bg-background p-6 rounded-3xl border border-border">
                            <input value={bannerTitle} onChange={e => setBannerTitle(e.target.value)} placeholder="Заголовок" className="p-3 rounded-xl border border-border bg-surface outline-none" required />
                            <input value={bannerImage} onChange={e => setBannerImage(e.target.value)} placeholder="URL картинки" className="p-3 rounded-xl border border-border bg-surface outline-none" />
                            <input value={bannerLink} onChange={e => setBannerLink(e.target.value)} placeholder="URL ссылки" className="p-3 rounded-xl border border-border bg-surface outline-none" />
                            <textarea value={bannerContent} onChange={e => setBannerContent(e.target.value)} placeholder="Текст баннера" className="p-3 rounded-xl border border-border bg-surface outline-none md:col-span-2" />
                            <button type="submit" className="md:col-span-2 bg-primary text-white py-3 rounded-xl font-black">Создать баннер</button>
                        </form>
                        <div className="space-y-4">
                            {banners.map(b => (
                                <div key={b.id} className="bg-background p-6 rounded-3xl border border-border flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        {b.image_url && <img src={b.image_url} className="w-12 h-12 rounded-lg object-cover" />}
                                        <div><div className="font-bold">{b.title}</div><div className="text-sm text-muted">{b.content}</div></div>
                                    </div>
                                    <button onClick={() => deleteBanner(b.id)} className="text-destructive"><Trash2 /></button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'reports' && (
                    <div className="divide-y divide-border">
                        {reports.map(r => (
                            <div key={r.id} className="p-6 flex items-center justify-between">
                                <div>
                                    <div className="font-black text-red-600 mb-1">Жалоба от {r.reporter?.full_name}</div>
                                    <div className="text-sm font-bold">На объявление: {r.ad?.title}</div>
                                    <div className="text-sm text-muted italic">«{r.reason}»</div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => deleteAd(r.ad_id)} className="bg-destructive text-white px-4 py-2 rounded-xl font-bold">Удалить объявление</button>
                                    <button onClick={() => { supabase.from('reports').delete().eq('id', r.id).then(() => fetchData()) }} className="bg-muted px-4 py-2 rounded-xl font-bold">Игнорировать</button>
                                </div>
                            </div>
                        ))}
                        {reports.length === 0 && <div className="p-20 text-center text-muted">Жалоб нет</div>}
                    </div>
                )}
            </div>
        </div>
    );
}
