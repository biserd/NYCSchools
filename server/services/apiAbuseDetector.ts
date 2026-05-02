import { storage } from "../storage";
import { sendApiAbuseAlert } from "../emailService";

// Two abuse signals. Each runs independently and de-dupes via the
// api_abuse_alerts table so the admin gets at most one email per (key, type)
// per day.
const RATE_LIMIT_STORM_THRESHOLD = 50; // 429s in 1h
const RATE_LIMIT_STORM_WINDOW_MS = 60 * 60_000;

const DISTINCT_IP_THRESHOLD = 10; // distinct IPs in 24h (leaked-key signal)
const DISTINCT_IP_WINDOW_MS = 24 * 60 * 60_000;

export interface AbuseDetectionResult {
  scannedKeys: number;
  alertsSent: number;
  alertsSkipped: number;
  errors: number;
  details: Array<{ keyId: number; type: string; sent: boolean; reason?: string }>;
}

export async function runAbuseDetection(): Promise<AbuseDetectionResult> {
  const result: AbuseDetectionResult = {
    scannedKeys: 0,
    alertsSent: 0,
    alertsSkipped: 0,
    errors: 0,
    details: [],
  };

  const allKeys = await storage.listAllApiKeysWithUsers();
  const activeKeys = allKeys.filter((k) => !k.revokedAt);
  result.scannedKeys = activeKeys.length;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayDateStr = today.toISOString().slice(0, 10);

  for (const key of activeKeys) {
    // --- Signal 1: rate-limit storm (50+ 429s in last hour) ---
    try {
      const since = new Date(now.getTime() - RATE_LIMIT_STORM_WINDOW_MS);
      const hits = await storage.countRecentRateLimitHits(key.id, since);
      if (hits >= RATE_LIMIT_STORM_THRESHOLD) {
        const inserted = await storage.recordAbuseAlert({
          keyId: key.id,
          alertType: "rate_limit_storm",
          alertDay: todayDateStr,
          detail: { hits, windowMs: RATE_LIMIT_STORM_WINDOW_MS, threshold: RATE_LIMIT_STORM_THRESHOLD },
        });
        if (inserted) {
          await sendApiAbuseAlert({
            keyId: key.id,
            keyPrefix: key.keyPrefix,
            keyName: key.name,
            ownerEmail: key.ownerEmail,
            alertType: "rate_limit_storm",
            summary: `${hits} rate-limit (429) responses in the last hour (threshold ${RATE_LIMIT_STORM_THRESHOLD}).`,
            detail: { hits },
          });
          result.alertsSent++;
          result.details.push({ keyId: key.id, type: "rate_limit_storm", sent: true });
        } else {
          result.alertsSkipped++;
          result.details.push({ keyId: key.id, type: "rate_limit_storm", sent: false, reason: "already-alerted-today" });
        }
      }
    } catch (err) {
      console.error("[ABUSE_DETECT] rate_limit_storm failed for key", key.id, err);
      result.errors++;
    }

    // --- Signal 2: distinct-IP spike (10+ IPs in last 24h) ---
    try {
      const since = new Date(now.getTime() - DISTINCT_IP_WINDOW_MS);
      const distinct = await storage.countDistinctIpsForKey(key.id, since);
      if (distinct >= DISTINCT_IP_THRESHOLD) {
        const inserted = await storage.recordAbuseAlert({
          keyId: key.id,
          alertType: "distinct_ip_spike",
          alertDay: todayDateStr,
          detail: { distinctIps: distinct, windowMs: DISTINCT_IP_WINDOW_MS, threshold: DISTINCT_IP_THRESHOLD },
        });
        if (inserted) {
          await sendApiAbuseAlert({
            keyId: key.id,
            keyPrefix: key.keyPrefix,
            keyName: key.name,
            ownerEmail: key.ownerEmail,
            alertType: "distinct_ip_spike",
            summary: `Key seen from ${distinct} distinct IPs in the last 24 hours (threshold ${DISTINCT_IP_THRESHOLD}). Possible leaked key.`,
            detail: { distinctIps: distinct },
          });
          result.alertsSent++;
          result.details.push({ keyId: key.id, type: "distinct_ip_spike", sent: true });
        } else {
          result.alertsSkipped++;
          result.details.push({ keyId: key.id, type: "distinct_ip_spike", sent: false, reason: "already-alerted-today" });
        }
      }
    } catch (err) {
      console.error("[ABUSE_DETECT] distinct_ip_spike failed for key", key.id, err);
      result.errors++;
    }
  }

  return result;
}

// Daily prune. Audit log is kept for 30 days, abuse alerts for 90 days.
export async function pruneApiObservabilityData(): Promise<{ logsDeleted: number; alertsDeleted: number }> {
  const now = Date.now();
  const logsCutoff = new Date(now - 30 * 24 * 60 * 60_000);
  const alertsCutoff = new Date(now - 90 * 24 * 60 * 60_000);
  const logsDeleted = await storage.pruneApiRequestLogs(logsCutoff);
  const alertsDeleted = await storage.pruneAbuseAlerts(alertsCutoff);
  return { logsDeleted, alertsDeleted };
}
