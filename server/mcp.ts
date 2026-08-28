import { storage } from "./storage";
import { getSchoolSlug, calculateOverallScore, getAssessmentConfidence, isHighSchool } from "@shared/schema";

// MCP (Model Context Protocol) Server for OpenAI ChatGPT Apps SDK
// This implements the JSON-RPC 2.0 protocol that ChatGPT uses to communicate with apps

interface MCPRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: Record<string, any>;
}

interface MCPResponse {
  jsonrpc: "2.0";
  id: string | number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

// Tool definitions with detailed descriptions for ChatGPT to understand when/how to use each tool
const TOOLS = [
  {
    name: "search_schools",
    description: `Search NYC public and charter schools using filters. Use this when the user wants to find schools matching specific criteria.

WHEN TO USE:
- User asks to find/search for schools ("find elementary schools in Brooklyn")
- User specifies criteria like borough, grade level, programs, or minimum scores
- User mentions specific school names or DBN codes (like "PS 158" or "02M158")

DATA RETURNED: For each school: name, DBN code, borough, district, grade levels, overall score (0-100), academic/climate/progress scores, ELA/Math proficiency %, special programs (G&T, dual language, 3K, Pre-K), and address with coordinates.

EXAMPLE QUERIES THIS HANDLES:
- "Find elementary schools in Manhattan with gifted programs"
- "Search for PS 234"
- "Schools in District 2 with scores above 80"
- "Brooklyn middle schools with dual language"`,
    inputSchema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "School name or DBN to search for. Handles variations like 'PS 158', 'P.S. 158', or DBN '02M158'"
        },
        district: {
          type: "number",
          description: "NYC school district number (1-32). Manhattan: 1-6, Bronx: 7-12, Brooklyn: 13-23 & 32, Queens: 24-30, Staten Island: 31"
        },
        borough: {
          type: "string",
          enum: ["Manhattan", "Bronx", "Brooklyn", "Queens", "Staten Island"],
          description: "NYC borough to filter by"
        },
        grade_band: {
          type: "string",
          enum: ["ES", "MS", "HS"],
          description: "ES = Elementary (K-5), MS = Middle School (6-8), HS = High School (9-12)"
        },
        min_overall_score: {
          type: "number",
          description: "Minimum overall score 0-100. Score combines: 40% academics + 30% climate + 30% progress. 80+ is excellent, 60-79 is good, below 60 needs improvement."
        },
        has_gifted_talented: {
          type: "boolean",
          description: "Filter for Gifted & Talented programs - accelerated curriculum for high-ability students"
        },
        has_dual_language: {
          type: "boolean",
          description: "Filter for dual language programs - instruction in English plus Spanish, Mandarin, or other languages"
        },
        has_3k: {
          type: "boolean",
          description: "Filter for 3-K for All programs - free early childhood education for 3-year-olds"
        },
        has_prek: {
          type: "boolean",
          description: "Filter for Pre-K for All programs - free universal pre-kindergarten for 4-year-olds"
        },
        limit: {
          type: "number",
          description: "Maximum results to return (default: 10, max: 50). Use higher limits for broad searches."
        }
      }
    },
    annotations: {
      readOnlyHint: true,
      openWorldHint: false,
      destructiveHint: false
    }
  },
  {
    name: "get_school_details",
    description: `Get comprehensive details about a specific NYC school. Use this when the user wants to learn more about ONE school they've identified.

WHEN TO USE:
- User asks for details about a specific school ("tell me more about PS 234")
- User wants to understand a school's strengths and weaknesses
- After a search, user wants to dive deeper into one result
- User provides a specific DBN code

DATA RETURNED: Full school profile including: all scores with breakdowns, student demographics, enrollment numbers, NYC School Survey results (parent/teacher/student satisfaction), special programs, historical context, address, and contact info.

REQUIRES: The school's DBN code (like "02M234"). If user only mentions a name, search first to find the DBN.`,
    inputSchema: {
      type: "object" as const,
      properties: {
        dbn: {
          type: "string",
          description: "The school's DBN (District Borough Number) like '02M234'. Format: 2-digit district + borough letter (M/X/K/Q/R) + 3-digit school number"
        }
      },
      required: ["dbn"]
    },
    annotations: {
      readOnlyHint: true,
      openWorldHint: false,
      destructiveHint: false
    }
  },
  {
    name: "compare_schools",
    description: `Compare 2-4 NYC schools side by side. Use this when the user is deciding between multiple schools.

WHEN TO USE:
- User asks to compare schools ("compare PS 234 and PS 158")
- User is deciding between options ("which is better, School A or School B?")
- User wants to see differences in scores, programs, or demographics

DATA RETURNED: Side-by-side comparison including: overall scores, academic/climate/progress scores, ELA & Math proficiency, enrollment size, demographics, special programs, and survey results for each school.

BEST FOR: Helping parents make decisions by showing concrete differences between their top choices.`,
    inputSchema: {
      type: "object" as const,
      properties: {
        dbns: {
          type: "array",
          items: { type: "string" },
          minItems: 2,
          maxItems: 4,
          description: "Array of 2-4 DBN codes to compare. Get DBNs from search results first if needed."
        }
      },
      required: ["dbns"]
    },
    annotations: {
      readOnlyHint: true,
      openWorldHint: false,
      destructiveHint: false
    }
  },
  {
    name: "get_school_history",
    description: `Get historical test score trends for a school over 3-5 years. Use this to understand if a school is improving or declining.

WHEN TO USE:
- User asks about school trends ("is this school getting better?")
- User wants to see test score history
- User asks about COVID recovery or year-over-year changes

DATA RETURNED: Year-by-year ELA and Math proficiency percentages from 2019-2024, showing pre-COVID, during-COVID, and recovery trajectory. Includes trend direction (improving/stable/declining).

INSIGHT: Schools that recovered well from COVID learning loss (2021-2024) often have strong leadership and support systems.`,
    inputSchema: {
      type: "object" as const,
      properties: {
        dbn: {
          type: "string",
          description: "The school's DBN identifier"
        }
      },
      required: ["dbn"]
    },
    annotations: {
      readOnlyHint: true,
      openWorldHint: false,
      destructiveHint: false
    }
  },
  {
    name: "get_top_schools",
    description: `Get the highest-rated schools in NYC, optionally filtered by location or grade level. Use this when user wants "best" schools.

WHEN TO USE:
- User asks for "best" or "top" schools ("best elementary schools in Brooklyn")
- User wants rankings or recommendations
- User is exploring options without specific criteria

DATA RETURNED: Ranked list of top schools with: name, DBN, scores, programs, and key highlights. Sorted by overall score (combines academics 40% + climate 30% + progress 30%).

NOTE: "Best" is subjective - these rankings are based on test scores and surveys, but the right school depends on each child's needs.`,
    inputSchema: {
      type: "object" as const,
      properties: {
        borough: {
          type: "string",
          enum: ["Manhattan", "Bronx", "Brooklyn", "Queens", "Staten Island"],
          description: "Filter by borough"
        },
        district: {
          type: "number",
          description: "Filter by district number (1-32)"
        },
        grade_band: {
          type: "string",
          enum: ["ES", "MS", "HS"],
          description: "ES = Elementary, MS = Middle, HS = High School"
        },
        limit: {
          type: "number",
          description: "Number of schools to return (default: 10, max: 25)"
        }
      }
    },
    annotations: {
      readOnlyHint: true,
      openWorldHint: false,
      destructiveHint: false
    }
  },
  {
    name: "get_favorites",
    description: `Get the user's saved favorite schools from their NYC School Ratings account. Requires the user to be logged in.

WHEN TO USE:
- User asks to see their saved/favorited schools
- User references "my schools" or "schools I'm considering"
- User wants to compare or review schools they previously saved

REQUIRES: User must have connected their NYC School Ratings account via OAuth. If not authenticated, prompt them to connect their account.

DATA RETURNED: List of favorited schools with full details including scores, programs, and why the user might have saved them.`,
    inputSchema: {
      type: "object" as const,
      properties: {}
    },
    annotations: {
      readOnlyHint: true,
      openWorldHint: false,
      destructiveHint: false
    }
  }
];

