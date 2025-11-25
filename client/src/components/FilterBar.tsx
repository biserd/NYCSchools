import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

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
}

const NYC_DISTRICTS = Array.from({ length: 32 }, (_, i) => String(i + 1));
const GRADE_BANDS = ["All", "K-5", "K-8"];

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
}: FilterBarProps) {
  return (
    <div className="sticky top-0 z-50 bg-background border-b">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                data-testid="input-search"
                type="search"
                placeholder="Search by school name..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10 h-12 text-base"
              />
            </div>
            <Select value={selectedDistrict} onValueChange={onDistrictChange}>
              <SelectTrigger data-testid="select-district" className="w-full md:w-48 h-12">
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
              <SelectTrigger data-testid="select-grade-band" className="w-full md:w-48 h-12">
                <SelectValue placeholder="All Grades" />
              </SelectTrigger>
              <SelectContent>
                {GRADE_BANDS.map((band) => (
                  <SelectItem key={band} data-testid={`option-grade-${band.toLowerCase().replace('-', '')}`} value={band}>
                    {band === "All" ? "All Grades" : band}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {onEarlyChildhoodFilterChange && (
              <Select value={earlyChildhoodFilter} onValueChange={onEarlyChildhoodFilterChange}>
                <SelectTrigger data-testid="select-early-childhood" className="w-full md:w-48 h-12">
                  <SelectValue placeholder="Early Childhood" />
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
                <SelectTrigger data-testid="select-gifted-talented" className="w-full md:w-48 h-12">
                  <SelectValue placeholder="Gifted & Talented" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem data-testid="option-gt-all" value="All">All Schools</SelectItem>
                  <SelectItem data-testid="option-gt-any" value="G&T">Has G&T Program</SelectItem>
                  <SelectItem data-testid="option-gt-citywide" value="Citywide">Citywide G&T</SelectItem>
                  <SelectItem data-testid="option-gt-district" value="District">District G&T</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
          
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-muted-foreground self-center mr-2" data-testid="text-sort-label">Sort by:</span>
            <Button
              data-testid="button-sort-overall"
              variant={sortBy === "overall" ? "default" : "outline"}
              size="sm"
              onClick={() => onSortChange("overall")}
            >
              Overall Score
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
              Name A-Z
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
