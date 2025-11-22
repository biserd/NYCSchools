import { SchoolWithOverallScore } from "@shared/schema";
import { SchoolCard } from "./SchoolCard";
import { AlertCircle } from "lucide-react";

interface SchoolListProps {
  schools: SchoolWithOverallScore[];
  onSchoolClick: (school: SchoolWithOverallScore) => void;
}

export function SchoolList({ schools, onSchoolClick }: SchoolListProps) {
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" data-testid="list-schools">
      {schools.map((school) => (
        <SchoolCard
          key={school.dbn}
          school={school}
          onClick={() => onSchoolClick(school)}
        />
      ))}
    </div>
  );
}
