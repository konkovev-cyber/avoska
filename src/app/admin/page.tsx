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
    Pencil,
    Upload,
    X,
    Image as ImageIcon
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { compressImage } from '@/lib/image-utils';

export default function AdminDashboard() {
    const [isAdmin, setIsAdmin] = useState(false);
    const [activeTab, setActiveTab] = useState<'ads' | 'users' | 'cities' | 'banners' | 'reports' | 'categories'>('ads');
    const [stats, setStats] = useState({ ads: 0, users: 0, pending: 0, cities: 0, categories: 0 });
    const [ads, setAds] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [cities, setCities] = useState<any[]>([]);
    const [reports, setReports] = useState<any[]>([]);
    const [banners, setBanners] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [bannersEnabled, setBannersEnabled] = useState(true);
    const [bannersAdPageEnabled, setBannersAdPageEnabled] = useState(true);

    // City form state
    const [newCity, setNewCity] = useState('');
    const [editingCity, setEditingCity] = useState<any>(null);

    // Category form state
    const [catName, setCatName] = useState('');
    const [catSlug, setCatSlug] = useState('');
    const [catIcon, setCatIcon] = useState('');
    const [catColor, setCatColor] = useState('');
    const [catImage, setCatImage] = useState('');
    const [catImageFile, setCatImageFile] = useState<File | null>(null);
    const [catImagePreview, setCatImagePreview] = useState('');
    const [editingCategory, setEditingCategory] = useState<any>(null);

    // Banner form state
    const [bannerTitle, setBannerTitle] = useState('');
    const [bannerContent, setBannerContent] = useState('');
    const [bannerImage, setBannerImage] = useState('');
    const [bannerImageFile, setBannerImageFile] = useState<File | null>(null);
    const [bannerImagePreview, setBannerImagePreview] = useState('');
    const [bannerLink, setBannerLink] = useState('');
    const [editingBanner, setEditingBanner] = useState<any>(null);

    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        checkAdmin();
    }, []);

    const checkAdmin = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return router.push('/login');

        const { data: profile } = await supabase.from('profiles').select('role, email').eq('id', session.user.id).single();

        const ADMIN_EMAILS = ['ht-elk@yandex.ru', 'dron-vbg@yandex.ru', 'konkev@bk.ru', 'konkovev@gmail.com'];
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
            const [adsRes, usersRes, citiesRes, reportsRes, bannersRes, categoriesRes, settingsRes] = await Promise.all([
                supabase.from('ads').select('*, profiles!user_id(full_name, email)').order('created_at', { ascending: false }),
                supabase.from('profiles').select('*').order('created_at', { ascending: false }),
                supabase.from('cities').select('*').order('name'),
                supabase.from('reports').select('*, reporter:profiles(full_name), ad:ads(title)').order('created_at', { ascending: false }),
                supabase.from('banners').select('*').order('created_at', { ascending: false }),
                supabase.from('categories').select('*').order('name'),
                supabase.from('app_settings').select('*').in('key', ['banners_enabled', 'banners_ad_page_enabled'])
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
            setCategories(categoriesRes.data || []);

            const bEnabled = (settingsRes.data || []).find((s: any) => s.key === 'banners_enabled')?.value ?? 'true';
            const bAdEnabled = (settingsRes.data || []).find((s: any) => s.key === 'banners_ad_page_enabled')?.value ?? 'true';

            setBannersEnabled(bEnabled === 'true');
            setBannersAdPageEnabled(bAdEnabled === 'true');

            const allAdsCount = adsRes.data?.length || 0;
            const pendingAdsCount = (adsRes.data || []).filter((a: any) => a.status === 'pending').length;

            setStats({
                ads: allAdsCount,
                users: usersRes.data?.length || 0,
                pending: pendingAdsCount,
                cities: citiesRes.data?.length || 0,
                categories: categoriesRes.data?.length || 0
            });
        } catch (err: any) {
            console.error('Global fetch error:', err);
            toast.error('Ошибка загрузки данных');
        } finally {
            setLoading(false);
        }
    };

    const addCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const toastId = toast.loading(editingCategory ? 'Обновление...' : 'Создание...');

        try {
            let finalImageUrl = catImage;

            if (catImageFile) {
                const compressedFile = await compressImage(catImageFile);
                const fileName = `cat-${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;

                const { error: uploadError } = await supabase.storage
                    .from('categories')
                    .upload(fileName, compressedFile);

                if (uploadError) {
                    // Fallback to ad-images if categories bucket doesn't exist
                    const { error: fallbackError } = await supabase.storage
                        .from('ad-images')
                        .upload(`cats/${fileName}`, compressedFile);

                    if (fallbackError) throw new Error('Ошибка загрузки фото: ' + fallbackError.message);

                    const { data: { publicUrl } } = supabase.storage.from('ad-images').getPublicUrl(`cats/${fileName}`);
                    finalImageUrl = publicUrl;
                } else {
                    const { data: { publicUrl } } = supabase.storage.from('categories').getPublicUrl(fileName);
                    finalImageUrl = publicUrl;
                }
            }

            const payload = {
                name: catName,
                slug: catSlug || catName.toLowerCase().replace(/ /g, '-'),
                icon: catIcon,
                color: catColor,
                image: finalImageUrl
            };

            if (editingCategory) {
                const { error } = await supabase.from('categories').update(payload).eq('id', editingCategory.id);
                if (error) throw error;
                toast.success('Категория обновлена', { id: toastId });
            } else {
                const { error } = await supabase.from('categories').insert(payload);
                if (error) throw error;
                toast.success('Категория добавлена', { id: toastId });
            }

            setEditingCategory(null);
            setCatName(''); setCatSlug(''); setCatIcon(''); setCatColor(''); setCatImage('');
            setCatImageFile(null); setCatImagePreview('');
            fetchData();
        } catch (err: any) {
            toast.error(err.message, { id: toastId });
        } finally {
            setLoading(false);
        }
    };

    const deleteCategory = async (id: string) => {
        if (!confirm('Удалить категорию?')) return;
        const { error } = await supabase.from('categories').delete().eq('id', id);
        if (!error) fetchData();
    };

    const startEditingCategory = (c: any) => {
        setEditingCategory(c);
        setCatName(c.name);
        setCatSlug(c.slug);
        setCatIcon(c.icon || '');
        setCatColor(c.color || '');
        setCatImage(c.image || '');
        setCatImagePreview(c.image || '');
        setCatImageFile(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
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

    const handleMakeAdmin = async (user: any) => {
        const newRole = user.role === 'admin' ? 'user' : 'admin';
        const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', user.id);
        if (!error) {
            toast.success(`Роль ${newRole === 'admin' ? 'администратора выдана' : 'пользователя возвращена'}`);
            fetchData();
        } else {
            toast.error('Ошибка смены роли: ' + error.message);
        }
    };

    const handleDeleteUser = async (user: any) => {
        if (!confirm(`Вы уверены, что хотите удалить пользователя ${user.full_name || user.email} и ВСЕ его объявления? Это действие необратимо.`)) return;

        setLoading(true);
        const toastId = toast.loading('Удаление пользователя и данных...');

        try {
            // 1. Delete user ads (if cascade not enabled in DB)
            const { error: adsError } = await supabase.from('ads').delete().eq('user_id', user.id);
            if (adsError) throw new Error('Ошибка при удалении объявлений: ' + adsError.message);

            // 2. Delete profile
            const { error: profileError } = await supabase.from('profiles').delete().eq('id', user.id);
            if (profileError) throw new Error('Ошибка при удалении профиля: ' + profileError.message);

            toast.success('Пользователь и его объявления удалены', { id: toastId });
            fetchData();
        } catch (err: any) {
            toast.error(err.message, { id: toastId });
        } finally {
            setLoading(false);
        }
    };

    const addCity = async () => {
        if (!newCity.trim()) return;

        if (editingCity) {
            const { error } = await supabase.from('cities').update({ name: newCity.trim() }).eq('id', editingCity.id);
            if (!error) {
                toast.success('Город обновлен');
                setEditingCity(null);
                setNewCity('');
                fetchData();
            } else {
                toast.error('Ошибка обновления');
            }
        } else {
            const { error } = await supabase.from('cities').insert({ name: newCity.trim() });
            if (!error) {
                toast.success('Город добавлен');
                setNewCity('');
                fetchData();
            } else {
                toast.error('Ошибка или такой город уже есть');
            }
        }
    };

    const deleteCity = async (id: string) => {
        if (!confirm('Удалить город?')) return;
        const { error } = await supabase.from('cities').delete().eq('id', id);
        if (!error) fetchData();
    };

    const startEditingCity = (c: any) => {
        setEditingCity(c);
        setNewCity(c.name);
    };

    const addBanner = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const toastId = toast.loading(editingBanner ? 'Обновление...' : 'Создание...');

        try {
            let finalImageUrl = bannerImage;

            if (bannerImageFile) {
                const fileName = `banner-${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
                const { error: uploadError } = await supabase.storage
                    .from('categories') // Reuse categories bucket or use a banner bucket if exists
                    .upload(fileName, bannerImageFile);

                if (uploadError) {
                    // Fallback to ad-images if bucket doesn't exist
                    const { error: fallbackError } = await supabase.storage
                        .from('ad-images')
                        .upload(`banners/${fileName}`, bannerImageFile);

                    if (fallbackError) throw new Error('Ошибка загрузки фото: ' + fallbackError.message);

                    const { data: { publicUrl } } = supabase.storage.from('ad-images').getPublicUrl(`banners/${fileName}`);
                    finalImageUrl = publicUrl;
                } else {
                    const { data: { publicUrl } } = supabase.storage.from('categories').getPublicUrl(fileName);
                    finalImageUrl = publicUrl;
                }
            }

            const payload = {
                title: bannerTitle,
                content: bannerContent,
                image_url: finalImageUrl,
                link_url: bannerLink,
                is_active: true
            };

            if (editingBanner) {
                const { error } = await supabase.from('banners').update(payload).eq('id', editingBanner.id);
                if (error) throw error;
                toast.success('Баннер обновлен', { id: toastId });
            } else {
                const { error } = await supabase.from('banners').insert(payload);
                if (error) throw error;
                toast.success('Баннер добавлен', { id: toastId });
            }

            setEditingBanner(null);
            setBannerTitle(''); setBannerContent(''); setBannerImage(''); setBannerLink('');
            setBannerImageFile(null); setBannerImagePreview('');
            fetchData();
        } catch (err: any) {
            toast.error(err.message, { id: toastId });
        } finally {
            setLoading(false);
        }
    };

    const deleteBanner = async (id: string) => {
        const { error } = await supabase.from('banners').delete().eq('id', id);
        if (!error) fetchData();
    };

    const startEditingBanner = (b: any) => {
        setEditingBanner(b);
        setBannerTitle(b.title);
        setBannerContent(b.content || '');
        setBannerImage(b.image_url || '');
        setBannerImagePreview(b.image_url || '');
        setBannerImageFile(null);
        setBannerLink(b.link_url || '');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const toggleBannersEnabled = async () => {
        const newValue = !bannersEnabled;
        const { error } = await supabase
            .from('app_settings')
            .upsert({ key: 'banners_enabled', value: newValue.toString(), updated_at: new Date().toISOString() }, { onConflict: 'key' });

        if (!error) {
            setBannersEnabled(newValue);
            toast.success(newValue ? 'Баннеры на главной включены' : 'Баннеры на главной выключены');
        } else {
            toast.error('Ошибка обновления настроек');
        }
    };

    const toggleBannersAdPageEnabled = async () => {
        const newValue = !bannersAdPageEnabled;
        const { error } = await supabase
            .from('app_settings')
            .upsert({ key: 'banners_ad_page_enabled', value: newValue.toString(), updated_at: new Date().toISOString() }, { onConflict: 'key' });

        if (!error) {
            setBannersAdPageEnabled(newValue);
            toast.success(newValue ? 'Баннеры в объявлениях включены' : 'Баннеры в объявлениях выключены');
        } else {
            toast.error('Ошибка обновления настроек');
        }
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
                <div className="flex flex-wrap gap-2 p-1">
                    {(['ads', 'users', 'cities', 'categories', 'banners', 'reports'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={cn(
                                "px-6 py-3 rounded-xl text-sm font-black capitalize transition-all whitespace-nowrap border-2",
                                activeTab === tab
                                    ? "bg-primary text-white border-primary shadow-lg shadow-primary/20"
                                    : "bg-white border-border text-muted-foreground hover:bg-muted/50 hover:border-muted-foreground/20"
                            )}
                        >
                            {tab === 'ads' ? `Объявления (${stats.pending})` :
                                tab === 'users' ? 'Люди' :
                                    tab === 'cities' ? 'Города' :
                                        tab === 'categories' ? 'Категории' :
                                            tab === 'banners' ? 'Баннеры' : 'Жалобы'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Stats Summary - Clickable */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                <button
                    onClick={() => setActiveTab('ads')}
                    className={cn(
                        "bg-surface p-4 rounded-3xl border transition-all text-left group",
                        activeTab === 'ads' ? "border-primary shadow-md ring-1 ring-primary/20" : "border-border hover:border-primary/50 hover:shadow-sm"
                    )}
                >
                    <div className="text-xs font-bold text-muted uppercase mb-1">Всего объявлений</div>
                    <div className="text-2xl font-black group-hover:text-primary transition-colors">{stats.ads}</div>
                </button>
                <button
                    onClick={() => setActiveTab('ads')}
                    className={cn(
                        "bg-surface p-4 rounded-3xl border transition-all text-left group",
                        activeTab === 'ads' ? "border-primary shadow-md ring-1 ring-primary/20" : "border-border hover:border-primary/50 hover:shadow-sm"
                    )}
                >
                    <div className="text-xs font-bold text-muted uppercase mb-1">На модерации</div>
                    <div className="text-2xl font-black text-orange-500 group-hover:scale-105 transition-transform origin-left">{stats.pending}</div>
                </button>
                <button
                    onClick={() => setActiveTab('users')}
                    className={cn(
                        "bg-surface p-4 rounded-3xl border transition-all text-left group",
                        activeTab === 'users' ? "border-primary shadow-md ring-1 ring-primary/20" : "border-border hover:border-primary/50 hover:shadow-sm"
                    )}
                >
                    <div className="text-xs font-bold text-muted uppercase mb-1">Пользователей</div>
                    <div className="text-2xl font-black group-hover:text-primary transition-colors">{stats.users}</div>
                </button>
                <button
                    onClick={() => setActiveTab('cities')}
                    className={cn(
                        "bg-surface p-4 rounded-3xl border transition-all text-left group",
                        activeTab === 'cities' ? "border-primary shadow-md ring-1 ring-primary/20" : "border-border hover:border-primary/50 hover:shadow-sm"
                    )}
                >
                    <div className="text-xs font-bold text-muted uppercase mb-1">Городов</div>
                    <div className="text-2xl font-black group-hover:text-primary transition-colors">{stats.cities}</div>
                </button>
                <button
                    onClick={() => setActiveTab('categories')}
                    className={cn(
                        "bg-surface p-4 rounded-3xl border transition-all text-left group",
                        activeTab === 'categories' ? "border-primary shadow-md ring-1 ring-primary/20" : "border-border hover:border-primary/50 hover:shadow-sm"
                    )}
                >
                    <div className="text-xs font-bold text-muted uppercase mb-1">Категорий</div>
                    <div className="text-2xl font-black group-hover:text-primary transition-colors">{stats.categories}</div>
                </button>
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
                                    <div className="flex flex-wrap items-center gap-1 w-full md:w-auto relative z-10">
                                        <Link
                                            href={`/ads/edit?id=${ad.id}`}
                                            className="p-2 hover:bg-blue-50 text-blue-500 rounded-lg transition-all"
                                            title="Редактировать"
                                        >
                                            <Pencil className="h-5 w-5" />
                                        </Link>

                                        {ad.status === 'active' ? (
                                            <button
                                                onClick={() => handleReject(ad.id)}
                                                className="p-2 hover:bg-orange-50 text-orange-500 rounded-lg transition-all"
                                                title="Забанить"
                                            >
                                                <Ban className="h-5 w-5" />
                                            </button>
                                        ) : (
                                            ad.status !== 'pending' && (
                                                <button
                                                    onClick={() => handleApprove(ad.id)}
                                                    className="p-2 hover:bg-green-50 text-green-500 rounded-lg transition-all"
                                                    title="Активировать"
                                                >
                                                    <CheckCircle className="h-5 w-5" />
                                                </button>
                                            )
                                        )}

                                        {ad.status === 'pending' && (
                                            <div className="flex gap-1 mr-2">
                                                <button onClick={() => handleApprove(ad.id)} className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl flex items-center gap-1.5 text-xs font-black transition-all shadow-sm"><CheckCircle className="h-4 w-4" /> ОК</button>
                                                <button onClick={() => handleReject(ad.id)} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl flex items-center gap-1.5 text-xs font-black transition-all shadow-sm"><XCircle className="h-4 w-4" /> НЕТ</button>
                                            </div>
                                        )}

                                        <button onClick={() => deleteAd(ad.id)} className="p-2 text-destructive hover:bg-red-50 rounded-lg transition-all" title="Удалить"><Trash2 className="h-5 w-5" /></button>
                                        <Link href={`/ad?id=${ad.id}`} target="_blank" className="p-2 hover:bg-muted rounded-lg text-primary transition-all"><ExternalLink className="h-5 w-5" /></Link>
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
                                <div className="mt-2 flex gap-2">
                                    <button onClick={() => handleMakeAdmin(u)} className={cn("flex-1 py-2 rounded-xl text-xs font-bold transition-colors", u.role === 'admin' ? "bg-purple-100 text-purple-700 hover:bg-purple-200" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}>
                                        {u.role === 'admin' ? "Снять админа" : "Сделать админом"}
                                    </button>
                                    <button
                                        onClick={() => handleDeleteUser(u)}
                                        className="p-2 bg-red-100 text-red-600 rounded-xl hover:bg-red-200 transition-colors"
                                        title="Удалить пользователя"
                                    >
                                        <Trash2 className="h-4 w-4" />
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
                            <div className="flex gap-2">
                                <button onClick={addCity} className="bg-primary text-white px-6 py-3 rounded-2xl font-black">
                                    {editingCity ? 'Обновить' : 'Добавить'}
                                </button>
                                {editingCity && (
                                    <button onClick={() => { setEditingCity(null); setNewCity(''); }} className="bg-muted px-6 py-3 rounded-2xl font-black">Отмена</button>
                                )}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {cities.map(c => (
                                <div key={c.id} className="bg-background p-4 rounded-2xl border border-border flex items-center justify-between group">
                                    <span className="font-bold">{c.name}</span>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => startEditingCity(c)} className="text-primary"><Settings className="h-4 w-4" /></button>
                                        <button onClick={() => deleteCity(c.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'categories' && (
                    <div className="p-6 space-y-8">
                        <form onSubmit={addCategory} className="grid md:grid-cols-2 gap-4 bg-background p-6 rounded-3xl border border-border">
                            <div className="md:col-span-2 flex justify-between items-center mb-2">
                                <h3 className="font-black text-xl">{editingCategory ? 'Редактировать категорию' : 'Добавить новую категорию'}</h3>
                                {editingCategory && (
                                    <button type="button" onClick={() => { setEditingCategory(null); setCatName(''); setCatSlug(''); setCatIcon(''); setCatColor(''); setCatImage(''); }} className="text-sm text-primary font-bold">Отменить редактирование</button>
                                )}
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider ml-1">Название категории</label>
                                <input value={catName} onChange={e => setCatName(e.target.value)} placeholder="Напр: Электроника" className="w-full p-3 rounded-xl border border-border bg-surface outline-none font-bold" required />
                                <p className="text-[9px] text-muted-foreground ml-1 font-medium">Отображается в меню сайта</p>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider ml-1">Имя для ссылки (латиницей)</label>
                                <input value={catSlug} onChange={e => setCatSlug(e.target.value)} placeholder="Напр: electronics" className="w-full p-3 rounded-xl border border-border bg-surface outline-none" />
                                <p className="text-[9px] text-muted-foreground ml-1">Будет в адресе: avoska.com/category/<b>ваше-слово</b></p>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider ml-1">Загрузить картинку</label>
                                <div className="flex items-center gap-4">
                                    <label className="flex-1 flex flex-col items-center justify-center h-32 border-2 border-dashed border-border rounded-2xl cursor-pointer hover:bg-muted/30 transition-all group bg-surface overflow-hidden relative">
                                        {catImagePreview ? (
                                            <>
                                                <img src={catImagePreview} className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <span className="text-white text-xs font-bold">Изменить</span>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                                <Upload className="h-8 w-8" />
                                                <span className="text-[10px] font-black uppercase">Выбрать файл</span>
                                            </div>
                                        )}
                                        <input
                                            type="file"
                                            className="hidden"
                                            accept="image/*"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    setCatImageFile(file);
                                                    setCatImagePreview(URL.createObjectURL(file));
                                                }
                                            }}
                                        />
                                    </label>
                                    {catImagePreview && (
                                        <button
                                            type="button"
                                            onClick={() => { setCatImageFile(null); setCatImagePreview(''); setCatImage(''); }}
                                            className="p-3 bg-red-100 text-red-600 rounded-xl hover:bg-red-200 transition-colors"
                                        >
                                            <X className="h-5 w-5" />
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider ml-1">Цветовой код градиента</label>
                                <input value={catColor} onChange={e => setCatColor(e.target.value)} placeholder="from-blue-500 to-cyan-500" className="w-full p-3 rounded-xl border border-border bg-surface outline-none" />
                                <p className="text-[9px] text-muted-foreground ml-1 font-medium">Стиль заливки кнопок (напр: from-green-500 to-teal-500)</p>
                            </div>
                            <div className="space-y-1 md:col-span-2">
                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider ml-1">Тип иконки (на английском)</label>
                                <input value={catIcon} onChange={e => setCatIcon(e.target.value)} placeholder="Напр: Car, Home, Smartphone" className="w-full p-3 rounded-xl border border-border bg-surface outline-none font-mono text-sm" />
                                <p className="text-[9px] text-muted-foreground ml-1">Название символа из библиотеки (Home, Car, Smartphone, Shirt и др.)</p>
                            </div>
                            <button type="submit" className="md:col-span-2 bg-primary text-white py-3 rounded-xl font-black transition-all hover:opacity-90">
                                {editingCategory ? 'Обновить категорию' : 'Добавить категорию'}
                            </button>
                        </form>
                        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {categories.map(c => (
                                <div key={c.id} className="bg-background p-4 rounded-3xl border border-border flex items-center gap-3 group">
                                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-muted shrink-0">
                                        {c.image ? <img src={c.image} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xs text-muted">Нет фото</div>}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-bold truncate">{c.name}</div>
                                        <div className="text-xs text-muted truncate">{c.slug}</div>
                                    </div>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => startEditingCategory(c)} className="text-primary hover:scale-110 transition-transform"><Settings className="h-4 w-4" /></button>
                                        <button onClick={() => deleteCategory(c.id)} className="text-destructive hover:scale-110 transition-transform"><Trash2 className="h-4 w-4" /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'banners' && (
                    <div className="p-6 space-y-8">
                        {/* Global Banner Toggle */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-primary/5 to-primary/10 rounded-2xl border border-primary/20">
                                <div>
                                    <h3 className="font-black text-lg">Баннеры на главной</h3>
                                    <p className="text-xs text-muted">Глобальный показ на главной странице</p>
                                </div>
                                <button
                                    onClick={toggleBannersEnabled}
                                    className={cn(
                                        "relative inline-flex h-8 w-14 items-center rounded-full transition-colors",
                                        bannersEnabled ? "bg-primary" : "bg-muted"
                                    )}
                                >
                                    <span
                                        className={cn(
                                            "inline-block h-6 w-6 transform rounded-full bg-white transition-transform shadow-lg",
                                            bannersEnabled ? "translate-x-7" : "translate-x-1"
                                        )}
                                    />
                                </button>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-accent/5 to-accent/10 rounded-2xl border border-accent/20">
                                <div>
                                    <h3 className="font-black text-lg">Баннеры в объявлении</h3>
                                    <p className="text-xs text-muted">Показ в боковой панели объявления</p>
                                </div>
                                <button
                                    onClick={toggleBannersAdPageEnabled}
                                    className={cn(
                                        "relative inline-flex h-8 w-14 items-center rounded-full transition-colors",
                                        bannersAdPageEnabled ? "bg-accent" : "bg-muted"
                                    )}
                                >
                                    <span
                                        className={cn(
                                            "inline-block h-6 w-6 transform rounded-full bg-white transition-transform shadow-lg",
                                            bannersAdPageEnabled ? "translate-x-7" : "translate-x-1"
                                        )}
                                    />
                                </button>
                            </div>
                        </div>

                        <form onSubmit={addBanner} className="grid md:grid-cols-2 gap-4 bg-surface p-6 rounded-3xl border border-border">
                            <div className="md:col-span-2 flex justify-between items-center mb-1">
                                <h3 className="font-black text-xl">{editingBanner ? 'Редактировать баннер' : 'Создать новый баннер'}</h3>
                                {editingBanner && (
                                    <button type="button" onClick={() => { setEditingBanner(null); setBannerTitle(''); setBannerContent(''); setBannerImage(''); setBannerLink(''); setBannerImageFile(null); setBannerImagePreview(''); }} className="text-sm text-primary font-bold">Отменить</button>
                                )}
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider ml-1">Заголовок</label>
                                <input value={bannerTitle} onChange={e => setBannerTitle(e.target.value)} placeholder="Заголовок" className="w-full p-3 rounded-xl border border-border bg-background outline-none" required />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider ml-1">Ссылка (необязательно)</label>
                                <input value={bannerLink} onChange={e => setBannerLink(e.target.value)} placeholder="https://..." className="w-full p-3 rounded-xl border border-border bg-background outline-none" />
                            </div>
                            <div className="space-y-1 md:col-span-2">
                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider ml-1">Загрузить картинку</label>
                                <div className="flex items-center gap-4">
                                    <label className="flex-1 flex flex-col items-center justify-center h-40 border-2 border-dashed border-border rounded-2xl cursor-pointer hover:bg-muted/30 transition-all group bg-background overflow-hidden relative">
                                        {bannerImagePreview ? (
                                            <>
                                                <img src={bannerImagePreview} className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <span className="text-white text-xs font-bold font-black uppercase tracking-widest">Изменить</span>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                                <ImageIcon className="h-10 w-10 opacity-30" />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Выбрать баннер</span>
                                            </div>
                                        )}
                                        <input
                                            type="file"
                                            className="hidden"
                                            accept="image/*"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    setBannerImageFile(file);
                                                    setBannerImagePreview(URL.createObjectURL(file));
                                                }
                                            }}
                                        />
                                    </label>
                                    {bannerImagePreview && (
                                        <button
                                            type="button"
                                            onClick={() => { setBannerImageFile(null); setBannerImagePreview(''); setBannerImage(''); }}
                                            className="p-4 bg-red-100 text-red-600 rounded-2xl hover:bg-red-200 transition-colors"
                                        >
                                            <Trash2 className="h-6 w-6" />
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-1 md:col-span-2">
                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider ml-1">Текст баннера (необязательно)</label>
                                <textarea value={bannerContent} onChange={e => setBannerContent(e.target.value)} placeholder="Короткое описание..." className="w-full p-3 rounded-xl border border-border bg-background outline-none min-h-[80px]" />
                            </div>
                            <button type="submit" className="md:col-span-2 bg-primary text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-primary/20 active:scale-95 transition-all">
                                {editingBanner ? 'Обновить баннер' : 'Создать баннер'}
                            </button>
                        </form>
                        <div className="space-y-4">
                            {banners.map(b => (
                                <div key={b.id} className="bg-background p-6 rounded-3xl border border-border flex items-center justify-between group">
                                    <div className="flex items-center gap-4">
                                        {b.image_url && <img src={b.image_url} className="w-12 h-12 rounded-lg object-cover" />}
                                        <div><div className="font-bold">{b.title}</div><div className="text-sm text-muted">{b.content}</div></div>
                                    </div>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => startEditingBanner(b)} className="text-primary"><Settings className="h-4 w-4" /></button>
                                        <button onClick={() => deleteBanner(b.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></button>
                                    </div>
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
