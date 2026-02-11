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
    User,
    MapPin,
    Truck,
    Info,
    ChevronLeft,
    ChevronRight,
    MessageCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import Link from 'next/link';

function AdContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const id = searchParams.get('id');

    const [ad, setAd] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isFavorite, setIsFavorite] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    useEffect(() => {
        if (id) {
            fetchAd();
            checkFavorite();
        } else {
            setLoading(false);
        }
    }, [id]);

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
        <div className="container mx-auto px-4 py-8 max-w-5xl">
            <div className="grid md:grid-cols-2 gap-8">
                {/* Images Gallery */}
                <div className="space-y-4">
                    <div className="aspect-square bg-surface rounded-3xl border border-border overflow-hidden relative group">
                        {ad.images && ad.images.length > 0 ? (
                            <>
                                <img
                                    src={ad.images[currentImageIndex]}
                                    className="w-full h-full object-cover transition-all duration-300"
                                    alt={ad.title}
                                />
                                {ad.images.length > 1 && (
                                    <>
                                        <button
                                            onClick={() => setCurrentImageIndex(prev => (prev === 0 ? ad.images.length - 1 : prev - 1))}
                                            className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <ChevronLeft className="h-6 w-6" />
                                        </button>
                                        <button
                                            onClick={() => setCurrentImageIndex(prev => (prev === ad.images.length - 1 ? 0 : prev + 1))}
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
                            <div className="absolute top-4 left-4 bg-primary text-white text-xs font-black px-3 py-1.5 rounded-xl uppercase tracking-wider shadow-lg flex items-center gap-2">
                                <Truck className="h-4 w-4" /> Доставка
                            </div>
                        )}
                    </div>
                    {/* Thumbnails */}
                    {ad.images && ad.images.length > 1 && (
                        <div className="flex gap-2 overflow-x-auto pb-2">
                            {ad.images.map((img: string, i: number) => (
                                <button
                                    key={i}
                                    onClick={() => setCurrentImageIndex(i)}
                                    className={cn(
                                        "w-20 h-20 rounded-xl overflow-hidden border-2 shrink-0 transition-all",
                                        currentImageIndex === i ? "border-primary" : "border-transparent opacity-70 hover:opacity-100"
                                    )}
                                >
                                    <img src={img} className="w-full h-full object-cover" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Info / Sidebar */}
                <div className="space-y-6">
                    <div className="bg-surface p-8 rounded-3xl border border-border shadow-md sticky top-24">
                        <div className="flex items-start justify-between mb-4">
                            <h1 className="text-3xl font-black">
                                {ad.salary_from || ad.salary_to
                                    ? `${ad.salary_from ? 'от ' + ad.salary_from.toLocaleString() : ''} ${ad.salary_to ? 'до ' + ad.salary_to.toLocaleString() : ''} ₽`
                                    : (ad.price ? `${ad.price.toLocaleString()} ₽` : 'Цена не указана')
                                }
                            </h1>
                            <div className="flex gap-2">
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
                                    className="p-2 rounded-full border border-border hover:bg-red-50 hover:text-red-500 transition-all"
                                    title="Пожаловаться"
                                >
                                    <AlertCircle className="h-5 w-5" />
                                </button>
                                <button
                                    onClick={toggleFavorite}
                                    className={`p-2 rounded-full border transition-all ${isFavorite ? 'bg-red-50 border-red-200 text-red-500' : 'hover:bg-muted border-border'}`}
                                >
                                    <Heart className={`h-6 w-6 ${isFavorite ? 'fill-current' : ''}`} />
                                </button>
                            </div>
                        </div>

                        <h2 className="text-lg font-medium mb-8 leading-tight">{ad.title}</h2>

                        <Link
                            href={`/chat?adId=${ad.id}&receiverId=${ad.user_id}`}
                            className="w-full py-4 bg-primary text-white font-black text-lg rounded-2xl shadow-xl flex items-center justify-center gap-2 hover:opacity-90 transition-all mb-4"
                        >
                            <MessageCircle className="h-5 w-5" /> Написать сообщение
                        </Link>

                        <div className="flex items-center justify-between text-sm font-bold text-muted mb-6">
                            <button onClick={handleShare} className="flex items-center gap-2 hover:text-foreground transition-colors">
                                <Share2 className="h-4 w-4" /> Поделиться
                            </button>
                            <span>{new Date(ad.created_at).toLocaleDateString()}</span>
                        </div>

                        {/* Seller Card */}
                        <Link href={`/user?id=${ad.user_id}`} className="block group p-4 rounded-2xl border border-border bg-background hover:border-primary transition-all">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-muted overflow-hidden">
                                    {ad.profiles?.avatar_url ? (
                                        <img src={ad.profiles.avatar_url} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-muted">
                                            <User className="h-6 w-6" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <div className="font-black text-lg group-hover:text-primary transition-colors">{ad.profiles.full_name}</div>
                                        {ad.profiles.is_verified && <CheckCircle className="h-5 w-5 text-blue-500 fill-current" />}
                                    </div>
                                    <div className="flex items-center gap-1 text-sm text-muted">
                                        <div className="flex items-center text-orange-500">
                                            <Star className="h-3 w-3 fill-current" />
                                            <span className="font-bold ml-1">{ad.profiles.rating || '0.0'}</span>
                                        </div>
                                        <span>•</span>
                                        <span>На Авоське с {new Date(ad.profiles.created_at).getFullYear()}</span>
                                    </div>
                                </div>
                                <ChevronRight className="h-5 w-5 text-muted group-hover:translate-x-1 transition-transform" />
                            </div>
                        </Link>
                    </div>

                    {/* Details */}
                    <div className="bg-surface p-8 rounded-3xl border border-border">
                        <h3 className="text-xl font-black mb-6">Характеристики</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between py-2 border-b border-border">
                                <span className="text-muted">Город</span>
                                <span className="font-bold flex items-center gap-1"><MapPin className="h-4 w-4" /> {ad.city}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-border">
                                <span className="text-muted">Категория</span>
                                <span className="font-bold">{ad.category?.name}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-border">
                                <span className="text-muted">Состояние</span>
                                <span className="font-bold">{ad.condition === 'new' ? 'Новое' : 'Б/у'}</span>
                            </div>
                            {ad.specifications && Object.entries(ad.specifications).map(([key, value]) => (
                                <div key={key} className="flex justify-between py-2 border-b border-border">
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

                    {/* Description */}
                    <div className="bg-surface p-8 rounded-3xl border border-border">
                        <h3 className="text-xl font-black mb-4">Описание</h3>
                        <p className="whitespace-pre-wrap leading-relaxed text-lg">{ad.description}</p>
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
