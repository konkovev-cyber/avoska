'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import { Package, MapPin, Search } from 'lucide-react';

export default function AllAdsPage() {
    const [ads, setAds] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetchAds();
    }, []);

    const fetchAds = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('ads')
            .select('*, categories(name)')
            .eq('status', 'active')
            .order('created_at', { ascending: false });

        setAds(data || []);
        setLoading(false);
    };

    const filteredAds = ads.filter(ad =>
        ad.title.toLowerCase().includes(search.toLowerCase()) ||
        ad.description.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <h1 className="text-4xl font-black">Все объявления</h1>
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
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="aspect-[3/4] bg-muted animate-pulse rounded-3xl" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                    {filteredAds.map(ad => (
                        <Link href={`/ad?id=${ad.id}`} key={ad.id} className="group">
                            <div className="bg-surface rounded-3xl border border-border overflow-hidden hover:shadow-xl transition-all hover:border-primary h-full flex flex-col">
                                <div className="aspect-square relative overflow-hidden bg-muted">
                                    {ad.images?.[0] ? (
                                        <img src={ad.images[0]} alt={ad.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-muted">
                                            <Package className="h-10 w-10" />
                                        </div>
                                    )}
                                </div>
                                <div className="p-4 flex-1 flex flex-col">
                                    <div className="text-xl font-black mb-1">{ad.price ? `${ad.price.toLocaleString()} ₽` : 'Цена договорная'}</div>
                                    <h3 className="font-bold text-sm line-clamp-2 mb-2 flex-1">{ad.title}</h3>
                                    <div className="flex items-center gap-1 text-xs text-muted mt-auto">
                                        <MapPin className="h-3 w-3" />
                                        {ad.city || 'Город не указан'}
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}

            {!loading && filteredAds.length === 0 && (
                <div className="text-center py-20 bg-surface rounded-3xl border border-border border-dashed">
                    <Package className="h-12 w-12 text-muted mx-auto mb-4" />
                    <p className="text-muted font-bold">Ничего не найдено</p>
                </div>
            )}
        </div>
    );
}
