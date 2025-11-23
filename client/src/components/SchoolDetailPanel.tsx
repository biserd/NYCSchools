import { SchoolWithOverallScore, getScoreLabel, getScoreColor } from "@shared/schema";
import { getBoroughFromDBN } from "@shared/boroughMapping";
import { METRIC_TOOLTIPS } from "@shared/metricHelp";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Building2, Users, GraduationCap, Heart, TrendingUp, X, Shield, Briefcase, MessageSquare, MapPin, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SchoolDetailPanelProps {
  school: SchoolWithOverallScore | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SchoolDetailPanel({ school, open, onOpenChange }: SchoolDetailPanelProps) {
  if (!school) return null;

  const scoreColor = getScoreColor(school.overall_score);
  const scoreLabel = getScoreLabel(school.overall_score);
  const borough = getBoroughFromDBN(school.dbn);

  const colorMap = {
    green: "bg-emerald-500",
    yellow: "bg-amber-500",
    red: "bg-red-500",
  };

  const getBarWidth = (score: number) => `${score}%`;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent data-testid="panel-school-detail" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetClose asChild>
          <Button
            data-testid="button-close-detail"
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
        </SheetClose>

        <SheetHeader className="pb-6 space-y-3" data-testid="header-detail">
          <SheetTitle className="text-2xl font-bold text-left pr-8" data-testid="text-detail-school-name">{school.name}</SheetTitle>
          <SheetDescription className="text-sm text-left text-muted-foreground">
            Detailed information and metrics for {school.name}
          </SheetDescription>
          <div className="flex flex-col gap-2 text-left">
            <p className="text-sm text-muted-foreground" data-testid="text-detail-address">{school.address}</p>
            <div className="flex gap-2 flex-wrap" data-testid="container-badges">
              <Badge 
                variant={borough ? "default" : "secondary"} 
                data-testid="badge-detail-borough" 
                className="gap-1"
                title={borough ? undefined : "Borough information unavailable for this district"}
              >
                <MapPin className="w-3 h-3" />
                {borough || "Borough N/A"}
              </Badge>
              <Badge variant="secondary" data-testid="badge-detail-dbn">{school.dbn}</Badge>
              <Badge variant="secondary" data-testid="badge-detail-district">District {school.district}</Badge>
              <Badge variant="secondary" data-testid="badge-detail-grade">{school.grade_band}</Badge>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-6" data-testid="container-detail-content">
          <Card className="p-6" data-testid="card-snapshot">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold flex items-center gap-2" data-testid="text-snapshot-title">
                <TrendingUp className="w-5 h-5" data-testid="icon-snapshot" />
                Overall Snapshot
              </h3>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 p-0"
                    data-testid="button-tooltip-snapshot"
                    aria-label="Overall snapshot information"
                  >
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="max-w-sm" data-testid="tooltip-snapshot">
                  <p className="text-sm font-medium mb-2">Score Breakdown:</p>
                  <p className="text-sm">{METRIC_TOOLTIPS.overallScore.tooltip}</p>
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span>{METRIC_TOOLTIPS.colorLegend.green.label} (80+)</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-2 h-2 rounded-full bg-amber-500" />
                      <span>{METRIC_TOOLTIPS.colorLegend.yellow.label} (60-79)</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                      <span>{METRIC_TOOLTIPS.colorLegend.red.label} (&lt;60)</span>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="flex items-center gap-4 mb-6" data-testid="container-overall-score">
              <div className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded-full ${colorMap[scoreColor]}`} data-testid="indicator-detail-score" />
                <span className="text-5xl font-bold tabular-nums" data-testid="text-detail-overall-score">
                  {school.overall_score}
                </span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground" data-testid="label-overall-score">Overall Score</p>
                <p className="text-base font-medium" data-testid="text-detail-score-label">{scoreLabel}</p>
              </div>
            </div>

            <div className="space-y-4" data-testid="container-bars">
              <div data-testid="row-bar-academics">
                <div className="flex justify-between mb-2">
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-medium" data-testid="label-bar-academics">Academics</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-4 w-4 p-0" aria-label="Academics information">
                          <Info className="h-3 w-3 text-muted-foreground" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-sm">{METRIC_TOOLTIPS.academics.tooltip}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <span className="text-sm font-bold tabular-nums" data-testid="score-bar-academics">{school.academics_score}</span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden" data-testid="track-academics">
                  <div
                    className="h-full bg-chart-1 rounded-full transition-all"
                    style={{ width: getBarWidth(school.academics_score) }}
                    data-testid="fill-bar-academics"
                    aria-label={`Academics score: ${school.academics_score}`}
                  />
                </div>
              </div>

              <div data-testid="row-bar-climate">
                <div className="flex justify-between mb-2">
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-medium" data-testid="label-bar-climate">Climate</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-4 w-4 p-0" aria-label="Climate information">
                          <Info className="h-3 w-3 text-muted-foreground" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-sm">{METRIC_TOOLTIPS.climate.tooltip}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <span className="text-sm font-bold tabular-nums" data-testid="score-bar-climate">{school.climate_score}</span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden" data-testid="track-climate">
                  <div
                    className="h-full bg-chart-2 rounded-full transition-all"
                    style={{ width: getBarWidth(school.climate_score) }}
                    data-testid="fill-bar-climate"
                    aria-label={`Climate score: ${school.climate_score}`}
                  />
                </div>
              </div>

              <div data-testid="row-bar-progress">
                <div className="flex justify-between mb-2">
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-medium" data-testid="label-bar-progress">Progress</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-4 w-4 p-0" aria-label="Progress information">
                          <Info className="h-3 w-3 text-muted-foreground" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-sm">{METRIC_TOOLTIPS.progress.tooltip}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <span className="text-sm font-bold tabular-nums" data-testid="score-bar-progress">{school.progress_score}</span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden" data-testid="track-progress">
                  <div
                    className="h-full bg-chart-3 rounded-full transition-all"
                    style={{ width: getBarWidth(school.progress_score) }}
                    data-testid="fill-bar-progress"
                    aria-label={`Progress score: ${school.progress_score}`}
                  />
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6" data-testid="card-academics">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2" data-testid="text-academics-title">
              <GraduationCap className="w-5 h-5" data-testid="icon-academics" />
              Academics
            </h3>
            <div className="grid grid-cols-2 gap-4" data-testid="grid-academics">
              <div data-testid="container-ela-proficiency">
                <p className="text-3xl font-bold tabular-nums mb-1" data-testid="text-detail-ela">{school.ela_proficiency}%</p>
                <div className="flex items-center gap-1">
                  <p className="text-sm text-muted-foreground" data-testid="label-ela-proficiency">ELA Proficient</p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-4 w-4 p-0" aria-label="ELA proficiency information">
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-sm">{METRIC_TOOLTIPS.elaProficiency.tooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
              <div data-testid="container-math-proficiency">
                <p className="text-3xl font-bold tabular-nums mb-1" data-testid="text-detail-math">{school.math_proficiency}%</p>
                <div className="flex items-center gap-1">
                  <p className="text-sm text-muted-foreground" data-testid="label-math-proficiency">Math Proficient</p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-4 w-4 p-0" aria-label="Math proficiency information">
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-sm">{METRIC_TOOLTIPS.mathProficiency.tooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6" data-testid="card-climate">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2" data-testid="text-climate-title">
              <Heart className="w-5 h-5" data-testid="icon-climate" />
              School Climate
            </h3>
            <div data-testid="container-climate-score">
              <p className="text-3xl font-bold tabular-nums mb-1" data-testid="score-detail-climate">{school.climate_score}</p>
              <p className="text-sm text-muted-foreground" data-testid="text-climate-description">
                Climate score reflects school safety, family engagement, and student support
              </p>
            </div>
          </Card>

          {(school.student_safety !== null && school.student_safety !== undefined) || 
           (school.teacher_quality !== null && school.teacher_quality !== undefined) || 
           (school.guardian_satisfaction !== null && school.guardian_satisfaction !== undefined) ? (
            <Card className="p-6" data-testid="card-survey">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold flex items-center gap-2" data-testid="text-survey-title">
                  <MessageSquare className="w-5 h-5" data-testid="icon-survey" />
                  NYC School Survey Results
                </h3>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 p-0"
                      data-testid="button-tooltip-survey"
                      aria-label="NYC School Survey information"
                    >
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-sm" data-testid="tooltip-survey">
                    <p className="text-sm">{METRIC_TOOLTIPS.dataSource.description}</p>
                    <p className="text-sm mt-2">Percentages show the proportion of respondents answering positively to survey questions in each category.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="text-sm text-muted-foreground mb-6" data-testid="text-survey-description">
                Based on feedback from students, teachers, and parents
              </p>
              
              <div className="space-y-6" data-testid="container-survey-sections">
                {(school.student_safety !== null && school.student_safety !== undefined) ||
                 (school.student_teacher_trust !== null && school.student_teacher_trust !== undefined) ||
                 (school.student_engagement !== null && school.student_engagement !== undefined) ? (
                  <div data-testid="section-student-survey">
                    <h4 className="font-semibold mb-3 flex items-center gap-2 text-base" data-testid="text-student-survey-title">
                      <Shield className="w-4 h-4" data-testid="icon-student" />
                      Student Voice
                    </h4>
                    <div className="grid grid-cols-3 gap-4" data-testid="grid-student">
                      {school.student_safety !== null && school.student_safety !== undefined && (
                        <div data-testid="container-student-safety">
                          <p className="text-2xl font-bold tabular-nums mb-1" data-testid="text-student-safety">{school.student_safety}%</p>
                          <p className="text-xs text-muted-foreground" data-testid="label-student-safety">Safety</p>
                        </div>
                      )}
                      {school.student_teacher_trust !== null && school.student_teacher_trust !== undefined && (
                        <div data-testid="container-student-trust">
                          <p className="text-2xl font-bold tabular-nums mb-1" data-testid="text-student-trust">{school.student_teacher_trust}%</p>
                          <p className="text-xs text-muted-foreground" data-testid="label-student-trust">Teacher Trust</p>
                        </div>
                      )}
                      {school.student_engagement !== null && school.student_engagement !== undefined && (
                        <div data-testid="container-student-engagement">
                          <p className="text-2xl font-bold tabular-nums mb-1" data-testid="text-student-engagement">{school.student_engagement}%</p>
                          <p className="text-xs text-muted-foreground" data-testid="label-student-engagement">Engagement</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}

                {(school.teacher_quality !== null && school.teacher_quality !== undefined) ||
                 (school.teacher_collaboration !== null && school.teacher_collaboration !== undefined) ||
                 (school.teacher_leadership !== null && school.teacher_leadership !== undefined) ? (
                  <div data-testid="section-teacher-survey">
                    <h4 className="font-semibold mb-3 flex items-center gap-2 text-base" data-testid="text-teacher-survey-title">
                      <Briefcase className="w-4 h-4" data-testid="icon-teacher" />
                      Teacher Perspective
                    </h4>
                    <div className="grid grid-cols-3 gap-4" data-testid="grid-teacher">
                      {school.teacher_quality !== null && school.teacher_quality !== undefined && (
                        <div data-testid="container-teacher-quality">
                          <p className="text-2xl font-bold tabular-nums mb-1" data-testid="text-teacher-quality">{school.teacher_quality}%</p>
                          <p className="text-xs text-muted-foreground" data-testid="label-teacher-quality">Instruction Quality</p>
                        </div>
                      )}
                      {school.teacher_collaboration !== null && school.teacher_collaboration !== undefined && (
                        <div data-testid="container-teacher-collab">
                          <p className="text-2xl font-bold tabular-nums mb-1" data-testid="text-teacher-collab">{school.teacher_collaboration}%</p>
                          <p className="text-xs text-muted-foreground" data-testid="label-teacher-collab">Collaboration</p>
                        </div>
                      )}
                      {school.teacher_leadership !== null && school.teacher_leadership !== undefined && (
                        <div data-testid="container-teacher-leadership">
                          <p className="text-2xl font-bold tabular-nums mb-1" data-testid="text-teacher-leadership">{school.teacher_leadership}%</p>
                          <p className="text-xs text-muted-foreground" data-testid="label-teacher-leadership">Leadership</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}

                {(school.guardian_satisfaction !== null && school.guardian_satisfaction !== undefined) ||
                 (school.guardian_communication !== null && school.guardian_communication !== undefined) ||
                 (school.guardian_school_trust !== null && school.guardian_school_trust !== undefined) ? (
                  <div data-testid="section-guardian-survey">
                    <h4 className="font-semibold mb-3 flex items-center gap-2 text-base" data-testid="text-guardian-survey-title">
                      <Users className="w-4 h-4" data-testid="icon-guardian" />
                      Parent Feedback
                    </h4>
                    <div className="grid grid-cols-3 gap-4" data-testid="grid-guardian">
                      {school.guardian_satisfaction !== null && school.guardian_satisfaction !== undefined && (
                        <div data-testid="container-guardian-satisfaction">
                          <p className="text-2xl font-bold tabular-nums mb-1" data-testid="text-guardian-satisfaction">{school.guardian_satisfaction}%</p>
                          <p className="text-xs text-muted-foreground" data-testid="label-guardian-satisfaction">Satisfaction</p>
                        </div>
                      )}
                      {school.guardian_communication !== null && school.guardian_communication !== undefined && (
                        <div data-testid="container-guardian-communication">
                          <p className="text-2xl font-bold tabular-nums mb-1" data-testid="text-guardian-communication">{school.guardian_communication}%</p>
                          <p className="text-xs text-muted-foreground" data-testid="label-guardian-communication">Communication</p>
                        </div>
                      )}
                      {school.guardian_school_trust !== null && school.guardian_school_trust !== undefined && (
                        <div data-testid="container-guardian-trust">
                          <p className="text-2xl font-bold tabular-nums mb-1" data-testid="text-guardian-trust">{school.guardian_school_trust}%</p>
                          <p className="text-xs text-muted-foreground" data-testid="label-guardian-trust">School Trust</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            </Card>
          ) : null}

          <Card className="p-6" data-testid="card-details">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2" data-testid="text-details-title">
              <Building2 className="w-5 h-5" data-testid="icon-details" />
              School Details
            </h3>
            <div className="grid grid-cols-2 gap-4" data-testid="grid-details">
              <div data-testid="container-enrollment">
                <p className="text-sm text-muted-foreground mb-1" data-testid="label-enrollment">Enrollment</p>
                <p className="text-xl font-bold tabular-nums" data-testid="text-detail-enrollment">{school.enrollment}</p>
              </div>
              <div data-testid="container-grade-span">
                <p className="text-sm text-muted-foreground mb-1" data-testid="label-grade-span">Grade Span</p>
                <p className="text-xl font-bold" data-testid="text-detail-grades">{school.grade_band}</p>
              </div>
              <div className="col-span-2" data-testid="container-student-teacher">
                <p className="text-sm text-muted-foreground mb-1" data-testid="label-ratio">Student-Teacher Ratio</p>
                <p className="text-xl font-bold flex items-center gap-2" data-testid="text-detail-student-teacher-ratio">
                  <Users className="w-5 h-5 text-muted-foreground" data-testid="icon-users" />
                  {school.student_teacher_ratio}:1
                </p>
              </div>
            </div>
          </Card>

          <div className="text-xs text-muted-foreground text-center py-4" data-testid="text-data-source">
            Data sourced from NYC Department of Education School Survey and public records. Survey scores reflect feedback from students, teachers, and parents.
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
