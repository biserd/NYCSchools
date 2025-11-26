import { useState } from "react";
import { Search, SlidersHorizontal, ChevronDown, ChevronUp } from "lucide-react";
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

export type SortOption = "overall" | "academics" | "climate" | "progress" | "name";

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
}

const NYC_DISTRICTS = Array.from({ length: 32 }, (_, i) => String(i + 1));

const GRADE_BAND_OPTIONS = [
  { value: "All", label: "All Grade Levels" },
  { value: "PreK", label: "Pre-K Programs" },
  { value: "3K", label: "3-K Programs" },
  { value: "Elementary", label: "Elementary (K-5)" },
  { value: "K-8", label: "K-8 Schools" },
  { value: "HighSchool", label: "High School (9-12)" },
];

const EARLY_CHILDHOOD_OPTIONS = ["All", "Pre-K", "3-K"];

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
}: FilterBarProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);

  const activeFilterCount = [
    selectedDistrict !== "all" && selectedDistrict !== "2" ? 1 : 0,
    selectedGradeBand !== "All" ? 1 : 0,
    earlyChildhoodFilter !== "All" ? 1 : 0,
    giftedTalentedFilter !== "All" ? 1 : 0,
    trendFilter !== "All" ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const FilterDropdowns = () => (
    <>
      <Select value={selectedDistrict} onValueChange={onDistrictChange}>
        <SelectTrigger data-testid="select-district" className="w-full md:w-48 h-10">
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
        <SelectTrigger data-testid="select-grade-band" className="w-full md:w-52 h-10">
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
          <SelectTrigger data-testid="select-early-childhood" className="w-full md:w-44 h-10">
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
          <SelectTrigger data-testid="select-gifted-talented" className="w-full md:w-40 h-10">
            <SelectValue placeholder="G&T" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem data-testid="option-gt-all" value="All">All Schools</SelectItem>
            <SelectItem data-testid="option-gt-any" value="G&T">Has G&T</SelectItem>
            <SelectItem data-testid="option-gt-citywide" value="Citywide">Citywide G&T</SelectItem>
            <SelectItem data-testid="option-gt-district" value="District">District G&T</SelectItem>
          </SelectContent>
        </Select>
      )}
      {onTrendFilterChange && (
        <Select value={trendFilter} onValueChange={onTrendFilterChange}>
          <SelectTrigger data-testid="select-trend" className="w-full md:w-36 h-10">
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
    </>
  );

  const SortButtons = () => (
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
                className="pl-9 h-10 text-sm"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="md:hidden h-10 gap-2"
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
            <FilterDropdowns />
          </div>

          <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen} className="md:hidden">
            <CollapsibleContent className="space-y-2">
              <FilterDropdowns />
            </CollapsibleContent>
          </Collapsible>

          <SortButtons />
        </div>
      </div>
    </div>
  );
}
