'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import { getStoredCity } from '@/lib/geo';
import { getOptimizedImageUrl } from '@/lib/image-utils';
import { Home, Car, Smartphone, Shirt, Gamepad, Armchair, ChevronRight, ChevronLeft, CheckCircle, Info, Filter, X, Search, Plus, Heart, Briefcase, Wrench, Settings, Baby, Sparkles, MapPin, Check, ChevronDown } from 'lucide-react';
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

    // Custom selection states
    const [isCityModalOpen, setIsCityModalOpen] = useState(false);
    const [showMobileFilters, setShowMobileFilters] = useState(false);

    const category = CATEGORIES.find(c => c.slug === slug);

    useEffect(() => {
        fetchCities();
        const stored = getStoredCity();
        if (stored && stored !== 'Все города') {
            setSelectedCity(stored);
        }
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

                // Fallback: If no ads in selected city, fetch all ads for this category
                if (filteredData.length === 0 && selectedCity && selectedCity !== 'Все города') {
                    console.log('No ads in selected city, falling back to all cities');
                    const { data: allCityData, error: allCityError } = await supabase
                        .from('ads')
                        .select('*, profiles!user_id(full_name, avatar_url, is_verified)')
                        .eq('category_id', catData.id)
                        .eq('status', 'active')
                        .order('created_at', { ascending: false });

                    if (!allCityError && allCityData && allCityData.length > 0) {
                        filteredData = allCityData;
                        // Optional: Notify user that we switched to all cities
                        // But for now, let's just show them the ads. 
                        // Maybe we should update selectedCity to empty string so the UI reflects it?
                        // setSelectedCity(''); // This might cause a re-render loop if not careful.
                    }
                }

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
        fetchAds(); // Re-fetch immediately
    };

    if (!category) return <div className="p-20 text-center">Категория не найдена</div>;

    return (
        <div className="container mx-auto px-2 md:px-4 py-6 max-w-[1200px]">
            <Link href="/categories" className="inline-flex items-center gap-2 text-primary font-black mb-6 hover:translate-x-[-4px] transition-transform text-xs uppercase tracking-widest">
                <ChevronLeft className="h-4 w-4" /> Ко всем категориям
            </Link>
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
                        <h1 className="text-2xl md:text-4xl font-black tracking-tight">{category.name}</h1>
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
                                    min="0"
                                    placeholder="От"
                                    value={priceFrom}
                                    onChange={(e) => setPriceFrom(e.target.value.replace(/^-/, ''))}
                                    className="w-full p-3 text-sm rounded-xl bg-background border border-border outline-none focus:border-primary transition-colors"
                                />
                                <div className="w-4 h-0.5 bg-border"></div>
                                <input
                                    type="number"
                                    min="0"
                                    placeholder="До"
                                    value={priceTo}
                                    onChange={(e) => setPriceTo(e.target.value.replace(/^-/, ''))}
                                    className="w-full p-3 text-sm rounded-xl bg-background border border-border outline-none focus:border-primary transition-colors"
                                />
                            </div>
                        </div>

                        {/* City Filter - Compact Dropdown */}
                        <div className="mb-8 relative">
                            <label className="block text-[11px] font-black uppercase text-muted mb-3 tracking-widest">Город</label>
                            <button
                                onClick={() => setIsCityModalOpen(!isCityModalOpen)}
                                className="w-full h-11 px-4 rounded-xl bg-background border border-border font-bold text-sm flex items-center justify-between hover:border-primary transition-all text-left"
                            >
                                <span className="truncate">{selectedCity || "Любой"}</span>
                                <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", isCityModalOpen && "rotate-180")} />
                            </button>
                            
                            {isCityModalOpen && (
                                <div className="absolute top-full left-0 mt-2 w-full bg-surface border border-border rounded-xl shadow-2xl overflow-hidden z-50 max-h-48 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
                                    <button
                                        onClick={() => {
                                            setSelectedCity('');
                                            setIsCityModalOpen(false);
                                        }}
                                        className={cn(
                                            "w-full text-left px-4 py-2.5 text-sm font-bold transition-all border-b border-border/50",
                                            !selectedCity ? "bg-primary text-white" : "hover:bg-muted"
                                        )}
                                    >
                                        Любой город
                                    </button>
                                    {cities.map((c) => (
                                        <button
                                            key={c.name}
                                            onClick={() => {
                                                setSelectedCity(c.name);
                                                setIsCityModalOpen(false);
                                            }}
                                            className={cn(
                                                "w-full text-left px-4 py-2.5 text-sm font-bold transition-all hover:bg-muted",
                                                selectedCity === c.name ? "bg-primary text-white" : ""
                                            )}
                                        >
                                            {c.name}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Dynamic Specs Filters by Category */}
                        <div className="space-y-6 pt-6 border-t border-border">
                            
                            {/* Transport Filters */}
                            {slug === 'transport' && (
                                <>
                                    <div>
                                        <label className="block text-[11px] font-black uppercase text-muted mb-2 tracking-widest">КПП</label>
                                        <div className="grid grid-cols-2 gap-2">
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
                                    <div>
                                        <label className="block text-[11px] font-black uppercase text-muted mb-2 tracking-widest">Состояние</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {['new', 'used'].map(c => (
                                                <button
                                                    key={c}
                                                    onClick={() => setSpecFilters({ ...specFilters, condition: specFilters.condition === c ? '' : c })}
                                                    className={cn(
                                                        "text-left p-3 rounded-xl text-sm font-bold border transition-all",
                                                        specFilters.condition === c ? "bg-primary text-white border-primary" : "bg-background border-border hover:border-primary/50"
                                                    )}
                                                >
                                                    {c === 'new' ? 'Новое' : 'Б/У'}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Real Estate Filters */}
                            {slug === 'real-estate' && (
                                <>
                                    <div>
                                        <label className="block text-[11px] font-black uppercase text-muted mb-2 tracking-widest">Тип объекта</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {[
                                                { value: 'apartment', label: 'Квартира' },
                                                { value: 'house', label: 'Дом' },
                                                { value: 'plot', label: 'Участок' },
                                                { value: 'commercial', label: 'Коммерция' }
                                            ].map(t => (
                                                <button
                                                    key={t.value}
                                                    onClick={() => setSpecFilters({ ...specFilters, type: specFilters.type === t.value ? '' : t.value })}
                                                    className={cn(
                                                        "text-left p-3 rounded-xl text-sm font-bold border transition-all",
                                                        specFilters.type === t.value ? "bg-primary text-white border-primary" : "bg-background border-border hover:border-primary/50"
                                                    )}
                                                >
                                                    {t.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-black uppercase text-muted mb-2 tracking-widest">Комнаты</label>
                                        <div className="grid grid-cols-4 gap-2">
                                            {['studio', '1', '2', '3', '4+'].map(r => (
                                                <button
                                                    key={r}
                                                    onClick={() => setSpecFilters({ ...specFilters, rooms: specFilters.rooms === r ? '' : r })}
                                                    className={cn(
                                                        "p-2 rounded-xl text-sm font-bold border transition-all",
                                                        specFilters.rooms === r ? "bg-primary text-white border-primary" : "bg-background border-border hover:border-primary/50"
                                                    )}
                                                >
                                                    {r}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Rent Apartments Filters */}
                            {slug === 'rent-apartments' && (
                                <>
                                    <div>
                                        <label className="block text-[11px] font-black uppercase text-muted mb-2 tracking-widest">Тип жилья</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {[
                                                { value: 'apartment', label: 'Квартира' },
                                                { value: 'room', label: 'Комната' },
                                                { value: 'house', label: 'Дом' }
                                            ].map(t => (
                                                <button
                                                    key={t.value}
                                                    onClick={() => setSpecFilters({ ...specFilters, type: specFilters.type === t.value ? '' : t.value })}
                                                    className={cn(
                                                        "text-left p-3 rounded-xl text-sm font-bold border transition-all",
                                                        specFilters.type === t.value ? "bg-primary text-white border-primary" : "bg-background border-border hover:border-primary/50"
                                                    )}
                                                >
                                                    {t.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-black uppercase text-muted mb-2 tracking-widest">Комнаты</label>
                                        <div className="grid grid-cols-4 gap-2">
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
                                </>
                            )}

                            {/* Rent Commercial Filters */}
                            {slug === 'rent-commercial' && (
                                <div>
                                    <label className="block text-[11px] font-black uppercase text-muted mb-2 tracking-widest">Тип</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {[
                                            { value: 'office', label: 'Офис' },
                                            { value: 'retail', label: 'Магазин' },
                                            { value: 'warehouse', label: 'Склад' },
                                            { value: 'other', label: 'Другое' }
                                        ].map(t => (
                                            <button
                                                key={t.value}
                                                onClick={() => setSpecFilters({ ...specFilters, type: specFilters.type === t.value ? '' : t.value })}
                                                className={cn(
                                                    "text-left p-3 rounded-xl text-sm font-bold border transition-all",
                                                    specFilters.type === t.value ? "bg-primary text-white border-primary" : "bg-background border-border hover:border-primary/50"
                                                )}
                                            >
                                                {t.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Electronics Filters */}
                            {slug === 'electronics' && (
                                <div>
                                    <label className="block text-[11px] font-black uppercase text-muted mb-2 tracking-widest">Состояние</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {['new', 'used'].map(c => (
                                            <button
                                                key={c}
                                                onClick={() => setSpecFilters({ ...specFilters, condition: specFilters.condition === c ? '' : c })}
                                                className={cn(
                                                    "text-left p-3 rounded-xl text-sm font-bold border transition-all",
                                                    specFilters.condition === c ? "bg-primary text-white border-primary" : "bg-background border-border hover:border-primary/50"
                                                )}
                                            >
                                                {c === 'new' ? 'Новое' : 'Б/У'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Jobs Filters */}
                            {slug === 'jobs' && (
                                <>
                                    <div>
                                        <label className="block text-[11px] font-black uppercase text-muted mb-2 tracking-widest">Занятость</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {[
                                                { value: 'full', label: 'Полная' },
                                                { value: 'part', label: 'Частичная' },
                                                { value: 'remote', label: 'Удалённо' },
                                                { value: 'project', label: 'Проект' }
                                            ].map(t => (
                                                <button
                                                    key={t.value}
                                                    onClick={() => setSpecFilters({ ...specFilters, employment: specFilters.employment === t.value ? '' : t.value })}
                                                    className={cn(
                                                        "text-left p-3 rounded-xl text-sm font-bold border transition-all",
                                                        specFilters.employment === t.value ? "bg-primary text-white border-primary" : "bg-background border-border hover:border-primary/50"
                                                    )}
                                                >
                                                    {t.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Services Filters */}
                            {slug === 'services' && (
                                <div>
                                    <label className="block text-[11px] font-black uppercase text-muted mb-2 tracking-widest">Тип услуги</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {[
                                            { value: 'repair', label: 'Ремонт' },
                                            { value: 'construction', label: 'Стройка' },
                                            { value: 'beauty', label: 'Красота' },
                                            { value: 'education', label: 'Обучение' },
                                            { value: 'transport', label: 'Перевозки' },
                                            { value: 'other', label: 'Другое' }
                                        ].map(t => (
                                            <button
                                                key={t.value}
                                                onClick={() => setSpecFilters({ ...specFilters, serviceType: specFilters.serviceType === t.value ? '' : t.value })}
                                                className={cn(
                                                    "text-left p-3 rounded-xl text-sm font-bold border transition-all",
                                                    specFilters.serviceType === t.value ? "bg-primary text-white border-primary" : "bg-background border-border hover:border-primary/50"
                                                )}
                                            >
                                                {t.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
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
                                    className="group relative flex flex-col h-full bg-surface rounded-2xl overflow-hidden hover:shadow-xl transition-all border border-border/40"
                                >
                                    <div className="aspect-[4/3] relative overflow-hidden bg-muted">
                                        {ad.images?.[0] ? (
                                            <img
                                                src={getOptimizedImageUrl(ad.images[0], { width: 400, quality: 75 })}
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
                                    <div className="p-3 flex flex-col flex-1 gap-1">
                                        <div className="text-base md:text-lg font-black text-foreground tracking-tight leading-none">
                                            {ad.price ? `${ad.price.toLocaleString()} ₽` : 'Договорная'}
                                        </div>

                                        <h3 className="text-[13px] font-medium leading-snug line-clamp-2 text-foreground/90 min-h-[2.5em] group-hover:text-primary transition-colors">
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
                            {/* Price */}
                            <div>
                                <label className="block text-xs font-black uppercase text-muted mb-4 tracking-widest">Цена, ₽</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <input type="number" placeholder="От" value={priceFrom} onChange={(e) => setPriceFrom(e.target.value)} className="w-full p-4 rounded-2xl bg-surface border border-border outline-none" />
                                    <input type="number" placeholder="До" value={priceTo} onChange={(e) => setPriceTo(e.target.value)} className="w-full p-4 rounded-2xl bg-surface border border-border outline-none" />
                                </div>
                            </div>

                            {/* City */}
                            <div>
                                <label className="block text-xs font-black uppercase text-muted mb-4 tracking-widest">Город</label>
                                <button
                                    onClick={() => setIsCityModalOpen(true)}
                                    className="w-full h-14 px-5 rounded-2xl bg-surface border border-border font-bold text-sm flex items-center justify-between hover:border-primary transition-all text-left"
                                >
                                    <span>{selectedCity || "Любой город"}</span>
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                </button>
                            </div>

                            {/* Transport Filters */}
                            {slug === 'transport' && (
                                <>
                                    <div>
                                        <label className="block text-xs font-black uppercase text-muted mb-4 tracking-widest">КПП</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {['auto', 'manual'].map(t => (
                                                <button
                                                    key={t}
                                                    onClick={() => setSpecFilters({ ...specFilters, transmission: specFilters.transmission === t ? '' : t })}
                                                    className={cn(
                                                        "p-4 rounded-xl text-sm font-bold border transition-all",
                                                        specFilters.transmission === t ? "bg-primary text-white border-primary" : "bg-surface border-border"
                                                    )}
                                                >
                                                    {t === 'auto' ? 'Автомат' : 'Механика'}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black uppercase text-muted mb-4 tracking-widest">Состояние</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {['new', 'used'].map(c => (
                                                <button
                                                    key={c}
                                                    onClick={() => setSpecFilters({ ...specFilters, condition: specFilters.condition === c ? '' : c })}
                                                    className={cn(
                                                        "p-4 rounded-xl text-sm font-bold border transition-all",
                                                        specFilters.condition === c ? "bg-primary text-white border-primary" : "bg-surface border-border"
                                                    )}
                                                >
                                                    {c === 'new' ? 'Новое' : 'Б/У'}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Real Estate Filters */}
                            {slug === 'real-estate' && (
                                <>
                                    <div>
                                        <label className="block text-xs font-black uppercase text-muted mb-4 tracking-widest">Тип объекта</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {[
                                                { value: 'apartment', label: 'Квартира' },
                                                { value: 'house', label: 'Дом' },
                                                { value: 'plot', label: 'Участок' },
                                                { value: 'commercial', label: 'Коммерция' }
                                            ].map(t => (
                                                <button
                                                    key={t.value}
                                                    onClick={() => setSpecFilters({ ...specFilters, type: specFilters.type === t.value ? '' : t.value })}
                                                    className={cn(
                                                        "p-4 rounded-xl text-sm font-bold border transition-all",
                                                        specFilters.type === t.value ? "bg-primary text-white border-primary" : "bg-surface border-border"
                                                    )}
                                                >
                                                    {t.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black uppercase text-muted mb-4 tracking-widest">Комнаты</label>
                                        <div className="grid grid-cols-5 gap-2">
                                            {['studio', '1', '2', '3', '4+'].map(r => (
                                                <button
                                                    key={r}
                                                    onClick={() => setSpecFilters({ ...specFilters, rooms: specFilters.rooms === r ? '' : r })}
                                                    className={cn(
                                                        "p-3 rounded-xl text-sm font-bold border transition-all",
                                                        specFilters.rooms === r ? "bg-primary text-white border-primary" : "bg-surface border-border"
                                                    )}
                                                >
                                                    {r}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Rent Apartments Filters */}
                            {slug === 'rent-apartments' && (
                                <>
                                    <div>
                                        <label className="block text-xs font-black uppercase text-muted mb-4 tracking-widest">Тип жилья</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {[
                                                { value: 'apartment', label: 'Квартира' },
                                                { value: 'room', label: 'Комната' },
                                                { value: 'house', label: 'Дом' }
                                            ].map(t => (
                                                <button
                                                    key={t.value}
                                                    onClick={() => setSpecFilters({ ...specFilters, type: specFilters.type === t.value ? '' : t.value })}
                                                    className={cn(
                                                        "p-4 rounded-xl text-sm font-bold border transition-all",
                                                        specFilters.type === t.value ? "bg-primary text-white border-primary" : "bg-surface border-border"
                                                    )}
                                                >
                                                    {t.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black uppercase text-muted mb-4 tracking-widest">Комнаты</label>
                                        <div className="grid grid-cols-4 gap-2">
                                            {['studio', '1', '2', '3'].map(r => (
                                                <button
                                                    key={r}
                                                    onClick={() => setSpecFilters({ ...specFilters, rooms: specFilters.rooms === r ? '' : r })}
                                                    className={cn(
                                                        "p-3 rounded-xl text-sm font-bold border transition-all",
                                                        specFilters.rooms === r ? "bg-primary text-white border-primary" : "bg-surface border-border"
                                                    )}
                                                >
                                                    {r === 'studio' ? 'Студия' : r}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Electronics Filters */}
                            {slug === 'electronics' && (
                                <div>
                                    <label className="block text-xs font-black uppercase text-muted mb-4 tracking-widest">Состояние</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {['new', 'used'].map(c => (
                                            <button
                                                key={c}
                                                onClick={() => setSpecFilters({ ...specFilters, condition: specFilters.condition === c ? '' : c })}
                                                className={cn(
                                                    "p-4 rounded-xl text-sm font-bold border transition-all",
                                                    specFilters.condition === c ? "bg-primary text-white border-primary" : "bg-surface border-border"
                                                )}
                                            >
                                                {c === 'new' ? 'Новое' : 'Б/У'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Jobs Filters */}
                            {slug === 'jobs' && (
                                <div>
                                    <label className="block text-xs font-black uppercase text-muted mb-4 tracking-widest">Занятость</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {[
                                            { value: 'full', label: 'Полная' },
                                            { value: 'part', label: 'Частичная' },
                                            { value: 'remote', label: 'Удалённо' },
                                            { value: 'project', label: 'Проект' }
                                        ].map(t => (
                                            <button
                                                key={t.value}
                                                onClick={() => setSpecFilters({ ...specFilters, employment: specFilters.employment === t.value ? '' : t.value })}
                                                className={cn(
                                                    "p-4 rounded-xl text-sm font-bold border transition-all",
                                                    specFilters.employment === t.value ? "bg-primary text-white border-primary" : "bg-surface border-border"
                                                )}
                                            >
                                                {t.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Services Filters */}
                            {slug === 'services' && (
                                <div>
                                    <label className="block text-xs font-black uppercase text-muted mb-4 tracking-widest">Тип услуги</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { value: 'repair', label: 'Ремонт' },
                                            { value: 'construction', label: 'Стройка' },
                                            { value: 'beauty', label: 'Красота' },
                                            { value: 'education', label: 'Обучение' },
                                            { value: 'transport', label: 'Перевозки' },
                                            { value: 'other', label: 'Другое' }
                                        ].map(t => (
                                            <button
                                                key={t.value}
                                                onClick={() => setSpecFilters({ ...specFilters, serviceType: specFilters.serviceType === t.value ? '' : t.value })}
                                                className={cn(
                                                    "p-4 rounded-xl text-sm font-bold border transition-all",
                                                    specFilters.serviceType === t.value ? "bg-primary text-white border-primary" : "bg-surface border-border"
                                                )}
                                            >
                                                {t.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="pt-4 border-t border-border">
                                {(priceFrom || priceTo || selectedCity || Object.keys(specFilters).length > 0) && (
                                    <button onClick={resetFilters} className="w-full py-4 text-muted font-bold mb-4">Сбросить всё</button>
                                )}
                                <button onClick={() => { setShowMobileFilters(false); fetchAds(); }} className="w-full py-5 bg-primary text-white font-black rounded-2xl shadow-xl">Показать результаты</button>
                            </div>
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
