'use client';

import { useEffect, useState, useRef } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import { supabase } from '@/lib/supabase/client';
import { getStoredCity, initCity } from '@/lib/geo';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  ChevronRight,
  MapPin,
  Smartphone,
  Megaphone,
  Search
} from 'lucide-react';
import { recommendationService } from '@/lib/recommendations';
import { CATEGORIES, APK_DOWNLOAD_URL } from '@/lib/constants';
import { AdCard } from '@/components/ui/AdCard';
import { Ad, Banner } from '@/lib/types';
import { supabaseKeepalive } from '@/lib/supabase-keepalive';
import RotatingFeedBanners from '@/components/ui/RotatingFeedBanners';
import { cn } from '@/lib/utils';

const HoverImageGallery = dynamic(() => import('@/components/ui/HoverImageGallery'), {
  loading: () => <div className="bg-muted animate-pulse aspect-[4/3]" />
});

export default function HomePage() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [popularAds, setPopularAds] = useState<Ad[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [city, setCity] = useState<string | null>(null);
  const [personalCategory, setPersonalCategory] = useState<any>(null);
  const [isMobileApp, setIsMobileApp] = useState(false);
  const [totalStats, setTotalStats] = useState({ users: 0, ads: 0 });
  const PAGE_SIZE = 14;

  const router = useRouter();
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Разогрев базы данных
    supabaseKeepalive();

    fetchInitialData();
    fetchFavorites();
    const isCapacitor = typeof window !== 'undefined' && (window as any).Capacitor !== undefined;
    setIsMobileApp(isCapacitor);
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const currentCity = await initCity();
      setCity(currentCity);

      const [bannersRes, settingsRes] = await Promise.all([
        supabase.from('banners').select('*').eq('is_active', true).order('created_at', { ascending: false }).limit(20),
        supabase.from('app_settings').select('*').eq('key', 'banners_enabled').single()
      ]);

      const bannersEnabled = settingsRes.data?.value === 'true';
      let fetchedBanners: Banner[] = bannersRes.data || [];

      if (bannersEnabled && fetchedBanners.length > 0) {
        fetchedBanners = fetchedBanners.sort(() => Math.random() - 0.5).slice(0, 4);

        fetchedBanners.forEach(banner => {
          supabase.rpc('increment_banner_impression', { banner_id: banner.id }).then(({ error }) => {
            if (error) {
              supabase.from('banners').update({ impressions_count: (banner.impressions_count || 0) + 1 }).eq('id', banner.id);
            }
          });
        });
      }
      setBanners(bannersEnabled ? fetchedBanners : []);

      // Fetch global stats
      const [usersCount, adsCount] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('ads').select('*', { count: 'exact', head: true }).eq('status', 'active')
      ]);
      setTotalStats({
        users: usersCount.count || 0,
        ads: adsCount.count || 0
      });

      const topBanners = (settingsRes.data?.value === 'false') ? [] : fetchedBanners.filter(b => b.position === 'top' || !b.position);
      const sidebarBanners = fetchedBanners.filter(b => b.position === 'sidebar');

      setBanners(fetchedBanners); // Keep all for state if needed, but we'll use filters in render

      const lastCatId = recommendationService.getLastCategory();
      let pCat = null;
      if (lastCatId) {
        const { data: catData } = await supabase.from('categories').select('*').eq('id', lastCatId).single();
        if (catData) {
          setPersonalCategory(catData);
          pCat = catData.id;
        }
      }

      await Promise.all([
        fetchAds(0, true, currentCity, pCat),
        fetchPopularAds(currentCity)
      ]);
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

      let q = supabase
        .from('ads')
        .select('*, profiles!user_id(full_name, avatar_url, is_verified, rating)')
        .eq('status', 'active');

      if (currentCity && currentCity !== 'Все города') {
        q = q.eq('city', currentCity);
      }

      const activeCategoryId = categoryIdOverride || personalCategory?.id;
      if (activeCategoryId) {
        q = q.eq('category_id', activeCategoryId);
      }

      const { data, error } = await q
        .order('is_vip', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      if (isInitial && (!data || data.length === 0) && currentCity && currentCity !== 'Все города') {
        await fetchAds(0, true, 'Все города');
        return;
      }

      const typedData = (data || []) as Ad[];
      if (isInitial) {
        setAds(typedData);
      } else {
        setAds(prev => [...prev, ...typedData]);
      }

      setHasMore(typedData.length === PAGE_SIZE);
    } catch (error) {
      console.error('Fetch ads error:', error);
    }
  };

  const fetchPopularAds = async (cityContext?: string | null) => {
    try {
      let q = supabase
        .from('ads')
        .select('*, profiles!user_id(full_name, avatar_url, is_verified, rating)')
        .eq('status', 'active')
        .gt('views_count', 0)
        .order('views_count', { ascending: false })
        .limit(6);

      if (cityContext && cityContext !== 'Все города') {
        q = q.eq('city', cityContext);
      }

      const { data } = await q;
      if (data) setPopularAds(data as Ad[]);
    } catch (error) {
      console.error('Fetch popular ads error:', error);
    }
  };

  useEffect(() => {
    if (!loading && !loadingMore) {
      const y = sessionStorage.getItem('home_scrollY');
      const restore = sessionStorage.getItem('home_restore');
      if (restore && y) {
        window.scrollTo(0, parseInt(y, 10));
        sessionStorage.removeItem('home_restore');
        // Small delay to ensure everything is rendered
        setTimeout(() => {
          window.scrollTo(0, parseInt(y, 10));
          const style = document.getElementById('scroll-restore-style');
          if (style) style.remove();
        }, 100);
      }
    }
  }, [loading, loadingMore]);

  useEffect(() => {
    if (!hasMore || loading || loadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
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

  const topBanners = banners.filter(b => b.is_active && (b.position === 'top' || !b.position));
  const sidebarBanners = banners.filter(b => b.is_active && b.position === 'sidebar');

  return (
    <div className="max-w-[1400px] mx-auto px-2 md:px-8 py-1 md:py-6 pb-20 space-y-8">
      <div className="w-full">
        {/* Search Hero - Avito/Avirona Style */}
        <section className="relative mb-8 mt-2 md:mt-0">
          <div className="bg-gradient-to-br from-primary/10 via-background to-emerald-500/5 p-4 md:p-8 rounded-[2.5rem] border border-primary/10 shadow-xl shadow-primary/5 overflow-hidden">
            <div className="relative z-10 max-w-2xl mx-auto text-center space-y-4">
              <h1 className="text-2xl md:text-4xl font-black tracking-tight text-foreground leading-tight">
                Найдите всё, <span className="text-primary italic">даже мечту</span>
              </h1>
              <div className="relative group max-w-xl mx-auto">
                <div className="absolute inset-0 bg-primary/20 blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
                <div className="relative bg-white border-2 border-primary/20 focus-within:border-primary h-12 md:h-14 rounded-2xl flex items-center pl-4 md:pl-6 pr-0 shadow-lg transition-all overflow-hidden group/search">
                  <Search className="h-4 w-4 text-muted-foreground mr-3 shrink-0" />
                  <input
                    type="text"
                    placeholder="Поиск по объявлениям..."
                    className="flex-1 bg-transparent border-none outline-none font-bold text-sm md:text-base mr-2"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') router.push(`/search?q=${(e.target as HTMLInputElement).value}`);
                    }}
                  />
                  <button className="bg-primary text-white px-6 md:px-10 h-full font-black hover:bg-primary/90 active:scale-[0.98] transition-all text-xs md:text-sm uppercase tracking-tighter hidden sm:block border-l border-primary/10">
                    Найти
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap justify-center gap-2 md:gap-3 text-[10px] md:text-xs">
                <span className="text-muted-foreground font-black uppercase tracking-widest mr-1 opacity-40">Часто ищут:</span>
                {['iPhone 15', 'Квартира', 'Работа', 'Автомобиль'].map(tag => (
                  <Link key={tag} href={`/search?q=${tag}`} className="bg-surface border border-border px-3 py-1 rounded-full font-bold hover:bg-primary/5 hover:text-primary transition-colors">
                    {tag}
                  </Link>
                ))}
              </div>
            </div>

            {/* Abstract Background Elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[100px] -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 blur-[100px] translate-y-1/2 -translate-x-1/2" />
          </div>
        </section>

        <section className="mb-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 px-1">
            <div className="space-y-1">
              <h2 className="text-xl md:text-3xl font-black text-foreground tracking-tight uppercase tracking-[0.05em]">Категории</h2>
              <div className="h-1.5 w-12 bg-primary rounded-full" />
            </div>
            <div className="flex gap-2">
              <div className="hidden lg:flex items-center gap-1.5 bg-primary/5 px-4 py-2 rounded-2xl border border-primary/10">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-black uppercase text-primary tracking-widest">Live: {totalStats.ads} активных объявлений</span>
              </div>
            </div>
          </div>

          {/* Desktop Categories Grid */}
          <div className="hidden md:grid grid-cols-4 lg:grid-cols-10 gap-2 md:gap-4">
            {CATEGORIES.slice(0, 10).map((cat) => (
              <Link prefetch={false}
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
                <span className="text-[10px] md:text-xs font-semibold uppercase tracking-widest text-center line-clamp-1 opacity-70 group-hover:opacity-100 group-hover:text-primary transition-all">
                  {cat.name}
                </span>
              </Link>
            ))}
          </div>

          {/* Mobile Categories - Responsive Grid */}
          <div className="md:hidden grid grid-cols-4 gap-2 px-1">
            {CATEGORIES.slice(0, 8).map((cat) => (
              <Link prefetch={false}
                key={cat.slug}
                href={`/category?slug=${cat.slug}`}
                className="flex flex-col gap-1 items-center"
              >
                <div className="aspect-square w-full bg-surface border border-border rounded-xl overflow-hidden shadow-sm active:scale-95 transition-transform flex items-center justify-center">
                  <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" />
                </div>
                <div className="h-[2.5em] flex items-center justify-center">
                  <span className="text-[10px] font-semibold text-center leading-tight line-clamp-2">{cat.name}</span>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-4 flex justify-start md:justify-center px-1">
            <Link prefetch={false}
              href="/categories"
              className="flex items-center gap-2 px-6 py-2 bg-background border-2 border-primary/20 rounded-xl text-[10px] font-semibold uppercase tracking-widest text-primary hover:bg-primary hover:text-white transition-all shadow-lg shadow-primary/5 active:scale-95"
            >
              <span>Показать все категории</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        {/* Fresh Ads Section */}
        <section className="mb-4">
          <div className="flex items-center justify-between mb-2 px-1">
            <h2 className="text-xl md:text-2xl font-bold tracking-tight">Новое</h2>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 px-1">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="bg-surface rounded-2xl overflow-hidden shadow-sm border border-border/40 h-72 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 px-1">
              {ads.slice(0, 6).map((ad) => (
                <AdCard key={ad.id} ad={ad} isHoverGallery={true} initialFavorite={favorites.has(ad.id)} />
              ))}
            </div>
          )}

          <div className="mt-2 flex justify-start md:justify-center px-1">
            <Link prefetch={false}
              href="/search?sort=newest"
              className="flex items-center gap-2 px-6 py-2 bg-background border-2 border-primary/20 rounded-xl text-[10px] font-semibold uppercase tracking-widest text-primary hover:bg-primary hover:text-white transition-all shadow-lg shadow-primary/5 active:scale-95"
            >
              <span>Смотреть все</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        {/* Popular Ads Section */}
        <section className="mb-4">
          <div className="flex items-center justify-between mb-2 px-1">
            <h2 className="text-xl md:text-2xl font-bold tracking-tight">Популярное</h2>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 px-1">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="bg-surface rounded-2xl overflow-hidden shadow-sm border border-border/40 h-72 animate-pulse" />
              ))}
            </div>
          ) : popularAds.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 px-1">
              {popularAds.map((ad) => (
                <AdCard key={ad.id} ad={ad} isHoverGallery={true} initialFavorite={favorites.has(ad.id)} showViews={true} />
              ))}
            </div>
          ) : (
            <div className="bg-surface p-8 rounded-2xl border-2 border-dashed border-border/50 text-center mx-1">
              <p className="text-muted-foreground text-sm">Здесь появятся самые просматриваемые объявления</p>
            </div>
          )}
        </section>

        <div className="my-8 space-y-8 px-1">
          <RotatingFeedBanners topBanners={topBanners} isMobileApp={isMobileApp} />

        </div>

        {/* Recommendations Section */}
        <section className="mb-4">
          <div className="flex items-center justify-between mb-2 px-1">
            <h2 className="text-xl md:text-2xl font-bold tracking-tight">Подборка для вас</h2>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 px-1">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="bg-surface rounded-2xl overflow-hidden shadow-sm border border-border/40 h-72 animate-pulse" />
              ))}
            </div>
          ) : ads.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 px-1">
              {ads.slice(0, 12).map((ad) => (
                <AdCard key={ad.id} ad={ad} isHoverGallery={true} initialFavorite={favorites.has(ad.id)} />
              ))}
            </div>
          ) : (
            <div className="bg-surface p-10 rounded-2xl border-2 border-dashed border-border/50 text-center">
              <p className="text-muted-foreground">Объявлений пока нет</p>
            </div>
          )}
          <div className="mt-2 flex justify-start md:justify-center px-1">
            <Link prefetch={false}
              href="/search"
              className="flex items-center gap-2 px-6 py-2 bg-background border-2 border-primary/20 rounded-xl text-[10px] font-semibold uppercase tracking-widest text-primary hover:bg-primary hover:text-white transition-all shadow-lg shadow-primary/5 active:scale-95"
            >
              <span>Смотреть все</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
        <div ref={loadMoreRef} className="h-20" />
      </div>
    </div>
  );
}
