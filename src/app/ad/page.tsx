'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { Skeleton } from '@/components/ui/Skeleton';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { PhotoProvider, PhotoView } from 'react-photo-view';
import 'react-photo-view/dist/react-photo-view.css';
import { getOptimizedImageUrl } from '@/lib/image-utils';
import { supabase } from '@/lib/supabase/client';
import { chatService } from '@/lib/supabase/chatService';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    Heart,
    Share2,
    ShieldCheck,
    Star,
    CircleCheck,
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
    Camera,
    Clock,
    Flag,
    MessageCircle,
    Megaphone,
    Smartphone,
    Eye,
    Phone,
    Sparkles,
    Zap,
    CircleAlert,
    Palette,
    CircleArrowUp
} from 'lucide-react';
import UserBannerCheckoutModal from '@/components/UserBannerCheckoutModal';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { getShareableUrl } from '@/lib/share';
import { compressImage } from '@/lib/image-utils';

// Dynamic imports для оптимизации bundle
const YandexMapView = dynamic(() => import('@/components/YandexMapView'), {
    ssr: false,
    loading: () => <div className="h-[200px] w-full bg-surface animate-pulse rounded-2xl flex items-center justify-center font-semibold text-[10px] uppercase tracking-widest text-muted opacity-30">Карта...</div>
});

