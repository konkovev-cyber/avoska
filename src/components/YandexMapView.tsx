'use client';

import { useEffect, useRef, useState } from 'react';

declare global {
    interface Window {
        ymaps: any;
    }
}

interface YandexMapViewProps {
    pos: [number, number];
}

export default function YandexMapView({ pos }: YandexMapViewProps) {
    const mapRef = useRef<HTMLDivElement>(null);
    const [ymapsLoaded, setYmapsLoaded] = useState(false);
    const mapInstance = useRef<any>(null);

    useEffect(() => {
        const checkYmaps = setInterval(() => {
            if (window.ymaps) {
                window.ymaps.ready(() => {
                    setYmapsLoaded(true);
                    clearInterval(checkYmaps);
                });
            }
        }, 500);

        return () => clearInterval(checkYmaps);
    }, []);

    useEffect(() => {
        if (!ymapsLoaded || !mapRef.current || mapInstance.current) return;

        try {
            const map = new window.ymaps.Map(mapRef.current, {
                center: pos,
                zoom: 15,
                controls: []
            }, {
                autoFitToViewport: 'always'
            });

            mapInstance.current = map;

            const placemark = new window.ymaps.Placemark(pos, {}, {
                preset: 'islands#redDotIcon'
            });

            map.geoObjects.add(placemark);

            // Force size update
            setTimeout(() => {
                map.container.fitToViewport();
            }, 500);

        } catch (err) {
            console.error('Map view init error:', err);
        }

    }, [ymapsLoaded, pos]);

    return (
        <div
            ref={mapRef}
            className="w-full h-full rounded-2xl overflow-hidden shadow-inner bg-muted"
        />
    );
}
