import { db } from "../db";
import { schoolZones, userProfiles } from "../../shared/schema";
import { eq } from "drizzle-orm";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point } from "@turf/helpers";
import type { Feature, Polygon, MultiPolygon } from "geojson";

interface ZonedSchools {
  elementary: string | null;
  middle: string | null;
  high: string | null;
}

export async function findZonedSchools(lat: number, lng: number): Promise<ZonedSchools> {
  const result: ZonedSchools = {
    elementary: null,
    middle: null,
    high: null,
  };

  const userPoint = point([lng, lat]);

  const zones = await db.select().from(schoolZones);

  for (const zone of zones) {
    if (!zone.geometry) continue;

    try {
      const geometry = zone.geometry as unknown as Polygon | MultiPolygon;
      
      if (!geometry.type || !geometry.coordinates) {
        continue;
      }

      const polygonFeature: Feature<Polygon | MultiPolygon> = {
        type: "Feature",
        properties: {},
        geometry: geometry,
      };

      const isInZone = booleanPointInPolygon(userPoint, polygonFeature);

      if (isInZone) {
        if (zone.gradeLevel === "elementary" && !result.elementary) {
          result.elementary = zone.dbn;
        } else if (zone.gradeLevel === "middle" && !result.middle) {
          result.middle = zone.dbn;
        } else if (zone.gradeLevel === "high" && !result.high) {
          result.high = zone.dbn;
        }
      }
    } catch (error) {
      console.error(`Error processing zone ${zone.dbn}:`, error);
      continue;
    }
  }

  return result;
}

export async function updateUserZonedSchools(userId: string, lat: number, lng: number): Promise<ZonedSchools> {
  const zonedSchools = await findZonedSchools(lat, lng);

  await db.update(userProfiles)
    .set({
      zonedElementaryDbn: zonedSchools.elementary,
      zonedMiddleDbn: zonedSchools.middle,
      zonedHighDbn: zonedSchools.high,
      updatedAt: new Date(),
    })
    .where(eq(userProfiles.userId, userId));

  return zonedSchools;
}

export async function getUserZonedSchools(userId: string): Promise<ZonedSchools | null> {
  const [profile] = await db.select({
    elementary: userProfiles.zonedElementaryDbn,
    middle: userProfiles.zonedMiddleDbn,
    high: userProfiles.zonedHighDbn,
  })
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId));

  if (!profile) {
    return null;
  }

  return {
    elementary: profile.elementary,
    middle: profile.middle,
    high: profile.high,
  };
}
