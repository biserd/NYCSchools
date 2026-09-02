import type { School } from "./schema";

export type SeoLandingKind = "district" | "neighborhood" | "program";
export type SeoLandingRef = `${SeoLandingKind}:${string}`;

export interface SeoLanding {
  kind: SeoLandingKind;
  slug: string;
  name: string;
  title: string;
  description: string;
  intro: string;
  zipCodes?: string[];
  district?: number;
  districts?: number[];
  program?: "gifted" | "dual" | "spanish" | "mandarin" | "prek" | "3k" | "specialized" | "screened";
  relatedRefs: SeoLandingRef[];
}

type NeighborhoodConfig = { slug: string; name: string; zipCodes: string[]; districts: number[] };

const NEIGHBORHOODS: NeighborhoodConfig[] = [
  { slug: "astoria", name: "Astoria", zipCodes: ["11102", "11103", "11105", "11106"], districts: [30] },
  { slug: "park-slope", name: "Park Slope", zipCodes: ["11215", "11217"], districts: [13, 15] },
  { slug: "upper-east-side", name: "Upper East Side", zipCodes: ["10021", "10028", "10065", "10075", "10128"], districts: [2] },
  { slug: "upper-west-side", name: "Upper West Side", zipCodes: ["10023", "10024", "10025"], districts: [3] },
  { slug: "forest-hills", name: "Forest Hills", zipCodes: ["11375"], districts: [28] },
  { slug: "williamsburg", name: "Williamsburg", zipCodes: ["11211", "11249"], districts: [14] },
  { slug: "brooklyn-heights", name: "Brooklyn Heights", zipCodes: ["11201"], districts: [13] },
  { slug: "long-island-city", name: "Long Island City", zipCodes: ["11101", "11109"], districts: [30] },
  { slug: "harlem", name: "Harlem", zipCodes: ["10026", "10027", "10030", "10037", "10039"], districts: [3, 4, 5] },
  { slug: "riverdale", name: "Riverdale", zipCodes: ["10463", "10471"], districts: [10] },
  { slug: "flushing", name: "Flushing", zipCodes: ["11354", "11355", "11358"], districts: [25] },
  { slug: "sunset-park", name: "Sunset Park", zipCodes: ["11220", "11232"], districts: [15, 20] },
];

function districtGroup(district: number): number[] {
  if (district <= 6) return [1, 2, 3, 4, 5, 6];
  if (district <= 12) return [7, 8, 9, 10, 11, 12];
  if (district === 31) return [31];
  if (district >= 24 && district <= 30) return [24, 25, 26, 27, 28, 29, 30];
  return [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 32];
}

export const DISTRICT_LANDINGS: SeoLanding[] = Array.from({ length: 32 }, (_, index) => {
  const district = index + 1;
  const group = districtGroup(district);
  const groupIndex = group.indexOf(district);
  const nearby = [group[groupIndex - 1], group[groupIndex + 1]].filter((value): value is number => value != null);
  return {
    kind: "district", slug: String(district), district, name: `District ${district}`,
    title: `NYC District ${district} Schools: Ratings and Comparison`,
    description: `Compare public and charter schools in NYC Community School District ${district}, including ratings, programs, enrollment, and reported outcomes.`,
    intro: `Explore schools located in Community School District ${district}. Compare the same transparent metrics, then confirm admissions eligibility and zones with NYC Public Schools.`,
    relatedRefs: [
      ...NEIGHBORHOODS.filter((item) => item.districts.includes(district)).map((item) => `neighborhood:${item.slug}` as const),
      ...nearby.map((value) => `district:${value}` as const),
      "program:dual-language", "program:gifted-talented", "program:prek",
    ],
  };
});

