'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Package, Star, Share2, MapPin, User as UserIcon, Calendar, MessageCircle, Camera, X, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { getOptimizedImageUrl } from '@/lib/image-utils';

function PublicProfileContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const id = searchParams.get('id');

    const [profile, setProfile] = useState<any>(null);
    const [ads, setAds] = useState<any[]>([]);
    const [reviews, setReviews] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'ads' | 'reviews'>('ads');
    const [currentUser, setCurrentUser] = useState<any>(null);

    // Reviews form state
    const [showReviewForm, setShowReviewForm] = useState(false);
    const [reviewRating, setReviewRating] = useState(5);
    const [reviewComment, setReviewComment] = useState('');
    const [reviewImages, setReviewImages] = useState<string[]>([]);
    const [uploadingReviewImages, setUploadingReviewImages] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);

    useEffect(() => {
        if (id) {
            fetchPublicData();
        } else {
            // If no ID, maybe it's an error or we should go home
            setLoading(false);
        }
    }, [id]);

    const fetchPublicData = async () => {
        if (!id) return;
        setLoading(true);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                setCurrentUser(session.user);
                const { data: currProfile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
                const ADMIN_EMAILS = ['ht-elk@yandex.ru', 'dron-vbg@yandex.ru', 'konkev@bk.ru', 'konkovev@gmail.com'];
                setIsAdmin(currProfile?.role === 'admin' || ADMIN_EMAILS.includes(session.user.email || ''));
            }

            if (session?.user?.id === id) {
                router.replace('/profile');
                return;
            }

            // Fetch Profile
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', id)
                .single();

            if (profileError || !profileData) {
                toast.error('Пользователь не найден');
                router.push('/');
                return;
            }

            setProfile(profileData);

            // Fetch Active Ads
            const { data: adsData } = await supabase
                .from('ads')
                .select('*, categories:category_id(name)')
                .eq('user_id', id)
                .eq('status', 'active')
                .order('created_at', { ascending: false });

            setAds(adsData || []);

            // Fetch Reviews
            const { data: reviewsData } = await supabase
                .from('reviews')
                .select('*, reviewer:profiles!reviewer_id(full_name, avatar_url)')
                .eq('target_user_id', id)
                .order('created_at', { ascending: false });

            setReviews(reviewsData || []);

        } catch (error) {
            console.error(error);
            toast.error('Ошибка загрузки профиля');
        } finally {
            setLoading(false);
        }
    };

    const handleShare = async () => {
        const url = window.location.href;
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `Профиль продавца ${profile?.full_name}`,
                    text: `Посмотри объявления пользователя ${profile?.full_name} на Авоська+`,
                    url
                });
            } catch (e) { }
        } else {
            navigator.clipboard.writeText(url);
            toast.success('Ссылка скопирована');
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0 || !currentUser) return;

        setUploadingReviewImages(true);
        const uploadedUrls = [...reviewImages];

        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const fileName = `${currentUser.id}/${Date.now()}-${file.name}`;
                const { error: uploadError } = await supabase.storage
                    .from('review-images')
                    .upload(fileName, file);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('review-images')
                    .getPublicUrl(fileName);

                uploadedUrls.push(publicUrl);
            }
            setReviewImages(uploadedUrls);
            toast.success('Фото загружены');
        } catch (error) {
            console.error(error);
            toast.error('Ошибка загрузки фото');
        } finally {
            setUploadingReviewImages(false);
        }
    };

    const handleSubmitReview = async () => {
        if (!reviewComment.trim()) return toast.error('Введите комментарий');
        if (!currentUser) return router.push('/login');

        setIsSubmittingReview(true);
        try {
            const { error } = await supabase
                .from('reviews')
                .insert({
                    reviewer_id: currentUser.id,
                    target_user_id: id,
                    rating: reviewRating,
                    comment: reviewComment,
                    images: reviewImages
                });

            if (error) throw error;

            toast.success('Отзыв опубликован');
            setShowReviewForm(false);
            setReviewComment('');
            setReviewRating(5);
            setReviewImages([]);
            fetchPublicData();
        } catch (error) {
            console.error(error);
            toast.error('Ошибка при сохранении отзыва');
        } finally {
            setIsSubmittingReview(false);
        }
    };

    const handleDeleteReview = async (reviewId: string) => {
        if (!confirm('Удалить этот отзыв?')) return;
        try {
            const { error } = await supabase.from('reviews').delete().eq('id', reviewId);
            if (error) throw error;
            toast.success('Отзыв удален');
            fetchPublicData();
        } catch (error) {
            console.error(error);
            toast.error('Ошибка при удалении отзыва');
        }
    };

    if (loading) return (
        <div className="container mx-auto px-4 py-20 flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
    );

    if (!id || !profile) return (
        <div className="container mx-auto px-4 py-20 text-center">
            <h1 className="text-2xl font-black mb-4">Пользователь не указан</h1>
            <Link href="/" className="text-primary font-bold hover:underline">Вернуться на главную</Link>
        </div>
    );

    return (
        <div className="container mx-auto px-4 py-8 max-w-6xl">
            {/* Header Card */}
            <div className="bg-surface border border-border rounded-3xl p-6 md:p-8 mb-8 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-50">
                    <UserIcon className="w-32 h-32 md:w-48 md:h-48 text-muted/10 -rotate-12" />
                </div>

                <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8 text-center md:text-left">
                    <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-accent/10 border-4 border-surface shadow-xl flex items-center justify-center text-4xl font-black text-accent overflow-hidden shrink-0">
                        {profile.avatar_url ? (
                            <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
                        ) : (
                            profile.full_name?.charAt(0) || '?'
                        )}
                    </div>

                    <div className="flex-1 min-w-0">
                        <h1 className="text-2xl md:text-4xl font-black mb-2 truncate">{profile.full_name}</h1>
                        <div className="flex flex-wrap justify-center md:justify-start gap-x-6 gap-y-2 text-xs md:text-sm font-bold text-muted-foreground uppercase tracking-wide mb-6">
                            <div className="flex items-center gap-1.5 text-primary">
                                <MapPin className="h-4 w-4" />
                                <span>{profile.city || 'Город не указан'}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-orange-500">
                                <Star className="h-4 w-4 fill-current" />
                                <span>Рейтинг: {profile.rating || '0.0'}</span>
                                <span className="text-muted-foreground/50 ml-1">({reviews.length} отзывов)</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Calendar className="h-4 w-4" />
                                <span>На Авоське с {new Date(profile.created_at).getFullYear()}г.</span>
                            </div>
                        </div>

                        <div className="flex justify-center md:justify-start gap-3">
                            <button onClick={handleShare} className="px-6 py-2.5 bg-surface border border-border rounded-xl font-bold flex items-center gap-2 hover:bg-muted transition-all active:scale-95 text-sm uppercase tracking-wider">
                                <Share2 className="h-4 w-4" /> Поделиться
                            </button>
                            {currentUser && (
                                <button onClick={() => setShowReviewForm(!showReviewForm)} className="px-6 py-2.5 bg-primary text-white rounded-xl font-bold flex items-center gap-2 hover:bg-primary/90 transition-all active:scale-95 text-sm uppercase tracking-wider shadow-lg shadow-primary/20">
                                    <Star className="h-4 w-4 fill-current" /> Оставить отзыв
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {showReviewForm && (
                    <div className="mt-8 pt-8 border-t border-border animate-in slide-in-from-top-4 duration-300">
                        <div className="max-w-2xl mx-auto bg-background rounded-2xl p-6 border border-border shadow-inner">
                            <h3 className="text-xl font-black mb-6 flex items-center gap-2">
                                <MessageCircle className="h-6 w-6 text-primary" /> Ваш отзыв о продавце
                            </h3>
                            <div className="space-y-6">
                                <div className="flex flex-col gap-2">
                                    <span className="text-xs font-black uppercase text-muted-foreground tracking-widest">Оценка</span>
                                    <div className="flex gap-2">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button key={star} onClick={() => setReviewRating(star)} className="transition-transform active:scale-90">
                                                <Star className={cn("h-8 w-8 transition-colors", star <= reviewRating ? "fill-orange-500 text-orange-500" : "text-muted/30")} />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <span className="text-xs font-black uppercase text-muted-foreground tracking-widest">Ваш комментарий</span>
                                    <textarea value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} placeholder="Расскажите о вашем опыте..." className="w-full px-4 py-3 rounded-xl bg-surface border border-border focus:border-primary outline-none font-medium min-h-[120px] resize-none" />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <span className="text-xs font-black uppercase text-muted-foreground tracking-widest">Фотографии</span>
                                    <div className="flex flex-wrap gap-2">
                                        {reviewImages.map((url, idx) => (
                                            <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden group">
                                                <img src={url} className="w-full h-full object-cover" />
                                                <button onClick={() => setReviewImages(prev => prev.filter((_, i) => i !== idx))} className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </div>
                                        ))}
                                        <label className="w-20 h-20 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 cursor-pointer hover:bg-muted/50 transition-all text-muted-foreground">
                                            <Camera className="h-6 w-6" />
                                            <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} />
                                        </label>
                                    </div>
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button onClick={handleSubmitReview} disabled={isSubmittingReview || uploadingReviewImages} className="flex-1 py-4 bg-primary text-white rounded-xl font-black uppercase tracking-wider shadow-lg active:scale-95 transition-all disabled:opacity-50">
                                        {isSubmittingReview ? 'Публикация...' : 'Опубликовать'}
                                    </button>
                                    <button onClick={() => setShowReviewForm(false)} className="px-8 py-4 bg-muted rounded-xl font-black uppercase active:scale-95 transition-all text-xs"> Отмена </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap border-b border-border mb-8">
                <button onClick={() => setActiveTab('ads')} className={cn("px-6 py-4 font-black flex items-center gap-2 border-b-4 transition-all text-sm md:text-base uppercase tracking-wider", activeTab === 'ads' ? "border-primary text-primary" : "border-transparent text-muted hover:text-foreground")}>
                    <Package className="h-5 w-5" /> Объявления <span className="opacity-50 ml-1">{ads.length}</span>
                </button>
                <button onClick={() => setActiveTab('reviews')} className={cn("px-6 py-4 font-black flex items-center gap-2 border-b-4 transition-all text-sm md:text-base uppercase tracking-wider", activeTab === 'reviews' ? "border-primary text-primary" : "border-transparent text-muted hover:text-foreground")}>
                    <Star className="h-5 w-5" /> Отзывы <span className="opacity-50 ml-1">{reviews.length}</span>
                </button>
            </div>

            <div className="min-h-[300px]">
                {activeTab === 'ads' && (
                    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {ads.length > 0 ? ads.map(ad => (
                            <Link key={ad.id} href={`/ad/?id=${ad.id}`} className="group relative flex flex-col bg-card rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all border border-border/40 active:scale-[0.98]">
                                <div className="aspect-[4/3] relative overflow-hidden bg-muted">
                                    {ad.images?.[0] ? <img src={getOptimizedImageUrl(ad.images[0], { width: 400, quality: 75 })} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /> : <div className="w-full h-full flex items-center justify-center text-[10px] opacity-30">Нет фото</div>}
                                </div>
                                <div className="p-3 flex flex-col flex-1 gap-1">
                                    <div className="text-lg font-black tracking-tight">{ad.price ? `${ad.price.toLocaleString()} ₽` : 'Договорная'}</div>
                                    <h3 className="text-sm font-medium line-clamp-2 min-h-[2.5em]">{ad.title}</h3>
                                    <div className="mt-auto pt-2 flex items-center gap-1 text-[10px] font-bold text-muted-foreground uppercase opacity-70">
                                        <MapPin className="h-3 w-3" /> <span className="truncate">{ad.city}</span>
                                    </div>
                                </div>
                            </Link>
                        )) : <div className="col-span-full py-20 text-center font-bold text-muted-foreground">Нет активных объявлений</div>}
                    </div>
                )}

                {activeTab === 'reviews' && (
                    <div className="space-y-4 max-w-3xl mx-auto">
                        {reviews.length > 0 ? reviews.map(rev => (
                            <div key={rev.id} className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center font-black overflow-hidden">
                                        {rev.reviewer?.avatar_url ? <img src={rev.reviewer.avatar_url} className="w-full h-full object-cover" /> : rev.reviewer?.full_name?.charAt(0) || '?'}
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-bold text-sm">{rev.reviewer?.full_name || 'Пользователь'}</div>
                                        <div className="flex gap-0.5 mt-0.5">
                                            {[...Array(5)].map((_, i) => <Star key={i} className={cn("h-3 w-3", i < rev.rating ? "fill-orange-500 text-orange-500" : "text-muted/30")} />)}
                                        </div>
                                    </div>
                                    <div className="text-[10px] text-muted font-bold uppercase">{new Date(rev.created_at).toLocaleDateString()}</div>
                                    {isAdmin && (
                                        <button onClick={() => handleDeleteReview(rev.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all">
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                                <p className="text-sm leading-relaxed">{rev.comment}</p>
                                {rev.images?.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-4 pb-2">
                                        {rev.images.map((img: string, idx: number) => (
                                            <a key={idx} href={img} target="_blank" className="w-20 h-20 rounded-lg overflow-hidden border border-border shrink-0">
                                                <img src={getOptimizedImageUrl(img, { width: 200, quality: 70 })} className="w-full h-full object-cover" />
                                            </a>
                                        ))}
                                    </div>
                                )}
                                {rev.reply && (
                                    <div className="bg-muted/30 rounded-xl p-4 mt-4 border-l-4 border-primary/20 text-sm italic">
                                        <div className="font-black text-[10px] uppercase text-primary/70 mb-1">Ответ продавца</div>
                                        {rev.reply}
                                    </div>
                                )}
                            </div>
                        )) : <div className="py-20 text-center font-bold text-muted-foreground">Отзывов пока нет</div>}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function UserPage() {
    return (
        <Suspense fallback={<div className="p-20 text-center font-black uppercase tracking-widest opacity-30 text-xs">Загрузка профиля...</div>}>
            <PublicProfileContent />
        </Suspense>
    );
}
