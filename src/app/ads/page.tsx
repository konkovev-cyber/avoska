'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import { Package, MapPin, Search, ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AdCard } from '@/components/ui/AdCard';
import { Ad } from '@/lib/types';

export default function AllAdsPage() {
    const router = useRouter();
    const [ads, setAds] = useState<Ad[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetchAds();
    }, []);

    const fetchAds = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('ads')
            .select('*, profiles!user_id(full_name, avatar_url, is_verified, rating)')
            .eq('status', 'active')
            .order('is_vip', { ascending: false, nullsFirst: false })
            .order('created_at', { ascending: false })
            .limit(400);

        setAds((data || []) as Ad[]);
        setLoading(false);
    };

    const filteredAds = ads.filter(ad =>
        ad.title.toLowerCase().includes(search.toLowerCase()) ||
        ad.description.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="container mx-auto px-4 py-8">
            <button
                onClick={() => router.back()}
                className="flex items-center gap-1.5 text-primary font-semibold text-xs uppercase tracking-widest mb-6 hover:opacity-70 transition-all active:scale-95"
            >
                <ChevronLeft className="h-4 w-4" /> Назад
            </button>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <h1 className="text-4xl font-semibold">Все объявления</h1>
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted h-5 w-5" />
                    <input
                        type="text"
                        placeholder="Поиск по всем объявлениям..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 rounded-2xl bg-surface border border-border outline-none focus:border-primary transition-colors"
                    />
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="aspect-[3/4] bg-muted animate-pulse rounded-2xl" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                    {filteredAds.map(ad => (
                        <AdCard key={ad.id} ad={ad} />
                    ))}
                </div>
            )}

            {!loading && filteredAds.length === 0 && (
                <div className="text-center py-20 bg-surface rounded-3xl border border-border border-dashed">
                    <Package className="h-12 w-12 text-muted mx-auto mb-4" />
                    <p className="text-muted font-semibold">Ничего не найдено</p>
                </div>
            )}
        </div>
    );
}