export const NEIGHBORHOOD_LANDINGS: SeoLanding[] = NEIGHBORHOODS.map(({ slug, name, zipCodes, districts }) => ({
  kind: "neighborhood", slug, name, zipCodes, districts,
  title: `Best Schools Near ${name}, NYC: Ratings and Comparison`,
  description: `Compare NYC public and charter schools with addresses in ZIP codes commonly associated with ${name}. Review ratings, programs, and reported outcomes.`,
  intro: `This guide lists schools whose addresses fall in ZIP codes commonly associated with ${name}. ZIP codes are not school-zone boundaries; always confirm eligibility and zoning with NYC Public Schools.`,
  relatedRefs: [
    ...districts.map((district) => `district:${district}` as const),
    ...NEIGHBORHOODS.filter((item) => item.slug !== slug && item.districts.some((district) => districts.includes(district))).map((item) => `neighborhood:${item.slug}` as const),
    "program:dual-language", "program:gifted-talented", "program:prek",
  ],
}));

const PROGRAM_CONFIG: Array<{ slug: string; name: string; program: NonNullable<SeoLanding["program"]>; relatedRefs: SeoLandingRef[] }> = [
  { slug: "gifted-talented", name: "Gifted & Talented", program: "gifted", relatedRefs: ["program:dual-language", "program:prek", "program:3k"] },
  { slug: "dual-language", name: "Dual-language", program: "dual", relatedRefs: ["program:spanish-dual-language", "program:mandarin-dual-language", "program:gifted-talented"] },
  { slug: "spanish-dual-language", name: "Spanish dual-language", program: "spanish", relatedRefs: ["program:dual-language", "program:mandarin-dual-language", "program:prek"] },
  { slug: "mandarin-dual-language", name: "Mandarin dual-language", program: "mandarin", relatedRefs: ["program:dual-language", "program:spanish-dual-language", "neighborhood:flushing"] },
  { slug: "prek", name: "Pre-K", program: "prek", relatedRefs: ["program:3k", "program:gifted-talented", "program:dual-language"] },
  { slug: "3k", name: "3-K", program: "3k", relatedRefs: ["program:prek", "program:dual-language", "program:gifted-talented"] },
  { slug: "specialized-high-schools", name: "Specialized high school", program: "specialized", relatedRefs: ["program:screened-high-schools"] },
  { slug: "screened-high-schools", name: "Screened high school", program: "screened", relatedRefs: ["program:specialized-high-schools"] },
];

export const PROGRAM_LANDINGS: SeoLanding[] = PROGRAM_CONFIG.map(({ slug, name, program, relatedRefs }) => ({
  kind: "program", slug, name, program, relatedRefs,
  title: `${name} Programs in NYC Schools`,
  description: `Find and compare NYC schools reporting ${name.toLowerCase()} options, with ratings, enrollment, and school-level details.`,
  intro: `Explore NYC schools that report ${name.toLowerCase()} options. Offerings and admissions rules can change, so verify the current program directly with the school and NYC Public Schools.`,
}));

export const SEO_LANDINGS = [...DISTRICT_LANDINGS, ...NEIGHBORHOOD_LANDINGS, ...PROGRAM_LANDINGS];
const SEO_LANDING_BY_REF = new Map(SEO_LANDINGS.map((landing) => [`${landing.kind}:${landing.slug}` as SeoLandingRef, landing]));

export const FEATURED_SEO_LANDINGS = [
  "district:2", "district:15", "district:30", "neighborhood:park-slope",
  "neighborhood:astoria", "program:dual-language", "program:gifted-talented", "program:prek",
].map((ref) => SEO_LANDING_BY_REF.get(ref as SeoLandingRef)).filter((landing): landing is SeoLanding => !!landing);

export const LEGACY_SEO_GUIDE_REDIRECTS: Record<string, string> = {
  "/nyc-schools/dual-language": "/program/dual-language",
  "/nyc-schools/gifted-and-talented": "/program/gifted-talented",
};

