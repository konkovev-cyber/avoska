'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
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

interface MapViewProps {
    pos: [number, number];
    title?: string;
    address?: string;
}

export default function MapView({ pos, title, address }: MapViewProps) {
    return (
        <div className="h-[300px] w-full rounded-2xl overflow-hidden border border-border shadow-inner">
            <MapContainer
                center={pos}
                zoom={14}
                scrollWheelZoom={false}
                style={{ height: '100%', width: '100%' }}
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                <Marker position={pos}>
                    {title && (
                        <Popup>
                            <div className="font-bold">{title}</div>
                            {address && <div className="text-xs">{address}</div>}
                        </Popup>
                    )}
                </Marker>
            </MapContainer>
        </div>
    );
}
