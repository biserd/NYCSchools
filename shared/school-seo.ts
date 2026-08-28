import { calculateOverallScore, getAssessmentConfidence, type School } from "./schema";

function boroughFromDbn(dbn: string): string {
  switch (dbn.charAt(2).toUpperCase()) {
    case "M": return "Manhattan";
    case "X": return "Bronx";
    case "K": return "Brooklyn";
    case "Q": return "Queens";
    case "R": return "Staten Island";
    default: return "New York";
  }
}

function isHighSchool(school: School): boolean {
  const gradeBand = school.grade_band?.toLowerCase() ?? "";
  const name = school.name?.toLowerCase() ?? "";
  return gradeBand.includes("12") || gradeBand.includes("9-") || gradeBand === "9 to 12" || name.includes("high school");
}

export function getSchoolSeoMeta(school: School): { title: string; description: string } {
  const overall = calculateOverallScore(school);
  const borough = boroughFromDbn(school.dbn);
  const highSchool = isHighSchool(school);
  const lowAssessmentConfidence = !highSchool && getAssessmentConfidence(school) === "low";
  const titleParts = [overall < 0 ? (lowAssessmentConfidence ? "Rating Withheld" : "Rating Unavailable") : `Rating ${overall}/100`];

  if (highSchool) {
    if (school.is_specialized_hs) titleParts.push("Specialized HS");
    if (school.graduation_rate_4yr != null) titleParts.push(`${school.graduation_rate_4yr}% Graduation`);
  } else {
    if (school.ela_proficiency != null) titleParts.push(`ELA ${school.ela_proficiency}%`);
    if (school.math_proficiency != null) titleParts.push(`Math ${school.math_proficiency}%`);
  }

  const descriptionParts = [
    overall < 0
      ? `${school.name} in ${borough}, District ${school.district}. ${lowAssessmentConfidence ? "Overall rating withheld because state-test participation was limited." : "Overall rating unavailable because required data was not reported."}`
      : `${school.name} rated ${overall}/100 in ${borough}, District ${school.district}.`,
  ];
  if (highSchool) {
    if (school.graduation_rate_4yr != null) descriptionParts.push(`${school.graduation_rate_4yr}% 4-year graduation rate.`);
    if (school.college_readiness_rate != null) descriptionParts.push(`${school.college_readiness_rate}% college-ready.`);
    if (school.ap_course_count != null && school.ap_course_count > 0) descriptionParts.push(`${school.ap_course_count} AP courses.`);
  } else {
    if (school.ela_proficiency != null) descriptionParts.push(`ELA proficiency: ${school.ela_proficiency}%.`);
    if (school.math_proficiency != null) descriptionParts.push(`Math proficiency: ${school.math_proficiency}%.`);
  }
  if (school.enrollment != null) descriptionParts.push(`${school.enrollment.toLocaleString()} students enrolled in grades ${school.grade_band ?? (highSchool ? "9-12" : "K-5")}.`);
  if (!highSchool) descriptionParts.push("View ratings, test scores, parent reviews, and commute times.");

  return {
    title: `${school.name} - ${titleParts.join(" | ")} | NYC School Ratings`,
    description: descriptionParts.join(" "),
  };
}
