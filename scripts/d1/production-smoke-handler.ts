// Restricted remote-preview helper only. Creates/deletes only a synthetic account.
export async function productionSmokeHandler(request:Request,db:D1Database):Promise<Response>{
 if(request.method!=='POST')return new Response('POST only',{status:405});
 const input=await request.json() as {id:string;passwordHash?:string};
 if(!/^d1-cutover-smoke-[a-f0-9-]{36}$/.test(input.id))return new Response('Invalid synthetic id',{status:400});
 const email=input.id+'@example.invalid';
 if(new URL(request.url).pathname==='/smoke/create'){
  if(!input.passwordHash||!/^\$2[aby]\$10\$[./A-Za-z0-9]{53}$/.test(input.passwordHash))return new Response('Invalid hash',{status:400});
  await db.prepare('INSERT INTO users(id,email,password,first_name,email_unsubscribed) VALUES(?,?,?,?,1)').bind(input.id,email,input.passwordHash,'Synthetic migration smoke test').run();
  return Response.json({created:true});
 }
 if(new URL(request.url).pathname==='/smoke/cleanup'){
  // Match both synthetic primary key and reserved-domain email before cleanup.
  const exists=await db.prepare('SELECT count(*) n FROM users WHERE id=? AND email=?').bind(input.id,email).first<number>('n');
  if(exists!==1)return new Response('Synthetic account not found',{status:409});
  await db.batch([
   db.prepare("DELETE FROM sessions WHERE json_extract(sess,'$.userId')=?").bind(input.id),
   db.prepare('DELETE FROM favorites WHERE user_id=?').bind(input.id),
   db.prepare('DELETE FROM users WHERE id=? AND email=?').bind(input.id,email),
  ]);
  const remaining=await db.prepare("SELECT (SELECT count(*) FROM users WHERE id=?)+(SELECT count(*) FROM favorites WHERE user_id=?)+(SELECT count(*) FROM sessions WHERE json_extract(sess,'$.userId')=?) n").bind(input.id,input.id,input.id).first<number>('n');
  return Response.json({cleaned:remaining===0});
 }
 return new Response('Unknown smoke action',{status:404});
}
