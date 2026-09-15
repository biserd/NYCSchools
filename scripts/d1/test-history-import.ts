import assert from 'node:assert/strict';
import {db} from '../../server/db';
import {storage} from '../../server/storage';
import {privateSchoolHistory} from '../../shared/schema';
import {eq} from 'drizzle-orm';
const ncesId=`d1-history-test-${crypto.randomUUID()}`;
try{
 const input={ncesId,schoolYear:2026,enrollment:42,dataSourceVersion:'synthetic'};
 const [first,second]=await Promise.all([storage.upsertPrivateSchoolHistory(input),storage.upsertPrivateSchoolHistory(input)]);
 assert.equal(first.id,second.id);assert.equal((await storage.getPrivateSchoolHistory(ncesId)).length,1);
 const updated=await storage.upsertPrivateSchoolHistory({...input,enrollment:43});assert.equal(updated.id,first.id);assert.equal(updated.enrollment,43);assert.ok(updated.createdAt instanceof Date);
 await db.insert(privateSchoolHistory).values({...input,enrollment:99});
 const before=await storage.getPrivateSchoolHistory(ncesId);
 await assert.rejects(()=>storage.upsertPrivateSchoolHistory({...input,enrollment:100}),/Ambiguous/);
 assert.deepEqual(await storage.getPrivateSchoolHistory(ncesId),before);
 console.log('PASS: concurrent imports keep one row, updates preserve IDs, legacy duplicate pairs fail closed without changing data');
}finally{await db.delete(privateSchoolHistory).where(eq(privateSchoolHistory.ncesId,ncesId));}