const RightSidebar = dynamic(() => import('@/components/layout/RightSidebar'), {
    ssr: false,
    loading: () => <div className="hidden lg:block w-[300px] bg-surface animate-pulse rounded-2xl" />
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
    const [sellerAds, setSellerAds] = useState<any[]>([]);
    const [reviewsLoading, setReviewsLoading] = useState(false);

    useEffect(() => {
        if (ad?.user_id) {
            fetchSellerReviews();
            fetchSellerAds();
        }
    }, [ad?.user_id]);

    const fetchSellerAds = async () => {
        if (!ad?.user_id) return;
        try {
            const { data } = await supabase
                .from('ads')
                .select('id')
                .eq('user_id', ad.user_id)
                .eq('status', 'active');
            setSellerAds(data || []);
        } catch (e) {
            console.error('Error fetching seller ads:', e);
        }
    };

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

        try {
            const { data, error } = await supabase
                .from('ads')
                .select(`*, user_id, profiles:user_id (*), category:category_id (*)`)
                .eq('id', id)
                .single();

            if (error) {
                console.error('Error fetching ad:', error);
                if (error.code === 'PGRST116') {
                    toast.error('Объявление не найдено');
                    router.push('/');
                } else {
                    toast.error('Ошибка загрузки. Попробуйте войти снова.');
                    // If it's an auth-related error, redirect to login
                    if (error.message?.includes('JWT') || error.message?.includes('token')) {
                        router.push('/login');
                    }
                }
                return;
            }

            setAd(data);
            setLoading(false);

            // Increment view count if not already viewed in this session
            const viewedAds = JSON.parse(sessionStorage.getItem('viewed_ads') || '[]');
            if (!viewedAds.includes(id)) {
                try {
                    // Update UI immediately (optimistic but for views usually we wait or do it sync)
                    // Let's do it after RPC success for accuracy
                    const { error: rpcError } = await supabase.rpc('increment_ad_view', { ad_id: id });
                    if (!rpcError) {
                        viewedAds.push(id);
                        sessionStorage.setItem('viewed_ads', JSON.stringify(viewedAds));
                        // After successful increment, update local state to show +1 immediately
                        setAd((prev: any) => prev ? { ...prev, views_count: (prev.views_count || 0) + 1 } : null);
                    }
                } catch (e) {
                    console.error('Error incrementing view:', e);
                }
            }
        } catch (err: any) {
            console.error('Unexpected fetchAd error:', err);
            toast.error('Произошла ошибка при загрузке');
            setLoading(false);
        }
    };

    const handleContactClick = async (type: 'call' | 'chat') => {
        if (!ad) return;

        // Visual feedback based on type
        if (type === 'chat') {
            setShowChat(true);
        }

        // Increment contact counter
        try {
            await supabase.rpc('increment_ad_contact', { ad_id: ad.id });
        } catch (e) {
            console.error('Error incrementing contact:', e);
        }
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
        const title = ad?.title || 'Объявление на Авоська+';

        try {
            if (navigator.share) {
                await navigator.share({
                    title: title,
                    url: url
                });
            } else if (navigator.clipboard) {
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
            if ((err as Error).name !== 'AbortError') {
                toast.error('Не удалось поделиться ссылкой');
            }
        }
    };

    const handleReport = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            toast.error('Войдите, чтобы отправить жалобу');
            return router.push('/login');
        }

        const reason = prompt('Укажите причину жалобы (например: спам, мошенничество, запрещенный товар):');
        if (!reason || !reason.trim()) return;

        try {
            const { error } = await supabase
                .from('reports')
                .insert({
                    ad_id: id,
                    reporter_id: session.user.id,
                    reason: reason.trim()
                });

            if (error) throw error;
            toast.success('Жалоба отправлена модератору');
        } catch (e: any) {
            toast.error('Ошибка: ' + e.message);
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-background p-4 flex flex-col gap-4">
            <Skeleton className="h-[300px] w-full rounded-2xl" />
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
        </div>
    );

    if (!ad) return <div className="p-10 text-center text-muted-foreground font-semibold uppercase tracking-widest opacity-50">Объявление не найдено</div>;

    // JSON-LD Product Schema for SEO
    const productSchema = {
        "@context": "https://schema.org/",
        "@type": "Product",
        "name": ad.title,
        "image": ad.images,
        "description": ad.description,
        "brand": {
            "@type": "Brand",
            "name": "Avoska"
        },
        "offers": {
            "@type": "Offer",
            "url": typeof window !== 'undefined' ? window.location.href : '',
            "priceCurrency": "RUB",
            "price": ad.price,
            "availability": "https://schema.org/InStock"
        }
    };


    return (
        <div className="bg-background min-h-screen pb-40">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
            />
            {/* Custom full-screen viewer removed in favor of react-photo-view */}

            {/* Navigation Breadcrumbs - New */}
            <nav className="flex items-center gap-1.5 text-[10px] sm:text-xs font-medium text-muted-foreground/60 mb-5 overflow-hidden whitespace-nowrap">
                <Link href="/" className="hover:text-primary transition-colors">Главная</Link>
                <ChevronRight className="h-3 w-3 shrink-0" />
                <Link href="/categories" className="hover:text-primary transition-colors">Категории</Link>
                {ad.category && (
                    <>
                        <ChevronRight className="h-3 w-3 shrink-0" />
                        <Link href={`/category?slug=${ad.category.slug}`} className="hover:text-primary transition-colors max-w-[100px] truncate">{ad.category.name}</Link>
                    </>
                )}
                <ChevronRight className="h-3 w-3 shrink-0" />
                <span className="text-foreground/40 max-w-[150px] truncate">{ad.title}</span>
            </nav>

            {/* Back Button */}
            <button
                onClick={() => router.back()}
                className="flex items-center gap-1.5 text-primary font-bold text-[10px] uppercase tracking-widest mb-6 hover:opacity-70 transition-all active:scale-95 group"
                aria-label="Назад"
            >
                <div className="w-7 h-7 bg-primary/10 rounded-full flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
                    <ChevronLeft className="h-4 w-4" />
                </div>
                <span>Вернуться к поиску</span>
            </button>

            {/* Header: Title + Price (Super Compact) */}
            <div className="mb-3">
                <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-xl md:text-2xl font-bold leading-tight flex-1">{ad.title}</h1>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-surface border border-border/50 rounded-full text-[10px] font-bold text-muted-foreground shadow-sm">
                        <Eye className="h-3 w-3" />
                        <span>{ad.views_count || 0}</span>
                    </div>
                </div>
                <div className="flex items-center justify-between">
                    <div className="text-2xl font-bold text-primary lg:hidden">
                        {ad.price ? `${ad.price.toLocaleString()} ₽` : 'Договорная'}
                    </div>
                    <div className="flex gap-2 ml-auto items-center">
                        {ad.status === 'pending' && (
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-[10px] font-semibold uppercase tracking-wider">
                                <Clock className="h-3 w-3" />
                                На проверке
                            </div>
                        )}
                        {ad.status === 'rejected' && (
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-red-100 text-red-600 rounded-full text-[10px] font-semibold uppercase tracking-wider">
                                <Ban className="h-3 w-3" />
                                Заблокировано
                            </div>
                        )}
                        <button
                            onClick={toggleFavorite}
                            className={cn("p-2 rounded-full transition-colors", isFavorite ? "text-red-500 bg-red-50" : "text-muted hover:bg-muted/10")}
                            title="В избранное"
                            aria-label={isFavorite ? "Удалить из избранного" : "Добавить в избранное"}
                        >
                            <Heart className={cn("h-6 w-6", isFavorite && "fill-current")} />
                        </button>
                        <button
                            onClick={handleShare}
                            className="p-2 text-muted hover:bg-muted/10 rounded-full transition-colors"
                            title="Поделиться"
                            aria-label="Поделиться"
                        >
                            <Share2 className="h-6 w-6" />
                        </button>
                        <button
                            onClick={handleReport}
                            className="p-2 text-muted hover:bg-red-50 hover:text-red-500 rounded-full transition-colors"
                            title="Пожаловаться"
                            aria-label="Пожаловаться"
                        >
                            <Flag className="h-6 w-6" />
                        </button>
                    </div>
                </div>
            </div>

            {/* City Line - Clickable Map */}
            <a
                href={`https://yandex.ru/maps/?text=${encodeURIComponent(ad.city + (ad.address ? ', ' + ad.address : ''))}`}
                target="_blank"
                className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-4 hover:text-primary transition-colors"
            >
                <MapPin className="h-3.5 w-3.5" />
                <span>{ad.city}{ad.address ? `, ${ad.address}` : ''}</span>
                <span className="text-[10px] opacity-60 ml-1">(на карте)</span>
            </a>

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Main Section */}
                <div className="flex-1 space-y-5">
                    {/* Image - Truly responsive container */}
                    <div className="relative w-full aspect-[4/3] md:min-h-[450px] md:aspect-[16/9] max-h-[80vh] flex items-center justify-center bg-zinc-950 rounded-2xl overflow-hidden group shadow-xl cursor-zoom-in">
                        {ad.images && ad.images.length > 0 ? (
                            <>
                                <div className="absolute top-2 right-2 bg-black/30 backdrop-blur-md p-1.5 rounded-lg text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                                    <Maximize2 className="h-4 w-4" />
                                </div>

                                <PhotoProvider
                                    maskOpacity={0.9}
                                    bannerVisible={false}
                                    onIndexChange={(index) => setCurrentImageIndex(index)}
                                >
                                    <div className="absolute inset-0 w-full h-full">
                                        <AnimatePresence mode="wait" initial={false}>
                                            <motion.div
                                                key={currentImageIndex}
                                                className="absolute inset-0 w-full h-full"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                transition={{ duration: 0.2 }}
                                                drag="x"
                                                dragConstraints={{ left: 0, right: 0 }}
                                                dragElastic={0.4}
                                                onDragEnd={(e, { offset }) => {
                                                    const swipe = offset.x;
                                                    if (swipe < -40) {
                                                        setCurrentImageIndex(prev => (prev === ad.images.length - 1 ? 0 : prev + 1));
                                                    } else if (swipe > 40) {
                                                        setCurrentImageIndex(prev => (prev === 0 ? ad.images.length - 1 : prev - 1));
                                                    }
                                                }}
                                            >
                                                <div className="absolute inset-0 w-full h-full z-10 overflow-hidden bg-zinc-900">
                                                    {/* Blurred Background Layer */}
                                                    <OptimizedImage
                                                        src={ad.images[currentImageIndex]}
                                                        alt=""
                                                        aria-hidden="true"
                                                        className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-40 scale-110 pointer-events-none"
                                                        priority
                                                    />
                                                    
                                                    {/* Sharp Foreground Layer */}
                                                    <PhotoView src={ad.images[currentImageIndex]}>
                                                        <div className="relative w-full h-full z-20 flex items-center justify-center cursor-zoom-in">
                                                            <OptimizedImage
                                                                src={ad.images[currentImageIndex]}
                                                                width={1200}
                                                                alt="Фото объявления"
                                                                objectFit="contain"
                                                            />
                                                        </div>
                                                    </PhotoView>
                                                </div>
                                            </motion.div>
                                        </AnimatePresence>
                                    </div>
                                </PhotoProvider>

                                {ad.images.length > 1 && (
                                    <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 flex justify-between pointer-events-none z-30">
                                        <button onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(prev => (prev === 0 ? ad.images.length - 1 : prev - 1)); }} className="p-1.5 bg-surface/80 text-foreground rounded-full pointer-events-auto shadow-lg backdrop-blur-md hover:bg-surface transition-all active:scale-90" aria-label="Предыдущее фото">
                                            <ChevronLeft className="h-5 w-5" />
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(prev => (prev === ad.images.length - 1 ? 0 : prev + 1)); }} className="p-1.5 bg-surface/80 text-foreground rounded-full pointer-events-auto shadow-lg backdrop-blur-md hover:bg-surface transition-all active:scale-90" aria-label="Следующее фото">
                                            <ChevronRight className="h-5 w-5" />
                                        </button>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center text-muted italic gap-2">
                                <ImageIcon className="h-12 w-12 opacity-20" />
                                <span className="text-sm font-semibold tracking-widest uppercase opacity-50">Нет фото</span>
                            </div>
                        )}
                    </div>

                    {/* Thumbnails - Improved with horizontal scroll for many photos */}
                    {ad.images && ad.images.length > 0 && (
                        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory">
                            {ad.images.map((img: string, i: number) => (
                                <button
                                    key={i}
                                    onClick={() => setCurrentImageIndex(i)}
                                    className={cn(
                                        "relative shrink-0 w-20 h-20 md:w-24 md:h-24 rounded-xl border-2 overflow-hidden transition-all snap-start bg-zinc-900 flex items-center justify-center",
                                        currentImageIndex === i
                                            ? "border-primary shadow-lg scale-105 ring-2 ring-primary/20 ring-offset-2 ring-offset-background"
                                            : "border-transparent opacity-60 hover:opacity-100 hover:scale-105"
                                    )}
                                    aria-label={`Выбрать фото ${i + 1}`}
                                >
                                    <div className="relative w-full h-full bg-zinc-800">
                                        {/* Blurred Background for Thumbnail */}
                                        <OptimizedImage
                                            src={img}
                                            alt=""
                                            aria-hidden="true"
                                            className="absolute inset-0 w-full h-full object-cover blur-md opacity-50 scale-110"
                                        />
                                        {/* Foreground Thumbnail */}
                                        <OptimizedImage
                                            src={img}
                                            width={150}
                                            alt={`Фото ${i + 1}`}
                                            objectFit="contain"
                                            className="relative z-10"
                                        />
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Description - Compact */}
                    <div className="space-y-2">
                        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Описание</h2>
                        <p className="text-sm font-medium leading-normal text-foreground/90 whitespace-pre-wrap">{ad.description}</p>
                    </div>

                    {/* Characteristics - Compact Table style */}
                    <div className="space-y-2">
                        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Характеристики</h2>
                        <div className="grid grid-cols-1 gap-1">
                            {!(ad.category?.slug === 'services' || ad.category?.slug === 'jobs' || ad.category?.slug === 'rent-commercial' || (ad.category?.slug === 'real-estate' && (ad.specifications?.type === 'house' || ad.specifications?.type === 'plot'))) && (
                                <div className="flex justify-between py-1 border-b border-border/50 text-xs text-foreground/80">
                                    <span className="text-muted">{(ad.category?.slug === 'real-estate' && ad.specifications?.type === 'apartment') || ad.category?.slug === 'rent-apartments' ? 'Тип жилья' : 'Состояние'}</span>
                                    <span className="font-semibold">
                                        {ad.condition === 'new' ? 'Новое' :
                                            ad.condition === 'used' ? 'Б/у' :
                                                ad.condition === 'secondary' ? 'Вторичка' :
                                                    ad.condition === 'new_building' ? 'Новостройка' : ad.condition}
                                    </span>
                                </div>
                            )}
                            <div className="flex justify-between py-1 border-b border-border/50 text-xs text-foreground/80">
                                <span className="text-muted">Категория</span>
                                <span className="font-semibold text-primary">{ad.category?.name || 'Не указана'}</span>
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
                                        <span className="font-semibold">{displayValue}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Reviews Section */}
                    <div className="space-y-4 pt-6 border-t border-border/50">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Отзывы о продавце</h2>
                            <div className="flex items-center gap-3">
                                <Link prefetch={false} href={`/user?id=${ad.user_id}&tab=reviews`} className="text-[10px] font-semibold uppercase text-primary hover:underline">Все отзывы</Link>
                                {currentUser && currentUser.id !== ad.user_id && !showReviewForm && (
                                    <button
                                        onClick={() => setShowReviewForm(true)}
                                        className="px-3 py-1.5 bg-primary/10 text-primary text-[10px] font-semibold uppercase rounded-lg hover:bg-primary/20 transition-all"
                                    >
                                        Написать
                                    </button>
                                )}
                            </div>
                        </div>

                        {showReviewForm && (
                            <div className="bg-surface p-5 rounded-2xl border-2 border-primary/20 shadow-lg animate-in slide-in-from-top-2 duration-300">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-xs font-semibold uppercase tracking-widest text-primary">Ваш отзыв</h3>
                                    <button onClick={() => setShowReviewForm(false)} className="p-1 hover:bg-muted rounded-full" aria-label="Закрыть форму">
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                                <div className="flex gap-1 mb-4">
                                    {[1, 2, 3, 4, 5].map((s) => (
                                        <button key={s} onClick={() => setReviewRating(s)} aria-label={`Оценка ${s}`}>
                                            <Star className={cn("h-6 w-6 transition-all", s <= reviewRating ? "fill-orange-500 text-orange-500" : "text-muted hover:text-orange-300")} />
                                        </button>
                                    ))}
                                </div>
                                <textarea
                                    value={reviewComment}
                                    onChange={(e) => setReviewComment(e.target.value)}
                                    placeholder="Расскажите о сделке..."
                                    className="w-full h-24 p-4 text-xs font-semibold rounded-2xl bg-muted/5 border border-border outline-none focus:border-primary transition-all resize-none"
                                />

                                <div className="flex flex-wrap gap-2 mt-4">
                                    {reviewImages.map((img, idx) => (
                                        <div key={idx} className="relative w-12 h-12 rounded-xl overflow-hidden border border-border group">
                                            <img src={img} className="w-full h-full object-cover" alt="Загруженное фото" />
                                            <button
                                                onClick={() => setReviewImages(prev => prev.filter((_, i) => i !== idx))}
                                                className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                aria-label="Удалить фото"
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
                                    className="w-full mt-4 h-11 bg-primary text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:shadow-lg disabled:opacity-50 transition-all"
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
                                                    <img src={rev.reviewer.avatar_url} className="w-full h-full object-cover" alt="Аватар" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary text-[8px] font-semibold">
                                                        {rev.reviewer?.full_name?.charAt(0).toUpperCase() || '?'}
                                                    </div>
                                                )}
                                            </div>
                                            <span className="text-xs font-semibold truncate max-w-[120px]">{rev.reviewer?.full_name}</span>
                                            <div className="flex gap-0.5 ml-auto">
                                                {[...Array(5)].map((_, i) => (
                                                    <Star key={i} className={cn("h-2.5 w-2.5", i < rev.rating ? "fill-orange-500 text-orange-500" : "text-muted/30")} />
                                                ))}
                                            </div>
                                        </div>
                                        <p className="text-xs text-foreground/80 leading-relaxed italic line-clamp-2">"{rev.comment}"</p>
                                        {rev.images?.length > 0 && (
                                            <PhotoProvider>
                                                <div className="flex gap-1.5 mt-2 overflow-x-auto pb-1 scrollbar-hide">
                                                    {rev.images.map((img: string, idx: number) => (
                                                        <PhotoView key={idx} src={img}>
                                                            <div className="w-12 h-12 rounded-lg border border-border/50 overflow-hidden shrink-0 cursor-zoom-in">
                                                                <OptimizedImage
                                                                    src={img}
                                                                    width={100}
                                                                    height={100}
                                                                    className="w-full h-full object-cover"
                                                                    alt="Фото отзыва"
                                                                />
                                                            </div>
                                                        </PhotoView>
                                                    ))}
                                                </div>
                                            </PhotoProvider>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-muted/5 p-6 rounded-2xl border border-dashed border-border flex flex-col items-center justify-center text-center">
                                <Star className="h-8 w-8 text-muted/20 mb-2" />
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest leading-relaxed">
                                    У этого продавца пока нет отзывов.<br />Станьте первым!
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Interactive Map */}
                    {ad.latitude && ad.longitude && (
                        <div className="space-y-3 pt-2">
                            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Местоположение</h2>
                            <div className="h-[200px] w-full rounded-2xl overflow-hidden border border-border shadow-sm">
                                <YandexMapView pos={[ad.latitude, ad.longitude]} />
                            </div>
                            <div className="text-[10px] text-muted-foreground font-medium italic">
                                {ad.address || ad.city}
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar / Actions */}
                <div className="w-full lg:w-[320px] space-y-6">
                    {/* Desktop Price Block - Avito Style */}
                    <div className="hidden lg:block bg-surface/50 backdrop-blur-md p-6 rounded-[2.5rem] border border-border shadow-2xl shadow-black/5">
                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 mb-2">Стоимость</div>
                        <div className="text-4xl font-black text-foreground tracking-tight mb-6">
                            {ad.price ? `${ad.price.toLocaleString()} ₽` : 'Договорная'}
                        </div>
                        <div className="space-y-3">
                            <a
                                href={ad.profiles?.phone ? `tel:${ad.profiles.phone}` : '#'}
                                className="w-full h-14 bg-green-600 text-white rounded-2xl flex items-center justify-center gap-3 font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-600/20 active:scale-95"
                            >
                                <Smartphone className="h-5 w-5" />
                                <span>Показать телефон</span>
                            </a>
                            <button
                                onClick={() => handleContactClick('chat')}
                                className="w-full h-14 bg-primary text-white rounded-2xl flex items-center justify-center gap-3 font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 active:scale-95"
                            >
                                <MessageCircle className="h-5 w-5" />
                                <span>Написать сообщение</span>
                            </button>
                        </div>
                    </div>

                    {/* Admin Controls */}
                    {isAdmin && (
                        <div className="bg-red-500/5 backdrop-blur-md border border-red-500/20 p-5 rounded-[2.5rem] space-y-4 shadow-xl shadow-red-500/5 animate-in fade-in slide-in-from-right-2 duration-500">
                            <div className="flex items-center justify-between px-1">
                                <div className="text-[10px] font-black text-red-600/70 uppercase tracking-[0.2em]">Панель Админа</div>
                                <div className={cn(
                                    "px-2 py-0.5 rounded-full text-[8px] font-black uppercase",
                                    ad.status === 'pending' ? "bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/20" :
                                        ad.status === 'active' ? "bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20" :
                                            "bg-red-500/10 text-red-600 ring-1 ring-red-500/20"
                                )}>
                                    {ad.status === 'pending' ? 'Ожидает' : ad.status === 'active' ? 'Активно' : 'Бан'}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                {/* Main Status Controls */}
                                {ad.status === 'pending' && (
                                    <button
                                        onClick={async () => {
                                            const { error } = await supabase.from('ads').update({ status: 'active' }).eq('id', id);
                                            if (!error) {
                                                toast.success('Объявление одобрено');
                                                setAd({ ...ad, status: 'active' });
                                            }
                                        }}
                                        className="col-span-2 bg-emerald-600 text-white text-[11px] font-black h-12 rounded-2xl hover:bg-emerald-700 transition-all active:scale-95 shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                                    >
                                        <CircleCheck className="h-4 w-4" />
                                        <span>ОДОБРИТЬ</span>
                                    </button>
                                )}

                                <button
                                    onClick={async () => {
                                        const { error } = await supabase.rpc('up_ad', { ad_id: id });
                                        if (error) {
                                            const { error: updateError } = await supabase.from('ads').update({ created_at: new Date().toISOString() }).eq('id', id);
                                            if (updateError) throw updateError;
                                        }
                                        toast.success('Объявление поднято в ленте');
                                        setAd({ ...ad, created_at: new Date().toISOString() });
                                    }}
                                    className="col-span-2 bg-white border border-border text-foreground text-[10px] font-black h-10 rounded-xl hover:bg-surface hover:border-primary/30 transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <CircleArrowUp className="h-4 w-4 text-primary" />
                                    <span>ПОДНЯТЬ ВВЕРХ</span>
                                </button>

                                {/* Promotion Toggles */}
                                <button
                                    onClick={async () => {
                                        const newValue = !ad.is_vip;
                                        const { error } = await supabase.from('ads').update({ is_vip: newValue }).eq('id', id);
                                        if (!error) {
                                            toast.success(newValue ? 'Статус VIP активирован' : 'Статус VIP снят');
                                            setAd({ ...ad, is_vip: newValue });
                                        }
                                    }}
                                    className={cn(
                                        "text-[10px] font-bold h-10 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 border",
                                        ad.is_vip ? "bg-amber-500 text-white border-transparent" : "bg-white text-muted-foreground border-border hover:bg-amber-50"
                                    )}
                                >
                                    <Zap className="h-3.5 w-3.5" />
                                    <span>VIP</span>
                                </button>

                                <button
                                    onClick={async () => {
                                        const newValue = !ad.is_urgent;
                                        const { error } = await supabase.from('ads').update({ is_urgent: newValue }).eq('id', id);
                                        if (!error) {
                                            toast.success(newValue ? 'Срочно: Да' : 'Срочно: Нет');
                                            setAd({ ...ad, is_urgent: newValue });
                                        }
                                    }}
                                    className={cn(
                                        "text-[10px] font-bold h-10 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 border",
                                        ad.is_urgent ? "bg-red-500 text-white border-transparent" : "bg-white text-muted-foreground border-border hover:bg-red-50"
                                    )}
                                >
                                    <CircleAlert className="h-3.5 w-3.5" />
                                    <span>СРОЧНО</span>
                                </button>

                                <button
                                    onClick={async () => {
                                        const newValue = !ad.is_color_highlight;
                                        const { error } = await supabase.from('ads').update({ is_color_highlight: newValue }).eq('id', id);
                                        if (!error) {
                                            toast.success(newValue ? 'Выделение цветом ВКЛ' : 'Выделение цветом ВЫКЛ');
                                            setAd({ ...ad, is_color_highlight: newValue });
                                        }
                                    }}
                                    className={cn(
                                        "text-[10px] font-bold h-10 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 border",
                                        ad.is_color_highlight ? "bg-blue-500 text-white border-transparent" : "bg-white text-muted-foreground border-border hover:bg-blue-50"
                                    )}
                                >
                                    <Palette className="h-3.5 w-3.5" />
                                    <span>ЦВЕТ</span>
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
                                        "text-[10px] font-bold h-10 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 border",
                                        ad.status === 'rejected' ? "bg-green-600 text-white border-transparent" : "bg-white text-red-500 border-red-500/20 hover:bg-red-500 hover:text-white"
                                    )}
                                >
                                    <Ban className="h-3.5 w-3.5" />
                                    <span>{ad.status === 'rejected' ? 'UNBAN' : 'БАН'}</span>
                                </button>

                                <button
                                    onClick={async () => {
                                        if (confirm('ВНИМАНИЕ! Вы удаляете объявление безвозвратно. Продолжить?')) {
                                            const { error } = await supabase.from('ads').delete().eq('id', id);
                                            if (!error) {
                                                toast.success('Объявление удалено навсегда');
                                                router.push('/');
                                            }
                                        }
                                    }}
                                    className="col-span-2 mt-2 bg-zinc-900 text-white/50 text-[9px] font-black h-8 rounded-lg hover:bg-black hover:text-red-500 transition-all active:scale-95 flex items-center justify-center gap-1.5 uppercase tracking-widest border border-white/5"
                                >
                                    УДАЛИТЬ НАВСЕГДА
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Seller Card - Elevated */}
                    <div className="bg-white/50 backdrop-blur-md p-6 rounded-[2.5rem] border border-border shadow-xl shadow-black/5 space-y-5">
                        <div className="flex items-center justify-between">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 text-center flex-1">Продавец</h3>
                        </div>

                        <Link prefetch={false} href={`/user?id=${ad.user_id}`} className="flex flex-col items-center text-center gap-3 active:scale-98 transition-transform group">
                            <div className="relative">
                                <div className="w-20 h-20 rounded-full bg-muted overflow-hidden border-4 border-white shadow-md group-hover:shadow-lg transition-all">
                                    {ad.profiles?.avatar_url ? (
                                        <img src={ad.profiles.avatar_url} className="w-full h-full object-cover" alt="Seller" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary text-2xl font-black">
                                            {ad.profiles?.full_name?.charAt(0).toUpperCase() || 'P'}
                                        </div>
                                    )}
                                </div>
                                {ad.profiles?.is_verified && (
                                    <div className="absolute bottom-0 right-0 bg-blue-500 text-white rounded-full p-1.5 border-2 border-white shadow-sm">
                                        <ShieldCheck className="h-3 w-3" />
                                    </div>
                                )}
                            </div>
                            <div className="space-y-1">
                                <div className="font-extrabold text-lg text-foreground group-hover:text-primary transition-colors">{ad.profiles?.full_name || 'Частное лицо'}</div>
                                <div className="flex items-center justify-center gap-2">
                                    <div className="flex items-center gap-1 bg-orange-500/10 text-orange-600 px-2 py-0.5 rounded-lg text-[10px] font-black">
                                        <Star className="h-3 w-3 fill-current" />
                                        <span>{ad.profiles?.rating?.toFixed(1) || '5.0'}</span>
                                    </div>
                                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">на Авоське с 2024</span>
                                </div>
                            </div>
                        </Link>

                        <div className="pt-4 border-t border-border/50 grid grid-cols-2 gap-4">
                            <div className="text-center">
                                <div className="text-sm font-black text-foreground">{sellerAds.length}</div>
                                <div className="text-[9px] font-bold text-muted-foreground uppercase opacity-60">Товаров</div>
                            </div>
                            <div className="text-center">
                                <div className="text-sm font-black text-foreground">{sellerReviews.length}</div>
                                <div className="text-[9px] font-bold text-muted-foreground uppercase opacity-60">Отзывов</div>
                            </div>
                        </div>
                    </div>

                    {/* Trust/Safety */}
                    <div className="bg-primary/5 border border-primary/10 p-5 rounded-[2rem] flex items-start gap-4 shadow-sm shadow-primary/5">
                        <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center shrink-0">
                            <ShieldCheck className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <div className="text-[11px] font-black text-foreground mb-1 uppercase tracking-tight">Безопасность</div>
                            <p className="text-[10px] font-medium text-muted-foreground leading-relaxed italic">
                                Не отправляйте предоплату и не сообщайте данные карты. Авоська+ рекомендует встречаться лично.
                            </p>
                        </div>
                    </div>

                    {/* Mini Chat Window */}
                    <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-sm flex flex-col">
                        {showChat && (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 flex flex-col h-[380px]">
                                <div className="p-3 border-b border-border flex justify-between items-center bg-muted/5">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-semibold uppercase tracking-wider">Чат с продавцом</span>
                                        {isOtherUserTyping && (
                                            <span className="text-[10px] text-primary animate-pulse font-semibold">печатает...</span>
                                        )}
                                    </div>
                                    <button onClick={() => setShowChat(false)} className="p-1 hover:bg-muted rounded-full">
                                        <X className="h-4 w-4 text-muted-foreground" />
                                    </button>
                                </div>

                                <div id="mini-chat-messages" className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-none bg-background/30">
                                    <PhotoProvider>
                                        {messages.length > 0 ? (
                                            messages.map((msg) => (
                                                <div key={msg.id} className={cn(
                                                    "max-w-[85%] p-2.5 rounded-2xl text-[13px] leading-tight shadow-sm overflow-hidden",
                                                    msg.sender_id === currentUser?.id
                                                        ? "ml-auto bg-primary text-white rounded-br-none"
                                                        : "mr-auto bg-surface border border-border rounded-bl-none"
                                                )}>
                                                    {msg.type === 'image' ? (
                                                        <PhotoView src={msg.attachment_url}>
                                                            <div className="block -m-1 cursor-zoom-in">
                                                                <OptimizedImage
                                                                    src={msg.attachment_url}
                                                                    width={400}
                                                                    height={300}
                                                                    className="w-full max-h-60 object-cover rounded-xl"
                                                                    alt="Chat"
                                                                />
                                                            </div>
                                                        </PhotoView>
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
                                                <p className="text-[10px] font-semibold">Начните общение первым!</p>
                                            </div>
                                        )}
                                    </PhotoProvider>
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
                                        className="flex-1 h-9 bg-background border border-border rounded-xl px-3 text-xs font-semibold outline-none focus:ring-1 focus:ring-primary"
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
                        )}
                    </div>

                    {/* Banners and Footer Links - only show when banners are enabled */}
                    <AdPageSidebar />
                </div>
            </div>

            {/* Mobile Sticky Actions - Avito Style */}
            {!showChat && (
                <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-background/90 backdrop-blur-xl border-t border-border z-40 flex gap-3 animate-in slide-in-from-bottom-5 duration-500 shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
                    <a
                        href={ad.profiles?.phone ? `tel:${ad.profiles.phone}` : '#'}
                        onClick={() => handleContactClick('call')}
                        className="flex-1 h-14 bg-green-600 text-white rounded-2xl flex items-center justify-center gap-3 font-bold shadow-lg shadow-green-600/20 active:scale-95 transition-all"
                    >
                        <Smartphone className="h-5 w-5" />
                        <span>Позвонить</span>
                    </a>
                    <button
                        onClick={() => handleContactClick('chat')}
                        className="flex-1 h-14 bg-primary text-white rounded-2xl flex items-center justify-center gap-3 font-bold shadow-lg shadow-primary/20 active:scale-95 transition-all"
                    >
                        <MessageCircle className="h-5 w-5" />
                        <span>Написать</span>
                    </button>
                </div>
            )}
        </div>
    );
}

// Separate component for banners in ad page - includes label and footer
function AdPageSidebar() {
    const [banners, setBanners] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isBannerModalOpen, setIsBannerModalOpen] = useState(false);

    useEffect(() => {
        fetchBanners();
    }, []);

    useEffect(() => {
        if (banners.length > 1) {
            const interval = setInterval(() => {
                setCurrentIndex(prev => (prev + 1) % banners.length);
            }, 5000);
            return () => clearInterval(interval);
        }
    }, [banners.length]);

    const fetchBanners = async () => {
        try {
            const { data, error } = await supabase
                .from('banners')
                .select('*')
                .eq('is_active', true)
                .eq('position', 'sidebar');

            if (error) throw error;
            setBanners(data || []);

            if (data?.length > 0) {
                // Track impressions
                data.forEach(b => supabase.rpc('increment_banner_impression', { banner_id: b.id }));
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const ICON_MAP: Record<string, any> = { MessageCircle, Megaphone, Smartphone, Star, ImageIcon };

    if (loading) return <div className="aspect-[1/1.5] bg-muted/20 animate-pulse rounded-2xl" />;

    const banner = banners[currentIndex];

    return (
        <div className="space-y-4 pt-8 border-t border-border/50">
            <div className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase px-1 flex justify-between items-center group">
                <button
                    onClick={() => setIsBannerModalOpen(true)}
                    className="flex items-center gap-1.5 hover:text-primary transition-colors"
                >
                    <span>Реклама</span>
                    <div className="w-1 h-1 bg-current rounded-full opacity-30" />
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity">Разместить?</span>
                </button>
                {banners.length > 1 && (
                    <div className="flex gap-1">
                        {banners.map((_, i) => (
                            <div key={i} className={cn("w-1 h-1 rounded-full transition-all", i === currentIndex ? "bg-primary w-3" : "bg-border")} />
                        ))}
                    </div>
                )}
            </div>

            {banners.length === 0 ? (
                <div
                    onClick={() => setIsBannerModalOpen(true)}
                    className="group relative w-full aspect-[1/1.5] rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all border-2 border-dashed border-border/50 bg-surface/50 flex flex-col items-center justify-center p-6 text-center cursor-pointer hover:border-primary/30"
                >
                    <div className="w-14 h-14 bg-primary/5 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Sparkles className="h-7 w-7 text-primary/40" />
                    </div>
                    <div className="space-y-1">
                        <h4 className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Ваша реклама здесь</h4>
                        <p className="text-[10px] font-medium text-muted-foreground/60">Охватите тысячи пользователей за 500 ₽</p>
                    </div>
                </div>
            ) : (
                <AnimatePresence mode="wait">
                    <motion.div
                        key={banner.id}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.3 }}
                    >
                        {banner.type === 'text' ? (
                            <a
                                href={banner.link_url || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={cn(
                                    "group relative w-full aspect-[1/1.5] rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all border border-white/10 flex flex-col p-5 text-white",
                                    banner.background_color || 'bg-gradient-to-br from-primary to-emerald-700'
                                )}
                            >
                                <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
                                    <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
                                        {(() => {
                                            const Icon = ICON_MAP[banner.icon_name || 'Megaphone'] || Megaphone;
                                            return <Icon className="h-8 w-8 text-white" />;
                                        })()}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-base leading-tight mb-2">{banner.title}</h4>
                                        <p className="text-white/80 text-xs font-medium line-clamp-4">{banner.content}</p>
                                    </div>
                                </div>
                                {banner.button_text && (
                                    <div className="mt-4 w-full py-3 bg-white text-primary rounded-xl font-bold text-xs uppercase text-center shadow-lg">
                                        {banner.button_text}
                                    </div>
                                )}
                            </a>
                        ) : (
                            <a
                                href={banner.link_url || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group relative w-full aspect-[1/1.5] rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all border border-border/50 bg-surface block"
                            >
                                <img
                                    src={getOptimizedImageUrl(banner.image_url, { width: 400, quality: 80 })}
                                    alt={banner.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-5 flex flex-col justify-end">
                                    <h4 className="text-white font-bold text-sm line-clamp-2 leading-tight">{banner.title}</h4>
                                    {banner.content && <p className="text-white/70 text-[10px] mt-1 line-clamp-1">{banner.content}</p>}
                                </div>
                            </a>
                        )}
                    </motion.div>
                </AnimatePresence>
            )}

            {isBannerModalOpen && (
                <UserBannerCheckoutModal position="sidebar" onClose={() => setIsBannerModalOpen(false)} />
            )}
        </div>
    );
}

export default function AdPage() {
    return (
        <Suspense fallback={<div className="p-10 text-center text-[10px] font-bold uppercase tracking-widest opacity-20">Загрузка объявления...</div>}>
            <AdContent />
        </Suspense>
    );
}

