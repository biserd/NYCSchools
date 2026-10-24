import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const origin = process.env.CHATGPT_MCP_TEST_ORIGIN || 'https://nycschoolsratings.com';
const endpoint = new URL('/mcp/schools', origin);
const client = new Client({ name: 'nyc-school-ratings-chatgpt-smoke', version: '1.0.0' });

const discovery = await fetch(endpoint);
assert.equal(discovery.status, 200);
const manifest = await discovery.json();
assert.equal(manifest.endpoint, endpoint.href);
assert.deepEqual(manifest.tools, ['search_schools', 'get_school_details', 'compare_schools']);

try {
  await client.connect(new StreamableHTTPClientTransport(endpoint));
  const { tools } = await client.listTools();
  assert.deepEqual(tools.map(tool => tool.name), manifest.tools);
  assert(tools.every(tool => tool.annotations?.readOnlyHint === true));
  assert(tools.every(tool => tool.annotations?.destructiveHint === false));

  const found = await client.callTool({ name: 'search_schools', arguments: { district: 2, limit: 1 } });
  assert.equal(typeof found.structuredContent?.schools?.[0]?.dbn, 'string');

  const details = await client.callTool({ name: 'get_school_details', arguments: { dbn: '02M422' } });
  assert.equal(details.structuredContent?.dbn, '02M422');
  assert.equal(typeof details.structuredContent?.canonical_url, 'string');

  const preK = await client.callTool({ name: 'search_schools', arguments: { borough: 'Queens', has_prek: true, limit: 1 } });
  assert(preK.structuredContent?.total_matches > 0);
  assert.equal(preK.structuredContent.schools[0].programs.has_prek, true);

  const comparison = await client.callTool({ name: 'compare_schools', arguments: { dbns: ['02M422', '15K516'] } });
  assert.deepEqual(comparison.structuredContent?.schools?.map(school => school.dbn), ['02M422', '15K516']);

  const twoK = await client.callTool({ name: 'search_schools', arguments: { borough: 'Queens', has_2k: true, limit: 1 } });
  assert(twoK.structuredContent?.total_matches > 0);
  assert.equal(twoK.structuredContent.schools[0].programs.has_2k, true);

  for (const name of ['create_calendar_event', 'get_favorites', 'delete_school']) {
    const rejected = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'MCP-Protocol-Version': '2025-11-25' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 99, method: 'tools/call', params: { name, arguments: {} } }),
    });
    assert.equal(rejected.status, 200);
    const rejection = await rejected.json();
    assert(rejection.error || rejection.result?.isError, `${name} must be rejected`);
  }

  console.log(JSON.stringify({ endpoint: endpoint.href, tools: tools.map(tool => tool.name), positiveCases: 5, privateToolsRejected: 3 }));
} finally {
  await client.close();
}
