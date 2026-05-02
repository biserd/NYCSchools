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

import { syncNypdComplaints, recomputeSafetyIndex } from "../server/services/safetyIndex";

async function main() {
  const args = process.argv.slice(2);
  const skipPull = args.includes("--recompute");
  const monthsArg = args.find((a) => a.startsWith("--months="));
  const maxRowsArg = args.find((a) => a.startsWith("--max-rows="));

  const months = monthsArg ? parseInt(monthsArg.split("=")[1], 10) : 24;
  const maxRows = maxRowsArg ? parseInt(maxRowsArg.split("=")[1], 10) : undefined;

  if (!skipPull) {
    if (!process.env.SOCRATA_APP_TOKEN) {
      console.warn(
        "[sync-safety-index] WARNING: SOCRATA_APP_TOKEN is not set; requests may be throttled.",
      );
    }
    console.log(`[sync-safety-index] Pulling NYPD complaints (last ${months} months)…`);
    const pull = await syncNypdComplaints({ months, maxRows });
    console.log(`[sync-safety-index] Pulled ${pull.inserted} rows since ${pull.cutoffISO}`);
  } else {
    console.log("[sync-safety-index] --recompute set; skipping Socrata pull.");
  }

  console.log("[sync-safety-index] Recomputing per-school safety index…");
  const recompute = await recomputeSafetyIndex();
  console.log(
    `[sync-safety-index] Done. Wrote ${recompute.rowsWritten} rows for ${recompute.schoolCount} schools.`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[sync-safety-index] FAILED:", err);
    process.exit(1);
  });
