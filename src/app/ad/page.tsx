'use client';

import { useEffect, useState, Suspense } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import { getOptimizedImageUrl } from '@/lib/image-utils';
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
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [currentUser, setCurrentUser] = useState<any>(null);

    useEffect(() => {
        if (id) {
            fetchAd();
            checkFavorite();
            checkAdminStatus();
            getCurrentUser();
        } else {
            setLoading(false);
        }
    }, [id]);

    const getCurrentUser = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        setCurrentUser(session?.user || null);
    };

    useEffect(() => {
        if (showChat && ad) {
            fetchMessages();
            const channel = supabase
                .channel(`ad_chat_${ad.id}`)
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `sender_id=eq.${currentUser?.id},receiver_id=eq.${ad.user_id}`
                }, fetchMessages)
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `sender_id=eq.${ad.user_id},receiver_id=eq.${currentUser?.id}`
                }, fetchMessages)
                .subscribe();
            return () => { supabase.removeChannel(channel); };
        }
    }, [showChat, ad, currentUser]);

    const fetchMessages = async () => {
        if (!currentUser || !ad) return;
        const msgs = await chatService.getMessages(ad.user_id);
        const filteredMsgs = msgs.filter((m: any) => m.ad_id === ad.id || !m.ad_id);
        setMessages(filteredMsgs);
        setTimeout(scrollToBottom, 100);
    };

    const scrollToBottom = () => {
        const el = document.getElementById('mini-chat-messages');
        if (el) el.scrollTop = el.scrollHeight;
    };

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

    const handleSendMessage = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!newMessage.trim() || !ad) return;
        if (!currentUser) return router.push('/login');

        try {
            await chatService.sendMessage(ad.user_id, newMessage, ad.id);
            setNewMessage('');
            fetchMessages();
        } catch (e) { toast.error('Ошибка'); }
    };

    const handleShare = async () => {
        const url = window.location.href;
        if (navigator.share) {
            try {
                await navigator.share({
                    title: ad?.title,
                    text: `Посмотри это объявление на Авоська+: ${ad?.title}`,
                    url
                });
            } catch (e) {
                // Ignore abort errors
                if ((e as Error).name !== 'AbortError') {
                    navigator.clipboard.writeText(url);
                    toast.success('Ссылка скопирована');
                }
            }
        } else {
            navigator.clipboard.writeText(url);
            toast.success('Ссылка скопирована');
        }
    };

    if (loading) return (
        <div className="max-w-[1000px] mx-auto px-3 py-4 space-y-6">
            <div className="space-y-4">
                <Skeleton className="h-8 w-3/4 md:h-10" />
                <div className="flex justify-between items-center">
                    <Skeleton className="h-8 w-32" />
                    <div className="flex gap-2">
                        <Skeleton className="w-10 h-10 rounded-full" />
                        <Skeleton className="w-10 h-10 rounded-full" />
                    </div>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex-1 space-y-6">
                    <Skeleton className="aspect-[4/3] w-full rounded-2xl" />
                    <div className="space-y-4">
                        <Skeleton className="h-6 w-1/4" />
                        <Skeleton className="h-20 w-full" />
                    </div>
                </div>
                <div className="w-full lg:w-72 space-y-4">
                    <Skeleton className="h-24 w-full rounded-2xl" />
                    <Skeleton className="h-32 w-full rounded-2xl" />
                </div>
            </div>
        </div>
    );
    if (!ad) return <div className="p-10 text-center font-bold">Не найдено</div>;

    return (
        <div className="bg-background min-h-screen pb-10">
            {isZoomed && (
                <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-2 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setIsZoomed(false)}>
                    <button className="absolute top-4 right-4 p-2 bg-white/10 rounded-full text-white hover:bg-white/20">
                        <X className="h-6 w-6" />
                    </button>
                    <img src={ad.images[currentImageIndex]} className="max-w-full max-h-full object-contain" alt="" />
                    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded-full text-xs font-bold backdrop-blur-md pointer-events-none">
                        Нажмите, чтобы закрыть
                    </div>
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
                            <button onClick={toggleFavorite} className={cn("p-2 rounded-full transition-colors", isFavorite ? "text-red-500 bg-red-50" : "text-muted hover:bg-muted/10")}>
                                <Heart className={cn("h-6 w-6", isFavorite && "fill-current")} />
                            </button>
                            <button onClick={handleShare} className="p-2 text-muted hover:bg-muted/10 rounded-full transition-colors">
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
                        <div className="relative aspect-[4/3] bg-muted/10 rounded-2xl overflow-hidden group border-2 border-primary/10 shadow-md cursor-zoom-in" onClick={() => setIsZoomed(true)}>
                            <div className="absolute top-2 right-2 bg-black/30 backdrop-blur-md p-1.5 rounded-lg text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                <Maximize2 className="h-4 w-4" />
                            </div>
                            <img
                                src={getOptimizedImageUrl(ad.images[currentImageIndex], { width: 1000, quality: 80 })}
                                className="w-full h-full object-contain"
                                alt=""
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
                                    <img src={getOptimizedImageUrl(img, { width: 100, quality: 60 })} className="w-full h-full object-cover" />
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
                                {ad.specifications && Object.entries(ad.specifications).map(([k, v]) => {
                                    const labels: Record<string, string> = {
                                        brand: 'Марка',
                                        model: 'Модель',
                                        year: 'Год выпуска',
                                        mileage: 'Пробег (км)',
                                        transmission: 'Коробка передач',
                                        area: 'Площадь (м²)',
                                        rooms: 'Кол-во комнат',
                                        floor: 'Этаж',
                                        total_floors: 'Этажей в доме',
                                        plot_area: 'Площадь участка',
                                        house_area: 'Площадь дома',
                                        type: 'Тип строения',
                                        status: 'Статус участка',
                                        size: 'Размер',
                                        gender: 'Пол'
                                    };

                                    // Translate value for transmission/gender/rooms
                                    let displayValue = String(v);
                                    if (k === 'transmission') {
                                        if (v === 'auto') displayValue = 'Автомат';
                                        if (v === 'manual') displayValue = 'Механика';
                                    }
                                    if (k === 'gender') {
                                        if (v === 'male') displayValue = 'Мужской';
                                        if (v === 'female') displayValue = 'Женский';
                                        if (v === 'unisex') displayValue = 'Унисекс';
                                    }
                                    if (k === 'rooms' && v === 'studio') displayValue = 'Студия';

                                    return (
                                        <div key={k} className="flex justify-between py-1 border-b border-border/50 text-xs">
                                            <span className="text-muted">{labels[k] || k}</span>
                                            <span className="font-bold">{displayValue}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar / Bottom Actions for Mobile */}
                    <div className="w-full lg:w-72 space-y-4">
                        {/* Seller Card - Compact */}
                        <div className="bg-surface p-4 rounded-2xl border border-border shadow-sm flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-muted overflow-hidden shrink-0">
                                {ad.profiles?.avatar_url ? (
                                    <img src={ad.profiles.avatar_url} className="w-full h-full object-cover" alt={ad.profiles.full_name} />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary font-bold">
                                        {ad.profiles?.full_name?.charAt(0).toUpperCase() || <User className="h-5 w-5" />}
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="font-black text-sm truncate">{ad.profiles?.full_name || 'Продавец'}</div>
                                <div className="flex items-center gap-1 text-[10px] text-orange-500 font-bold">
                                    <Star className="h-3 w-3 fill-current" />
                                    <span>{ad.profiles?.rating || '5.0'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Mini Chat Window */}
                        <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-sm flex flex-col">
                            {showChat ? (
                                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 flex flex-col h-[380px]">
                                    <div className="p-3 border-b border-border flex justify-between items-center bg-muted/5">
                                        <span className="text-xs font-black uppercase tracking-wider">Чат с продавцом</span>
                                        <button onClick={() => setShowChat(false)} className="p-1 hover:bg-muted rounded-full">
                                            <X className="h-4 w-4 text-muted-foreground" />
                                        </button>
                                    </div>

                                    <div id="mini-chat-messages" className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-none bg-background/30">
                                        {messages.length > 0 ? (
                                            messages.map((msg) => (
                                                <div key={msg.id} className={cn(
                                                    "max-w-[85%] p-2.5 rounded-2xl text-[13px] leading-tight shadow-sm",
                                                    msg.sender_id === currentUser?.id
                                                        ? "ml-auto bg-primary text-white rounded-br-none"
                                                        : "mr-auto bg-surface border border-border rounded-bl-none"
                                                )}>
                                                    {msg.content}
                                                    <div className="text-[9px] opacity-60 mt-1 text-right">
                                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="h-full flex flex-col items-center justify-center opacity-30 text-center px-4">
                                                <User className="h-8 w-8 mb-2" />
                                                <p className="text-[10px] font-bold">Начните общение первым!</p>
                                            </div>
                                        )}
                                    </div>

                                    <form onSubmit={handleSendMessage} className="p-2 border-t border-border bg-muted/5 flex gap-2">
                                        <input
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            className="flex-1 h-9 bg-background border border-border rounded-xl px-3 text-xs font-bold outline-none focus:ring-1 focus:ring-primary"
                                            placeholder="Сообщение..."
                                        />
                                        <button
                                            type="submit"
                                            disabled={!newMessage.trim()}
                                            className="w-9 h-9 bg-primary text-white rounded-xl flex items-center justify-center active:scale-90 transition-all disabled:opacity-50"
                                        >
                                            <ChevronRight className="h-5 w-5" />
                                        </button>
                                    </form>
                                </div>
                            ) : (
                                <div className="p-3 space-y-3">
                                    <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                                        <ShieldCheck className="h-4 w-4 text-primary" />
                                        <span>Связаться с продавцом:</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <a href={ad.profiles?.phone ? `tel:${ad.profiles.phone}` : '#'} className="h-11 bg-green-600 text-white text-[13px] font-black rounded-xl flex items-center justify-center hover:bg-green-700 transition-all shadow-lg shadow-green-600/10 active:scale-95">
                                            Позвонить
                                        </a>
                                        <button onClick={() => setShowChat(true)} className="h-11 bg-primary text-white text-[13px] font-black rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/10 active:scale-95">
                                            Написать
                                        </button>
                                    </div>
                                    <div className="text-[10px] text-center text-muted-foreground font-medium italic">
                                        Безопасная сделка через Авоська+
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
