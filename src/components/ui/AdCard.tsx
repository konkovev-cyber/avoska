import Link from 'next/link';
import { Heart, MapPin, Star } from 'lucide-react';
import { getOptimizedImageUrl } from '@/lib/image-utils';
import { Ad } from '@/lib/types';
import dynamic from 'next/dynamic';

const HoverImageGallery = dynamic(() => import('@/components/ui/HoverImageGallery'), {
    ssr: false,
    loading: () => <div className="w-full h-full bg-muted animate-pulse" />
});

interface AdCardProps {
    ad: Ad;
    isHoverGallery?: boolean;
}

export function AdCard({ ad, isHoverGallery = false }: AdCardProps) {
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
                    <div className="absolute top-2 right-2 px-2 py-1 bg-green-500 text-white text-[9px] font-bold uppercase rounded shadow-sm z-20 pointer-events-none">
                        Новое
                    </div>
                )}

                {ad.status === 'pending' && (
                    <div className="absolute top-2 left-2 px-2 py-1 bg-yellow-500 text-white text-[9px] font-bold uppercase rounded shadow-sm z-20 pointer-events-none">
                        На проверке
                    </div>
                )}

                {/* Heart icon on category page style */}
                {!isHoverGallery && (
                    <button className="absolute top-2 right-2 p-1.5 bg-surface/80 backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-surface text-muted hover:text-red-500 z-10">
                        <Heart className="h-4 w-4" />
                    </button>
                )}
            </div>

            <div className="p-2.5 md:p-3 flex flex-col flex-1 gap-1">
                <div className="text-[15px] md:text-base font-black text-foreground tracking-tight leading-none">
                    {ad.price ? `${ad.price.toLocaleString()} ₽` : 'Договорная'}
                </div>

                <h3 className="text-[13px] font-medium leading-snug line-clamp-2 text-foreground/90 min-h-[2.5em] group-hover:text-primary transition-colors">
                    {ad.title}
                </h3>

                {!isHoverGallery && ad.profiles && (
                    <div className="mt-auto pt-2 space-y-2">
                        <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-wide opacity-70">
                            <div className="flex items-center gap-1 truncate">
                                <MapPin className="h-3 w-3 shrink-0" />
                                <span className="truncate">{ad.city || 'Город'}</span>
                            </div>
                            <span className="shrink-0">{new Date(ad.created_at).toLocaleDateString("ru-RU")}</span>
                        </div>

                        <div className="pt-2 border-t border-border/40 flex items-center justify-between">
                            <div className="flex items-center gap-1.5 min-w-0">
                                <div className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center text-[7px] font-black shrink-0">
                                    {ad.profiles.avatar_url ? (
                                        <img src={ad.profiles.avatar_url} className="w-full h-full object-cover rounded-full" alt="avatar" />
                                    ) : (
                                        ad.profiles.full_name?.charAt(0) || '?'
                                    )}
                                </div>
                                <span className="text-[9px] font-bold truncate text-muted-foreground">{ad.profiles.full_name?.split(' ')[0]}</span>
                            </div>
                            <div className="flex items-center gap-0.5 text-orange-500">
                                <Star className="h-2.5 w-2.5 fill-current" />
                                <span className="text-[9px] font-black">{ad.profiles.rating?.toFixed(1) || '5.0'}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Minimal footer for standard layout without profile data */}
                {(isHoverGallery || !ad.profiles) && (
                    <div className="mt-auto pt-1.5 flex items-center gap-1 text-[9px] font-bold text-muted-foreground uppercase tracking-wide opacity-70">
                        <MapPin className="h-2.5 w-2.5 shrink-0" />
                        <span className="truncate">{ad.city || 'Город'}</span>
                    </div>
                )}
            </div>
        </Link>
    );
}
