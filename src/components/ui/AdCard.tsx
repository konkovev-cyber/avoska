'use client';

import Link from 'next/link';
import { Heart, MapPin, Star, Eye, Crown, Zap, Flame, Sparkles } from 'lucide-react';
import { getOptimizedImageUrl } from '@/lib/image-utils';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
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
                "group relative flex flex-col h-full gap-1 outline-none rounded-[1.8rem] transition-all p-1.5",
                "bg-white/40 border border-white/60 backdrop-blur-xl hover:bg-white/60 shadow-sm",
                ad.is_vip && "bg-gradient-to-br from-amber-500/5 to-purple-600/5 border-amber-500/30 shadow-xl shadow-amber-500/10",
                ad.is_color_highlight && !ad.is_vip && "bg-orange-50/50 dark:bg-orange-950/20 border-orange-400/40 shadow-md shadow-orange-500/5",
                ad.is_urgent && !ad.is_vip && !ad.is_color_highlight && "border-red-400/40 shadow-sm shadow-red-500/5 bg-red-50/50"
            )}
        >
            <div className={cn(
                "aspect-square w-full relative overflow-hidden rounded-[1.4rem] bg-muted border border-border/10 group-hover:shadow-lg transition-all active:scale-[0.98]",
                ad.is_vip && "ring-2 ring-amber-500 ring-offset-1 ring-offset-background/50"
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
                        <div className="w-full h-full relative group/image">
                            {/* Animated shimmer for VIP */}
                            {ad.is_vip && (
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/image:animate-[shimmer_2s_infinite] z-10 pointer-events-none" />
                            )}

                            <OptimizedImage
                                src={ad.images[0]}
                                width={400}
                                alt={ad.title}
                                className="transition-transform duration-700 group-hover:scale-110"
                                objectFit="contain"
                            />
                        </div>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted italic text-[10px]">Нет фото</div>
                    )
                )}

                <div className="absolute top-2 left-2 flex flex-col gap-1 items-start z-20 pointer-events-none">
                    {ad.is_vip && (
                        <div className="px-2 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[9px] font-bold uppercase rounded-lg shadow-lg flex items-center gap-1 border border-white/20">
                            <Crown className="h-3 w-3 fill-current" />
                            VIP
                        </div>
                    )}
                    {ad.is_color_highlight && !ad.is_vip && (
                        <div className="px-2 py-1 bg-gradient-to-r from-orange-500 to-yellow-500 text-white text-[9px] font-bold uppercase rounded-lg shadow-lg flex items-center gap-1 border border-white/20">
                            <Zap className="h-3 w-3 fill-current" />
                            ТОП
                        </div>
                    )}
                    {ad.is_urgent && (
                        <div className="px-2 py-1 bg-gradient-to-r from-red-500 to-rose-600 text-white text-[9px] font-bold uppercase rounded-lg shadow-lg flex items-center gap-1 border border-white/20">
                            <Flame className="h-3 w-3 fill-current" />
                            СРОЧНО
                        </div>
                    )}
                </div>

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