// Server capabilities
const SERVER_INFO = {
  name: "nyc-school-ratings",
  version: "1.0.0",
  protocolVersion: "2024-11-05"
};

const SERVER_CAPABILITIES = {
  tools: {}
};

function getRatingState(school: any) {
  const score = calculateOverallScore(school);
  const assessmentDriven = !isHighSchool(school);
  const confidence = assessmentDriven ? getAssessmentConfidence(school) : "not_applicable";
  const status = score >= 0
    ? "rated"
    : confidence === "low"
      ? "withheld_limited_participation"
      : "unavailable";
  return {
    overall_score: score >= 0 ? score : null,
    rating_status: status,
    rating_confidence: confidence,
    rating_note: status === "withheld_limited_participation"
      ? "Overall rating withheld because state-test participation was limited."
      : status === "unavailable"
        ? "Overall rating unavailable because required data was not reported."
        : null,
  };
}

// Borough mapping from DBN
function getBoroughFromDbn(dbn: string): string {
  const boroughCode = dbn.charAt(2);
  const mapping: Record<string, string> = {
    'M': 'Manhattan',
    'X': 'Bronx',
    'K': 'Brooklyn',
    'Q': 'Queens',
    'R': 'Staten Island'
  };
  return mapping[boroughCode] || 'Unknown';
}

