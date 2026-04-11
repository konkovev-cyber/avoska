'use client';

import Link from 'next/link';
import { Heart, MapPin, Star, Eye, Crown } from 'lucide-react';
import { getOptimizedImageUrl } from '@/lib/image-utils';
import { Ad } from '@/lib/types';
import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
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
    showViews?: boolean;
}

export function AdCard({ ad, isHoverGallery = false, initialFavorite = false, showViews = false }: AdCardProps) {
    const [isFavorite, setIsFavorite] = useState(initialFavorite);
    const [isTouch, setIsTouch] = useState(true); // default to true (safe for SSR/mobile)

    useEffect(() => {
        // Detect touch-only devices: skip HoverImageGallery (hover = mouse only)
        setIsTouch(window.matchMedia('(hover: none)').matches);
    }, []);

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
        <Link prefetch={false}
            href={`/ad/?id=${ad.id}`}
            onClick={() => {
                if (typeof window !== 'undefined') {
                    sessionStorage.setItem('home_scrollY', window.scrollY.toString());
                    sessionStorage.setItem('home_restore', 'true');
                }
            }}
            className={cn(
                "group relative flex flex-col h-full gap-2 outline-none rounded-[1.5rem] transition-all p-1",
                ad.is_vip && "bg-gradient-to-br from-purple-500/10 to-indigo-500/10 border border-purple-500/20 shadow-lg shadow-purple-500/5",
                ad.is_color_highlight && !ad.is_vip && "bg-primary/5 border border-primary/20"
            )}
        >
            <div className={cn(
                "aspect-[4/3] w-full relative overflow-hidden rounded-[1.25rem] bg-muted border border-border/20 group-hover:shadow-lg transition-all active:scale-[0.98]",
                ad.is_vip && "ring-2 ring-purple-500 ring-offset-2 ring-offset-background"
            )}>
                {isHoverGallery && !isTouch ? (
                    <HoverImageGallery
                        images={ad.images}
                        alt={ad.title}
                        href={`/ad/?id=${ad.id}`}
                        layout="horizontal"
                    />
                ) : (
                    ad.images && ad.images.length > 0 ? (
                        <div className="w-full h-full relative">
                            {/* Blurred background for portrait images */}
                            <img
                                src={getOptimizedImageUrl(ad.images[0], { width: 100, quality: 30 })}
                                alt=""
                                aria-hidden="true"
                                className="absolute inset-0 w-full h-full object-cover blur-xl scale-110 opacity-60 pointer-events-none select-none"
                            />
                            {/* Main image — contain so portrait photos are never cropped */}
                            <img
                                src={getOptimizedImageUrl(ad.images[0], { width: 400, quality: 75 })}
                                alt={ad.title}
                                loading="lazy"
                                className="relative w-full h-full object-contain transition-transform duration-700 group-hover:scale-105"
                            />
                        </div>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted italic text-[10px]">Нет фото</div>
                    )
                )}

                {ad.is_vip && (
                    <div className="absolute top-2 left-2 px-2 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[9px] font-bold uppercase rounded-lg shadow-lg z-20 pointer-events-none flex items-center gap-1 border border-white/20">
                        <Crown className="h-3 w-3 fill-current" />
                        VIP
                    </div>
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
                            : "bg-surface/90 text-muted hover:bg-surface hover:text-red-500"
                    )}
                    aria-label={isFavorite ? "Убрать из избранного" : "Добавить в избранное"}
                >
                    <Heart className={cn("h-4 w-4", isFavorite && "fill-current")} />
                </button>
            </div>

            <div className="flex flex-col flex-1 gap-1 px-1">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                    <div className="text-base font-bold text-foreground tracking-tight leading-none">
                        {ad.price ? `${ad.price.toLocaleString()} ₽` : 'Договорная'}
                    </div>
                    {showViews && (
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground bg-secondary/10 px-1.5 py-0.5 rounded-full">
                            <Eye className="h-3 w-3" />
                            <span>{ad.views_count || 0}</span>
                        </div>
                    )}
                </div>

                <h3 className="text-sm font-medium leading-snug line-clamp-2 text-foreground/90 group-hover:text-primary transition-colors">
                    {ad.title}
                </h3>

                {!isHoverGallery && ad.profiles && (
                    <div className="mt-auto pt-1 space-y-2">
                        <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground opacity-80">
                            <span className="truncate">{ad.city || 'Город'}</span>
                            <span className="shrink-0">{new Date(ad.created_at).toLocaleDateString("ru-RU")}</span>
                        </div>

                        <div className="pt-2 border-t border-border/40 flex items-center justify-between">
                            <div className="flex items-center gap-1.5 min-w-0">
                                <div className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center text-[7px] font-semibold shrink-0 overflow-hidden">
                                    {ad.profiles.avatar_url ? (
                                        <img src={ad.profiles.avatar_url} className="w-full h-full object-cover" alt="avatar" />
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
                    <div className="mt-auto pt-1 flex items-center gap-1 text-[11px] font-medium text-muted-foreground opacity-80">
                        <span className="truncate">{ad.city || 'Город'}</span>
                    </div>
                )}
            </div>
        </Link>
    );
}
