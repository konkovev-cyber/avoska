'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Heart, Package, MapPin, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function FavoritesPage() {
    const [favorites, setFavorites] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        fetchFavorites();
    }, []);

    const fetchFavorites = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            router.push('/login');
            return;
        }

        const { data, error } = await supabase
            .from('favorites')
            .select(`
                *,
                ads:ad_id (
                    *,
                    profiles:user_id (is_verified)
                )
            `)
            .eq('user_id', session.user.id);

        if (error) {
            console.error('Error fetching favorites:', error);
        }

        if (data) {
            // Filter out favorites where the joined ad is null
            const validFavorites = data.filter(item => item.ads !== null);
            setFavorites(validFavorites);
        }
        setLoading(false);
    };

    if (loading) return (
        <div className="container mx-auto px-4 py-20 flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
    );

    return (
        <div className="bg-background min-h-screen pb-20">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-background border-b border-border px-4 h-14 flex items-center gap-4">
                <button onClick={() => router.back()} className="p-2 hover:bg-surface rounded-full">
                    <ChevronLeft className="h-6 w-6" />
                </button>
                <h1 className="text-xl font-black">Избранное</h1>
            </header>

            <div className="container mx-auto px-4 py-6">
                {favorites.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
                        {favorites.map(({ ads: ad }) => (
                            <Link
                                key={ad.id}
                                href={`/ad/?id=${ad.id}`}
                                className="bg-surface border border-border rounded-3xl overflow-hidden hover:shadow-lg transition-all flex flex-col group"
                            >
                                <div className="aspect-square bg-muted relative overflow-hidden">
                                    {ad.images?.[0] ? (
                                        <img src={ad.images[0]} alt={ad.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-muted text-xs uppercase font-bold tracking-widest">Нет фото</div>
                                    )}
                                    <div className="absolute top-2 right-2 p-1.5 bg-red-500 rounded-full shadow-lg">
                                        <Heart className="h-4 w-4 fill-white text-white" />
                                    </div>
                                </div>
                                <div className="p-3 flex flex-col flex-1">
                                    <h3 className="text-[13px] font-bold text-foreground leading-[1.3] line-clamp-2 mb-1.5 group-hover:text-primary transition-colors h-9">
                                        {ad.title}
                                    </h3>
                                    <div className="text-[17px] font-black text-foreground mb-2">
                                        {ad.price ? `${ad.price.toLocaleString()} ₽` : 'Договорная'}
                                    </div>
                                    <div className="mt-auto flex items-center gap-1 text-[11px] text-foreground/50 font-medium">
                                        <MapPin className="h-3 w-3 text-primary/60" />
                                        <span className="truncate">{ad.city}</span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-surface rounded-[3rem] border border-dashed border-border">
                        <Heart className="h-16 w-16 text-muted/20 mx-auto mb-6" />
                        <h2 className="text-2xl font-black mb-2">В избранном пусто</h2>
                        <p className="text-muted mb-8 max-w-xs mx-auto">Добавляйте объявления в избранное, чтобы не потерять их</p>
                        <Link href="/" className="inline-flex bg-primary text-white px-8 py-3 rounded-xl font-black shadow-lg shadow-primary/20 hover:scale-105 transition-transform active:scale-95">
                            Найти что-нибудь
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