// Normalize school name for search - handles PS/P.S., MS/M.S., IS/I.S., JHS/J.H.S. variations
function normalizeSchoolName(name: string): string {
  return name
    .toLowerCase()
    // Remove periods from abbreviations
    .replace(/\./g, '')
    // Normalize common abbreviations with spaces
    .replace(/\bp\s*s\b/g, 'ps')
    .replace(/\bm\s*s\b/g, 'ms')
    .replace(/\bi\s*s\b/g, 'is')
    .replace(/\bj\s*h\s*s\b/g, 'jhs')
    .replace(/\bh\s*s\b/g, 'hs')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

// Tool handlers
async function handleSearchSchools(params: Record<string, any>) {
  const schools = await storage.getSchools();
  let filtered = schools;

  // Apply filters
  if (params.query) {
    const normalizedQuery = normalizeSchoolName(params.query);
    filtered = filtered.filter(s => 
      normalizeSchoolName(s.name).includes(normalizedQuery) ||
      s.dbn.toLowerCase().includes(params.query.toLowerCase())
    );
  }

  if (params.district) {
    filtered = filtered.filter(s => s.district === params.district);
  }

  if (params.borough) {
    filtered = filtered.filter(s => getBoroughFromDbn(s.dbn) === params.borough);
  }

  if (params.grade_band) {
    // Map user-friendly grade band codes to actual database values
    const gradeBandMapping: Record<string, string[]> = {
      'ES': ['K-5', 'PK-5', '3K-5', 'K-8', 'PK-8'],
      'MS': ['6-8', 'K-8', 'PK-8', '6-12'],
      'HS': ['9-12', '6-12']
    };
    const matchingBands = gradeBandMapping[params.grade_band] || [params.grade_band];
    filtered = filtered.filter(s => matchingBands.some(band => s.grade_band.includes(band)));
  }

  if (params.min_overall_score) {
    filtered = filtered.filter(s => calculateOverallScore(s) >= params.min_overall_score);
  }

  if (params.has_gifted_talented === true) {
    filtered = filtered.filter(s => s.has_gifted_talented);
  }

  if (params.has_dual_language === true) {
    filtered = filtered.filter(s => s.has_dual_language);
  }

  if (params.has_3k === true) {
    filtered = filtered.filter(s => s.has_3k);
  }

  if (params.has_prek === true) {
    filtered = filtered.filter(s => s.has_prek);
  }

  // Sort by overall score descending
  filtered.sort((a, b) => calculateOverallScore(b) - calculateOverallScore(a));

  // Limit results
  const limit = Math.min(params.limit || 10, 50);
  filtered = filtered.slice(0, limit);

  // Check if this is a vague/discovery query (no specific filters)
  const isDiscoveryQuery = !params.query && !params.district && !params.borough && 
    !params.grade_band && !params.min_overall_score && !params.has_gifted_talented &&
    !params.has_dual_language && !params.has_3k && !params.has_prek;

  // If discovery query, return guidance to help narrow down
  if (isDiscoveryQuery) {
    return {
      _formatting_hint: {
        format: "discovery",
        presentation: "Ask the user clarifying questions to narrow down their search. Present the suggested searches as clickable options.",
        tone: "helpful_guide"
      },
      message: "I can help you find NYC schools! To give you the best recommendations, I need to know a bit more.",
      clarifying_questions: [
        "What grade level are you looking for? (Elementary K-5, Middle 6-8, or High School 9-12)",
        "Which borough or neighborhood do you prefer? (Manhattan, Brooklyn, Queens, Bronx, or Staten Island)",
        "Are there specific programs you're interested in? (Gifted & Talented, Dual Language, 3-K, Pre-K)"
      ],
      suggested_searches: [
        { query: "Top elementary schools in Manhattan", params: { grade_band: "ES", borough: "Manhattan", limit: 10 } },
        { query: "Brooklyn schools with Gifted & Talented programs", params: { borough: "Brooklyn", has_gifted_talented: true, limit: 10 } },
        { query: "Best middle schools in Queens", params: { grade_band: "MS", borough: "Queens", limit: 10 } },
        { query: "Schools with dual language programs", params: { has_dual_language: true, limit: 10 } }
      ],
      quick_stats: {
        total_nyc_schools: schools.length,
        elementary_count: schools.filter(s => ['K-5', 'PK-5', '3K-5'].some(b => s.grade_band.includes(b))).length,
        middle_count: schools.filter(s => s.grade_band.includes('6-8')).length,
        high_count: schools.filter(s => s.grade_band.includes('9-12')).length
      }
    };
  }

  // Format response with presentation hints
  const formattedSchools = filtered.map(s => ({
    dbn: s.dbn,
    name: s.name,
    district: s.district,
    borough: getBoroughFromDbn(s.dbn),
    grade_band: s.grade_band,
    ...getRatingState(s),
    academics_score: s.academics_score,
    climate_score: s.climate_score,
    progress_score: s.progress_score,
    ela_proficiency: s.ela_proficiency,
    math_proficiency: s.math_proficiency,
    has_gifted_talented: s.has_gifted_talented,
    has_dual_language: s.has_dual_language,
    has_3k: s.has_3k,
    has_prek: s.has_prek,
    address: s.address,
    latitude: s.latitude,
    longitude: s.longitude
  }));

  return {
    _formatting_hint: {
      format: "ranked_list",
      presentation: "Present only schools with numeric overall_score values as a numbered list ranked by score. If a matching school has overall_score null, show it separately as an unranked result using rating_note; never treat a withheld or unavailable rating as a score, rank, recommendation, winner, or loser. For rated schools show: name, overall score, key programs (G&T, dual language), and one distinguishing fact. Offer to show details for any school or compare multiple.",
      score_interpretation: "80+ = Excellent, 60-79 = Good, 40-59 = Fair, Below 40 = Needs Improvement",
      next_actions: ["Ask for details on specific school", "Compare 2-4 schools", "Refine search with more filters"]
    },
    total_found: filtered.length,
    schools: formattedSchools
  };
}

async function handleGetSchoolDetails(params: Record<string, any>) {
  if (!params.dbn) {
    throw new Error("dbn is required");
  }

  const school = await storage.getSchool(params.dbn);
  if (!school) {
    throw new Error(`School with DBN ${params.dbn} not found`);
  }

  // Get reviews stats
  let reviewStats: { averageRating: number; totalReviews: number } = { averageRating: 0, totalReviews: 0 };
  try {
    reviewStats = await storage.getSchoolRatingStats(params.dbn);
  } catch (e) {
    // Ignore review errors
  }

  const overallScore = calculateOverallScore(school);
  const ratingState = getRatingState(school);
  
  return {
    _formatting_hint: {
      format: "school_profile",
      presentation: "Present as a comprehensive school profile. Lead with the school name, location, and overall score. Organize into sections: Scores & Performance, Programs, Demographics, and Parent Feedback. Highlight strengths (scores 80+) and note any areas of concern.",
      sections: ["overview", "scores", "programs", "demographics", "parent_feedback"],
      score_interpretation: "80+ = Excellent, 60-79 = Good, 40-59 = Fair, Below 40 = Needs Improvement",
      next_actions: ["Compare with another school", "View historical trends", "Search for similar schools"]
    },
    
    // Overview
    dbn: school.dbn,
    name: school.name,
    district: school.district,
    borough: getBoroughFromDbn(school.dbn),
    grade_band: school.grade_band,
    address: school.address,
    latitude: school.latitude,
    longitude: school.longitude,
    
    // Scores with interpretation
    ...ratingState,
    overall_rating: overallScore < 0 ? ratingState.rating_note : overallScore >= 80 ? "Excellent" : overallScore >= 60 ? "Good" : overallScore >= 40 ? "Fair" : "Needs Improvement",
    academics_score: school.academics_score,
    climate_score: school.climate_score,
    progress_score: school.progress_score,
    ela_proficiency: school.ela_proficiency,
    math_proficiency: school.math_proficiency,
    
    // Demographics
    enrollment: school.enrollment,
    student_teacher_ratio: school.student_teacher_ratio,
    economic_need_index: school.economic_need_index,
    
    // Programs
    has_gifted_talented: school.has_gifted_talented,
    gt_program_type: school.gt_program_type,
    has_dual_language: school.has_dual_language,
    dual_language_languages: school.dual_language_languages,
    has_3k: school.has_3k,
    has_prek: school.has_prek,
    
    // NYC School Survey data (parent/teacher/student feedback)
    student_safety: school.student_safety,
    student_engagement: school.student_engagement,
    guardian_satisfaction: school.guardian_satisfaction,
    teacher_quality: school.teacher_quality,
    
    // IEP Support
    iep_percent: school.iep_percent,
    
    // Parent reviews from NYC School Ratings community
    parent_review_average: reviewStats.averageRating,
    parent_review_count: reviewStats.totalReviews,
    
    // Links
    website_url: `https://nycschoolsratings.com/school/${getSchoolSlug(school)}`
  };
}

async function handleCompareSchools(params: Record<string, any>) {
  if (!params.dbns || !Array.isArray(params.dbns)) {
    throw new Error("dbns array is required");
  }

  if (params.dbns.length < 2 || params.dbns.length > 4) {
    throw new Error("Please provide 2-4 schools to compare");
  }

  const schools = await Promise.all(
    params.dbns.map(async (dbn: string) => {
      const school = await storage.getSchool(dbn);
      if (!school) {
        return { dbn, error: "School not found" };
      }
      return {
        dbn: school.dbn,
        name: school.name,
        district: school.district,
        borough: getBoroughFromDbn(school.dbn),
        grade_band: school.grade_band,
        address: school.address,
        latitude: school.latitude,
        longitude: school.longitude,
        ...getRatingState(school),
        academics_score: school.academics_score,
        climate_score: school.climate_score,
        progress_score: school.progress_score,
        ela_proficiency: school.ela_proficiency,
        math_proficiency: school.math_proficiency,
        enrollment: school.enrollment,
        student_teacher_ratio: school.student_teacher_ratio,
        has_gifted_talented: school.has_gifted_talented,
        has_dual_language: school.has_dual_language,
        has_3k: school.has_3k,
        has_prek: school.has_prek
      };
    })
  );

  return {
    _formatting_hint: {
      format: "comparison_table",
       presentation: "Present as a side-by-side comparison table. Show school names as column headers. Key metrics as rows: Overall Score, Academics, Climate, Progress, ELA %, Math %, Enrollment, and Programs. For Overall Score, show the rating note when the value is null. Highlight a winner only among numeric, available values; never treat a withheld or unavailable rating as a score or winner. Conclude with a brief summary of trade-offs.",
      highlight_winner: true,
      key_metrics: ["overall_score", "academics_score", "ela_proficiency", "math_proficiency", "enrollment"],
      next_actions: ["Get details on winning school", "View trends for any school", "Search for more options"]
    },
    comparison: schools,
    metrics_explained: {
      overall_score: "Weighted average: 40% academics + 30% climate + 30% progress (0-100)",
      academics_score: "Based on ELA and Math proficiency rates",
      climate_score: "Based on school survey results about safety, engagement, and communication",
      progress_score: "Based on year-over-year improvement in test scores"
    }
  };
}

async function handleGetSchoolHistory(params: Record<string, any>) {
  if (!params.dbn) {
    throw new Error("dbn is required");
  }

  const trend = await storage.getSchoolTrend(params.dbn);
  if (!trend || trend.historicalData.length === 0) {
    return {
      dbn: params.dbn,
      message: "No historical data available for this school"
    };
  }

  // Format historical data by year
  const scoresByYear = trend.historicalData.map(h => ({
    year: h.year,
    ela_proficiency: h.ela_proficiency,
    math_proficiency: h.math_proficiency
  }));

  const trendEmoji = trend.direction === 'improving' ? '📈' : trend.direction === 'declining' ? '📉' : '➡️';
  
  return {
    _formatting_hint: {
      format: "trend_chart",
      presentation: `Present as a timeline showing year-over-year changes. Lead with the trend direction (${trend.direction}) and percentage change. Show ELA and Math scores side by side for each year. Note any significant jumps or drops, especially around 2020-2021 (COVID impact) and 2022-2024 (recovery).`,
      visualization: "line_chart",
      highlight_years: ["2019 (pre-COVID)", "2021 (COVID impact)", "2024 (current)"],
      next_actions: ["Get full school details", "Compare with another school's trends", "Search for improving schools"]
    },
    dbn: params.dbn,
    trend_direction: trend.direction,
    trend_indicator: trendEmoji,
    change_percent: Math.round(trend.changePercent * 10) / 10,
    years_analyzed: trend.yearsAnalyzed,
    scores_by_year: scoresByYear,
    trend_summary: `Overall trend: ${trend.direction} (${trend.changePercent > 0 ? '+' : ''}${Math.round(trend.changePercent)}% change)`,
    covid_context: "Note: 2020-2021 saw widespread score drops due to COVID disruptions. Schools showing strong 2022-2024 recovery demonstrate resilience."
  };
}

async function handleGetTopSchools(params: Record<string, any>) {
  const schools = await storage.getSchools();
  let filtered = schools;

  if (params.borough) {
    filtered = filtered.filter(s => getBoroughFromDbn(s.dbn) === params.borough);
  }

  if (params.district) {
    filtered = filtered.filter(s => s.district === params.district);
  }

  if (params.grade_band) {
    // Map user-friendly grade band codes to actual database values
    const gradeBandMapping: Record<string, string[]> = {
      'ES': ['K-5', 'PK-5', '3K-5', 'K-8', 'PK-8'],
      'MS': ['6-8', 'K-8', 'PK-8', '6-12'],
      'HS': ['9-12', '6-12']
    };
    const matchingBands = gradeBandMapping[params.grade_band] || [params.grade_band];
    filtered = filtered.filter(s => matchingBands.some(band => s.grade_band.includes(band)));
  }

  // Sort by overall score descending
  filtered = filtered.filter(s => calculateOverallScore(s) >= 0);
  filtered.sort((a, b) => calculateOverallScore(b) - calculateOverallScore(a));

  const limit = Math.min(params.limit || 10, 25);
  filtered = filtered.slice(0, limit);

  const filterDescription = [
    params.borough ? `in ${params.borough}` : '',
    params.grade_band === 'ES' ? 'elementary' : params.grade_band === 'MS' ? 'middle' : params.grade_band === 'HS' ? 'high' : '',
    params.district ? `District ${params.district}` : ''
  ].filter(Boolean).join(' ') || 'NYC-wide';

  return {
    _formatting_hint: {
      format: "ranked_list",
      presentation: `Present as a numbered ranking (1-${limit}). For each school show rank, name, overall score with rating (Excellent/Good/Fair), and 1-2 standout features. These are the top-rated ${filterDescription} schools.`,
      show_ranking_numbers: true,
      score_interpretation: "80+ = Excellent, 60-79 = Good, 40-59 = Fair, Below 40 = Needs Improvement",
      next_actions: ["Get details on any school", "Compare top 2-4 schools", "Filter by different criteria"]
    },
    ranking_context: `Top ${limit} ${filterDescription} schools by overall score`,
    top_schools: filtered.map((s, index) => ({
      rank: index + 1,
      dbn: s.dbn,
      name: s.name,
      district: s.district,
      borough: getBoroughFromDbn(s.dbn),
      grade_band: s.grade_band,
      address: s.address,
      latitude: s.latitude,
      longitude: s.longitude,
      ...getRatingState(s),
      overall_rating: calculateOverallScore(s) >= 80 ? "Excellent" : calculateOverallScore(s) >= 60 ? "Good" : "Fair",
      academics_score: s.academics_score,
      climate_score: s.climate_score,
      progress_score: s.progress_score
    })),
    filters_applied: {
      borough: params.borough || "all",
      district: params.district || "all",
      grade_band: params.grade_band || "all"
    }
  };
}

// Handler for get_favorites (requires authentication)
async function handleGetFavorites(userId: string) {
  const favorites = await storage.getUserFavorites(userId);
  const schools = await storage.getSchools();
  
  const favoriteSchools = favorites.map(fav => {
    const school = schools.find(s => s.dbn === fav.schoolDbn);
    if (!school) return null;
    
    return {
      dbn: school.dbn,
      name: school.name,
      district: school.district,
      borough: getBoroughFromDbn(school.dbn),
      grade_band: school.grade_band,
      address: school.address,
      latitude: school.latitude,
      longitude: school.longitude,
      ...getRatingState(school),
      academics_score: school.academics_score,
      climate_score: school.climate_score,
      progress_score: school.progress_score,
      ela_proficiency: school.ela_proficiency,
      math_proficiency: school.math_proficiency,
      has_gifted_talented: school.has_gifted_talented,
      has_dual_language: school.has_dual_language,
      favorited_at: fav.createdAt
    };
  }).filter(Boolean);

  return {
    _formatting_hint: {
      format: "favorites_list",
      presentation: favoriteSchools.length > 0 
        ? `Present the user's ${favoriteSchools.length} saved school(s) as a personalized list. For each, show name, available overall score, and key programs. When overall_score is null, show rating_note instead; never present, rank, or compare it as a numeric rating. Offer to compare favorites or get detailed info on any school.`
        : "The user hasn't saved any schools yet. Suggest starting a search to find schools to save.",
      personalized: true,
      next_actions: favoriteSchools.length > 1 
        ? ["Compare your favorites", "Get details on any school", "Search for more schools"]
        : ["Search for schools to save", "Explore top-rated schools"]
    },
    total_favorites: favoriteSchools.length,
    favorites: favoriteSchools,
    suggestion: favoriteSchools.length >= 2 
      ? `You have ${favoriteSchools.length} schools saved. Would you like me to compare them side-by-side?`
      : favoriteSchools.length === 0 
        ? "Start by searching for schools or exploring top-rated options to build your favorites list."
        : null
  };
}

// Context for authenticated MCP requests
interface MCPContext {
  userId?: string;
}

// Main MCP request handler
export async function handleMCPRequest(request: MCPRequest, context: MCPContext = {}): Promise<MCPResponse> {
  const { id, method, params = {} } = request;

  try {
    let result: any;

    switch (method) {
      case "initialize":
        result = {
          protocolVersion: SERVER_INFO.protocolVersion,
          serverInfo: SERVER_INFO,
          capabilities: SERVER_CAPABILITIES
        };
        break;

      case "tools/list":
        result = { tools: TOOLS };
        break;

      case "tools/call":
        const toolName = params.name;
        const toolParams = params.arguments || {};
        
        switch (toolName) {
          case "search_schools":
            result = await handleSearchSchools(toolParams);
            break;
          case "get_school_details":
            result = await handleGetSchoolDetails(toolParams);
            break;
          case "compare_schools":
            result = await handleCompareSchools(toolParams);
            break;
          case "get_school_history":
            result = await handleGetSchoolHistory(toolParams);
            break;
          case "get_top_schools":
            result = await handleGetTopSchools(toolParams);
            break;
          case "get_favorites":
            if (!context.userId) {
              throw new Error("Authentication required. Please connect your NYC School Ratings account.");
            }
            result = await handleGetFavorites(context.userId);
            break;
          default:
            throw new Error(`Unknown tool: ${toolName}`);
        }
        
        // Determine base URL for widget
        const widgetBaseUrl = process.env.REPLIT_DEPLOYMENT === '1' 
          ? 'https://nycschoolsratings.com'
          : process.env.REPL_SLUG 
            ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER?.toLowerCase()}.repl.co`
            : 'http://localhost:5000';
        
        // Wrap tool result in content array as per MCP spec with widget metadata
        result = {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2)
            }
          ],
          _meta: {
            "openai/widgetDomain": widgetBaseUrl,
            "openai/widgetPath": "/widget/index.html",
            "openai/widgetCSP": {
              "connect_domains": [widgetBaseUrl],
              "resource_domains": [widgetBaseUrl]
            }
          }
        };
        break;

      case "ping":
        result = {};
        break;

      default:
        return {
          jsonrpc: "2.0",
          id,
          error: {
            code: -32601,
            message: `Method not found: ${method}`
          }
        };
    }

    return {
      jsonrpc: "2.0",
      id,
      result
    };
  } catch (error: any) {
    return {
      jsonrpc: "2.0",
      id,
      error: {
        code: -32000,
        message: error.message || "Internal error"
      }
    };
  }
}
