# NYC School Ratings public research connector for Meta Muse — first release

Status: staging candidate only. This branch does **not** submit anything to Meta or deploy to production. The public research endpoint is `https://nyc-schools-ratings-d1-staging.biser-d.workers.dev/mcp/muse`; production would be `https://nycschoolsratings.com/mcp/muse` only after an approved release. Staging expires on September 28, 2026 unless renewed.

## Inventory and gap assessment

| Parent action | Existing contract | Gap and first-release resolution |
| --- | --- | --- |
| Find schools | Public MCP `search_schools`; Premium-key REST `/api/v1/schools` | Reuse the MCP name and canonical `schools` table. Validate structured filters, add exact grade and conservative school-type filters, cap pagination at 20/500, preserve all matching DBNs, and return concise match reasons and canonical URLs. Charter identity comes from DBN prefix `84`, not the geographic `schools.district` value; borough falls back to the DBN letter. |
| School profile | Public MCP `get_school_details`; REST `/api/v1/schools/:dbn`; `/api/surveys/school/:dbn` | Reuse the MCP name, canonical school record, scoring functions and 2026 survey service. Separate independent site score from reported academic metrics and separate survey instruments. Report nulls, years, source links and the raw 2-K feed cycle caveat. |
| Compare schools | Public MCP `compare_schools`; website compare view | Reuse the name and score definitions. Require 2–4 distinct DBNs and the same profile serializer/metric meanings for every column. |
| Schools for an address | Existing `/api/geocode`, `/api/schools/:dbn/zone`, and authenticated `findZonedSchools` | **Deferred.** The existing zone service selects the first containing polygon per grade from all stored zones and supplies no boundary publication date, overlap status, or address-level evidence. Neither proximity nor district membership establishes eligibility. No address action is exposed and no home address is logged. |

The existing `/mcp` also has history, top-school and OAuth favorites tools. The `/mcp/muse` allowlist deliberately exposes only the three public research actions. It makes no calls to the account-linked Parent Assistant or payments code. `/api/v1` remains key-gated at 60 requests/minute and 10,000/day per key; this connector does not reuse a Premium user's key. Production's public Family Premium offer is $19.99/month, but connector research is independent of subscriptions.

