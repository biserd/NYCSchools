import { School, calculateOverallScore, getScoreColor } from "@shared/schema";
import { getBoroughFromDBN } from "@shared/boroughMapping";
import { METRIC_TOOLTIPS } from "@shared/metricHelp";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronRight, Users, GraduationCap, MapPin, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FavoriteButton } from "./FavoriteButton";
import { Link } from "wouter";

interface SchoolCardProps {
  school: School;
}

export function SchoolCard({ school }: SchoolCardProps) {
  const overallScore = calculateOverallScore(school);
  const scoreColor = getScoreColor(overallScore);
  const borough = getBoroughFromDBN(school.dbn);

  const colorMap = {
    green: "bg-emerald-500",
    yellow: "bg-amber-500",
    red: "bg-red-500",
  };

  return (
    <Link href={`/school/${school.dbn}`} data-testid={`link-school-${school.dbn}`}>
      <Card
        data-testid={`school-card-${school.dbn}`}
        className="overflow-visible hover-elevate active-elevate-2 transition-all"
      >
        <div className="p-6 flex flex-col gap-4">
          <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2 mb-1">
              <h3 className="text-lg font-semibold text-foreground line-clamp-2 flex-1" data-testid={`text-school-name-${school.dbn}`}>
                {school.name}
              </h3>
              <FavoriteButton schoolDbn={school.dbn} variant="ghost" size="icon" />
            </div>
            <Badge variant="secondary" className="text-xs" data-testid={`badge-dbn-${school.dbn}`}>
              {school.dbn}
            </Badge>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${colorMap[scoreColor]}`} data-testid={`indicator-score-${school.dbn}`} title={METRIC_TOOLTIPS.colorLegend[scoreColor].description} />
              <span className="text-4xl font-bold tabular-nums" data-testid={`score-overall-${school.dbn}`}>
                {overallScore}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground" data-testid={`text-score-label-${school.dbn}`}>Overall</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 p-0"
                    data-testid={`button-tooltip-overall-${school.dbn}`}
                    onClick={(e) => e.stopPropagation()}
                    aria-label="Overall score information"
                  >
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs" data-testid={`tooltip-overall-${school.dbn}`}>
                  <p className="text-sm">{METRIC_TOOLTIPS.overallScore.tooltip}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 bg-muted/50 rounded-md p-3" data-testid={`container-ela-${school.dbn}`}>
            <GraduationCap className="w-4 h-4 text-muted-foreground shrink-0" data-testid={`icon-ela-${school.dbn}`} />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium tabular-nums" data-testid={`score-ela-${school.dbn}`}>{school.ela_proficiency}%</div>
              <div className="text-xs text-muted-foreground truncate" data-testid={`label-ela-${school.dbn}`}>ELA</div>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 p-0 shrink-0"
                  data-testid={`button-tooltip-ela-${school.dbn}`}
                  onClick={(e) => e.stopPropagation()}
                  aria-label="ELA proficiency information"
                >
                  <Info className="h-3 w-3 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs" data-testid={`tooltip-ela-${school.dbn}`}>
                <p className="text-sm">{METRIC_TOOLTIPS.elaProficiency.tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </div>
          
          <div className="flex items-center gap-2 bg-muted/50 rounded-md p-3" data-testid={`container-math-${school.dbn}`}>
            <GraduationCap className="w-4 h-4 text-muted-foreground shrink-0" data-testid={`icon-math-${school.dbn}`} />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium tabular-nums" data-testid={`score-math-${school.dbn}`}>{school.math_proficiency}%</div>
              <div className="text-xs text-muted-foreground truncate" data-testid={`label-math-${school.dbn}`}>Math</div>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 p-0 shrink-0"
                  data-testid={`button-tooltip-math-${school.dbn}`}
                  onClick={(e) => e.stopPropagation()}
                  aria-label="Math proficiency information"
                >
                  <Info className="h-3 w-3 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs" data-testid={`tooltip-math-${school.dbn}`}>
                <p className="text-sm">{METRIC_TOOLTIPS.mathProficiency.tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground pt-2 border-t">
          <div className="flex items-center gap-4 flex-wrap">
            {borough && (
              <span className="flex items-center gap-1" data-testid={`text-borough-${school.dbn}`}>
                <MapPin className="w-3 h-3" data-testid={`icon-borough-${school.dbn}`} />
                {borough}
              </span>
            )}
            <span data-testid={`text-district-${school.dbn}`}>District {school.district}</span>
            <span className="flex items-center gap-1" data-testid={`text-ratio-${school.dbn}`}>
              <Users className="w-3 h-3" data-testid={`icon-ratio-${school.dbn}`} />
              {school.student_teacher_ratio}:1
            </span>
          </div>
          <ChevronRight className="w-4 h-4 shrink-0" data-testid={`icon-chevron-${school.dbn}`} />
          </div>
        </div>
      </Card>
    </Link>
  );
}
