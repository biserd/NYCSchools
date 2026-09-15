for(const offset of [0,9000]){
 const url=new URL('https://data.cityofnewyork.us/resource/qgea-i56i.json');
 url.searchParams.set('$select','cmplnt_num,cmplnt_fr_dt,law_cat_cd,ofns_desc,pd_desc,boro_nm,latitude,longitude');
 url.searchParams.set('$where',"cmplnt_fr_dt >= '2024-09-15T22:10:06' AND cmplnt_fr_dt < '2024-10-01T00:00:00' AND latitude IS NOT NULL AND longitude IS NOT NULL");
 url.searchParams.set('$order','cmplnt_fr_dt,cmplnt_num');url.searchParams.set('$limit','3000');url.searchParams.set('$offset',String(offset));
 const start=Date.now();try{const r=await fetch(url,{signal:AbortSignal.timeout(45000)});const body=await r.json();console.log(JSON.stringify({offset,status:r.status,rows:Array.isArray(body)?body.length:undefined,error:Array.isArray(body)?undefined:body.message,ms:Date.now()-start}));}catch(e){console.log(JSON.stringify({offset,error:e.message,ms:Date.now()-start}));}
}
