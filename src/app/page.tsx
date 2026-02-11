'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
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

const CATEGORIES = [
  { name: 'Транспорт', slug: 'transport', icon: Car, color: 'from-orange-400 to-red-500' },
  { name: 'Недвижимость', slug: 'real-estate', icon: HomeIcon, color: 'from-blue-400 to-blue-600' },
  { name: 'Работа', slug: 'jobs', icon: Briefcase, color: 'from-red-400 to-red-600' },
  { name: 'Услуги', slug: 'services', icon: Wrench, color: 'from-purple-400 to-purple-600' },
  { name: 'Электроника', slug: 'electronics', icon: Smartphone, color: 'from-green-400 to-green-600' },
  { name: 'Дом и дача', slug: 'home', icon: Armchair, color: 'from-yellow-400 to-orange-500' },
  { name: 'Личные вещи', slug: 'clothing', icon: Shirt, color: 'from-blue-300 to-blue-500' },
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
  const [loading, setLoading] = useState(true);
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
  }, []);



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
    <div className="container mx-auto px-4 py-8">
      {/* Main Content Area */}
      <div className="w-full max-w-7xl mx-auto">
        {/* Categories Grid - Stories style with Arrows */}
        <section className="mb-12 relative group/section">
          <h2 className="text-xl font-black mb-6 flex items-center gap-2">
            Категории
          </h2>

          <div className="relative">
            {showLeftArrow && (
              <button
                onClick={() => scroll('left')}
                className="absolute left-[-25px] top-[46px] -translate-y-1/2 z-10 p-3 bg-white border border-border rounded-full shadow-lg hover:bg-muted transition-all hidden md:block"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            )}

            <div
              ref={scrollRef}
              onScroll={checkScroll}
              className="flex items-start gap-6 overflow-x-auto py-4 -my-4 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] md:justify-center md:flex-wrap lg:flex-nowrap lg:justify-start"
            >
              {categories.map((cat) => (
                <Link
                  key={cat.slug}
                  href={`/category?slug=${cat.slug}`}
                  className="flex flex-col items-center group gap-3 shrink-0 snap-start"
                >
                  <div className={`relative p-[3px] rounded-full bg-gradient-to-tr ${cat.color || 'from-orange-400 to-red-500'} group-hover:scale-110 transition-transform duration-300 shadow-md`}>
                    <div className="w-16 h-16 rounded-full border-4 border-white overflow-hidden bg-white flex items-center justify-center">
                      <img
                        src={cat.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(cat.name)}&background=f3f4f6&color=666&size=200`}
                        alt={cat.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(cat.name)}&background=f3f4f6&color=666&size=200`;
                        }}
                      />
                    </div>
                  </div>
                  <span className="text-[11px] font-black text-center leading-tight max-w-[72px] text-foreground/80 group-hover:text-primary transition-colors tracking-tight">{cat.name}</span>
                </Link>
              ))}
            </div>

            {showRightArrow && (
              <button
                onClick={() => scroll('right')}
                className="absolute right-[-25px] top-[46px] -translate-y-1/2 z-10 p-3 bg-white border border-border rounded-full shadow-lg hover:bg-muted transition-all hidden md:block"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            )}
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
                <Link href={`/ad?id=${ad.id}`} className="flex flex-col h-full bg-white rounded-2xl overflow-hidden hover:shadow-xl transition-all border border-transparent hover:border-border">
                  <div className="aspect-[4/3] relative overflow-hidden bg-muted">
                    {ad.images?.[0] ? (
                      <img
                        src={ad.images[0]}
                        alt={ad.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted italic text-xs">Нет фото</div>
                    )}
                    <button className="absolute top-2 right-2 p-2 bg-white/80 backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white text-muted hover:text-red-500">
                      <Heart className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="p-3 flex flex-col flex-1">
                    <h3 className="text-sm font-medium line-clamp-2 mb-1 group-hover:text-primary transition-colors h-10">
                      {ad.title}
                    </h3>
                    <div className="text-lg font-black text-foreground mb-2">
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
