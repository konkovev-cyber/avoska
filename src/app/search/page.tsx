'use client';

import { useEffect, useState, Suspense } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, Filter, MapPin, PackageOpen, SlidersHorizontal, X, ArrowUpDown, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/Skeleton';
import { getOptimizedImageUrl } from '@/lib/image-utils';
import { getStoredCity } from '@/lib/geo';
import { cn } from '@/lib/utils';

type SortOption = 'newest' | 'cheapest' | 'expensive';
type ConditionOption = 'all' | 'new' | 'used';

function SearchContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const query = searchParams.get('q') || '';

    const [ads, setAds] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showFilters, setShowFilters] = useState(false);

    // Filter states
    const [priceFrom, setPriceFrom] = useState('');
    const [priceTo, setPriceTo] = useState('');
    const [condition, setCondition] = useState<ConditionOption>('all');
    const [sortBy, setSortBy] = useState<SortOption>('newest');

    useEffect(() => {
        performSearch();
    }, [query, sortBy, condition]); // Re-search on query, sort or condition change

    const performSearch = async (cityOverride?: string) => {
        setLoading(true);
        try {
            const currentCity = cityOverride || getStoredCity();

            let q = supabase
                .from('ads')
                .select('*, profiles!user_id(full_name, rating, is_verified), category:category_id(name)')
                .eq('status', 'active');

            if (query) {
                q = q.or(`title.ilike.%${query}%,description.ilike.%${query}%`);
            }

            // Apply global city filter
            if (currentCity && currentCity !== 'Все города') {
                q = q.eq('city', currentCity);
            }

            // Apply price filters
            if (priceFrom) q = q.gte('price', parseFloat(priceFrom));
            if (priceTo) q = q.lte('price', parseFloat(priceTo));

            // Apply condition filter
            if (condition !== 'all') {
                q = q.eq('condition', condition);
            }

            // Apply sorting
            if (sortBy === 'newest') {
                q = q.order('created_at', { ascending: false });
            } else if (sortBy === 'cheapest') {
                q = q.order('price', { ascending: true });
            } else if (sortBy === 'expensive') {
                q = q.order('price', { ascending: false });
            }

            const { data, error } = await q;
            if (error) throw error;

            // Fallback Logic: if no results in city, try all cities
            if ((!data || data.length === 0) && currentCity && currentCity !== 'Все города') {
                console.log('No search results in city, falling back to all cities');
                await performSearch('Все города');
                return;
            }

            setAds(data || []);
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApplyFilters = () => {
        performSearch();
        setShowFilters(false);
    };

    const resetFilters = () => {
        setPriceFrom('');
        setPriceTo('');
        setCondition('all');
        setSortBy('newest');
        setShowFilters(false);
        // performSearch will be triggered by useEffect
    };

    return (
        <div className="container mx-auto px-4 py-6 max-w-[1200px]">
            {/* Search Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black flex items-center gap-2">
                        <span className="text-muted-foreground">Поиск:</span>
                        <span>{query || 'Все объявления'}</span>
                    </h1>
                    {!loading && (
                        <p className="text-sm font-bold text-muted-foreground mt-1">
                            Найдено {ads.length} результатов
                        </p>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {/* Sort Selector */}
                    <div className="relative group">
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as SortOption)}
                            className="appearance-none h-11 pl-4 pr-10 rounded-2xl bg-surface border border-border text-sm font-black focus:border-primary outline-none cursor-pointer transition-all"
                        >
                            <option value="newest">Сначала новые</option>
                            <option value="cheapest">Дешевле</option>
                            <option value="expensive">Дороже</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none group-hover:text-primary transition-colors" />
                    </div>

                    {/* Filter Toggle */}
                    <button
                        onClick={() => setShowFilters(true)}
                        className={cn(
                            "h-11 px-4 rounded-2xl border flex items-center gap-2 text-sm font-black transition-all",
                            (priceFrom || priceTo || condition !== 'all')
                                ? "bg-primary text-white border-primary"
                                : "bg-surface border-border hover:border-primary"
                        )}
                    >
                        <SlidersHorizontal className="h-4 w-4" />
                        <span>Фильтры</span>
                    </button>
                </div>
            </div>

            {/* Main Content Layout */}
            <div className="flex gap-8">
                {/* Desktop sidebar filters could go here if needed, but we use a drawer for mobile-first consistency */}

                <div className="flex-1">
                    {loading ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                                <div key={i} className="space-y-3">
                                    <Skeleton className="aspect-square w-full rounded-2xl" />
                                    <div className="space-y-2 px-1">
                                        <Skeleton className="h-4 w-3/4" />
                                        <Skeleton className="h-6 w-1/2" />
                                        <Skeleton className="h-3 w-1/4" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : ads.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8">
                            {ads.map((ad) => (
                                <Link
                                    key={ad.id}
                                    href={`/ad?id=${ad.id}`}
                                    className="group flex flex-col h-full bg-surface rounded-2xl overflow-hidden hover:shadow-xl transition-all border border-border/50"
                                >
                                    <div className="aspect-square relative overflow-hidden bg-muted">
                                        <img
                                            src={getOptimizedImageUrl(ad.images?.[0] || '', { width: 400, quality: 75 })}
                                            alt={ad.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                        <div className="absolute top-2 left-2 bg-black/50 backdrop-blur-md text-[10px] text-white font-black px-2 py-1 rounded-lg uppercase tracking-wider">
                                            {ad.category?.name}
                                        </div>
                                    </div>

                                    <div className="p-3 md:p-4 flex flex-col flex-1">
                                        <div className="text-lg md:text-xl font-black mb-1">
                                            {ad.price ? `${ad.price.toLocaleString()} ₽` : 'Договорная'}
                                        </div>
                                        <h3 className="text-xs md:text-sm font-medium line-clamp-2 mb-3 group-hover:text-primary transition-colors h-8 md:h-10">
                                            {ad.title}
                                        </h3>

                                        <div className="mt-auto pt-2 border-t border-border/30 flex items-center justify-between text-[10px] text-muted-foreground font-bold uppercase tracking-tight">
                                            <div className="flex items-center gap-1 truncate">
                                                <MapPin className="h-3 w-3 text-primary" />
                                                <span className="truncate">{ad.city}</span>
                                            </div>
                                            <span className="shrink-0">{new Date(ad.created_at).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="py-24 text-center bg-surface rounded-[3rem] border border-dashed border-border flex flex-col items-center animate-in fade-in zoom-in duration-500">
                            <PackageOpen className="h-16 w-16 text-muted mb-4 opacity-20" />
                            <h3 className="text-xl font-black">Ничего не нашли</h3>
                            <p className="text-muted mt-2 max-w-xs mx-auto font-medium">Попробуйте изменить параметры поиска или сбросить фильтры</p>
                            <button
                                onClick={resetFilters}
                                className="mt-8 px-8 py-3 bg-primary text-white font-black rounded-xl hover:opacity-90 active:scale-95 transition-all shadow-lg"
                            >
                                Сбросить всё
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Filter Drawer Overlay */}
            {showFilters && (
                <div className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div
                        className="absolute inset-y-0 right-0 w-full max-w-sm bg-background shadow-2xl animate-in slide-in-from-right duration-500 flex flex-col"
                    >
                        <div className="p-6 border-b border-border flex items-center justify-between shrink-0">
                            <h3 className="text-xl font-black">Фильтры</h3>
                            <button
                                onClick={() => setShowFilters(false)}
                                className="p-2 hover:bg-surface rounded-full transition-colors"
                            >
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-8">
                            {/* Price Range */}
                            <div>
                                <label className="block text-xs font-black uppercase text-muted-foreground mb-4 tracking-widest">Цена, ₽</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <span className="text-[10px] font-bold text-muted ml-1">От</span>
                                        <input
                                            type="number"
                                            placeholder="0"
                                            value={priceFrom}
                                            onChange={(e) => setPriceFrom(e.target.value)}
                                            className="w-full h-12 px-4 rounded-xl bg-surface border border-border outline-none focus:border-primary font-bold text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <span className="text-[10px] font-bold text-muted ml-1">До</span>
                                        <input
                                            type="number"
                                            placeholder="Дофига"
                                            value={priceTo}
                                            onChange={(e) => setPriceTo(e.target.value)}
                                            className="w-full h-12 px-4 rounded-xl bg-surface border border-border outline-none focus:border-primary font-bold text-sm"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Condition */}
                            <div>
                                <label className="block text-xs font-black uppercase text-muted-foreground mb-4 tracking-widest">Состояние</label>
                                <div className="flex flex-wrap gap-2">
                                    {(['all', 'new', 'used'] as ConditionOption[]).map((opt) => (
                                        <button
                                            key={opt}
                                            onClick={() => setCondition(opt)}
                                            className={cn(
                                                "px-5 py-2.5 rounded-xl text-xs font-black border transition-all truncate",
                                                condition === opt
                                                    ? "bg-primary text-white border-primary shadow-md active:scale-95"
                                                    : "bg-surface border-border hover:border-primary/50"
                                            )}
                                        >
                                            {opt === 'all' ? 'Любое' : opt === 'new' ? 'Новое' : 'Б/у'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-border grid grid-cols-2 gap-4 shrink-0 bg-surface/50">
                            <button
                                onClick={resetFilters}
                                className="h-14 rounded-2xl border border-border font-black text-sm hover:bg-background transition-all"
                            >
                                Сбросить
                            </button>
                            <button
                                onClick={handleApplyFilters}
                                className="h-14 rounded-2xl bg-primary text-white font-black text-sm shadow-xl active:scale-95 hover:opacity-90 transition-all"
                            >
                                Применить
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function SearchPage() {
    return (
        <Suspense fallback={
            <div className="container mx-auto px-4 py-20 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 font-black text-muted-foreground uppercase tracking-widest text-xs">Загрузка поиска...</p>
            </div>
        }>
            <SearchContent />
        </Suspense>
    );
}
