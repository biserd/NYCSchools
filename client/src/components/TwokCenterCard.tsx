import { memo } from "react";
import { type TwokCenter } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, MapPin, Phone, Baby, Clock, Building2 } from "lucide-react";
import { Link } from "wouter";

interface TwokCenterCardProps {
  center: TwokCenter;
}

/** Strip the trailing "(CODE)" from the imported names for cleaner display */
function cleanName(name: string): string {
  return name.replace(/\s*\([0-9A-Z]{6}\)\s*$/, "").trim();
}

export const TwokCenterCard = memo(function TwokCenterCard({ center }: TwokCenterCardProps) {
  const isExpandedDay = center.programType === "EDFY";

  return (
    <Link href={`/map?source=twok&district=all&highlight=${center.dbn}`} data-testid={`link-twok-${center.dbn}`}>
      <Card
        data-testid={`twok-card-${center.dbn}`}
        className="overflow-visible hover-elevate active-elevate-2 transition-all h-full"
      >
        <div className="p-6 flex flex-col gap-4 h-full">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2 mb-1">
                <h3 className="text-lg font-semibold text-foreground line-clamp-2 flex-1" data-testid={`text-twok-name-${center.dbn}`}>
                  {cleanName(center.name)}
                </h3>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="text-xs" data-testid={`badge-twok-dbn-${center.dbn}`}>
                  {center.dbn}
                </Badge>
                <Badge variant="outline" className="text-xs bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 border-teal-300 dark:border-teal-700" data-testid={`badge-twok-${center.dbn}`}>
                  2-K
                </Badge>
                {center.schoolType === "PRIVATE" && (
                  <Badge variant="outline" className="text-xs" data-testid={`badge-twok-type-${center.dbn}`}>
                    Private Provider
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <div className="flex items-center gap-2">
                <Baby className="w-8 h-8 text-teal-600 dark:text-teal-400" data-testid={`icon-twok-${center.dbn}`} />
              </div>
              <span className="text-xs text-muted-foreground">2-K Program</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-sm text-muted-foreground -mt-1">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate" data-testid={`text-twok-address-${center.dbn}`}>
              {center.address}{center.zipCode ? `, ${center.zipCode}` : ""}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center gap-2 bg-muted/50 rounded-md p-3" data-testid={`container-twok-schedule-${center.dbn}`}>
              <div className={`w-2 h-2 rounded-full ${isExpandedDay ? "bg-teal-500" : "bg-blue-500"} shrink-0`} />
              <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium" data-testid={`text-twok-schedule-${center.dbn}`}>
                  {isExpandedDay ? "Expanded Day" : "School Day"}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {isExpandedDay ? "Full Year" : "School Year"}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-muted/50 rounded-md p-3" data-testid={`container-twok-provider-${center.dbn}`}>
              <div className="w-2 h-2 rounded-full bg-violet-500 shrink-0" />
              <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium" data-testid={`text-twok-provider-${center.dbn}`}>
                  {center.schoolType === "PRIVATE" ? "Community" : "Public"}
                </div>
                <div className="text-xs text-muted-foreground truncate">Provider</div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm text-muted-foreground pt-2 border-t mt-auto">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="flex items-center gap-1" data-testid={`text-twok-borough-${center.dbn}`}>
                <MapPin className="w-3 h-3" />
                {center.borough}
              </span>
              {center.district && (
                <span data-testid={`text-twok-district-${center.dbn}`}>District {center.district}</span>
              )}
              {center.phone && (
                <span className="flex items-center gap-1" data-testid={`text-twok-phone-${center.dbn}`}>
                  <Phone className="w-3 h-3" />
                  {center.phone}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <ChevronRight className="w-4 h-4" data-testid={`icon-twok-chevron-${center.dbn}`} />
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
});
