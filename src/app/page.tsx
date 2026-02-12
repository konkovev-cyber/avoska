'use client';

import { useEffect, useState, useRef } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import { getOptimizedImageUrl } from '@/lib/image-utils';
import { supabase } from '@/lib/supabase/client';
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
      const [bannersRes] = await Promise.all([
        supabase.from('banners').select('*').eq('is_active', true)
      ]);
      setBanners(bannersRes.data || []);
      await fetchAds(0, true);
    } catch (error) {
      console.error('Initial fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAds = async (pageNum: number, isInitial = false) => {
    try {
      const from = pageNum * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from('ads')
        .select('*, profiles!user_id(full_name, avatar_url, is_verified)')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

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
    <div className="max-w-[1400px] mx-auto px-4 py-4 md:py-8">
      <div className="w-full max-w-[1400px] mx-auto">
        <section className="mb-8">
          <h1 className="text-4xl font-black text-foreground mb-1">Все категории</h1>
          <p className="text-muted-foreground font-medium">Найдите то, что нужно именно вам</p>
        </section>

        <section className="mb-6">
          <div className="grid grid-cols-5 md:grid-cols-5 lg:grid-cols-10 gap-1.5">
            {CATEGORIES.slice(0, 10).map((cat) => (
              <Link
                key={cat.slug}
                href={`/category?slug=${cat.slug}`}
                className="relative aspect-square rounded-xl overflow-hidden group shadow-sm"
              >
                <img
                  src={cat.image}
                  alt={cat.name}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                <span className="absolute bottom-1 left-0.5 right-0.5 text-white text-[8px] md:text-[10px] font-black tracking-tight text-center leading-tight">
                  {cat.name}
                </span>
              </Link>
            ))}
          </div>

          <div className="mt-3 flex justify-center">
            <Link
              href="/categories"
              className="flex items-center gap-1.5 px-4 py-1.5 bg-surface border border-border rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-primary hover:text-white transition-all shadow-sm active:scale-95"
            >
              <span>Все категории</span>
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        </section>

        {banners.length > 0 && (
          <section className="mb-12 overflow-hidden rounded-3xl">
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-none">
              {banners.map(banner => (
                <a
                  key={banner.id}
                  href={banner.link_url || '#'}
                  className="shrink-0 w-full md:w-[700px] h-52 rounded-3xl overflow-hidden bg-primary/5 border border-border group"
                >
                  {banner.image_url && <img src={banner.image_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-all duration-700" />}
                </a>
              ))}
            </div>
          </section>
        )}

        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-black">Рекомендации для вас</h2>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-4">
            {[1, 2, 3, 4, 5, 6, 7].map(i => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-[3/4] w-full rounded-2xl" />
                <div className="space-y-2 px-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-5 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : ads.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-4">
            {ads.map((ad) => (
              <div key={ad.id} className="group relative flex flex-col h-full">
                <Link href={`/ad?id=${ad.id}`} className="flex flex-col h-full bg-surface rounded-2xl overflow-hidden hover:shadow-xl transition-all border border-border/50 hover:border-primary/30">
                  <div className="aspect-square bg-muted relative overflow-hidden">
                    {ad.images?.[0] ? (
                      <img
                        src={getOptimizedImageUrl(ad.images[0], { width: 400, quality: 75 })}
                        alt={ad.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] text-muted uppercase font-bold tracking-widest">Нет фото</div>
                    )}
                    <button
                      onClick={(e) => toggleFavorite(e, ad.id)}
                      className="absolute top-2 right-2 p-1.5 bg-white/90 backdrop-blur-md rounded-full transition-all shadow-md active:scale-90 z-10"
                    >
                      <Heart className={cn("h-4 w-4 transition-colors", favorites.has(ad.id) ? "fill-red-500 text-red-500" : "text-foreground/40")} />
                    </button>
                  </div>
                  <div className="p-3 flex flex-col flex-1">
                    <h3 className="text-[13px] font-bold text-foreground leading-[1.3] line-clamp-2 mb-1.5 group-hover:text-primary transition-colors h-9">
                      {ad.title}
                    </h3>
                    <div className="text-[17px] font-black text-foreground mb-1">
                      {ad.price ? `${ad.price.toLocaleString()} ₽` : 'Договорная'}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium">
                      <MapPin className="h-3 w-3" />
                      <span className="truncate">{ad.city}</span>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-surface p-12 rounded-[3rem] border border-dashed border-border text-center">
            <h3 className="text-2xl font-black mb-2">Здесь пока пусто</h3>
            <p className="text-muted mb-8 italic">Новые объявления появятся здесь совсем скоро!</p>
            <Link href="/ads/create" className="inline-flex bg-primary text-white px-8 py-3 rounded-xl font-black">
              Разместить бесплатно
            </Link>
          </div>
        )}

        <div ref={loadMoreRef} className="h-20 flex items-center justify-center mt-8">
          {loadingMore && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-4 w-full">
              {[1, 2, 3, 4, 5, 6, 7].map(i => (
                <div key={`more-${i}`} className="space-y-3 opacity-50">
                  <Skeleton className="aspect-[3/4] w-full rounded-2xl" />
                  <div className="space-y-2 px-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-5 w-1/2" />
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
