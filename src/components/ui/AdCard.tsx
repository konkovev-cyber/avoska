'use client';

import Link from 'next/link';
import { Heart, MapPin, Star } from 'lucide-react';
import { getOptimizedImageUrl } from '@/lib/image-utils';
import { Ad } from '@/lib/types';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const HoverImageGallery = dynamic(() => import('@/components/ui/HoverImageGallery'), {
    ssr: false,
    loading: () => <div className="w-full h-full bg-muted animate-pulse" />,
});

interface AdCardProps {
    ad: Ad;
    isHoverGallery?: boolean;
    initialFavorite?: boolean;
}

export function AdCard({ ad, isHoverGallery = false, initialFavorite = false }: AdCardProps) {
    const [isFavorite, setIsFavorite] = useState(initialFavorite);

    const toggleFavorite = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            toast.error('Войдите, чтобы добавить в избранное');
            return;
        }

        const prev = isFavorite;
        setIsFavorite(!prev); // optimistic

        try {
            if (prev) {
                const { error } = await supabase.from('favorites')
                    .delete()
                    .eq('user_id', session.user.id)
                    .eq('ad_id', ad.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('favorites')
                    .insert({ user_id: session.user.id, ad_id: ad.id });
                if (error && error.code !== '23505') throw error;
            }
        } catch {
            setIsFavorite(prev); // rollback
            toast.error('Ошибка обновления избранного');
        }
    };

    return (
        <Link
            href={`/ad/?id=${ad.id}`}
            className="group relative flex flex-col h-full bg-surface rounded-2xl overflow-hidden hover:shadow-xl transition-all border border-border/40 active:scale-[0.98]"
        >
            <div className="aspect-[4/3] relative overflow-hidden bg-muted">
                {isHoverGallery ? (
                    <HoverImageGallery
                        images={ad.images}
                        alt={ad.title}
                        href={`/ad/?id=${ad.id}`}
                        layout="horizontal"
                    />
                ) : (
                    ad.images && ad.images.length > 0 ? (
                        <img
                            src={getOptimizedImageUrl(ad.images[0], { width: 400, quality: 75 })}
                            alt={ad.title}
                            loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted italic text-[10px]">Нет фото</div>
                    )
                )}

                {ad.condition === 'new' && (
                    <div className="absolute top-2 right-2 px-2 py-1 bg-green-500 text-white text-[9px] font-semibold uppercase rounded shadow-sm z-20 pointer-events-none">
                        Новое
                    </div>
                )}

                {ad.status === 'pending' && (
                    <div className="absolute top-2 left-2 px-2 py-1 bg-yellow-500 text-white text-[9px] font-semibold uppercase rounded shadow-sm z-20 pointer-events-none">
                        На проверке
                    </div>
                )}

                {/* Heart button — now works on every layout */}
                <button
                    onClick={toggleFavorite}
                    className={cn(
                        "absolute top-2 right-2 p-1.5 backdrop-blur-sm rounded-full transition-all z-10",
                        "opacity-0 group-hover:opacity-100",
                        isFavorite
                            ? "bg-red-500 text-white !opacity-100"
                            : "bg-surface/80 text-muted hover:bg-surface hover:text-red-500"
                    )}
                    aria-label={isFavorite ? "Убрать из избранного" : "Добавить в избранное"}
                >
                    <Heart className={cn("h-4 w-4", isFavorite && "fill-current")} />
                </button>
            </div>

            <div className="p-2.5 md:p-3 flex flex-col flex-1 gap-1">
                <div className="text-[15px] md:text-base font-semibold text-foreground tracking-tight leading-none">
                    {ad.price ? `${ad.price.toLocaleString()} ₽` : 'Договорная'}
                </div>

                <h3 className="text-[13px] font-medium leading-snug line-clamp-2 text-foreground/90 min-h-[2.5em] group-hover:text-primary transition-colors">
                    {ad.title}
                </h3>

                {!isHoverGallery && ad.profiles && (
                    <div className="mt-auto pt-2 space-y-2">
                        <div className="flex items-center justify-between text-[10px] font-semibold text-muted-foreground uppercase tracking-wide opacity-70">
                            <div className="flex items-center gap-1 truncate">
                                <MapPin className="h-3 w-3 shrink-0" />
                                <span className="truncate">{ad.city || 'Город'}</span>
                            </div>
                            <span className="shrink-0">{new Date(ad.created_at).toLocaleDateString("ru-RU")}</span>
                        </div>

                        <div className="pt-2 border-t border-border/40 flex items-center justify-between">
                            <div className="flex items-center gap-1.5 min-w-0">
                                <div className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center text-[7px] font-semibold shrink-0">
                                    {ad.profiles.avatar_url ? (
                                        <img src={ad.profiles.avatar_url} className="w-full h-full object-cover rounded-full" alt="avatar" />
                                    ) : (
                                        ad.profiles.full_name?.charAt(0) || '?'
                                    )}
                                </div>
                                <span className="text-[9px] font-semibold truncate text-muted-foreground">{ad.profiles.full_name?.split(' ')[0]}</span>
                            </div>
                            <div className="flex items-center gap-0.5 text-orange-500">
                                <Star className="h-2.5 w-2.5 fill-current" />
                                <span className="text-[9px] font-semibold">{ad.profiles.rating?.toFixed(1) || '5.0'}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Minimal footer for standard layout without profile data */}
                {(isHoverGallery || !ad.profiles) && (
                    <div className="mt-auto pt-1.5 flex items-center gap-1 text-[9px] font-semibold text-muted-foreground uppercase tracking-wide opacity-70">
                        <MapPin className="h-2.5 w-2.5 shrink-0" />
                        <span className="truncate">{ad.city || 'Город'}</span>
                    </div>
                )}
            </div>
        </Link>
    );
}
