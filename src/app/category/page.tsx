'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import { Home, Car, Smartphone, Shirt, Gamepad, Armchair, ChevronRight, CheckCircle, Info, Filter, X, Search, Plus, Heart, Briefcase, Wrench, Settings, Baby, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

const CATEGORIES = [
    { name: 'Транспорт', slug: 'transport', image: '/categories/transport.jpg' },
    { name: 'Недвижимость', slug: 'real-estate', image: '/categories/real-estate.jpg' },
    { name: 'Работа', slug: 'jobs', image: '/categories/jobs.jpg' },
    { name: 'Услуги', slug: 'services', image: '/categories/services.jpg' },
    { name: 'Электроника', slug: 'electronics', image: '/categories/electronics.jpg' },
    { name: 'Дом и дача', slug: 'home', image: '/categories/home.jpg' },
    { name: 'Личные вещи', slug: 'clothing', image: '/categories/clothing.jpg' },
    { name: 'Запчасти', slug: 'parts', image: '/categories/parts.jpg' },
    { name: 'Хобби и отдых', slug: 'hobby', image: '/categories/hobby.jpg' },
    { name: 'Животные', slug: 'pets', image: '/categories/pets.jpg' },
    { name: 'Красота', slug: 'beauty', image: '/categories/beauty.jpg' },
    { name: 'Детские товары', slug: 'kids', image: '/categories/kids.jpg' },
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
        try {
            const { data: catData } = await supabase.from('categories').select('id').eq('slug', slug).single();

            if (catData) {
                let query = supabase
                    .from('ads')
                    .select('*, profiles!user_id(full_name, avatar_url, is_verified)')
                    .eq('category_id', catData.id)
                    .eq('status', 'active');

                if (priceFrom) query = query.gte('price', parseFloat(priceFrom));
                if (priceTo) query = query.lte('price', parseFloat(priceTo));
                if (selectedCity) query = query.eq('city', selectedCity);

                const { data, error } = await query.order('created_at', { ascending: false });
                if (error) throw error;

                let filteredData = data || [];

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
        } catch (err) {
            console.error('Fetch ads error:', err);
        } finally {
            setLoading(false);
        }
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
            <div className="flex flex-col md:flex-row items-end justify-between mb-8 gap-4">
                <div className="flex items-center gap-6">
                    <div className="relative w-20 h-20 rounded-[2rem] overflow-hidden shadow-xl border-2 border-primary/20 shrink-0">
                        <img
                            src={category.image}
                            alt={category.name}
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black tracking-tight">{category.name}</h1>
                        <p className="text-muted text-[11px] font-black uppercase tracking-[0.2em] mt-1">{ads.length} объявлений</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowMobileFilters(true)}
                    className="md:hidden w-full p-4 bg-surface border border-border rounded-2xl flex items-center justify-center gap-2 font-black"
                >
                    <Filter className="h-5 w-5" /> Фильтры
                </button>
            </div>

            <div className="flex flex-col md:flex-row gap-8">
                {/* Sidebar Filters - Desktop */}
                <aside className="hidden md:block w-72 shrink-0 space-y-6">
                    <div className="bg-surface p-6 rounded-3xl border border-border h-fit">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-black text-lg">Фильтры</h3>
                            {(priceFrom || priceTo || selectedCity || Object.keys(specFilters).length > 0) && (
                                <button onClick={resetFilters} className="text-xs font-bold text-primary hover:underline">Сбросить</button>
                            )}
                        </div>

                        {/* Price Filter */}
                        <div className="mb-8">
                            <label className="block text-[11px] font-black uppercase text-muted mb-3 tracking-widest">Цена, ₽</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    placeholder="От"
                                    value={priceFrom}
                                    onChange={(e) => setPriceFrom(e.target.value)}
                                    className="w-full p-3 text-sm rounded-xl bg-background border border-border outline-none focus:border-primary transition-colors"
                                />
                                <div className="w-4 h-0.5 bg-border"></div>
                                <input
                                    type="number"
                                    placeholder="До"
                                    value={priceTo}
                                    onChange={(e) => setPriceTo(e.target.value)}
                                    className="w-full p-3 text-sm rounded-xl bg-background border border-border outline-none focus:border-primary transition-colors"
                                />
                            </div>
                        </div>

                        {/* City Filter */}
                        <div className="mb-8">
                            <label className="block text-[11px] font-black uppercase text-muted mb-3 tracking-widest">Город</label>
                            <select
                                value={selectedCity}
                                onChange={(e) => setSelectedCity(e.target.value)}
                                className="w-full p-3 text-sm rounded-xl bg-background border border-border outline-none focus:border-primary appearance-none cursor-pointer"
                            >
                                <option value="">Любой</option>
                                {cities.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                            </select>
                        </div>

                        {/* Dynamic Specs Filters */}
                        {(slug === 'transport' || slug === 'electronics' || slug === 'real-estate') && (
                            <div className="space-y-6 pt-6 border-t border-border">
                                {slug === 'transport' && (
                                    <div>
                                        <label className="block text-[11px] font-black uppercase text-muted mb-2 tracking-widest">КПП</label>
                                        <div className="grid grid-cols-1 gap-2">
                                            {['auto', 'manual'].map(t => (
                                                <button
                                                    key={t}
                                                    onClick={() => setSpecFilters({ ...specFilters, transmission: specFilters.transmission === t ? '' : t })}
                                                    className={cn(
                                                        "text-left p-3 rounded-xl text-sm font-bold border transition-all",
                                                        specFilters.transmission === t ? "bg-primary text-white border-primary" : "bg-background border-border hover:border-primary/50"
                                                    )}
                                                >
                                                    {t === 'auto' ? 'Автомат' : 'Механика'}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {slug === 'real-estate' && (
                                    <div>
                                        <label className="block text-[11px] font-black uppercase text-muted mb-2 tracking-widest">Комнаты</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {['studio', '1', '2', '3'].map(r => (
                                                <button
                                                    key={r}
                                                    onClick={() => setSpecFilters({ ...specFilters, rooms: specFilters.rooms === r ? '' : r })}
                                                    className={cn(
                                                        "p-2 rounded-xl text-sm font-bold border transition-all",
                                                        specFilters.rooms === r ? "bg-primary text-white border-primary" : "bg-background border-border hover:border-primary/50"
                                                    )}
                                                >
                                                    {r === 'studio' ? 'Студия' : r}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </aside>

                {/* Ads Grid */}
                <div className="flex-1">
                    {loading ? (
                        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-pulse">
                            {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="aspect-[3/4] bg-muted rounded-2xl" />)}
                        </div>
                    ) : ads.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                            {ads.map((ad) => (
                                <Link
                                    key={ad.id}
                                    href={`/ad?id=${ad.id}`}
                                    className="group relative flex flex-col h-full bg-white rounded-2xl overflow-hidden hover:shadow-xl transition-all border border-transparent hover:border-border"
                                >
                                    <div className="aspect-[4/3] relative overflow-hidden bg-muted">
                                        {ad.images?.[0] ? (
                                            <img
                                                src={ad.images[0]}
                                                alt={ad.title}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-muted italic text-[10px]">Нет фото</div>
                                        )}
                                        <button className="absolute top-2 right-2 p-1.5 bg-white/80 backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white text-muted hover:text-red-500">
                                            <Heart className="h-4 w-4" />
                                        </button>
                                    </div>
                                    <div className="p-3 flex flex-col flex-1">
                                        <h3 className="text-xs font-medium line-clamp-2 mb-1 group-hover:text-primary transition-colors h-8">
                                            {ad.title}
                                        </h3>
                                        <div className="text-base font-black text-foreground mb-2">
                                            {ad.price ? `${ad.price.toLocaleString()} ₽` : 'Договорная'}
                                        </div>
                                        <div className="mt-auto space-y-1">
                                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-tight font-bold">
                                                <span>{ad.city}</span>
                                                {ad.profiles?.is_verified && <CheckCircle className="h-2.5 w-2.5 text-blue-500 fill-current" />}
                                            </div>
                                            <div className="text-[10px] text-muted-foreground font-medium">
                                                {new Date(ad.created_at).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="py-24 text-center bg-surface rounded-[3rem] border border-dashed border-border flex flex-col items-center">
                            <Search className="h-12 w-12 text-muted mb-4 opacity-20" />
                            <h3 className="text-xl font-black">Ничего не нашли</h3>
                            <p className="text-muted mt-2 max-w-xs mx-auto">Попробуйте изменить параметры фильтрации или выберите другую категорию</p>
                            <button onClick={resetFilters} className="mt-6 text-primary font-black hover:underline cursor-pointer">Сбросить всё</button>
                        </div>
                    )}
                </div>
            </div>

            {/* Mobile Filters Drawer */}
            {showMobileFilters && (
                <div className="fixed inset-0 z-50 md:hidden bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="absolute inset-x-0 bottom-0 bg-background rounded-t-[3rem] max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-500 shadow-2xl">
                        <div className="p-6 sticky top-0 bg-background border-b border-border flex items-center justify-between z-10">
                            <h3 className="text-xl font-black">Фильтры</h3>
                            <button onClick={() => setShowMobileFilters(false)} className="p-2 bg-surface rounded-full"><X className="h-6 w-6" /></button>
                        </div>
                        <div className="p-8 space-y-8">
                            <div>
                                <label className="block text-xs font-black uppercase text-muted mb-4 tracking-widest">Цена, ₽</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <input type="number" placeholder="От" value={priceFrom} onChange={(e) => setPriceFrom(e.target.value)} className="w-full p-4 rounded-2xl bg-surface border border-border outline-none" />
                                    <input type="number" placeholder="До" value={priceTo} onChange={(e) => setPriceTo(e.target.value)} className="w-full p-4 rounded-2xl bg-surface border border-border outline-none" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-black uppercase text-muted mb-4 tracking-widest">Город</label>
                                <select value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)} className="w-full p-4 rounded-2xl bg-surface border border-border outline-none appearance-none">
                                    <option value="">Любой город</option>
                                    {cities.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                                </select>
                            </div>
                            <button onClick={() => setShowMobileFilters(false)} className="w-full py-5 bg-primary text-white font-black rounded-2xl shadow-xl">Показать результаты</button>
                            <button onClick={() => { resetFilters(); setShowMobileFilters(false); }} className="w-full py-4 text-muted font-bold">Сбросить всё</button>
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
