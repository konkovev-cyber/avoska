'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import dynamic from 'next/dynamic';
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
    Maximize2,
    Paperclip,
    Image as ImageIcon,
    Check,
    CheckCheck,
    Ban,
    Camera
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { getShareableUrl } from '@/lib/share';
import RightSidebar from '@/components/layout/RightSidebar';
import { compressImage } from '@/lib/image-utils';

const YandexMapView = dynamic(() => import('@/components/YandexMapView'), {
    ssr: false,
    loading: () => <div className="h-[200px] w-full bg-surface animate-pulse rounded-2xl flex items-center justify-center font-black text-[10px] uppercase tracking-widest text-muted opacity-30">Карта...</div>
});

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
    const [isUploadingChatImage, setIsUploadingChatImage] = useState(false);
    const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const chatChannelRef = useRef<any>(null);

    // Review states
    const [showReviewForm, setShowReviewForm] = useState(false);
    const [reviewRating, setReviewRating] = useState(5);
    const [reviewComment, setReviewComment] = useState('');
    const [reviewImages, setReviewImages] = useState<string[]>([]);
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);

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

    const [sellerReviews, setSellerReviews] = useState<any[]>([]);
    const [reviewsLoading, setReviewsLoading] = useState(false);

    useEffect(() => {
        if (ad?.user_id) {
            fetchSellerReviews();
        }
    }, [ad?.user_id]);

    const fetchSellerReviews = async () => {
        if (!ad?.user_id) return;
        setReviewsLoading(true);
        try {
            const { data } = await supabase
                .from('reviews')
                .select('*, reviewer:profiles!reviewer_id(full_name, avatar_url)')
                .eq('target_user_id', ad.user_id)
                .order('created_at', { ascending: false })
                .limit(3);

            setSellerReviews(data || []);
        } catch (e) {
            console.error('Error fetching reviews:', e);
        } finally {
            setReviewsLoading(false);
        }
    };

    const getCurrentUser = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        setCurrentUser(session?.user || null);
    };

    useEffect(() => {
        if (showChat && ad && currentUser) {
            fetchMessages();

            const channelId = `ad_chat_${ad.id}_${[currentUser.id, ad.user_id].sort().join('_')}`;
            const channel = supabase.channel(channelId);

            channel
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                }, (payload) => {
                    const newMsg = payload.new;
                    if (
                        (newMsg.sender_id === currentUser.id && newMsg.receiver_id === ad.user_id) ||
                        (newMsg.sender_id === ad.user_id && newMsg.receiver_id === currentUser.id)
                    ) {
                        fetchMessages();
                    }
                })
                .on('presence', { event: 'sync' }, () => {
                    const state = channel.presenceState();
                    const otherTyping = Object.values(state).some((presences: any) =>
                        presences.some((p: any) => p.user_id === ad.user_id && p.is_typing)
                    );
                    setIsOtherUserTyping(otherTyping);
                })
                .on('presence', { event: 'join' }, ({ key, newPresences }) => {
                    console.log('join', key, newPresences);
                })
                .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
                    console.log('leave', key, leftPresences);
                })
                .subscribe(async (status) => {
                    if (status === 'SUBSCRIBED') {
                        await channel.track({
                            user_id: currentUser.id,
                            is_typing: false,
                            online_at: new Date().toISOString(),
                        });
                    }
                });

            chatChannelRef.current = channel;

            return () => {
                if (chatChannelRef.current) {
                    supabase.removeChannel(chatChannelRef.current);
                }
            };
        }
    }, [showChat, ad, currentUser]);

    const fetchMessages = async () => {
        if (!currentUser || !ad) return;
        const msgs = await chatService.getMessages(ad.user_id);
        const filteredMsgs = msgs.filter((m: any) => m.ad_id === ad.id || !m.ad_id);
        setMessages(filteredMsgs);

        // Mark as read if we are the receiver
        const hasUnread = filteredMsgs.some((m: any) => m.receiver_id === currentUser.id && !m.is_read);
        if (hasUnread) {
            await chatService.markAsRead(ad.user_id);
        }

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
        const ADMIN_EMAILS = ['ht-elk@yandex.ru', 'dron-vbg@yandex.ru', 'konkev@bk.ru', 'konkovev@gmail.com'];
        if (profile?.role === 'admin' || ADMIN_EMAILS.includes(session.user.email || '')) {
            setIsAdmin(true);
        }
    };

    const fetchAd = async () => {
        if (!id) return;
        const { data, error } = await supabase
            .from('ads')
            .select(`*, user_id, profiles:user_id (*), category:category_id (*)`)
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
        if (!id) return;
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            toast.error('Войдите, чтобы добавить в избранное');
            return router.push('/login');
        }

        const adId = id;
        const userId = session.user.id;
        const originalState = isFavorite;

        // Optimistic update
        setIsFavorite(!originalState);

        try {
            console.log('Toggling favorite for ad:', adId, 'user:', userId, 'current state:', originalState);
            if (originalState) {
                const { error } = await supabase
                    .from('favorites')
                    .delete()
                    .eq('user_id', userId)
                    .eq('ad_id', adId);

                if (error) throw error;
                console.log('Successfully removed from favorites');
                toast.success('Удалено из избранного');
            } else {
                const { error } = await supabase
                    .from('favorites')
                    .insert({ user_id: userId, ad_id: adId });

                if (error) {
                    if (error.code === '23505') {
                        console.log('Favorite already exists in DB');
                        setIsFavorite(true);
                        return;
                    }
                    throw error;
                }
                console.log('Successfully added to favorites');
                toast.success('Добавлено в избранное');
            }
        } catch (error: any) {
            console.error('Favorite error:', error);
            setIsFavorite(originalState);
            toast.error(error.message || 'Ошибка обновления избранного');
        }
    };

    const checkFavorite = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session || !id) return;

        try {
            const { data, error } = await supabase
                .from('favorites')
                .select('ad_id')
                .eq('user_id', session.user.id)
                .eq('ad_id', id)
                .maybeSingle();

            setIsFavorite(!!data);
        } catch (err) {
            console.error('Check favorite error:', err);
        }
    };

    const handleReviewImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            try {
                const compressedFile = await compressImage(file, 800, 0.7);
                const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
                const filePath = `reviews/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('review-images')
                    .upload(filePath, compressedFile);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('review-images')
                    .getPublicUrl(filePath);

                setReviewImages(prev => [...prev, publicUrl]);
            } catch (err) {
                console.error('Review image upload error:', err);
                toast.error('Ошибка загрузки фото');
            }
        }
    };

    const handleReviewSubmit = async () => {
        if (!currentUser) return router.push('/login');
        if (!reviewComment.trim()) return toast.error('Напишите комментарий');
        if (currentUser.id === ad.user_id) return toast.error('Вы не можете оставить отзыв самому себе');

        setIsSubmittingReview(true);
        try {
            const { error } = await supabase
                .from('reviews')
                .insert({
                    reviewer_id: currentUser.id,
                    target_user_id: ad.user_id,
                    ad_id: ad.id,
                    rating: reviewRating,
                    comment: reviewComment,
                    images: reviewImages
                });

            if (error) throw error;

            toast.success('Отзыв отправлен!');
            setShowReviewForm(false);
            setReviewComment('');
            setReviewRating(5);
            setReviewImages([]);
            fetchSellerReviews();
        } catch (e: any) {
            console.error('Review error:', e);
            toast.error(e.message || 'Ошибка при отправке отзыва');
        } finally {
            setIsSubmittingReview(false);
        }
    };

    const handleSendMessage = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!newMessage.trim() || !ad) return;
        if (!currentUser) return router.push('/login');

        try {
            await chatService.sendMessage(ad.user_id, newMessage, ad.id);
            setNewMessage('');

            // Stop typing indicator
            if (chatChannelRef.current) {
                chatChannelRef.current.track({
                    user_id: currentUser.id,
                    is_typing: false,
                });
            }

            fetchMessages();
        } catch (e) { toast.error('Ошибка'); }
    };

    const handleTyping = (text: string) => {
        setNewMessage(text);

        if (!chatChannelRef.current || !currentUser) return;

        // Track typing
        chatChannelRef.current.track({
            user_id: currentUser.id,
            is_typing: true,
        });

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

        typingTimeoutRef.current = setTimeout(() => {
            if (chatChannelRef.current) {
                chatChannelRef.current.track({
                    user_id: currentUser.id,
                    is_typing: false,
                });
            }
        }, 2000);
    };

    const handleChatImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !ad || !currentUser) return;

        setIsUploadingChatImage(true);
        try {
            const fileName = `${currentUser.id}/${Date.now()}-${file.name}`;
            const { error: uploadError } = await supabase.storage
                .from('chat-images')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('chat-images')
                .getPublicUrl(fileName);

            await chatService.sendMessage(ad.user_id, '[Изображение]', ad.id, 'image', publicUrl);
            fetchMessages();
            toast.success('Фото отправлено');
        } catch (error) {
            console.error(error);
            toast.error('Ошибка при отправке фото');
        } finally {
            setIsUploadingChatImage(false);
        }
    };

    const handleShare = async () => {
        const url = window.location.href;
        try {
            if (navigator.clipboard) {
                await navigator.clipboard.writeText(url);
                toast.success('Ссылка скопирована в буфер обмена');
            } else {
                // Fallback for non-secure contexts
                const input = document.createElement('input');
                input.value = url;
                document.body.appendChild(input);
                input.select();
                document.execCommand('copy');
                document.body.removeChild(input);
                toast.success('Ссылка скопирована');
            }
        } catch (err) {
            toast.error('Не удалось скопировать ссылку');
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
        <div className="bg-background min-h-screen pb-40">
            {isZoomed && (
                <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-2 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setIsZoomed(false)}>
                    <button className="absolute top-4 right-4 p-2 bg-surface/20 rounded-full text-white hover:bg-surface/40 transition-all active:scale-90">
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
                            {ad.status === 'rejected' && (
                                <div className="flex items-center gap-1.5 px-3 py-1 bg-red-100 text-red-600 rounded-full text-[10px] font-black uppercase tracking-wider h-fit mt-1.5">
                                    <Ban className="h-3 w-3" />
                                    Заблокировано
                                </div>
                            )}
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
                                    <button onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(prev => (prev === 0 ? ad.images.length - 1 : prev - 1)); }} className="p-1.5 bg-surface/80 text-foreground rounded-full pointer-events-auto shadow-lg backdrop-blur-md hover:bg-surface transition-all active:scale-90">
                                        <ChevronLeft className="h-5 w-5" />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(prev => (prev === ad.images.length - 1 ? 0 : prev + 1)); }} className="p-1.5 bg-surface/80 text-foreground rounded-full pointer-events-auto shadow-lg backdrop-blur-md hover:bg-surface transition-all active:scale-90">
                                        <ChevronRight className="h-5 w-5" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Thumbnails - Grid/Wrap for no side scrolling */}
                        <div className="flex flex-wrap gap-2">
                            {ad.images.map((img: string, i: number) => (
                                <button key={i} onClick={() => setCurrentImageIndex(i)} className={cn("w-12 h-12 rounded-lg border-2 shrink-0 overflow-hidden transition-all", currentImageIndex === i ? "border-primary" : "border-transparent opacity-60 hover:opacity-100")}>
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
                                {!(ad.category?.slug === 'services' || ad.category?.slug === 'jobs' || ad.category?.slug === 'rent-commercial' || (ad.category?.slug === 'real-estate' && (ad.specifications?.type === 'house' || ad.specifications?.type === 'plot'))) && (
                                    <div className="flex justify-between py-1 border-b border-border/50 text-xs text-foreground/80">
                                        <span className="text-muted">{(ad.category?.slug === 'real-estate' && ad.specifications?.type === 'apartment') || ad.category?.slug === 'rent-apartments' ? 'Тип жилья' : 'Состояние'}</span>
                                        <span className="font-bold">
                                            {ad.condition === 'new' ? 'Новое' :
                                                ad.condition === 'used' ? 'Б/у' :
                                                    ad.condition === 'secondary' ? 'Вторичка' :
                                                        ad.condition === 'new_building' ? 'Новостройка' : ad.condition}
                                        </span>
                                    </div>
                                )}
                                <div className="flex justify-between py-1 border-b border-border/50 text-xs text-foreground/80">
                                    <span className="text-muted">Категория</span>
                                    <span className="font-bold text-primary">{ad.category?.name || 'Не указана'}</span>
                                </div>
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
                                        gender: 'Пол',
                                        rent_type: 'Срок аренды'
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
                                    if (k === 'rent_type') {
                                        if (v === 'daily') displayValue = 'Посуточно';
                                        if (v === 'long_term') displayValue = 'На долгий срок';
                                    }

                                    // Land and Building translations
                                    if (k === 'type') {
                                        if (v === 'plot') displayValue = 'Участок';
                                        if (v === 'house') displayValue = 'Дом';
                                        if (v === 'apartment') displayValue = 'Квартира';
                                        if (v === 'commercial') displayValue = 'Коммерция';
                                    }
                                    if (k === 'status') {
                                        if (v === 'izhs') displayValue = 'ИЖС';
                                        if (v === 'snt') displayValue = 'СНТ';
                                        if (v === 'dnp') displayValue = 'ДНП';
                                        if (v === 'prom') displayValue = 'Промназначение';
                                    }

                                    return (
                                        <div key={k} className="flex justify-between py-1 border-b border-border/50 text-xs">
                                            <span className="text-muted">{labels[k] || k}</span>
                                            <span className="font-bold">{displayValue}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Reviews Section */}
                        <div className="space-y-4 pt-6 border-t border-border/50">
                            <div className="flex items-center justify-between">
                                <h2 className="text-sm font-black uppercase tracking-wider text-muted-foreground">Отзывы о продавце</h2>
                                <div className="flex items-center gap-3">
                                    <Link href={`/user?id=${ad.user_id}&tab=reviews`} className="text-[10px] font-black uppercase text-primary hover:underline">Все отзывы</Link>
                                    {currentUser && currentUser.id !== ad.user_id && !showReviewForm && (
                                        <button
                                            onClick={() => setShowReviewForm(true)}
                                            className="px-3 py-1.5 bg-primary/10 text-primary text-[10px] font-black uppercase rounded-lg hover:bg-primary/20 transition-all"
                                        >
                                            Написать
                                        </button>
                                    )}
                                </div>
                            </div>

                            {showReviewForm && (
                                <div className="bg-surface p-5 rounded-2xl border-2 border-primary/20 shadow-lg animate-in slide-in-from-top-2 duration-300">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-xs font-black uppercase tracking-widest text-primary">Ваш отзыв</h3>
                                        <button onClick={() => setShowReviewForm(false)} className="p-1 hover:bg-muted rounded-full">
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                    <div className="flex gap-1 mb-4">
                                        {[1, 2, 3, 4, 5].map((s) => (
                                            <button key={s} onClick={() => setReviewRating(s)}>
                                                <Star className={cn("h-6 w-6 transition-all", s <= reviewRating ? "fill-orange-500 text-orange-500" : "text-muted hover:text-orange-300")} />
                                            </button>
                                        ))}
                                    </div>
                                    <textarea
                                        value={reviewComment}
                                        onChange={(e) => setReviewComment(e.target.value)}
                                        placeholder="Расскажите о сделке..."
                                        className="w-full h-24 p-4 text-xs font-bold rounded-2xl bg-muted/5 border border-border outline-none focus:border-primary transition-all resize-none"
                                    />

                                    <div className="flex flex-wrap gap-2 mt-4">
                                        {reviewImages.map((img, idx) => (
                                            <div key={idx} className="relative w-12 h-12 rounded-xl overflow-hidden border border-border group">
                                                <img src={img} className="w-full h-full object-cover" />
                                                <button
                                                    onClick={() => setReviewImages(prev => prev.filter((_, i) => i !== idx))}
                                                    className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X className="h-4 w-4 text-white" />
                                                </button>
                                            </div>
                                        ))}
                                        <label className="w-12 h-12 rounded-xl bg-muted/20 border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-all group">
                                            <Camera className="h-4 w-4 text-muted group-hover:text-primary transition-colors" />
                                            <input type="file" accept="image/*" multiple onChange={handleReviewImageUpload} className="hidden" />
                                        </label>
                                    </div>

                                    <button
                                        onClick={handleReviewSubmit}
                                        disabled={isSubmittingReview}
                                        className="w-full mt-4 h-11 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:shadow-lg disabled:opacity-50 transition-all"
                                    >
                                        {isSubmittingReview ? 'Отправка...' : 'Отправить отзыв'}
                                    </button>
                                </div>
                            )}

                            {reviewsLoading ? (
                                <div className="space-y-3">
                                    {[1, 2].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
                                </div>
                            ) : sellerReviews.length > 0 ? (
                                <div className="space-y-3">
                                    {sellerReviews.map((rev) => (
                                        <div key={rev.id} className="bg-surface/50 p-4 rounded-2xl border border-border/40">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="w-6 h-6 rounded-full bg-muted overflow-hidden">
                                                    {rev.reviewer?.avatar_url ? (
                                                        <img src={rev.reviewer.avatar_url} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary text-[8px] font-black">
                                                            {rev.reviewer?.full_name?.charAt(0).toUpperCase() || '?'}
                                                        </div>
                                                    )}
                                                </div>
                                                <span className="text-xs font-bold truncate max-w-[120px]">{rev.reviewer?.full_name}</span>
                                                <div className="flex gap-0.5 ml-auto">
                                                    {[...Array(5)].map((_, i) => (
                                                        <Star key={i} className={cn("h-2.5 w-2.5", i < rev.rating ? "fill-orange-500 text-orange-500" : "text-muted/30")} />
                                                    ))}
                                                </div>
                                            </div>
                                            <p className="text-xs text-foreground/80 leading-relaxed italic line-clamp-2">"{rev.comment}"</p>
                                            {rev.images?.length > 0 && (
                                                <div className="flex gap-1.5 mt-2 overflow-x-auto pb-1 scrollbar-hide">
                                                    {rev.images.map((img: string, idx: number) => (
                                                        <div key={idx} className="w-12 h-12 rounded-lg border border-border/50 overflow-hidden shrink-0">
                                                            <img src={getOptimizedImageUrl(img, { width: 100, quality: 60 })} className="w-full h-full object-cover" />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-muted/5 p-6 rounded-2xl border border-dashed border-border flex flex-col items-center justify-center text-center">
                                    <Star className="h-8 w-8 text-muted/20 mb-2" />
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-relaxed">
                                        У этого продавца пока нет отзывов.<br />Станьте первым!
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Interactive Map */}
                        {ad.latitude && ad.longitude && (
                            <div className="space-y-3 pt-2">
                                <h2 className="text-sm font-black uppercase tracking-wider text-muted-foreground">Местоположение</h2>
                                <div className="h-[200px] w-full rounded-2xl overflow-hidden border border-border shadow-sm">
                                    <YandexMapView pos={[ad.latitude, ad.longitude]} />
                                </div>
                                <div className="text-[10px] text-muted-foreground font-medium italic">
                                    {ad.address || ad.city}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Sidebar / Bottom Actions for Mobile */}
                    <div className="w-full lg:w-72 space-y-4">
                        {/* Admin Controls */}
                        {isAdmin && (
                            <div className="bg-red-500/5 backdrop-blur-md border border-red-500/20 p-4 rounded-2xl space-y-3">
                                <div className="text-[10px] font-black text-red-600/80 uppercase tracking-widest">Панель администратора</div>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={async () => {
                                            if (confirm('Удалить это объявление?')) {
                                                const { error } = await supabase.from('ads').delete().eq('id', id);
                                                if (!error) {
                                                    toast.success('Объявление удалено');
                                                    router.push('/');
                                                }
                                            }
                                        }}
                                        className="bg-red-600 text-white text-[11px] font-black h-9 rounded-xl hover:bg-red-700 transition-all active:scale-95 shadow-sm"
                                    >
                                        Удалить
                                    </button>
                                    <button
                                        onClick={async () => {
                                            const newStatus = ad.status === 'rejected' ? 'active' : 'rejected';
                                            const { error } = await supabase.from('ads').update({ status: newStatus }).eq('id', id);
                                            if (!error) {
                                                toast.success(newStatus === 'rejected' ? 'Объявление заблокировано' : 'Объявление разблокировано');
                                                setAd({ ...ad, status: newStatus });
                                            }
                                        }}
                                        className={cn(
                                            "text-white text-[11px] font-black h-9 rounded-xl transition-all active:scale-95 shadow-sm",
                                            ad.status === 'rejected' ? "bg-green-600 hover:bg-green-700" : "bg-orange-500 hover:bg-orange-600"
                                        )}
                                    >
                                        {ad.status === 'rejected' ? 'Разбанить' : 'Бан'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Seller Card - Compact */}
                        <Link href={`/user?id=${ad.user_id}`} className="bg-white/40 p-4 rounded-2xl border border-white/60 backdrop-blur-xl flex items-center gap-3 hover:bg-white/60 transition-all active:scale-98 shadow-sm">
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
                                    <span className="text-muted-foreground font-medium ml-1">({sellerReviews.length > 0 ? sellerReviews.length : '0'} отзывов)</span>
                                </div>
                            </div>
                        </Link>

                        {/* Mini Chat Window */}
                        <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-sm flex flex-col">
                            {showChat ? (
                                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 flex flex-col h-[380px]">
                                    <div className="p-3 border-b border-border flex justify-between items-center bg-muted/5">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-black uppercase tracking-wider">Чат с продавцом</span>
                                            {isOtherUserTyping && (
                                                <span className="text-[10px] text-primary animate-pulse font-bold">печатает...</span>
                                            )}
                                        </div>
                                        <button onClick={() => setShowChat(false)} className="p-1 hover:bg-muted rounded-full">
                                            <X className="h-4 w-4 text-muted-foreground" />
                                        </button>
                                    </div>

                                    <div id="mini-chat-messages" className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-none bg-background/30">
                                        {messages.length > 0 ? (
                                            messages.map((msg) => (
                                                <div key={msg.id} className={cn(
                                                    "max-w-[85%] p-2.5 rounded-2xl text-[13px] leading-tight shadow-sm overflow-hidden",
                                                    msg.sender_id === currentUser?.id
                                                        ? "ml-auto bg-primary text-white rounded-br-none"
                                                        : "mr-auto bg-surface border border-border rounded-bl-none"
                                                )}>
                                                    {msg.type === 'image' ? (
                                                        <a href={msg.attachment_url} target="_blank" className="block -m-1">
                                                            <img src={msg.attachment_url} className="w-full max-h-60 object-cover rounded-xl" alt="Chat" />
                                                        </a>
                                                    ) : (
                                                        msg.content
                                                    )}
                                                    <div className={cn(
                                                        "text-[9px] mt-1 flex items-center justify-end gap-1",
                                                        msg.sender_id === currentUser?.id ? "text-white/70" : "text-muted"
                                                    )}>
                                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        {msg.sender_id === currentUser?.id && (
                                                            msg.is_read ? (
                                                                <CheckCheck className="h-3 w-3 text-white" />
                                                            ) : (
                                                                <Check className="h-3 w-3 text-white/50" />
                                                            )
                                                        )}
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

                                    <form onSubmit={handleSendMessage} className="p-2 border-t border-border bg-muted/5 flex gap-2 items-center">
                                        <label className="p-2 text-muted-foreground hover:text-primary cursor-pointer transition-colors">
                                            {isUploadingChatImage ? (
                                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                                            ) : (
                                                <Paperclip className="h-4 w-4" />
                                            )}
                                            <input type="file" className="hidden" accept="image/*" onChange={handleChatImageUpload} disabled={isUploadingChatImage} />
                                        </label>
                                        <input
                                            value={newMessage}
                                            onChange={(e) => handleTyping(e.target.value)}
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

                        {/* Banners and Footer Links - only show when banners are enabled */}
                        <AdPageSidebar />
                    </div>
                </div>
            </div>
        </div>
    );
}

// Separate component for banners in ad page - includes label and footer
function AdPageSidebar() {
    const [banners, setBanners] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [bannersEnabled, setBannersEnabled] = useState(true);

    useEffect(() => {
        fetchBanners();
    }, []);

    const fetchBanners = async () => {
        try {
            // Check global setting first
            const { data: settings } = await supabase.from('app_settings').select('value').eq('key', 'banners_ad_page_enabled').single();
            if (settings && settings.value === 'false') {
                setBannersEnabled(false);
                setLoading(false);
                return;
            }

            const { data } = await supabase
                .from('banners')
                .select('*')
                .eq('is_active', true);

            if (data) {
                // Shuffle and limit to 2 for ad page sidebar
                const shuffled = data.sort(() => Math.random() - 0.5).slice(0, 2);
                setBanners(shuffled);

                // Track impressions
                shuffled.forEach(banner => {
                    supabase.rpc('increment_banner_impression', { banner_id: banner.id }).then(({ error }) => {
                        if (error) {
                            supabase.from('banners').update({ impressions_count: (banner.impressions_count || 0) + 1 }).eq('id', banner.id);
                        }
                    });
                });
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    // Don't render anything if banners are disabled or no banners
    if (!bannersEnabled || banners.length === 0) {
        return null;
    }

    if (loading) return (
        <div className="space-y-3">
            <div className="w-full aspect-video bg-muted/20 animate-pulse rounded-2xl" />
        </div>
    );

    return (
        <div className="hidden lg:block space-y-4 pt-4 border-t border-border/50">
            <div className="text-[10px] font-black tracking-widest text-muted-foreground uppercase mb-2 px-1">Реклама</div>
            <div className="space-y-3">
                {banners.filter(b => b.image_url).map(banner => (
                    <a
                        key={banner.id}
                        href={banner.link_url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => {
                            supabase.rpc('increment_banner_click', { banner_id: banner.id }).then(({ error }) => {
                                if (error) {
                                    supabase.from('banners').update({ clicks_count: (banner.clicks_count || 0) + 1 }).eq('id', banner.id);
                                }
                            });
                        }}
                        className="group relative w-full aspect-video rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all border border-border/50 bg-surface block"
                    >
                        <img
                            src={banner.image_url}
                            alt={banner.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                    </a>
                ))}
            </div>
            <div className="pt-6 text-[10px] text-muted-foreground font-medium text-center opacity-60">
                © 2026 Авоська+ <br />
                <Link href="/privacy" className="hover:underline">Конфиденциальность</Link> • <Link href="/terms" className="hover:underline">Оферта</Link>
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

