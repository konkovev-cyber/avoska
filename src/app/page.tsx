'use client';

import { useEffect, useState } from 'react';
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
  CheckCircle,
  Plus
} from 'lucide-react';

const CATEGORIES = [
  { name: 'Недвижимость', slug: 'real-estate', icon: HomeIcon, color: 'bg-blue-500' },
  { name: 'Транспорт', slug: 'transport', icon: Car, color: 'bg-green-500' },
  { name: 'Электроника', slug: 'electronics', icon: Smartphone, color: 'bg-purple-500' },
  { name: 'Одежда', slug: 'clothing', icon: Shirt, color: 'bg-orange-500' },
  { name: 'Хобби', slug: 'hobby', icon: Gamepad, color: 'bg-red-500' },
  { name: 'Для дома', slug: 'home', icon: Armchair, color: 'bg-teal-500' },
];

export default function HomePage() {
  const [ads, setAds] = useState<any[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [adsRes, bannersRes] = await Promise.all([
          supabase
            .from('ads')
            .select('*, profiles!user_id(full_name, avatar_url, is_verified)')
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(12),
          supabase
            .from('banners')
            .select('*')
            .eq('is_active', true)
        ]);

        setAds(adsRes.data || []);
        setBanners(bannersRes.data || []);
      } catch (error) {
        console.error('Home fetch error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <section className="bg-primary rounded-3xl p-8 mb-12 text-white flex flex-col items-center justify-center text-center shadow-lg relative overflow-hidden">
        <div className="z-10">
          <h1 className="text-4xl md:text-5xl font-black mb-4">Найди всё в Авоське+</h1>
          <p className="text-lg opacity-90 mb-8 max-w-2xl">
            Доска объявлений нового поколения. Бесплатно до 10 объявлений!
          </p>
          <Link href="/ads/create" className="bg-white text-primary px-8 py-4 rounded-full font-black flex items-center gap-2 hover:scale-105 transition-transform shadow-xl">
            <Plus className="h-5 w-5" /> Разместить объявление
          </Link>
        </div>
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-accent rounded-full opacity-20 blur-2xl"></div>
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white rounded-full opacity-10 blur-2xl"></div>
      </section>

      {/* Banners Section */}
      {banners.length > 0 && (
        <section className="mb-12">
          <div className="grid gap-6 md:grid-cols-2">
            {banners.map(banner => (
              <a
                key={banner.id}
                href={banner.link_url || '#'}
                className="group relative h-48 rounded-[2.5rem] overflow-hidden bg-gradient-to-br from-primary/10 to-accent/10 border border-border hover:shadow-lg transition-all"
              >
                {banner.image_url && <img src={banner.image_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:scale-105 transition-transform" />}
                <div className="relative p-8 h-full flex flex-col justify-center">
                  <h3 className="text-2xl font-black mb-2">{banner.title}</h3>
                  <p className="text-muted line-clamp-2 max-w-md">{banner.content}</p>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Categories Grid */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-black">Категории</h2>
          <Link href="/categories" className="text-primary font-bold flex items-center gap-1 hover:underline">
            Все <ChevronRight className="h-5 w-5" />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.slug}
              href={`/category?slug=${cat.slug}`}
              className="flex flex-col items-center p-6 bg-surface rounded-2xl border border-border hover:border-primary hover:shadow-md transition-all group"
            >
              <div className={`w-12 h-12 ${cat.color} rounded-xl flex items-center justify-center text-white mb-3 group-hover:scale-110 transition-transform shadow-sm`}>
                <cat.icon className="h-6 w-6" />
              </div>
              <span className="text-sm font-bold text-center">{cat.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Recent Ads Section */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-black">Свежие объявления</h2>
          <Link href="/ads" className="text-primary font-bold flex items-center gap-1 hover:underline">
            Смотреть всё <ChevronRight className="h-5 w-5" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 animate-pulse">
            {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="aspect-[3/4] bg-muted rounded-2xl" />)}
          </div>
        ) : ads.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {ads.map((ad) => (
              <Link
                key={ad.id}
                href={`/ad?id=${ad.id}`}
                className="bg-surface rounded-2xl border border-border overflow-hidden hover:shadow-xl transition-all flex flex-col h-full group"
              >
                <div className="aspect-square bg-muted relative overflow-hidden">
                  {ad.images?.[0] ? (
                    <img
                      src={ad.images[0]}
                      alt={ad.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted italic">Нет фото</div>
                  )}
                  {ad.delivery_possible && (
                    <div className="absolute top-2 left-2 bg-primary text-white text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider shadow-md">
                      Доставка
                    </div>
                  )}
                </div>
                <div className="p-3 flex flex-col flex-1">
                  <span className="text-lg font-black text-foreground mb-0.5">
                    {ad.price ? `${ad.price.toLocaleString()} ₽` : 'Договорная'}
                  </span>
                  <h3 className="line-clamp-2 text-xs font-bold mb-3 group-hover:text-primary transition-colors flex-1">
                    {ad.title}
                  </h3>
                  <div className="flex items-center justify-between mt-auto">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-muted uppercase">{ad.city}</span>
                      {ad.profiles?.is_verified && <CheckCircle className="h-2.5 w-2.5 text-blue-500 fill-current" />}
                    </div>
                    <span className="text-[9px] text-muted">{new Date(ad.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-surface p-12 rounded-[3rem] border border-dashed border-border text-center">
            <h3 className="text-2xl font-black mb-2">Здесь пока пусто</h3>
            <p className="text-muted mb-8 text-lg">Будьте первым, кто разместит здесь своё объявление!</p>
            <Link
              href="/ads/create"
              className="inline-flex items-center gap-3 bg-primary text-white px-10 py-5 rounded-full font-black hover:scale-105 transition-all shadow-2xl"
            >
              <Plus className="h-6 w-6" /> Разместить объявление
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
