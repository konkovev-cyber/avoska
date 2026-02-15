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

        mapInstance.current = new window.ymaps.Map(mapRef.current, {
            center: pos,
            zoom: 15,
            controls: []
        });

        const placemark = new window.ymaps.Placemark(pos, {}, {
            preset: 'islands#redDotIcon'
        });

        mapInstance.current.geoObjects.add(placemark);

    }, [ymapsLoaded, pos]);

    return (
        <div
            ref={mapRef}
            className="w-full h-full rounded-2xl overflow-hidden shadow-inner bg-muted"
        />
    );
}
