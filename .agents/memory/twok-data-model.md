---
name: 2-K centers data model
description: How 2-K programs are integrated into the schools table despite being standalone daycares
---

**Rule:** NYC 2-K sites (589, source table `twok_centers`) are standalone daycares with their own code format (06G262, 10XAPN) — zero natural overlap with real school DBNs. Per explicit user decision they are ALSO mirrored into the `schools` table as rows with `grade_band='2K'`, `has_2k=true`, scores `-1` (renders "Insufficient Data"/N/A), enrollment/ratio 0. They render with the standard SchoolCard and school detail page.

**Why:** User rejected a separate card/list twice — required identical cards, a `has_2k` flag, and click-through to detail pages, not the map.

**How to apply:** Keep `grade_band='2K'` rows excluded from school stats and from every list/filter except the 2-K grade-band filter (see home.tsx filteredAndSortedSchools/schoolCounts). The seed cron endpoint upserts both `twok_centers` and the mirror rows in `schools` and invalidates `all-schools` cache — prod gets rows by republishing and re-running that endpoint. Detail page has a 2K-specific intro prose branch (borough-from-DBN logic is wrong for 2-K codes; avoid it).
