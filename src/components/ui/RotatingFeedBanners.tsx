'use client';

import { useState, useEffect } from 'react';
import { Smartphone, ChevronRight, MessageCircle, Megaphone, Star, ImageIcon } from 'lucide-react';
import { APK_DOWNLOAD_URL } from '@/lib/constants';
import { supabase } from '@/lib/supabase/client';
import { getOptimizedImageUrl } from '@/lib/image-utils';
import { Banner } from '@/lib/types';
import { cn } from '@/lib/utils';

interface RotatingFeedBannersProps {
    topBanners: Banner[];
    isMobileApp: boolean;
}

const ICON_MAP: Record<string, any> = {
    MessageCircle,
    Megaphone,
    Smartphone,
    Star,
    ImageIcon
};

export default function RotatingFeedBanners({ topBanners, isMobileApp }: RotatingFeedBannersProps) {
    const [currentIndex, setCurrentIndex] = useState(0);

    // Build the dynamic list of banners
    const allBanners: { id: string; content: React.ReactNode }[] = [];

    // 1. APK download block (Static logic)
    if (!isMobileApp) {
        allBanners.push({
            id: 'apk-static',
            content: (
                <div className="bg-gradient-to-r from-green-600 to-green-700 w-full h-full rounded-2xl p-4 md:p-6 text-white relative overflow-hidden shadow-xl shadow-green-900/5 flex flex-col justify-center">
                    <div className="relative z-10 w-full flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-4 h-full">
                        <div className="flex items-center gap-3 md:gap-4 flex-1">
                            <div className="w-10 h-10 md:w-12 md:h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center shrink-0">
                                <Smartphone className="h-6 w-6 md:h-7 md:w-7 text-white" />
                            </div>
                            <div>
                                <h3 className="text-base md:text-xl font-semibold tracking-tight">Установите Авоську+</h3>
                                <p className="text-green-50/70 text-[10px] md:text-xs font-semibold uppercase tracking-wider mt-0.5">Приложение для Android стало быстрее и удобнее</p>
                            </div>
                        </div>

                        <a
                            href={APK_DOWNLOAD_URL}
                            className="w-full md:w-auto inline-flex items-center justify-center gap-2 bg-white text-green-700 px-6 py-2.5 md:py-3 rounded-xl font-semibold text-xs md:text-sm shadow-lg shadow-black/10 hover:scale-[1.02] active:scale-[0.98] transition-all shrink-0"
                        >
                            <span>Скачать .apk</span>
                            <ChevronRight className="h-4 w-4" />
                        </a>
                    </div>
                </div>
            )
        });
    }

    // 2. Add DB Banners (Image or Text)
    (topBanners || []).forEach(banner => {
        if (banner.type === 'text') {
            const Icon = ICON_MAP[banner.icon_name || 'Megaphone'] || Megaphone;
            allBanners.push({
                id: `db-${banner.id}`,
                content: (
                    <div className={cn("w-full h-full rounded-2xl p-4 md:p-6 text-white relative overflow-hidden shadow-xl flex flex-col justify-center", banner.background_color || 'bg-gradient-to-r from-primary to-emerald-600')}>
                        <div className="relative z-10 w-full flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-4 h-full">
                            <div className="flex items-center gap-3 md:gap-4 flex-1">
                                <div className="w-10 h-10 md:w-12 md:h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center shrink-0">
                                    <Icon className="h-6 w-6 md:h-7 md:w-7 text-white" />
                                </div>
                                <div className="max-w-2xl">
                                    <h3 className="text-base md:text-xl font-bold tracking-tight leading-tight">{banner.title}</h3>
                                    <p className="text-white/80 text-[10px] md:text-[12px] font-medium leading-tight mt-1 line-clamp-2 md:line-clamp-none">
                                        {banner.content}
                                    </p>
                                </div>
                            </div>

                            {banner.link_url && (
                                <a
                                    href={banner.link_url}
                                    target={banner.link_url.startsWith('http') ? '_blank' : '_self'}
                                    rel="noopener noreferrer"
                                    onClick={async () => {
                                        await supabase.rpc('increment_banner_click', { banner_id: banner.id });
                                    }}
                                    className="w-full md:w-auto inline-flex items-center justify-center gap-2 bg-white text-primary px-6 py-2.5 md:py-3 rounded-xl font-bold text-xs md:text-sm shadow-lg shadow-black/10 hover:scale-[1.02] active:scale-[0.98] transition-all whitespace-nowrap shrink-0"
                                >
                                    <span>{banner.button_text || 'Перейти'}</span>
                                    <ChevronRight className="h-4 w-4" />
                                </a>
                            )}
                        </div>
                    </div>
                )
            });
        } else {
            // Image banner
            allBanners.push({
                id: `db-${banner.id}`,
                content: (
                    <a
                        href={banner.link_url || '#'}
                        target={banner.link_url?.startsWith('http') ? '_blank' : '_self'}
                        rel="noopener noreferrer"
                        onClick={async () => {
                            await supabase.rpc('increment_banner_click', { banner_id: banner.id });
                        }}
                        className="block w-full h-full relative rounded-2xl overflow-hidden shadow-xl group border border-border"
                    >
                        <img
                            src={getOptimizedImageUrl(banner.image_url, { width: 1200, quality: 80 })}
                            alt={banner.title || 'Реклама'}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
                        <div className="absolute top-3 right-3 px-2.5 py-1 bg-black/50 backdrop-blur-md rounded-lg text-[9px] font-bold text-white uppercase tracking-widest border border-white/20">
                            Реклама
                        </div>
                        {banner.title && (
                            <div className="absolute bottom-4 left-4 right-4 z-10 pointer-events-none">
                                <h4 className="text-white font-bold text-sm md:text-lg drop-shadow-md line-clamp-1">{banner.title}</h4>
                            </div>
                        )}
                    </a>
                )
            });
        }
    });

    useEffect(() => {
        if (allBanners.length <= 1) return;
        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % allBanners.length);
        }, 45000);
        return () => clearInterval(interval);
    }, [allBanners.length]);

    if (allBanners.length === 0) return null;

    return (
        <section className="relative w-full h-[180px] md:h-[130px] rounded-2xl overflow-hidden shadow-sm">
            {allBanners.map((banner, index) => (
                <div
                    key={banner.id}
                    className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === currentIndex ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'
                        }`}
                >
                    {banner.content}
                </div>
            ))}

            {/* Pagination Indicators */}
            {allBanners.length > 1 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
                    {allBanners.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => setCurrentIndex(index)}
                            className={`h-1.5 rounded-full transition-all duration-300 ${index === currentIndex
                                ? 'w-6 bg-white shadow-sm'
                                : 'w-1.5 bg-white/40 hover:bg-white/60'
                                }`}
                            aria-label={`Перейти к баннеру ${index + 1}`}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}
