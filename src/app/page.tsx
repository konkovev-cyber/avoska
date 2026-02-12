'use client';

import { useEffect, useState, useRef } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import { getOptimizedImageUrl } from '@/lib/image-utils';
import { supabase } from '@/lib/supabase/client';
import { getStoredCity, initCity } from '@/lib/geo';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChevronRight,
  Heart,
  MapPin
} from 'lucide-react';
import { cn } from '@/lib/utils';

const CATEGORIES = [
  { name: 'Транспорт', slug: 'transport', image: '/categories/transport.jpg' },
  { name: 'Недвижимость', slug: 'real-estate', image: '/categories/real-estate.jpg' },
  { name: 'Работа', slug: 'jobs', image: '/categories/jobs.jpg' },
  { name: 'Услуги', slug: 'services', image: '/categories/services.jpg' },
  { name: 'Электроника', slug: 'electronics', image: '/categories/electronics.jpg' },
  { name: 'Дом и дача', slug: 'home', image: '/categories/home.jpg' },
  { name: 'Одежда', slug: 'clothing', image: '/categories/clothing.jpg' },
  { name: 'Запчасти', slug: 'parts', image: '/categories/parts.jpg' },
  { name: 'Хобби', slug: 'hobby', image: '/categories/hobby.jpg' },
  { name: 'Животные', slug: 'pets', image: '/categories/pets.jpg' },
  { name: 'Красота', slug: 'beauty', image: '/categories/beauty.jpg' },
  { name: 'Детское', slug: 'kids', image: '/categories/kids.jpg' },
];

