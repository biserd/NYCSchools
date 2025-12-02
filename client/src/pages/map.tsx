import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import L from "leaflet";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Footer } from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { AppHeader } from "@/components/AppHeader";
import { MapPin, Filter, ChevronDown, ChevronUp, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { School, calculateOverallScore, getScoreColor, getSchoolSlug } from "@shared/schema";

const GRADE_BAND_OPTIONS = [
  { value: "all", label: "All Grade Levels" },
  { value: "prek", label: "Pre-K Programs" },
  { value: "3k", label: "3-K Programs" },
  { value: "elementary", label: "Elementary (K-5)" },
  { value: "middle", label: "Middle School (6-8)" },
  { value: "k8", label: "K-8 Schools" },
  { value: "highschool", label: "High School (9-12)" },
];

const GT_OPTIONS = [
  { value: "all", label: "All Schools" },
  { value: "gt", label: "Has G&T" },
  { value: "citywide", label: "Citywide G&T" },
  { value: "district", label: "District G&T" },
];

const DUAL_LANGUAGE_OPTIONS = [
  { value: "all", label: "All Schools" },
  { value: "dl", label: "Has Dual Language" },
  { value: "spanish", label: "Spanish" },
  { value: "chinese", label: "Chinese" },
  { value: "french", label: "French" },
  { value: "other", label: "Other Languages" },
];

const IEP_OPTIONS = [
  { value: "all", label: "All Schools" },
  { value: "low", label: "Low IEP (<15%)" },
  { value: "medium", label: "Medium IEP (15-25%)" },
  { value: "high", label: "High IEP (>25%)" },
];

export default function MapPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const popupListenersRef = useRef<Map<string, () => void>>(new Map());
  const [filtersOpen, setFiltersOpen] = useState(false);
  
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  
  // Parse URL parameters
  const urlParams = useMemo(() => new URLSearchParams(searchString), [searchString]);
  
  // Initialize state from URL parameters
  // If zip is provided without district, default to "all" to show all schools in that zip
  // Otherwise, default to District 2
  const [selectedDistrict, setSelectedDistrict] = useState(() => {
    const district = urlParams.get("district");
    const zip = urlParams.get("zip");
    if (district) return district;
    if (zip && zip.length === 5) return "all"; // Zip provided but no district = show all districts
    return "2"; // Default to District 2
  });
  const [selectedType, setSelectedType] = useState(() => urlParams.get("type") || "all");
  const [selectedGT, setSelectedGT] = useState(() => urlParams.get("gt") || "all");
  const [selectedDL, setSelectedDL] = useState(() => urlParams.get("dl") || "all");
  const [selectedIEP, setSelectedIEP] = useState(() => urlParams.get("iep") || "all");
  const [selectedZipCode, setSelectedZipCode] = useState(() => urlParams.get("zip") || "");
  
  // Track if we're currently updating the URL programmatically
  const isUpdatingURL = useRef(false);
  const lastUrlParams = useRef(searchString);

  // Sync state FROM URL when URL changes externally (navigation, back/forward, link clicks)
  useEffect(() => {
    // Skip if this URL change was caused by our own updateURL call
    if (isUpdatingURL.current) {
      isUpdatingURL.current = false;
      lastUrlParams.current = searchString;
      return;
    }
    
    // Skip if URL hasn't actually changed
    if (lastUrlParams.current === searchString) return;
    lastUrlParams.current = searchString;
    
    // Parse new URL params and update state
    const newParams = new URLSearchParams(searchString);
    const district = newParams.get("district");
    const type = newParams.get("type");
    const gt = newParams.get("gt");
    const dl = newParams.get("dl");
    const iep = newParams.get("iep");
    const zip = newParams.get("zip");
    
    // Set district: explicit district > infer from zip > default
    if (district) {
      setSelectedDistrict(district);
    } else if (zip && zip.length === 5) {
      setSelectedDistrict("all");
    } else {
      setSelectedDistrict("2");
    }
    
    setSelectedType(type || "all");
    setSelectedGT(gt || "all");
    setSelectedDL(dl || "all");
    setSelectedIEP(iep || "all");
    setSelectedZipCode(zip || "");
  }, [searchString]);

  // Update URL when filters change
  const updateURL = useCallback((params: Record<string, string>) => {
    const newParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      // Don't add default values to URL
      const isDefault = 
        (key === "district" && (value === "2" || value === "all")) ||
        (key !== "district" && key !== "zip" && value === "all") ||
        (key === "zip" && !value);
      
      if (!isDefault && value) {
        newParams.set(key, value);
      }
    });
    
    const queryString = newParams.toString();
    const newPath = queryString ? `/map?${queryString}` : "/map";
    
    // Mark that we're updating URL programmatically (to avoid loop with URL sync effect)
    isUpdatingURL.current = true;
    
    // Use replaceState to update URL without navigation
    window.history.replaceState(null, "", newPath);
  }, []);

  // Sync state changes to URL
  useEffect(() => {
    updateURL({
      district: selectedDistrict,
      type: selectedType,
      gt: selectedGT,
      dl: selectedDL,
      iep: selectedIEP,
      zip: selectedZipCode,
    });
  }, [selectedDistrict, selectedType, selectedGT, selectedDL, selectedIEP, selectedZipCode, updateURL]);

  const { data: allSchools } = useQuery<School[]>({
    queryKey: ["/api/schools"],
  });

  // Filter schools that have geocoded coordinates
  const schoolsWithCoords = useMemo(() => {
    if (!allSchools) return [];
    
    return allSchools
      .filter(school => school.latitude !== null && school.longitude !== null)
      .map(school => ({
        ...school,
        lat: school.latitude!,
        lng: school.longitude!,
        overall_score: calculateOverallScore(school),
      }));
  }, [allSchools]);

  // Apply all filters
  const filteredSchools = useMemo(() => {
    let result = schoolsWithCoords;
    
    // District filter
    if (selectedDistrict !== "all") {
      result = result.filter(s => s.district === parseInt(selectedDistrict));
    }
    
    // Grade band filter
    if (selectedType !== "all") {
      result = result.filter(school => {
        const gradeBand = school.grade_band?.toLowerCase() || "";
        switch (selectedType) {
          case "prek":
            return school.has_prek || gradeBand.includes("pk") || gradeBand.includes("pre-k");
          case "3k":
            return school.has_3k || gradeBand.includes("3k") || gradeBand.includes("3-k");
          case "elementary":
            return gradeBand.includes("k") && (gradeBand.includes("5") || gradeBand.includes("4") || gradeBand.includes("3"));
          case "middle":
            return gradeBand.includes("6") && gradeBand.includes("8");
          case "k8":
            return gradeBand.includes("k") && gradeBand.includes("8");
          case "highschool":
            return gradeBand.includes("9") || gradeBand.includes("10") || gradeBand.includes("11") || gradeBand.includes("12");
          default:
            return true;
        }
      });
    }
    
    // G&T filter
    if (selectedGT !== "all") {
      result = result.filter(school => {
        switch (selectedGT) {
          case "gt":
            return school.has_gifted_talented;
          case "citywide":
            return school.gt_program_type?.toLowerCase() === "citywide";
          case "district":
            return school.gt_program_type?.toLowerCase() === "district";
          default:
            return true;
        }
      });
    }
    
    // Dual Language filter
    if (selectedDL !== "all") {
      result = result.filter(school => {
        const languages = school.dual_language_languages?.map(l => l.toLowerCase()) || [];
        const langString = languages.join(" ");
        switch (selectedDL) {
          case "dl":
            return school.has_dual_language;
          case "spanish":
            return langString.includes("spanish");
          case "chinese":
            return langString.includes("chinese") || langString.includes("mandarin") || langString.includes("cantonese");
          case "french":
            return langString.includes("french");
          case "other":
            return school.has_dual_language && 
                   !langString.includes("spanish") && 
                   !langString.includes("chinese") && 
                   !langString.includes("mandarin") &&
                   !langString.includes("french");
          default:
            return true;
        }
      });
    }
    
    // IEP filter
    if (selectedIEP !== "all") {
      result = result.filter(school => {
        const iep = school.iep_percent;
        if (iep === null || iep === undefined) return false;
        switch (selectedIEP) {
          case "low":
            return iep < 15;
          case "medium":
            return iep >= 15 && iep <= 25;
          case "high":
            return iep > 25;
          default:
            return true;
        }
      });
    }
    
    // Zip code filter
    if (selectedZipCode && selectedZipCode.length === 5) {
      result = result.filter(school => school.zip_code === selectedZipCode);
    }
    
    return result;
  }, [schoolsWithCoords, selectedDistrict, selectedType, selectedGT, selectedDL, selectedIEP, selectedZipCode]);

  // Count active filters (District 2 is the default, so only count as active if changed to something else)
  const activeFilterCount = useMemo(() => {
    return [
      selectedDistrict !== "2" ? 1 : 0,
      selectedType !== "all" ? 1 : 0,
      selectedGT !== "all" ? 1 : 0,
      selectedDL !== "all" ? 1 : 0,
      selectedIEP !== "all" ? 1 : 0,
      selectedZipCode && selectedZipCode.length === 5 ? 1 : 0,
    ].reduce((a, b) => a + b, 0);
  }, [selectedDistrict, selectedType, selectedGT, selectedDL, selectedIEP, selectedZipCode]);

  // Generate dynamic SEO title, description, and canonical path from active filter state
  const seoContent = useMemo(() => {
    const parts: string[] = [];
    let description = "Explore NYC schools on an interactive map.";
    
    if (selectedType !== "all") {
      const typeLabel = GRADE_BAND_OPTIONS.find(o => o.value === selectedType)?.label || "";
      parts.push(typeLabel);
    }
    
    if (selectedGT !== "all") {
      const gtLabel = GT_OPTIONS.find(o => o.value === selectedGT)?.label || "";
      parts.push(gtLabel);
    }
    
    if (selectedDL !== "all") {
      const dlLabel = DUAL_LANGUAGE_OPTIONS.find(o => o.value === selectedDL)?.label || "";
      if (selectedDL !== "dl") parts.push(`${dlLabel} Dual Language`);
      else parts.push(dlLabel);
    }
    
    if (selectedIEP !== "all") {
      const iepLabel = IEP_OPTIONS.find(o => o.value === selectedIEP)?.label || "";
      parts.push(iepLabel);
    }
    
    if (selectedDistrict !== "all" && selectedDistrict !== "2") {
      parts.push(`District ${selectedDistrict}`);
    }
    
    if (selectedZipCode && selectedZipCode.length === 5) {
      parts.push(`Zip ${selectedZipCode}`);
    }
    
    let title = "NYC School Map";
    if (parts.length > 0) {
      title = `${parts.join(" - ")} Schools Map`;
      description = `Find ${parts.join(", ")} schools in NYC. View ${filteredSchools.length} school locations, ratings, and details on our interactive map.`;
    } else {
      description = `Explore ${schoolsWithCoords.length} NYC schools on an interactive map. View school locations, ratings, and filter by district, grade level, G&T, dual language, and special education programs.`;
    }
    
    // Build canonical path from active filter state
    const canonicalParams = new URLSearchParams();
    if (selectedDistrict !== "all" && selectedDistrict !== "2") canonicalParams.set("district", selectedDistrict);
    if (selectedType !== "all") canonicalParams.set("type", selectedType);
    if (selectedGT !== "all") canonicalParams.set("gt", selectedGT);
    if (selectedDL !== "all") canonicalParams.set("dl", selectedDL);
    if (selectedIEP !== "all") canonicalParams.set("iep", selectedIEP);
    if (selectedZipCode && selectedZipCode.length === 5) canonicalParams.set("zip", selectedZipCode);
    const canonicalQuery = canonicalParams.toString();
    const canonicalPath = canonicalQuery ? `/map?${canonicalQuery}` : "/map";
    
    return { title, description, canonicalPath };
  }, [selectedDistrict, selectedType, selectedGT, selectedDL, selectedIEP, selectedZipCode, filteredSchools.length, schoolsWithCoords.length]);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Initialize map centered on NYC
    const map = L.map(mapRef.current).setView([40.728, -74.000], 11);

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
      
      // Create custom colored marker with 4-tier color system
      const getMarkerColor = (color: string) => {
        switch (color) {
          case 'green': return '#22c55e';
          case 'yellow': return '#eab308';
          case 'purple': return '#8b5cf6';
          default: return '#ef4444';
        }
      };
      
      const markerHtml = `
        <div style="
          background-color: ${getMarkerColor(scoreColor)};
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

      // Build badges for popup
      const badges: string[] = [];
      if (school.has_gifted_talented) {
        badges.push(`<span style="background: #8b5cf6; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; margin-right: 4px;">G&T</span>`);
      }
      if (school.has_dual_language) {
        badges.push(`<span style="background: #0ea5e9; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; margin-right: 4px;">Dual Lang</span>`);
      }
      if (school.has_3k || school.has_prek) {
        badges.push(`<span style="background: #f97316; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px;">Early Ed</span>`);
      }

      marker.bindPopup(`
        <div style="min-width: 220px;">
          <h3 style="margin: 0 0 8px 0; font-weight: 600; font-size: 14px;">${school.name}</h3>
          ${badges.length > 0 ? `<div style="margin-bottom: 8px;">${badges.join('')}</div>` : ''}
          <p style="margin: 0; font-size: 12px; color: #666;">DBN: ${school.dbn}</p>
          <p style="margin: 4px 0; font-size: 12px; color: #666;">District ${school.district} | ${school.grade_band || 'N/A'}</p>
          <p style="margin: 4px 0; font-size: 14px;">
            <strong>Overall Score:</strong> 
            <span style="color: ${getMarkerColor(scoreColor)}; font-weight: 600;">
              ${school.overall_score}
            </span>
          </p>
          <p style="margin: 4px 0 8px 0; font-size: 12px;">
            ELA: ${school.ela_proficiency}% | Math: ${school.math_proficiency}%
          </p>
          <a 
            href="/school/${getSchoolSlug(school)}" 
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
            setLocation(`/school/${getSchoolSlug(school)}`);
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

  // Clear all filters (reset to defaults)
  const clearFilters = () => {
    setSelectedDistrict("2");
    setSelectedType("all");
    setSelectedGT("all");
    setSelectedDL("all");
    setSelectedIEP("all");
    setSelectedZipCode("");
  };

  // Handle zip code input changes - switches to All Districts when 5 digits entered
  const handleZipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 5);
    setSelectedZipCode(value);
    // When entering a 5-digit zip code, always switch to "All Districts" for better UX
    if (value.length === 5) {
      setSelectedDistrict("all");
    }
  };

  const filterDropdownsContent = (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2">
      <Select value={selectedDistrict} onValueChange={setSelectedDistrict}>
        <SelectTrigger data-testid="select-map-district" className="h-9">
          <SelectValue placeholder="District 2" />
        </SelectTrigger>
        <SelectContent className="z-[9999]">
          <SelectItem value="all">All Districts</SelectItem>
          {Array.from({ length: 32 }, (_, i) => i + 1).map((d) => (
            <SelectItem key={d} value={d.toString()}>
              District {d}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={selectedType} onValueChange={setSelectedType}>
        <SelectTrigger data-testid="select-map-type" className="h-9">
          <SelectValue placeholder="All Grade Levels" />
        </SelectTrigger>
        <SelectContent className="z-[9999]">
          {GRADE_BAND_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={selectedGT} onValueChange={setSelectedGT}>
        <SelectTrigger data-testid="select-map-gt" className="h-9">
          <SelectValue placeholder="G&T Programs" />
        </SelectTrigger>
        <SelectContent className="z-[9999]">
          {GT_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={selectedDL} onValueChange={setSelectedDL}>
        <SelectTrigger data-testid="select-map-dl" className="h-9">
          <SelectValue placeholder="Dual Language" />
        </SelectTrigger>
        <SelectContent className="z-[9999]">
          {DUAL_LANGUAGE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={selectedIEP} onValueChange={setSelectedIEP}>
        <SelectTrigger data-testid="select-map-iep" className="h-9">
          <SelectValue placeholder="Special Ed" />
        </SelectTrigger>
        <SelectContent className="z-[9999]">
          {IEP_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          data-testid="input-map-zip-code"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={5}
          placeholder="Zip Code"
          value={selectedZipCode}
          onChange={handleZipChange}
          className="pl-9 h-9"
        />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEOHead 
        title={seoContent.title}
        description={seoContent.description}
        keywords="NYC school map, school locations, school finder map, NYC school districts, elementary school map, G&T schools, dual language schools, special education schools"
        canonicalPath={seoContent.canonicalPath}
      />
      <AppHeader />

      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-semibold" data-testid="text-map-title">School Map</h1>
          </div>
          <div className="text-sm text-muted-foreground">
            {filteredSchools.length} of {schoolsWithCoords.length} schools
          </div>
        </div>

        <Card className="mb-4 relative z-20">
          <CardContent className="p-4">
            {/* Desktop filters - always visible */}
            <div className="hidden md:block">
              <div className="flex items-center justify-between gap-4 mb-3">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Filters</span>
                  {activeFilterCount > 0 && (
                    <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                      {activeFilterCount}
                    </span>
                  )}
                </div>
                {activeFilterCount > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={clearFilters}
                    data-testid="button-clear-filters"
                  >
                    Clear All
                  </Button>
                )}
              </div>
              {filterDropdownsContent}
            </div>

            {/* Mobile filters - collapsible */}
            <div className="md:hidden">
              <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
                <div className="flex items-center justify-between">
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2" data-testid="button-mobile-filters">
                      <Filter className="w-4 h-4" />
                      Filters
                      {activeFilterCount > 0 && (
                        <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                          {activeFilterCount}
                        </span>
                      )}
                      {filtersOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  </CollapsibleTrigger>
                  {activeFilterCount > 0 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={clearFilters}
                      data-testid="button-clear-filters-mobile"
                    >
                      Clear
                    </Button>
                  )}
                </div>
                <CollapsibleContent className="pt-4">
                  {filterDropdownsContent}
                </CollapsibleContent>
              </Collapsible>
            </div>

            {/* Legend */}
            <div className="mt-4 pt-3 border-t flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
              <span className="font-medium">Score Legend:</span>
              <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-full bg-emerald-500"></span> 90+</span>
              <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-full bg-yellow-500"></span> 80-89</span>
              <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-full bg-violet-500"></span> 70-79</span>
              <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-full bg-red-500"></span> &lt;70</span>
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
      
      <Footer />
    </div>
  );
}
