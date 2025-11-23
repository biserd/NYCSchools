import { useEffect, useRef, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import L from "leaflet";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, MapPin, AlertCircle } from "lucide-react";
import { School, calculateOverallScore, getScoreColor } from "@shared/schema";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Sample coordinates for NYC districts (approximate centers)
// In production, these would come from geocoded school addresses
const SAMPLE_SCHOOLS_WITH_COORDS = [
  { dbn: "01M015", lat: 40.7589, lng: -73.9851 }, // District 1 - Lower East Side
  { dbn: "01M019", lat: 40.7178, lng: -73.9934 }, // District 1 - Lower Manhattan
  { dbn: "02M047", lat: 40.7282, lng: -73.9942 }, // District 2 - Greenwich Village
  { dbn: "02M111", lat: 40.7245, lng: -74.0027 }, // District 2 - West Village
  { dbn: "03M075", lat: 40.8055, lng: -73.9650 }, // District 3 - Upper West Side
  { dbn: "03M084", lat: 40.7870, lng: -73.9754 }, // District 3 - UWS
  { dbn: "06M012", lat: 40.7851, lng: -73.9492 }, // District 6 - Upper East Side
  { dbn: "06M158", lat: 40.7736, lng: -73.9566 }, // District 6 - UES
];

export default function MapPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const popupListenersRef = useRef<Map<string, () => void>>(new Map());
  const [selectedDistrict, setSelectedDistrict] = useState("all");
  const [, setLocation] = useLocation();

  const { data: allSchools } = useQuery<School[]>({
    queryKey: ["/api/schools"],
  });

  // Filter schools that we have sample coordinates for
  const schoolsWithCoords = useMemo(() => {
    if (!allSchools) return [];
    
    return allSchools
      .filter(school => SAMPLE_SCHOOLS_WITH_COORDS.some(s => s.dbn === school.dbn))
      .map(school => {
        const coords = SAMPLE_SCHOOLS_WITH_COORDS.find(s => s.dbn === school.dbn)!;
        return {
          ...school,
          lat: coords.lat,
          lng: coords.lng,
          overall_score: calculateOverallScore(school),
        };
      });
  }, [allSchools]);

  // Filter by district
  const filteredSchools = useMemo(() => {
    if (selectedDistrict === "all") return schoolsWithCoords;
    return schoolsWithCoords.filter(s => s.district === parseInt(selectedDistrict));
  }, [schoolsWithCoords, selectedDistrict]);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Initialize map centered on Manhattan
    const map = L.map(mapRef.current).setView([40.7589, -73.9851], 12);

    // Add OpenStreetMap tiles
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(map);

    mapInstanceRef.current = map;

    // Fix Leaflet default marker icon issue
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
      iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
      shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update markers when filtered schools change
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Clear existing markers and event listeners
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];
    
    // Clean up all popup event listeners
    popupListenersRef.current.forEach(cleanup => cleanup());
    popupListenersRef.current.clear();

    // Add markers for filtered schools
    filteredSchools.forEach(school => {
      const scoreColor = getScoreColor(school.overall_score);
      
      // Create custom colored marker
      const markerHtml = `
        <div style="
          background-color: ${scoreColor === 'green' ? '#22c55e' : scoreColor === 'yellow' ? '#eab308' : '#ef4444'};
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        "></div>
      `;

      const marker = L.marker([school.lat, school.lng], {
        icon: L.divIcon({
          className: 'custom-marker',
          html: markerHtml,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        }),
      });

      marker.bindPopup(`
        <div style="min-width: 200px;">
          <h3 style="margin: 0 0 8px 0; font-weight: 600; font-size: 14px;">${school.name}</h3>
          <p style="margin: 0; font-size: 12px; color: #666;">DBN: ${school.dbn}</p>
          <p style="margin: 4px 0; font-size: 12px; color: #666;">District ${school.district}</p>
          <p style="margin: 4px 0; font-size: 14px;">
            <strong>Overall Score:</strong> 
            <span style="color: ${scoreColor === 'green' ? '#22c55e' : scoreColor === 'yellow' ? '#eab308' : '#ef4444'};">
              ${school.overall_score}
            </span>
          </p>
          <p style="margin: 4px 0 8px 0; font-size: 12px;">
            ELA: ${school.ela_proficiency}% | Math: ${school.math_proficiency}%
          </p>
          <a 
            href="/school/${school.dbn}" 
            data-school-dbn="${school.dbn}"
            style="
              display: inline-block;
              padding: 6px 12px;
              background: #2563eb;
              color: white;
              text-decoration: none;
              border-radius: 4px;
              font-size: 12px;
              font-weight: 500;
              cursor: pointer;
            "
          >
            View Details
          </a>
        </div>
      `);

      // Setup popup event listeners with proper cleanup
      const handlePopupOpen = () => {
        const popupElement = marker.getPopup()?.getElement();
        const link = popupElement?.querySelector(`a[data-school-dbn="${school.dbn}"]`) as HTMLElement;
        
        if (link) {
          const handleClick = (e: Event) => {
            e.preventDefault();
            setLocation(`/school/${school.dbn}`);
          };
          
          link.addEventListener('click', handleClick);
          
          // Store cleanup function
          popupListenersRef.current.set(school.dbn, () => {
            link.removeEventListener('click', handleClick);
          });
        }
      };

      const handlePopupClose = () => {
        // Clean up listener when popup closes
        const cleanup = popupListenersRef.current.get(school.dbn);
        if (cleanup) {
          cleanup();
          popupListenersRef.current.delete(school.dbn);
        }
      };

      marker.on('popupopen', handlePopupOpen);
      marker.on('popupclose', handlePopupClose);

      marker.addTo(mapInstanceRef.current!);
      markersRef.current.push(marker);
    });

    // Fit map to show all markers if any exist
    if (filteredSchools.length > 0) {
      const bounds = L.latLngBounds(filteredSchools.map(s => [s.lat, s.lng]));
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
    }

    // Cleanup function for effect
    return () => {
      popupListenersRef.current.forEach(cleanup => cleanup());
      popupListenersRef.current.clear();
    };
  }, [filteredSchools, setLocation]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground" data-testid="link-home">
              <ArrowLeft className="w-4 h-4" />
              Back to Schools
            </Link>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                <h1 className="text-xl font-semibold" data-testid="text-map-title">School Map</h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-4">
        <Alert className="mb-4" data-testid="alert-demo-mode">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Demo Mode</AlertTitle>
          <AlertDescription>
            Showing {schoolsWithCoords.length} sample schools with coordinates. Full map will be available once all school addresses are geocoded.
            The map demonstrates how schools will be color-coded by overall score: 
            <span className="inline-flex items-center gap-1 ml-1">
              <span className="inline-block w-3 h-3 rounded-full bg-emerald-500"></span> Outstanding (80+),
              <span className="inline-block w-3 h-3 rounded-full bg-amber-500"></span> Strong (60-79),
              <span className="inline-block w-3 h-3 rounded-full bg-red-500"></span> Needs Improvement (&lt;60)
            </span>
          </AlertDescription>
        </Alert>

        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <label htmlFor="district-filter" className="text-sm font-medium whitespace-nowrap">
                Filter by District:
              </label>
              <Select value={selectedDistrict} onValueChange={setSelectedDistrict}>
                <SelectTrigger id="district-filter" className="w-48" data-testid="select-map-district">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Districts</SelectItem>
                  {Array.from({ length: 32 }, (_, i) => i + 1).map((d) => (
                    <SelectItem key={d} value={d.toString()}>
                      District {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-sm text-muted-foreground">
                Showing {filteredSchools.length} {filteredSchools.length === 1 ? 'school' : 'schools'}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex-1 container mx-auto px-4 pb-4">
        <div 
          ref={mapRef} 
          className="w-full h-[600px] rounded-lg border shadow-lg"
          data-testid="map-container"
        />
      </div>
    </div>
  );
}
