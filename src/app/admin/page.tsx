'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import {
    Package, Users, MapPin, Settings, Trash2, CheckCircle, CheckCircle2,
    ShieldCheck, Ban, Pencil, Upload, X, Image as ImageIcon, Star,
    LayoutGrid, MessageSquare, Flag, Search, Bell, LogOut, Clock,
    User, ChevronRight, MoreHorizontal, Filter, Grid3x3, List, Send, Bot, Menu
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { compressImage } from '@/lib/image-utils';

export default function AdminDashboard() {
    const [isAdmin, setIsAdmin] = useState(false);
    const [activeTab, setActiveTab] = useState<'ads' | 'users' | 'cities' | 'banners' | 'reports' | 'categories' | 'reviews' | 'settings'>('ads');
    const [stats, setStats] = useState({ ads: 0, users: 0, pending: 0, cities: 0, categories: 0 });

    // Data states
    const [ads, setAds] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [cities, setCities] = useState<any[]>([]);
    const [reports, setReports] = useState<any[]>([]);
    const [banners, setBanners] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [reviews, setReviews] = useState<any[]>([]);

    // Configuration states
    const [bannersEnabled, setBannersEnabled] = useState(true);
    const [bannersAdPageEnabled, setBannersAdPageEnabled] = useState(true);

    // Forms states
    const [newCity, setNewCity] = useState('');
    const [editingCity, setEditingCity] = useState<any>(null);

    const [catName, setCatName] = useState('');
    const [catSlug, setCatSlug] = useState('');
    const [catIcon, setCatIcon] = useState('');
    const [catColor, setCatColor] = useState('#667eea');
    const [catImage, setCatImage] = useState('');
    const [catImageFile, setCatImageFile] = useState<File | null>(null);
    const [catImagePreview, setCatImagePreview] = useState('');
    const [editingCategory, setEditingCategory] = useState<any>(null);

    const [bannerTitle, setBannerTitle] = useState('');
    const [bannerContent, setBannerContent] = useState('');
    const [bannerImage, setBannerImage] = useState('');
    const [bannerImageFile, setBannerImageFile] = useState<File | null>(null);
    const [bannerImagePreview, setBannerImagePreview] = useState('');
    const [bannerLink, setBannerLink] = useState('');
    const [editingBanner, setEditingBanner] = useState<any>(null);

    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [dataFetched, setDataFetched] = useState(false);
    const router = useRouter();

    // Telegram settings state
    const [tgChatId, setTgChatId] = useState('');
    const [tgNotifyNewAds, setTgNotifyNewAds] = useState(true);
    const [tgNotifyNewUsers, setTgNotifyNewUsers] = useState(true);
    const [tgSaving, setTgSaving] = useState(false);
    const [currentUserId, setCurrentUserId] = useState('');

    useEffect(() => {
        checkAdmin();
    }, []);

    const checkAdmin = async () => {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return router.push('/login');

        const { data: profile } = await supabase.from('profiles').select('role, email').eq('id', session.user.id).single();
        const ADMIN_EMAILS = ['ht-elk@yandex.ru', 'dron-vbg@yandex.ru', 'konkev@bk.ru', 'konkovev@gmail.com'];
        const userEmail = session.user.email || profile?.email;

        if (profile?.role !== 'admin' && !ADMIN_EMAILS.includes(userEmail || '')) {
            toast.error('Доступ запрещен');
            return router.push('/');
        }

        setCurrentUserId(session.user.id);
        setIsAdmin(true);
        if (!dataFetched) {
            await fetchData();
            await loadTelegramSettings(session.user.id);
            setDataFetched(true);
        }
        setLoading(false);
    };

    const loadTelegramSettings = async (userId: string) => {
        const { data } = await supabase
            .from('admin_settings')
            .select('*')
            .eq('user_id', userId)
            .single();
        if (data) {
            setTgChatId(data.telegram_chat_id || '');
            setTgNotifyNewAds(data.notify_new_ads !== false);
            setTgNotifyNewUsers(data.notify_new_users !== false);
        }
    };

    const saveTelegramSettings = async () => {
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
            toast.success('Настройки Telegram сохранены!');
        } catch (e: any) {
            toast.error('Ошибка сохранения: ' + e.message);
        } finally {
            setTgSaving(false);
        }
    };

    const testTelegramNotification = async () => {
        if (!tgChatId.trim()) {
            toast.error('Сначала введите Chat ID');
            return;
        }
        try {
            const { data, error } = await supabase.functions.invoke('notify-test', {
                body: { chatId: tgChatId.trim() }
            });
            if (error) throw error;
            if (data.success) toast.success('Тестовое сообщение отправлено!');
            else toast.error('Ошибка: ' + (data.error || 'Не удалось отправить'));
        } catch (e: any) {
            console.error('Test error:', e);
            toast.error('Не удалось отправить тест: ' + e.message);
        }
    };

    const fetchData = async () => {
        const [adsRes, usersRes, citiesRes, reportsRes, bannersRes, categoriesRes, reviewsRes] = await Promise.all([
            supabase.from('ads').select('*').order('created_at', { ascending: false }),
            supabase.from('profiles').select('*').order('created_at', { ascending: false }),
            supabase.from('cities').select('*').order('name'),
            supabase.from('reports').select('*, ad:ads(title), reporter:profiles!reporter_id(full_name)').order('created_at', { ascending: false }),
            supabase.from('banners').select('*').order('created_at', { ascending: false }),
            supabase.from('categories').select('*').order('name'),
            supabase.from('reviews').select('*, reviewer:profiles!reviewer_id(full_name)').order('created_at', { ascending: false })
        ]);

        // Deduplicate by id
        const dedupe = (arr: any[]) => Array.from(new Map(arr.map(item => [item.id, item])).values());

        setAds(dedupe(adsRes.data || []));
        setUsers(dedupe(usersRes.data || []));
        setCities(dedupe(citiesRes.data || []));
        setReports(dedupe(reportsRes.data || []));
        setBanners(dedupe(bannersRes.data || []));
        setCategories(dedupe(categoriesRes.data || []));
        setReviews(dedupe(reviewsRes.data || []));

        setStats({
            ads: adsRes.data?.length || 0,
            users: usersRes.data?.length || 0,
            pending: adsRes.data?.filter(a => a.status === 'pending').length || 0,
            cities: citiesRes.data?.length || 0,
            categories: categoriesRes.data?.length || 0
        });
    };

    // Category functions
    const addCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!catName.trim()) return toast.error('Введите название');

        const slug = catSlug || catName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        let imageUrl = catImage;

        if (catImageFile) {
            const compressed = await compressImage(catImageFile, 400, 0.8);
            const fileName = `category-${Date.now()}.jpg`;
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('images')
                .upload(fileName, compressed);

            if (uploadError) return toast.error('Ошибка загрузки изображения');
            const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(fileName);
            imageUrl = publicUrl;
        }

        if (editingCategory) {
            const { error } = await supabase.from('categories').update({
                name: catName,
                slug,
                icon: catIcon,
                color: catColor,
                image: imageUrl
            }).eq('id', editingCategory.id);

            if (error) return toast.error('Ошибка обновления');
            toast.success('Категория обновлена');
        } else {
            const { error } = await supabase.from('categories').insert({
                name: catName,
                slug,
                icon: catIcon,
                color: catColor,
                image: imageUrl
            });

            if (error) return toast.error('Ошибка создания');
            toast.success('Категория создана');
        }

        setCatName('');
        setCatSlug('');
        setCatIcon('');
        setCatColor('#667eea');
        setCatImage('');
        setCatImageFile(null);
        setCatImagePreview('');
        setEditingCategory(null);
        fetchData();
    };

    const startEditingCategory = (cat: any) => {
        setEditingCategory(cat);
        setCatName(cat.name);
        setCatSlug(cat.slug);
        setCatIcon(cat.icon || '');
        setCatColor(cat.color || '#667eea');
        setCatImage(cat.image || '');
        setCatImagePreview(cat.image || '');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const deleteCategory = async (id: string) => {
        if (!confirm('Удалить категорию?')) return;
        const { error } = await supabase.from('categories').delete().eq('id', id);
        if (error) return toast.error('Ошибка удаления');
        toast.success('Удалено');
        fetchData();
    };

    const deleteAd = async (id: string) => {
        if (!confirm('Удалить объявление?')) return;
        const { error } = await supabase.from('ads').delete().eq('id', id);
        if (error) return toast.error('Ошибка');
        toast.success('Удалено');
        fetchData();
    };

    const toggleUserBan = async (userId: string, currentStatus: boolean) => {
        const { error } = await supabase.from('profiles').update({ is_banned: !currentStatus }).eq('id', userId);
        if (error) return toast.error('Ошибка');
        toast.success(currentStatus ? 'Разбанен' : 'Забанен');
        fetchData();
    };

    const toggleUserVerification = async (userId: string, currentStatus: boolean) => {
        const { error } = await supabase.from('profiles').update({ is_verified: !currentStatus }).eq('id', userId);
        if (error) return toast.error('Ошибка');
        toast.success(currentStatus ? 'Верификация снята' : 'Верифицирован');
        fetchData();
    };

    if (loading) return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            {/* Mobile Header - High z-index to be above global header */}
            <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-200 z-[150] flex items-center justify-between px-4">
                <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="p-2 -ml-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                >
                    <Menu className="h-6 w-6" />
                </button>
                <span className="font-bold text-gray-900 tracking-tight text-lg">Admin</span>
                <div className="w-10" /> {/* Spacer */}
            </div>

            {/* macOS-style Sidebar / Mobile Side Menu */}
            <div className={cn(
                "fixed left-0 top-0 lg:top-16 h-full lg:h-[calc(100vh-4rem)] w-64 bg-white/95 lg:bg-white/80 backdrop-blur-xl border-r border-gray-200/50 shadow-xl lg:shadow-sm z-[200] lg:z-50 transition-transform duration-300 lg:translate-x-0",
                isMenuOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="p-6 lg:p-6 pt-16 lg:pt-6">
                    <h1 className="text-xl font-semibold text-gray-900 mb-1">Admin Console</h1>
                    <p className="text-xs text-gray-500">Авоська Админ</p>
                </div>

                <nav className="px-3 space-y-1 overflow-y-auto max-h-[calc(100vh-12rem)]">
                    {[
                        { id: 'ads', icon: Package, label: 'Объявления', count: stats.ads },
                        { id: 'users', icon: Users, label: 'Пользователи', count: stats.users },
                        { id: 'cities', icon: MapPin, label: 'Города', count: stats.cities },
                        { id: 'categories', icon: LayoutGrid, label: 'Категории', count: stats.categories },
                        { id: 'banners', icon: ImageIcon, label: 'Баннеры', count: banners.length },
                        { id: 'reports', icon: Flag, label: 'Жалобы', count: reports.length },
                        { id: 'reviews', icon: MessageSquare, label: 'Отзывы', count: reviews.length },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => {
                                setActiveTab(tab.id as any);
                                setIsMenuOpen(false);
                            }}
                            className={cn(
                                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left",
                                activeTab === tab.id
                                    ? "bg-blue-50 text-blue-600"
                                    : "text-gray-700 hover:bg-gray-50"
                            )}
                        >
                            <tab.icon className="h-4 w-4 shrink-0" />
                            <span className="flex-1 truncate">{tab.label}</span>
                            <span className={cn(
                                "text-[10px] px-1.5 py-0.5 rounded-full font-bold",
                                activeTab === tab.id ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
                            )}>
                                {tab.count}
                            </span>
                        </button>
                    ))}

                    <div className="pt-2 mt-2 border-t border-gray-100">
                        <button
                            onClick={() => {
                                setActiveTab('settings');
                                setIsMenuOpen(false);
                            }}
                            className={cn(
                                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left",
                                activeTab === 'settings'
                                    ? "bg-blue-50 text-blue-600"
                                    : "text-gray-700 hover:bg-gray-50"
                            )}
                        >
                            <Settings className="h-4 w-4 shrink-0" />
                            <span className="flex-1">Настройки</span>
                        </button>
                    </div>
                </nav>
            </div>

            {/* Backdrop for mobile menu */}
            {isMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[180] lg:hidden"
                    onClick={() => setIsMenuOpen(false)}
                />
            )}

            {/* Mobile Bottom Bar for Quick Actions - Higher z-index */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-200 z-[160] flex items-center justify-around px-2">
                {[
                    { id: 'ads', icon: Package, label: 'Объяв.' },
                    { id: 'users', icon: Users, label: 'Польз.' },
                    { id: 'categories', icon: LayoutGrid, label: 'Кат.' },
                    { id: 'settings', icon: Settings, label: 'Настр.' }
                ].map(item => (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id as any)}
                        className={cn(
                            "flex flex-col items-center gap-1 p-2 rounded-xl transition-all min-w-[64px]",
                            activeTab === item.id ? "text-blue-600 bg-blue-50" : "text-gray-400"
                        )}
                    >
                        <item.icon className="h-5 w-5" />
                        <span className="text-[10px] font-bold">{item.label}</span>
                    </button>
                ))}
            </div>

            {/* Main Content Area - Changed from <main> to <div> to fix hydration mismatch with RootLayout */}
            <div className="lg:ml-64 min-h-screen p-4 lg:p-8 pt-20 lg:pt-24 pb-20 lg:pb-8">
                {/* Header */}
                <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-xl lg:text-2xl font-bold text-gray-900 tracking-tight">
                            {activeTab === 'categories' && 'Категории'}
                            {activeTab === 'ads' && 'Объявления'}
                            {activeTab === 'users' && 'Пользователи'}
                            {activeTab === 'cities' && 'Города'}
                            {activeTab === 'banners' && 'Баннеры'}
                            {activeTab === 'reports' && 'Жалобы'}
                            {activeTab === 'reviews' && 'Отзывы'}
                            {activeTab === 'settings' && 'Настройки'}
                        </h2>
                        <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest font-bold">
                            {activeTab === 'categories' && 'Управление категориями'}
                            {activeTab === 'users' && 'Управление пользователями'}
                            {activeTab === 'cities' && 'Управление городами'}
                            {activeTab === 'settings' && 'Настройки системы'}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1 md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                            <input
                                type="text"
                                placeholder="Быстрый поиск..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-sm"
                            />
                        </div>
                        <div className="hidden sm:flex bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={cn(
                                    "p-2 rounded-lg transition-all",
                                    viewMode === 'grid' ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-gray-400 hover:text-gray-600"
                                )}
                            >
                                <Grid3x3 className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => setViewMode('table')}
                                className={cn(
                                    "p-2 rounded-lg transition-all",
                                    viewMode === 'table' ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-gray-400 hover:text-gray-600"
                                )}
                            >
                                <List className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Categories View */}
                {activeTab === 'categories' && (
                    <div className="space-y-4">
                        {/* Заголовок с переключателем */}
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-semibold text-base text-gray-900">
                                    {editingCategory ? 'Редактировать категорию' : 'Добавить категорию'}
                                </h3>
                                <p className="text-xs text-gray-500 mt-0.5">Заполните данные для создания категории</p>
                            </div>
                            <div className="flex bg-white border border-gray-200 rounded-lg p-0.5">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={cn(
                                        "p-1.5 rounded transition-all",
                                        viewMode === 'grid' ? "bg-blue-50 text-blue-600" : "text-gray-400 hover:text-gray-600"
                                    )}
                                    title="Карточки"
                                >
                                    <Grid3x3 className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => setViewMode('table')}
                                    className={cn(
                                        "p-1.5 rounded transition-all",
                                        viewMode === 'table' ? "bg-blue-50 text-blue-600" : "text-gray-400 hover:text-gray-600"
                                    )}
                                    title="Таблица"
                                >
                                    <List className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        {/* Форма добавления/редактирования */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
                            <form onSubmit={addCategory} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 ml-1">Название</label>
                                    <input
                                        value={catName}
                                        onChange={e => setCatName(e.target.value)}
                                        placeholder="Название категории"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                                        required
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 ml-1">Slug</label>
                                    <input
                                        value={catSlug}
                                        onChange={e => setCatSlug(e.target.value)}
                                        placeholder="Slug (например, transport)"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 ml-1">Цвет акцента</label>
                                    <input
                                        type="color"
                                        value={catColor}
                                        onChange={e => setCatColor(e.target.value)}
                                        className="w-full h-[47px] bg-gray-50 border border-gray-200 rounded-xl cursor-pointer p-1"
                                        title="Цвет категории"
                                    />
                                </div>
                                <div className="sm:col-span-2 space-y-1.5">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 ml-1">Эмодзи иконка</label>
                                    <input
                                        value={catIcon}
                                        onChange={e => setCatIcon(e.target.value)}
                                        placeholder="Иконка (Emoji, например: 🚗)"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                                    />
                                </div>
                                <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
                                    <label className="flex-1 cursor-pointer">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={async e => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    setCatImageFile(file);
                                                    const reader = new FileReader();
                                                    reader.onload = e => setCatImagePreview(e.target?.result as string);
                                                    reader.readAsDataURL(file);
                                                }
                                            }}
                                            className="hidden"
                                        />
                                        <div className="h-[47px] px-4 py-2 bg-blue-50 border-2 border-dashed border-blue-200 rounded-xl text-sm font-bold text-blue-600 flex items-center justify-center hover:bg-blue-100/50 transition-all">
                                            {catImagePreview ? '✓ Файл готов' : '📁 Фото'}
                                        </div>
                                    </label>
                                    <div className="flex gap-2">
                                        <button
                                            type="submit"
                                            className="flex-1 sm:flex-initial px-6 py-3 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-600/20 active:scale-95 transition-all"
                                        >
                                            {editingCategory ? 'Обновить' : 'Создать'}
                                        </button>
                                        {editingCategory && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setEditingCategory(null);
                                                    setCatName('');
                                                    setCatSlug('');
                                                    setCatIcon('');
                                                    setCatColor('#667eea');
                                                    setCatImage('');
                                                    setCatImageFile(null);
                                                    setCatImagePreview('');
                                                }}
                                                className="p-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all"
                                            >
                                                <X className="h-5 w-5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </form>
                        </div>

                        {/* Список категорий - Grid вид */}
                        {viewMode === 'grid' ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                                {categories.map(cat => (
                                    <div
                                        key={cat.id}
                                        className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-xl transition-all group"
                                    >
                                        <div
                                            className="h-28 flex items-center justify-center relative"
                                            style={{
                                                background: `linear-gradient(135deg, ${cat.color || '#667eea'} 0%, ${cat.color || '#764ba2'} 100%)`
                                            }}
                                        >
                                            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-inner">
                                                {cat.image ? (
                                                    <img src={cat.image} className="w-10 h-10 object-contain drop-shadow-md" alt={cat.name} />
                                                ) : (
                                                    <span className="text-4xl drop-shadow-md">{cat.icon || '📁'}</span>
                                                )}
                                            </div>
                                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 lg:group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => startEditingCategory(cat)}
                                                    className="p-2 bg-white/90 hover:bg-white rounded-xl shadow-lg transition-all"
                                                >
                                                    <Pencil className="h-4 w-4 text-blue-600" />
                                                </button>
                                                <button
                                                    onClick={() => deleteCategory(cat.id)}
                                                    className="p-2 bg-white/90 hover:bg-white rounded-xl shadow-lg transition-all"
                                                >
                                                    <Trash2 className="h-4 w-4 text-red-600" />
                                                </button>
                                            </div>
                                            {/* Mobile Actions Overlay Trigger */}
                                            <div className="absolute bottom-2 right-2 lg:hidden">
                                                <button
                                                    onClick={() => startEditingCategory(cat)}
                                                    className="p-1.5 bg-white/50 backdrop-blur-sm rounded-lg"
                                                >
                                                    <MoreHorizontal className="h-4 w-4 text-white" />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="p-4">
                                            <h3 className="font-bold text-gray-900 mb-0.5 truncate">{cat.name}</h3>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest truncate">{cat.slug}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            /* Список категорий - Table вид */
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-x-auto">
                                <table className="w-full text-left text-sm min-w-[600px]">
                                    <thead className="bg-gray-50/50 border-b border-gray-200">
                                        <tr>
                                            <th className="px-6 py-4 font-bold text-gray-400 uppercase tracking-wider text-[10px]">Категория</th>
                                            <th className="px-6 py-4 font-bold text-gray-400 uppercase tracking-wider text-[10px]">Slug</th>
                                            <th className="px-6 py-4 font-bold text-gray-400 uppercase tracking-wider text-[10px]">Цвет</th>
                                            <th className="px-6 py-4 font-bold text-gray-400 uppercase tracking-wider text-[10px] text-right">Действия</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {categories.map(cat => (
                                            <tr key={cat.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div
                                                            className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden shadow-sm"
                                                            style={{
                                                                background: `linear-gradient(135deg, ${cat.color || '#667eea'} 0%, ${cat.color || '#764ba2'} 100%)`
                                                            }}
                                                        >
                                                            {cat.image ? (
                                                                <img src={cat.image} className="w-6 h-6 object-contain" alt={cat.name} />
                                                            ) : (
                                                                <span className="text-xl">{cat.icon || '📁'}</span>
                                                            )}
                                                        </div>
                                                        <span className="font-bold text-gray-900">{cat.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-gray-500 font-mono text-xs">{cat.slug}</td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div
                                                            className="w-6 h-6 rounded-lg border-2 border-white shadow-sm ring-1 ring-gray-200"
                                                            style={{ backgroundColor: cat.color || '#667eea' }}
                                                        />
                                                        <span className="text-xs text-gray-500 font-bold font-mono">{cat.color || '#667eea'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => startEditingCategory(cat)}
                                                            className="p-2 hover:bg-blue-50 rounded-xl text-gray-400 hover:text-blue-600 transition-all"
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => deleteCategory(cat.id)}
                                                            className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600 transition-all"
                                                            title="Удалить"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* Users View */}
                {activeTab === 'users' && (
                    viewMode === 'grid' ? (
                        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2">
                            {users.filter(u => u.full_name?.toLowerCase().includes(searchQuery.toLowerCase())).map(user => (
                                <div
                                    key={user.id}
                                    onClick={() => router.push(`/profile?id=${user.id}`)}
                                    className="bg-white rounded-lg shadow-sm border border-gray-200/50 p-1.5 hover:shadow-md transition-all cursor-pointer group"
                                >
                                    <div className="flex items-start gap-1 mb-1">
                                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-[10px] flex-shrink-0">
                                            {user.avatar_url ? (
                                                <img src={user.avatar_url} className="w-full h-full rounded-full object-cover" alt={user.full_name} />
                                            ) : (
                                                user.full_name?.charAt(0) || '?'
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-0.5 mb-0">
                                                <h3 className="font-semibold text-[10px] text-gray-900 truncate">{user.full_name || 'Без имени'}</h3>
                                                {user.is_verified && (
                                                    <ShieldCheck className="h-2 w-2 text-blue-500 flex-shrink-0" />
                                                )}
                                            </div>
                                            <p className="text-[9px] text-gray-500 truncate">{user.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-0.5">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); toggleUserVerification(user.id, user.is_verified); }}
                                            className={cn(
                                                "flex-1 py-0.5 rounded text-[9px] font-medium transition-all",
                                                user.is_verified
                                                    ? "bg-blue-50 text-blue-600 hover:bg-blue-100"
                                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                            )}
                                        >
                                            {user.is_verified ? '✓' : 'Вер.'}
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); toggleUserBan(user.id, user.is_banned); }}
                                            className={cn(
                                                "px-1.5 py-0.5 rounded text-[9px] font-medium transition-all",
                                                user.is_banned
                                                    ? "bg-red-50 text-red-600 hover:bg-red-100"
                                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                            )}
                                        >
                                            {user.is_banned ? 'Раз' : 'Бан'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-x-auto">
                            <table className="w-full text-left text-sm min-w-[700px]">
                                <thead className="bg-gray-50/50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-4 font-bold text-gray-400 uppercase tracking-wider text-[10px]">Пользователь</th>
                                        <th className="px-6 py-4 font-bold text-gray-400 uppercase tracking-wider text-[10px]">Email</th>
                                        <th className="px-6 py-4 font-bold text-gray-400 uppercase tracking-wider text-[10px]">Статус</th>
                                        <th className="px-6 py-4 font-bold text-gray-400 uppercase tracking-wider text-[10px] text-right">Действия</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {users.filter(u => u.full_name?.toLowerCase().includes(searchQuery.toLowerCase())).map(user => (
                                        <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3" onClick={() => router.push(`/profile?id=${user.id}`)}>
                                                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 overflow-hidden shadow-inner">
                                                        {user.avatar_url ? (
                                                            <img src={user.avatar_url} className="w-full h-full object-cover" alt={user.full_name} />
                                                        ) : (
                                                            user.full_name?.charAt(0) || '?'
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 cursor-pointer">
                                                        <span className="font-bold text-gray-900">{user.full_name || 'Без имени'}</span>
                                                        {user.is_verified && <ShieldCheck className="h-4 w-4 text-blue-500" />}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-gray-600 font-medium">{user.email}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex gap-2">
                                                    {user.is_verified && <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold uppercase tracking-tight">Верифицирован</span>}
                                                    {user.is_banned && <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded-lg text-[10px] font-bold uppercase tracking-tight">Забанен</span>}
                                                    {!user.is_verified && !user.is_banned && <span className="text-gray-400 text-xs">-</span>}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => toggleUserVerification(user.id, user.is_verified)}
                                                        className={cn(
                                                            "p-2 rounded-xl transition-all",
                                                            user.is_verified ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "bg-gray-100 text-gray-400 hover:text-blue-600"
                                                        )}
                                                        title={user.is_verified ? "Снять верификацию" : "Верифицировать"}
                                                    >
                                                        <ShieldCheck className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => toggleUserBan(user.id, user.is_banned)}
                                                        className={cn(
                                                            "p-2 rounded-xl transition-all",
                                                            user.is_banned ? "bg-red-600 text-white shadow-lg shadow-red-600/20" : "bg-gray-100 text-gray-400 hover:text-red-600"
                                                        )}
                                                        title={user.is_banned ? "Разбанить" : "Забанить"}
                                                    >
                                                        <Ban className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )
                )}

                {/* Cities View */}
                {activeTab === 'cities' && (
                    <div>
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 mb-6">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Управление городами</h3>
                            <form
                                onSubmit={async (e) => {
                                    e.preventDefault();
                                    if (!newCity.trim()) return;
                                    if (editingCity) {
                                        await supabase.from('cities').update({ name: newCity }).eq('id', editingCity.id);
                                        toast.success('Обновлено');
                                    } else {
                                        await supabase.from('cities').insert({ name: newCity });
                                        toast.success('Добавлено');
                                    }
                                    setNewCity('');
                                    setEditingCity(null);
                                    fetchData();
                                }}
                                className="flex flex-col sm:flex-row gap-3"
                            >
                                <div className="flex-1">
                                    <input
                                        value={newCity}
                                        onChange={e => setNewCity(e.target.value)}
                                        placeholder="Название города"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        type="submit"
                                        className="flex-1 sm:flex-initial px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 active:scale-95 transition-all"
                                    >
                                        {editingCity ? 'Сохранить' : 'Добавить город'}
                                    </button>
                                    {editingCity && (
                                        <button
                                            type="button"
                                            onClick={() => { setEditingCity(null); setNewCity(''); }}
                                            className="px-4 py-3 bg-gray-100 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-200 transition-all"
                                        >
                                            <X className="h-5 w-5" />
                                        </button>
                                    )}
                                </div>
                            </form>
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50/50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-4 font-bold text-gray-400 uppercase tracking-wider text-[10px]">Название города</th>
                                        <th className="px-6 py-4 font-bold text-gray-400 uppercase tracking-wider text-[10px] text-right">Управление</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {cities.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase())).map(city => (
                                        <tr key={city.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                                                        <MapPin className="h-4 w-4 text-blue-600" />
                                                    </div>
                                                    <span className="text-sm font-bold text-gray-900">{city.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => { setEditingCity(city); setNewCity(city.name); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                                        className="p-2 hover:bg-blue-50 rounded-xl text-gray-400 hover:text-blue-600 transition-all"
                                                        title="Редактировать"
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={async () => {
                                                            if (confirm('Удалить город?')) {
                                                                await supabase.from('cities').delete().eq('id', city.id);
                                                                toast.success('Удалено');
                                                                fetchData();
                                                            }
                                                        }}
                                                        className="p-2 hover:bg-red-50 rounded-xl text-gray-400 hover:text-red-600 transition-all"
                                                        title="Удалить"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Ads View */}
                {activeTab === 'ads' && (
                    viewMode === 'grid' ? (
                        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2">
                            {ads.map(ad => (
                                <Link
                                    key={ad.id}
                                    href={`/ad/?id=${ad.id}`}
                                    className="bg-white rounded-lg shadow-sm border border-gray-200/50 overflow-hidden hover:shadow-md transition-all group"
                                >
                                    <div className="aspect-video bg-gray-100 relative overflow-hidden">
                                        {ad.images?.[0] ? (
                                            <img src={ad.images[0]} className="w-full h-full object-cover" alt={ad.title} />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <ImageIcon className="h-4 w-4 text-gray-300" />
                                            </div>
                                        )}
                                        {ad.status === 'pending' && (
                                            <div className="absolute top-0.5 right-0.5 px-1 py-0.5 bg-yellow-500 text-white text-[9px] font-medium rounded">
                                                Мод.
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-1.5">
                                        <h3 className="font-semibold text-[10px] text-gray-900 mb-0 line-clamp-1">{ad.title}</h3>
                                        <p className="text-[9px] text-gray-500 mb-1 line-clamp-1">{ad.description}</p>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-blue-600">{Number(ad.price).toLocaleString('ru-RU')} ₽</span>
                                            <button
                                                onClick={(e) => { e.preventDefault(); deleteAd(ad.id); }}
                                                className="p-0.5 hover:bg-red-50 rounded transition-all"
                                            >
                                                <Trash2 className="h-2.5 w-2.5 text-red-600" />
                                            </button>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-x-auto">
                            <table className="w-full text-left text-sm min-w-[800px]">
                                <thead className="bg-gray-50/50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-4 font-bold text-gray-400 uppercase tracking-wider text-[10px]">Объявление</th>
                                        <th className="px-6 py-4 font-bold text-gray-400 uppercase tracking-wider text-[10px]">Цена</th>
                                        <th className="px-6 py-4 font-bold text-gray-400 uppercase tracking-wider text-[10px]">Статус</th>
                                        <th className="px-6 py-4 font-bold text-gray-400 uppercase tracking-wider text-[10px] text-right">Действия</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {ads.map(ad => (
                                        <tr key={ad.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0 shadow-inner">
                                                        {ad.images?.[0] ? (
                                                            <img src={ad.images[0]} className="w-full h-full object-cover" alt={ad.title} />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center">
                                                                <ImageIcon className="h-5 w-5 text-gray-300" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <Link href={`/ad/?id=${ad.id}`} className="font-bold text-gray-900 hover:text-blue-600 transition-colors line-clamp-1 block">
                                                            {ad.title}
                                                        </Link>
                                                        <p className="text-xs text-gray-500 line-clamp-1">{ad.description}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-bold text-gray-900 whitespace-nowrap">
                                                {Number(ad.price).toLocaleString('ru-RU')} ₽
                                            </td>
                                            <td className="px-6 py-4">
                                                {ad.status === 'pending' ? (
                                                    <span className="px-2 py-1 bg-yellow-50 text-yellow-600 rounded-lg text-[10px] font-bold uppercase tracking-tight whitespace-nowrap">Модерация</span>
                                                ) : (
                                                    <span className="px-2 py-1 bg-green-50 text-green-600 rounded-lg text-[10px] font-bold uppercase tracking-tight whitespace-nowrap">Активно</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => deleteAd(ad.id)}
                                                        className="p-2 hover:bg-red-50 rounded-xl text-gray-400 hover:text-red-600 transition-all"
                                                        title="Удалить"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )
                )}

                {activeTab === 'banners' && (
                    <div className="space-y-6">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 mb-6">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Настройка баннера</h3>
                            <form
                                onSubmit={async (e) => {
                                    e.preventDefault();
                                    if (!bannerTitle.trim()) return toast.error('Введите заголовок');

                                    let imageUrl = bannerImage;
                                    if (bannerImageFile) {
                                        const compressed = await compressImage(bannerImageFile, 1200, 0.9);
                                        const fileName = `banner-${Date.now()}.jpg`;
                                        const { data: uploadData, error: uploadError } = await supabase.storage
                                            .from('images')
                                            .upload(fileName, compressed);
                                        if (uploadError) return toast.error('Ошибка загрузки');
                                        const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(fileName);
                                        imageUrl = publicUrl;
                                    }

                                    if (editingBanner) {
                                        await supabase.from('banners').update({
                                            title: bannerTitle,
                                            content: bannerContent,
                                            image: imageUrl,
                                            link: bannerLink
                                        }).eq('id', editingBanner.id);
                                        toast.success('Обновлено');
                                    } else {
                                        await supabase.from('banners').insert({
                                            title: bannerTitle,
                                            content: bannerContent,
                                            image: imageUrl,
                                            link: bannerLink
                                        });
                                        toast.success('Добавлено');
                                    }
                                    setBannerTitle('');
                                    setBannerContent('');
                                    setBannerImage('');
                                    setBannerImageFile(null);
                                    setBannerImagePreview('');
                                    setBannerLink('');
                                    setEditingBanner(null);
                                    fetchData();
                                }}
                                className="space-y-4"
                            >
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 ml-1">Заголовок</label>
                                        <input
                                            value={bannerTitle}
                                            onChange={e => setBannerTitle(e.target.value)}
                                            placeholder="Короткий заголовок"
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 ml-1">Ссылка</label>
                                        <input
                                            value={bannerLink}
                                            onChange={e => setBannerLink(e.target.value)}
                                            placeholder="https://..."
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 ml-1">Описание акции / текст</label>
                                    <textarea
                                        value={bannerContent}
                                        onChange={e => setBannerContent(e.target.value)}
                                        placeholder="Основной текст баннера..."
                                        rows={2}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all resize-none"
                                    />
                                </div>
                                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
                                    <label className="flex-1 w-full cursor-pointer group">
                                        <input
                                            type="file"
                                            className="hidden"
                                            accept="image/*"
                                            onChange={e => {
                                                if (e.target.files?.[0]) {
                                                    setBannerImageFile(e.target.files[0]);
                                                    setBannerImagePreview(URL.createObjectURL(e.target.files[0]));
                                                }
                                            }}
                                        />
                                        <div className={cn(
                                            "h-[120px] w-full border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-2 transition-all overflow-hidden relative",
                                            bannerImagePreview ? "border-blue-300 bg-blue-50/20" : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
                                        )}>
                                            {bannerImagePreview ? (
                                                <div className="absolute inset-0">
                                                    <img src={bannerImagePreview} className="w-full h-full object-cover" alt="Preview" />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                        <span className="text-white text-xs font-bold uppercase tracking-widest">Заменить фото</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <ImageIcon className="h-8 w-8 text-gray-300 group-hover:text-blue-400 transition-colors" />
                                                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 group-hover:text-blue-500">Загрузить картинку</span>
                                                </>
                                            )}
                                        </div>
                                    </label>
                                    <div className="flex gap-2 w-full sm:w-auto">
                                        <button
                                            type="submit"
                                            className="flex-1 sm:min-w-[160px] bg-blue-600 text-white px-6 py-4 rounded-2xl text-sm font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 active:scale-95 transition-all"
                                        >
                                            {editingBanner ? 'Обновить' : 'Создать баннер'}
                                        </button>
                                        {editingBanner && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setEditingBanner(null);
                                                    setBannerTitle('');
                                                    setBannerContent('');
                                                    setBannerImage('');
                                                    setBannerImageFile(null);
                                                    setBannerImagePreview('');
                                                    setBannerLink('');
                                                }}
                                                className="p-4 bg-gray-100 text-gray-700 rounded-2xl hover:bg-gray-200 transition-all"
                                            >
                                                <X className="h-5 w-5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </form>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {banners.map(banner => (
                                <div key={banner.id} className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-xl transition-all group">
                                    <div className="aspect-[21/9] bg-gray-100 relative overflow-hidden">
                                        {banner.image ? (
                                            <img src={banner.image} className="w-full h-full object-cover" alt={banner.title} />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center border-b border-gray-100">
                                                <ImageIcon className="h-10 w-10 text-gray-200" />
                                            </div>
                                        )}
                                        <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-y-1 group-hover:translate-y-0">
                                            <button
                                                onClick={() => {
                                                    setEditingBanner(banner);
                                                    setBannerTitle(banner.title);
                                                    setBannerContent(banner.content || '');
                                                    setBannerImage(banner.image || '');
                                                    setBannerImagePreview(banner.image || '');
                                                    setBannerLink(banner.link || '');
                                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                                }}
                                                className="p-2.5 bg-white/95 backdrop-blur-md hover:bg-white rounded-xl shadow-lg transition-all"
                                            >
                                                <Pencil className="h-4 w-4 text-blue-600" />
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    if (confirm('Удалить баннер?')) {
                                                        await supabase.from('banners').delete().eq('id', banner.id);
                                                        toast.success('Удалено');
                                                        fetchData();
                                                    }
                                                }}
                                                className="p-2.5 bg-white/95 backdrop-blur-md hover:bg-red-50 rounded-xl shadow-lg transition-all"
                                            >
                                                <Trash2 className="h-4 w-4 text-red-600" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="p-5">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">BANNER</span>
                                            {banner.link && <span className="text-[10px] font-bold text-gray-400">🔗 Link Active</span>}
                                        </div>
                                        <h3 className="font-bold text-lg text-gray-900 mb-1 truncate">{banner.title}</h3>
                                        <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed mb-4">{banner.content}</p>

                                        <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                                            <div className="flex -space-x-2">
                                                <div className="w-8 h-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center">
                                                    <Clock className="h-3 w-3 text-gray-400" />
                                                </div>
                                            </div>
                                            <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">{new Date(banner.created_at || Date.now()).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'reports' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {reports.map(report => (
                                <div key={report.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-all">
                                    <div className="flex items-start gap-3 mb-3">
                                        <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                                            <Flag className="h-5 w-5 text-red-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-[10px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded-full uppercase tracking-wider">Жалоба</span>
                                                <span className="text-[10px] font-bold text-gray-400">#{report.id.substring(0, 6)}</span>
                                            </div>
                                            <h3 className="font-bold text-sm text-gray-900 mb-1">На: {report.ad?.title || 'Удалено'}</h3>
                                            <p className="text-xs text-gray-600 italic line-clamp-3 bg-gray-50 p-2 rounded-lg border border-gray-100">"{report.reason}"</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500">
                                                {report.reporter?.full_name?.charAt(0) || '?'}
                                            </div>
                                            <span className="text-xs text-gray-500 truncate font-medium">{report.reporter?.full_name || 'Аноним'}</span>
                                        </div>
                                        <div className="flex gap-2 flex-shrink-0 ml-2">
                                            <button
                                                onClick={() => deleteAd(report.ad_id)}
                                                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[10px] font-bold transition-all shadow-sm"
                                            >
                                                Удалить
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    await supabase.from('reports').delete().eq('id', report.id);
                                                    toast.success('Отклонена');
                                                    fetchData();
                                                }}
                                                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-[10px] font-bold transition-all"
                                            >
                                                Отклонить
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {reports.length === 0 && (
                                <div className="col-span-full text-center py-20 bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-200 text-gray-400 text-sm font-medium">
                                    Жалоб пока нет
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Reviews View */}
                {
                    activeTab === 'reviews' && (
                        <div className="space-y-4">
                            <div className="hidden lg:block bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50/50 border-b border-gray-200">
                                        <tr>
                                            <th className="px-6 py-4 font-bold text-gray-400 uppercase tracking-wider text-[10px]">Автор</th>
                                            <th className="px-6 py-4 font-bold text-gray-400 uppercase tracking-wider text-[10px]">Рейтинг</th>
                                            <th className="px-6 py-4 font-bold text-gray-400 uppercase tracking-wider text-[10px]">Отзыв</th>
                                            <th className="px-6 py-4 font-bold text-gray-400 uppercase tracking-wider text-[10px]">Дата</th>
                                            <th className="px-6 py-4 font-bold text-gray-400 uppercase tracking-wider text-[10px] text-right">Действия</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {reviews.map(review => (
                                            <tr key={review.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-sm flex-shrink-0 shadow-inner">
                                                            {review.reviewer?.full_name?.charAt(0) || '?'}
                                                        </div>
                                                        <span className="font-bold text-gray-900">{review.reviewer?.full_name || 'Аноним'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex gap-0.5">
                                                        {[...Array(5)].map((_, i) => (
                                                            <Star
                                                                key={i}
                                                                className={cn(
                                                                    "h-3.5 w-3.5",
                                                                    i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-200"
                                                                )}
                                                            />
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-sm text-gray-600 italic line-clamp-2 max-w-xs leading-relaxed">{review.comment}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-tight">
                                                        {new Date(review.created_at).toLocaleDateString()}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button
                                                        onClick={async () => {
                                                            if (confirm('Удалить отзыв?')) {
                                                                await supabase.from('reviews').delete().eq('id', review.id);
                                                                toast.success('Удалено');
                                                                fetchData();
                                                            }
                                                        }}
                                                        className="p-2 hover:bg-red-50 rounded-xl text-gray-400 hover:text-red-600 transition-colors"
                                                        title="Удалить"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Reviews View */}
                            <div className="lg:hidden grid grid-cols-1 gap-4">
                                {reviews.map(review => (
                                    <div key={review.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-sm shadow-inner">
                                                    {review.reviewer?.full_name?.charAt(0) || '?'}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-sm text-gray-900">{review.reviewer?.full_name || 'Аноним'}</h4>
                                                    <div className="flex gap-0.5">
                                                        {[...Array(5)].map((_, i) => (
                                                            <Star
                                                                key={i}
                                                                className={cn(
                                                                    "h-3 w-3",
                                                                    i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-200"
                                                                )}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={async () => {
                                                    if (confirm('Удалить отзыв?')) {
                                                        await supabase.from('reviews').delete().eq('id', review.id);
                                                        toast.success('Удалено');
                                                        fetchData();
                                                    }
                                                }}
                                                className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                        <p className="text-sm text-gray-600 italic bg-gray-50 p-3 rounded-xl border border-gray-100 leading-relaxed">
                                            "{review.comment}"
                                        </p>
                                        <div className="mt-3 flex justify-end">
                                            <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">
                                                {new Date(review.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                }

                {/* Settings View */}
                {
                    activeTab === 'settings' && (
                        <div className="max-w-2xl space-y-6">
                            {/* Telegram Notifications Block */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                                    <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                                        <Bot className="h-4 w-4 text-blue-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900 text-sm">Telegram уведомления</h3>
                                        <p className="text-xs text-gray-500">Персональные настройки для каждого администратора</p>
                                    </div>
                                </div>

                                <div className="p-6 space-y-5">
                                    {/* Chat ID */}
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">Telegram Chat ID</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={tgChatId}
                                                onChange={e => setTgChatId(e.target.value)}
                                                placeholder="Например: 977966870 или -100123456789"
                                                className="flex-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                            />
                                            <button
                                                onClick={testTelegramNotification}
                                                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-all flex items-center gap-2"
                                            >
                                                <Send className="h-3.5 w-3.5" />
                                                Тест
                                            </button>
                                        </div>
                                        <p className="text-xs text-gray-400 mt-1.5">
                                            Чтобы узнать ваш ID или ID группы — напишите боту <span className="font-mono bg-gray-100 px-1 rounded">@userinfobot</span> в Telegram.
                                            Для группы добавьте бота в группу и перешлите сообщение из неё боту.
                                        </p>
                                    </div>

                                    {/* Notification types */}
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Типы уведомлений</label>
                                        <div className="space-y-2">
                                            <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
                                                <input
                                                    type="checkbox"
                                                    checked={tgNotifyNewAds}
                                                    onChange={e => setTgNotifyNewAds(e.target.checked)}
                                                    className="w-4 h-4 text-blue-600 rounded"
                                                />
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900">Новые объявления</p>
                                                    <p className="text-xs text-gray-500">Уведомление при каждом новом объявлении со статусом «на модерации»</p>
                                                </div>
                                            </label>
                                            <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
                                                <input
                                                    type="checkbox"
                                                    checked={tgNotifyNewUsers}
                                                    onChange={e => setTgNotifyNewUsers(e.target.checked)}
                                                    className="w-4 h-4 text-blue-600 rounded"
                                                />
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900">Новые пользователи</p>
                                                    <p className="text-xs text-gray-500">Уведомление при регистрации нового пользователя</p>
                                                </div>
                                            </label>
                                        </div>
                                    </div>

                                    {/* Save */}
                                    <button
                                        onClick={saveTelegramSettings}
                                        disabled={tgSaving}
                                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                                    >
                                        {tgSaving ? (
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                <Settings className="h-4 w-4" />
                                                Сохранить настройки
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Instructions */}
                            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                                <h4 className="text-sm font-semibold text-blue-900 mb-2">📖 Как настроить Telegram-бота</h4>
                                <ol className="text-xs text-blue-800 space-y-1.5 list-decimal pl-4">
                                    <li>Найдите вашего бота в Telegram — токен задан в переменной <span className="font-mono bg-blue-100 px-1 rounded">TELEGRAM_BOT_TOKEN</span></li>
                                    <li>Напишите боту <span className="font-mono bg-blue-100 px-1 rounded">/start</span>, чтобы активировать чат</li>
                                    <li>Для группы: сделайте бота администратором группы</li>
                                    <li>Узнайте Chat ID через <span className="font-mono bg-blue-100 px-1 rounded">@userinfobot</span></li>
                                    <li>Введите ID выше и нажмите «Тест» для проверки</li>
                                </ol>
                            </div>
                        </div>
                    )
                }
            </div>
        </div>
    );
}

