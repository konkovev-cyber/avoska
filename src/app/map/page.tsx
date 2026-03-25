'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Ad } from '@/lib/types';
import Header from '@/components/layout/Header';
import { MapPin, Search, Filter, Loader2, X, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export default function GlobalMapPage() {
    const [ads, setAds] = useState<Ad[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [ymapsLoaded, setYmapsLoaded] = useState(false);
    const router = useRouter();

    useEffect(() => {
        fetchAds();
        checkYmaps();
    }, []);

    const checkYmaps = () => {
        const interval = setInterval(() => {
            if (window.ymaps) {
                window.ymaps.ready(() => {
                    setYmapsLoaded(true);
                    clearInterval(interval);
                });
            }
        }, 500);
        return () => clearInterval(interval);
    };

    const fetchAds = async () => {
        try {
            const { data, error } = await supabase
                .from('ads')
                .select('*, profiles!user_id(full_name, rating)')
                .eq('status', 'active')
                .not('latitude', 'is', null);

            if (error) throw error;
            setAds(data || []);
        } catch (err) {
            console.error('Error fetching ads for map:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!ymapsLoaded || ads.length === 0) return;

        const mapElement = document.getElementById('global-map');
        if (!mapElement) return;

        // Clear previous instances if any
        mapElement.innerHTML = '';

        const map = new window.ymaps.Map('global-map', {
            center: [44.5938, 39.1296], // Goryachy Klyuch default
            zoom: 12,
            controls: ['zoomControl', 'fullscreenControl', 'geolocationControl']
        });

        const objectManager = new window.ymaps.ObjectManager({
            clusterize: true,
            gridSize: 32,
            clusterDisableClickZoom: false
        });

        objectManager.clusters.options.set('preset', 'islands#greenClusterIcons');
        map.geoObjects.add(objectManager);

        const features = ads.map(ad => ({
            type: 'Feature',
            id: ad.id,
            geometry: {
                type: 'Point',
                coordinates: [ad.latitude, ad.longitude]
            },
            properties: {
                balloonContentHeader: `<div class="font-semibold text-sm">${ad.title}</div>`,
                balloonContentBody: `
                    <div class="flex gap-2 items-start p-1 min-w-[200px]">
                        <img src="${ad.images[0]}" class="w-16 h-16 rounded object-cover" />
                        <div>
                            <div class="font-semibold text-primary text-lg">${ad.price ? ad.price.toLocaleString() + ' ₽' : 'Договорная'}</div>
                            <div class="text-[10px] text-muted-foreground font-semibold uppercase">${ad.city}</div>
                            <button onclick="window.location.href='/ad?id=${ad.id}'" class="mt-2 w-full py-1 text-[10px] font-semibold bg-primary text-white rounded uppercase tracking-widest">Перейти</button>
                        </div>
                    </div>
                `,
                hintContent: ad.title
            },
            options: {
                preset: ad.is_vip ? 'islands#violetDotIcon' : 'islands#greenDotIcon'
            }
        }));

        objectManager.add({
            type: 'FeatureCollection',
            features: features
        });

        if (features.length > 0) {
            map.setBounds(objectManager.getBounds(), { checkZoomRange: true });
        }

        return () => map.destroy();
    }, [ymapsLoaded, ads]);

    return (
        <div className="flex flex-col h-screen bg-background overflow-hidden">
            {/* Minimal Header for Map */}
            <div className="h-16 px-4 flex items-center gap-3 border-b border-border bg-surface/80 backdrop-blur-md z-30">
                <button onClick={() => router.back()} className="p-2 hover:bg-background rounded-full transition-colors active:scale-95">
                    <ChevronLeft className="h-6 w-6" />
                </button>
                <div className="flex-1 relative group">
                    <input
                        type="text"
                        placeholder="Поиск по карте..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-10 pl-10 pr-4 bg-muted/20 border border-border/50 rounded-xl outline-none focus:border-primary/50 font-semibold text-sm transition-all"
                    />
                    <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                </div>
            </div>

            {/* Map Container */}
            <div className="flex-1 relative">
                {loading && (
                    <div className="absolute inset-0 z-20 bg-background/50 backdrop-blur-sm flex flex-col items-center justify-center">
                        <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
                        <span className="font-semibold text-xs uppercase tracking-widest text-muted-foreground">Загрузка объявлений...</span>
                    </div>
                )}

                <div id="global-map" className="w-full h-full" />

                {/* Stats overlay */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 bg-black/80 text-white px-4 py-2 rounded-full backdrop-blur-md border border-white/10 shadow-2xl flex items-center gap-3">
                    <div className="flex items-center gap-1.5 border-r border-white/20 pr-3">
                        <MapPin className="h-3.5 w-3.5 text-primary" />
                        <span className="text-[10px] font-semibold uppercase tracking-wider">{ads.length}</span>
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-widest opacity-60">Точек на карте</span>
                </div>
            </div>
        </div>
    );
}
