# Memory Index

- [Production database access](prod-database.md) — NEON_DATABASE_URL is NOT the production DB; prod uses its own Replit-managed DATABASE_URL, only writable via a deployed endpoint.
- [2-K centers data model](twok-data-model.md) — 2-K programs use canonical schools.has_2k, independent age-program flags, and verified official-ID relationships.
- [Assessment rating confidence](assessment-rating-confidence.md) — Grades 3–8 result files have tested counts but no eligible denominator; retain the count-based confidence fallback.
