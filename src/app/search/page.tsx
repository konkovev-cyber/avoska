'use client';

import { useEffect, useState, Suspense } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useSearchParams } from 'next/navigation';
import { Search, Filter, MapPin, PackageOpen } from 'lucide-react';
import Link from 'next/link';

function SearchContent() {
    const searchParams = useSearchParams();
    const query = searchParams.get('q') || '';

    const [ads, setAds] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (query) {
            performSearch();
        } else {
            setLoading(false);
        }
    }, [query]);

    const performSearch = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('ads')
            .select('*, profiles!user_id(full_name, rating), categories!category_id(name)')
            .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
            .eq('status', 'active')
            .order('created_at', { ascending: false });

        setAds(data || []);
        setLoading(false);
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-black mb-2 flex items-center gap-3">
                    <Search className="h-8 w-8 text-primary" />
                    Поиск: {query}
                </h1>
                <p className="text-muted font-medium">Найдено {ads.length} результатов</p>
            </div>

            {loading ? (
                <div className="py-20 flex justify-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                </div>
            ) : ads.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {ads.map((ad) => (
                        <Link
                            key={ad.id}
                            href={`/ad?id=${ad.id}`}
                            className="bg-surface rounded-2xl border border-border overflow-hidden hover:shadow-lg transition-all flex flex-col h-full group"
                        >
                            <div className="aspect-square bg-muted relative overflow-hidden">
                                {ad.images?.[0] ? (
                                    <img src={ad.images[0]} alt={ad.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-muted">Нет фото</div>
                                )}
                                <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm text-[10px] text-foreground font-black px-2 py-1 rounded-md shadow-sm uppercase">
                                    {ad.categories.name}
                                </div>
                            </div>
                            <div className="p-4 flex flex-col flex-1">
                                <div className="text-xl font-black mb-1">{ad.price ? `${ad.price.toLocaleString()} ₽` : 'Цена договорная'}</div>
                                <h3 className="line-clamp-2 text-sm font-medium mb-4 group-hover:text-primary transition-colors">{ad.title}</h3>
                                <div className="mt-auto flex items-center justify-between text-[11px] text-muted font-bold uppercase tracking-tight">
                                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {ad.city}</span>
                                    <span>{new Date(ad.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            ) : (
                <div className="py-32 text-center bg-surface rounded-3xl border border-dashed border-border flex flex-col items-center">
                    <PackageOpen className="h-12 w-12 text-muted mb-4" />
                    <h3 className="text-xl font-bold">Ничего не нашли</h3>
                    <p className="text-muted mt-2">Попробуйте использовать другие слова или изменить запрос</p>
                </div>
            )}
        </div>
    );
}

export default function SearchPage() {
    return (
        <Suspense fallback={<div className="py-20 text-center font-bold">Загрузка поиска...</div>}>
            <SearchContent />
        </Suspense>
    );
}
