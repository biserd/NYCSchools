import { useComparison } from "@/contexts/ComparisonContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";

export function CompareBar() {
  const { comparedSchools, removeFromComparison, clearComparison } = useComparison();

  if (comparedSchools.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container mx-auto px-4 py-4">
        <Card className="p-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium" data-testid="text-compare-count">
                Compare ({comparedSchools.length}/4)
              </span>
              {comparedSchools.map((school) => (
                <Badge
                  key={school.dbn}
                  variant="secondary"
                  className="flex items-center gap-1 pr-1"
                  data-testid={`badge-compare-${school.dbn}`}
                >
                  <span className="text-xs truncate max-w-[150px]">{school.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 p-0 hover:bg-transparent"
                    onClick={() => removeFromComparison(school.dbn)}
                    data-testid={`button-remove-compare-${school.dbn}`}
                    aria-label={`Remove ${school.name} from comparison`}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={clearComparison}
                data-testid="button-clear-compare"
              >
                Clear All
              </Button>
              {comparedSchools.length >= 2 && (
                <Link href="/compare">
                  <Button size="sm" data-testid="button-view-comparison">
                    Compare Schools
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