2-K is a first-class `schools.has_2k` flag on canonical DBNs. The legacy 2-K table is not read. One source record marked `needs_verification` is excluded from positive 2-K searches, while search results preserve independent 2-K, 3-K and pre-K flags. The raw source cycle `2025-26 School Year` is *not* represented as the verified admissions year; [NYCPS's fall-2026 guidance](https://www.schools.nyc.gov/enrollment/enroll-grade-by-grade/2-k) takes precedence.

## Contract and examples

Transport: stateless Streamable HTTP JSON-RPC 2.0 over HTTPS POST to `/mcp/muse`. The Muse lane negotiates `MCP-Protocol-Version: 2025-11-25` with the standard MCP SDK and supports `initialize`, `notifications/initialized`, `tools/list`, `tools/call`, and `ping`; it also retains `server/discover` for existing clients. The existing `/mcp` lane retains its prior protocol response for backward compatibility. `GET /mcp/muse` returns a small human-readable endpoint summary. No bearer token, parent account or subscriber API key is required for these public tools. This is an allowlisted research lane, not a new school data store or a claim that Meta has approved the transport.

List tools:

```json
{"jsonrpc":"2.0","id":1,"method":"tools/list"}
```

Ask: “Which District 2 schools offer pre-K and kindergarten?”

```json
{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"search_schools","arguments":{"district":2,"has_prek":true,"grade":"K","limit":10,"offset":0}}}
```

The `structuredContent` contains `total_matches`, `next_offset`, and a `schools` array. Each school has a stable `dbn`, `match_reasons`, `grade_band`, independent program flags, a nullable site `rating`, `assessment_year`, and `canonical_url`. A representative element is:

```json
{"dbn":"02M545","name":"High School for Dual Language and Asian Studies","match_reasons":["name or identifier match"],"assessment_year":null,"rating":{"overall_score":95,"status":"rated","definition":"Independent NYC School Ratings comparison score; not an official NYCPS rating.","methodology_url":"https://nycschoolsratings.com/methodology"},"canonical_url":"https://nycschoolsratings.com/school/02m545-high-school-for-dual-language-and-asian-studies"}
```

This is a shortened element from a separate DBN lookup on September 25, not the result of the preceding pre-K/K request. The production MCP reported the same score and URL. Null assessment year must not be filled with a guessed year. The enhanced profile includes a separately labeled latest published graduation cohort (2021 for this staging record), not an assertion that every score component came from that cohort.

Ask: “Tell me about school 02M545 and show the source years.”

```json
{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"get_school_details","arguments":{"dbn":"02M545"}}}
```

`structuredContent` contains `rating`, `academics` with `assessment_year` and `assessment_source`, `programs` with verification/cycle/source metadata, `admissions` with a current-eligibility caveat, separate `surveys[]` instruments with response count/rate and reported/null metrics, `source_links`, `last_updated`, and `canonical_url`. Birth-to-5 survey entries say `scope: "center_wide"` and warn that they do not rate a 2-K cohort.

Ask: “Compare 02M545 and 02M234 on academics and family feedback.”

```json
{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"compare_schools","arguments":{"dbns":["02M545","02M234"]}}}
```

The `structuredContent.schools[]` entries use the same serializer and definitions as a single profile. An invalid DBN, duplicate DBN, unknown field, or more than four schools returns a JSON-RPC error rather than silently broadening the query. No current seats, admissions odds, guaranteed placement, or zone claim is returned.

## Safety and source-use review

- This lane is read-only and accepts only three tool names. Request JSON is capped at 4 KB, list output at 20 rows, offset at 500, and comparison at four distinct DBNs. It uses the existing best-effort per-IP throttle of 30 calls/minute on each Worker isolate. For a broad launch, add a Cloudflare account-level WAF rate-limit rule because in-memory throttling is not a global quota.
- Logs contain method, bounded tool name, and error status only. Request arguments, children, email, token, and full home address are not logged. There is no address tool in this release.
- NYC Open Data's [FAQ](https://www.nyc.gov/opendata/get-started/FAQs) says public Open Data has no use restrictions; [Open NY terms](https://data.ny.gov/api/views/77gx-ii52/files/ef0c1840-ad54-4240-92fd-6397c49fde46?filename=OPEN-NY_20Terms_20of_20Use.pdf) permit lawful reuse, subject to any dataset-specific terms. NYCPS describes school-level data as [publicly available](https://www.schools.nyc.gov/about-us/working-with-us/how-to-research-new-york-city-public-schools) and publishes [2026 survey results](https://www.schools.nyc.gov/about-us/reports/school-quality/nyc-school-survey). We found no explicit third-party-platform redistribution permission for the InfoHub and MySchools-specific extracts in those pages. The connector therefore returns bounded derived facts already displayed publicly on the site, with source links and dates, not raw bulk files. The account owner should review each source's current terms and Meta's legal requirements before submission; this is not legal clearance.
- Canonical methodology: `https://nycschoolsratings.com/methodology`. Source pointers: NYCPS test results and School Quality pages, NYC School Survey releases, and each available canonical 2-K source URL. Site ratings are proprietary, not NYCPS ratings. Survey blanks stay null, never zero.

## Verification checklist

1. Run `npm run check`, `npm run build`, and `node --import tsx scripts/muse-connector.test.ts`.
2. Connect with the standard MCP SDK client (`node scripts/test-muse-sdk.mjs`), then POST `server/discover`, `tools/list`, and each of the three tool calls from a separate HTTP client against staging. Check no favorites/address action in the list and that a forbidden tool call fails.
3. Check ambiguous names, a verified 2-K provider, a K–12 school, absent metrics, distinct comparison values, invalid/duplicate DBNs, 21-row rejection, and 429 after the throttle limit. Confirm a sample of canonical profile URLs returns HTTP 200.
4. Compare a sample score and source year against the corresponding production school profile. Staging uses an isolated D1 snapshot and may lag production; do not silently treat a mismatch as fresh production data.
5. Before launch: confirm a global Cloudflare WAF limit, source-use review, and Meta's actual technical and legal contract. Do not infer approval from successful MCP tests.

### September 25 staging evidence

Staging Worker version `63915d0f-4688-4d36-8b5a-dfecbccd4b9c`. `npm run check`, `npm run build`, focused connector tests, and existing rating, survey and 2-K regression tests passed (the isolated 2-K SSR fixture prints its expected unavailable-survey warning). `scripts/test-muse-sdk.mjs` connected through the standard MCP SDK's Streamable HTTP transport and listed/called exactly the three research tools. `scripts/test-muse-staging.mjs` passed discovery, search, detail, comparison, invalid/duplicate/forbidden calls, four canonical-URL HEAD checks, and a 429 rate-limit check. The legacy `/mcp` tool list and search result shape matched production after the Muse-only isolation fix. “PS 15” returned 26 distinct matches, not one guessed identity. The charter test found a real mapping error: canonical DBNs beginning `84` had geographic `district` values and no stored borough, so the connector now classifies by DBN prefix and derives borough from its letter. Verified 2-K `06G262` had no invented academic score. Canonical school `06MAQR` returned exactly two Birth-to-5 survey instruments, both labeled center-wide; the duplicate canonical-school/center-code join was removed. Production's `/mcp/muse` still returned 404 and the existing $19.99 plan remained available; no production deployment occurred.

## Submission packet and account-owner steps

- **Connector name:** NYC School Ratings — NYC School Research
- **Description:** Find, inspect, and compare NYC schools using dated public-source facts and clearly labeled independent ratings, without requiring a parent account.
- **Three example Muse prompts:** “Find District 2 schools with pre-K and kindergarten.” “What do the 2026 family and teacher surveys say about 02M545?” “Compare 02M545 with 02M234 and show where metrics are missing.”
- **Staging endpoint:** `https://nyc-schools-ratings-d1-staging.biser-d.workers.dev/mcp/muse` (temporary, expires September 28, 2026).
- **Proposed production endpoint:** `https://nycschoolsratings.com/mcp/muse` (not deployed by this branch).
- **Authentication:** none for public read-only research. The existing `/mcp` favorites OAuth is outside this connector. The Premium `/api/v1` key is not required or embedded.
- **Privacy:** `https://nycschoolsratings.com/privacy`; **Terms:** `https://nycschoolsratings.com/terms`; **Support:** `hello@nycschoolsratings.com`.

Manual owner checklist (not performed here):

1. Review staging test evidence and legal/source-use notes; decide whether to approve a production release and set a global abuse rule.
2. Open Meta's [Muse Connector Platform](https://muse.ai/platform) using the account owner's Meta login and select **Submit a connector**. Meta currently describes “describe your product,” “submit for review,” and review for functional, security and legal requirements. Supply the packet above and the production endpoint only once it exists. Follow any additional fields or technical instructions actually shown in the owner flow; no manifest or auth requirement is assumed here.
3. Give Meta test prompts and an explanation that there is no account linkage, payment, address zoning, or write action in v1. Confirm with Meta whether its review client accepts this JSON-RPC MCP endpoint and protocol version.
4. Separately, if desired, [sign up for the Meta AI Connectors developer preview](https://developers.meta.com/blog/meta-connect-recap-ai-glasses/). Meta says that program can connect a service via API or MCP, but it is a distinct onboarding path; the same read-only endpoint is a candidate, not a confirmed integration.
5. Await Meta's security/legal review and end-to-end testing. Approval and directory placement are Meta decisions.

Deferred: address-to-zone lookup, account-linked favorites/OAuth, AI recommendations, application submission, calendar writes, reminders, payments, child-profile context, and any private subscriber data.
