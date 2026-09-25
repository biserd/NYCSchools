# NYC School Ratings MCP publication

Public endpoints:

- Streamable HTTP MCP: `https://nycschoolsratings.com/mcp`
- Public research-only MCP lane for Muse onboarding (staging first): `https://nyc-schools-ratings-d1-staging.biser-d.workers.dev/mcp/muse`. Its eventual production URL would be `https://nycschoolsratings.com/mcp/muse`; this branch does not deploy it to production.
- MCP discovery metadata: `https://nycschoolsratings.com/.well-known/mcp.json`
- OpenAI app metadata: `https://nycschoolsratings.com/.well-known/openai-apps.json`
- OAuth protected-resource metadata: `https://nycschoolsratings.com/.well-known/oauth-protected-resource`
- Privacy policy: `https://nycschoolsratings.com/privacy`
- Terms: `https://nycschoolsratings.com/terms`

The server supports the stateless MCP `2026-07-28` flow (`server/discover`, `tools/list`, and `tools/call`) and retains the legacy `initialize` method for older clients. Public research tools are read-only. `get_favorites` requires OAuth.

The Muse lane reuses the same MCP server but exposes only `search_schools`, `get_school_details`, and `compare_schools`. It negotiates the standard MCP `2025-11-25` protocol for SDK clients while preserving the existing `/mcp` response for established clients. It needs no parent account or subscriber API key. The separate `/api/v1` Developer API remains Premium-key gated. The Muse contract, examples, gap assessment, source-use review, verification, and account-owner submission checklist are in [docs/muse-connector.md](docs/muse-connector.md). Do not register the production endpoint before reviewing the staging results and Meta's actual onboarding requirements.

## Pre-submission checks

1. POST `server/discover`, `tools/list`, and one `tools/call` request to `/mcp`.
2. Complete the OAuth flow and test `get_favorites`.
3. Confirm tool results contain canonical source and methodology metadata.
4. Verify the app name, logo, contact email, privacy policy, and terms.
5. Add the MCP URL in the ChatGPT developer dashboard, test in developer mode, and submit it for review. Dashboard submission is a manual account-owner action and is not performed by the deployment.
