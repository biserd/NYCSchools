# NYC School Ratings ChatGPT plugin

This package connects ChatGPT to the public, read-only NYC School Ratings MCP service at `https://nycschoolsratings.com/mcp/schools`. It shares the same canonical school records as the website and the Muse research connector. It cannot access subscriber accounts, family calendars, messages, payment data, or write operations.

The three tools are `search_schools`, `get_school_details`, and `compare_schools`. Results distinguish independent NYC School Ratings scores from official NYCPS measures and include source years and profile links. They do not claim live enrollment, admissions odds, or guaranteed placement. Early-childhood-only providers are not assigned K–12 academic scores.

## Release validation

1. Run `npm run check` and `npm run build` in the repository root.
2. Test staging with `$env:CHATGPT_MCP_TEST_ORIGIN='https://nyc-schools-ratings-d1-staging.biser-d.workers.dev'; node scripts/test-chatgpt-mcp.mjs`.
3. After production deployment, run `node scripts/test-chatgpt-mcp.mjs` without the staging override.
4. ZIP this directory, keeping `.codex-plugin/plugin.json` and `.mcp.json` at their existing relative paths. Do not include credentials or unrelated repository files.
5. Upload the ZIP to the existing NYC School Ratings draft at `https://platform.openai.com/plugins`. Inspect the MCP scan, listing metadata, and imported five positive/three negative review cases.
6. Add a reviewer-accessible demonstration recording URL. Show a district search, exact DBN detail, school comparison, and one negative case. No login is needed for this public connector.
7. Verify the publisher identity, rights to source data, privacy/terms/support pages, and OpenAI's current legal attestations before submitting for review. This package does not represent that those attestations have been made.

The `review.demo_recording_url` is intentionally absent until there is a real accessible recording; do not substitute a placeholder link. The plugin can be tested privately before public submission.
