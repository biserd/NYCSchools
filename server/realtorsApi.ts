// Realtors Dashboard API client.
// Sister site nycschoolsratings.com ↔ realtorsdashboard.com cross-promotion.
// We call /api/external/properties server-side using an API key stored in the
// REALTORS_DASHBOARD_API_KEY secret, then surface a small "Nearby Properties"
// panel on each school detail page. Results are cached per ZIP for 12 hours
// to keep our outbound API usage low.

import type { Request, Response } from "express";
import { getCached, setCache } from "./cache";

const REALTORS_BASE = "https://realtorsdashboard.com";
const REALTORS_TTL = 12 * 60 * 60 * 1000; // 12 hours
const REQUEST_TIMEOUT_MS = 8000;

export interface RealtorProperty {
  id: string;
  address: string;
  unit: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  neighborhood: string | null;
  latitude: number | null;
  longitude: number | null;
  propertyType: string | null;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  yearBuilt: number | null;
  estimatedValue: number | null;
  pricePerSqft: number | null;
  opportunityScore: number | null;
  imageUrl: string | null;
}

interface RealtorPropertiesResponse {
  success: boolean;
  data: RealtorProperty[];
  pagination: { limit: number; offset: number; count: number };
}

// Pulls the 5-digit ZIP from a NYC school address like
// "154 West 93 Street, New York, NY 10025". Falls back to null if no match.
export function extractZip(address: string | null | undefined): string | null {
  if (!address) return null;
  const m = address.match(/\b(\d{5})(?:-\d{4})?\b/);
  return m ? m[1] : null;
}

async function callRealtors<T>(path: string, params: Record<string, string | number>): Promise<T | null> {
  const apiKey = process.env.REALTORS_DASHBOARD_API_KEY;
  if (!apiKey) {
    console.warn("REALTORS_DASHBOARD_API_KEY not set — Realtors Dashboard integration disabled.");
    return null;
  }
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) qs.set(k, String(v));
  const url = `${REALTORS_BASE}${path}?${qs.toString()}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { "x-api-key": apiKey, Accept: "application/json" },
      signal: controller.signal,
    });
    if (!res.ok) {
      console.warn(`Realtors API ${path} returned ${res.status}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.warn(`Realtors API ${path} failed:`, err instanceof Error ? err.message : err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function getPropertiesForZip(zip: string, limit = 6): Promise<RealtorProperty[]> {
  if (!/^\d{5}$/.test(zip)) return [];
  const cacheKey = `realtors:zip:${zip}:${limit}`;
  const cached = getCached<RealtorProperty[]>(cacheKey);
  if (cached) return cached;

  const json = await callRealtors<RealtorPropertiesResponse>("/api/external/properties", {
    state: "NY",
    zipCodes: zip,
    limit,
  });
  const properties = json?.data ?? [];
  setCache(cacheKey, properties, REALTORS_TTL);
  return properties;
}

// GET /api/realtors/nearby/:zip  (also accepts ?zip= for back-compat)
// Mounted in server/routes.ts after sameOriginGuard, so only first-party
// browsers can hit it. Returns an empty array on any upstream failure so the
// frontend can render a graceful empty state.
export async function nearbyPropertiesHandler(req: Request, res: Response) {
  try {
    const zip = String(req.params.zip || req.query.zip || "").trim();
    if (!/^\d{5}$/.test(zip)) {
      return res.status(400).json({ error: "Invalid zip" });
    }
    const properties = await getPropertiesForZip(zip, 6);
    res.set("Cache-Control", "public, max-age=3600");
    res.json({
      zip,
      properties,
      deepLink: `https://realtorsdashboard.com/?state=NY&zipCodes=${zip}&utm_source=nycschoolsratings&utm_medium=school_page&utm_campaign=nearby_properties`,
    });
  } catch (err) {
    console.error("nearby properties handler error:", err);
    res.status(500).json({ error: "Failed to fetch nearby properties" });
  }
}
