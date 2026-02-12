'use client';

import { useEffect, useState, Suspense } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useSearchParams, useRouter } from 'next/navigation';
import { Star, Package, MapPin, Calendar, MessageSquare, ShieldCheck, Edit3, Trash2, Camera, LogOut, CheckCircle, Heart } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { compressImage } from '@/lib/image-utils';

function UserProfileContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const id = searchParams.get('id');

    const [profile, setProfile] = useState<any>(null);
    const [ads, setAds] = useState<any[]>([]);
    const [favorites, setFavorites] = useState<any[]>([]);
    const [reviews, setReviews] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isOwner, setIsOwner] = useState(false);
    const [activeTab, setActiveTab] = useState<'ads' | 'favorites'>('ads');

    // Edit profile state
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState('');
    const [uploading, setUploading] = useState(false);

    // Review form state
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [submittingReview, setSubmittingReview] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);

    useEffect(() => {
        fetchUserData();
    }, [id]);

    const fetchUserData = async () => {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        setCurrentUser(session?.user);

        const profileId = id || session?.user?.id;

        if (!profileId) {
            setLoading(false);
            router.push('/login');
            return;
        }

        setIsOwner(session?.user?.id === profileId);

        // Fetch Profile
        const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', profileId)
            .single();

        if (!profileData) {
            if (id) {
                toast.error('Профиль не найден');
                router.push('/');
            }
            setLoading(false);
            return;
        }
        setProfile(profileData);
        setEditName(profileData.full_name || '');

        // Fetch Ads
        let adsQuery = supabase.from('ads').select('*, categories(name)').eq('user_id', profileId);
        if (session?.user?.id !== profileId) {
            adsQuery = adsQuery.eq('status', 'active');
        }
        const { data: adsData } = await adsQuery.order('created_at', { ascending: false });
        setAds(adsData || []);

        // Fetch Favorites if owner
        if (session?.user?.id === profileId) {
            const { data: favData } = await supabase
                .from('favorites')
                .select('*, ads(*, categories(name))')
                .eq('user_id', profileId);
            setFavorites(favData?.map(f => f.ads) || []);
        }

        // Fetch Reviews
        const { data: reviewsData } = await supabase
            .from('reviews')
            .select('*, reviewer:profiles!reviewer_id(full_name, avatar_url)')
            .eq('target_user_id', profileId)
            .order('created_at', { ascending: false });

        setReviews(reviewsData || []);
        setLoading(false);
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setUploading(true);
        const { error } = await supabase
            .from('profiles')
            .update({ full_name: editName })
            .eq('id', id);

        if (error) toast.error('Ошибка обновления');
        else {
            toast.success('Профиль обновлен');
            setIsEditing(false);
            fetchUserData();
        }
        setUploading(false);
    };

    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const toastId = toast.loading('Загрузка фото...');
        try {
            const compressedFile = await compressImage(file, 400, 0.7);
            const fileName = `${id}-${Math.random()}.jpg`;
            const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, compressedFile);

            if (uploadError) {
                if (uploadError.message.includes('bucket not found')) {
                    throw new Error('Бакет "avatars" не найден. Создайте его в Storage в Supabase.');
                }
                throw uploadError;
            }

            const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
            const { error: profileError } = await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', id);
            if (profileError) throw profileError;

            toast.success('Фото обновлено', { id: toastId });
            fetchUserData();
        } catch (err: any) {
            toast.error(err.message, { id: toastId });
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteAd = async (adId: string) => {
        if (!confirm('Вы уверены, что хотите удалить объявление?')) return;

        const { error } = await supabase.from('ads').delete().eq('id', adId);
        if (error) toast.error('Ошибка удаления');
        else {
            toast.success('Объявление удалено');
            fetchUserData();
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/');
        router.refresh();
    };

    const submitReview = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) {
            toast.error('Нужно войти, чтобы оставить отзыв');
            return;
        }
        if (currentUser.id === id) {
            toast.error('Нельзя оставить отзыв самому себе');
            return;
        }

        setSubmittingReview(true);
        const { error } = await supabase
            .from('reviews')
            .insert({
                reviewer_id: currentUser.id,
                target_user_id: id,
                rating,
                comment
            });

        if (error) {
            toast.error('Ошибка при отправке отзыва');
        } else {
            toast.success('Отзыв опубликован!');
            setComment('');
            fetchUserData();
        }
        setSubmittingReview(false);
    };

    if (loading) return (
        <div className="container mx-auto px-4 py-20 flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
    );

    if (!profile) return <div className="p-20 text-center">Профиль не найден</div>;

    const displayAds = activeTab === 'ads' ? ads : favorites;

    return (
        <div className="container mx-auto px-4 py-8 max-w-6xl">
            <div className="grid md:grid-cols-3 gap-8">

                {/* Left: Sidebar Info */}
                <aside className="space-y-6">
                    <div className="bg-surface border border-border rounded-3xl p-8 text-center shadow-sm relative overflow-hidden">
                        {isOwner && (
                            <button
                                onClick={() => setIsEditing(!isEditing)}
                                className="absolute top-4 right-4 p-2 bg-background border border-border rounded-full hover:text-primary transition-colors z-10"
                            >
                                <Edit3 className="h-4 w-4" />
                            </button>
                        )}

                        <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-accent/10 border-2 border-accent/20 flex items-center justify-center text-4xl font-black text-accent overflow-hidden relative group">
                            {profile?.avatar_url ? (
                                <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
                            ) : (
                                profile?.full_name?.charAt(0) || '?'
                            )}
                            {isOwner && (
                                <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                                    <Camera className="text-white h-6 w-6" />
                                    <input type="file" onChange={handleAvatarChange} className="hidden" accept="image/*" />
                                </label>
                            )}
                        </div>

                        {isEditing ? (
                            <form onSubmit={handleUpdateProfile} className="space-y-3">
                                <input
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="w-full p-2 text-center rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary"
                                />
                                <div className="flex gap-2">
                                    <button type="submit" disabled={uploading} className="flex-1 py-2 bg-primary text-white rounded-lg text-sm font-bold">Сохранить</button>
                                    <button type="button" onClick={() => setIsEditing(false)} className="flex-1 py-2 bg-muted rounded-lg text-sm font-bold">Отмена</button>
                                </div>
                            </form>
                        ) : (
                            <>
                                <h1 className="text-2xl font-black mb-2 flex items-center justify-center gap-2">
                                    {profile?.full_name}
                                    {profile.is_verified && <ShieldCheck className="h-5 w-5 text-blue-500" />}
                                </h1>
                                <div className="flex items-center justify-center gap-1 text-orange-500 font-black text-xl mb-4">
                                    <Star className="h-5 w-5 fill-current" />
                                    <span>{profile?.rating?.toFixed(1) || '5.0'}</span>
                                </div>
                            </>
                        )}

                        <p className="text-xs text-muted font-bold uppercase tracking-widest mb-6">
                            На Авоське с {new Date(profile?.created_at).getFullYear()}г.
                        </p>

                        <div className="flex flex-col gap-2">
                            {isOwner ? (
                                <button
                                    onClick={handleLogout}
                                    className="w-full py-3 bg-muted text-foreground font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-red-50 hover:text-red-500 transition-all"
                                >
                                    <LogOut className="h-5 w-5" />
                                    Выйти
                                </button>
                            ) : (
                                <button
                                    onClick={() => router.push(`/chat?receiverId=${profile.id}`)}
                                    className="w-full py-3 bg-primary text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-opacity-90 transition-all shadow-lg"
                                >
                                    <MessageSquare className="h-5 w-5" />
                                    Написать
                                </button>
                            )}
                        </div>
                    </div>

                    {!isOwner && profile.is_verified && (
                        <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100">
                            <h4 className="flex items-center gap-2 text-blue-800 font-black mb-2 uppercase text-xs tracking-tighter">
                                <ShieldCheck className="h-5 w-5" />
                                Профиль проверен
                            </h4>
                            <p className="text-xs text-blue-700 opacity-80">
                                Почта и телефон подтверждены. Пользователь заслуживает доверия.
                            </p>
                        </div>
                    )}
                </aside>

                {/* Right: Content Tabs */}
                <main className="md:col-span-2 space-y-8">

                    {/* Tabs Headings */}
                    <div className="flex items-center gap-6 border-b border-border mb-6">
                        <button
                            onClick={() => setActiveTab('ads')}
                            className={cn(
                                "pb-4 text-sm font-black uppercase tracking-widest transition-all relative",
                                activeTab === 'ads' ? "text-primary" : "text-muted hover:text-foreground"
                            )}
                        >
                            {isOwner ? 'Мои объявления' : 'Объявления'}
                            {activeTab === 'ads' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full" />}
                        </button>
                        {isOwner && (
                            <button
                                onClick={() => setActiveTab('favorites')}
                                className={cn(
                                    "pb-4 text-sm font-black uppercase tracking-widest transition-all relative",
                                    activeTab === 'favorites' ? "text-primary" : "text-muted hover:text-foreground"
                                )}
                            >
                                Избранное
                                {activeTab === 'favorites' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full" />}
                            </button>
                        )}
                    </div>

                    {/* Results Grid */}
                    <section>
                        {displayAds.length > 0 ? (
                            <div className="grid sm:grid-cols-2 gap-6">
                                {displayAds.map(ad => (
                                    <div key={ad.id} className="bg-surface border border-border rounded-2xl overflow-hidden hover:shadow-lg transition-all group relative">
                                        <Link href={`/ad?id=${ad.id}`}>
                                            <div className="aspect-video bg-muted relative overflow-hidden">
                                                {ad.images?.[0] ? (
                                                    <img src={ad.images[0]} alt={ad.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-muted">Нет фото</div>
                                                )}
                                                {isOwner && activeTab === 'ads' && (
                                                    <div className={cn(
                                                        "absolute top-2 right-2 px-2 py-1 rounded text-[10px] font-black uppercase text-white shadow-sm",
                                                        ad.status === 'active' ? "bg-green-500" :
                                                            ad.status === 'pending' ? "bg-orange-500" : "bg-red-500"
                                                    )}>
                                                        {ad.status === 'active' ? 'Активно' :
                                                            ad.status === 'pending' ? 'На модерации' : 'Архив'}
                                                    </div>
                                                )}
                                                {activeTab === 'favorites' && (
                                                    <div className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full shadow-lg">
                                                        <Heart className="h-3 w-3 fill-current" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="p-4">
                                                <div className="text-lg font-black mb-1">{ad.price ? `${ad.price.toLocaleString()} ₽` : 'Цена договорная'}</div>
                                                <div className="text-sm font-bold line-clamp-1 mb-2 group-hover:text-primary transition-colors">{ad.title}</div>
                                                <div className="flex justify-between text-[10px] text-muted font-bold uppercase tracking-tighter">
                                                    <span>{ad.categories?.name}</span>
                                                    <span>{ad.city}</span>
                                                </div>
                                            </div>
                                        </Link>
                                        {isOwner && activeTab === 'ads' && (
                                            <button
                                                onClick={(e) => { e.preventDefault(); handleDeleteAd(ad.id); }}
                                                className="absolute bottom-4 right-4 p-2 bg-red-50 text-red-500 border border-red-100 rounded-lg hover:bg-red-500 hover:text-white transition-all shadow-sm"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-20 text-center text-muted border-2 border-dashed border-border rounded-3xl bg-surface/30">
                                {activeTab === 'ads' ? 'Объявлений пока нет' : 'В избранном пусто'}
                            </div>
                        )}
                    </section>

                    {/* Reviews Section */}
                    {activeTab === 'ads' && (
                        <section className="bg-surface border border-border rounded-3xl p-8 shadow-sm">
                            <h2 className="text-2xl font-black mb-8">Отзывы ({reviews.length})</h2>

                            {/* Leave a Review Form */}
                            {currentUser && currentUser.id !== id && (
                                <form onSubmit={submitReview} className="mb-12 p-6 bg-background rounded-2xl border border-border">
                                    <h3 className="font-black mb-4">Оставить отзыв</h3>
                                    <div className="flex gap-2 mb-4">
                                        {[1, 2, 3, 4, 5].map((s) => (
                                            <button
                                                key={s}
                                                type="button"
                                                onClick={() => setRating(s)}
                                                className={cn("p-1 transition-all", s <= rating ? "text-orange-500 scale-110" : "text-muted opacity-30")}
                                            >
                                                <Star className={cn("h-6 w-6", s <= rating ? "fill-current" : "")} />
                                            </button>
                                        ))}
                                    </div>
                                    <textarea
                                        value={comment}
                                        onChange={(e) => setComment(e.target.value)}
                                        placeholder="Расскажите о сделке..."
                                        required
                                        rows={3}
                                        className="w-full p-4 rounded-xl border border-border bg-surface outline-none focus:ring-2 focus:ring-primary mb-4"
                                    />
                                    <button
                                        type="submit"
                                        disabled={submittingReview}
                                        className="bg-primary text-white px-8 py-3 rounded-full font-black hover:bg-opacity-90 transition-all disabled:opacity-50"
                                    >
                                        {submittingReview ? 'Публикация...' : 'Отправить'}
                                    </button>
                                </form>
                            )}

                            {/* Reviews List */}
                            <div className="space-y-6">
                                {reviews.length > 0 ? (
                                    reviews.map(rev => (
                                        <div key={rev.id} className="border-b border-border pb-6 last:border-0">
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="w-10 h-10 rounded-full bg-muted overflow-hidden">
                                                    {rev.reviewer.avatar_url && <img src={rev.reviewer.avatar_url} alt={rev.reviewer.full_name} className="w-full h-full object-cover" />}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-sm">
                                                        {rev.reviewer.full_name}
                                                    </div>
                                                    <div className="flex gap-1">
                                                        {[...Array(5)].map((_, i) => (
                                                            <Star key={i} className={cn("h-3 w-3", i < rev.rating ? "fill-current text-orange-500" : "text-muted opacity-30")} />
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="ml-auto text-[10px] text-muted font-bold uppercase">{new Date(rev.created_at).toLocaleDateString()}</div>
                                            </div>
                                            <p className="text-sm text-foreground/80 leading-relaxed italic">"{rev.comment}"</p>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8 text-muted italic font-medium">Отзывов пока нет</div>
                                )}
                            </div>
                        </section>
                    )}
                </main>
            </div>
        </div>
    );
}

export default function UserProfilePage() {
    return (
        <Suspense fallback={<div className="p-20 text-center">Загрузка...</div>}>
            <UserProfileContent />
        </Suspense>
    );
}
