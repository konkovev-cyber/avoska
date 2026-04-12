'use client';

import { useState, useEffect } from 'react';
import { Smartphone, ChevronRight, MessageCircle, Megaphone, Star, ImageIcon, Sparkles } from 'lucide-react';
import BannerCheckoutModal from '@/components/UserBannerCheckoutModal';
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
    const [isBannerModalOpen, setIsBannerModalOpen] = useState(false);

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

    // 3. Dedicated "Your Ad Here" Slide at the end
    allBanners.push({
        id: 'buy-ad-slide',
        content: (
            <div className="w-full h-full bg-gradient-to-r from-amber-500 to-orange-600 rounded-2xl p-4 md:p-6 flex items-center justify-between gap-4 relative overflow-hidden shadow-lg group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full -ml-12 -mb-12 blur-xl" />

                <div className="relative z-10 flex items-center gap-3 md:gap-5 flex-1 min-w-0">
                    <div className="w-10 h-10 md:w-14 md:h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shrink-0 shadow-inner">
                        <Sparkles className="h-6 w-6 md:h-8 md:w-8 text-white" />
                    </div>
                    <div className="overflow-hidden">
                        <h3 className="text-white text-sm md:text-xl font-bold tracking-tight leading-tight truncate">Ваша реклама здесь</h3>
                        <p className="text-white/80 text-[10px] md:text-sm font-medium mt-0.5 line-clamp-1">Охватите тысячи пользователей за 1000 ₽</p>
                    </div>
                </div>

                <div className="relative z-10 shrink-0">
                    <button
                        onClick={() => setIsBannerModalOpen(true)}
                        className="bg-white text-orange-600 px-5 md:px-8 py-2 md:py-3 rounded-xl font-bold text-[10px] md:text-sm shadow-xl hover:scale-[1.05] active:scale-95 transition-all uppercase tracking-widest"
                    >
                        Разместить
                    </button>
                </div>
            </div>
        )
    });

    useEffect(() => {
        if (allBanners.length <= 1) return;
        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % allBanners.length);
        }, 45000);
        return () => clearInterval(interval);
    }, [allBanners.length]);

    if (allBanners.length === 0) {
        return (
            <div className="relative w-full h-[180px] md:h-[130px] rounded-2xl overflow-hidden shadow-sm bg-surface border border-dashed border-border/50 flex flex-col items-center justify-center gap-3">
                <p className="text-sm font-semibold text-muted uppercase tracking-widest text-center px-4">Здесь могла быть ваша реклама</p>
                <button onClick={() => setIsBannerModalOpen(true)} className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white rounded-xl font-bold uppercase text-[10px] md:text-xs tracking-widest shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2">
                    <Sparkles className="h-4 w-4" /> Разместить за 1000 ₽
                </button>
                {isBannerModalOpen && <BannerCheckoutModal position="top" onClose={() => setIsBannerModalOpen(false)} />}
            </div>
        );
    }

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

            {isBannerModalOpen && <BannerCheckoutModal position="top" onClose={() => setIsBannerModalOpen(false)} />}
        </section>
    );
}
