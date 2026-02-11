'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { User, Package, Heart, Star, Settings, ExternalLink, Trash2, PowerOff } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function ProfilePage() {
    const [profile, setProfile] = useState<any>(null);
    const [myAds, setMyAds] = useState<any[]>([]);
    const [favorites, setFavorites] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'my-ads' | 'favorites'>('my-ads');

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

        // Fetch My Ads
        const { data: adsData } = await supabase
            .from('ads')
            .select('*, categories(name)')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false });

        setMyAds(adsData || []);

        // Fetch Favorites
        const { data: favsData } = await supabase
            .from('favorites')
            .select('*, ads(*, categories(name))')
            .eq('user_id', session.user.id);

        setFavorites(favsData || []);
        setLoading(false);
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

    if (loading) return (
        <div className="container mx-auto px-4 py-20 flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
    );

    return (
        <div className="container mx-auto px-4 py-8 max-w-6xl">
            {/* Profile Header Card */}
            <div className="bg-surface border border-border rounded-3xl p-8 mb-8 shadow-sm flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-accent/10 border-2 border-accent/20 flex items-center justify-center text-4xl font-black text-accent overflow-hidden">
                    {profile?.avatar_url ? (
                        <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
                    ) : (
                        profile?.full_name?.charAt(0) || '?'
                    )}
                </div>
                <div className="flex-1">
                    <h1 className="text-3xl font-black mb-2">{profile?.full_name || 'Пользователь'}</h1>
                    <div className="flex flex-wrap justify-center md:justify-start gap-4 text-sm text-muted font-medium uppercase tracking-wider">
                        <div className="flex items-center gap-1 text-orange-500">
                            <Star className="h-4 w-4 fill-current" />
                            <span>Рейтинг: {profile?.rating || '0.0'}</span>
                        </div>
                        <div>На Авоське с {new Date(profile?.created_at).getFullYear()}г.</div>
                        <div>ID: {profile?.id.slice(0, 8)}</div>
                    </div>
                </div>
                <button
                    onClick={() => toast.info('Настройки профиля скоро будут доступны')}
                    className="p-4 bg-background border border-border rounded-2xl hover:bg-muted transition-all"
                >
                    <Settings className="h-6 w-6" />
                </button>
            </div>

            {/* Tabs Navigation */}
            <div className="flex border-b border-border mb-8 overflow-x-auto no-scrollbar">
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
            </div>

            {/* Content Grid */}
            <div className="grid gap-6">
                {activeTab === 'my-ads' && (
                    myAds.length > 0 ? (
                        myAds.map(ad => (
                            <div key={ad.id} className="bg-surface border border-border rounded-2xl p-4 flex gap-4 md:gap-6 items-center hover:shadow-md transition-all">
                                <div className="w-20 h-20 md:w-32 md:h-32 bg-muted rounded-xl overflow-hidden shrink-0 border border-border">
                                    {ad.images?.[0] ? (
                                        <img src={ad.images[0]} alt={ad.title} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-[10px] text-muted uppercase">Нет фото</div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={cn(
                                            "text-[10px] font-black uppercase px-2 py-0.5 rounded-md",
                                            ad.status === 'active' ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"
                                        )}>
                                            {ad.status === 'active' ? 'Активно' : 'Снято'}
                                        </span>
                                        <span className="text-[10px] text-muted font-bold uppercase">{ad.categories.name}</span>
                                    </div>
                                    <Link href={`/ads/${ad.id}`} className="block text-lg font-bold truncate hover:text-primary transition-colors">
                                        {ad.title}
                                    </Link>
                                    <div className="text-xl font-black mt-1">{ad.price ? `${ad.price.toLocaleString()} ₽` : 'Цена не указана'}</div>
                                </div>
                                <div className="flex flex-col md:flex-row gap-2">
                                    <button
                                        onClick={() => toggleAdStatus(ad.id, ad.status)}
                                        className={cn(
                                            "p-3 rounded-xl border transition-all hover:shadow-sm",
                                            ad.status === 'active' ? "text-orange-600 border-orange-200 hover:bg-orange-50" : "text-green-600 border-green-200 hover:bg-green-50"
                                        )}
                                        title={ad.status === 'active' ? "Снять с публикации" : "Активировать"}
                                    >
                                        <PowerOff className="h-5 w-5" />
                                    </button>
                                    <button
                                        onClick={() => deleteAd(ad.id)}
                                        className="p-3 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-all hover:shadow-sm"
                                        title="Удалить навсегда"
                                    >
                                        <Trash2 className="h-5 w-5" />
                                    </button>
                                    <Link
                                        href={`/ads/${ad.id}`}
                                        className="p-3 rounded-xl border border-border hover:bg-muted transition-all"
                                    >
                                        <ExternalLink className="h-5 w-5" />
                                    </Link>
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
                                <Link key={ad.id} href={`/ads/${ad.id}`} className="bg-surface border border-border rounded-2xl overflow-hidden hover:shadow-lg transition-all flex flex-col group">
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
            </div>
        </div>
    );
}
