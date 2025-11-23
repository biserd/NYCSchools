import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { SchoolWithOverallScore } from "@shared/schema";
import { SchoolCard } from "./SchoolCard";
import { AlertCircle } from "lucide-react";

interface SchoolListProps {
  schools: SchoolWithOverallScore[];
}

export function SchoolList({ schools }: SchoolListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: Math.ceil(schools.length / 2),
    getScrollElement: () => parentRef.current,
    estimateSize: () => 300,
    overscan: 3,
  });

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
    <div
      ref={parentRef}
      className="h-[calc(100vh-400px)] overflow-auto"
      data-testid="list-schools"
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const startIndex = virtualRow.index * 2;
          const leftSchool = schools[startIndex];
          const rightSchool = schools[startIndex + 1];

          // Skip if no left school (overscan beyond data)
          if (!leftSchool) return null;

          return (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 px-1">
                <SchoolCard school={leftSchool} />
                {rightSchool && <SchoolCard school={rightSchool} />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
