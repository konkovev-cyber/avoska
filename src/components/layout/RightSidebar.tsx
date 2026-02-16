'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { ExternalLink, Smartphone } from 'lucide-react';

export default function RightSidebar() {
    const pathname = usePathname();
    const [banners, setBanners] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const isHidden = pathname.startsWith('/admin') || pathname.startsWith('/login') || pathname.startsWith('/register');

    useEffect(() => {
        if (!isHidden) {
            fetchBanners();
        }
    }, [isHidden]);

    const fetchBanners = async () => {
        try {
            const { data } = await supabase
                .from('banners')
                .select('*')
                .eq('is_active', true);

            if (data) {
                // Shuffle and limit to 3 for sidebar
                const shuffled = data.sort(() => Math.random() - 0.5).slice(0, 3);
                setBanners(shuffled);

                // Track impressions
                shuffled.forEach(banner => {
                    supabase.rpc('increment_banner_impression', { banner_id: banner.id }).then(({ error }) => {
                        if (error) {
                            supabase.from('banners').update({ impressions_count: (banner.impressions_count || 0) + 1 }).eq('id', banner.id);
                        }
                    });
                });
            }
        } catch (e) {
            console.error('Error fetching banners:', e);
        } finally {
            setLoading(false);
        }
    };

    if (isHidden) return null;

    return (
        <aside className="hidden xl:flex flex-col gap-4 w-[320px] shrink-0 p-4 sticky top-20 h-[calc(100vh-5rem)] overflow-y-auto scrollbar-none">
            {/* Dynamic Banners */}
            {loading ? (
                [1, 2, 3].map(i => (
                    <div key={i} className="w-full aspect-video bg-muted/20 animate-pulse rounded-2xl" />
                ))
            ) : (
                banners.filter(b => b.image_url).map((banner) => (
                    <a
                        key={banner.id}
                        href={banner.link_url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => {
                            supabase.rpc('increment_banner_click', { banner_id: banner.id }).then(({ error }) => {
                                if (error) {
                                    supabase.from('banners').update({ clicks_count: (banner.clicks_count || 0) + 1 }).eq('id', banner.id);
                                }
                            });
                        }}
                        className="group relative w-full aspect-video rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all border border-border/50 bg-surface block"
                    >
                        <img
                            src={banner.image_url}
                            alt={banner.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />

                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-4 flex flex-col justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <h3 className="text-white font-bold text-sm line-clamp-1">{banner.title}</h3>
                            {banner.content && (
                                <p className="text-white/80 text-xs line-clamp-2 mt-1">{banner.content}</p>
                            )}
                            <div className="mt-2 flex items-center gap-1 text-[10px] uppercase font-black tracking-wider text-primary-foreground">
                                <span>Открыть</span>
                                <ExternalLink className="h-3 w-3" />
                            </div>
                        </div>

                        <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-black/30 backdrop-blur-md rounded text-[9px] font-bold text-white/50 uppercase tracking-widest border border-white/10">
                            Реклама
                        </div>
                    </a>
                ))
            )}

            {/* Fallback if no banners */}
            {!loading && banners.filter(b => b.image_url).length === 0 && (
                <div className="p-8 text-center bg-muted/5 rounded-2xl border border-border/50 border-dashed">
                    <p className="text-sm text-muted">Место для вашей рекламы</p>
                </div>
            )}

            {/* Footer Links */}
            <div className="mt-auto pt-6 text-[10px] text-muted-foreground font-medium text-center border-t border-border/10">
                <div className="flex items-center justify-center gap-1.5 text-primary/40 font-black uppercase tracking-widest mb-2">
                    <Smartphone className="h-3 w-3" />
                    <span>v0.1.1</span>
                </div>
                © 2026 Авоська+ <br />
                <div className="mt-1">
                    <Link href="/privacy" className="hover:underline">Конфиденциальность</Link> • <Link href="/terms" className="hover:underline">Оферта</Link>
                </div>
            </div>
        </aside>
    );
}
