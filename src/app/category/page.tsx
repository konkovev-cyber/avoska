'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import { Home, Car, Smartphone, Shirt, Gamepad, Armchair, ChevronRight, CheckCircle, Info, Filter, X, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

const CATEGORIES = [
    { name: 'Недвижимость', slug: 'real-estate', icon: Home, color: 'bg-blue-500' },
    { name: 'Транспорт', slug: 'transport', icon: Car, color: 'bg-green-500' },
    { name: 'Электроника', slug: 'electronics', icon: Smartphone, color: 'bg-purple-500' },
    { name: 'Одежда', slug: 'clothing', icon: Shirt, color: 'bg-orange-500' },
    { name: 'Хобби', slug: 'hobby', icon: Gamepad, color: 'bg-red-500' },
    { name: 'Для дома', slug: 'home', icon: Armchair, color: 'bg-teal-500' },
];

function CategoryContent() {
    const searchParams = useSearchParams();
    const slug = searchParams.get('slug');
    const [ads, setAds] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [cities, setCities] = useState<any[]>([]);

    // Filters state
    const [priceFrom, setPriceFrom] = useState('');
    const [priceTo, setPriceTo] = useState('');
    const [selectedCity, setSelectedCity] = useState('');
    const [specFilters, setSpecFilters] = useState<Record<string, string>>({});
    const [showMobileFilters, setShowMobileFilters] = useState(false);

    const category = CATEGORIES.find(c => c.slug === slug);

    useEffect(() => {
        fetchCities();
    }, []);

    useEffect(() => {
        if (slug) fetchAds();
        else setLoading(false);
    }, [slug, priceFrom, priceTo, selectedCity, specFilters]);

    const fetchCities = async () => {
        const { data } = await supabase.from('cities').select('name').order('is_default', { ascending: false });
        if (data) setCities(data);
    };

    const fetchAds = async () => {
        setLoading(true);
        const { data: catData } = await supabase.from('categories').select('id').eq('slug', slug).single();

        if (catData) {
            let query = supabase
                .from('ads')
                .select('*, profiles(full_name, is_verified)')
                .eq('category_id', catData.id)
                .eq('status', 'active');

            if (priceFrom) query = query.gte('price', parseFloat(priceFrom));
            if (priceTo) query = query.lte('price', parseFloat(priceTo));
            if (selectedCity) query = query.eq('city', selectedCity);

            // JSONB Filtering (Best effort with JS client)
            // For complex JSONB filters, we might need a stored procedure or just filter in memory if the dataset is small.
            // But let's try the contains operator for exact matches if possible.
            // query = query.contains('specifications', specFilters); 
            // Note: contains expects a partial object.

            const { data, error } = await query.order('created_at', { ascending: false });

            let filteredData = data || [];

            // Manual specification filtering for multiple keys
            if (Object.keys(specFilters).length > 0) {
                filteredData = filteredData.filter(ad => {
                    return Object.entries(specFilters).every(([key, value]) => {
                        if (!value) return true;
                        return ad.specifications?.[key] === value;
                    });
                });
            }

            setAds(filteredData);
        }
        setLoading(false);
    };

    const resetFilters = () => {
        setPriceFrom('');
        setPriceTo('');
        setSelectedCity('');
        setSpecFilters({});
    };

    if (!category) return <div className="p-20 text-center">Категория не найдена</div>;

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 md:w-16 md:h-16 ${category.color} rounded-2xl flex items-center justify-center text-white shadow-lg`}>
                        <category.icon className="h-6 w-6 md:h-8 md:w-8" />
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black">{category.name}</h1>
                        <p className="text-muted text-sm">{ads.length} объявлений</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowMobileFilters(true)}
                    className="md:hidden p-3 bg-surface border border-border rounded-xl flex items-center gap-2 font-bold"
                >
                    <Filter className="h-5 w-5" /> Фильтры
                </button>
            </div>

            <div className="flex flex-col md:flex-row gap-8">
                {/* Sidebar Filters - Desktop */}
                <aside className="hidden md:block w-64 shrink-0 space-y-8 h-fit sticky top-24">
                    <div className="bg-surface p-6 rounded-3xl border border-border shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-black flex items-center gap-2"><Filter className="h-4 w-4 text-primary" /> Фильтры</h3>
                            {(priceFrom || priceTo || selectedCity || Object.keys(specFilters).length > 0) && (
                                <button onClick={resetFilters} className="text-xs font-bold text-primary hover:underline">Сбросить</button>
                            )}
                        </div>

                        {/* Price Filter */}
                        <div className="mb-6">
                            <label className="block text-xs font-black uppercase text-muted mb-3 tracking-widest">Цена (₽)</label>
                            <div className="grid grid-cols-2 gap-2">
                                <input
                                    type="number"
                                    placeholder="От"
                                    value={priceFrom}
                                    onChange={(e) => setPriceFrom(e.target.value)}
                                    className="w-full p-2 text-sm rounded-lg bg-background border border-border outline-none focus:ring-1 focus:ring-primary"
                                />
                                <input
                                    type="number"
                                    placeholder="До"
                                    value={priceTo}
                                    onChange={(e) => setPriceTo(e.target.value)}
                                    className="w-full p-2 text-sm rounded-lg bg-background border border-border outline-none focus:ring-1 focus:ring-primary"
                                />
                            </div>
                        </div>

                        {/* City Filter */}
                        <div className="mb-6">
                            <label className="block text-xs font-black uppercase text-muted mb-3 tracking-widest">Город</label>
                            <select
                                value={selectedCity}
                                onChange={(e) => setSelectedCity(e.target.value)}
                                className="w-full p-2 text-sm rounded-lg bg-background border border-border outline-none focus:ring-1 focus:ring-primary"
                            >
                                <option value="">Любой</option>
                                {cities.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                            </select>
                        </div>

                        {/* Dynamic Specs Filters */}
                        {slug === 'transport' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-black uppercase text-muted mb-2 tracking-widest">КПП</label>
                                    <select
                                        value={specFilters.transmission || ''}
                                        onChange={(e) => setSpecFilters({ ...specFilters, transmission: e.target.value })}
                                        className="w-full p-2 text-sm rounded-lg bg-background border border-border outline-none"
                                    >
                                        <option value="">Любая</option>
                                        <option value="auto">Автомат</option>
                                        <option value="manual">Механика</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        {slug === 'real-estate' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-black uppercase text-muted mb-2 tracking-widest">Комнаты</label>
                                    <select
                                        value={specFilters.rooms || ''}
                                        onChange={(e) => setSpecFilters({ ...specFilters, rooms: e.target.value })}
                                        className="w-full p-2 text-sm rounded-lg bg-background border border-border outline-none"
                                    >
                                        <option value="">Любое</option>
                                        <option value="studio">Студия</option>
                                        <option value="1">1 комната</option>
                                        <option value="2">2 комнаты</option>
                                        <option value="3">3 комнаты</option>
                                        <option value="4+">4+</option>
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>
                </aside>

                {/* Ads Grid */}
                <div className="flex-1">
                    {loading ? (
                        <div className="text-center p-20 flex flex-col items-center gap-4">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                            <span className="text-muted font-bold">Ищем объявления...</span>
                        </div>
                    ) : ads.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {ads.map((ad) => (
                                <Link
                                    key={ad.id}
                                    href={`/ad?id=${ad.id}`}
                                    className="bg-surface rounded-3xl border border-border overflow-hidden hover:shadow-xl transition-all flex flex-col h-full group"
                                >
                                    <div className="aspect-square bg-muted relative overflow-hidden">
                                        {ad.images?.[0] ? (
                                            <img
                                                src={ad.images[0]}
                                                alt={ad.title}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-muted italic flex-col gap-2">
                                                <Info className="h-8 w-8 opacity-20" />
                                                <span>Нет фото</span>
                                            </div>
                                        )}
                                        {ad.delivery_possible && (
                                            <div className="absolute top-3 left-3 bg-primary text-white text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-wider shadow-md">
                                                Доставка
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-5 flex flex-col flex-1">
                                        <span className="text-xl font-black text-foreground mb-1">
                                            {ad.price ? `${ad.price.toLocaleString()} ₽` : 'Цена договорная'}
                                        </span>
                                        <h3 className="line-clamp-2 text-sm font-bold mb-4 group-hover:text-primary transition-colors flex-1">
                                            {ad.title}
                                        </h3>
                                        <div className="flex items-center justify-between mt-auto">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[11px] font-bold text-muted uppercase tracking-tighter">{ad.city}</span>
                                                {ad.profiles?.is_verified && <CheckCircle className="h-3 w-3 text-blue-500 fill-current" />}
                                            </div>
                                            <span className="text-[10px] text-muted">{new Date(ad.created_at).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="p-20 text-center text-muted border border-dashed border-border rounded-3xl bg-surface/50">
                            <Search className="h-10 w-10 mx-auto mb-4 opacity-20" />
                            <h3 className="text-lg font-bold">Ничего не найдено</h3>
                            <p>Попробуйте сбросить фильтры или изменить параметры поиска</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Mobile Filters Drawer Overlay */}
            {showMobileFilters && (
                <div className="fixed inset-0 z-50 md:hidden bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="absolute right-0 top-0 bottom-0 w-80 bg-background shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
                        <div className="p-6 border-b border-border flex items-center justify-between">
                            <h3 className="text-xl font-black">Фильтры</h3>
                            <button onClick={() => setShowMobileFilters(false)} className="p-2 rounded-full hover:bg-muted"><X className="h-6 w-6" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-8">
                            {/* Price */}
                            <div>
                                <label className="block text-xs font-black uppercase text-muted mb-3 tracking-widest">Цена (₽)</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <input type="number" placeholder="От" value={priceFrom} onChange={(e) => setPriceFrom(e.target.value)} className="w-full p-3 rounded-xl bg-surface border border-border" />
                                    <input type="number" placeholder="До" value={priceTo} onChange={(e) => setPriceTo(e.target.value)} className="w-full p-3 rounded-xl bg-surface border border-border" />
                                </div>
                            </div>

                            {/* City */}
                            <div>
                                <label className="block text-xs font-black uppercase text-muted mb-3 tracking-widest">Город</label>
                                <select value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)} className="w-full p-3 rounded-xl bg-surface border border-border outline-none">
                                    <option value="">Любой</option>
                                    {cities.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                                </select>
                            </div>

                            {/* Dynamic Filters placeholder */}
                            {slug === 'transport' && (
                                <div>
                                    <label className="block text-xs font-black uppercase text-muted mb-3 tracking-widest">КПП</label>
                                    <select
                                        value={specFilters.transmission || ''}
                                        onChange={(e) => setSpecFilters({ ...specFilters, transmission: e.target.value })}
                                        className="w-full p-3 rounded-xl bg-surface border border-border outline-none"
                                    >
                                        <option value="">Любая</option>
                                        <option value="auto">Автомат</option>
                                        <option value="manual">Механика</option>
                                    </select>
                                </div>
                            )}
                        </div>
                        <div className="p-6 border-t border-border grid grid-cols-2 gap-3">
                            <button onClick={resetFilters} className="py-3 font-bold text-muted hover:text-foreground">Сбросить</button>
                            <button onClick={() => setShowMobileFilters(false)} className="py-3 bg-primary text-white font-black rounded-xl">Показать</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function CategoryPage() {
    return (
        <Suspense fallback={<div className="p-20 text-center">Загрузка...</div>}>
            <CategoryContent />
        </Suspense>
    );
}
