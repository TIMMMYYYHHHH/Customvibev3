import {normalizeLockers} from '../server/lockers.mjs';
import {boundedBody} from '../server/auth.mjs';
const AGE=6*3600000,FRESH=AGE+15*60000,KEY='system/lockers/directory-v1.json';
export async function reserveMapUsage(env,session,now=Date.now()){
 if(!env.DB||!/^\w{64}$/.test(session))return false;
 // A global 250 ms lease avoids bursts across a fixed second boundary.
 const lease=await env.DB.prepare('INSERT INTO map_usage(id,amount,expires) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET amount=excluded.amount,expires=excluded.expires WHERE amount<=? RETURNING amount').bind('map:rate',now+250,now+60000,now).first();
 if(!lease)return false;
 const day=new Date(now).toISOString().slice(0,10),minute=Math.floor(now/60000);
 const limits=[[`map:day:${day}`,2500,now+2*86400000],[`map:session:${session}:${minute}`,120,now+120000]];
 // All increments are in one transaction. Rejected attempts still count, so
 // concurrent callers can never exceed the provider's request/credit ceiling.
 const rows=await env.DB.batch(limits.map(([id,,expires])=>env.DB.prepare('INSERT INTO map_usage(id,amount,expires) VALUES (?,1,?) ON CONFLICT(id) DO UPDATE SET amount=amount+1 RETURNING amount').bind(id,expires)));
 return rows.every((r,i)=>r.results[0].amount<=limits[i][1]);
}
export async function refreshLockerSnapshot(env,{network=fetch,now=Date.now()}={}){
 if(env.LOCKER_REFRESH_ENABLED!=='true'||!env.TCG_LOCKER_API_KEY||!env.DB||!env.ARTWORK)return false;
 const lease=await env.DB.prepare('INSERT INTO locker_refresh(id,next_attempt,updated_at) VALUES (1,?,0) ON CONFLICT(id) DO UPDATE SET next_attempt=excluded.next_attempt WHERE next_attempt<=? RETURNING id').bind(now+AGE,now).first();
 if(!lease)return false;
 try{
  const response=await network('https://api-pudo.co.za/api/v1/lockers-data',{headers:{Authorization:'Bearer '+env.TCG_LOCKER_API_KEY,Accept:'application/json'},redirect:'manual',signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw Error('Unavailable');
  const value={locations:normalizeLockers(JSON.parse(await boundedBody(response,8000000))),updatedAt:now};
  const bytes=new TextEncoder().encode(JSON.stringify(value));if(bytes.length>3000000)throw Error('Unavailable');
  await env.ARTWORK.put(KEY,bytes,{httpMetadata:{contentType:'application/json'}});
  await env.DB.prepare('UPDATE locker_refresh SET updated_at=? WHERE id=1').bind(now).run();
  return true;
 }catch{console.warn({event:'locker_refresh_unavailable'});return false;}
}
export async function lockerSnapshotService(env,now=Date.now()){
 const fail=()=>Response.json({error:'Locker directory is temporarily unavailable.'},{status:503});
 const record=await env.DB.prepare('SELECT updated_at FROM locker_refresh WHERE id=1').first();
 if(!record?.updated_at||record.updated_at>now||now-record.updated_at>=FRESH)return fail();
 const object=await env.ARTWORK.get(KEY);if(!object||object.size>3000000)return fail();
 return new Response(object.body,{headers:{'Content-Type':'application/json','X-CV-Directory-Time':String(record.updated_at)}});
}
export async function mapService(request,env){
 const path=new URL(request.url).pathname;
 if(path==='/maps/directory')return lockerSnapshotService(env);
 if(path==='/maps/reserve'){const data=JSON.parse(await boundedBody(request,300));return Response.json({allowed:await reserveMapUsage(env,data.session)});}
 return new Response(null,{status:404});
}
