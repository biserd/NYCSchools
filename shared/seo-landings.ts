import type { School } from "./schema";

export type SeoLandingKind = "district" | "neighborhood" | "program";

export interface SeoLanding {
  kind: SeoLandingKind;
  slug: string;
  name: string;
  title: string;
  description: string;
  intro: string;
  zipCodes?: string[];
  district?: number;
  program?: "gifted" | "dual" | "spanish" | "mandarin" | "prek" | "3k" | "specialized" | "screened";
}

export const DISTRICT_LANDINGS: SeoLanding[] = Array.from({ length: 32 }, (_, index) => {
  const district = index + 1;
  return {
    kind: "district",
    slug: String(district),
    district,
    name: `District ${district}`,
    title: `NYC District ${district} Schools: Ratings and Comparison`,
    description: `Compare public and charter schools in NYC Community School District ${district}, including ratings, programs, enrollment, and reported outcomes.`,
    intro: `Explore schools located in Community School District ${district}. Compare the same transparent metrics, then confirm admissions eligibility and zones with NYC Public Schools.`,
  };
});

const neighborhoods: Array<[string, string, string[]]> = [
  ["astoria", "Astoria", ["11102", "11103", "11105", "11106"]],
  ["park-slope", "Park Slope", ["11215", "11217"]],
  ["upper-east-side", "Upper East Side", ["10021", "10028", "10065", "10075", "10128"]],
  ["upper-west-side", "Upper West Side", ["10023", "10024", "10025"]],
  ["forest-hills", "Forest Hills", ["11375"]],
  ["williamsburg", "Williamsburg", ["11211", "11249"]],
  ["brooklyn-heights", "Brooklyn Heights", ["11201"]],
  ["long-island-city", "Long Island City", ["11101", "11109"]],
  ["harlem", "Harlem", ["10026", "10027", "10030", "10037", "10039"]],
  ["riverdale", "Riverdale", ["10463", "10471"]],
  ["flushing", "Flushing", ["11354", "11355", "11358"]],
  ["sunset-park", "Sunset Park", ["11220", "11232"]],
];

export const NEIGHBORHOOD_LANDINGS: SeoLanding[] = neighborhoods.map(([slug, name, zipCodes]) => ({
  kind: "neighborhood",
  slug,
  name,
  zipCodes,
  title: `Best Schools Near ${name}, NYC: Ratings and Comparison`,
  description: `Compare NYC public and charter schools with addresses in ZIP codes commonly associated with ${name}. Review ratings, programs, and reported outcomes.`,
  intro: `This guide lists schools whose addresses fall in ZIP codes commonly associated with ${name}. ZIP codes are not school-zone boundaries; always confirm eligibility and zoning with NYC Public Schools.`,
}));

export const PROGRAM_LANDINGS: SeoLanding[] = [
  ["gifted-talented", "Gifted & Talented", "gifted"],
  ["dual-language", "Dual-language", "dual"],
  ["spanish-dual-language", "Spanish dual-language", "spanish"],
  ["mandarin-dual-language", "Mandarin dual-language", "mandarin"],
  ["prek", "Pre-K", "prek"],
  ["3k", "3-K", "3k"],
  ["specialized-high-schools", "Specialized high school", "specialized"],
  ["screened-high-schools", "Screened high school", "screened"],
].map(([slug, name, program]) => ({
  kind: "program",
  slug,
  name,
  program: program as SeoLanding["program"],
  title: `${name} Programs in NYC Schools`,
  description: `Find and compare NYC schools reporting ${name.toLowerCase()} options, with ratings, enrollment, and school-level details.`,
  intro: `Explore NYC schools that report ${name.toLowerCase()} options. Offerings and admissions rules can change, so verify the current program directly with the school and NYC Public Schools.`,
}));

export const SEO_LANDINGS = [...DISTRICT_LANDINGS, ...NEIGHBORHOOD_LANDINGS, ...PROGRAM_LANDINGS];

export function getSeoLanding(kind: string, slug: string): SeoLanding | undefined {
  return SEO_LANDINGS.find((landing) => landing.kind === kind && landing.slug === slug);
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

export function getSeoLandingPath(landing: SeoLanding): string {
  return `/${landing.kind}/${landing.slug}`;
}
