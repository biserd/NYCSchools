import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { SEOHead } from "@/components/SEOHead";
import { Footer } from "@/components/Footer";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, MapPin, Phone, Mail, Users, Building2, Baby, ChevronRight, ExternalLink } from "lucide-react";
import { type NyceecCenter, getBoroughName } from "@shared/schema";

const NYC_BOROUGHS = [
  { value: "all", label: "All Boroughs" },
  { value: "M", label: "Manhattan" },
  { value: "X", label: "Bronx" },
  { value: "K", label: "Brooklyn" },
  { value: "Q", label: "Queens" },
  { value: "R", label: "Staten Island" },
];

const CENTER_TYPES = [
  { value: "all", label: "All Types" },
  { value: "NYCEEC", label: "Community-Based (NYCEEC)" },
  { value: "DOE", label: "DOE Schools" },
  { value: "CHARTER", label: "Charter Schools" },
];

const NYC_DISTRICTS = Array.from({ length: 32 }, (_, i) => i + 1);

export default function EarlyChildhood() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedBorough, setSelectedBorough] = useState("all");
  const [selectedDistrict, setSelectedDistrict] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [displayCount, setDisplayCount] = useState(50);

  const { data: centers, isLoading } = useQuery<NyceecCenter[]>({
    queryKey: ["/api/nyceec-centers"],
  });

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    const timeoutId = setTimeout(() => {
      setDebouncedSearch(value);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, []);

  const filteredCenters = useMemo(() => {
    if (!centers) return [];

    return centers.filter((center) => {
      if (selectedBorough !== "all" && center.borough !== selectedBorough) {
        return false;
      }

      if (selectedDistrict !== "all" && center.district !== parseInt(selectedDistrict, 10)) {
        return false;
      }

      if (selectedType !== "all" && center.centerType !== selectedType) {
        return false;
      }

      if (debouncedSearch) {
        const searchLower = debouncedSearch.toLowerCase();
        const nameMatch = center.name.toLowerCase().includes(searchLower);
        const addressMatch = center.address.toLowerCase().includes(searchLower);
        const zipMatch = center.zipCode?.includes(searchLower);
        if (!nameMatch && !addressMatch && !zipMatch) {
          return false;
        }
      }

      return true;
    });
  }, [centers, selectedBorough, selectedDistrict, selectedType, debouncedSearch]);

  const displayedCenters = useMemo(() => {
    return filteredCenters.slice(0, displayCount);
  }, [filteredCenters, displayCount]);

  const stats = useMemo(() => {
    if (!centers) return { total: 0, nyceec: 0, doe: 0, charter: 0 };
    return {
      total: centers.length,
      nyceec: centers.filter((c) => c.centerType === "NYCEEC").length,
      doe: centers.filter((c) => c.centerType === "DOE").length,
      charter: centers.filter((c) => c.centerType === "CHARTER" || c.centerType === "Charter").length,
    };
  }, [centers]);

  const getCenterTypeColor = (type: string) => {
    switch (type) {
      case "NYCEEC":
        return "bg-orange-100 dark:bg-orange-950 text-orange-800 dark:text-orange-200 border-orange-200 dark:border-orange-800";
      case "DOE":
        return "bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800";
      case "CHARTER":
      case "Charter":
        return "bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-200 border-purple-200 dark:border-purple-800";
      default:
        return "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200";
    }
  };

  const getCenterTypeLabel = (type: string) => {
    switch (type) {
      case "NYCEEC":
        return "Community-Based";
      case "DOE":
        return "DOE School";
      case "CHARTER":
      case "Charter":
        return "Charter";
      default:
        return type;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEOHead
        title="Early Childhood Centers"
        description="Browse 1,800+ NYC early childhood education centers offering Pre-K and 3-K programs. Find community-based NYCEECs, DOE schools, and charter programs near you."
        canonicalPath="/early-childhood"
      />

      <AppHeader />

      <main className="flex-1 container mx-auto px-4 py-6 max-w-7xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Early Childhood Education Centers
          </h1>
          <p className="text-muted-foreground">
            Browse {stats.total.toLocaleString()} Pre-K and 3-K program locations across NYC, including community-based centers (NYCEECs), DOE schools, and charter programs.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Baby className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Total Centers</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-950">
                  <Building2 className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.nyceec.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Community-Based</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950">
                  <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.doe.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">DOE Schools</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-950">
                  <Building2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.charter}</p>
                  <p className="text-xs text-muted-foreground">Charter Schools</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, address, or zip code..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-centers"
                />
              </div>
              <Select value={selectedBorough} onValueChange={setSelectedBorough}>
                <SelectTrigger className="w-full md:w-44" data-testid="select-borough">
                  <SelectValue placeholder="Borough" />
                </SelectTrigger>
                <SelectContent>
                  {NYC_BOROUGHS.map((borough) => (
                    <SelectItem key={borough.value} value={borough.value}>
                      {borough.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedDistrict} onValueChange={setSelectedDistrict}>
                <SelectTrigger className="w-full md:w-40" data-testid="select-district">
                  <SelectValue placeholder="District" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Districts</SelectItem>
                  {NYC_DISTRICTS.map((d) => (
                    <SelectItem key={d} value={d.toString()}>
                      District {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-full md:w-52" data-testid="select-type">
                  <SelectValue placeholder="Center Type" />
                </SelectTrigger>
                <SelectContent>
                  {CENTER_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {displayedCenters.length} of {filteredCenters.length} centers
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2 mb-4" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayedCenters.map((center) => (
                <Card
                  key={center.id}
                  className="hover-elevate cursor-pointer transition-shadow"
                  data-testid={`card-center-${center.locCode}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <h3 className="font-semibold text-foreground line-clamp-2">
                        {center.name}
                      </h3>
                      <Badge className={getCenterTypeColor(center.centerType)} variant="outline">
                        {getCenterTypeLabel(center.centerType)}
                      </Badge>
                    </div>

                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                        <span className="line-clamp-2">
                          {center.address}, {getBoroughName(center.borough)} {center.zipCode}
                        </span>
                      </div>

                      {center.district && (
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 shrink-0" />
                          <span>District {center.district}</span>
                        </div>
                      )}

                      {center.seats && (
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 shrink-0" />
                          <span>{center.seats} Pre-K seats</span>
                        </div>
                      )}

                      {center.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 shrink-0" />
                          <a
                            href={`tel:${center.phone}`}
                            className="hover:text-primary transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {center.phone}
                          </a>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-4 pt-3 border-t">
                      {center.extendedDay && (
                        <Badge variant="secondary" className="text-xs">
                          Extended Day
                        </Badge>
                      )}
                      {center.mealsProvided && (
                        <Badge variant="secondary" className="text-xs">
                          Meals
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-3 border-t">
                      {center.website ? (
                        <a
                          href={center.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Visit Website
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span />
                      )}
                      {center.email && (
                        <a
                          href={`mailto:${center.email}`}
                          className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Mail className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {displayCount < filteredCenters.length && (
              <div className="flex justify-center mt-6">
                <Button
                  variant="outline"
                  onClick={() => setDisplayCount((prev) => prev + 50)}
                  data-testid="button-load-more"
                >
                  Load More ({filteredCenters.length - displayCount} remaining)
                </Button>
              </div>
            )}

            {filteredCenters.length === 0 && (
              <Card className="p-8 text-center">
                <Baby className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No centers found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your filters or search terms.
                </p>
              </Card>
            )}
          </>
        )}

        <Card className="mt-8 bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800">
          <CardContent className="p-6">
            <h3 className="font-semibold text-lg mb-3">About NYC Early Childhood Programs</h3>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                <strong>NYCEEC (NYC Early Education Centers)</strong> are community-based organizations that partner with the NYC Department of Education to offer free 3-K and Pre-K programs. These include Head Start programs, faith-based organizations, and nonprofit providers.
              </p>
              <p>
                <strong>DOE Schools</strong> are public schools that offer Pre-K and 3-K programs within their buildings, typically as part of their elementary school offerings.
              </p>
              <p>
                <strong>Charter Schools</strong> are publicly funded but independently operated schools that may offer early childhood programs.
              </p>
              <div className="mt-4 pt-4 border-t border-orange-200 dark:border-orange-800">
                <p>
                  Apply through{" "}
                  <a
                    href="https://www.myschools.nyc"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    MySchools.nyc
                  </a>{" "}
                  for all 3-K and Pre-K programs.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
