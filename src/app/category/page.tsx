'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import { getStoredCity } from '@/lib/geo';
import { getOptimizedImageUrl } from '@/lib/image-utils';
import { Home, Car, Smartphone, Shirt, Gamepad, Armchair, ChevronRight, ChevronLeft, CheckCircle, Info, Filter, X, Search, Plus, Heart, Briefcase, Wrench, Settings, Baby, Sparkles, MapPin, Check, ChevronDown, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import ResponsiveSelect from '@/components/ui/ResponsiveSelect';

const CATEGORIES = [
    { name: 'Транспорт', slug: 'transport', image: '/categories/transport.jpg' },
    { name: 'Недвижимость', slug: 'real-estate', image: '/categories/real-estate.jpg' },
    { name: 'Аренда квартир', slug: 'rent-apartments', image: '/categories/rent-apartments.jpg' },
    { name: 'Аренда коммерции', slug: 'rent-commercial', image: '/categories/rent-commercial.jpg' },
    { name: 'Аренда авто', slug: 'rent-cars', image: '/categories/rent-cars.jpg' },
    { name: 'Работа', slug: 'jobs', image: '/categories/jobs.jpg' },
    { name: 'Услуги', slug: 'services', image: '/categories/services.jpg' },
    { name: 'Аренда инструмента', slug: 'rent-tools', image: '/categories/rent-tools.jpg' },
    { name: 'Электроника', slug: 'electronics', image: '/categories/electronics.jpg' },
    { name: 'Дом и дача', slug: 'home', image: '/categories/home.jpg' },
    { name: 'Одежда', slug: 'clothing', image: '/categories/clothing.jpg' },
    { name: 'Запчасти', slug: 'parts', image: '/categories/parts.jpg' },
    { name: 'Хобби', slug: 'hobby', image: '/categories/hobby.jpg' },
    { name: 'Животные', slug: 'pets', image: '/categories/pets.jpg' },
    { name: 'Красота', slug: 'beauty', image: '/categories/beauty.jpg' },
    { name: 'Детское', slug: 'kids', image: '/categories/kids.jpg' },
    { name: 'Для бизнеса', slug: 'business', image: '/categories/business.jpg' },
    { name: 'Спорт и отдых', slug: 'sport', image: '/categories/sport.jpg' },
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
    // Custom selection states - removed isCityModalOpen as handled by ResponsiveSelect
    const [showMobileFilters, setShowMobileFilters] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

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
    }, [slug, priceFrom, priceTo, selectedCity, specFilters, searchQuery]);

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
                    .select('*, profiles!user_id(full_name, avatar_url, is_verified, rating)')
                    .eq('category_id', catData.id)
                    .eq('status', 'active');

                if (priceFrom) query = query.gte('price', parseFloat(priceFrom));
                if (priceTo) query = query.lte('price', parseFloat(priceTo));
                if (selectedCity && selectedCity !== 'Все города') query = query.eq('city', selectedCity);
                if (searchQuery) query = query.ilike('title', `%${searchQuery}%`);

                const { data, error } = await query.order('created_at', { ascending: false });
                if (error) throw error;

                let filteredData = data || [];

                if (Object.keys(specFilters).length > 0) {
                    filteredData = filteredData.filter(ad => {
                        return Object.entries(specFilters).every(([key, value]) => {
                            if (!value) return true;

                            // Handle ranges for area/mileage
                            if (key.endsWith('_from')) {
                                const realKey = key.replace('_from', '');
                                return (ad.specifications?.[realKey] || 0) >= parseFloat(value);
                            }
                            if (key.endsWith('_to')) {
                                const realKey = key.replace('_to', '');
                                return (ad.specifications?.[realKey] || 0) <= parseFloat(value);
                            }

                            return String(ad.specifications?.[key] || '') === String(value);
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
        setSearchQuery('');
    };

    const renderFilters = (isMobile = false) => (
        <div className={cn("space-y-6", isMobile ? "p-8" : "")}>
            {!isMobile && (
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-black">Фильтры</h3>
                    {(priceFrom || priceTo || selectedCity || Object.keys(specFilters).length > 0) && (
                        <button onClick={resetFilters} className="text-[10px] font-black uppercase text-primary hover:underline">Сбросить</button>
                    )}
                </div>
            )}

            {/* Price Filter */}
            <div>
                <label className="block text-[10px] font-black uppercase text-muted-foreground/60 mb-3 tracking-widest">Цена, ₽</label>
                <div className="flex items-center gap-2">
                    <input
                        type="number"
                        min="0"
                        placeholder="От"
                        value={priceFrom}
                        onChange={(e) => setPriceFrom(Math.max(0, parseFloat(e.target.value) || 0).toString())}
                        className="w-full h-11 px-4 text-sm rounded-xl bg-muted/5 border border-border outline-none focus:border-primary transition-all font-bold"
                    />
                    <div className="w-4 h-px bg-border shrink-0"></div>
                    <input
                        type="number"
                        min="0"
                        placeholder="До"
                        value={priceTo}
                        onChange={(e) => setPriceTo(Math.max(0, parseFloat(e.target.value) || 0).toString())}
                        className="w-full h-11 px-4 text-sm rounded-xl bg-muted/5 border border-border outline-none focus:border-primary transition-all font-bold"
                    />
                </div>
            </div>

            {/* City Filter */}
            <ResponsiveSelect
                label="Город"
                value={selectedCity}
                onChange={setSelectedCity}
                options={[
                    { value: '', label: 'Любой' },
                    ...cities.map(c => ({ value: c.name, label: c.name }))
                ]}
                placeholder="Любой город"
            />

            {/* Dynamic Specs Filters */}
            {(slug === 'transport' || slug === 'electronics' || slug === 'real-estate' || slug === 'rent-apartments' || slug === 'rent-cars' || slug === 'rent-commercial') && (
                <div className="space-y-6 pt-6 border-t border-border/50">
                    {(slug === 'transport' || slug === 'rent-cars') && (
                        <>
                            <div>
                                <label className="block text-[10px] font-black uppercase text-muted-foreground/60 mb-2 tracking-widest">Пробег, км</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        min="0"
                                        placeholder="От"
                                        value={specFilters.mileage_from || ''}
                                        onChange={(e) => setSpecFilters({ ...specFilters, mileage_from: Math.max(0, parseFloat(e.target.value) || 0).toString() })}
                                        className="w-full h-10 px-3 text-xs rounded-xl bg-muted/5 border border-border font-bold outline-none"
                                    />
                                    <input
                                        type="number"
                                        min="0"
                                        placeholder="До"
                                        value={specFilters.mileage_to || ''}
                                        onChange={(e) => setSpecFilters({ ...specFilters, mileage_to: Math.max(0, parseFloat(e.target.value) || 0).toString() })}
                                        className="w-full h-10 px-3 text-xs rounded-xl bg-muted/5 border border-border font-bold outline-none"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase text-muted-foreground/60 mb-2 tracking-widest">Коробка</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {[{ id: 'auto', label: 'АКПП' }, { id: 'manual', label: 'МКПП' }].map(t => (
                                        <button
                                            key={t.id}
                                            onClick={() => setSpecFilters({ ...specFilters, transmission: specFilters.transmission === t.id ? '' : t.id })}
                                            className={cn(
                                                "text-center py-2.5 rounded-xl text-[10px] font-black uppercase border transition-all",
                                                specFilters.transmission === t.id ? "bg-primary text-white border-primary" : "bg-muted/5 border-border hover:border-primary/50"
                                            )}
                                        >
                                            {t.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    {(slug === 'real-estate' || slug === 'rent-apartments' || slug === 'rent-commercial') && (
                        <>
                            <div>
                                <label className="block text-[10px] font-black uppercase text-muted-foreground/60 mb-2 tracking-widest">Объект</label>
                                <div className="grid grid-cols-2 gap-1.5">
                                    {[
                                        { id: 'apartment', label: 'Квартира' },
                                        { id: 'house', label: 'Дом/Дача' },
                                        { id: 'plot', label: 'Участок' },
                                        { id: 'commercial', label: 'Офис/ТЦ' }
                                    ].map(t => (
                                        <button
                                            key={t.id}
                                            onClick={() => {
                                                const newType = specFilters.type === t.id ? '' : t.id;
                                                setSpecFilters({ type: newType });
                                            }}
                                            className={cn(
                                                "py-2 rounded-xl text-[9px] font-black uppercase border transition-all",
                                                specFilters.type === t.id ? "bg-primary text-white border-primary" : "bg-muted/5 border-border hover:border-primary/50"
                                            )}
                                        >
                                            {t.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {(specFilters.type === 'apartment' || !specFilters.type) && (
                                <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                                    <label className="block text-[10px] font-black uppercase text-muted-foreground/60 mb-2 tracking-widest">Комнаты</label>
                                    <div className="flex flex-wrap gap-1.5">
                                        {['studio', '1', '2', '3', '4+'].map(r => (
                                            <button
                                                key={r}
                                                onClick={() => setSpecFilters({ ...specFilters, rooms: specFilters.rooms === r ? '' : r })}
                                                className={cn(
                                                    "w-10 h-10 rounded-xl text-[10px] font-black uppercase border transition-all flex items-center justify-center",
                                                    specFilters.rooms === r ? "bg-primary text-white border-primary" : "bg-muted/5 border-border hover:border-primary/50"
                                                )}
                                            >
                                                {r === 'studio' ? 'Студ' : r}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {specFilters.type === 'plot' && (
                                <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                                    <label className="block text-[10px] font-black uppercase text-muted-foreground/60 mb-2 tracking-widest">Статус земли</label>
                                    <div className="grid grid-cols-2 gap-1.5">
                                        {[{ id: 'izhs', label: 'ИЖС' }, { id: 'snt', label: 'СНТ' }, { id: 'dnp', label: 'ДНП' }, { id: 'prom', label: 'Пром' }].map(r => (
                                            <button
                                                key={r.id}
                                                onClick={() => setSpecFilters({ ...specFilters, status: specFilters.status === r.id ? '' : r.id })}
                                                className={cn(
                                                    "py-2 rounded-xl text-[10px] font-black uppercase border transition-all",
                                                    specFilters.status === r.id ? "bg-primary text-white border-primary" : "bg-muted/5 border-border hover:border-primary/50"
                                                )}
                                            >
                                                {r.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {(specFilters.type === 'plot' || specFilters.type === 'house') && (
                                <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                                    <label className="block text-[10px] font-black uppercase text-muted-foreground/60 mb-2 tracking-widest">Участок, сот.</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            placeholder="От"
                                            value={specFilters.plot_area_from || ''}
                                            onChange={(e) => setSpecFilters({ ...specFilters, plot_area_from: e.target.value })}
                                            className="w-full h-10 px-3 text-xs rounded-xl bg-muted/5 border border-border font-bold outline-none"
                                        />
                                        <input
                                            type="number"
                                            placeholder="До"
                                            value={specFilters.plot_area_to || ''}
                                            onChange={(e) => setSpecFilters({ ...specFilters, plot_area_to: e.target.value })}
                                            className="w-full h-10 px-3 text-xs rounded-xl bg-muted/5 border border-border font-bold outline-none"
                                        />
                                    </div>
                                </div>
                            )}

                            {(specFilters.type === 'apartment' || specFilters.type === 'house' || specFilters.type === 'commercial') && (
                                <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                                    <label className="block text-[10px] font-black uppercase text-muted-foreground/60 mb-2 tracking-widest">Площадь, м²</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            placeholder="От"
                                            value={specFilters.area_from || ''}
                                            onChange={(e) => setSpecFilters({ ...specFilters, area_from: e.target.value })}
                                            className="w-full h-10 px-3 text-xs rounded-xl bg-muted/5 border border-border font-bold outline-none"
                                        />
                                        <input
                                            type="number"
                                            placeholder="До"
                                            value={specFilters.area_to || ''}
                                            onChange={(e) => setSpecFilters({ ...specFilters, area_to: e.target.value })}
                                            className="w-full h-10 px-3 text-xs rounded-xl bg-muted/5 border border-border font-bold outline-none"
                                        />
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );

    if (!category) return <div className="p-20 text-center">Категория не найдена</div>;

    return (
        <div className="container mx-auto px-2 md:px-4 py-6 max-w-[1200px]">
            <Link href="/categories" className="inline-flex items-center gap-2 text-primary font-black mb-6 hover:translate-x-[-4px] transition-transform text-xs uppercase tracking-widest">
                <ChevronLeft className="h-4 w-4" /> Ко всем категориям
            </Link>
            <div className="flex flex-col items-center justify-center text-center mb-10 gap-4">
                <div className="relative w-24 h-24 rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-primary/10 transition-transform hover:scale-105 duration-500 bg-surface">
                    <img
                        src={category.image}
                        alt={category.name}
                        className="w-full h-full object-cover"
                    />
                </div>
                <div className="space-y-1">
                    <h1 className="text-xl md:text-3xl font-black tracking-tight">{category.name}</h1>
                    <div className="inline-flex items-center px-4 py-1 bg-primary/5 rounded-full border border-primary/10">
                        <p className="text-primary text-[10px] font-black uppercase tracking-[0.15em]">{ads.length} объявлений</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowMobileFilters(true)}
                    className="md:hidden w-full mt-2 p-4 bg-surface border border-border rounded-2xl flex items-center justify-center gap-2 font-black transition-all active:scale-95 shadow-sm"
                >
                    <Filter className="h-5 w-5 text-primary" />
                    <span className="text-sm uppercase tracking-widest">Фильтры</span>
                    {(priceFrom || priceTo || selectedCity || Object.keys(specFilters).length > 0) && (
                        <span className="w-2 h-2 bg-primary rounded-full animate-pulse ml-1" />
                    )}
                </button>
            </div>

            <div className="flex flex-col md:flex-row gap-8">
                {/* Sidebar Filters - Desktop */}
                <aside className="hidden md:block w-72 shrink-0 space-y-6">
                    <div className="bg-surface p-6 rounded-3xl border border-border h-fit sticky top-24 shadow-sm">
                        {renderFilters()}
                    </div>
                </aside>

                {/* Main Content Area */}
                <div className="flex-1 space-y-6">
                    {/* Inner Category Search */}
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            placeholder={`Поиск в категории ${category.name}...`}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full h-14 pl-12 pr-4 bg-surface border border-border rounded-2xl outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 font-bold transition-all shadow-sm"
                        />
                    </div>

                    {/* Ads Grid */}
                    <div>
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
                                            <button className="absolute top-2 right-2 p-1.5 bg-surface/80 backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-surface text-muted hover:text-red-500">
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

                                            <div className="mt-auto pt-2 space-y-2">
                                                <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-wide opacity-70">
                                                    <div className="flex items-center gap-1 truncate">
                                                        <MapPin className="h-3 w-3 shrink-0" />
                                                        <span className="truncate">{ad.city}</span>
                                                    </div>
                                                    <span className="shrink-0">{new Date(ad.created_at).toLocaleDateString()}</span>
                                                </div>

                                                <div className="pt-2 border-t border-border/40 flex items-center justify-between">
                                                    <div className="flex items-center gap-1.5 min-w-0">
                                                        <div className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center text-[7px] font-black shrink-0">
                                                            {ad.profiles?.avatar_url ? (
                                                                <img src={ad.profiles.avatar_url} className="w-full h-full object-cover rounded-full" />
                                                            ) : (
                                                                ad.profiles?.full_name?.charAt(0) || '?'
                                                            )}
                                                        </div>
                                                        <span className="text-[9px] font-bold truncate text-muted-foreground">{ad.profiles?.full_name?.split(' ')[0]}</span>
                                                    </div>
                                                    <div className="flex items-center gap-0.5 text-orange-500">
                                                        <Star className="h-2.5 w-2.5 fill-current" />
                                                        <span className="text-[9px] font-black">{ad.profiles?.rating?.toFixed(1) || '5.0'}</span>
                                                    </div>
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
            </div>

            {/* Mobile Filters Drawer */}
            {
                showMobileFilters && (
                    <div className="fixed inset-0 z-[150] md:hidden bg-black/40 backdrop-blur-md animate-in fade-in duration-300">
                        <div className="absolute inset-x-4 bottom-4 bg-background rounded-[2.5rem] max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-500 shadow-2xl border border-border/50 flex flex-col">
                            <div className="p-6 sticky top-0 bg-background/80 backdrop-blur-xl border-b border-border/50 flex items-center justify-between z-10 shrink-0">
                                <div className="flex items-center gap-3">
                                    <h3 className="text-lg font-black uppercase tracking-tight">Фильтры</h3>
                                    {(priceFrom || priceTo || selectedCity || Object.keys(specFilters).length > 0) && (
                                        <button onClick={resetFilters} className="text-[10px] font-black uppercase text-primary underline">Сбросить</button>
                                    )}
                                </div>
                                <button onClick={() => setShowMobileFilters(false)} className="p-2.5 bg-muted/10 rounded-full active:scale-95 transition-transform"><X className="h-5 w-5" /></button>
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar pt-2">
                                {renderFilters(true)}
                                <div className="px-8 pb-10 pt-4">
                                    <button onClick={() => setShowMobileFilters(false)} className="w-full py-5 bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary/20 active:scale-95 transition-all text-sm uppercase tracking-widest">Показать результаты</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}

export default function CategoryPage() {
    return (
        <Suspense fallback={<div className="p-20 text-center font-black uppercase tracking-widest opacity-30 text-xs">Загрузка...</div>}>
            <CategoryContent />
        </Suspense>
    );
}
