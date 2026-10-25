# Agent readiness

Implemented October 25, 2026. This is an additive public-content/discovery change, not a new authentication, commerce, or account-access system.

## Public interfaces

| Interface | Purpose |
| --- | --- |
| `Accept: text/markdown` on supported public pages | Converts the existing anonymous server-rendered content, including source links and tables. Normal requests remain HTML. Both variants declare `Vary: Accept`. |
| `/.well-known/api-catalog` | RFC 9727 linkset catalog of the public research MCP, existing MCP/favorites service, and Premium developer REST API. |
| `Link` response header | Advertises the catalog, MCP server card, and authentication documentation. |
| `/auth.md` | Explains public access, existing OAuth PKCE/favorites flow, Premium API-key requirements, and private-feature boundaries. It does not implement automated user provisioning. |
| `/.well-known/mcp/server-card.json` | Discovery proposal describing the existing `/mcp/muse` public endpoint; tool schemas come directly from the running tool definitions. Existing `/mcp` and `/mcp/schools` remain unchanged. |
| `/.well-known/agent-skills/index.json` | Cloudflare agent-skills discovery draft v0.2.0, with the SHA-256 digest of the served research guidance. |
| `/.well-known/agent-skills/nyc-school-research/SKILL.md` | Instructions for searching, comparing, citing reporting years, handling missing data, and avoiding admissions or availability claims. |
| `/.well-known/oauth-protected-resource/mcp` | Resource-specific alias for the existing protected-resource metadata; both versions advertise Bearer headers. |
| `/llms.txt` and `/llms-full.txt` | Links to the new discovery documents and access boundaries. |

Supported Markdown pages: homepage, methodology/about/FAQ/features/pricing/public information, school profiles, early-childhood/private-school profiles, blog articles, comparison pages, school/district/neighborhood/program guides. Only existing anonymous SSR content is converted, not additional paid or authenticated data. Unknown routes remain 404. Private/noindex pages and APIs are not converted. Pages without SSR content fall back to HTML. Explicit zero-quality Markdown or browser wildcard Accept headers do not opt in.

School SSR statistics now include the assessment reporting year and source, or an explicit missing-year label. No school data, scores, account entitlements, price, billing configuration, or database schema is changed.

## Intentionally not advertised

- A2A: no external agent-to-agent task server is implemented.
- Web Bot Auth / DNS-AID: no corresponding outbound signed-agent identity is implemented.
- WebMCP: experimental browser integration is separate work; remote MCP already supports public research.
- ACP, AP2, MPP, UCP, x402: no machine checkout/payment protocol is implemented. Existing Stripe checkout is untouched.
- Auth.md automated registration/ID-JAG/verified-email assertion: not supported; the guide documents existing user-consented OAuth rather than inventing these capabilities.

A Cloudflare readiness score is not a requirement to implement every protocol. The card and skills discovery formats are proposals and should be checked when their specifications change.

## Verification

Use Node 22+:

```sh
npm run test:agent-readiness
npm run check
npm run build
npm run verify:agent-readiness -- https://nyc-schools-ratings-d1-staging.biser-d.workers.dev
```

The verification script only reads public data and tests that an unsupported private write tool is rejected. It does not create users, send messages, authorize OAuth clients, or initiate checkout.

Verified on staging October 25, 2026, version `e992e063-f0a0-4247-88e8-67b405927c43`: discovery formats and skill digest; card/tool parity; Markdown/HTML/HEAD/quality negotiation; homepage, methodology, pricing, and 02M422 school profile; private-route exclusion; unknown pages 404; unsupported private tool rejection. Sample body byte reductions: homepage 66%, methodology 86%, pricing 87%, school profile 70%. Front-end entry asset matches production (`index-C61hP5zp.js`).

Pure-contract agent tests, existing Muse connector and SEO-linking regressions, TypeScript, Vite build, and production Worker dry-run passed. Production has not been deployed as part of this staging verification. Existing staging expiry remains October 26, 2026 at 22:00 UTC.

Before production release: run the production deploy guard, deploy using the existing config, rerun the verification script against production, then rescan in Cloudflare. Rollback is a Worker version rollback; there are no database migrations. Prior production version observed: `c00d1480-aab8-46f2-9d58-be903a56ec9f`.

## Specifications

- https://blog.cloudflare.com/agent-readiness
- https://www.rfc-editor.org/rfc/rfc9727.html
- https://github.com/cloudflare/agent-skills-discovery-rfc
- https://github.com/modelcontextprotocol/modelcontextprotocol/issues/1649
