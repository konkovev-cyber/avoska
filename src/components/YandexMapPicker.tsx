'use client';

import { useEffect, useRef, useState } from 'react';

declare global {
    interface Window {
        ymaps: any;
    }
}

interface YandexMapPickerProps {
    initialPos?: [number, number];
    onChange: (pos: [number, number]) => void;
}

export default function YandexMapPicker({ initialPos, onChange }: YandexMapPickerProps) {
    const mapRef = useRef<HTMLDivElement>(null);
    const [ymapsLoaded, setYmapsLoaded] = useState(false);
    const mapInstance = useRef<any>(null);
    const placemarkInstance = useRef<any>(null);

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

        const defaultPos = initialPos || [44.5938, 39.1296]; // Goryachy Klyuch

        mapInstance.current = new window.ymaps.Map(mapRef.current, {
            center: defaultPos,
            zoom: 14,
            controls: ['zoomControl', 'fullscreenControl']
        });

        placemarkInstance.current = new window.ymaps.Placemark(defaultPos, {}, {
            preset: 'islands#redDotIconWithCaption',
            draggable: true
        });

        mapInstance.current.geoObjects.add(placemarkInstance.current);

        placemarkInstance.current.events.add('dragend', () => {
            const coords = placemarkInstance.current.geometry.getCoordinates();
            onChange(coords);
        });

        mapInstance.current.events.add('click', (e: any) => {
            const coords = e.get('coords');
            placemarkInstance.current.geometry.setCoordinates(coords);
            onChange(coords);
        });

    }, [ymapsLoaded, initialPos, onChange]);

    return (
        <div
            ref={mapRef}
            className="w-full h-[300px] bg-muted animate-in fade-in duration-500 rounded-2xl overflow-hidden"
        />
    );
}
