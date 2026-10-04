# Pricing-page coverage claims

Snapshot checked against the production Cloudflare D1 database on October 3, 2026. The counts in the Family Premium feature checklist live in `shared/pricing-coverage.ts` so the client page and server-rendered fallback agree. Refresh the snapshot after a manual school-data import; do not silently add these categories together.

| Claim | Count | Definition |
| --- | ---: | --- |
| Core school/provider profiles | 2,408 | Distinct `schools.dbn` values; one canonical row per school or 2-K provider. |
| 2-K programs | 615 | `schools.has_2k = 1`. |
| 3-K programs | 965 | `schools.has_3k = 1`. |
| Pre-K programs | 755 | `schools.has_prek = 1`. |
| Serving elementary grades | 1,051 | `grade_band` interval intersects K–5. |
| Serving middle grades | 614 | `grade_band` interval intersects 6–8. |
| Serving high school grades | 532 | `grade_band` interval intersects 9–12. |
| Private-school profiles | 623 | Distinct `private_schools.nces_id`, a separate directory. |
| Early-childhood center profiles | 1,885 | Distinct `nyceec_centers.loc_code`, a separate directory. |
| Site accounts created | 163 | Rows in `users`; not currently displayed on the pricing page. |

The core stage counts overlap because one school can serve several age/grade ranges. The separate private and early-childhood directories may overlap the core school list, so their counts are presented separately. Program availability is not an academic rating. `users` does not verify parent/guardian status, NYC residence, unique households or email ownership on ordinary registration; the page does **not** claim a number of distinct NYC families or paying customers.

Source checks were aggregate-only reads against production D1. The main school query counted rows, distinct DBNs and the three program flags. A grade-band query parsed `PK-*` as starting before K, `K-*` as starting at K, and numeric bands as inclusive ranges; malformed bands such as `Unknown` and `2K` do not enter K–12 ranges. Separate directory queries compared row counts with distinct identifiers. The account query counted rows without retrieving emails.

To refresh: repeat these aggregate checks on production D1, inspect any new `grade_band` values before classifying them, update the snapshot date and numbers, and run `scripts/pricing-value.test.ts`. The account-signup floor should remain conservative and must never be relabeled as verified families.
