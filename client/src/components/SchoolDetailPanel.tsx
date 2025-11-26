import { SchoolWithOverallScore, getScoreLabel, getScoreColor, getMetricColor, getQualityRatingBars, getQualityRatingBadgeClasses, getQualityRatingBarColor, getQualityRatingLabel, type MiddleSchoolDestination, isHighSchool, isCombinedSchool } from "@shared/schema";
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
import { Building2, Users, GraduationCap, Heart, TrendingUp, X, Shield, Briefcase, MessageSquare, MapPin, Info, Award, Clock, Home, School, FileCheck, Target } from "lucide-react";
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
  
  const elaColor = getMetricColor(school.ela_proficiency);
  const mathColor = getMetricColor(school.math_proficiency);
  const climateColor = getMetricColor(school.climate_score);
  const progressColor = getMetricColor(school.progress_score);

  const colorMap = {
    green: "bg-emerald-500",
    yellow: "bg-yellow-500",
    amber: "bg-amber-500",
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
              {school.has_3k && (
                <Badge variant="outline" className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700" data-testid="badge-detail-3k">
                  3-K
                </Badge>
              )}
              {school.has_prek && (
                <Badge variant="outline" className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700" data-testid="badge-detail-prek">
                  Pre-K
                </Badge>
              )}
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
                    <div className={`w-2 h-2 rounded-full ${colorMap[climateColor]}`} data-testid="indicator-climate-bar" />
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
                    <div className={`w-2 h-2 rounded-full ${colorMap[progressColor]}`} data-testid="indicator-progress-bar" />
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
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-3 h-3 rounded-full ${colorMap[elaColor]}`} data-testid="indicator-ela-detail" />
                  <p className="text-3xl font-bold tabular-nums" data-testid="text-detail-ela">{school.ela_proficiency}%</p>
                </div>
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
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-3 h-3 rounded-full ${colorMap[mathColor]}`} data-testid="indicator-math-detail" />
                  <p className="text-3xl font-bold tabular-nums" data-testid="text-detail-math">{school.math_proficiency}%</p>
                </div>
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

          {isHighSchool(school) && (
            school.graduation_rate_4yr !== null || 
            school.graduation_rate_6yr !== null || 
            school.sat_avg_total !== null || 
            school.sat_avg_reading !== null || 
            school.college_readiness_rate !== null || 
            school.ap_course_count !== null
          ) && (
            <Card className="p-6" data-testid="card-high-school-metrics">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold flex items-center gap-2" data-testid="text-hs-metrics-title">
                  <Award className="w-5 h-5" data-testid="icon-hs-metrics" />
                  High School Performance
                </h3>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6 p-0" aria-label="High school metrics information">
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-sm" data-testid="tooltip-hs-metrics">
                    <p className="text-sm">Key metrics for evaluating high school success: graduation rates, standardized test performance, and college preparation.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4" data-testid="grid-graduation">
                  {school.graduation_rate_4yr !== null && (
                    <div data-testid="container-grad-4yr">
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-3 h-3 rounded-full ${colorMap[getMetricColor(school.graduation_rate_4yr)]}`} />
                        <p className="text-3xl font-bold tabular-nums">{school.graduation_rate_4yr}%</p>
                      </div>
                      <p className="text-sm text-muted-foreground">4-Year Grad Rate</p>
                    </div>
                  )}
                  {school.graduation_rate_6yr !== null && (
                    <div data-testid="container-grad-6yr">
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-3 h-3 rounded-full ${colorMap[getMetricColor(school.graduation_rate_6yr)]}`} />
                        <p className="text-3xl font-bold tabular-nums">{school.graduation_rate_6yr}%</p>
                      </div>
                      <p className="text-sm text-muted-foreground">6-Year Grad Rate</p>
                    </div>
                  )}
                </div>

                {(school.sat_avg_reading !== null || school.sat_avg_total !== null) && (
                  <div data-testid="container-sat-scores">
                    <h4 className="font-semibold mb-3">SAT Scores</h4>
                    <div className="grid grid-cols-3 gap-4">
                      {school.sat_avg_reading !== null && (
                        <div>
                          <p className="text-2xl font-bold tabular-nums">{school.sat_avg_reading}</p>
                          <p className="text-xs text-muted-foreground">Reading</p>
                        </div>
                      )}
                      {school.sat_avg_math !== null && (
                        <div>
                          <p className="text-2xl font-bold tabular-nums">{school.sat_avg_math}</p>
                          <p className="text-xs text-muted-foreground">Math</p>
                        </div>
                      )}
                      {school.sat_avg_total !== null && (
                        <div>
                          <p className="text-2xl font-bold tabular-nums text-primary">{school.sat_avg_total}</p>
                          <p className="text-xs text-muted-foreground">Total</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {(school.college_readiness_rate !== null || school.ap_course_count !== null) && (
                  <div className="grid grid-cols-2 gap-4" data-testid="container-college-prep">
                    {school.college_readiness_rate !== null && (
                      <div data-testid="container-college-ready">
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`w-3 h-3 rounded-full ${colorMap[getMetricColor(school.college_readiness_rate)]}`} />
                          <p className="text-3xl font-bold tabular-nums">{school.college_readiness_rate}%</p>
                        </div>
                        <p className="text-sm text-muted-foreground">College Ready</p>
                      </div>
                    )}
                    {school.ap_course_count !== null && (
                      <div data-testid="container-ap-courses">
                        <p className="text-3xl font-bold tabular-nums mb-1">{school.ap_course_count}</p>
                        <p className="text-sm text-muted-foreground">AP Courses</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {isCombinedSchool(school) && (
                <p className="text-xs text-muted-foreground mt-4 border-t pt-3">
                  This K-12 school serves all grade levels. ELA and Math scores above reflect grades 3-8 state test results.
                </p>
              )}
            </Card>
          )}

          <Card className="p-6" data-testid="card-climate">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2" data-testid="text-climate-title">
              <Heart className="w-5 h-5" data-testid="icon-climate" />
              School Climate
            </h3>
            <div data-testid="container-climate-score">
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-3 h-3 rounded-full ${colorMap[climateColor]}`} data-testid="indicator-climate-detail" />
                <p className="text-3xl font-bold tabular-nums" data-testid="score-detail-climate">{school.climate_score}</p>
              </div>
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

          {(school.quality_rating_instruction || school.quality_rating_safety || school.quality_rating_family) && (
            <Card className="p-6" data-testid="card-quality-ratings">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold flex items-center gap-2" data-testid="text-quality-title">
                  <Award className="w-5 h-5" data-testid="icon-quality" />
                  NYC DOE Quality Ratings
                </h3>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6 p-0" aria-label="Quality ratings information">
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-sm">
                    <p className="text-sm">Official NYC Department of Education quality ratings based on classroom observations, data analysis, and school visits. Ratings: Excellent, Good, Fair, or Needs Improvement.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="space-y-4" data-testid="container-quality-ratings">
                {school.quality_rating_instruction && (
                  <div data-testid="container-quality-instruction">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Instruction</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-4 w-4 p-0" aria-label="Instruction rating information">
                              <Info className="h-3 w-3 text-muted-foreground" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="text-sm">{METRIC_TOOLTIPS.qualityRatingInstruction.tooltip}</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Badge variant="outline" className={getQualityRatingBadgeClasses(school.quality_rating_instruction)} data-testid="badge-quality-instruction">
                        {getQualityRatingLabel(school.quality_rating_instruction)}
                      </Badge>
                    </div>
                    <div className="flex gap-1" data-testid="bars-quality-instruction">
                      {[...Array(4)].map((_, i) => (
                        <div
                          key={i}
                          className={`h-2 flex-1 rounded-sm ${
                            i < getQualityRatingBars(school.quality_rating_instruction)
                              ? getQualityRatingBarColor(school.quality_rating_instruction)
                              : 'bg-muted'
                          }`}
                          data-testid={`bar-quality-instruction-${i}`}
                        />
                      ))}
                    </div>
                  </div>
                )}
                {school.quality_rating_safety && (
                  <div data-testid="container-quality-safety">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Safety & Respect</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-4 w-4 p-0" aria-label="Safety rating information">
                              <Info className="h-3 w-3 text-muted-foreground" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="text-sm">{METRIC_TOOLTIPS.qualityRatingSafety.tooltip}</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Badge variant="outline" className={getQualityRatingBadgeClasses(school.quality_rating_safety)} data-testid="badge-quality-safety">
                        {getQualityRatingLabel(school.quality_rating_safety)}
                      </Badge>
                    </div>
                    <div className="flex gap-1" data-testid="bars-quality-safety">
                      {[...Array(4)].map((_, i) => (
                        <div
                          key={i}
                          className={`h-2 flex-1 rounded-sm ${
                            i < getQualityRatingBars(school.quality_rating_safety)
                              ? getQualityRatingBarColor(school.quality_rating_safety)
                              : 'bg-muted'
                          }`}
                          data-testid={`bar-quality-safety-${i}`}
                        />
                      ))}
                    </div>
                  </div>
                )}
                {school.quality_rating_family && (
                  <div data-testid="container-quality-family">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Heart className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Family Engagement</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-4 w-4 p-0" aria-label="Family engagement rating information">
                              <Info className="h-3 w-3 text-muted-foreground" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="text-sm">{METRIC_TOOLTIPS.qualityRatingFamily.tooltip}</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Badge variant="outline" className={getQualityRatingBadgeClasses(school.quality_rating_family)} data-testid="badge-quality-family">
                        {getQualityRatingLabel(school.quality_rating_family)}
                      </Badge>
                    </div>
                    <div className="flex gap-1" data-testid="bars-quality-family">
                      {[...Array(4)].map((_, i) => (
                        <div
                          key={i}
                          className={`h-2 flex-1 rounded-sm ${
                            i < getQualityRatingBars(school.quality_rating_family)
                              ? getQualityRatingBarColor(school.quality_rating_family)
                              : 'bg-muted'
                          }`}
                          data-testid={`bar-quality-family-${i}`}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}

          {(school.attendance_rate !== null || school.teacher_attendance_rate !== null) && (
            <Card className="p-6" data-testid="card-attendance">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2" data-testid="text-attendance-title">
                <Clock className="w-5 h-5" data-testid="icon-attendance" />
                Attendance Metrics
              </h3>
              <div className="grid grid-cols-2 gap-4" data-testid="grid-attendance">
                {school.attendance_rate !== null && (
                  <div data-testid="container-student-attendance">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-3xl font-bold tabular-nums" data-testid="text-attendance-rate">{school.attendance_rate}%</p>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-4 w-4 p-0" aria-label="Student attendance information">
                            <Info className="h-3 w-3 text-muted-foreground" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="text-sm">{METRIC_TOOLTIPS.attendanceRate.tooltip}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <p className="text-sm text-muted-foreground">Student Attendance</p>
                  </div>
                )}
                {school.teacher_attendance_rate !== null && (
                  <div data-testid="container-teacher-attendance">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-3xl font-bold tabular-nums" data-testid="text-teacher-attendance-rate">{school.teacher_attendance_rate}%</p>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-4 w-4 p-0" aria-label="Teacher attendance information">
                            <Info className="h-3 w-3 text-muted-foreground" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="text-sm">{METRIC_TOOLTIPS.teacherAttendanceRate.tooltip}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <p className="text-sm text-muted-foreground">Teacher Attendance</p>
                  </div>
                )}
              </div>
            </Card>
          )}

          {(school.economic_need_index !== null || school.ell_percent !== null || school.iep_percent !== null) && (
            <Card className="p-6" data-testid="card-special-populations">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2" data-testid="text-special-populations-title">
                <Home className="w-5 h-5" data-testid="icon-special-populations" />
                Student Demographics
              </h3>
              <div className="grid grid-cols-3 gap-4" data-testid="grid-special-populations">
                {school.economic_need_index !== null && (
                  <div data-testid="container-economic-need">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-2xl font-bold tabular-nums" data-testid="text-economic-need">{school.economic_need_index}%</p>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-4 w-4 p-0" aria-label="Economic need information">
                            <Info className="h-3 w-3 text-muted-foreground" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="text-sm">{METRIC_TOOLTIPS.economicNeedIndex.tooltip}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <p className="text-xs text-muted-foreground">Economic Need Index</p>
                  </div>
                )}
                {school.ell_percent !== null && (
                  <div data-testid="container-ell">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-2xl font-bold tabular-nums" data-testid="text-ell">{school.ell_percent}%</p>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-4 w-4 p-0" aria-label="ELL information">
                            <Info className="h-3 w-3 text-muted-foreground" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="text-sm">{METRIC_TOOLTIPS.ellPercent.tooltip}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <p className="text-xs text-muted-foreground">ELL Students</p>
                  </div>
                )}
                {school.iep_percent !== null && (
                  <div data-testid="container-iep">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-2xl font-bold tabular-nums" data-testid="text-iep">{school.iep_percent}%</p>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-4 w-4 p-0" aria-label="IEP information">
                            <Info className="h-3 w-3 text-muted-foreground" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="text-sm">{METRIC_TOOLTIPS.iepPercent.tooltip}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <p className="text-xs text-muted-foreground">IEP Students</p>
                  </div>
                )}
              </div>

              {/* Race/Ethnicity Demographics */}
              {(school.asian_percent !== null || school.black_percent !== null || school.hispanic_percent !== null || school.white_percent !== null || school.multi_racial_percent !== null) && (
                <div className="mt-6">
                  <h4 className="text-sm font-semibold mb-3" data-testid="text-diversity-title">Racial & Ethnic Diversity</h4>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3" data-testid="grid-diversity">
                    {school.asian_percent !== null && (
                      <div data-testid="container-asian-percent">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-xl font-bold tabular-nums" data-testid="text-asian-percent">{school.asian_percent}%</p>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-4 w-4 p-0" aria-label="Asian students information">
                                <Info className="h-3 w-3 text-muted-foreground" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="text-sm">{METRIC_TOOLTIPS.asianPercent.tooltip}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <p className="text-xs text-muted-foreground">Asian</p>
                      </div>
                    )}
                    {school.black_percent !== null && (
                      <div data-testid="container-black-percent">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-xl font-bold tabular-nums" data-testid="text-black-percent">{school.black_percent}%</p>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-4 w-4 p-0" aria-label="Black students information">
                                <Info className="h-3 w-3 text-muted-foreground" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="text-sm">{METRIC_TOOLTIPS.blackPercent.tooltip}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <p className="text-xs text-muted-foreground">Black</p>
                      </div>
                    )}
                    {school.hispanic_percent !== null && (
                      <div data-testid="container-hispanic-percent">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-xl font-bold tabular-nums" data-testid="text-hispanic-percent">{school.hispanic_percent}%</p>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-4 w-4 p-0" aria-label="Hispanic/Latino students information">
                                <Info className="h-3 w-3 text-muted-foreground" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="text-sm">{METRIC_TOOLTIPS.hispanicPercent.tooltip}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <p className="text-xs text-muted-foreground">Hispanic/Latino</p>
                      </div>
                    )}
                    {school.white_percent !== null && (
                      <div data-testid="container-white-percent">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-xl font-bold tabular-nums" data-testid="text-white-percent">{school.white_percent}%</p>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-4 w-4 p-0" aria-label="White students information">
                                <Info className="h-3 w-3 text-muted-foreground" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="text-sm">{METRIC_TOOLTIPS.whitePercent.tooltip}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <p className="text-xs text-muted-foreground">White</p>
                      </div>
                    )}
                    {school.multi_racial_percent !== null && (
                      <div data-testid="container-multi-racial-percent">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-xl font-bold tabular-nums" data-testid="text-multi-racial-percent">{school.multi_racial_percent}%</p>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-4 w-4 p-0" aria-label="Multi-racial students information">
                                <Info className="h-3 w-3 text-muted-foreground" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="text-sm">{METRIC_TOOLTIPS.multiRacialPercent.tooltip}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <p className="text-xs text-muted-foreground">Multi-Racial</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Card>
          )}

          {(school.principal_experience_years !== null || school.teacher_experience_percent !== null) && (
            <Card className="p-6" data-testid="card-staff-experience">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2" data-testid="text-staff-title">
                <Briefcase className="w-5 h-5" data-testid="icon-staff" />
                Staff Experience
              </h3>
              <div className="grid grid-cols-2 gap-4" data-testid="grid-staff">
                {school.principal_experience_years !== null && (
                  <div data-testid="container-principal-tenure">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-3xl font-bold tabular-nums" data-testid="text-principal-experience">{school.principal_experience_years}</p>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-4 w-4 p-0" aria-label="Principal tenure information">
                            <Info className="h-3 w-3 text-muted-foreground" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="text-sm">{METRIC_TOOLTIPS.principalExperienceYears.tooltip}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <p className="text-sm text-muted-foreground">Years Principal Tenure</p>
                  </div>
                )}
                {school.teacher_experience_percent !== null && (
                  <div data-testid="container-teacher-experience">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-3xl font-bold tabular-nums" data-testid="text-teacher-experience">{school.teacher_experience_percent}%</p>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-4 w-4 p-0" aria-label="Teacher experience information">
                            <Info className="h-3 w-3 text-muted-foreground" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="text-sm">{METRIC_TOOLTIPS.teacherExperiencePercent.tooltip}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <p className="text-sm text-muted-foreground">Experienced Teachers</p>
                  </div>
                )}
              </div>
            </Card>
          )}

          {(school.admission_method || school.accountability_status || school.next_level_readiness !== null) && (
            <Card className="p-6" data-testid="card-admissions">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2" data-testid="text-admissions-title">
                <FileCheck className="w-5 h-5" data-testid="icon-admissions" />
                Admissions & Accountability
              </h3>
              <div className="space-y-4" data-testid="container-admissions">
                {school.admission_method && (
                  <div data-testid="container-admission-method">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm text-muted-foreground">Admission Method</p>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-4 w-4 p-0" aria-label="Admission method information">
                            <Info className="h-3 w-3 text-muted-foreground" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="text-sm">{METRIC_TOOLTIPS.admissionMethod.tooltip}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Badge variant="secondary" data-testid="badge-admission-method">{school.admission_method}</Badge>
                  </div>
                )}
                {school.accountability_status && (
                  <div data-testid="container-accountability">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm text-muted-foreground">Accountability Status</p>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-4 w-4 p-0" aria-label="Accountability status information">
                            <Info className="h-3 w-3 text-muted-foreground" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="text-sm">{METRIC_TOOLTIPS.accountabilityStatus.tooltip}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Badge variant="outline" data-testid="badge-accountability">{school.accountability_status}</Badge>
                  </div>
                )}
                {school.next_level_readiness !== null && (
                  <div data-testid="container-readiness">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm text-muted-foreground">Next Grade Readiness</p>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-4 w-4 p-0" aria-label="Next grade readiness information">
                            <Info className="h-3 w-3 text-muted-foreground" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="text-sm">{METRIC_TOOLTIPS.nextLevelReadiness.tooltip}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <p className="text-2xl font-bold tabular-nums" data-testid="text-readiness">{school.next_level_readiness}%</p>
                  </div>
                )}
              </div>
            </Card>
          )}

          {(() => {
            const pipeline = school.middle_schools_pipeline as MiddleSchoolDestination[] | null;
            if (!pipeline || !Array.isArray(pipeline) || pipeline.length === 0) return null;
            return (
              <Card className="p-6" data-testid="card-middle-schools">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold flex items-center gap-2" data-testid="text-middle-schools-title">
                    <School className="w-5 h-5" data-testid="icon-middle-schools" />
                    Middle School Pipeline
                  </h3>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6 p-0" aria-label="Middle school pipeline information">
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-sm">{METRIC_TOOLTIPS.middleSchoolsPipeline.tooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="space-y-3" data-testid="container-middle-schools">
                  {pipeline.map((ms, idx) => (
                    <div key={idx} className="flex items-center justify-between" data-testid={`middle-school-${idx}`}>
                      <div>
                        <p className="font-medium" data-testid={`middle-school-name-${idx}`}>{ms.name}</p>
                        {ms.dbn && <p className="text-xs text-muted-foreground" data-testid={`middle-school-dbn-${idx}`}>{ms.dbn}</p>}
                      </div>
                      {ms.percent && (
                        <Badge variant="secondary" data-testid={`middle-school-percent-${idx}`}>{ms.percent}%</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            );
          })()}

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

          <div className="text-xs text-muted-foreground text-center py-4 space-y-1" data-testid="text-data-source">
            <p>Data from NYC Department of Education School Survey and public records.</p>
            <p>Test scores and demographics: 2021-22 to 2022-23 | Climate/Progress: 2023-2024</p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
