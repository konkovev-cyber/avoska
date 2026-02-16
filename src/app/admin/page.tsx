'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import {
    Package, Users, MapPin, Settings, Trash2, CheckCircle, CheckCircle2,
    ShieldCheck, Ban, Pencil, Upload, X, Image as ImageIcon, Star,
    LayoutGrid, MessageSquare, Flag, Search, Bell, LogOut, Clock,
    User, ChevronRight, MoreHorizontal, Filter, Grid3x3, List
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { compressImage } from '@/lib/image-utils';

export default function AdminDashboard() {
    const [isAdmin, setIsAdmin] = useState(false);
    const [activeTab, setActiveTab] = useState<'ads' | 'users' | 'cities' | 'banners' | 'reports' | 'categories' | 'reviews'>('ads');
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
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
    const router = useRouter();

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

        setIsAdmin(true);
        await fetchData();
        setLoading(false);
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

        setAds(adsRes.data || []);
        setUsers(usersRes.data || []);
        setCities(citiesRes.data || []);
        setReports(reportsRes.data || []);
        setBanners(bannersRes.data || []);
        setCategories(categoriesRes.data || []);
        setReviews(reviewsRes.data || []);

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
            {/* macOS-style Sidebar */}
            <div className="fixed left-0 top-0 h-full w-64 bg-white/80 backdrop-blur-xl border-r border-gray-200/50 shadow-sm z-50">
                <div className="p-6">
                    <h1 className="text-xl font-semibold text-gray-900 mb-1">Admin Console</h1>
                    <p className="text-xs text-gray-500">Авоська Админ</p>
                </div>

                <nav className="px-3 space-y-1">
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
                            onClick={() => setActiveTab(tab.id as any)}
                            className={cn(
                                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                                activeTab === tab.id
                                    ? "bg-blue-50 text-blue-600"
                                    : "text-gray-700 hover:bg-gray-50"
                            )}
                        >
                            <tab.icon className="h-4 w-4" />
                            <span className="flex-1 text-left">{tab.label}</span>
                            <span className={cn(
                                "text-xs px-2 py-0.5 rounded-full",
                                activeTab === tab.id ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
                            )}>
                                {tab.count}
                            </span>
                        </button>
                    ))}
                </nav>
            </div>

            {/* Main Content */}
            <main className="ml-12 min-h-screen p-4">
                {/* Header */}
                <div className="mb-4 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">
                            {activeTab === 'categories' && 'Категории'}
                            {activeTab === 'ads' && 'Объявления'}
                            {activeTab === 'users' && 'Пользователи'}
                            {activeTab === 'cities' && 'Города'}
                            {activeTab === 'banners' && 'Баннеры'}
                            {activeTab === 'reports' && 'Жалобы'}
                            {activeTab === 'reviews' && 'Отзывы'}
                        </h2>
                        <p className="text-xs text-gray-500 mt-0.5">
                            {activeTab === 'categories' && 'Управление категориями объявлений'}
                            {activeTab === 'users' && 'Управление пользователями'}
                            {activeTab === 'cities' && 'Управление городами'}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative w-48">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                            <input
                                type="text"
                                placeholder="Поиск..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            />
                        </div>
                        <div className="flex bg-white border border-gray-200 rounded-lg p-0.5">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={cn(
                                    "p-1.5 rounded transition-all",
                                    viewMode === 'grid' ? "bg-blue-50 text-blue-600" : "text-gray-400 hover:text-gray-600"
                                )}
                            >
                                <Grid3x3 className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => setViewMode('table')}
                                className={cn(
                                    "p-1.5 rounded transition-all",
                                    viewMode === 'table' ? "bg-blue-50 text-blue-600" : "text-gray-400 hover:text-gray-600"
                                )}
                            >
                                <List className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Categories View */}
                {activeTab === 'categories' && (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-4 py-3 font-medium text-gray-500">Название</th>
                                    <th className="px-4 py-3 font-medium text-gray-500">Slug</th>
                                    <th className="px-4 py-3 font-medium text-gray-500">Действия</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {categories.map(cat => (
                                    <tr key={cat.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-4 py-2">
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden"
                                                    style={{
                                                        background: `linear-gradient(135deg, ${cat.color || '#667eea'} 0%, ${cat.color || '#764ba2'} 100%)`
                                                    }}
                                                >
                                                    {cat.image ? (
                                                        <img src={cat.image} className="w-5 h-5 object-contain" alt={cat.name} />
                                                    ) : (
                                                        <LayoutGrid className="h-4 w-4 text-white" />
                                                    )}
                                                </div>
                                                <span className="font-medium text-gray-900">{cat.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-2 text-gray-500 font-mono text-xs">{cat.slug}</td>
                                        <td className="px-4 py-2">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => startEditingCategory(cat)}
                                                    className="p-1.5 hover:bg-gray-100 rounded text-gray-500 hover:text-blue-600 transition-colors"
                                                    title="Редактировать"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => deleteCategory(cat.id)}
                                                    className="p-1.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-600 transition-colors"
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
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-4 py-3 font-medium text-gray-500">Пользователь</th>
                                        <th className="px-4 py-3 font-medium text-gray-500">Email</th>
                                        <th className="px-4 py-3 font-medium text-gray-500">Статус</th>
                                        <th className="px-4 py-3 font-medium text-gray-500 text-right">Действия</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {users.filter(u => u.full_name?.toLowerCase().includes(searchQuery.toLowerCase())).map(user => (
                                        <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-4 py-2">
                                                <div className="flex items-center gap-2" onClick={() => router.push(`/profile?id=${user.id}`)}>
                                                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 overflow-hidden">
                                                        {user.avatar_url ? (
                                                            <img src={user.avatar_url} className="w-full h-full object-cover" alt={user.full_name} />
                                                        ) : (
                                                            user.full_name?.charAt(0) || '?'
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1 cursor-pointer">
                                                        <span className="font-medium text-gray-900">{user.full_name || 'Без имени'}</span>
                                                        {user.is_verified && <ShieldCheck className="h-3 w-3 text-blue-500" />}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-2 text-gray-600">{user.email}</td>
                                            <td className="px-4 py-2">
                                                <div className="flex gap-2">
                                                    {user.is_verified && <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs">Верифицирован</span>}
                                                    {user.is_banned && <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded text-xs">Забанен</span>}
                                                    {!user.is_verified && !user.is_banned && <span className="text-gray-400 text-xs">-</span>}
                                                </div>
                                            </td>
                                            <td className="px-4 py-2 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => toggleUserVerification(user.id, user.is_verified)}
                                                        className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-blue-600 transition-colors"
                                                        title={user.is_verified ? "Снять верификацию" : "Верифицировать"}
                                                    >
                                                        <ShieldCheck className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => toggleUserBan(user.id, user.is_banned)}
                                                        className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-red-600 transition-colors"
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
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200/50 p-4 mb-4">
                            <h3 className="font-semibold text-sm text-gray-900 mb-3">Добавить город</h3>
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
                                className="flex gap-2"
                            >
                                <input
                                    value={newCity}
                                    onChange={e => setNewCity(e.target.value)}
                                    placeholder="Название города"
                                    className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all"
                                />
                                <button
                                    type="submit"
                                    className="px-4 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-all active:scale-95"
                                >
                                    {editingCity ? 'Сохранить' : 'Добавить'}
                                </button>
                                {editingCity && (
                                    <button
                                        type="button"
                                        onClick={() => { setEditingCity(null); setNewCity(''); }}
                                        className="px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm font-medium transition-all"
                                    >
                                        Отмена
                                    </button>
                                )}
                            </form>
                        </div>
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                            <table className="w-full text-left text-base">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-4 py-3 font-medium text-gray-500">Город</th>
                                        <th className="px-4 py-3 font-medium text-gray-500">Действия</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {cities.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase())).map(city => (
                                        <tr key={city.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-4 py-3">
                                                <span className="text-sm font-medium text-gray-900">{city.name}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => { setEditingCity(city); setNewCity(city.name); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                                        className="p-2 hover:bg-gray-100 rounded text-gray-500 hover:text-blue-600 transition-colors"
                                                        title="Редактировать"
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={async () => {
                                                            if (confirm('Удалить?')) {
                                                                await supabase.from('cities').delete().eq('id', city.id);
                                                                toast.success('Удалено');
                                                                fetchData();
                                                            }
                                                        }}
                                                        className="p-2 hover:bg-red-50 rounded text-gray-400 hover:text-red-600 transition-colors"
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
                                    href={`/ad?id=${ad.id}`}
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
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-4 py-3 font-medium text-gray-500">Объявление</th>
                                        <th className="px-4 py-3 font-medium text-gray-500">Цена</th>
                                        <th className="px-4 py-3 font-medium text-gray-500">Действия</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {ads.map(ad => (
                                        <tr key={ad.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-4 py-2">
                                                <Link href={`/ad?id=${ad.id}`} className="font-medium text-gray-900 hover:text-blue-600 transition-colors line-clamp-1 block">
                                                    {ad.title}
                                                </Link>
                                                <p className="text-xs text-gray-500 line-clamp-1">{ad.description}</p>
                                            </td>
                                            <td className="px-4 py-2 font-medium text-gray-900 whitespace-nowrap">
                                                {Number(ad.price).toLocaleString('ru-RU')} ₽
                                            </td>
                                            <td className="px-4 py-2">
                                                <div className="flex items-center gap-2">
                                                    {ad.status === 'pending' ? (
                                                        <span className="px-2 py-0.5 bg-yellow-50 text-yellow-600 rounded text-xs whitespace-nowrap">На модерации</span>
                                                    ) : (
                                                        <span className="px-2 py-0.5 bg-green-50 text-green-600 rounded text-xs whitespace-nowrap">Активно</span>
                                                    )}
                                                    <button
                                                        onClick={() => deleteAd(ad.id)}
                                                        className="p-1.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-600 transition-colors"
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

                {/* Banners View */}
                {activeTab === 'banners' && (
                    <div>
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200/50 p-4 mb-4">
                            <h3 className="font-semibold text-sm text-gray-900 mb-3">Добавить баннер</h3>
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
                                className="space-y-3"
                            >
                                <div className="grid grid-cols-2 gap-3">
                                    <input
                                        value={bannerTitle}
                                        onChange={e => setBannerTitle(e.target.value)}
                                        placeholder="Заголовок"
                                        className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all"
                                    />
                                    <input
                                        value={bannerLink}
                                        onChange={e => setBannerLink(e.target.value)}
                                        placeholder="Ссылка"
                                        className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all"
                                    />
                                </div>
                                <textarea
                                    value={bannerContent}
                                    onChange={e => setBannerContent(e.target.value)}
                                    placeholder="Описание"
                                    rows={2}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all resize-none"
                                />
                                <label className="block w-full h-24 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 transition-all relative overflow-hidden group">
                                    {bannerImagePreview ? (
                                        <>
                                            <img src={bannerImagePreview} className="w-full h-full object-cover" alt="Preview" />
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <span className="text-white text-xs font-medium">Изменить</span>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                            <ImageIcon className="h-6 w-6 mb-1" />
                                            <span className="text-xs font-medium">Загрузить изображение</span>
                                        </div>
                                    )}
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
                                </label>
                                <div className="flex gap-2">
                                    <button
                                        type="submit"
                                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium transition-all active:scale-95"
                                    >
                                        {editingBanner ? 'Сохранить' : 'Добавить'}
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
                                            className="px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-all"
                                        >
                                            Отмена
                                        </button>
                                    )}
                                </div>
                            </form>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                            {banners.map(banner => (
                                <div key={banner.id} className="bg-white rounded-lg shadow-sm border border-gray-200/50 overflow-hidden hover:shadow-md transition-all group">
                                    {banner.image && (
                                        <div className="aspect-video bg-gray-100 relative overflow-hidden">
                                            <img src={banner.image} className="w-full h-full object-cover" alt={banner.title} />
                                        </div>
                                    )}
                                    <div className="p-2">
                                        <h3 className="font-semibold text-xs text-gray-900 mb-0.5 truncate">{banner.title}</h3>
                                        <p className="text-[10px] text-gray-500 mb-1 line-clamp-2">{banner.content}</p>
                                        <div className="flex items-center justify-between">
                                            {banner.link && (
                                                <a href={banner.link} target="_blank" className="text-[10px] text-blue-600 hover:underline truncate">
                                                    {banner.link}
                                                </a>
                                            )}
                                            <div className="flex gap-1 ml-auto">
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
                                                    className="p-1 hover:bg-gray-100 rounded transition-all"
                                                >
                                                    <Pencil className="h-2.5 w-2.5 text-gray-600" />
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        if (confirm('Удалить?')) {
                                                            await supabase.from('banners').delete().eq('id', banner.id);
                                                            toast.success('Удалено');
                                                            fetchData();
                                                        }
                                                    }}
                                                    className="p-1 hover:bg-red-50 rounded transition-all"
                                                >
                                                    <Trash2 className="h-2.5 w-2.5 text-red-600" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Reports View */}
                {activeTab === 'reports' && (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                        {reports.map(report => (
                            <div key={report.id} className="bg-white rounded-lg shadow-sm border border-gray-200/50 p-2 hover:shadow-md transition-all">
                                <div className="flex items-start gap-1.5 mb-1.5">
                                    <div className="w-6 h-6 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                                        <Flag className="h-3 w-3 text-red-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1 mb-0.5">
                                            <span className="text-[10px] font-semibold text-red-600 bg-red-50 px-1 py-0.5 rounded">Жалоба</span>
                                            <span className="text-[10px] text-gray-400">#{report.id.substring(0, 6)}</span>
                                        </div>
                                        <h3 className="font-medium text-xs text-gray-900 mb-0.5 truncate">На: {report.ad?.title || 'Удалено'}</h3>
                                        <p className="text-[10px] text-gray-600 italic line-clamp-2">"{report.reason}"</p>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between pt-1.5 border-t border-gray-100">
                                    <span className="text-[10px] text-gray-500 truncate">От: {report.reporter?.full_name || 'Аноним'}</span>
                                    <div className="flex gap-1 flex-shrink-0 ml-1.5">
                                        <button
                                            onClick={() => deleteAd(report.ad_id)}
                                            className="px-1.5 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] font-medium transition-all"
                                        >
                                            Удалить
                                        </button>
                                        <button
                                            onClick={async () => {
                                                await supabase.from('reports').delete().eq('id', report.id);
                                                toast.success('Отклонена');
                                                fetchData();
                                            }}
                                            className="px-1.5 py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-[10px] font-medium transition-all"
                                        >
                                            Отклонить
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {reports.length === 0 && (
                            <div className="col-span-full text-center py-12 text-gray-400 text-sm">
                                Нет жалоб
                            </div>
                        )}
                    </div>
                )}

                {/* Reviews View */}
                {activeTab === 'reviews' && (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                        <table className="w-full text-left text-base">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-4 py-3 font-medium text-gray-500">Пользователь</th>
                                    <th className="px-4 py-3 font-medium text-gray-500">Рейтинг</th>
                                    <th className="px-4 py-3 font-medium text-gray-500">Отзыв</th>
                                    <th className="px-4 py-3 font-medium text-gray-500">Дата</th>
                                    <th className="px-4 py-3 font-medium text-gray-500">Действия</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {reviews.map(review => (
                                    <tr key={review.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-sm flex-shrink-0">
                                                    {review.reviewer?.full_name?.charAt(0) || '?'}
                                                </div>
                                                <span className="text-sm font-medium text-gray-900">{review.reviewer?.full_name || 'Аноним'}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-0.5">
                                                {[...Array(5)].map((_, i) => (
                                                    <Star
                                                        key={i}
                                                        className={cn(
                                                            "h-4 w-4",
                                                            i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-200"
                                                        )}
                                                    />
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-sm text-gray-600 italic">{review.comment}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-sm text-gray-400">
                                                {new Date(review.created_at).toLocaleDateString()}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <button
                                                onClick={async () => {
                                                    if (confirm('Удалить?')) {
                                                        await supabase.from('reviews').delete().eq('id', review.id);
                                                        toast.success('Удалено');
                                                        fetchData();
                                                    }
                                                }}
                                                className="p-2 hover:bg-red-50 rounded text-gray-400 hover:text-red-600 transition-colors"
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
                )}
            </main>
        </div>
    );
}
