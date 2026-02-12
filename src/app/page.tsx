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

      const [bannersRes] = await Promise.all([
        supabase.from('banners').select('*').eq('is_active', true)
      ]);
      setBanners(bannersRes.data || []);
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
          <section className="mb-16 overflow-hidden">
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

        <div className="flex items-center justify-between mb-10">
          <h2 className="text-3xl md:text-4xl font-black tracking-tight">Рекомендации для вас</h2>
          <div className="h-1 flex-1 bg-border mx-8 rounded-full hidden md:block opacity-30" />
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 md:gap-8">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
              <div key={i} className="space-y-4">
                <Skeleton className="aspect-square w-full rounded-[2.5rem]" />
                <div className="space-y-3 px-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-7 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : ads.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 md:gap-8">
            {ads.map((ad) => (
              <div key={ad.id} className="group relative flex flex-col h-full animate-in fade-in zoom-in duration-500">
                <Link href={`/ad?id=${ad.id}`} className="flex flex-col h-full bg-surface rounded-[2.5rem] overflow-hidden hover:shadow-2xl transition-all border-2 border-transparent hover:border-primary/20 p-2">
                  <div className="aspect-square bg-muted rounded-[2rem] relative overflow-hidden shadow-inner">
                    {ad.images?.[0] ? (
                      <img
                        src={getOptimizedImageUrl(ad.images[0], { width: 600, quality: 75 })}
                        alt={ad.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-muted uppercase font-black tracking-widest opacity-30">Нет фото</div>
                    )}
                    <button
                      onClick={(e) => toggleFavorite(e, ad.id)}
                      className="absolute top-4 right-4 p-2.5 bg-white/95 dark:bg-black/95 backdrop-blur-xl rounded-2xl transition-all shadow-xl active:scale-90 z-10 hover:bg-primary hover:text-white group/fav"
                    >
                      <Heart className={cn("h-5 w-5 transition-all", favorites.has(ad.id) ? "fill-red-500 text-red-500 scale-110" : "text-muted-foreground group-hover/fav:text-white")} />
                    </button>
                    {ad.condition === 'new' && (
                      <div className="absolute bottom-4 left-4 px-3 py-1 bg-primary/90 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-lg">
                        Новое
                      </div>
                    )}
                  </div>
                  <div className="p-4 flex flex-col flex-1">
                    <h3 className="text-base md:text-lg font-bold text-foreground leading-[1.2] line-clamp-2 mb-2 group-hover:text-primary transition-colors h-12 md:h-14">
                      {ad.title}
                    </h3>
                    <div className="text-2xl font-black text-foreground mb-3 tracking-tighter">
                      {ad.price ? `${ad.price.toLocaleString()} ₽` : 'Договорная'}
                    </div>
                    <div className="mt-auto flex items-center gap-2 text-xs text-muted-foreground font-bold uppercase tracking-wider opacity-60">
                      <div className="p-1 px-2 bg-muted/50 rounded-lg flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate max-w-[120px]">{ad.city}</span>
                      </div>
                    </div>
                  </div>
                </Link>
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

        <div ref={loadMoreRef} className="h-32 flex items-center justify-center mt-12">
          {loadingMore && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 md:gap-8 w-full opacity-50">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={`more-${i}`} className="space-y-4">
                  <Skeleton className="aspect-square w-full rounded-[2.5rem]" />
                  <div className="space-y-3 px-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-7 w-1/2" />
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
