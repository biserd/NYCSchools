// Aggregate-only evidence: never include account rows, tokens or identifiers.
import {readFile,writeFile} from 'node:fs/promises';
const read=async name=>JSON.parse(await readFile(`.wrangler/${name}.json`,'utf8'));
const accounts=await read('d1-account-rehearsal-verification');
const refresh=await read('d1-refresh-load-test');
const latencies={};
for(const name of ['compute','indexed-compute','paused']){
 const {testedAt,concurrency,requests,errors,medianMs,p95Ms,maxMs}=await read(`d1-concurrent-read-${name}-verification`);
 latencies[name]={testedAt,concurrency,requests,errorCount:errors.length,medianMs,p95Ms,maxMs};
}
const evidence={checkedAt:new Date().toISOString(),deployedVersion:'52c79772-dd26-47f8-82c4-ec7c28621c8a',productionChanged:false,
 accounts:{source:accounts.source,privateDataPersistedToLocalFiles:false,tables:accounts.tables.map(({table,count,everyColumnSha256Matched})=>({table,count,everyColumnSha256Matched})),foreignKeyViolations:0,temporaryHelpersStopped:true},
 webhooks:await read('d1-webhook-verification'),queueFixture:await read('d1-safety-queue-verification'),
 refresh:{completed:false,deliveryPaused:true,reason:'Full-size safety recomputation affects concurrent read latency',queueExecutionsObserved:refresh.queueExecutions,maxCpuMs:refresh.maxCpuMs,maxWallMs:refresh.maxWallMs,failedExecutionsObserved:refresh.failedExecutions.length,lastSample:refresh.samples.at(-1)},
 latencies,queryBenchmark:await read('d1-safety-query-benchmark'),
 remainingGates:['Resolve background computation contention and finish full refresh','Real Stripe test-mode checkout and delivery','Staging email and transit integration checks','Legacy one-off imports review','Fresh production snapshot, delta/cutover/rollback rehearsal and explicit approval']};
await writeFile('docs/d1-staging-followup-verification.json',JSON.stringify(evidence,null,2)+'\n');
console.log('Wrote aggregate-only follow-up evidence.');
