---
name: Production database access
description: How to write data to the production DB — and which connection strings are NOT it
---

**Rule:** The deployed app's production database is Replit-managed and only reachable from inside the production deployment. `NEON_DATABASE_URL` (a workspace secret) is a *separate* Neon instance — seeding it does nothing for the live site. The dev `DATABASE_URL` is a local helium postgres.

**Why:** We seeded 589 rows into NEON_DATABASE_URL believing it was prod; the live site still showed 0. The `executeSql({environment:"production"})` tool also queries a different replica than NEON.

**How to apply:** To write/seed production data, add a CRON_SECRET-protected endpoint (header `x-cron-secret` only — never query param), have the user republish, then POST to the production URL. Pattern exists at `/api/cron/seed-twok-centers` in server/routes.ts. Remember to invalidate the relevant server caches inside the endpoint.
