import assert from "node:assert/strict";
import type { School } from "@shared/schema";
import {
  LEGACY_SEO_GUIDE_REDIRECTS,
  getRelatedSeoLandings,
  getSeoLanding,
  getSeoLandingsForSchool,
  getSeoLandingsForSchoolGuide,
} from "@shared/seo-landings";

const school = {
  dbn: "15K001",
  district: 15,
  zip_code: "11215",
  has_dual_language: true,
  dual_language_languages: ["Spanish"],
  has_gifted_talented: false,
  has_prek: true,
  has_3k: false,
  is_specialized_hs: false,
  hs_admission_method: null,
  admission_method: null,
} as School;

const refs = (landings: ReturnType<typeof getSeoLandingsForSchool>) => landings.map((landing) => `${landing.kind}:${landing.slug}`);
const district15 = getSeoLanding("district", "15");
assert.ok(district15);

const reverseLinks = refs(getSeoLandingsForSchool(school));
assert.ok(reverseLinks.includes("district:15"));
assert.ok(reverseLinks.includes("neighborhood:park-slope"));
assert.ok(reverseLinks.includes("program:dual-language"));
assert.ok(reverseLinks.includes("program:spanish-dual-language"));
assert.ok(reverseLinks.includes("program:prek"));

const relatedLinks = refs(getRelatedSeoLandings(district15, [school]));
assert.ok(relatedLinks.includes("neighborhood:park-slope"));
assert.ok(relatedLinks.includes("program:dual-language"));

const brooklynLinks = refs(getSeoLandingsForSchoolGuide("brooklyn"));
assert.ok(brooklynLinks.includes("district:15"));
assert.ok(brooklynLinks.includes("neighborhood:park-slope"));

assert.equal(LEGACY_SEO_GUIDE_REDIRECTS["/nyc-schools/dual-language"], "/program/dual-language");
assert.equal(LEGACY_SEO_GUIDE_REDIRECTS["/nyc-schools/gifted-and-talented"], "/program/gifted-talented");

console.log("SEO internal-link graph regressions passed");
