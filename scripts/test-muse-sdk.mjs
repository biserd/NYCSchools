import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const origin=process.env.MUSE_TEST_ORIGIN || 'https://nyc-schools-ratings-d1-staging.biser-d.workers.dev';
const client=new Client({name:'nyc-school-ratings-external-test',version:'1.0.0'});
try {
  await client.connect(new StreamableHTTPClientTransport(new URL(`${origin}/mcp/muse`)));
  const tools=await client.listTools();
  const result=await client.callTool({name:'search_schools',arguments:{district:2,limit:1}});
  assert.deepEqual(tools.tools.map(tool=>tool.name),['search_schools','get_school_details','compare_schools']);
  assert.equal(typeof result.structuredContent?.schools?.[0]?.dbn,'string');
  console.log(JSON.stringify({tools:tools.tools.map(tool=>tool.name),result:result.structuredContent?.schools?.[0]?.dbn ?? null}));
} finally {
  await client.close();
}
