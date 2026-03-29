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
  Smartphone
} from 'lucide-react';
import { recommendationService } from '@/lib/recommendations';
import { CATEGORIES, APK_DOWNLOAD_URL } from '@/lib/constants';
import { AdCard } from '@/components/ui/AdCard';
import { Ad, Banner } from '@/lib/types';
import { supabaseKeepalive } from '@/lib/supabase-keepalive';
import RotatingFeedBanners from '@/components/ui/RotatingFeedBanners';

const HoverImageGallery = dynamic(() => import('@/components/ui/HoverImageGallery'), {
  loading: () => <div className="bg-muted animate-pulse aspect-[4/3]" />
});

export default function HomePage() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [city, setCity] = useState<string | null>(null);
  const [personalCategory, setPersonalCategory] = useState<any>(null);
  const [isMobileApp, setIsMobileApp] = useState(false);
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
        supabase.from('banners').select('*').eq('is_active', true).order('created_at', { ascending: false }).limit(5),
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

      const topBanners = bannersEnabled ? fetchedBanners.filter(b => b.position === 'top' || !b.position) : [];
      const sidebarBanners = bannersEnabled ? fetchedBanners.filter(b => b.position === 'sidebar') : [];

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
    <div className="max-w-[1400px] mx-auto px-2 md:px-8 py-1 md:py-6 pb-20">
      <div className="w-full">

        <section className="mb-2 hidden md:block">
          <h1 className="text-xl md:text-5xl font-semibold text-foreground mb-0.5 tracking-tighter">Все категории</h1>
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
                <span className="text-[10px] md:text-xs font-semibold uppercase tracking-widest text-center line-clamp-1 opacity-70 group-hover:opacity-100 group-hover:text-primary transition-all">
                  {cat.name}
                </span>
              </Link>
            ))}
          </div>

          {/* Mobile Categories - Responsive Grid */}
          <div className="md:hidden grid grid-cols-4 gap-2 px-1">
            {CATEGORIES.slice(0, 8).map((cat) => (
              <Link
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
            <Link
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
            <Link
              href="/search?sort=newest"
              className="flex items-center gap-2 px-6 py-2 bg-background border-2 border-primary/20 rounded-xl text-[10px] font-semibold uppercase tracking-widest text-primary hover:bg-primary hover:text-white transition-all shadow-lg shadow-primary/5 active:scale-95"
            >
              <span>Смотреть все</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        <div className="my-8 space-y-6 px-1">
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
            <Link
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
