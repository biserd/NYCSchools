# NYC School Ratings MCP publication

Public endpoints:

- Streamable HTTP MCP: `https://nycschoolsratings.com/mcp`
- Public research-only MCP lane for Muse: `https://nycschoolsratings.com/mcp/muse`.
- Stable, equivalent ChatGPT public research endpoint: `https://nycschoolsratings.com/mcp/schools`.
- MCP discovery metadata: `https://nycschoolsratings.com/.well-known/mcp.json`
- OpenAI app metadata: `https://nycschoolsratings.com/.well-known/openai-apps.json`
- OAuth protected-resource metadata: `https://nycschoolsratings.com/.well-known/oauth-protected-resource`
- Privacy policy: `https://nycschoolsratings.com/privacy`
- Terms: `https://nycschoolsratings.com/terms`

The server supports the stateless MCP `2026-07-28` flow (`server/discover`, `tools/list`, and `tools/call`) and retains the legacy `initialize` method for older clients. Public research tools are read-only. `get_favorites` requires OAuth.

The `/mcp/muse` and `/mcp/schools` lanes reuse the same MCP server but expose only `search_schools`, `get_school_details`, and `compare_schools`. They negotiate the standard MCP `2025-11-25` protocol for SDK clients while preserving the existing `/mcp` response for established clients. Neither lane needs a parent account or subscriber API key. The separate `/api/v1` Developer API remains Premium-key gated. The Muse contract and source-use review are in [docs/muse-connector.md](docs/muse-connector.md). The ChatGPT plugin package and submission checklist are in [plugins/nyc-school-ratings/README.md](plugins/nyc-school-ratings/README.md).

## Pre-submission checks

1. POST `server/discover`, `tools/list`, and one `tools/call` request to `/mcp`.
2. Complete the OAuth flow and test `get_favorites`.
3. Confirm tool results contain canonical source and methodology metadata.
4. Verify the app name, logo, contact email, privacy policy, and terms.
5. Test `/mcp/schools` with `node scripts/test-chatgpt-mcp.mjs` and confirm private/write tools are rejected.
6. Upload the plugin package to the existing ChatGPT developer dashboard draft, test in developer mode, add an accessible demo recording, and complete the review process. Legal attestations require the account owner's approval.
