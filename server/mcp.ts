import { storage } from "./storage";

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

// Tool definitions with proper annotations for OpenAI submission
const TOOLS = [
  {
    name: "search_schools",
    description: "Search for NYC public and charter schools by various criteria including name, district, borough, grade level, and minimum scores. Returns a list of matching schools with key metrics.",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Search term to match against school name"
        },
        district: {
          type: "number",
          description: "NYC school district number (1-32)"
        },
        borough: {
          type: "string",
          enum: ["Manhattan", "Bronx", "Brooklyn", "Queens", "Staten Island"],
          description: "NYC borough to filter by"
        },
        grade_band: {
          type: "string",
          enum: ["ES", "MS", "HS"],
          description: "Grade band: ES (Elementary K-5), MS (Middle 6-8), HS (High 9-12)"
        },
        min_overall_score: {
          type: "number",
          description: "Minimum overall score (0-100)"
        },
        has_gifted_talented: {
          type: "boolean",
          description: "Filter for schools with Gifted & Talented programs"
        },
        has_dual_language: {
          type: "boolean",
          description: "Filter for schools with dual language programs"
        },
        has_3k: {
          type: "boolean",
          description: "Filter for schools with 3-K programs"
        },
        has_prek: {
          type: "boolean",
          description: "Filter for schools with Pre-K programs"
        },
        limit: {
          type: "number",
          description: "Maximum number of results to return (default: 10, max: 50)"
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
    description: "Get comprehensive details about a specific NYC school by its DBN (District Borough Number). Returns full information including scores, demographics, programs, and survey data.",
    inputSchema: {
      type: "object" as const,
      properties: {
        dbn: {
          type: "string",
          description: "The school's DBN identifier (e.g., '01M015', '02X100')"
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
    description: "Compare up to 4 NYC schools side-by-side. Returns key metrics for comparison including academic scores, climate scores, demographics, and special programs.",
    inputSchema: {
      type: "object" as const,
      properties: {
        dbns: {
          type: "array",
          items: { type: "string" },
          minItems: 2,
          maxItems: 4,
          description: "Array of 2-4 school DBN identifiers to compare"
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
    description: "Get historical test score data for a specific school showing trends over the past 3-5 years. Shows ELA and Math proficiency changes year-over-year.",
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
    description: "Get the top-rated schools in NYC based on overall score. Can filter by borough, district, or grade band.",
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
          description: "Filter by district number"
        },
        grade_band: {
          type: "string",
          enum: ["ES", "MS", "HS"],
          description: "Filter by grade band"
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
    description: "Get the user's saved favorite schools. Requires authentication. Returns a list of the user's favorited schools with key details.",
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

// Calculate overall score
function calculateOverallScore(school: any): number {
  return Math.round(
    0.4 * (school.academics_score || 0) +
    0.3 * (school.climate_score || 0) +
    0.3 * (school.progress_score || 0)
  );
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

  // Format response
  return {
    total_found: filtered.length,
    schools: filtered.map(s => ({
      dbn: s.dbn,
      name: s.name,
      district: s.district,
      borough: getBoroughFromDbn(s.dbn),
      grade_band: s.grade_band,
      overall_score: calculateOverallScore(s),
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
    }))
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

  return {
    dbn: school.dbn,
    name: school.name,
    district: school.district,
    borough: getBoroughFromDbn(school.dbn),
    grade_band: school.grade_band,
    address: school.address,
    latitude: school.latitude,
    longitude: school.longitude,
    
    // Scores
    overall_score: calculateOverallScore(school),
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
    
    // NYC School Survey data
    student_safety: school.student_safety,
    student_engagement: school.student_engagement,
    guardian_satisfaction: school.guardian_satisfaction,
    teacher_quality: school.teacher_quality,
    
    // IEP Support
    iep_percent: school.iep_percent,
    
    // Parent reviews
    parent_review_average: reviewStats.averageRating,
    parent_review_count: reviewStats.totalReviews,
    
    // Links
    website_url: `https://nycschoolsratings.com/schools/${school.dbn}`
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
        overall_score: calculateOverallScore(school),
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

  return {
    dbn: params.dbn,
    trend_direction: trend.direction,
    change_percent: Math.round(trend.changePercent * 10) / 10,
    years_analyzed: trend.yearsAnalyzed,
    scores_by_year: scoresByYear,
    trend_summary: `Overall trend: ${trend.direction} (${trend.changePercent > 0 ? '+' : ''}${Math.round(trend.changePercent)}% change)`
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
  filtered.sort((a, b) => calculateOverallScore(b) - calculateOverallScore(a));

  const limit = Math.min(params.limit || 10, 25);
  filtered = filtered.slice(0, limit);

  return {
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
      overall_score: calculateOverallScore(s),
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
      overall_score: calculateOverallScore(school),
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
    total_favorites: favoriteSchools.length,
    favorites: favoriteSchools
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