const SCHOOL_GUIDE_RELATED_REFS: Record<string, SeoLandingRef[]> = {
  manhattan: ["district:2", "district:3", "district:5", "neighborhood:upper-east-side", "neighborhood:upper-west-side", "neighborhood:harlem"],
  brooklyn: ["district:13", "district:14", "district:15", "district:20", "neighborhood:park-slope", "neighborhood:williamsburg", "neighborhood:sunset-park"],
  queens: ["district:25", "district:28", "district:30", "neighborhood:astoria", "neighborhood:forest-hills", "neighborhood:flushing", "neighborhood:long-island-city"],
  bronx: ["district:7", "district:9", "district:10", "district:11", "neighborhood:riverdale"],
  "staten-island": ["district:31"],
  "elementary-schools": ["program:gifted-talented", "program:dual-language", "program:prek", "program:3k"],
  "middle-schools": ["program:gifted-talented", "program:dual-language"],
  "high-schools": ["program:specialized-high-schools", "program:screened-high-schools"],
};

export function getSeoLandingsForSchoolGuide(slug: string): SeoLanding[] {
  return (SCHOOL_GUIDE_RELATED_REFS[slug] ?? []).map((ref) => SEO_LANDING_BY_REF.get(ref)).filter((landing): landing is SeoLanding => !!landing);
}

export function getSeoLanding(kind: string, slug: string): SeoLanding | undefined {
  return SEO_LANDING_BY_REF.get(`${kind}:${slug}` as SeoLandingRef);
}

export function matchesSeoLanding(school: School, landing: SeoLanding): boolean {
  if (landing.kind === "district") return school.district === landing.district;
  if (landing.kind === "neighborhood") return !!school.zip_code && !!landing.zipCodes?.includes(school.zip_code);
  switch (landing.program) {
    case "gifted": return school.has_gifted_talented === true;
    case "dual": return school.has_dual_language === true;
    case "spanish": return school.has_dual_language === true && (school.dual_language_languages ?? []).some((language) => /spanish/i.test(language));
    case "mandarin": return school.has_dual_language === true && (school.dual_language_languages ?? []).some((language) => /mandarin|chinese/i.test(language));
    case "prek": return school.has_prek === true;
    case "3k": return school.has_3k === true;
    case "specialized": return school.is_specialized_hs === true;
    case "screened": return /screen/i.test(school.hs_admission_method ?? school.admission_method ?? "");
    default: return false;
  }
}

export function getSeoLandingsForSchool(school: School): SeoLanding[] {
  return SEO_LANDINGS.filter((landing) => matchesSeoLanding(school, landing));
}

export function getRelatedSeoLandings(landing: SeoLanding, schools: School[], limit = 8): SeoLanding[] {
  const targetDbns = new Set(schools.filter((school) => matchesSeoLanding(school, landing)).map((school) => school.dbn));
  const overlaps = SEO_LANDINGS
    .filter((candidate) => candidate !== landing && candidate.kind !== landing.kind)
    .map((candidate) => ({ candidate, overlap: schools.filter((school) => targetDbns.has(school.dbn) && matchesSeoLanding(school, candidate)).length }));
  const overlapByRef = new Map(overlaps.map(({ candidate, overlap }) => [`${candidate.kind}:${candidate.slug}` as SeoLandingRef, overlap]));
  const overlapRanked = overlaps
    .filter(({ overlap }) => overlap > 0)
    .sort((a, b) => b.overlap - a.overlap || a.candidate.name.localeCompare(b.candidate.name))
    .map(({ candidate }) => candidate);
  const curated = landing.relatedRefs
    .map((ref) => SEO_LANDING_BY_REF.get(ref))
    .filter((candidate): candidate is SeoLanding => !!candidate)
    .filter((candidate) => candidate.kind === landing.kind || targetDbns.size === 0 || (overlapByRef.get(`${candidate.kind}:${candidate.slug}` as SeoLandingRef) ?? 0) > 0);
  const ordered = [...curated, ...overlapRanked];
  return ordered.filter((candidate, index) => ordered.findIndex((item) => item.kind === candidate.kind && item.slug === candidate.slug) === index).slice(0, limit);
}

export function getSeoLandingPath(landing: SeoLanding): string {
  return `/${landing.kind}/${landing.slug}`;
}
