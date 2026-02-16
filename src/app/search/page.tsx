'use client';

import { useEffect, useState, Suspense } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, Filter, MapPin, PackageOpen, SlidersHorizontal, X, ArrowUpDown, ChevronDown, Check } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/Skeleton';
import { getOptimizedImageUrl } from '@/lib/image-utils';
import { getStoredCity } from '@/lib/geo';
import { cn } from '@/lib/utils';
import { recommendationService } from '@/lib/recommendations';

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
    const [categories, setCategories] = useState<any[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
    const [specFilters, setSpecFilters] = useState<Record<string, string>>({});

    // Modal states
    const [isSortModalOpen, setIsSortModalOpen] = useState(false);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [isTransmissionModalOpen, setIsTransmissionModalOpen] = useState(false);
    const [isRoomsModalOpen, setIsRoomsModalOpen] = useState(false);
    const [isGenderModalOpen, setIsGenderModalOpen] = useState(false);

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        const { data } = await supabase.from('categories').select('*').order('name');
        if (data) setCategories(data);
    };

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
                recommendationService.saveSearchQuery(query);
            }

            if (selectedCategoryId) {
                recommendationService.saveLastCategory(selectedCategoryId);
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

            // Apply category filter
            if (selectedCategoryId) {
                q = q.eq('category_id', selectedCategoryId);
            }

            // Apply specifications filter (JSONB exact matches)
            if (Object.keys(specFilters).length > 0) {
                const cleanSpecs = Object.fromEntries(
                    Object.entries(specFilters).filter(([_, v]) => v !== '')
                );
                if (Object.keys(cleanSpecs).length > 0) {
                    q = q.contains('specifications', cleanSpecs);
                }
            }

            // Primary sorting by VIP and Turbo status
            q = q.order('is_vip', { ascending: false });
            q = q.order('is_turbo', { ascending: false });

            // Apply secondary sorting
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
        setSelectedCategory('');
        setSelectedCategoryId('');
        setSpecFilters({});
        setShowFilters(false);
        // performSearch will be triggered by useEffect
    };

    return (
        <div className="container mx-auto px-4 py-6 max-w-[1200px]">
            {/* Sort Modal */}
            {isSortModalOpen && (
                <div className="fixed inset-0 z-[2000] flex items-end justify-center animate-in fade-in duration-200">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsSortModalOpen(false)} />
                    <div className="relative w-full max-w-lg bg-surface rounded-t-[2.5rem] p-6 shadow-2xl animate-in slide-in-from-bottom-full duration-300">
                        <div className="flex items-center justify-between mb-6 shrink-0">
                            <h2 className="text-xl font-black uppercase tracking-tight ml-2">Сортировка</h2>
                            <button onClick={() => setIsSortModalOpen(false)} className="p-2 bg-muted/10 rounded-full text-muted-foreground"><X className="h-6 w-6" /></button>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                            {[
                                { label: 'Сначала новые', value: 'newest' },
                                { label: 'Дешевле', value: 'cheapest' },
                                { label: 'Дороже', value: 'expensive' }
                            ].map((opt) => (
                                <button
                                    key={opt.value}
                                    onClick={() => {
                                        setSortBy(opt.value as SortOption);
                                        setIsSortModalOpen(false);
                                    }}
                                    className={cn(
                                        "flex items-center justify-between px-6 py-4 rounded-2xl border-2 transition-all font-bold text-left",
                                        sortBy === opt.value ? "bg-primary/5 border-primary text-primary" : "bg-muted/10 border-transparent hover:bg-muted/20"
                                    )}
                                >
                                    <span>{opt.label}</span>
                                    {sortBy === opt.value && <Check className="h-5 w-5" />}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Category Modal */}
            {isCategoryModalOpen && (
                <div className="fixed inset-0 z-[2000] flex items-end justify-center animate-in fade-in duration-200">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsCategoryModalOpen(false)} />
                    <div className="relative w-full max-w-lg bg-surface rounded-t-[2.5rem] p-6 shadow-2xl animate-in slide-in-from-bottom-full duration-300 max-h-[85vh] flex flex-col">
                        <div className="flex items-center justify-between mb-6 shrink-0">
                            <h2 className="text-xl font-black uppercase tracking-tight ml-2">Категория</h2>
                            <button onClick={() => setIsCategoryModalOpen(false)} className="p-2 bg-muted/10 rounded-full text-muted-foreground"><X className="h-6 w-6" /></button>
                        </div>
                        <div className="grid grid-cols-1 gap-2 overflow-y-auto pb-8 pr-2 custom-scrollbar">
                            <button
                                onClick={() => {
                                    setSelectedCategoryId('');
                                    setSelectedCategory('');
                                    setIsCategoryModalOpen(false);
                                    setSpecFilters({});
                                }}
                                className={cn(
                                    "flex items-center justify-between px-6 py-4 rounded-2xl border-2 transition-all font-bold text-left",
                                    !selectedCategoryId ? "bg-primary/5 border-primary text-primary" : "bg-muted/10 border-transparent hover:bg-muted/20"
                                )}
                            >
                                <span>Все категории</span>
                                {!selectedCategoryId && <Check className="h-5 w-5" />}
                            </button>
                            {categories.map((cat) => (
                                <button
                                    key={cat.id}
                                    onClick={() => {
                                        setSelectedCategoryId(cat.id);
                                        setSelectedCategory(cat.slug);
                                        setIsCategoryModalOpen(false);
                                        setSpecFilters({});
                                    }}
                                    className={cn(
                                        "flex items-center justify-between px-6 py-4 rounded-2xl border-2 transition-all font-bold text-left",
                                        selectedCategoryId === cat.id ? "bg-primary/5 border-primary text-primary" : "bg-muted/10 border-transparent hover:bg-muted/20"
                                    )}
                                >
                                    <span>{cat.name}</span>
                                    {selectedCategoryId === cat.id && <Check className="h-5 w-5" />}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Transmission Modal */}
            {isTransmissionModalOpen && (
                <div className="fixed inset-0 z-[2000] flex items-end justify-center animate-in fade-in duration-200">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsTransmissionModalOpen(false)} />
                    <div className="relative w-full max-w-lg bg-surface rounded-t-[2.5rem] p-6 shadow-2xl animate-in slide-in-from-bottom-full duration-300">
                        <div className="flex items-center justify-between mb-6 shrink-0">
                            <h2 className="text-xl font-black uppercase tracking-tight ml-2">КПП</h2>
                            <button onClick={() => setIsTransmissionModalOpen(false)} className="p-2 bg-muted/10 rounded-full text-muted-foreground"><X className="h-6 w-6" /></button>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                            {[
                                { label: 'Любая КПП', value: '' },
                                { label: 'Автомат', value: 'auto' },
                                { label: 'Механика', value: 'manual' }
                            ].map((opt) => (
                                <button
                                    key={opt.value}
                                    onClick={() => {
                                        setSpecFilters({ ...specFilters, transmission: opt.value });
                                        setIsTransmissionModalOpen(false);
                                    }}
                                    className={cn(
                                        "flex items-center justify-between px-6 py-4 rounded-2xl border-2 transition-all font-bold text-left",
                                        (specFilters.transmission || '') === opt.value ? "bg-primary/5 border-primary text-primary" : "bg-muted/10 border-transparent hover:bg-muted/20"
                                    )}
                                >
                                    <span>{opt.label}</span>
                                    {(specFilters.transmission || '') === opt.value && <Check className="h-5 w-5" />}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Rooms Modal */}
            {isRoomsModalOpen && (
                <div className="fixed inset-0 z-[2000] flex items-end justify-center animate-in fade-in duration-200">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsRoomsModalOpen(false)} />
                    <div className="relative w-full max-w-lg bg-surface rounded-t-[2.5rem] p-6 shadow-2xl animate-in slide-in-from-bottom-full duration-300">
                        <div className="flex items-center justify-between mb-6 shrink-0">
                            <h2 className="text-xl font-black uppercase tracking-tight ml-2">Кол-во комнат</h2>
                            <button onClick={() => setIsRoomsModalOpen(false)} className="p-2 bg-muted/10 rounded-full text-muted-foreground"><X className="h-6 w-6" /></button>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pb-4">
                            {[
                                { label: 'Все', value: '' },
                                { label: 'Студия', value: 'studio' },
                                { label: '1 комната', value: '1' },
                                { label: '2 комнаты', value: '2' },
                                { label: '3 комнаты', value: '3' },
                                { label: '4+ комнаты', value: '4+' }
                            ].map((opt) => (
                                <button
                                    key={opt.value}
                                    onClick={() => {
                                        setSpecFilters({ ...specFilters, rooms: opt.value });
                                        setIsRoomsModalOpen(false);
                                    }}
                                    className={cn(
                                        "flex items-center justify-between px-4 py-4 rounded-2xl border-2 transition-all font-bold text-left",
                                        (specFilters.rooms || '') === opt.value ? "bg-primary/5 border-primary text-primary" : "bg-muted/10 border-transparent hover:bg-muted/20"
                                    )}
                                >
                                    <span className="text-sm">{opt.label}</span>
                                    {(specFilters.rooms || '') === opt.value && <Check className="h-4 w-4" />}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Gender Modal */}
            {isGenderModalOpen && (
                <div className="fixed inset-0 z-[2000] flex items-end justify-center animate-in fade-in duration-200">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsGenderModalOpen(false)} />
                    <div className="relative w-full max-w-lg bg-surface rounded-t-[2.5rem] p-6 shadow-2xl animate-in slide-in-from-bottom-full duration-300">
                        <div className="flex items-center justify-between mb-6 shrink-0">
                            <h2 className="text-xl font-black uppercase tracking-tight ml-2">Пол</h2>
                            <button onClick={() => setIsGenderModalOpen(false)} className="p-2 bg-muted/10 rounded-full text-muted-foreground"><X className="h-6 w-6" /></button>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                            {[
                                { label: 'Любой', value: '' },
                                { label: 'Мужской', value: 'male' },
                                { label: 'Женский', value: 'female' },
                                { label: 'Унисекс', value: 'unisex' }
                            ].map((opt) => (
                                <button
                                    key={opt.value}
                                    onClick={() => {
                                        setSpecFilters({ ...specFilters, gender: opt.value });
                                        setIsGenderModalOpen(false);
                                    }}
                                    className={cn(
                                        "flex items-center justify-between px-6 py-4 rounded-2xl border-2 transition-all font-bold text-left",
                                        (specFilters.gender || '') === opt.value ? "bg-primary/5 border-primary text-primary" : "bg-muted/10 border-transparent hover:bg-muted/20"
                                    )}
                                >
                                    <span>{opt.label}</span>
                                    {(specFilters.gender || '') === opt.value && <Check className="h-5 w-5" />}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
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
                    <button
                        onClick={() => setIsSortModalOpen(true)}
                        className="h-11 px-4 rounded-2xl bg-surface border border-border flex items-center gap-2 text-sm font-black hover:border-primary transition-all active:scale-95"
                    >
                        <span>{sortBy === 'newest' ? 'Сначала новые' : sortBy === 'cheapest' ? 'Дешевле' : 'Дороже'}</span>
                        <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                    </button>

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
                        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6">
                            {ads.map((ad) => (
                                <Link
                                    key={ad.id}
                                    href={`/ad?id=${ad.id}`}
                                    className="group relative flex flex-col h-full bg-card rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all border border-border/40 active:scale-[0.98] duration-200"
                                >
                                    <div className="aspect-[4/3] relative overflow-hidden bg-muted">
                                        <img
                                            src={getOptimizedImageUrl(ad.images?.[0] || '', { width: 400, quality: 75 })}
                                            alt={ad.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            loading="lazy"
                                        />
                                        <div className="absolute top-2 left-2 bg-black/50 backdrop-blur-md text-[9px] text-white font-black px-2 py-0.5 rounded-md uppercase tracking-wider">
                                            {ad.category?.name}
                                        </div>
                                    </div>

                                    <div className="p-3 flex flex-col flex-1 gap-1">
                                        <div className="text-lg font-black tracking-tight text-foreground leading-none">
                                            {ad.price ? `${ad.price.toLocaleString()} ₽` : 'Договорная'}
                                        </div>

                                        <h3 className="text-sm font-medium leading-snug line-clamp-2 text-foreground/90 min-h-[2.5em]">
                                            {ad.title}
                                        </h3>

                                        <div className="mt-auto pt-2 flex items-center gap-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wide opacity-70">
                                            <MapPin className="h-3 w-3 shrink-0" />
                                            <span className="truncate">{ad.city}</span>
                                            <span className="mx-1">•</span>
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

                            {/* Category Filter */}
                            <div>
                                <label className="block text-xs font-black uppercase text-muted-foreground mb-4 tracking-widest">Категория</label>
                                <button
                                    onClick={() => setIsCategoryModalOpen(true)}
                                    className="w-full h-14 px-5 rounded-2xl bg-surface border border-border font-bold text-sm flex items-center justify-between hover:border-primary transition-all text-left"
                                >
                                    <span>{categories.find(c => c.id === selectedCategoryId)?.name || "Все категории"}</span>
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                </button>
                            </div>

                            {/* Dynamic Specs based on Category Slug */}
                            {selectedCategory === 'transport' && (
                                <div className="space-y-4 pt-2">
                                    <label className="block text-[10px] font-black uppercase text-primary tracking-widest">Параметры авто</label>
                                    <div className="space-y-3">
                                        <input
                                            type="text"
                                            placeholder="Марка (напр: BMW)"
                                            value={specFilters.brand || ''}
                                            onChange={(e) => setSpecFilters({ ...specFilters, brand: e.target.value })}
                                            className="w-full h-11 px-4 rounded-xl bg-surface border border-border outline-none focus:border-primary font-bold text-xs"
                                        />
                                        <button
                                            onClick={() => setIsTransmissionModalOpen(true)}
                                            className="w-full h-11 px-4 rounded-xl bg-surface border border-border font-bold text-xs flex items-center justify-between hover:border-primary transition-all text-left"
                                        >
                                            <span>
                                                {specFilters.transmission === 'auto' ? 'Автомат' :
                                                    specFilters.transmission === 'manual' ? 'Механика' : 'Любая КПП'}
                                            </span>
                                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {selectedCategory === 'real-estate' && (
                                <div className="space-y-4 pt-2">
                                    <label className="block text-[10px] font-black uppercase text-primary tracking-widest">Параметры недвижимости</label>
                                    <div className="space-y-3">
                                        <button
                                            onClick={() => setIsRoomsModalOpen(true)}
                                            className="w-full h-11 px-4 rounded-xl bg-surface border border-border font-bold text-xs flex items-center justify-between hover:border-primary transition-all text-left"
                                        >
                                            <span>
                                                {specFilters.rooms ? `${specFilters.rooms} ${specFilters.rooms === 'studio' ? '' : 'комн.'}` : 'Кол-во комнат'}
                                                {specFilters.rooms === 'studio' && 'Студия'}
                                            </span>
                                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {selectedCategory === 'electronics' && (
                                <div className="space-y-4 pt-2">
                                    <label className="block text-[10px] font-black uppercase text-primary tracking-widest">Параметры техники</label>
                                    <input
                                        type="text"
                                        placeholder="Бренд (Apple, Samsung...)"
                                        value={specFilters.brand || ''}
                                        onChange={(e) => setSpecFilters({ ...specFilters, brand: e.target.value })}
                                        className="w-full h-11 px-4 rounded-xl bg-surface border border-border outline-none focus:border-primary font-bold text-xs"
                                    />
                                </div>
                            )}

                            {selectedCategory === 'clothing' && (
                                <div className="space-y-4 pt-2">
                                    <label className="block text-[10px] font-black uppercase text-primary tracking-widest">Параметры одежды</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <input
                                            type="text"
                                            placeholder="Размер"
                                            value={specFilters.size || ''}
                                            onChange={(e) => setSpecFilters({ ...specFilters, size: e.target.value })}
                                            className="h-11 px-4 rounded-xl bg-surface border border-border outline-none focus:border-primary font-bold text-xs"
                                        />
                                        <button
                                            onClick={() => setIsGenderModalOpen(true)}
                                            className="w-full h-11 px-4 rounded-xl bg-surface border border-border font-bold text-xs flex items-center justify-between hover:border-primary transition-all text-left"
                                        >
                                            <span>
                                                {specFilters.gender === 'male' ? 'М' :
                                                    specFilters.gender === 'female' ? 'Ж' :
                                                        specFilters.gender === 'unisex' ? 'Унисекс' : 'Пол'}
                                            </span>
                                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                        </button>
                                    </div>
                                </div>
                            )}

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