export default function HomePage() {
  const [ads, setAds] = useState<any[]>([]);
  const [newAds, setNewAds] = useState<any[]>([]); // New state for fresh ads
  const [banners, setBanners] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [city, setCity] = useState<string | null>(null);
  const PAGE_SIZE = 14;

  const router = useRouter();
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchInitialData();
    fetchFavorites();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const currentCity = await initCity();
      setCity(currentCity);

      const [bannersRes, newAdsRes] = await Promise.all([
        supabase.from('banners').select('*').eq('is_active', true),
        supabase.from('ads')
          .select('*, profiles!user_id(full_name, avatar_url, is_verified)')
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(8)
      ]);
      setBanners(bannersRes.data || []);
      setNewAds(newAdsRes.data || []);

      await fetchAds(0, true, currentCity);
    } catch (error) {
      console.error('Initial fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAds = async (pageNum: number, isInitial = false, cityOverride?: string) => {
    try {
      const currentCity = cityOverride || city || getStoredCity();
      const from = pageNum * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      console.log('Fetching ads for city:', currentCity);

      let q = supabase
        .from('ads')
        .select('*, profiles!user_id(full_name, avatar_url, is_verified)')
        .eq('status', 'active');

      if (currentCity && currentCity !== 'Все города') {
        q = q.eq('city', currentCity);
      }

      const { data, error } = await q
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      // Fallback: If no ads in selected city, fetch all ads
      if (isInitial && (!data || data.length === 0) && currentCity && currentCity !== 'Все города') {
        console.log('No ads in city, falling back to all cities');
        await fetchAds(0, true, 'Все города');
        return;
      }

      if (isInitial) {
        setAds(data || []);
      } else {
        setAds(prev => [...prev, ...(data || [])]);
      }

      setHasMore(data?.length === PAGE_SIZE);
    } catch (error) {
      console.error('Fetch ads error:', error);
    }
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          const nextPage = page + 1;
          setPage(nextPage);
          setLoadingMore(true);
          fetchAds(nextPage).finally(() => setLoadingMore(false));
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, page]);

  const fetchFavorites = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data } = await supabase.from('favorites').select('ad_id').eq('user_id', session.user.id);
    if (data) setFavorites(new Set(data.map(f => f.ad_id)));
  };

  const toggleFavorite = async (e: React.MouseEvent, adId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return router.push('/login');

    const isFav = favorites.has(adId);
    if (isFav) {
      await supabase.from('favorites').delete().eq('user_id', session.user.id).eq('ad_id', adId);
      setFavorites(prev => {
        const next = new Set(prev);
        next.delete(adId);
        return next;
      });
    } else {
      await supabase.from('favorites').insert({ user_id: session.user.id, ad_id: adId });
      setFavorites(prev => new Set(prev).add(adId));
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-8 md:py-12">
      <div className="w-full">
        <section className="mb-10">
          <h1 className="text-4xl md:text-6xl font-black text-foreground mb-3 tracking-tighter">Все категории</h1>
          <p className="text-lg md:text-xl text-muted-foreground font-medium max-w-2xl">Найдите то, что нужно именно вам среди тысяч объявлений</p>
        </section>

        <section className="mb-12">
          <div className="grid grid-cols-4 lg:grid-cols-8 gap-4 md:gap-6">
            {CATEGORIES.slice(0, 8).map((cat) => (
              <Link
                key={cat.slug}
                href={`/category?slug=${cat.slug}`}
                className="flex flex-col items-center gap-2 group transition-all"
              >
                <div className="relative w-full aspect-square rounded-2xl md:rounded-[2rem] overflow-hidden shadow-sm group-hover:shadow-xl group-hover:-translate-y-1 transition-all duration-300">
                  <img
                    src={cat.image}
                    alt={cat.name}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
                </div>
                <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-center line-clamp-1 opacity-70 group-hover:opacity-100 group-hover:text-primary transition-all">
                  {cat.name}
                </span>
              </Link>
            ))}
          </div>

          <div className="mt-8 flex justify-center">
            <Link
              href="/categories"
              className="flex items-center gap-2 px-8 py-3 bg-surface border-2 border-border rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-primary hover:border-primary hover:text-white transition-all shadow-md active:scale-95"
            >
              <span>Все категории</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        {banners.length > 0 && (
          <section className="mb-10 overflow-hidden">
            <div className="flex gap-6 overflow-x-auto pb-6 scrollbar-none px-1">
              {banners.map(banner => (
                <a
                  key={banner.id}
                  href={banner.link_url || '#'}
                  className="shrink-0 w-[300px] md:w-[800px] h-48 md:h-72 rounded-[2.5rem] overflow-hidden bg-primary/5 border-2 border-border/50 group shadow-lg"
                >
                  {banner.image_url && <img src={banner.image_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-all duration-1000" />}
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Fresh Ads Section - 8 items */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl md:text-3xl font-black tracking-tight">Новое</h2>
            <Link href="/search?sort=newest" className="text-sm font-bold text-primary hover:underline">
              Смотреть все
            </Link>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-none">
            {newAds.map((ad) => (
              <div key={ad.id} className="shrink-0 w-[160px] md:w-[200px] group relative flex flex-col bg-card rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all border border-border/40 active:scale-[0.98] duration-200">
                <Link href={`/ad?id=${ad.id}`} className="flex flex-col h-full">
                  <div className="aspect-[4/3] relative overflow-hidden bg-muted">
                    {ad.images?.[0] ? (
                      <img
                        src={getOptimizedImageUrl(ad.images[0], { width: 300, quality: 70 })}
                        alt={ad.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[9px] text-muted-foreground uppercase font-black tracking-widest opacity-30">Нет фото</div>
                    )}
                  </div>

                  <div className="p-2.5 flex flex-col flex-1 gap-1">
                    <div className="text-base font-black tracking-tight text-foreground leading-none">
                      {ad.price ? `${ad.price.toLocaleString()} ₽` : 'Договорная'}
                    </div>
                    <h3 className="text-xs font-medium leading-snug line-clamp-2 text-foreground/90 min-h-[2.5em]">
                      {ad.title}
                    </h3>
                    <div className="mt-auto pt-1 flex items-center gap-1 text-[9px] font-bold text-muted-foreground uppercase tracking-wide opacity-70">
                      <span className="truncate">{ad.city}</span>
                    </div>
                  </div>
                </Link>
                <button
                  onClick={(e) => toggleFavorite(e, ad.id)}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-red-500 hover:text-white transition-all active:scale-90"
                >
                  <Heart className={cn("h-3.5 w-3.5 transition-all", favorites.has(ad.id) ? "fill-red-500 text-red-500" : "")} />
                </button>
              </div>
            ))}
            {newAds.length === 0 && loading && [1, 2, 3, 4].map(i => (
              <div key={i} className="shrink-0 w-[160px] h-[220px] bg-muted/20 rounded-2xl animate-pulse" />
            ))}
          </div>
        </section>

        <div className="flex items-center justify-between mb-10">
          <h2 className="text-3xl md:text-4xl font-black tracking-tight">Рекомендации для вас</h2>
          <div className="h-1 flex-1 bg-border mx-8 rounded-full hidden md:block opacity-30" />
        </div>

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
              <div key={i} className="flex flex-col bg-card rounded-2xl overflow-hidden shadow-sm border border-border/40 h-full">
                <Skeleton className="aspect-[4/3] w-full" />
                <div className="p-3 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : ads.length > 0 ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-6">
            {ads.map((ad) => (
              <div key={ad.id} className="group relative flex flex-col h-full bg-card rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all border border-border/40 active:scale-[0.98] duration-200">
                <Link href={`/ad?id=${ad.id}`} className="flex flex-col h-full">
                  <div className="aspect-[4/3] relative overflow-hidden bg-muted">
                    {ad.images?.[0] ? (
                      <img
                        src={getOptimizedImageUrl(ad.images[0], { width: 400, quality: 75 })}
                        alt={ad.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-30">Нет фото</div>
                    )}
                    {ad.condition === 'new' && (
                      <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-green-500/90 backdrop-blur-md text-white text-[9px] font-black uppercase tracking-wider rounded-md shadow-lg">
                        Новое
                      </div>
                    )}
                  </div>

                  <div className="p-3 flex flex-col flex-1 gap-1">
                    <div className="flex justify-between items-start gap-2">
                      <div className="text-lg font-black tracking-tight text-foreground leading-none">
                        {ad.price ? `${ad.price.toLocaleString()} ₽` : 'Договорная'}
                      </div>
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

                <button
                  onClick={(e) => toggleFavorite(e, ad.id)}
                  className="absolute top-2 right-2 p-2 rounded-full bg-black/20 backdrop-blur-md text-white hover:bg-red-500 hover:text-white transition-all active:scale-90"
                >
                  <Heart className={cn("h-4 w-4 transition-all", favorites.has(ad.id) ? "fill-red-500 text-red-500" : "")} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-surface p-20 rounded-[4rem] border-4 border-dashed border-border/50 text-center shadow-inner">
            <div className="w-24 h-24 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <MapPin className="h-10 w-10 text-muted/40" />
            </div>
            <h3 className="text-3xl font-black mb-3 tracking-tight">В этом городе пока нет объявлений</h3>
            <p className="text-lg text-muted-foreground mb-10 max-w-md mx-auto italic font-medium">Но мы уже ищем лучшие предложения для вас в других регионах!</p>
            <Link href="/ads/create" className="inline-flex bg-primary text-white px-10 py-4 rounded-2xl font-black text-lg shadow-xl shadow-primary/20 hover:scale-105 transition-transform">
              Стать первым продавцом
            </Link>
          </div>
        )}

        <div ref={loadMoreRef} className="h-32 flex items-center justify-center mt-8">
          {loadingMore && (
            <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-6 w-full opacity-50">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={`more-${i}`} className="flex flex-col bg-card rounded-2xl overflow-hidden shadow-sm border border-border/40 h-full">
                  <Skeleton className="aspect-[4/3] w-full" />
                  <div className="p-3 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
