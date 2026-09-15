import assert from 'node:assert/strict';
import {db} from '../../server/db';
import {schools,appSettings} from '../../shared/schema';
import {eq,sql} from 'drizzle-orm';
const key=`d1-bridge-test-${crypto.randomUUID()}`;
const rows=await db.select({count:sql<number>`count(*)`}).from(schools);
assert.equal(rows[0].count,2408);
try {
 await db.insert(appSettings).values({key,value:'synthetic'});
 const [row]=await db.select().from(appSettings).where(eq(appSettings.key,key));
 assert.equal(row.value,'synthetic');assert.ok(row.updatedAt instanceof Date);
 await db.update(appSettings).set({value:'updated'}).where(eq(appSettings.key,key));
 assert.equal((await db.select().from(appSettings).where(eq(appSettings.key,key)))[0].value,'updated');
 console.log('PASS: Node maintenance bridge reads canonical schools and round-trips D1 writes/date mappings');
} finally {await db.delete(appSettings).where(eq(appSettings.key,key));}
