---
name: 2-K centers data model
description: Why 2-K programs must stay a separate table and list view
---

**Rule:** NYC 2-K program sites (589 rows, `twok_centers`) are standalone daycares/family childcare providers with their own code format (e.g. 06G262, 10XAPN). Zero overlap with `schools.dbn` and zero overlap with `nyceec_centers.loc_code` — verified by JOIN counts.

**Why:** User asked to add a `has_2k` column to the main schools table populated from twok_centers; it would flag 0 schools. UX consistency was instead achieved with `TwokCenterCard` mirroring `SchoolCard` layout, rendered inline on home when the "2K" grade-band filter is active.

**How to apply:** Any future request to "merge" or cross-link 2-K data with schools should be redirected to the separate-table pattern; only search/district/zip filters apply to 2-K mode (no scores, trends, or sort options exist for these sites).
