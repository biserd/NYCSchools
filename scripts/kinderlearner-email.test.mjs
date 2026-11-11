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
  const parent='parent@example.invalid',link='https://example.invalid/one-time-link';
  const cases={
    sendNewUserWelcomeEmail:[parent,'Jamie'],
    sendFamilyPremiumAccessLink:[parent,link],
    sendDripUpgradeNudge:[parent,'test-parent','Jamie'],
    sendWelcomeEmail:[parent,'Jamie'],
    sendAdminNewCustomerNotification:[parent,'season_pass',2900],
    sendAdminNewUserRegistrationNotification:[parent,'Jamie','Tester'],
    sendPasswordResetEmail:[parent,link,'Jamie'],
    sendMagicLinkEmail:[parent,link,'Jamie'],
    sendMagicLinkLoginEmail:[parent,link,'Jamie'],
    sendDripWelcomeTip:[parent,'test-parent','Jamie'],
    sendDripAiSpotlight:[parent,'test-parent','Jamie'],
    sendDripDataInsight:[parent,'test-parent','Jamie'],
    sendNewsletterJanuary2025:[parent,'Jamie'],
    sendApiAbuseAlert:[{keyId:1,keyPrefix:'test',keyName:'Test key',ownerEmail:parent,alertType:'rate_limit_storm',summary:'Test alert',detail:{hits:50}}],
  };
  assert.deepEqual(Object.keys(cases).sort(),Object.keys(service).filter(name=>name.startsWith('send')).sort(),'Each exported email template must have a test case');
  const monthlyBenefit=new Set(['sendNewUserWelcomeEmail','sendFamilyPremiumAccessLink','sendDripUpgradeNudge']);
  const emDash=/\u2014|&mdash;|&#(?:0*8212|x0*2014);?/i;
  for(const [name,args] of Object.entries(cases)) {
    const before=captured.length;
    assert.equal(await service[name](...args),true,name);
    assert.equal(captured.length,before+1,`${name} renders exactly one email`);
    const message=captured.at(-1);
    for(const field of ['subject','html','text']) assert.doesNotMatch(message[field]||'',emDash,`${name} ${field} contains an em dash`);
    if(monthlyBenefit.has(name)) {
      assert.equal(message.to,parent);
      assert.match(message.html,/KinderLearner Pro/);
      assert.match(message.html,/at no extra cost/);
      assert.match(message.html,/same email address/);
      assert.match(message.html,/Family Premium membership is active/);
      assert.match(message.html,/https:\/\/apps.apple.com\/us\/app\/kinderlearner\/id6816259828/);
      assert.doesNotMatch(message.html,/separate optional paid membership/);
    }
    if(name==='sendWelcomeEmail') assert.doesNotMatch(message.html,/KinderLearner Pro/,'do not advertise the monthly bundle as included with a legacy Research Pass');
  }
  console.log(`PASS: ${captured.length} email templates contain no em dashes. KinderLearner inclusion and legacy Pass rules preserved. All sends mocked, no network.`);
} finally {globalThis.fetch=originalFetch;delete globalThis.__emailTestEnv;}
