import { build } from 'vite';
import { gzipSync } from 'node:zlib';
import assert from 'node:assert/strict';

// Follow static imports, not just the entry file: moving bytes to a vendor
// chunk must not disguise a larger first load. --check enforces the budget.
await build({ logLevel: 'error', build: { write: false }, plugins: [{
  name: 'initial-javascript-budget',
  generateBundle: { order: 'post', handler(_options, bundle) {
    const visited = new Set();
    const walk = name => {
      if (visited.has(name)) return;
      const chunk = bundle[name];
      if (chunk?.type !== 'chunk') return;
      visited.add(name);
      chunk.imports.forEach(walk);
    };
    Object.values(bundle).filter(item => item.type === 'chunk' && item.isEntry).forEach(chunk => walk(chunk.fileName));
    const chunks = [...visited].map(name => bundle[name]);
    const modules = chunks.flatMap(chunk => Object.entries(chunk.modules).map(([id, info]) => ({ id: id.replaceAll('\\', '/'), bytes: info.renderedLength })));
    const raw = chunks.reduce((total, chunk) => total + Buffer.byteLength(chunk.code), 0);
    const gzip = chunks.reduce((total, chunk) => total + gzipSync(chunk.code).length, 0);
    const databaseModules = modules.filter(m => /node_modules\/(drizzle-orm|drizzle-zod)\//.test(m.id));
    console.log(JSON.stringify({ initialChunks: [...visited], raw, gzip, databaseModuleCount: databaseModules.length,
      largestModules: modules.sort((a,b) => b.bytes-a.bytes).slice(0,18) }, null, 2));
    if (process.argv.includes('--check')) {
      assert.equal(databaseModules.length, 0, 'Database runtime must not enter the initial browser bundle');
      assert.ok(gzip < 200_000, `Initial gzip JS exceeds 200 KB budget: ${gzip}`);
      assert.ok(!modules.some(m => /\/components\/ChatBot\.tsx$/.test(m.id)), 'Chat must load on user intent');
      assert.ok(!modules.some(m => /\/components\/SchoolDetailPanel\.tsx$/.test(m.id)), 'Closed detail panel must not load at startup');
      assert.ok(!modules.some(m => /\/shared\/survey-insights\.ts$/.test(m.id)), 'Article content must stay on blog routes');
    }
  } },
}] });
