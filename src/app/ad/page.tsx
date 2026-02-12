'use client';

import { useEffect, useState, Suspense } from 'react';
import { supabase } from '@/lib/supabase/client';
import { chatService } from '@/lib/supabase/chatService';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    Heart,
    Share2,
    ShieldCheck,
    Star,
    CheckCircle,
    User,
    MapPin,
    Info,
    ChevronLeft,
    ChevronRight,
    X,
    Maximize2
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { getShareableUrl } from '@/lib/share';

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
    const [showChat, setShowChat] = useState(false);

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
            .select(`*, profiles:user_id (*), category:category_id (*)`)
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

    const toggleFavorite = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return router.push('/login');

        if (isFavorite) {
            await supabase.from('favorites').delete().eq('user_id', session.user.id).eq('ad_id', id);
            setIsFavorite(false);
        } else {
            await supabase.from('favorites').insert({ user_id: session.user.id, ad_id: id });
            setIsFavorite(true);
        }
    };

    const checkFavorite = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session || !id) return;
        const { data } = await supabase.from('favorites').select('id').eq('user_id', session.user.id).eq('ad_id', id).single();
        setIsFavorite(!!data);
    };

    const handleQuickMsg = async () => {
        const textarea = document.getElementById('quick-msg-input') as HTMLTextAreaElement;
        const msg = textarea?.value;
        if (!msg?.trim()) return;
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return router.push('/login');
        try {
            await chatService.sendMessage(ad.user_id, msg, ad.id);
            toast.success('Отправлено');
            router.push(`/chat?adId=${ad.id}&receiverId=${ad.user_id}`);
        } catch (e) { toast.error('Ошибка'); }
    };

    const handleShare = async () => {
        const url = getShareableUrl(id || undefined);
        if (navigator.share) {
            try { await navigator.share({ title: ad?.title, url }); }
            catch (e) { navigator.clipboard.writeText(url); toast.success('Ссылка скопирована'); }
        } else {
            navigator.clipboard.writeText(url);
            toast.success('Ссылка скопирована');
        }
    };

    if (loading) return <div className="p-10 text-center font-bold">Загрузка...</div>;
    if (!ad) return <div className="p-10 text-center font-bold">Не найдено</div>;

    return (
        <div className="bg-background min-h-screen pb-10">
            {isZoomed && (
                <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center p-2" onClick={() => setIsZoomed(false)}>
                    <img src={ad.images[currentImageIndex]} className="max-w-full max-h-full object-contain" alt="" />
                </div>
            )}

            <div className="max-w-[1000px] mx-auto px-3 py-2">
                {/* Header: Title + Price (Super Compact) */}
                <div className="mb-3">
                    <h1 className="text-xl md:text-2xl font-black leading-tight mb-1">{ad.title}</h1>
                    <div className="flex items-center justify-between">
                        <div className="text-2xl font-black text-primary">
                            {ad.price ? `${ad.price.toLocaleString()} ₽` : 'Договорная'}
                        </div>
                        <div className="flex gap-2">
                            <button onClick={toggleFavorite} className={cn("p-2 rounded-full", isFavorite ? "text-red-500 bg-red-50" : "text-muted")}>
                                <Heart className={cn("h-6 w-6", isFavorite && "fill-current")} />
                            </button>
                            <button onClick={handleShare} className="p-2 text-muted">
                                <Share2 className="h-6 w-6" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* City Line - Clickable Map */}
                <a
                    href={`https://yandex.ru/maps/?text=${encodeURIComponent(ad.city + (ad.address ? ', ' + ad.address : ''))}`}
                    target="_blank"
                    className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground mb-4 hover:text-primary transition-colors"
                >
                    <MapPin className="h-3.5 w-3.5" />
                    <span>{ad.city}{ad.address ? `, ${ad.address}` : ''}</span>
                    <span className="text-[10px] opacity-60 ml-1">(на карте)</span>
                </a>

                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Main Section */}
                    <div className="flex-1 space-y-5">
                        {/* Image - Compact Aspect with brighter frame */}
                        <div className="relative aspect-[4/3] bg-muted/10 rounded-2xl overflow-hidden group border-2 border-primary/10 shadow-md">
                            <img
                                src={ad.images[currentImageIndex]}
                                className="w-full h-full object-contain"
                                alt=""
                                onClick={() => setIsZoomed(true)}
                            />
                            {ad.images.length > 1 && (
                                <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 flex justify-between pointer-events-none">
                                    <button onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(prev => (prev === 0 ? ad.images.length - 1 : prev - 1)); }} className="p-1.5 bg-white/80 rounded-full pointer-events-auto">
                                        <ChevronLeft className="h-5 w-5" />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(prev => (prev === ad.images.length - 1 ? 0 : prev + 1)); }} className="p-1.5 bg-white/80 rounded-full pointer-events-auto">
                                        <ChevronRight className="h-5 w-5" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Thumbnails - Smaller */}
                        <div className="flex gap-2 overflow-x-auto scrollbar-none">
                            {ad.images.map((img: string, i: number) => (
                                <button key={i} onClick={() => setCurrentImageIndex(i)} className={cn("w-12 h-12 rounded-lg border-2 shrink-0 overflow-hidden", currentImageIndex === i ? "border-primary" : "border-transparent opacity-60")}>
                                    <img src={img} className="w-full h-full object-cover" />
                                </button>
                            ))}
                        </div>

                        {/* Description - Compact */}
                        <div className="space-y-2">
                            <h2 className="text-sm font-black uppercase tracking-wider text-muted-foreground">Описание</h2>
                            <p className="text-sm font-medium leading-normal text-foreground/90 whitespace-pre-wrap">{ad.description}</p>
                        </div>

                        {/* Characteristics - Compact Table style */}
                        <div className="space-y-2">
                            <h2 className="text-sm font-black uppercase tracking-wider text-muted-foreground">Характеристики</h2>
                            <div className="grid grid-cols-1 gap-1">
                                <div className="flex justify-between py-1 border-b border-border/50 text-xs">
                                    <span className="text-muted">Состояние</span>
                                    <span className="font-bold">{ad.condition === 'new' ? 'Новое' : 'Б/у'}</span>
                                </div>
                                {ad.category && (
                                    <div className="flex justify-between py-1 border-b border-border/50 text-xs">
                                        <span className="text-muted">Категория</span>
                                        <span className="font-bold">{ad.category.name}</span>
                                    </div>
                                )}
                                {ad.specifications && Object.entries(ad.specifications).map(([k, v]) => (
                                    <div key={k} className="flex justify-between py-1 border-b border-border/50 text-xs text-capitalize">
                                        <span className="text-muted">{k}</span>
                                        <span className="font-bold">{String(v)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar / Bottom Actions for Mobile */}
                    <div className="w-full lg:w-72 space-y-4">
                        {/* Seller Card - Compact */}
                        <div className="bg-surface p-4 rounded-2xl border border-border shadow-sm flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-muted overflow-hidden shrink-0">
                                {ad.profiles?.avatar_url ? <img src={ad.profiles.avatar_url} className="w-full h-full object-cover" /> : <User className="p-2 w-full h-full text-muted" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="font-black text-sm truncate">{ad.profiles?.full_name || 'Продавец'}</div>
                                <div className="flex items-center gap-1 text-[10px] text-orange-500 font-bold">
                                    <Star className="h-3 w-3 fill-current" />
                                    <span>{ad.profiles?.rating || '5.0'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Quick Message / Chat Window */}
                        <div className="bg-surface rounded-2xl border border-border p-3 shadow-sm">
                            {showChat ? (
                                <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-xs font-black">Сообщение</span>
                                        <button onClick={() => setShowChat(false)} className="p-1 hover:bg-muted rounded-full">
                                            <X className="h-4 w-4 text-muted-foreground" />
                                        </button>
                                    </div>
                                    <textarea
                                        id="quick-msg-input"
                                        className="w-full h-24 rounded-xl bg-background border border-border p-2.5 text-xs font-bold focus:ring-1 focus:ring-primary outline-none resize-none"
                                        placeholder="Напишите сообщение..."
                                    />
                                    <button onClick={handleQuickMsg} className="w-full h-9 bg-primary text-white text-xs font-black rounded-xl">
                                        Отправить
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <div className="text-xs font-bold text-muted-foreground mb-2">Связаться с продавцом:</div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <a href={ad.profiles?.phone ? `tel:${ad.profiles.phone}` : '#'} className="h-10 bg-green-600 text-white text-xs font-black rounded-xl flex items-center justify-center hover:bg-green-700 transition-all">
                                            Позвонить
                                        </a>
                                        <button onClick={() => setShowChat(true)} className="h-10 bg-primary text-white text-xs font-black rounded-xl hover:bg-primary/90 transition-all">
                                            Написать
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function AdPage() {
    return (
        <Suspense fallback={<div className="p-10 text-center">...</div>}>
            <AdContent />
        </Suspense>
    );
}
