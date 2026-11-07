import { schoolBorough } from "../shared/early-childhood";
import { calculateOverallScore, getAssessmentConfidence, isHighSchool, isEarlyChildhoodOnly } from "@shared/schema";

export function serializeSchool(s: any) {
  const score = calculateOverallScore(s);
  const assessmentDriven = !isHighSchool(s) && !isEarlyChildhoodOnly(s);
  const confidence = assessmentDriven ? getAssessmentConfidence(s) : "not_applicable";
  const ratingStatus = isEarlyChildhoodOnly(s) ? "not_applicable" : score >= 0
    ? "rated"
    : confidence === "low"
      ? "withheld_limited_participation"
      : "unavailable";
  return {
    dbn: s.dbn,
    name: s.name,
    display_name: s.early_childhood_source?.providerName || s.name,
    program_source: s.early_childhood_source ?? null,
    district: s.district,
    borough: schoolBorough(s),
    address: s.address,
    grade_band: s.grade_band,
    overall_score: score >= 0 ? score : null,
    rating_status: ratingStatus,
    rating_confidence: confidence,
    rating_note: ratingStatus === "not_applicable" ? "K–12 academic ratings are not applicable to this provider." : ratingStatus === "withheld_limited_participation"
      ? "Overall rating withheld because state-test participation was limited."
      : ratingStatus === "unavailable"
        ? "Overall rating unavailable because required data was not reported."
        : null,
    academics_score: s.academics_score,
    climate_score: s.climate_score,
    progress_score: s.progress_score,
    ela_proficiency: s.ela_proficiency,
    math_proficiency: s.math_proficiency,
    science_proficiency: s.science_proficiency,
    assessment_year:s.assessment_year ?? null,
    assessment_source:s.assessment_source ?? null,
    science_assessment_year:s.science_assessment_year ?? null,
    demographics_year:s.demographics_year ?? null,
    demographics_source:s.demographics_source ?? null,
    ell_percent:s.ell_percent ?? null,iep_percent:s.iep_percent ?? null,
    asian_percent:s.asian_percent ?? null,black_percent:s.black_percent ?? null,
    hispanic_percent:s.hispanic_percent ?? null,white_percent:s.white_percent ?? null,
    multi_racial_percent:s.multi_racial_percent ?? null,
    enrollment: s.enrollment ?? null,
    student_teacher_ratio: s.student_teacher_ratio ?? null,
    economic_need_index: s.economic_need_index ?? null,
    has_2k: s.has_2k ?? null,
    has_3k: s.has_3k ?? null,
    has_prek: s.has_prek ?? null,
    has_gifted_talented: s.has_gifted_talented ?? false,
    latitude: s.latitude ?? null,
    longitude: s.longitude ?? null,
    phone: s.phone ?? null,
    website: s.website ?? null,
  };
}

