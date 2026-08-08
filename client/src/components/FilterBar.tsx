import { useState, useMemo, useCallback } from "react";
import { Search, SlidersHorizontal, ChevronDown, ChevronUp, MapPin, Home } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export type SortOption = "overall" | "academics" | "climate" | "progress" | "name" | "pta";

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedDistrict: string;
  onDistrictChange: (value: string) => void;
  selectedGradeBand: string;
  onGradeBandChange: (value: string) => void;
  sortBy: SortOption;
  onSortChange: (value: SortOption) => void;
  earlyChildhoodFilter?: string;
  onEarlyChildhoodFilterChange?: (value: string) => void;
  giftedTalentedFilter?: string;
  onGiftedTalentedFilterChange?: (value: string) => void;
  trendFilter?: string;
  onTrendFilterChange?: (value: string) => void;
  dualLanguageFilter?: string;
  onDualLanguageFilterChange?: (value: string) => void;
  ptaFilter?: string;
  onPtaFilterChange?: (value: string) => void;
  iepFilter?: string;
  onIepFilterChange?: (value: string) => void;
  zipCode?: string;
  onZipCodeChange?: (value: string) => void;
  availableZipCodes?: string[];
  zonedFilter?: string;
  onZonedFilterChange?: (value: string) => void;
  hasZonedSchools?: boolean;
}

const NYC_DISTRICTS = Array.from({ length: 32 }, (_, i) => String(i + 1));

const GRADE_BAND_OPTIONS = [
  { value: "All", label: "All Grade Levels" },
  { value: "PreK", label: "Pre-K Programs" },
  { value: "3K", label: "3-K Programs" },
  { value: "Elementary", label: "Elementary (K-5)" },
  { value: "Middle", label: "Middle School (6-8)" },
  { value: "K-8", label: "K-8 Schools" },
  { value: "HighSchool", label: "High School (9-12)" },
];

const EARLY_CHILDHOOD_OPTIONS = ["All", "Pre-K", "3-K"];

const DUAL_LANGUAGE_OPTIONS = [
  { value: "All", label: "Any Dual Language" },
  { value: "DualLanguage", label: "Has Dual Language" },
  { value: "Spanish", label: "Spanish Dual Language" },
  { value: "Chinese", label: "Chinese Dual Language" },
  { value: "French", label: "French Dual Language" },
  { value: "Other", label: "Other Languages" },
];

const PTA_FILTER_OPTIONS = [
  { value: "All", label: "Any PTA Funding" },
  { value: "HasPTA", label: "Has PTA Data" },
  { value: "100k+", label: "$100K+ Raised" },
  { value: "500k+", label: "$500K+ Raised" },
  { value: "1m+", label: "$1M+ Raised" },
];

const IEP_FILTER_OPTIONS = [
  { value: "All", label: "Any IEP Level" },
  { value: "HasIEP", label: "Has IEP Data" },
  { value: "Low", label: "Low IEP (<15%)" },
  { value: "Medium", label: "Medium IEP (15-25%)" },
  { value: "High", label: "High IEP (>25%)" },
];

