'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet + Next.js
const DefaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

interface MapPickerProps {
    initialPos?: [number, number];
    onChange: (pos: [number, number]) => void;
}

function LocationMarker({ pos, setPos, onChange }: { pos: [number, number], setPos: (p: [number, number]) => void, onChange: (p: [number, number]) => void }) {
    useMapEvents({
        click(e) {
            const newPos: [number, number] = [e.latlng.lat, e.latlng.lng];
            setPos(newPos);
            onChange(newPos);
        },
    });

    return <Marker position={pos} />;
}

export default function MapPicker({ initialPos = [44.6292, 39.1306], onChange }: MapPickerProps) {
    const [pos, setPos] = useState<[number, number]>(initialPos);

    return (
        <div className="h-[300px] w-full rounded-2xl overflow-hidden border border-border mt-4">
            <MapContainer
                center={pos}
                zoom={13}
                scrollWheelZoom={false}
                style={{ height: '100%', width: '100%' }}
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                <LocationMarker pos={pos} setPos={setPos} onChange={onChange} />
            </MapContainer>
        </div>
    );
}
