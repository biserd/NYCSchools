import assert from 'node:assert/strict';
import {maintenanceResponse} from '../../server/maintenanceResponse';
for(const path of ['/','/school/example','/api/auth/magic-link/token','/api/stripe/webhook','/api/auth/user'])for(const method of ['GET','POST']){
 const response=maintenanceResponse(new Request('https://nycschoolsratings.com'+path,{method}));
 assert.equal(response.status,503);assert.equal(response.headers.get('Retry-After'),'120');assert.equal(response.headers.get('Cache-Control'),'no-store');
 assert.ok((await response.text()).length>0);
}
console.log('Maintenance gate: pages, API writes, GET callbacks and webhooks all return retryable 503.');