export function FilterBar({
  searchQuery,
  onSearchChange,
  selectedDistrict,
  onDistrictChange,
  selectedGradeBand,
  onGradeBandChange,
  sortBy,
  onSortChange,
  earlyChildhoodFilter = "All",
  onEarlyChildhoodFilterChange,
  giftedTalentedFilter = "All",
  onGiftedTalentedFilterChange,
  trendFilter = "All",
  onTrendFilterChange,
  dualLanguageFilter = "All",
  onDualLanguageFilterChange,
  ptaFilter = "All",
  onPtaFilterChange,
  iepFilter = "All",
  onIepFilterChange,
  zipCode = "",
  onZipCodeChange,
  availableZipCodes = [],
  zonedFilter = "all",
  onZonedFilterChange,
  hasZonedSchools = false,
}: FilterBarProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);

  const activeFilterCount = [
    selectedDistrict !== "all" && selectedDistrict !== "2" ? 1 : 0,
    selectedGradeBand !== "All" ? 1 : 0,
    earlyChildhoodFilter !== "All" ? 1 : 0,
    giftedTalentedFilter !== "All" ? 1 : 0,
    trendFilter !== "All" ? 1 : 0,
    dualLanguageFilter !== "All" ? 1 : 0,
    ptaFilter !== "All" ? 1 : 0,
    iepFilter !== "All" ? 1 : 0,
    zipCode && zipCode.length === 5 ? 1 : 0,
    zonedFilter !== "all" ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  // Memoize the zip code change handler to prevent input re-renders
  const handleZipChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (onZipCodeChange) {
      const value = e.target.value.replace(/\D/g, '').slice(0, 5);
      onZipCodeChange(value);
    }
  }, [onZipCodeChange]);

  const filterDropdownsContent = (
    <>
      <Select value={selectedDistrict} onValueChange={onDistrictChange}>
        <SelectTrigger data-testid="select-district" className="w-full md:w-48 h-11">
          <SelectValue placeholder="All Districts" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem data-testid="option-district-all" value="all">All Districts</SelectItem>
          {NYC_DISTRICTS.map((district) => (
            <SelectItem key={district} data-testid={`option-district-${district}`} value={district}>
              District {district}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={selectedGradeBand} onValueChange={onGradeBandChange}>
        <SelectTrigger data-testid="select-grade-band" className="w-full md:w-52 h-11">
          <SelectValue placeholder="All Grade Levels" />
        </SelectTrigger>
        <SelectContent>
          {GRADE_BAND_OPTIONS.map((option) => (
            <SelectItem key={option.value} data-testid={`option-grade-${option.value.toLowerCase()}`} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {onEarlyChildhoodFilterChange && (
        <Select value={earlyChildhoodFilter} onValueChange={onEarlyChildhoodFilterChange}>
          <SelectTrigger data-testid="select-early-childhood" className="w-full md:w-44 h-11">
            <SelectValue placeholder="Programs" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem data-testid="option-early-childhood-all" value="All">All Programs</SelectItem>
            <SelectItem data-testid="option-early-childhood-prek" value="Pre-K">Has Pre-K</SelectItem>
            <SelectItem data-testid="option-early-childhood-3k" value="3-K">Has 3-K</SelectItem>
          </SelectContent>
        </Select>
      )}
      {onGiftedTalentedFilterChange && (
        <Select value={giftedTalentedFilter} onValueChange={onGiftedTalentedFilterChange}>
          <SelectTrigger data-testid="select-gifted-talented" className="w-full md:w-40 h-11">
            <SelectValue placeholder="G&T" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem data-testid="option-gt-all" value="All">Any G&amp;T Status</SelectItem>
            <SelectItem data-testid="option-gt-any" value="G&T">Has G&T</SelectItem>
            <SelectItem data-testid="option-gt-citywide" value="Citywide">Citywide G&T</SelectItem>
            <SelectItem data-testid="option-gt-district" value="District">District G&T</SelectItem>
          </SelectContent>
        </Select>
      )}
      {onTrendFilterChange && (
        <Select value={trendFilter} onValueChange={onTrendFilterChange}>
          <SelectTrigger data-testid="select-trend" className="w-full md:w-36 h-11">
            <SelectValue placeholder="Trends" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem data-testid="option-trend-all" value="All">All Trends</SelectItem>
            <SelectItem data-testid="option-trend-improving" value="Improving">Improving</SelectItem>
            <SelectItem data-testid="option-trend-stable" value="Stable">Stable</SelectItem>
            <SelectItem data-testid="option-trend-declining" value="Declining">Declining</SelectItem>
          </SelectContent>
        </Select>
      )}
      {onDualLanguageFilterChange && (
        <Select value={dualLanguageFilter} onValueChange={onDualLanguageFilterChange}>
          <SelectTrigger data-testid="select-dual-language" className="w-full md:w-48 h-11">
            <SelectValue placeholder="Dual Language" />
          </SelectTrigger>
          <SelectContent>
            {DUAL_LANGUAGE_OPTIONS.map((option) => (
              <SelectItem key={option.value} data-testid={`option-dl-${option.value.toLowerCase()}`} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {onPtaFilterChange && (
        <Select value={ptaFilter} onValueChange={onPtaFilterChange}>
          <SelectTrigger data-testid="select-pta" className="w-full md:w-40 h-11">
            <SelectValue placeholder="PTA Fundraising" />
          </SelectTrigger>
          <SelectContent>
            {PTA_FILTER_OPTIONS.map((option) => (
              <SelectItem key={option.value} data-testid={`option-pta-${option.value.toLowerCase()}`} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {onIepFilterChange && (
        <Select value={iepFilter} onValueChange={onIepFilterChange}>
          <SelectTrigger data-testid="select-iep" className="w-full md:w-44 h-11">
            <SelectValue placeholder="Special Ed (IEP)" />
          </SelectTrigger>
          <SelectContent>
            {IEP_FILTER_OPTIONS.map((option) => (
              <SelectItem key={option.value} data-testid={`option-iep-${option.value.toLowerCase()}`} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {onZipCodeChange && (
        <div className="relative w-full md:w-36">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            data-testid="input-zip-code"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={5}
            placeholder="Zip Code"
            value={zipCode}
            onChange={handleZipChange}
            className="pl-9 h-11"
          />
        </div>
      )}
      {/* Zoned-schools filter: reserve the slot as soon as we know the user is
          authenticated (even before /api/user-zones resolves) so the filter
          bar never grows in height when the data arrives — preventing CLS.
          The slot stays invisible until hasZonedSchools is confirmed. */}
      {onZonedFilterChange && (
        <div className={!hasZonedSchools ? "invisible pointer-events-none" : undefined}>
          <Select value={zonedFilter} onValueChange={onZonedFilterChange}>
            <SelectTrigger data-testid="select-zoned" className="w-full md:w-44 h-11">
              <Home className="h-4 w-4 mr-2 text-primary" />
              <SelectValue placeholder="My Zoned Schools" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem data-testid="option-zoned-all" value="all">All NYC Schools</SelectItem>
              <SelectItem data-testid="option-zoned-elementary" value="elementary">
                <span className="flex items-center gap-2">
                  <Home className="h-3 w-3 text-primary" />
                  My Elementary Zone
                </span>
              </SelectItem>
              <SelectItem data-testid="option-zoned-middle" value="middle">
                <span className="flex items-center gap-2">
                  <Home className="h-3 w-3 text-primary" />
                  My Middle School Zone
                </span>
              </SelectItem>
              <SelectItem data-testid="option-zoned-high" value="high">
                <span className="flex items-center gap-2">
                  <Home className="h-3 w-3 text-primary" />
                  My High School Zone
                </span>
              </SelectItem>
              <SelectItem data-testid="option-zoned-any" value="any">
                <span className="flex items-center gap-2">
                  <Home className="h-3 w-3 text-primary" />
                  All My Zoned Schools
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </>
  );

  const sortButtonsContent = (
    <div className="flex flex-wrap gap-2">
      <span className="text-sm text-muted-foreground self-center mr-2" data-testid="text-sort-label">Sort:</span>
      <Button
        data-testid="button-sort-overall"
        variant={sortBy === "overall" ? "default" : "outline"}
        size="sm"
        onClick={() => onSortChange("overall")}
      >
        Overall
      </Button>
      <Button
        data-testid="button-sort-academics"
        variant={sortBy === "academics" ? "default" : "outline"}
        size="sm"
        onClick={() => onSortChange("academics")}
      >
        Academics
      </Button>
      <Button
        data-testid="button-sort-climate"
        variant={sortBy === "climate" ? "default" : "outline"}
        size="sm"
        onClick={() => onSortChange("climate")}
      >
        Climate
      </Button>
      <Button
        data-testid="button-sort-progress"
        variant={sortBy === "progress" ? "default" : "outline"}
        size="sm"
        onClick={() => onSortChange("progress")}
      >
        Progress
      </Button>
      <Button
        data-testid="button-sort-name"
        variant={sortBy === "name" ? "default" : "outline"}
        size="sm"
        onClick={() => onSortChange("name")}
      >
        A-Z
      </Button>
      <Button
        data-testid="button-sort-pta"
        variant={sortBy === "pta" ? "default" : "outline"}
        size="sm"
        onClick={() => onSortChange("pta")}
      >
        PTA $
      </Button>
    </div>
  );

  return (
    <div className="sticky top-0 z-50 bg-background border-b">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-3">
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                data-testid="input-search"
                type="search"
                placeholder="Search schools..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-9 h-11 text-sm"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="md:hidden h-11 gap-2"
              onClick={() => setFiltersOpen(!filtersOpen)}
              data-testid="button-toggle-filters"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {activeFilterCount}
                </Badge>
              )}
              {filtersOpen ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
          </div>

          <div className="hidden md:flex md:flex-row gap-2 flex-wrap">
            {filterDropdownsContent}
          </div>

          <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen} className="md:hidden">
            <CollapsibleContent className="space-y-2">
              {filterDropdownsContent}
            </CollapsibleContent>
          </Collapsible>

          {sortButtonsContent}
        </div>
      </div>
    </div>
  );
}
