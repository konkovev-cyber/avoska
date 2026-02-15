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
  MapPin,
  Star,
  Smartphone
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { recommendationService } from '@/lib/recommendations';
import HoverImageGallery from '@/components/ui/HoverImageGallery';

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
  const [personalCategory, setPersonalCategory] = useState<any>(null);
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

      const [bannersRes, newAdsRes, settingsRes] = await Promise.all([
        supabase.from('banners').select('*').eq('is_active', true).order('created_at', { ascending: false }).limit(5),
        supabase.from('ads')
          .select('*, profiles!user_id(full_name, avatar_url, is_verified, rating)')
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase.from('app_settings').select('*').eq('key', 'banners_enabled').single()
      ]);

      // Only set banners if they're enabled globally
      const bannersEnabled = settingsRes.data?.value === 'true';
      let fetchedBanners = bannersRes.data || [];
      if (bannersEnabled && fetchedBanners.length > 0) {
        // Shuffle and take 4 to align with grid better
        fetchedBanners = fetchedBanners.sort(() => Math.random() - 0.5).slice(0, 4);

        // Track impressions
        fetchedBanners.forEach(banner => {
          supabase.rpc('increment_banner_impression', { banner_id: banner.id }).then(({ error }) => {
            if (error) {
              // Fallback if RPC not exists, just direct update (not ideal but works for now)
              supabase.from('banners').update({ impressions_count: (banner.impressions_count || 0) + 1 }).eq('id', banner.id);
            }
          });
        });
      }
      setBanners(bannersEnabled ? fetchedBanners : []);
      setNewAds(newAdsRes.data || []);

      // Smart feed: check last category
      const lastCatId = recommendationService.getLastCategory();
      let pCat = null;
      if (lastCatId) {
        const { data: catData } = await supabase.from('categories').select('*').eq('id', lastCatId).single();
        if (catData) {
          setPersonalCategory(catData);
          pCat = catData.id;
        }
      }

      await fetchAds(0, true, currentCity, pCat);
    } catch (error) {
      console.error('Initial fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAds = async (pageNum: number, isInitial = false, cityOverride?: string, categoryIdOverride?: string) => {
    try {
      const currentCity = cityOverride || city || getStoredCity();
      const from = pageNum * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      console.log('Fetching ads for city:', currentCity);

      let q = supabase
        .from('ads')
        .select('*, profiles!user_id(full_name, avatar_url, is_verified, rating)')
        .eq('status', 'active');

      if (currentCity && currentCity !== 'Все города') {
        q = q.eq('city', currentCity);
      }

      if (categoryIdOverride) {
        q = q.eq('category_id', categoryIdOverride);
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
    if (!session) {
      toast.error('Войдите, чтобы добавить в избранное');
      return router.push('/login');
    }

    const isFav = favorites.has(adId);

    // Optimistic UI
    setFavorites(prev => {
      const next = new Set(prev);
      if (isFav) next.delete(adId);
      else next.add(adId);
      return next;
    });

    try {
      if (isFav) {
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', session.user.id)
          .eq('ad_id', adId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('favorites')
          .insert({ user_id: session.user.id, ad_id: adId });

        if (error) {
          if (error.code === '23505') return; // Already exists
          throw error;
        }
      }
    } catch (error: any) {
      console.error('Error toggling favorite:', error);
      toast.error('Ошибка обновления избранного');
      // Rollback
      setFavorites(prev => {
        const next = new Set(prev);
        if (isFav) next.add(adId);
        else next.delete(adId);
        return next;
      });
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto px-2 md:px-8 py-1 md:py-6 pb-20">
      <div className="w-full">
        {/* Banners Section - Desktop Only */}
        {banners.length > 0 && (
          <section className="mb-6 px-1 hidden md:block">
            <div className="grid grid-cols-4 gap-3">
              {banners.map(banner => (
                <a
                  key={banner.id}
                  href={banner.link_url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    supabase.rpc('increment_banner_click', { banner_id: banner.id }).then(({ error }) => {
                      if (error) {
                        supabase.from('banners').update({ clicks_count: (banner.clicks_count || 0) + 1 }).eq('id', banner.id);
                      }
                    });
                  }}
                  className="relative aspect-[2.4/1] rounded-xl overflow-hidden bg-gradient-to-br from-primary/20 to-accent/10 border border-border/40 group shadow-sm hover:shadow-xl transition-all duration-300"
                >
                  {banner.image_url ? (
                    <img
                      src={banner.image_url}
                      alt={banner.title || 'Баннер'}
                      className="w-full h-full object-cover transition-opacity duration-500"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.opacity = '0';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/10 to-accent/5" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent p-3 flex flex-col justify-end">
                    <h3 className="text-white font-bold text-xs md:text-sm line-clamp-2 leading-tight drop-shadow-md">{banner.title}</h3>
                    {banner.content && (
                      <p className="text-white/80 text-[10px] line-clamp-1 mt-0.5 hidden md:block">{banner.content}</p>
                    )}
                  </div>
                  <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-black/40 backdrop-blur-md rounded-[3px] text-[8px] font-black text-white/80 uppercase tracking-widest border border-white/10">
                    Реклама
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}

        <section className="mb-2 hidden md:block">
          <h1 className="text-xl md:text-5xl font-black text-foreground mb-0.5 tracking-tighter">Все категории</h1>
          <p className="text-[11px] md:text-lg text-muted-foreground font-medium max-w-2xl">Найдите то, что нужно именно вам</p>
        </section>

        <section className="mb-6">
          {/* Desktop Categories Grid */}
          <div className="hidden md:grid grid-cols-4 lg:grid-cols-10 gap-2 md:gap-4">
            {CATEGORIES.slice(0, 10).map((cat) => (
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

          {/* Mobile Categories - Responsive Grid */}
          <div className="md:hidden grid grid-cols-5 gap-2 px-1">
            {CATEGORIES.slice(0, 10).map((cat) => (
              <Link
                key={cat.slug}
                href={`/category?slug=${cat.slug}`}
                className="flex flex-col gap-1 items-center"
              >
                <div className="aspect-square w-full bg-surface border border-border rounded-xl overflow-hidden shadow-sm active:scale-95 transition-transform flex items-center justify-center">
                  <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" />
                </div>
                <span className="text-[9px] font-bold text-center leading-tight line-clamp-1">{cat.name}</span>
              </Link>
            ))}
          </div>

          <div className="mt-4 flex justify-start md:justify-center px-1">
            <Link
              href="/categories"
              className="flex items-center gap-2 px-6 py-2 bg-background border-2 border-primary/20 rounded-xl text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary hover:text-white transition-all shadow-lg shadow-primary/5 active:scale-95"
            >
              <span>Показать все категории</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        {/* Fresh Ads Section */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4 px-1">
            <h2 className="text-xl md:text-3xl font-black tracking-tight">Новое</h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 px-1">
            {newAds.slice(0, 5).map((ad) => (
              <div key={ad.id} className="group relative flex flex-col bg-card rounded-xl overflow-hidden shadow-md hover:shadow-xl border border-border/80 transition-all duration-300 active:scale-[0.98]">
                <div className="aspect-[4/3] relative overflow-hidden bg-secondary/10">
                  <HoverImageGallery
                    images={ad.images}
                    alt={ad.title}
                    href={`/ad?id=${ad.id}`}
                  />
                  {ad.condition === 'new' && (
                    <div className="absolute bottom-1 left-1 px-1 py-0.5 bg-green-500 text-white text-[7px] font-black uppercase rounded shadow-sm z-20 pointer-events-none">
                      Новое
                    </div>
                  )}
                </div>

                <Link href={`/ad?id=${ad.id}`} className="flex flex-col flex-1">
                  <div className="p-3 flex flex-col flex-1 gap-1">
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="text-[14px] md:text-base font-medium leading-tight line-clamp-2 text-foreground flex-1 hover:text-primary transition-colors">
                        {ad.title}
                      </h3>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          toggleFavorite(e, ad.id);
                        }}
                        className="p-1 rounded-full text-foreground/50 hover:text-red-500 transition-colors active:scale-90 z-20"
                      >
                        <Heart className={cn("h-5 w-5", favorites.has(ad.id) ? "fill-red-500 text-red-500" : "")} />
                      </button>
                    </div>

                    <div className="text-[15px] md:text-lg font-bold tracking-tight text-foreground">
                      {ad.price ? `${ad.price.toLocaleString()} ₽` : 'Договорная'}
                    </div>

                    <div className="text-[12px] md:text-[13px] text-muted-foreground flex items-center gap-1 mt-1 font-medium">
                      <MapPin className="h-3 w-3 opacity-60" />
                      <span className="line-clamp-1">{ad.city || 'Город'}</span>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-start md:justify-center px-1">
            <Link
              href="/search?sort=newest"
              className="flex items-center gap-2 px-6 py-2 bg-background border-2 border-primary/20 rounded-xl text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary hover:text-white transition-all shadow-lg shadow-primary/5 active:scale-95"
            >
              <span>Смотреть все</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        {/* App Download Section - Slim Version */}
        <section className="mb-12 px-1">
          <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-2xl p-4 md:p-6 text-white relative overflow-hidden shadow-xl shadow-green-900/5">
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-1">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center shrink-0">
                  <Smartphone className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h3 className="text-lg md:text-xl font-black tracking-tight">Установите Авоську+</h3>
                  <p className="text-green-50/70 text-[10px] md:text-xs font-semibold uppercase tracking-wider">Приложение для Android стало быстрее и удобнее</p>
                </div>
              </div>

              <a
                href="https://github.com/konkovev-cyber/avoska/releases/latest/download/avoska.apk"
                className="w-full md:w-auto inline-flex items-center justify-center gap-2 bg-white text-green-700 px-6 py-3 rounded-xl font-black text-sm shadow-lg shadow-black/10 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <span>Скачать .apk</span>
                <ChevronRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </section>

        {/* Recommendations Section */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-4 px-1">
            <h2 className="text-xl md:text-3xl font-black tracking-tight">Подборка для вас</h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 px-1">
            {loading ? (
              [1, 2, 3, 4, 5].map(i => (
                <div key={i} className="aspect-[3/4] bg-muted/20 rounded-xl animate-pulse" />
              ))
            ) : ads.slice(0, 5).map((ad) => (
              <div key={ad.id} className="group relative flex flex-col bg-card rounded-xl overflow-hidden shadow-md hover:shadow-xl border border-border/80 transition-all duration-300 active:scale-[0.98]">
                <div className="aspect-[4/3] relative overflow-hidden bg-secondary/10">
                  <HoverImageGallery
                    images={ad.images}
                    alt={ad.title}
                    href={`/ad?id=${ad.id}`}
                  />
                  {ad.condition === 'new' && (
                    <div className="absolute bottom-1 left-1 px-1 py-0.5 bg-green-500 text-white text-[7px] font-black uppercase rounded shadow-sm z-20 pointer-events-none">
                      Новое
                    </div>
                  )}
                </div>

                <Link href={`/ad?id=${ad.id}`} className="flex flex-col flex-1">
                  <div className="p-3 flex flex-col flex-1 gap-1">
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="text-[14px] md:text-base font-medium leading-tight line-clamp-2 text-foreground flex-1 hover:text-primary transition-colors">
                        {ad.title}
                      </h3>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          toggleFavorite(e, ad.id);
                        }}
                        className="p-1 rounded-full text-foreground/50 hover:text-red-500 transition-colors active:scale-90 z-20"
                      >
                        <Heart className={cn("h-5 w-5", favorites.has(ad.id) ? "fill-red-500 text-red-500" : "")} />
                      </button>
                    </div>

                    <div className="text-[15px] md:text-lg font-bold tracking-tight text-foreground">
                      {ad.price ? `${ad.price.toLocaleString()} ₽` : 'Договорная'}
                    </div>

                    <div className="text-[12px] md:text-[13px] text-muted-foreground flex items-center gap-1 mt-1 font-medium">
                      <MapPin className="h-3 w-3 opacity-60" />
                      <span className="line-clamp-1">{ad.city || 'Город'}</span>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-start md:justify-center px-1">
            <Link
              href="/search"
              className="flex items-center gap-2 px-6 py-2 bg-background border-2 border-primary/20 rounded-xl text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary hover:text-white transition-all shadow-lg shadow-primary/5 active:scale-95"
            >
              <span>Смотреть все</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
        {!loading && ads.length === 0 && (
          <div className="bg-surface p-10 md:p-20 rounded-2xl md:rounded-[4rem] border-2 md:border-4 border-dashed border-border/50 text-center shadow-inner mt-8">
            <div className="w-16 h-16 md:w-24 md:h-24 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <MapPin className="h-6 w-6 md:h-10 md:w-10 text-muted/40" />
            </div>
            <h3 className="text-xl md:text-3xl font-black mb-2 tracking-tight">В этом городе пока нет объявлений</h3>
            <p className="text-sm md:text-lg text-muted-foreground mb-6 md:mb-10 max-w-md mx-auto italic font-medium">Но мы уже ищем лучшие предложения для вас!</p>
            <Link href="/ads/create" className="inline-flex bg-primary text-white px-6 py-3 md:px-10 md:py-4 rounded-xl md:rounded-2xl font-black text-sm md:text-lg shadow-xl shadow-primary/20 hover:scale-105 transition-transform">
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
