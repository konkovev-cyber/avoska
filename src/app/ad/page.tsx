'use client';

import { useEffect, useState, Suspense } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    Heart,
    Share2,
    ShieldCheck,
    Star,
    AlertCircle,
    CheckCircle,
    XCircle,
    User,
    MapPin,
    Truck,
    Info,
    ChevronLeft,
    ChevronRight,
    MessageCircle,
    X,
    Maximize2
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import Link from 'next/link';

function AdContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const id = searchParams.get('id');

    const [isAdmin, setIsAdmin] = useState(false);
    const [ad, setAd] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isFavorite, setIsFavorite] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isZoomed, setIsZoomed] = useState(false);

    useEffect(() => {
        if (id) {
            fetchAd();
            checkFavorite();
            checkAdminStatus();
        } else {
            setLoading(false);
        }
    }, [id]);

    const checkAdminStatus = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
        const ADMIN_EMAILS = ['ht-elk@yandex.ru', 'dron-vbg@yandex.ru', 'konkev@bk.ru'];

        if (profile?.role === 'admin' || ADMIN_EMAILS.includes(session.user.email || '')) {
            setIsAdmin(true);
        }
    };

    const fetchAd = async () => {
        if (!id) return;
        const { data, error } = await supabase
            .from('ads')
            .select(`
                *,
                profiles:user_id (
                    id,
                    full_name,
                    rating,
                    created_at,
                    avatar_url,
                    is_verified
                ),
                category:category_id (
                    name,
                    slug
                )
            `)
            .eq('id', id)
            .single();

        if (error) {
            toast.error('Объявление не найдено');
            router.push('/');
            return;
        }
        setAd(data);
        setLoading(false);
    };

    const updateStatus = async (status: string) => {
        const { error } = await supabase.from('ads').update({ status }).eq('id', id);
        if (!error) {
            toast.success(status === 'active' ? 'Одобрено' : 'Отклонено');
            fetchAd();
        }
    };

    const checkFavorite = async () => {
        if (!id) return;
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data } = await supabase
            .from('favorites')
            .select('id')
            .eq('user_id', session.user.id)
            .eq('ad_id', id)
            .single();

        setIsFavorite(!!data);
    };

    const toggleFavorite = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            toast.error('Войдите в аккаунт');
            return router.push('/login');
        }

        if (isFavorite) {
            await supabase.from('favorites').delete().eq('user_id', session.user.id).eq('ad_id', id);
            setIsFavorite(false);
            toast.success('Удалено из избранного');
        } else {
            await supabase.from('favorites').insert({ user_id: session.user.id, ad_id: id });
            setIsFavorite(true);
            toast.success('Добавлено в избранное');
        }
    };

    const handleShare = () => {
        if (navigator.share) {
            navigator.share({
                title: ad?.title,
                text: ad?.description,
                url: window.location.href,
            }).catch(console.error);
        } else {
            navigator.clipboard.writeText(window.location.href);
            toast.success('Ссылка скопирована');
        }
    };

    if (loading) return <div className="p-20 text-center">Загрузка...</div>;
    if (!ad) return <div className="p-20 text-center">Объявление не найдено</div>;

    return (
        <div className="bg-background min-h-screen">
            {/* Mobile Header Overlay */}
            <div className="lg:hidden sticky top-0 z-[60] bg-background/80 backdrop-blur-md border-b border-border px-4 py-2 flex items-center justify-between">
                <button onClick={() => router.back()} className="p-2 hover:bg-surface rounded-full">
                    <ChevronLeft className="h-6 w-6" />
                </button>
                <div className="flex items-center gap-2">
                    <button onClick={handleShare} className="p-2 hover:bg-surface rounded-full">
                        <Share2 className="h-5 w-5" />
                    </button>
                    <button onClick={toggleFavorite} className="p-2 hover:bg-surface rounded-full">
                        <Heart className={cn("h-5 w-5", isFavorite && "fill-red-500 text-red-500")} />
                    </button>
                </div>
            </div>

            <div className="container mx-auto px-4 py-4 lg:py-8 max-w-5xl">
                {/* Image Zoom Modal */}
                {isZoomed && (
                    <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 md:p-10 transition-all animate-in fade-in duration-300 pointer-events-auto">
                        <button onClick={() => setIsZoomed(false)} className="absolute top-6 right-6 text-white hover:bg-white/10 p-3 rounded-full transition-colors z-[110]">
                            <X className="h-8 w-8" />
                        </button>
                        <img
                            src={ad.images[currentImageIndex]}
                            className="max-w-full max-h-full object-contain shadow-2xl rounded-lg"
                            alt={ad.title}
                        />
                    </div>
                )}

                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Left Column: Images & Primary Info */}
                    <div className="flex-1 min-w-0 space-y-6">
                        {/* Main Image Slider */}
                        <div className="relative aspect-square lg:aspect-[4/3] bg-surface rounded-3xl border border-border overflow-hidden shadow-sm group">
                            {ad.images && ad.images.length > 0 ? (
                                <img
                                    src={ad.images[currentImageIndex]}
                                    className="w-full h-full object-cover cursor-zoom-in"
                                    alt={ad.title}
                                    onClick={() => setIsZoomed(true)}
                                />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-muted gap-2">
                                    <Info className="h-10 w-10 opacity-20" />
                                    <span>Нет фотографий</span>
                                </div>
                            )}

                            {/* Arrows for multi-images */}
                            {ad.images.length > 1 && (
                                <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 flex justify-between pointer-events-none">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(prev => (prev === 0 ? ad.images.length - 1 : prev - 1)); }}
                                        className="p-2 bg-background/80 backdrop-blur-md rounded-full shadow-md pointer-events-auto hover:bg-surface transition-all active:scale-95"
                                    >
                                        <ChevronLeft className="h-5 w-5 text-foreground" />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(prev => (prev === ad.images.length - 1 ? 0 : prev + 1)); }}
                                        className="p-2 bg-background/80 backdrop-blur-md rounded-full shadow-md pointer-events-auto hover:bg-surface transition-all active:scale-95"
                                    >
                                        <ChevronRight className="h-5 w-5 text-foreground" />
                                    </button>
                                </div>
                            )}

                            {/* Image Counter Badge */}
                            {ad.images.length > 1 && (
                                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-bold">
                                    {currentImageIndex + 1} / {ad.images.length}
                                </div>
                            )}
                        </div>

                        {/* Thumbnails (Desktop Only) */}
                        <div className="hidden lg:flex gap-2 overflow-x-auto pb-2">
                            {ad.images.map((img: string, i: number) => (
                                <button
                                    key={i}
                                    onClick={() => setCurrentImageIndex(i)}
                                    className={cn(
                                        "w-20 h-20 rounded-xl overflow-hidden border-2 transition-all shrink-0",
                                        currentImageIndex === i ? "border-primary" : "border-transparent opacity-60 hover:opacity-100"
                                    )}
                                >
                                    <img src={img} className="w-full h-full object-cover" />
                                </button>
                            ))}
                        </div>

                        {/* Essential Info - Price and Title below image on mobile */}
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <div className="text-3xl font-black text-foreground">
                                    {ad.price ? `${ad.price.toLocaleString()} ₽` : 'Цена не указана'}
                                </div>
                                <h1 className="text-xl font-bold leading-tight text-foreground/90">{ad.title}</h1>
                            </div>

                            {/* Quick Stats */}
                            <div className="flex flex-wrap gap-4 py-4 border-y border-border/50 text-sm font-medium text-muted">
                                <div className="flex items-center gap-1.5 bg-surface px-3 py-1.5 rounded-lg border border-border">
                                    <MapPin className="h-4 w-4 text-primary" />
                                    {ad.city}
                                </div>
                                <div className="flex items-center gap-1.5 bg-surface px-3 py-1.5 rounded-lg border border-border">
                                    <ShieldCheck className="h-4 w-4 text-green-500" />
                                    Сделка на Авоське
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons (Mobile Sticky Footer could also work, but here for now) */}
                        <div className="grid grid-cols-2 gap-3 lg:hidden">
                            <button className="flex-1 bg-green-600 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-green-600/20 active:scale-[0.98] transition-all">
                                Позвонить
                            </button>
                            <Link
                                href={`/chat?adId=${ad.id}&receiverId=${ad.user_id}`}
                                className="flex-1 bg-blue-600 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-blue-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                            >
                                <MessageCircle className="h-5 w-5" /> Написать
                            </Link>
                        </div>

                        {/* Location Section */}
                        <div className="space-y-4 pt-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-black">Местоположение</h3>
                                <button className="text-sm font-bold text-primary">Карта</button>
                            </div>
                            <div className="flex items-start gap-3 p-4 bg-surface rounded-2xl border border-border">
                                <MapPin className="h-6 w-6 text-muted-foreground mt-0.5" />
                                <div>
                                    <p className="font-bold text-base">{ad.city}</p>
                                    <p className="text-sm text-muted">Краснодарский край, Горячий Ключ</p>
                                </div>
                            </div>
                        </div>

                        {/* Details Grid */}
                        <div className="space-y-4 pt-4">
                            <h3 className="text-xl font-black">Характеристики</h3>
                            <div className="bg-surface p-6 rounded-3xl border border-border grid sm:grid-cols-2 gap-y-4 gap-x-10">
                                <div className="flex justify-between items-center pb-2 border-b border-border/50">
                                    <span className="text-muted text-sm">Состояние</span>
                                    <span className="font-bold text-sm tracking-tight">{ad.condition === 'new' ? 'Новое' : 'Б/у'}</span>
                                </div>
                                {ad.category && (
                                    <div className="flex justify-between items-center pb-2 border-b border-border/50">
                                        <span className="text-muted text-sm">Категория</span>
                                        <span className="font-bold text-sm tracking-tight">{ad.category.name}</span>
                                    </div>
                                )}
                                {ad.specifications && Object.entries(ad.specifications).map(([key, value]) => (
                                    <div key={key} className="flex justify-between items-center pb-2 border-b border-border/50">
                                        <span className="text-muted text-sm capitalize">{key}</span>
                                        <span className="font-bold text-sm tracking-tight">{String(value)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Description */}
                        <div className="space-y-4 pt-4">
                            <h3 className="text-xl font-black">Описание</h3>
                            <div className="prose prose-sm max-w-none text-foreground/80 leading-relaxed font-medium">
                                <p className="whitespace-pre-wrap">{ad.description}</p>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Seller & Sticky Actions (Desktop View) */}
                    <div className="w-full lg:w-[320px] shrink-0">
                        <div className="sticky top-24 space-y-4">
                            {/* Desktop Actions Card */}
                            <div className="hidden lg:block bg-surface p-6 rounded-3xl border border-border shadow-sm space-y-4">
                                <div className="text-2xl font-black">{ad.price ? `${ad.price.toLocaleString()} ₽` : 'Договорная'}</div>
                                <button className="w-full py-3.5 bg-green-600 text-white font-black rounded-2xl hover:bg-green-700 transition-all shadow-md">
                                    Показать телефон
                                </button>
                                <Link
                                    href={`/chat?adId=${ad.id}&receiverId=${ad.user_id}`}
                                    className="w-full py-3.5 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 transition-all shadow-md flex items-center justify-center gap-2"
                                >
                                    <MessageCircle className="h-5 w-5" /> Написать сообщение
                                </Link>

                                <button
                                    onClick={toggleFavorite}
                                    className={cn(
                                        "w-full py-3 rounded-2xl font-bold flex items-center justify-center gap-2 border transition-all",
                                        isFavorite ? "bg-red-500/10 border-red-500/20 text-red-500" : "bg-surface border-border hover:bg-muted"
                                    )}
                                >
                                    <Heart className={cn("h-5 w-5", isFavorite && "fill-current")} />
                                    {isFavorite ? 'В избранном' : 'В избранное'}
                                </button>
                            </div>

                            {/* Seller Card */}
                            <div className="bg-surface p-6 rounded-3xl border border-border shadow-sm group">
                                <Link href={`/user?id=${ad.user_id}`} className="flex items-center gap-4 mb-6">
                                    <div className="w-14 h-14 rounded-full bg-surface border border-border overflow-hidden p-0.5 group-hover:border-primary transition-all">
                                        <div className="w-full h-full rounded-full bg-muted overflow-hidden">
                                            {ad.profiles?.avatar_url ? (
                                                <img src={ad.profiles.avatar_url} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-muted">
                                                    <User className="h-6 w-6" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="min-w-0">
                                        <div className="font-black text-lg group-hover:text-primary transition-colors truncate">
                                            {ad.profiles?.full_name?.split(' ')[0] || 'Пользователь'}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-xs text-orange-500 font-bold">
                                            <Star className="h-3 w-3 fill-current" />
                                            <span>{ad.profiles?.rating || '5.0'}</span>
                                            <span className="text-muted text-[10px] font-medium ml-1">42 отзыва</span>
                                        </div>
                                    </div>
                                </Link>

                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest">
                                        <ShieldCheck className="h-4 w-4 text-blue-500" />
                                        Документы проверены
                                    </div>
                                    <Link href={`/user?id=${ad.user_id}`} className="block w-full text-center py-2.5 bg-surface border border-border rounded-xl text-sm font-bold hover:bg-muted transition-all">
                                        Подробности о продавце
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function AdPage() {
    return (
        <Suspense fallback={<div className="p-20 text-center">Загрузка...</div>}>
            <AdContent />
        </Suspense>
    );
}
