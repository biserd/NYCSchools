import {PARENT_LIMITS} from '../../shared/parent-assistant';
import {TuckError} from '../tuck/store';
// Per-account, per local calendar day. A global operating budget must never
// masquerade as another parent's personal allowance.
export async function consumeParentQuestion(db:D1Database,userId:string,day:string,limit:number=PARENT_LIMITS.questionsPerDay) {
  const row=await db.prepare(`INSERT INTO parent_usage(user_id,day,count) VALUES (?,?,1)
    ON CONFLICT(user_id,day) DO UPDATE SET count=count+1 WHERE count<? RETURNING count`)
    .bind(userId,day,limit).first<{count:number}>();
  if(!row)throw new TuckError(429,'You’ve used today’s assistant allowance. It resets tomorrow; your calendar is still available.');
  return row.count;
}
