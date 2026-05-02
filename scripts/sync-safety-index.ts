/**
 * Manual entry point for the Neighborhood Safety Index pipeline.
 *
 *   tsx scripts/sync-safety-index.ts                # full sync + recompute
 *   tsx scripts/sync-safety-index.ts --recompute    # only recompute (skip pull)
 *   tsx scripts/sync-safety-index.ts --months=12    # override pull window
 *
 * In production this should be wired to a monthly schedule (Replit
 * scheduled deployment or a cron worker).
 */

import { runSafetySync } from "../server/services/safetyIndex";

async function main() {
  const args = process.argv.slice(2);
  const skipPull = args.includes("--recompute");
  const monthsArg = args.find((a) => a.startsWith("--months="));
  const maxRowsArg = args.find((a) => a.startsWith("--max-rows="));

  const months = monthsArg ? parseInt(monthsArg.split("=")[1], 10) : 24;
  const maxRows = maxRowsArg ? parseInt(maxRowsArg.split("=")[1], 10) : undefined;

  if (!skipPull && !process.env.SOCRATA_APP_TOKEN) {
    console.warn(
      "[sync-safety-index] WARNING: SOCRATA_APP_TOKEN is not set; requests may be throttled.",
    );
  }

  const result = await runSafetySync({ months, maxRows, skipPull });
  console.log("[sync-safety-index] result:", JSON.stringify(result, null, 2));
  if (!result.success) process.exit(1);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[sync-safety-index] FAILED:", err);
    process.exit(1);
  });
