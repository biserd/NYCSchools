import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { storage } from "./storage";
import { requireApiKey, apiError } from "./apiKeyAuth";
import { getCached, setCache, CACHE_TTL_LONG } from "./cache";

// Public Developer API (v1). All routes require a valid Bearer API key issued
// to a Premium subscriber. Requests are rate-limited per key in apiKeyAuth.ts.

const BOROUGH_NAMES: Record<string, string> = {
  M: "Manhattan",
  X: "Bronx",
  K: "Brooklyn",
  Q: "Queens",
  R: "Staten Island",
};

function boroughFromDbn(dbn: string): string | null {
  const c = dbn.charAt(2).toUpperCase();
  return BOROUGH_NAMES[c] ?? null;
}

function calcOverallScore(s: { academics_score: number; climate_score: number; progress_score: number }): number {
  return Math.round(s.academics_score * 0.4 + s.climate_score * 0.3 + s.progress_score * 0.3);
}

// Public-facing serialization for a school. Snake_case mirrors the docs we
// already publish on /developers/docs.
function serializeSchool(s: any) {
  return {
    dbn: s.dbn,
    name: s.name,
    district: s.district,
    borough: boroughFromDbn(s.dbn),
    address: s.address,
    grade_band: s.grade_band,
    overall_score: calcOverallScore(s),
    academics_score: s.academics_score,
    climate_score: s.climate_score,
    progress_score: s.progress_score,
    ela_proficiency: s.ela_proficiency,
    math_proficiency: s.math_proficiency,
    science_proficiency: s.science_proficiency,
    enrollment: s.enrollment ?? null,
    student_teacher_ratio: s.student_teacher_ratio ?? null,
    economic_need_index: s.economic_need_index ?? null,
    has_3k: s.has_3k ?? false,
    has_prek: s.has_prek ?? false,
    has_gifted_talented: s.has_gifted_talented ?? false,
    latitude: s.latitude ?? null,
    longitude: s.longitude ?? null,
    phone: s.phone ?? null,
    website: s.website ?? null,
  };
}

