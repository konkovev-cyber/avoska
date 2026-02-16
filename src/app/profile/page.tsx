'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { User, Package, Heart, Star, Settings, ExternalLink, Trash2, PowerOff, Camera, MapPin, Rocket, Zap, Crown, X, ShieldCheck, Smartphone } from 'lucide-react';
import PromotionModal from '@/components/PromotionModal';
import Link from 'next/link';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { compressImage } from '@/lib/image-utils';

export default function ProfilePage() {
    const [profile, setProfile] = useState<any>(null);
    const [myAds, setMyAds] = useState<any[]>([]);
    const [favorites, setFavorites] = useState<any[]>([]);
    const [reviews, setReviews] = useState<any[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'my-ads' | 'favorites' | 'reviews'>('my-ads');
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [replyText, setReplyText] = useState('');
    const [isSubmittingReply, setIsSubmittingReply] = useState(false);
    const [promotingAd, setPromotingAd] = useState<{ id: string, title: string } | null>(null);


    const router = useRouter();

    useEffect(() => {
        fetchProfileData();
    }, []);

    const fetchProfileData = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            router.push('/login');
            return;
        }

        // Fetch Profile
        const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

        setProfile(profileData);
        setFullName(profileData?.full_name || '');
        setPhone(profileData?.phone || '');

        // Fetch My Ads
        const { data: adsData } = await supabase
            .from('ads')
            .select('*, categories:category_id(name), is_vip, is_turbo, pinned_until')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false });

        setMyAds(adsData || []);

        // Fetch Favorites with verbose join
        const { data: favsData, error: favsError } = await supabase
            .from('favorites')
            .select(`
                *,
                ads:ad_id (
                    *,
                    categories:category_id (name)
                )
            `)
            .eq('user_id', session.user.id);

        if (favsError) console.error('Favorites fetch error:', favsError);
        console.log('Processed favorites data:', favsData);
        setFavorites(favsData || []);

        // Fetch Reviews
        const { data: reviewsData } = await supabase
            .from('reviews')
            .select('*, reviewer:profiles!reviewer_id(full_name, avatar_url)')
            .eq('target_user_id', session.user.id)
            .order('created_at', { ascending: false });

        setReviews(reviewsData || []);
        setLoading(false);
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingAvatar(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        try {
            const compressedFile = await compressImage(file, 400, 0.7);
            const fileName = `avatar-${Date.now()}.jpg`;
            const filePath = `${session.user.id}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, compressedFile);

            if (uploadError) {
                if (uploadError.message.includes('bucket not found')) {
                    throw new Error('Бакет "avatars" не найден. Создайте его в панели управления Supabase (Storage).');
                }
                throw uploadError;
            }

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', session.user.id);

            toast.success('Аватар обновлен');
            fetchProfileData();
        } catch (error: any) {
            if (error.message?.toLowerCase().includes('bucket not found')) {
                toast.error('Ошибка: Бакет "avatars" не найден в Supabase. Пожалуйста, создайте публичный бакет с именем "avatars" в разделе Storage.');
            } else {
                toast.error(error.message || 'Ошибка загрузки аватара');
            }
            console.error(error);
        } finally {
            setUploadingAvatar(false);
        }
    };

    const handleSaveProfile = async () => {
        if (!fullName.trim()) return toast.error('Введите имя');
        if (phone && phone.replace(/[^\d]/g, '').length < 10) {
            return toast.error('Номер телефона слишком короткий');
        }

        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    full_name: fullName,
                    phone: phone
                })
                .eq('id', profile?.id);

            if (error) {
                if (error.code === '42703') { // Undefined column
                    throw new Error('Ошибка: колонка "phone" не создана в БД. Запустите SQL скрипт.');
                }
                throw error;
            }

            toast.success('Профиль обновлен');
            setIsEditing(false);
            fetchProfileData();
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || 'Ошибка при обновлении профиля');
        }
    };

    const toggleAdStatus = async (adId: string, currentStatus: string) => {
        const newStatus = currentStatus === 'active' ? 'closed' : 'active';
        const { error } = await supabase
            .from('ads')
            .update({ status: newStatus })
            .eq('id', adId);

        if (error) {
            if (error.message.includes('Limit reached')) {
                toast.error('Не удалось активировать: лимит 10 объявлений исчерпан');
            } else {
                toast.error('Произошла ошибка');
            }
        } else {
            toast.success(newStatus === 'active' ? 'Объявление активировано' : 'Объявление снято с публикации');
            fetchProfileData();
        }
    };

    const deleteAd = async (adId: string) => {
        if (!confirm('Вы уверены, что хотите удалить объявление?')) return;

        const { error } = await supabase
            .from('ads')
            .delete()
            .eq('id', adId);

        if (error) {
            toast.error('Ошибка при удалении');
        } else {
            toast.success('Удалено');
            fetchProfileData();
        }
    };

    const handleSendReply = async (reviewId: string) => {
        if (!replyText.trim()) return toast.error('Введите текст ответа');

        setIsSubmittingReply(true);
        try {
            const { error } = await supabase
                .from('reviews')
                .update({
                    reply: replyText,
                    reply_date: new Date().toISOString()
                })
                .eq('id', reviewId);

            if (error) throw error;

            toast.success('Ответ опубликован');
            setReplyingTo(null);
            setReplyText('');
            fetchProfileData();
        } catch (error) {
            console.error(error);
            toast.error('Ошибка при отправке ответа');
        } finally {
            setIsSubmittingReply(false);
        }
    };

    if (loading) return (
        <div className="container mx-auto px-4 py-20 flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
    );

    return (
        <div className="container mx-auto px-4 py-8 max-w-6xl">
            <div className="bg-surface border border-border rounded-3xl p-6 md:p-8 mb-8 shadow-sm">
                <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8 text-center md:text-left">
                    <div className="relative group/avatar">
                        <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-accent/10 border-2 border-accent/20 flex items-center justify-center text-4xl font-black text-accent overflow-hidden shrink-0">
                            {uploadingAvatar ? (
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            ) : profile?.avatar_url ? (
                                <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
                            ) : (
                                profile?.full_name?.charAt(0) || '?'
                            )}
                        </div>
                        <label className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 group-hover/avatar:opacity-100 transition-opacity cursor-pointer rounded-full">
                            <Camera className="h-6 w-6" />
                            <input type="file" className="hidden" onChange={handleAvatarUpload} accept="image/*" />
                        </label>
                    </div>
                    {isEditing ? (
                        <div className="flex-1 w-full space-y-4 animate-in slide-in-from-top-2 duration-300">
                            <div>
                                <label className="block text-[10px] font-black uppercase text-muted-foreground mb-1 tracking-widest ml-1">Как вас зовут?</label>
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="w-full h-12 px-4 rounded-xl border border-border bg-background focus:border-primary outline-none transition-all font-bold"
                                    placeholder="Ваше имя"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase text-muted-foreground mb-1 tracking-widest ml-1">Телефон для связи</label>
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    className="w-full h-12 px-4 rounded-xl border border-border bg-background focus:border-primary outline-none transition-all font-bold"
                                    placeholder="+7 (___) ___-__-__"
                                />
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button
                                    onClick={handleSaveProfile}
                                    className="flex-1 h-12 bg-primary text-white font-black uppercase text-[10px] tracking-widest rounded-xl shadow-lg shadow-primary/20 active:scale-95 transition-all"
                                >
                                    Сохранить
                                </button>
                                <button
                                    onClick={() => setIsEditing(false)}
                                    className="px-6 h-12 bg-white border border-gray-200 text-gray-500 hover:text-gray-900 hover:bg-gray-50 font-black uppercase text-[10px] tracking-widest rounded-xl active:scale-95 transition-all"
                                >
                                    Отмена
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 min-w-0 w-full">
                            <h1 className="text-2xl md:text-3xl font-black mb-1 truncate">{profile?.full_name || 'Пользователь'}</h1>
                            {profile?.phone && (
                                <div className="text-sm font-bold text-foreground/60 mb-3">{profile.phone}</div>
                            )}
                            <div className="flex flex-wrap justify-center md:justify-start gap-4 text-[10px] md:text-xs text-muted font-bold uppercase tracking-wider">
                                <a
                                    href={`https://yandex.ru/maps/?text=${encodeURIComponent(profile?.city || 'Горячий Ключ')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-primary hover:underline transition-all"
                                >
                                    <MapPin className="h-4 w-4" />
                                    <span>{profile?.city || 'Горячий Ключ'}</span>
                                </a>
                                <div className="flex items-center gap-1 text-orange-500">
                                    <Star className="h-4 w-4 fill-current" />
                                    <span>Рейтинг: {profile?.rating || '0.0'}</span>
                                </div>
                                <div className="flex items-center gap-1 text-muted">
                                    <Rocket className="h-4 w-4" />
                                    На Авоське с {new Date(profile?.created_at).getFullYear()}г.
                                </div>
                            </div>
                        </div>
                    )}
                    {!isEditing && (
                        <div className="flex gap-2">
                            {profile?.role === 'admin' && (
                                <Link
                                    href="/admin"
                                    className="p-4 bg-primary/10 border border-primary/20 text-primary rounded-2xl hover:bg-primary/20 transition-all shrink-0 active:scale-90 flex items-center gap-2"
                                >
                                    <ShieldCheck className="h-6 w-6" />
                                    <span className="hidden md:inline font-black uppercase text-[10px] tracking-widest">Админка</span>
                                </Link>
                            )}
                            <button
                                onClick={() => setIsEditing(true)}
                                className="p-4 bg-background border border-border rounded-2xl hover:bg-muted transition-all shrink-0 active:scale-90"
                            >
                                <Settings className="h-6 w-6" />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Tabs Navigation - Wrap for mobile/APK */}
            <div className="flex flex-wrap border-b border-border mb-8">
                <button
                    onClick={() => setActiveTab('my-ads')}
                    className={cn(
                        "px-6 py-4 font-black flex items-center gap-2 border-b-4 transition-all whitespace-nowrap",
                        activeTab === 'my-ads' ? "border-primary text-primary" : "border-transparent text-muted hover:text-foreground"
                    )}
                >
                    <Package className="h-5 w-5" />
                    Мои объявления ({myAds.length})
                </button>
                <button
                    onClick={() => setActiveTab('favorites')}
                    className={cn(
                        "px-6 py-4 font-black flex items-center gap-2 border-b-4 transition-all whitespace-nowrap",
                        activeTab === 'favorites' ? "border-primary text-primary" : "border-transparent text-muted hover:text-foreground"
                    )}
                >
                    <Heart className="h-5 w-5" />
                    Избранное ({favorites.length})
                </button>
                <button
                    onClick={() => setActiveTab('reviews')}
                    className={cn(
                        "px-6 py-4 font-black flex items-center gap-2 border-b-4 transition-all whitespace-nowrap",
                        activeTab === 'reviews' ? "border-primary text-primary" : "border-transparent text-muted hover:text-foreground"
                    )}
                >
                    <Star className="h-5 w-5" />
                    Отзывы ({reviews.length})
                </button>
            </div>

            {/* Content Grid */}
            <div className="grid gap-6">
                {activeTab === 'my-ads' && (
                    myAds.length > 0 ? (
                        myAds.map(ad => (
                            <div key={ad.id} className="bg-surface border border-border rounded-2xl p-3 md:p-4 flex gap-3 md:gap-6 items-center hover:shadow-md transition-all overflow-hidden">
                                <Link href={`/ad?id=${ad.id}`} className="w-16 h-16 md:w-32 md:h-32 bg-muted rounded-xl overflow-hidden shrink-0 border border-border">
                                    {ad.images?.[0] ? (
                                        <img src={ad.images[0]} alt={ad.title} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-[8px] text-muted uppercase">Нет фото</div>
                                    )}
                                </Link>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className={cn(
                                            "text-[8px] font-black uppercase px-1.5 py-0.5 rounded",
                                            ad.status === 'active' ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"
                                        )}>
                                            {ad.status === 'active' ? 'Активно' : 'Снято'}
                                        </span>
                                        <span className="text-[8px] text-muted font-bold uppercase truncate">{ad.categories?.name}</span>
                                    </div>
                                    <Link href={`/ad?id=${ad.id}`} className="block text-sm md:text-lg font-bold truncate hover:text-primary transition-colors">
                                        {ad.title}
                                    </Link>
                                    <div className="text-base md:text-xl font-black mt-0.5">{ad.price ? `${ad.price.toLocaleString()} ₽` : 'Цена не указана'}</div>
                                    <div className="flex gap-1 mt-1 flex-wrap">
                                        {ad.is_vip && <span className="bg-purple-100 text-purple-600 text-[7px] font-black uppercase px-1.5 py-0.5 rounded-full flex items-center gap-1"><Crown className="h-2 w-2" /> VIP</span>}
                                        {ad.is_turbo && <span className="bg-orange-100 text-orange-600 text-[7px] font-black uppercase px-1.5 py-0.5 rounded-full flex items-center gap-1"><Zap className="h-2 w-2" /> Turbo</span>}
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1.5 md:flex-row md:gap-2 shrink-0">
                                    <div className="flex gap-1.5 md:contents">
                                        <button
                                            onClick={() => setPromotingAd({ id: ad.id, title: ad.title })}
                                            className="p-2 md:p-3 rounded-lg md:rounded-xl border border-primary/20 text-primary hover:bg-primary/5 transition-all"
                                            title="Продвинуть"
                                        >
                                            <Rocket className="h-4 w-4 md:h-5 md:w-5" />
                                        </button>
                                        <Link
                                            href={`/ads/edit?id=${ad.id}`}
                                            className="p-2 md:p-3 rounded-lg md:rounded-xl border border-blue-200 text-blue-600 hover:bg-blue-50 transition-all"
                                            title="Редактировать"
                                        >
                                            <div className="h-4 w-4 md:h-5 md:w-5">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>
                                            </div>
                                        </Link>
                                    </div>
                                    <div className="flex gap-1.5 md:contents">
                                        <button
                                            onClick={() => toggleAdStatus(ad.id, ad.status)}
                                            className={cn(
                                                "p-2 md:p-3 rounded-lg md:rounded-xl border transition-all",
                                                ad.status === 'active' ? "text-orange-600 border-orange-200 hover:bg-orange-50" : "text-green-600 border-green-200 hover:bg-green-50"
                                            )}
                                            title={ad.status === 'active' ? "Снять с публикации" : "Активировать"}
                                        >
                                            <PowerOff className="h-4 w-4 md:h-5 md:w-5" />
                                        </button>
                                        <button
                                            onClick={() => deleteAd(ad.id)}
                                            className="p-2 md:p-3 rounded-lg md:rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-all"
                                            title="Удалить навсегда"
                                        >
                                            <Trash2 className="h-4 w-4 md:h-5 md:w-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-20 bg-surface rounded-3xl border border-dashed border-border">
                            <Package className="h-12 w-12 text-muted mx-auto mb-4" />
                            <div className="font-bold text-lg">У вас пока нет объявлений</div>
                            <Link href="/ads/create" className="text-primary font-bold hover:underline mt-2 inline-block">Опубликовать первое</Link>
                        </div>
                    )
                )}

                {activeTab === 'favorites' && (
                    favorites.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {favorites.map(({ ads: ad }) => (
                                <Link key={ad.id} href={`/ad?id=${ad.id}`} className="bg-surface border border-border rounded-2xl overflow-hidden hover:shadow-lg transition-all flex flex-col group">
                                    <div className="aspect-square bg-muted relative">
                                        {ad.images?.[0] ? (
                                            <img src={ad.images[0]} alt={ad.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-muted">Нет фото</div>
                                        )}
                                    </div>
                                    <div className="p-4">
                                        <div className="text-lg font-black mb-1">{ad.price ? `${ad.price.toLocaleString()} ₽` : 'Цена не указана'}</div>
                                        <div className="text-sm font-medium line-clamp-1 mb-2 group-hover:text-primary transition-colors">{ad.title}</div>
                                        <div className="flex justify-between text-[10px] text-muted font-bold uppercase">
                                            <span>{ad.categories.name}</span>
                                            <span>{ad.city}</span>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20 bg-surface rounded-3xl border border-dashed border-border col-span-full">
                            <Heart className="h-12 w-12 text-muted mx-auto mb-4" />
                            <div className="font-bold text-lg">Вы пока ничего не добавили в избранное</div>
                            <Link href="/" className="text-primary font-bold hover:underline mt-2 inline-block">Перейти к покупкам</Link>
                        </div>
                    )
                )}
                {activeTab === 'reviews' && (
                    <div className="space-y-6">
                        {reviews.length > 0 ? (
                            reviews.map(rev => (
                                <div key={rev.id} className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
                                    <div className="flex items-center gap-4 mb-4">
                                        <Link href={`/user?id=${rev.reviewer_id}`} className="w-12 h-12 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center font-black text-accent overflow-hidden shrink-0 hover:opacity-80 transition-opacity">
                                            {rev.reviewer?.avatar_url ? (
                                                <img src={rev.reviewer.avatar_url} alt={rev.reviewer.full_name} className="w-full h-full object-cover" />
                                            ) : (
                                                rev.reviewer?.full_name?.charAt(0) || '?'
                                            )}
                                        </Link>
                                        <div className="flex-1">
                                            <Link href={`/user?id=${rev.reviewer_id}`} className="font-bold hover:underline">{rev.reviewer?.full_name}</Link>
                                            <div className="flex gap-0.5">
                                                {[...Array(5)].map((_, i) => (
                                                    <Star key={i} className={cn("h-3 w-3", i < rev.rating ? "fill-orange-500 text-orange-500" : "text-muted opacity-30")} />
                                                ))}
                                            </div>
                                        </div>
                                        <div className="text-[10px] text-muted font-bold uppercase">
                                            {new Date(rev.created_at).toLocaleDateString()}
                                        </div>
                                    </div>
                                    <p className="text-sm text-foreground/80 leading-relaxed italic border-l-2 border-border pl-4 mb-4">
                                        «{rev.comment}»
                                    </p>

                                    {rev.images && rev.images.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mb-4 pb-2">
                                            {rev.images.map((img: string, idx: number) => (
                                                <div key={idx} className="w-16 h-16 rounded-lg overflow-hidden border border-border shrink-0">
                                                    <img src={img} className="w-full h-full object-cover" />
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {rev.reply ? (
                                        <div className="bg-muted/50 rounded-xl p-4 mt-2 border border-border/50">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="text-[10px] font-black uppercase text-primary">Ваш ответ</div>
                                                <div className="text-[10px] text-muted font-bold uppercase">
                                                    {new Date(rev.reply_date).toLocaleDateString()}
                                                </div>
                                            </div>
                                            <p className="text-sm text-foreground/70 leading-relaxed">
                                                {rev.reply}
                                            </p>
                                        </div>
                                    ) : replyingTo === rev.id ? (
                                        <div className="mt-4 space-y-3">
                                            <textarea
                                                value={replyText}
                                                onChange={(e) => setReplyText(e.target.value)}
                                                placeholder="Напишите ответ..."
                                                className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-primary outline-none text-sm min-h-[100px] resize-none"
                                            />
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleSendReply(rev.id)}
                                                    disabled={isSubmittingReply}
                                                    className="flex-1 py-2 bg-primary text-white rounded-xl font-black text-xs uppercase tracking-wider disabled:opacity-50"
                                                >
                                                    {isSubmittingReply ? 'Отправка...' : 'Отправить ответ'}
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setReplyingTo(null);
                                                        setReplyText('');
                                                    }}
                                                    className="px-6 py-2 bg-muted rounded-xl font-bold text-xs uppercase tracking-wider"
                                                >
                                                    Отмена
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => {
                                                setReplyingTo(rev.id);
                                                setReplyText('');
                                            }}
                                            className="text-primary text-xs font-black uppercase tracking-widest hover:underline"
                                        >
                                            Ответить на отзыв
                                        </button>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-20 bg-surface rounded-3xl border border-dashed border-border">
                                <Star className="h-12 w-12 text-muted mx-auto mb-4" />
                                <div className="font-bold text-lg">У вас пока нет отзывов</div>
                                <div className="text-sm text-muted mt-2">Они появятся здесь, когда другие пользователи оставят мнение о сделке</div>
                            </div>
                        )}
                    </div>
                )}
            </div>
            {/* Version Display */}
            <div className="mt-12 text-center pb-12">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-surface border-2 border-primary/10 rounded-2xl text-[11px] font-black text-primary/60 uppercase tracking-[0.2em] shadow-sm">
                    <Smartphone className="h-3 w-3" />
                    Avoska+ v0.1.2
                </div>
            </div>
        </div>
    );
}
