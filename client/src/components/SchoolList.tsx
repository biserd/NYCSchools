import { useState, useEffect } from "react";
import { SchoolWithOverallScore, type SchoolTrend } from "@shared/schema";
import { SchoolCard } from "./SchoolCard";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";

interface SchoolListProps {
  schools: SchoolWithOverallScore[];
}

const INITIAL_LOAD = 20;
const LOAD_MORE_INCREMENT = 20;

export function SchoolList({ schools }: SchoolListProps) {
  const [displayCount, setDisplayCount] = useState(INITIAL_LOAD);

  // Fetch all school trends
  const { data: trends } = useQuery<Record<string, SchoolTrend>>({
    queryKey: ['/api/schools-trends'],
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  // Reset display count when schools change (filtering, etc.)
  useEffect(() => {
    setDisplayCount(INITIAL_LOAD);
  }, [schools]);

  const displayedSchools = schools.slice(0, displayCount);
  const hasMore = displayCount < schools.length;

  if (schools.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4" data-testid="empty-state">
        <div className="bg-muted/50 rounded-full p-6 mb-4">
          <AlertCircle className="w-12 h-12 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold mb-2" data-testid="text-empty-title">No schools found</h3>
        <p className="text-muted-foreground text-center max-w-md" data-testid="text-empty-message">
          Try adjusting your filters to see more results
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="list-schools">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {displayedSchools.map((school) => (
          <SchoolCard
            key={school.dbn}
            school={school}
            trend={trends?.[school.dbn]}
          />
        ))}
      </div>
      
      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            size="lg"
            onClick={() => setDisplayCount(prev => Math.min(prev + LOAD_MORE_INCREMENT, schools.length))}
            data-testid="button-load-more"
          >
            Load More Schools ({schools.length - displayCount} remaining)
          </Button>
        </div>
      )}
    </div>
  );
}
