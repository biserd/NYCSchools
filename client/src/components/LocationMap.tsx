import { useEffect, useRef } from "react";
import L from "leaflet";

interface LocationMapProps {
  latitude: number;
  longitude: number;
  schoolName: string;
  address?: string;
}

export function LocationMap({ latitude, longitude, schoolName, address }: LocationMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
    }

    const map = L.map(mapRef.current, {
      scrollWheelZoom: false,
      zoomControl: true,
    }).setView([latitude, longitude], 15);

    mapInstanceRef.current = map;

    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    const markerIcon = L.divIcon({
      className: "location-marker",
      html: `
        <div style="
          background: #dc2626;
          color: white;
          border-radius: 50% 50% 50% 0;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          border: 2px solid white;
          transform: rotate(-45deg);
        ">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="transform: rotate(45deg);">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
      `,
      iconSize: [30, 30],
      iconAnchor: [15, 30],
      popupAnchor: [0, -30],
    });

    L.marker([latitude, longitude], { icon: markerIcon })
      .addTo(map)
      .bindPopup(`<strong>${schoolName}</strong>${address ? `<br/>${address}` : ''}`);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [latitude, longitude, schoolName, address]);

  return (
    <div
      ref={mapRef}
      className="h-48 rounded-lg"
      data-testid="map-location"
    />
  );
}
