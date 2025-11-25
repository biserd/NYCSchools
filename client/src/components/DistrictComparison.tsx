import { useQuery } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export interface DistrictAverages {
  district: number;
  schoolCount: number;
  overallScore: number;
  elaProficiency: number;
  mathProficiency: number;
  climateScore: number;
  progressScore: number;
  studentTeacherRatio: number;
  economicNeedIndex: number | null;
  enrollment: number;
  // Demographics
  ellPercent: number | null;
  iepPercent: number | null;
  asianPercent: number | null;
  blackPercent: number | null;
  hispanicPercent: number | null;
  whitePercent: number | null;
  multiRacialPercent: number | null;
  // Survey - Student
  studentSafety: number | null;
  studentTeacherTrust: number | null;
  studentEngagement: number | null;
  // Survey - Teacher
  teacherQuality: number | null;
  teacherCollaboration: number | null;
  teacherLeadership: number | null;
  // Survey - Guardian
  guardianSatisfaction: number | null;
  guardianCommunication: number | null;
  guardianSchoolTrust: number | null;
}

interface ComparisonIndicatorProps {
  value: number;
  districtAvg: number;
  label: string;
  unit?: string;
  higherIsBetter?: boolean;
  showDifference?: boolean;
}

export function ComparisonIndicator({ 
  value, 
  districtAvg, 
  label, 
  unit = "", 
  higherIsBetter = true,
  showDifference = true 
}: ComparisonIndicatorProps) {
  const difference = value - districtAvg;
  const absDiff = Math.abs(difference);
  const threshold = 2;
  
  let status: "above" | "below" | "at";
  if (absDiff < threshold) {
    status = "at";
  } else if (difference > 0) {
    status = higherIsBetter ? "above" : "below";
  } else {
    status = higherIsBetter ? "below" : "above";
  }

  const getStatusIcon = () => {
    switch (status) {
      case "above":
        return <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case "below":
        return <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />;
      default:
        return <Minus className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />;
    }
  };

  const getStatusText = () => {
    if (absDiff < threshold) {
      return "At district average";
    }
    const prefix = difference > 0 ? "+" : "";
    const suffix = higherIsBetter 
      ? (difference > 0 ? "above" : "below") 
      : (difference < 0 ? "better than" : "above");
    return `${prefix}${absDiff.toFixed(1)}${unit} ${suffix} avg`;
  };

  const getStatusColor = () => {
    switch (status) {
      case "above":
        return "text-emerald-600 dark:text-emerald-400";
      case "below":
        return "text-red-600 dark:text-red-400";
      default:
        return "text-yellow-600 dark:text-yellow-400";
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1 cursor-help" data-testid={`comparison-${label.toLowerCase().replace(/\s+/g, '-')}`}>
          {getStatusIcon()}
          {showDifference && (
            <span className={`text-xs ${getStatusColor()}`}>
              {getStatusText()}
            </span>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <div className="text-sm">
          <p className="font-medium">{label} Comparison</p>
          <p>School: {value.toFixed(1)}{unit}</p>
          <p>District Avg: {districtAvg.toFixed(1)}{unit}</p>
          <p className={getStatusColor()}>
            {difference > 0 ? "+" : ""}{difference.toFixed(1)}{unit} vs district
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

interface DistrictComparisonBadgeProps {
  value: number;
  districtAvg: number;
  higherIsBetter?: boolean;
}

export function DistrictComparisonBadge({ value, districtAvg, higherIsBetter = true }: DistrictComparisonBadgeProps) {
  const difference = value - districtAvg;
  const absDiff = Math.abs(difference);
  const threshold = 2;
  
  let status: "above" | "below" | "at";
  if (absDiff < threshold) {
    status = "at";
  } else if (difference > 0) {
    status = higherIsBetter ? "above" : "below";
  } else {
    status = higherIsBetter ? "below" : "above";
  }

  const getBadgeClasses = () => {
    switch (status) {
      case "above":
        return "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700";
      case "below":
        return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700";
      default:
        return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700";
    }
  };

  const getIcon = () => {
    switch (status) {
      case "above":
        return <TrendingUp className="w-3 h-3" />;
      case "below":
        return <TrendingDown className="w-3 h-3" />;
      default:
        return <Minus className="w-3 h-3" />;
    }
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${getBadgeClasses()}`}>
      {getIcon()}
      <span>
        {difference > 0 ? "+" : ""}{difference.toFixed(0)} vs district
      </span>
    </span>
  );
}

interface UseDistrictAveragesResult {
  districtAverages: DistrictAverages | undefined;
  citywideAverages: DistrictAverages | undefined;
  isLoading: boolean;
}

export function useDistrictAverages(district: number): UseDistrictAveragesResult {
  const { data: districtAverages, isLoading: districtLoading } = useQuery<DistrictAverages>({
    queryKey: ["/api/districts", district, "averages"],
    enabled: district > 0,
  });

  const { data: citywideAverages, isLoading: citywideLoading } = useQuery<DistrictAverages>({
    queryKey: ["/api/districts/citywide"],
  });

  return {
    districtAverages,
    citywideAverages,
    isLoading: districtLoading || citywideLoading,
  };
}

interface DistrictComparisonRowProps {
  label: string;
  schoolValue: number;
  districtAvg: number;
  citywideAvg?: number;
  unit?: string;
  higherIsBetter?: boolean;
}

export function DistrictComparisonRow({ 
  label, 
  schoolValue, 
  districtAvg, 
  citywideAvg,
  unit = "",
  higherIsBetter = true 
}: DistrictComparisonRowProps) {
  const districtDiff = schoolValue - districtAvg;
  const citywideDiff = citywideAvg !== undefined ? schoolValue - citywideAvg : null;
  
  const getComparisonColor = (diff: number) => {
    const isGood = higherIsBetter ? diff > 0 : diff < 0;
    const isNeutral = Math.abs(diff) < 2;
    
    if (isNeutral) return "text-muted-foreground";
    return isGood 
      ? "text-emerald-600 dark:text-emerald-400" 
      : "text-red-600 dark:text-red-400";
  };

  const formatDiff = (diff: number) => {
    const prefix = diff > 0 ? "+" : "";
    return `${prefix}${diff.toFixed(1)}${unit}`;
  };

  return (
    <div className="grid grid-cols-4 gap-2 py-2 border-b border-border/50 last:border-0 text-sm" data-testid={`comparison-row-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="font-medium text-foreground">{label}</div>
      <div className="text-foreground">{schoolValue.toFixed(1)}{unit}</div>
      <div className="flex items-center gap-1">
        <span className="text-muted-foreground">{districtAvg.toFixed(1)}{unit}</span>
        <span className={`text-xs ${getComparisonColor(districtDiff)}`}>
          ({formatDiff(districtDiff)})
        </span>
      </div>
      {citywideAvg !== undefined && citywideDiff !== null && (
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground">{citywideAvg.toFixed(1)}{unit}</span>
          <span className={`text-xs ${getComparisonColor(citywideDiff)}`}>
            ({formatDiff(citywideDiff)})
          </span>
        </div>
      )}
    </div>
  );
}

interface InlineComparisonProps {
  value: number | null | undefined;
  districtAvg: number | null | undefined;
  unit?: string;
  higherIsBetter?: boolean;
}

export function InlineComparison({ value, districtAvg, unit = "%", higherIsBetter = true }: InlineComparisonProps) {
  if (value === null || value === undefined || districtAvg === null || districtAvg === undefined) {
    return null;
  }

  const diff = value - districtAvg;
  const absDiff = Math.abs(diff);
  const threshold = 2;
  const isNeutral = absDiff < threshold;
  const isPositive = higherIsBetter ? diff > 0 : diff < 0;
  
  const getColor = () => {
    if (isNeutral) return "text-yellow-600 dark:text-yellow-400";
    return isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400";
  };

  const getIcon = () => {
    if (isNeutral) return <Minus className="w-3 h-3" />;
    return isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />;
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={`inline-flex items-center gap-0.5 text-xs cursor-help ${getColor()}`}>
          {getIcon()}
          <span>{diff > 0 ? "+" : ""}{diff.toFixed(0)}</span>
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <div className="text-xs">
          <div>School: {value}{unit}</div>
          <div>District avg: {districtAvg.toFixed(1)}{unit}</div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
