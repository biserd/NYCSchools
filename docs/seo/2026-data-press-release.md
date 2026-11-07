# 2026 data launch and media resources

The public announcement at `/blog/nyc-school-ratings-2026-data-release` publishes the independent analysis of already-public NYCPS files. It does not announce a new government release, invent an official ranking, or attribute unapproved quotations to a spokesperson. The public contact email was verified on the site's Contact page on November 7, 2026.

The page is listed first in the blog, in the blog sitemap, and linked from the homepage's assessment-year area and six results articles. It has shared client/server content, a canonical URL, NewsArticle/Breadcrumb structured data, direct results/search/account/comparison actions and public downloads without registration.

`npm run build:press-kit` regenerates the copy-ready text, three CSV exports and ZIP from the existing validated analysis. Set `PYTHON` to an available Python executable where necessary. The three CSVs contain 1,604 assessment pairs, 605 separate history-exam pairs and 1,594 reporting-year 2026 snapshots. Their columns preserve units, source precision, reporting/test/school years, tested counts, exact Regents labels, missing values, source URLs and SHA-256 hashes. README and sources accompany the exports; a manifest checksums every included file. The reproducible ZIP includes only the seven named public assets. It never contains private source backups, accounts or credentials.

The media announcement reports ELA and math as separate filtered samples. It preserves the English/algebra snapshot-only limits, thresholds, exclusions and no-causality qualifications from the validated articles. Earlier results are not rewritten. The school-file scope excludes charters and District 75.

Acquisition events:

- `data_release_click`: announcement, results, school search, signup or compare link click, with release path, current path, destination path, action and fixed placement labels.
- `press_resource_download`: click on an identified public media resource, with its fixed resource ID. This records a download click, not proof of a completed download or press coverage.
- Existing `sign_up` fires on successful registration and existing landing-page attribution continues to checkout. Clicks are not renamed as signups or purchases.
- No query strings, email addresses or personal search values are added to the release event parameters.

`npm run test:data-release` independently parses all three CSVs, reconciles every exported endpoint against the validated JSON, verifies hashes and resource presence, checks canonical public SSR/sitemap/home discovery and validates bounded tracking parameters. Existing score-mover, content/survey and initial bundle checks cover preservation. Browser QA covers mobile/desktop layout, media links and CTA behavior. Production uses the existing guarded deployment; there are no D1 writes or external email sends in this launch.

Public publication and external distribution are separate outcomes. This release publishes on the user's website and prepares a pitch for review. No journalist messages, social posts, paid wire purchases or third-party submissions are authorized or sent by this implementation.
