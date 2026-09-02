# NYC School Ratings MCP publication

Public endpoints:

- Streamable HTTP MCP: `https://nycschoolsratings.com/mcp`
- MCP discovery metadata: `https://nycschoolsratings.com/.well-known/mcp.json`
- OpenAI app metadata: `https://nycschoolsratings.com/.well-known/openai-apps.json`
- OAuth protected-resource metadata: `https://nycschoolsratings.com/.well-known/oauth-protected-resource`
- Privacy policy: `https://nycschoolsratings.com/privacy`
- Terms: `https://nycschoolsratings.com/terms`

The server supports the stateless MCP `2026-07-28` flow (`server/discover`, `tools/list`, and `tools/call`) and retains the legacy `initialize` method for older clients. Public research tools are read-only. `get_favorites` requires OAuth.

## Pre-submission checks

1. POST `server/discover`, `tools/list`, and one `tools/call` request to `/mcp`.
2. Complete the OAuth flow and test `get_favorites`.
3. Confirm tool results contain canonical source and methodology metadata.
4. Verify the app name, logo, contact email, privacy policy, and terms.
5. Add the MCP URL in the ChatGPT developer dashboard, test in developer mode, and submit it for review. Dashboard submission is a manual account-owner action and is not performed by the deployment.
