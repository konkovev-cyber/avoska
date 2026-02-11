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
        <div className="container mx-auto px-4 py-6 max-w-6xl">
            {/* Image Zoom Modal */}
            {isZoomed && (
                <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 md:p-10 transition-all animate-in fade-in duration-300">
                    <button onClick={() => setIsZoomed(false)} className="absolute top-6 right-6 text-white hover:bg-white/10 p-3 rounded-full transition-colors z-[110]">
                        <X className="h-8 w-8" />
                    </button>
                    <img
                        src={ad.images[currentImageIndex]}
                        className="max-w-full max-h-full object-contain shadow-2xl rounded-lg"
                        alt={ad.title}
                    />
                    {ad.images.length > 1 && (
                        <>
                            <button
                                onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(prev => (prev === 0 ? ad.images.length - 1 : prev - 1)); }}
                                className="absolute left-6 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white p-4 rounded-full transition-all"
                            >
                                <ChevronLeft className="h-10 w-10" />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(prev => (prev === ad.images.length - 1 ? 0 : prev + 1)); }}
                                className="absolute right-6 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white p-4 rounded-full transition-all"
                            >
                                <ChevronRight className="h-10 w-10" />
                            </button>
                        </>
                    )}
                </div>
            )}

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Left Side: Images & Info */}
                <div className="flex-1 min-w-0 space-y-6">
                    <h1 className="text-2xl font-black mb-2 block lg:hidden">{ad.title}</h1>

                    <div className="space-y-4">
                        <div className="aspect-[4/3] bg-surface rounded-2xl border border-border overflow-hidden relative group cursor-zoom-in" onClick={() => setIsZoomed(true)}>
                            {ad.images && ad.images.length > 0 ? (
                                <>
                                    <img
                                        src={ad.images[currentImageIndex]}
                                        className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105"
                                        alt={ad.title}
                                    />
                                    <div className="absolute bottom-4 right-4 bg-black/50 text-white p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Maximize2 className="h-5 w-5" />
                                    </div>
                                    {ad.images.length > 1 && (
                                        <>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(prev => (prev === 0 ? ad.images.length - 1 : prev - 1)); }}
                                                className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <ChevronLeft className="h-6 w-6" />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(prev => (prev === ad.images.length - 1 ? 0 : prev + 1)); }}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <ChevronRight className="h-6 w-6" />
                                            </button>
                                        </>
                                    )}
                                </>
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted flex-col gap-2">
                                    <Info className="h-10 w-10 opacity-20" />
                                    <span>Нет фото</span>
                                </div>
                            )}
                            {ad.delivery_possible && (
                                <div className="absolute top-4 left-4 bg-primary text-white text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-wider shadow-lg flex items-center gap-1.5">
                                    <Truck className="h-3 w-3" /> Доставка
                                </div>
                            )}
                        </div>
                        {/* Thumbnails */}
                        {ad.images && ad.images.length > 1 && (
                            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                                {ad.images.map((img: string, i: number) => (
                                    <button
                                        key={i}
                                        onClick={() => setCurrentImageIndex(i)}
                                        className={cn(
                                            "w-16 h-16 rounded-xl overflow-hidden border-2 shrink-0 transition-all",
                                            currentImageIndex === i ? "border-primary" : "border-transparent opacity-70 hover:opacity-100"
                                        )}
                                    >
                                        <img src={img} className="w-full h-full object-cover" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Description Section */}
                    <div className="bg-surface p-6 rounded-2xl border border-border">
                        <h3 className="text-lg font-black mb-4">Описание</h3>
                        <p className="whitespace-pre-wrap leading-relaxed text-sm text-foreground/80">{ad.description}</p>
                    </div>

                    {/* Details Section */}
                    <div className="bg-surface p-6 rounded-2xl border border-border">
                        <h3 className="text-lg font-black mb-4">Характеристики</h3>
                        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3">
                            <div className="flex justify-between py-1.5 border-b border-border text-sm">
                                <span className="text-muted">Город</span>
                                <span className="font-bold flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {ad.city}</span>
                            </div>
                            <div className="flex justify-between py-1.5 border-b border-border text-sm">
                                <span className="text-muted">Категория</span>
                                <span className="font-bold">{ad.category?.name}</span>
                            </div>
                            <div className="flex justify-between py-1.5 border-b border-border text-sm">
                                <span className="text-muted">Состояние</span>
                                <span className="font-bold">{ad.condition === 'new' ? 'Новое' : 'Б/у'}</span>
                            </div>
                            {ad.specifications && Object.entries(ad.specifications).map(([key, value]) => (
                                <div key={key} className="flex justify-between py-1.5 border-b border-border text-sm">
                                    <span className="text-muted capitalize">{
                                        key === 'brand' ? 'Марка' :
                                            key === 'year' ? 'Год выпуска' :
                                                key === 'mileage' ? 'Пробег' :
                                                    key === 'transmission' ? 'КПП' :
                                                        key === 'area' ? 'Площадь' :
                                                            key === 'rooms' ? 'Комнаты' :
                                                                key === 'size' ? 'Размер' :
                                                                    key === 'gender' ? 'Пол' :
                                                                        key === 'model' ? 'Модель' : key
                                    }</span>
                                    <span className="font-bold capitalize">{
                                        value === 'auto' ? 'Автомат' :
                                            value === 'manual' ? 'Механика' :
                                                value === 'studio' ? 'Студия' :
                                                    value === 'male' ? 'Мужской' :
                                                        value === 'female' ? 'Женский' :
                                                            value === 'unisex' ? 'Унисекс' : value as string
                                    }{key === 'area' ? ' м²' : ''}{key === 'mileage' ? ' км' : ''}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Side: Price & Seller */}
                <div className="w-full lg:w-[350px] shrink-0 space-y-4">
                    <div className="bg-surface p-6 rounded-2xl border border-border shadow-sm sticky top-24">
                        <div className="flex items-start justify-between mb-4">
                            <div className="space-y-1">
                                <div className="text-2xl font-black text-foreground">
                                    {ad.salary_from || ad.salary_to
                                        ? `${ad.salary_from ? 'от ' + ad.salary_from.toLocaleString() : ''} ${ad.salary_to ? 'до ' + ad.salary_to.toLocaleString() : ''} ₽`
                                        : (ad.price ? `${ad.price.toLocaleString()} ₽` : 'Цена не указана')
                                    }
                                </div>
                                <h1 className="text-base font-bold text-muted leading-tight hidden lg:block">{ad.title}</h1>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={toggleFavorite}
                                    className={cn(
                                        "p-2 rounded-xl border transition-all",
                                        isFavorite ? 'bg-red-50 border-red-200 text-red-500' : 'hover:bg-muted border-border'
                                    )}
                                >
                                    <Heart className={cn("h-5 w-5", isFavorite && 'fill-current')} />
                                </button>
                            </div>
                        </div>

                        {isAdmin && ad?.status !== 'active' && (
                            <button
                                onClick={() => updateStatus('active')}
                                className="w-full bg-green-500 text-white py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-green-600 transition-all mb-2"
                            >
                                <CheckCircle className="h-4 w-4" /> Одобрить
                            </button>
                        )}
                        {isAdmin && ad?.status !== 'rejected' && (
                            <button
                                onClick={() => updateStatus('rejected')}
                                className="w-full bg-red-500 text-white py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-600 transition-all mb-4"
                            >
                                <XCircle className="h-4 w-4" /> Отклонить
                            </button>
                        )}

                        <Link
                            href={`/chat?adId=${ad.id}&receiverId=${ad.user_id}`}
                            className="w-full py-3 bg-primary text-white font-black text-base rounded-xl shadow-md flex items-center justify-center gap-2 hover:opacity-90 transition-all mb-4"
                        >
                            <MessageCircle className="h-5 w-5" /> Написать сообщение
                        </Link>

                        <div className="flex items-center justify-between text-[11px] font-bold text-muted mb-6 uppercase tracking-wider">
                            <button onClick={handleShare} className="flex items-center gap-1.5 hover:text-foreground transition-colors">
                                <Share2 className="h-3.5 w-3.5" /> Поделиться
                            </button>
                            <span>{new Date(ad.created_at).toLocaleDateString()}</span>
                        </div>

                        {/* Seller Card */}
                        <Link href={`/user?id=${ad.user_id}`} className="block group p-4 rounded-xl border border-border bg-background hover:border-primary transition-all">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-muted overflow-hidden">
                                    {ad.profiles?.avatar_url ? (
                                        <img src={ad.profiles.avatar_url} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-muted">
                                            <User className="h-5 w-5" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <div className="font-black text-sm group-hover:text-primary transition-colors truncate">{ad.profiles.full_name}</div>
                                        {ad.profiles.is_verified && <CheckCircle className="h-3.5 w-3.5 text-blue-500 fill-current" />}
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[10px] text-muted">
                                        <div className="flex items-center text-orange-500">
                                            <Star className="h-2.5 w-2.5 fill-current" />
                                            <span className="font-bold ml-0.5">{ad.profiles.rating || '0.0'}</span>
                                        </div>
                                        <span>•</span>
                                        <span>на Авоське с {new Date(ad.profiles.created_at).getFullYear()}</span>
                                    </div>
                                </div>
                                <ChevronRight className="h-4 w-4 text-muted group-hover:translate-x-1 transition-transform" />
                            </div>
                        </Link>

                        <button
                            onClick={async () => {
                                const reason = prompt('Укажите причину жалобы:');
                                if (reason) {
                                    const { data: { session } } = await supabase.auth.getSession();
                                    if (!session) return toast.error('Нужно войти');
                                    await supabase.from('reports').insert({ ad_id: ad.id, reporter_id: session.user.id, reason });
                                    toast.success('Жалоба отправлена');
                                }
                            }}
                            className="w-full mt-4 text-[10px] font-bold text-muted hover:text-red-500 transition-colors uppercase flex items-center justify-center gap-1"
                        >
                            <AlertCircle className="h-3 w-3" /> Пожаловаться
                        </button>
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
