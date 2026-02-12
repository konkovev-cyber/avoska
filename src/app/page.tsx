'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Home as HomeIcon,
  Car,
  Smartphone,
  Shirt,
  Gamepad,
  Armchair,
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  Plus,
  Info,
  Heart,
  Truck,
  Briefcase,
  Wrench,
  Settings,
  Baby,
  Sparkles,
  Dog
} from 'lucide-react';
import { cn } from '@/lib/utils';

const CATEGORIES = [
  { name: 'Транспорт', slug: 'transport', icon: Car, color: 'from-orange-400 to-red-500' },
  { name: 'Недвижимость', slug: 'real-estate', icon: HomeIcon, color: 'from-blue-400 to-blue-600' },
  { name: 'Работа', slug: 'jobs', icon: Briefcase, color: 'from-red-400 to-red-600' },
  { name: 'Услуги', slug: 'services', icon: Wrench, color: 'from-purple-400 to-purple-600' },
  { name: 'Электроника', slug: 'electronics', icon: Smartphone, color: 'from-green-400 to-green-600' },
  { name: 'Дом и дача', slug: 'home', icon: Armchair, color: 'from-yellow-400 to-orange-500' },
  { name: 'Одежда', slug: 'clothing', icon: Shirt, color: 'from-blue-300 to-blue-500' },
  { name: 'Запчасти', slug: 'parts', icon: Settings, color: 'from-gray-400 to-gray-600' },
  { name: 'Хобби', slug: 'hobby', icon: Gamepad, color: 'from-pink-400 to-rose-500' },
  { name: 'Животные', slug: 'pets', icon: Dog, color: 'from-yellow-300 to-yellow-500' },
  { name: 'Красота', slug: 'beauty', icon: Sparkles, color: 'from-pink-300 to-pink-500' },
  { name: 'Детское', slug: 'kids', icon: Baby, color: 'from-cyan-300 to-blue-400' },
];

export default function HomePage() {
  const [ads, setAds] = useState<any[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [adsRes, bannersRes, catsRes] = await Promise.all([
          supabase
            .from('ads')
            .select('*, profiles!user_id(full_name, avatar_url, is_verified)')
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(24),
          supabase
            .from('banners')
            .select('*')
            .eq('is_active', true),
          supabase.from('categories').select('*').order('name')
        ]);

        setAds(adsRes.data || []);
        setBanners(bannersRes.data || []);
        setCategories(catsRes.data || []);
      } catch (error) {
        console.error('Home fetch error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    fetchFavorites();
  }, []);

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



  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeftArrow(scrollLeft > 10);
      setShowRightArrow(scrollWidth > clientWidth && scrollLeft + clientWidth < scrollWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [categories]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 400;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-4 md:py-8">
      {/* Main Content Area */}
      <div className="w-full max-w-7xl mx-auto">
        {/* Categories Chips */}
        <section className="mb-8 relative overflow-hidden">
          <div className="flex items-center gap-2 overflow-x-auto pb-4 scrollbar-none snap-x">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <Link
                  key={cat.slug}
                  href={`/category?slug=${cat.slug}`}
                  className="flex flex-col items-center gap-1.5 shrink-0 snap-start group"
                >
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center transition-all group-active:scale-95 shadow-sm border border-border/50 bg-gradient-to-br",
                    cat.color || "from-gray-100 to-gray-200"
                  )}>
                    <Icon className="w-6 h-6 text-white drop-shadow-sm" />
                  </div>
                  <span className="text-[10px] font-bold text-foreground/70 text-center leading-[1.1] max-w-[64px] h-[2.2em] flex items-center justify-center group-hover:text-primary transition-colors">
                    {cat.name}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Banners Slider */}
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

        {/* Recommendations Header */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-black">Рекомендации для вас</h2>
        </div>

        {/* Ads Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-5 animate-pulse">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => <div key={i} className="aspect-[3/4] bg-muted rounded-2xl" />)}
          </div>
        ) : ads.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-5">
            {ads.map((ad) => (
              <div key={ad.id} className="group relative flex flex-col h-full">
                <Link href={`/ad?id=${ad.id}`} className="flex flex-col h-full bg-surface rounded-2xl overflow-hidden hover:shadow-xl transition-all border border-border/50 hover:border-primary/30">
                  <div className="aspect-square bg-muted relative overflow-hidden">
                    {ad.images?.[0] ? (
                      <img src={ad.images[0]} alt={ad.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
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
                    <div className="text-[17px] font-black text-foreground mb-2">
                      {ad.price ? `${ad.price.toLocaleString()} ₽` : 'Договорная'}
                    </div>
                    <div className="mt-auto space-y-1">
                      <div className="flex items-center gap-1 text-[11px] text-foreground/50 font-medium">
                        <span className="truncate">{ad.city}</span>
                        {ad.profiles?.is_verified && <CheckCircle className="h-3 w-3 text-blue-500 fill-current" />}
                      </div>
                      <div className="text-[11px] text-foreground/40 font-medium">
                        {new Date(ad.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                      </div>
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
      </div>
    </div>
  );
}