const schoolsQuerySchema = z.object({
  district: z.string().optional(),
  grade_band: z.enum(["elementary", "middle", "high", "k-8", "k-12"]).optional(),
  has_3k: z.enum(["true", "false"]).optional(),
  has_prek: z.enum(["true", "false"]).optional(),
  has_gifted: z.enum(["true", "false"]).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const earlyChildhoodQuerySchema = z.object({
  borough: z.string().optional(),
  center_type: z.enum(["NYCEEC", "DOE", "Charter"]).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

// Borough is stored as a single letter in the DB. Accept either a letter or a
// full name from the API caller and normalize.
const BOROUGH_LETTER_BY_NAME: Record<string, string> = {
  manhattan: "M",
  bronx: "X",
  brooklyn: "K",
  queens: "Q",
  "staten island": "R",
  m: "M",
  x: "X",
  k: "K",
  q: "Q",
  r: "R",
};

function normalizeBorough(input: string | undefined): string | null {
  if (!input) return null;
  const key = input.trim().toLowerCase();
  return BOROUGH_LETTER_BY_NAME[key] ?? null;
}

function flagMatches(filter: string | undefined, value: unknown): boolean {
  if (!filter) return true;
  const want = filter === "true";
  return Boolean(value) === want;
}

function gradeBandMatches(filter: string | undefined, schoolBand: string): boolean {
  if (!filter) return true;
  const norm = (schoolBand || "").toLowerCase();
  switch (filter) {
    case "elementary":
      return norm.includes("elementary") || norm.includes("k-5") || norm.includes("k-8") || norm === "ps";
    case "middle":
      return norm.includes("middle") || norm.includes("6-8") || norm.includes("k-8");
    case "high":
      return norm.includes("high") || norm.includes("9-12") || norm.includes("k-12");
    case "k-8":
      return norm.includes("k-8");
    case "k-12":
      return norm.includes("k-12");
  }
  return true;
}

const router = Router();

router.use(requireApiKey);

// GET /api/v1/schools — list with filters + pagination
router.get("/schools", async (req: Request, res: Response) => {
  const parsed = schoolsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return apiError(res, 400, "INVALID_PARAMETER", "Invalid query parameter.", {
      issues: parsed.error.issues,
    });
  }
  const q = parsed.data;

  try {
    let allSchools = getCached<any[]>("v1:all-schools");
    if (!allSchools) {
      allSchools = await storage.getSchools();
      setCache("v1:all-schools", allSchools, CACHE_TTL_LONG);
    }

    let filtered = allSchools;
    if (q.district) {
      const d = parseInt(q.district, 10);
      if (Number.isFinite(d)) {
        filtered = filtered.filter((s) => s.district === d);
      }
    }
    if (q.grade_band) {
      filtered = filtered.filter((s) => gradeBandMatches(q.grade_band, s.grade_band));
    }
    filtered = filtered.filter((s) => flagMatches(q.has_3k, s.has_3k));
    filtered = filtered.filter((s) => flagMatches(q.has_prek, s.has_prek));
    filtered = filtered.filter((s) => flagMatches(q.has_gifted, s.has_gifted_talented));

    const total = filtered.length;
    const page = filtered.slice(q.offset, q.offset + q.limit).map(serializeSchool);

    res.json({
      data: page,
      pagination: { total, limit: q.limit, offset: q.offset },
    });
  } catch (err) {
    console.error("v1 /schools error:", err);
    apiError(res, 500, "INTERNAL_ERROR", "Failed to fetch schools.");
  }
});

// GET /api/v1/schools/:dbn — single school
router.get("/schools/:dbn", async (req: Request, res: Response) => {
  const dbn = String(req.params.dbn || "").toUpperCase();
  if (!/^\d{2}[MXKQR]\d{3}$/.test(dbn)) {
    return apiError(res, 400, "INVALID_PARAMETER", "Invalid DBN. Expected format: e.g. '02M545'.", {
      parameter: "dbn",
      provided: req.params.dbn,
    });
  }
  try {
    const school = await storage.getSchool(dbn);
    if (!school) {
      return apiError(res, 404, "NOT_FOUND", `No school found with DBN ${dbn}.`);
    }
    res.json({ data: serializeSchool(school) });
  } catch (err) {
    console.error("v1 /schools/:dbn error:", err);
    apiError(res, 500, "INTERNAL_ERROR", "Failed to fetch school.");
  }
});

// GET /api/v1/districts — list of NYC school districts with aggregate stats
router.get("/districts", async (_req: Request, res: Response) => {
  try {
    let payload = getCached<any>("v1:districts");
    if (!payload) {
      const map = await storage.getAllDistrictAverages();
      payload = Array.from(map.values())
        .sort((a, b) => a.district - b.district)
        .map((d) => ({
          district: d.district,
          school_count: d.schoolCount,
          overall_score: d.overallScore,
          academics_score: d.academicsScore,
          climate_score: d.climateScore,
          progress_score: d.progressScore,
          ela_proficiency: d.elaProficiency,
          math_proficiency: d.mathProficiency,
          enrollment: d.enrollment,
          student_teacher_ratio: d.studentTeacherRatio,
          economic_need_index: d.economicNeedIndex,
        }));
      setCache("v1:districts", payload, CACHE_TTL_LONG);
    }
    res.json({ data: payload });
  } catch (err) {
    console.error("v1 /districts error:", err);
    apiError(res, 500, "INTERNAL_ERROR", "Failed to fetch districts.");
  }
});

// GET /api/v1/early-childhood — NYCEEC center data
router.get("/early-childhood", async (req: Request, res: Response) => {
  const parsed = earlyChildhoodQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return apiError(res, 400, "INVALID_PARAMETER", "Invalid query parameter.", {
      issues: parsed.error.issues,
    });
  }
  const q = parsed.data;

  try {
    const filters: any = {};
    if (q.borough) {
      const letter = normalizeBorough(q.borough);
      if (!letter) {
        return apiError(res, 400, "INVALID_PARAMETER", "Unknown borough.", {
          parameter: "borough",
          provided: q.borough,
          accepted: ["Manhattan", "Bronx", "Brooklyn", "Queens", "Staten Island", "M", "X", "K", "Q", "R"],
        });
      }
      filters.borough = letter;
    }
    if (q.center_type) filters.centerType = q.center_type;
    const centers = await storage.getNyceecCenters(filters);

    const total = centers.length;
    const page = centers.slice(q.offset, q.offset + q.limit).map((c: any) => ({
      loc_code: c.locCode,
      name: c.name,
      center_type: c.centerType,
      borough: c.borough,
      borough_name: BOROUGH_NAMES[c.borough] ?? null,
      district: c.district ?? null,
      address: c.address,
      zip_code: c.zipCode ?? null,
      seats: c.seats ?? null,
      day_length: c.dayLength ?? null,
      extended_day: Boolean(c.extendedDay),
      meals_provided: Boolean(c.mealsProvided),
      latitude: c.latitude ?? null,
      longitude: c.longitude ?? null,
      phone: c.phone ?? null,
      website: c.website ?? null,
    }));

    res.json({
      data: page,
      pagination: { total, limit: q.limit, offset: q.offset },
    });
  } catch (err) {
    console.error("v1 /early-childhood error:", err);
    apiError(res, 500, "INTERNAL_ERROR", "Failed to fetch early childhood centers.");
  }
});

// GET /api/v1/trends/:dbn — historical performance for one school
router.get("/trends/:dbn", async (req: Request, res: Response) => {
  const dbn = String(req.params.dbn || "").toUpperCase();
  if (!/^\d{2}[MXKQR]\d{3}$/.test(dbn)) {
    return apiError(res, 400, "INVALID_PARAMETER", "Invalid DBN. Expected format: e.g. '02M545'.");
  }
  try {
    const trend = await storage.getSchoolTrend(dbn);
    if (!trend || !trend.historicalData || trend.historicalData.length === 0) {
      return apiError(res, 404, "NOT_FOUND", `No historical scores available for ${dbn}.`);
    }
    res.json({
      data: {
        dbn,
        direction: trend.direction,
        change_percent: trend.changePercent,
        years_analyzed: trend.yearsAnalyzed,
        yearly_data: trend.historicalData.map((s) => ({
          year: s.year,
          ela_proficiency: s.ela_proficiency ?? null,
          math_proficiency: s.math_proficiency ?? null,
          science_proficiency: s.science_proficiency ?? null,
        })),
      },
    });
  } catch (err) {
    console.error("v1 /trends/:dbn error:", err);
    apiError(res, 500, "INTERNAL_ERROR", "Failed to fetch trends.");
  }
});

// 404 catch-all for unknown v1 endpoints — returns the same error envelope.
router.use((_req, res) => {
  apiError(res, 404, "NOT_FOUND", "Unknown API endpoint.");
});

export default router;
