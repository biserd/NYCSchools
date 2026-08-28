# Memory Index

- [Production database access](prod-database.md) — NEON_DATABASE_URL is NOT the production DB; prod uses its own Replit-managed DATABASE_URL, only writable via a deployed endpoint.
- [2-K centers data model](twok-data-model.md) — 2-K sites are standalone daycares; zero DBN overlap with schools or nyceec_centers, so they can never be flags on those tables.
- [Assessment rating confidence](assessment-rating-confidence.md) — Grades 3–8 result files have tested counts but no eligible denominator; retain the count-based confidence fallback.
