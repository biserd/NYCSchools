export interface SchoolGuide {
  slug: string;
  title: string;
  description: string;
  heading: string;
  eyebrow: string;
  intro: string;
  searchHref: string;
  searchLabel: string;
  highlights: string[];
}

export const SCHOOL_GUIDES: SchoolGuide[] = [
  {
    slug: "manhattan",
    title: "Best Schools in Manhattan | NYC School Ratings",
    description: "Explore and compare Manhattan public, charter, private, and early-childhood schools by ratings, programs, district, admissions context, and commute fit.",
    heading: "Find the Best Schools in Manhattan",
    eyebrow: "Manhattan school guide",
    intro: "Compare schools across Manhattan's neighborhoods and districts with the same transparent academic, climate, program, and family-fit data used throughout NYC School Ratings.",
    searchHref: "/?q=Manhattan",
    searchLabel: "Browse Manhattan schools",
    highlights: ["Compare public and charter options", "Review programs and admissions context", "Build a commute-aware shortlist"],
  },
  {
    slug: "brooklyn",
    title: "Best Schools in Brooklyn | NYC School Ratings",
    description: "Explore and compare Brooklyn schools by ratings, district, programs, admissions context, demographics, and commute fit.",
    heading: "Find the Best Schools in Brooklyn",
    eyebrow: "Brooklyn school guide",
    intro: "Brooklyn families can compare schools across a wide range of districts, grade bands, programs, and admissions rules without relying on a single ranking.",
    searchHref: "/?q=Brooklyn",
    searchLabel: "Browse Brooklyn schools",
    highlights: ["Explore schools across Brooklyn districts", "Compare academic and climate measures", "Save and compare promising options"],
  },
  {
    slug: "queens",
    title: "Best Schools in Queens | NYC School Ratings",
    description: "Explore and compare Queens schools by ratings, district, programs, admissions context, demographics, and commute fit.",
    heading: "Find the Best Schools in Queens",
    eyebrow: "Queens school guide",
    intro: "Use transparent school data to explore Queens options by neighborhood, district, grade range, language programs, and the factors that matter to your family.",
    searchHref: "/?q=Queens",
    searchLabel: "Browse Queens schools",
    highlights: ["Compare neighborhood and district options", "Find dual-language programs", "Check commute and school fit"],
  },
  {
    slug: "bronx",
    title: "Best Schools in the Bronx | NYC School Ratings",
    description: "Explore and compare Bronx schools by ratings, district, programs, admissions context, demographics, and commute fit.",
    heading: "Find the Best Schools in the Bronx",
    eyebrow: "Bronx school guide",
    intro: "Explore Bronx public and charter schools with academic, student-progress, school-climate, program, and admissions context in one place.",
    searchHref: "/?q=Bronx",
    searchLabel: "Browse Bronx schools",
    highlights: ["Compare district and charter schools", "Review progress and climate data", "Create a balanced shortlist"],
  },
  {
    slug: "staten-island",
    title: "Best Schools in Staten Island | NYC School Ratings",
    description: "Explore and compare Staten Island schools by ratings, district, programs, admissions context, demographics, and commute fit.",
    heading: "Find the Best Schools in Staten Island",
    eyebrow: "Staten Island school guide",
    intro: "Compare Staten Island schools using transparent performance, program, student-experience, and practical commute information.",
    searchHref: "/?q=Staten Island",
    searchLabel: "Browse Staten Island schools",
    highlights: ["Explore elementary through high school", "Compare programs and outcomes", "Plan around location and commute"],
  },
  {
    slug: "elementary-schools",
    title: "Best Elementary Schools in NYC | Compare K-5 Schools",
    description: "Compare NYC elementary schools using ratings, ELA and math performance, school climate, programs, admissions context, and parent reviews.",
    heading: "Compare NYC Elementary Schools",
    eyebrow: "NYC elementary school guide",
    intro: "Look beyond a single score when comparing K-5 options. Review academics, student progress, school climate, programs, admissions context, and daily logistics together.",
    searchHref: "/?grade=Elementary",
    searchLabel: "Browse elementary schools",
    highlights: ["Compare ELA, math, and progress", "Find zoned and program options", "Review climate and family-fit signals"],
  },
  {
    slug: "middle-schools",
    title: "Best Middle Schools in NYC | Compare NYC Schools",
    description: "Compare NYC middle schools by ratings, academics, school climate, programs, admissions context, demographics, and commute fit.",
    heading: "Compare NYC Middle Schools",
    eyebrow: "NYC middle school guide",
    intro: "Build a balanced middle-school list using academic results, student progress, school culture, available programs, admissions rules, and practical fit.",
    searchHref: "/?grade=Middle",
    searchLabel: "Browse middle schools",
    highlights: ["Compare academics and student progress", "Understand program and admissions context", "Shortlist schools side by side"],
  },
  {
    slug: "high-schools",
    title: "Best High Schools in NYC | Compare Graduation & College Readiness",
    description: "Compare NYC high schools by graduation rate, college readiness, AP offerings, programs, admissions methods, climate, and commute fit.",
    heading: "Compare NYC High Schools",
    eyebrow: "NYC high school guide",
    intro: "Compare graduation, college-readiness, course offerings, student experience, admissions methods, and commute fit before building a high-school application list.",
    searchHref: "/?grade=HighSchool",
    searchLabel: "Browse high schools",
    highlights: ["Review graduation and college-readiness data", "Compare admissions methods and programs", "Build a diversified application list"],
  },
  {
    slug: "dual-language",
    title: "NYC Dual Language Schools | Find & Compare Programs",
    description: "Find NYC schools with dual-language programs and compare ratings, grade ranges, districts, school climate, admissions context, and commute fit.",
    heading: "Find NYC Dual-Language Schools",
    eyebrow: "NYC language program guide",
    intro: "Find schools reporting dual-language programs, then confirm the language, grade availability, eligibility, and current admissions details with the school and MySchools.",
    searchHref: "/?dl=DualLanguage",
    searchLabel: "Browse dual-language schools",
    highlights: ["Filter schools reporting dual-language programs", "Compare programs with broader school data", "Verify current offerings before applying"],
  },
  {
    slug: "gifted-and-talented",
    title: "NYC Gifted & Talented Schools | Find G&T Programs",
    description: "Find NYC schools with Gifted and Talented programs and compare ratings, districts, grade ranges, admissions context, climate, and commute fit.",
    heading: "Find NYC Gifted and Talented Programs",
    eyebrow: "NYC G&T program guide",
    intro: "Explore schools reporting Gifted and Talented programs while keeping program eligibility, current seat availability, priority rules, and broader school fit in view.",
    searchHref: "/?gt=G%26T",
    searchLabel: "Browse G&T schools",
    highlights: ["Find schools reporting G&T programs", "Compare school-wide data and fit", "Confirm current eligibility in MySchools"],
  },
];

export const SCHOOL_GUIDE_BY_SLUG = new Map(SCHOOL_GUIDES.map((guide) => [guide.slug, guide]));

// These legacy program-guide URLs permanently redirect to the richer,
// data-backed program collections. Keep their definitions only so old links
// remain understandable while excluding them from discovery feeds.
export const CANONICAL_SCHOOL_GUIDES = SCHOOL_GUIDES.filter(
  (guide) => guide.slug !== "dual-language" && guide.slug !== "gifted-and-talented",
);
