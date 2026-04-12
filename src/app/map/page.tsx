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
    const [filteredAds, setFilteredAds] = useState<Ad[]>([]);
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
            setFilteredAds(data || []);
        } catch (err) {
            console.error('Error fetching ads for map:', err);
        } finally {
            setLoading(false);
        }
    };

    // Debounced search filtering
    useEffect(() => {
        const timer = setTimeout(() => {
            if (!searchQuery.trim()) {
                setFilteredAds(ads);
                return;
            }
            const query = searchQuery.toLowerCase();
            const filtered = ads.filter(ad =>
                ad.title.toLowerCase().includes(query) ||
                ad.city.toLowerCase().includes(query) ||
                ad.description?.toLowerCase().includes(query)
            );
            setFilteredAds(filtered);
        }, 500);

        return () => clearTimeout(timer);
    }, [searchQuery, ads]);

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

        const features = filteredAds.map(ad => ({
            type: 'Feature',
            id: ad.id,
            geometry: {
                type: 'Point',
                coordinates: [ad.latitude, ad.longitude]
            },
            properties: {
                balloonContentHeader: `
                    <div style="font-family: inherit; padding-bottom: 8px; border-bottom: 1px solid #eee; margin-bottom: 8px;">
                        <span style="font-size: 14px; font-weight: 700; color: #171717;">${ad.title}</span>
                    </div>
                `,
                balloonContentBody: `
                    <div style="font-family: inherit; min-width: 220px; display: flex; flex-direction: column; gap: 10px;">
                        <div style="position: relative; width: 100%; height: 120px; border-radius: 12px; overflow: hidden; background: #f5f5f5;">
                            <img src="${ad.images[0]}" style="width: 100%; height: 100%; object-fit: cover;" />
                            ${ad.is_vip ? '<div style="position: absolute; top: 8px; left: 8px; background: linear-gradient(to right, #9333ea, #4f46e5); color: white; padding: 2px 8px; border-radius: 6px; font-size: 10px; font-weight: 800;">VIP</div>' : ''}
                        </div>
                        <div>
                            <div style="font-size: 18px; font-weight: 800; color: #2E7D32;">${ad.price ? ad.price.toLocaleString() + ' ₽' : 'Договорная'}</div>
                            <div style="font-size: 11px; color: #737373; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 2px;">
                                <svg style="display:inline-block; vertical-align:middle; width:12px; height:12px; margin-right:4px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                                ${ad.city}
                            </div>
                        </div>
                        <button 
                            onclick="window.open('/ad?id=${ad.id}', '_self')" 
                            style="width: 100%; padding: 10px; background: #2E7D32; color: white; border: none; border-radius: 12px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; cursor: pointer; transition: opacity 0.2s;"
                            onmouseover="this.style.opacity='0.9'"
                            onmouseout="this.style.opacity='1'"
                        >
                            Открыть карту товара
                        </button>
                    </div>
                `,
                hintContent: ad.title
            },
            options: {
                preset: ad.is_vip ? 'islands#violetDotIcon' : 'islands#greenDotIcon',
                hideIconOnBalloonOpen: false
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
    }, [ymapsLoaded, filteredAds]);

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
                        <span className="text-[10px] font-semibold uppercase tracking-wider">{filteredAds.length}</span>
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-widest opacity-60">Точек на карте</span>
                </div>
            </div>
        </div>
    );
}
