import assert from 'node:assert/strict';
import {build} from 'esbuild';

const captured=[];
globalThis.__emailTestEnv={EMAIL_DELIVERY_ENABLED:'true',EMAIL_FROM:'hello@nycschoolsratings.com',EMAIL_FROM_NAME:'NYC School Ratings',EMAIL:{send:async message=>{captured.push(message);return {messageId:'test-only-no-real-email'};}}};
const result=await build({entryPoints:['server/emailService.ts'],bundle:true,write:false,format:'esm',platform:'node',plugins:[{name:'mock-cloudflare-email',setup(builder){
  builder.onResolve({filter:/^cloudflare:workers$/},()=>({path:'mock-env',namespace:'mock-email'}));
  builder.onLoad({filter:/.*/,namespace:'mock-email'},()=>({contents:'export const env = globalThis.__emailTestEnv;',loader:'js'}));
}}]});
const service=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
const originalFetch=globalThis.fetch;
globalThis.fetch=async()=>{throw new Error('No network permitted in email template tests');};
try {
  assert.equal(await service.sendNewUserWelcomeEmail('parent@example.invalid','Jamie'),true);
  assert.equal(await service.sendFamilyPremiumAccessLink('parent@example.invalid','https://example.invalid/one-time-link'),true);
  assert.equal(await service.sendDripUpgradeNudge('parent@example.invalid','test-parent','Jamie'),true);
  assert.equal(captured.length,3);
  for(const message of captured) {
    assert.equal(message.to,'parent@example.invalid');
    assert.match(message.html,/KinderLearner Pro/);
    assert.match(message.html,/at no extra cost/);
    assert.match(message.html,/same email address/);
    assert.match(message.html,/Family Premium membership is active/);
    assert.match(message.html,/https:\/\/apps.apple.com\/us\/app\/kinderlearner\/id6816259828/);
    assert.doesNotMatch(message.html,/separate optional paid membership/);
  }
  assert.equal(await service.sendWelcomeEmail('legacy@example.invalid','Jamie'),true);
  assert.doesNotMatch(captured[3].html,/KinderLearner Pro/,'do not advertise the monthly bundle as included with a legacy Research Pass');
  console.log('PASS: signup, paid welcome and Day-14 emails include the active monthly KinderLearner Pro benefit and same-email instructions; legacy Pass unchanged. All sends mocked, no network.');
} finally {globalThis.fetch=originalFetch;delete globalThis.__emailTestEnv;}
