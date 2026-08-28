import assert from "node:assert/strict";
import { calculateAcademicScore, calculateOverallScore, getAssessmentConfidence } from "../shared/schema";
import type { School } from "../shared/schema";
import fs from "node:fs";
import { getSchoolSeoMeta } from "../shared/school-seo";

const brooklynNewSchool = {
  dbn: "15K146",
  grade_band: "PK-5",
  name: "Brooklyn New School",
  ela_proficiency: 48,
  math_proficiency: 28,
  climate_score: 93,
  progress_score: 91,
  ela_participation_rate: null,
  math_participation_rate: null,
  ela_tested_count: null,
  math_tested_count: null,
} as School;

assert.equal(calculateAcademicScore(brooklynNewSchool), 38);
assert.equal(calculateOverallScore(brooklynNewSchool), 70);
assert.equal(getAssessmentConfidence(brooklynNewSchool), "unknown");

const lowParticipation = {
  ...brooklynNewSchool,
  ela_participation_rate: 94,
  math_participation_rate: 96,
};
assert.equal(calculateOverallScore(lowParticipation), -1);
assert.equal(getAssessmentConfidence(lowParticipation), "low");

const lowTestedCount = {
  ...brooklynNewSchool,
  ela_tested_count: 40,
  math_tested_count: 40,
};
assert.equal(calculateOverallScore(lowTestedCount), -1);
assert.equal(getAssessmentConfidence(lowTestedCount), "low");
const lowParticipationSeo = getSchoolSeoMeta(lowTestedCount);
assert.match(lowParticipationSeo.title, /Rating Withheld/);
assert.match(lowParticipationSeo.description, /participation was limited/);
assert.doesNotMatch(`${lowParticipationSeo.title} ${lowParticipationSeo.description}`, /-1\/100/);

const sufficientParticipation = {
  ...brooklynNewSchool,
  ela_participation_rate: 95,
  math_participation_rate: 95,
};
assert.equal(calculateOverallScore(sufficientParticipation), 70);
assert.equal(getAssessmentConfidence(sufficientParticipation), "sufficient");

const justBelowThreshold = {
  ...brooklynNewSchool,
  ela_tested_count: 946,
  ela_eligible_count: 1000,
  ela_participation_rate: 95,
  math_tested_count: 950,
  math_eligible_count: 1000,
  math_participation_rate: 95,
};
assert.equal(calculateOverallScore(justBelowThreshold), -1);
assert.equal(getAssessmentConfidence(justBelowThreshold), "low");

const oddProficiencySum = {
  ...sufficientParticipation,
  ela_proficiency: 38,
  math_proficiency: 39,
  climate_score: 90,
  progress_score: 90,
};
assert.equal(calculateAcademicScore(oddProficiencySum), 39);
assert.equal(calculateOverallScore(oddProficiencySum), 70);

const combinedSchoolWithLowGrade38Participation = {
  ...lowTestedCount,
  grade_band: "6-12",
  graduation_rate_4yr: 90,
  college_readiness_rate: 80,
  progress_score: 85,
} as School;
assert.equal(calculateOverallScore(combinedSchoolWithLowGrade38Participation), 86);

console.log("rating regression tests passed");

for (const file of ["server/routes.ts", "server/routesV1.ts", "server/mcp.ts"]) {
  const source = fs.readFileSync(file, "utf8");
  assert.match(source, /calculateOverallScore/);
  assert.doesNotMatch(source, /0\.4\s*\*\s*(?:\([^)]*\))?(?:s|school)\.academics_score|(?:s|school)\.academics_score\s*\*\s*0\.4/);
}

const routesV1Source = fs.readFileSync("server/routesV1.ts", "utf8");
assert.match(routesV1Source, /overall_score:\s*score >= 0 \? score : null/);
assert.match(routesV1Source, /rating_status:\s*ratingStatus/);
assert.match(routesV1Source, /withheld_limited_participation/);

const developerDocsSource = fs.readFileSync("client/src/pages/developers-docs.tsx", "utf8");
assert.match(developerDocsSource, /"rating_confidence": "sufficient"/);
assert.match(developerDocsSource, /sufficient, low, unknown, or not_applicable/);
assert.doesNotMatch(developerDocsSource, /"rating_confidence": "high"/);

for (const file of ["client/src/components/SchoolCard.tsx", "client/src/components/SchoolDetailPanel.tsx"]) {
  const source = fs.readFileSync(file, "utf8");
  assert.match(source, /getAssessmentConfidence/);
  assert.match(source, /Withheld: limited participation/);
  assert.match(source, /ela_tested_count/);
  assert.match(source, /math_tested_count/);
}

for (const file of ["client/src/pages/map.tsx", "shared/school-seo.ts", "server/seoRenderer.ts"]) {
  const source = fs.readFileSync(file, "utf8");
  assert.match(source, /getAssessmentConfidence/);
  assert.match(source, /rating.*withheld|Rating Withheld/i);
  assert.match(source, /overall < 0|overall_score < 0/);
}

const seoRendererSource = fs.readFileSync("server/seoRenderer.ts", "utf8");
assert.match(seoRendererSource, /`\$\{school\.name\}: \$\{ratingSentence\}`/);

for (const file of ["client/src/pages/chances-calculator.tsx", "server/routes.ts"]) {
  const source = fs.readFileSync(file, "utf8");
  assert.match(source, /getAssessmentConfidence/);
  assert.match(source, /Withheld: limited/);
}

const mcpSource = fs.readFileSync("server/mcp.ts", "utf8");
assert.match(mcpSource, /overall_score:\s*score >= 0 \? score : null/);
assert.match(mcpSource, /withheld_limited_participation/);
assert.match(mcpSource, /never treat a withheld or unavailable rating as a score or winner/i);
assert.match(mcpSource, /show it separately as an unranked result using rating_note/i);

const routesSource = fs.readFileSync("server/routes.ts", "utf8");
assert.match(routesSource, /overall:\s*score >= 0 \? score : null/);
assert.match(routesSource, /o:\s*overall >= 0 \? overall : null/);
assert.match(routesSource, /NEVER rank, recommend, compare, or describe the school using an overall rating/);

const blogSource = fs.readFileSync("client/src/components/blog/DataCharts.tsx", "utf8");
assert.match(blogSource, /calculateOverallScore/);
assert.match(blogSource, /getAssessmentConfidence/);
assert.match(blogSource, /!isHighSchool\(s\)\s*&&\s*getAssessmentConfidence\(s\)/);
assert.doesNotMatch(blogSource, /calcBlogOverall|academics_score\s*\?\?\s*0/);

for (const file of ["client/src/pages/map.tsx", "client/src/pages/school-detail.tsx"]) {
  const source = fs.readFileSync(file, "utf8");
  assert.match(source, /!isHighSchool\([^)]*\)\s*&&\s*getAssessmentConfidence/);
}

console.log("public rating path regressions passed");