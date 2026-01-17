import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import L from "leaflet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin } from "lucide-react";

interface SchoolZoneData {
  dbn: string;
  schoolName: string | null;
  gradeLevel: string;
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
  otherSchools?: {
    dbn: string;
    name: string;
    latitude: number;
    longitude: number;
    overall_score?: number;
    grade_band?: string;
  }[];
}

interface SchoolZoneMapProps {
  schoolDbn: string;
  schoolName: string;
  latitude: number | null;
  longitude: number | null;
}

export function SchoolZoneMap({ schoolDbn, schoolName, latitude, longitude }: SchoolZoneMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  const { data: zoneData, isLoading } = useQuery<SchoolZoneData | null>({
    queryKey: ["/api/schools", schoolDbn, "zone"],
  });

  useEffect(() => {
    if (!mapRef.current) return;
    if (!latitude || !longitude) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
    }

    const map = L.map(mapRef.current, {
      scrollWheelZoom: false,
      zoomControl: true,
    }).setView([latitude, longitude], 14);

    mapInstanceRef.current = map;

    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    const createMarkerIcon = (color: string, isMain: boolean = false) => L.divIcon({
      className: "school-marker",
      html: `
        <div style="
          background: ${color};
          color: white;
          border-radius: 50%;
          width: ${isMain ? '32px' : '24px'};
          height: ${isMain ? '32px' : '24px'};
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          border: 2px solid white;
          z-index: ${isMain ? 1000 : 500};
        ">
          <svg xmlns="http://www.w3.org/2000/svg" width="${isMain ? '18' : '14'}" height="${isMain ? '18' : '14'}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
            <path d="M6 12v5c3 3 9 3 12 0v-5"/>
          </svg>
        </div>
      `,
      iconSize: [isMain ? 32 : 24, isMain ? 32 : 24],
      iconAnchor: [isMain ? 16 : 12, isMain ? 16 : 12],
      popupAnchor: [0, isMain ? -16 : -12],
    });

    // Add main school marker
    L.marker([latitude, longitude], { icon: createMarkerIcon("#2563eb", true) })
      .addTo(map)
      .bindPopup(`<strong>${schoolName}</strong> (Current)<br/>${schoolDbn}`);

    // Add other schools in the same zone
    if (zoneData?.otherSchools) {
      zoneData.otherSchools.forEach(other => {
        const marker = L.marker([other.latitude, other.longitude], { icon: createMarkerIcon("#64748b") })
          .addTo(map)
          .bindPopup(`
            <div class="p-1">
              <strong class="block text-sm mb-1">${other.name}</strong>
              <div class="text-xs text-muted-foreground mb-2">
                ${other.dbn} • Grades: ${other.grade_band || 'N/A'}
              </div>
              <a 
                href="/school/${other.dbn}" 
                class="inline-flex items-center justify-center rounded-md text-xs font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-white text-primary border border-input hover:bg-accent hover:text-accent-foreground h-7 px-3 w-full"
                onclick="window.location.href='/school/${other.dbn}'; return false;"
              >
                View School Profile
              </a>
            </div>
          `);
      });
    }

    if (zoneData?.geometry) {
      const zoneLayer = L.geoJSON(
        {
          type: "Feature",
          properties: { name: schoolName, dbn: schoolDbn },
          geometry: zoneData.geometry,
        } as GeoJSON.Feature,
        {
          style: {
            color: "#2563eb",
            weight: 2,
            opacity: 0.8,
            fillColor: "#3b82f6",
            fillOpacity: 0.15,
          },
        }
      ).addTo(map);

      map.fitBounds(zoneLayer.getBounds(), { padding: [30, 30] });
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [latitude, longitude, zoneData, schoolName, schoolDbn]);

  if (!latitude || !longitude) {
    return null;
  }

  if (isLoading) {
    return (
      <Card data-testid="card-school-zone-map">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MapPin className="w-5 h-5" />
            {schoolName} location and zone boundary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 rounded-lg bg-muted animate-pulse flex items-center justify-center">
            <span className="text-muted-foreground">Loading map...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="card-school-zone-map">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <MapPin className="w-5 h-5" />
          {schoolName} location and zone boundary
        </CardTitle>
        {zoneData && (
          <p className="text-sm text-muted-foreground">
            The highlighted area shows this school's official catchment zone for {zoneData.gradeLevel === "elementary" ? "elementary" : zoneData.gradeLevel === "middle" ? "middle school" : "high school"} enrollment.
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div
          ref={mapRef}
          className="h-64 rounded-lg border"
          data-testid="map-school-zone"
        />
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="w-2.5 h-2.5 rounded-full bg-[#2563eb] border border-white shadow-sm" />
            <span>Current School</span>
          </div>
          {zoneData?.otherSchools && zoneData.otherSchools.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="w-2.5 h-2.5 rounded-full bg-[#64748b] border border-white shadow-sm" />
              <span>Other schools in this zone</span>
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {zoneData 
            ? "Zone boundaries from NYC Department of Education. Verify with DOE for official enrollment eligibility."
            : "School location shown. This school may not have geographic zone restrictions."}
        </p>
      </CardContent>
    </Card>
  );
}
