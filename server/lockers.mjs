import {boundedBody,cookie,verifyToken} from './auth.mjs';

// This adapter has no booking, billing, rate or arbitrary-proxy capability.
const ENDPOINT='https://api-pudo.co.za/api/v1/lockers-data';
const MAX_AGE=6*60*60*1000,MAX_BYTES=8000000;
const CACHE_KEY='https://customvibe.co.za/internal-cache/locker-directory-v3';
const unavailable=()=>Object.assign(new Error('Locker lookup unavailable'),{status:503});
export const lockerLookupEnabled=env=>env.LOCKER_LOOKUP_ENABLED==='true'&&(env.LOCKER_SHARED_ENABLED==='true'?!!env.AUTH:typeof env.TCG_LOCKER_API_KEY==='string'&&env.TCG_LOCKER_API_KEY.length>=20);
const enabled=lockerLookupEnabled;
const text=(value,max)=>typeof value==='string'?value.replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,max):'';
export function normalizeLockers(data){
 if(!Array.isArray(data)||data.length>10000)throw unavailable();
 const seen=new Set(),locations=[];
 for(const item of data){
  if(!item||item.type?.id!==2||item.status!=='online'||item.active===false||item.active===0||item.is_active===false||item.is_active===0||item.deleted_at)continue;
  const id=text(item.code,40),name=text(item.name,140),area=text(item.place?.town,140),address=text(item.address,300);
  const lat=Number(item.latitude),lon=Number(item.longitude);
  if(!/^[A-Za-z0-9_-]{1,40}$/.test(id)||!name||!area||!address||!Number.isFinite(lat)||!Number.isFinite(lon)||lat< -35||lat> -22||lon<16||lon>33)continue;
  if(seen.has(id))throw unavailable();seen.add(id);
  const hours=Array.isArray(item.openinghours)?item.openinghours.slice(0,8).filter(h=>h&&/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Public Holidays)$/.test(text(h.day,20))&&/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(h.open_time)&&/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(h.close_time)).map(h=>`${text(h.day,20)} ${h.isStoreOpen==='Closed'?'closed':`${h.open_time.slice(0,5)}–${h.close_time.slice(0,5)}`}`).join('; '):'';
  locations.push({id,name,area,address,postcode:text(item.place?.postalCode,12),lat,lon,hours});
 }
 if(!locations.length)throw unavailable();
 return locations.sort((a,b)=>a.name.localeCompare(b.name));
}

export function createLockerSource({network=fetch,cache,now=Date.now,diagnostic=message=>console.warn(message)}={}){
 let pending=null,memory=null,retryAt=0,credential=null;
 return async function source(env){
  if(!enabled(env))throw unavailable();
  // A changed key must never inherit a failure hold or an in-flight old request.
  if(credential!==env.TCG_LOCKER_API_KEY){credential=env.TCG_LOCKER_API_KEY;memory=null;pending=null;retryAt=0;}
  if(memory&&now()-memory.updatedAt<MAX_AGE)return memory;
  if(now()<retryAt)throw unavailable();
  if(pending)return pending;
  pending=(async()=>{
   const store=cache??globalThis.caches?.default;
   const cacheKey=CACHE_KEY;
   let cachedFailure=false,stage='cache-read',upstreamStatus=0;
   try{
    const cached=await store?.match(cacheKey);
    if(cached){const value=await cached.json();if(value.failed&&value.retryAt>now()){retryAt=value.retryAt;cachedFailure=true;throw unavailable();}if(Array.isArray(value.locations)&&Number.isFinite(value.updatedAt)&&now()>=value.updatedAt&&now()-value.updatedAt<MAX_AGE){memory=value;return value;}}
    stage='network';
    const response=await network(ENDPOINT,{method:'GET',headers:{Authorization:'Bearer '+env.TCG_LOCKER_API_KEY,Accept:'application/json'},redirect:'manual',signal:AbortSignal.timeout(12000)});
    upstreamStatus=response.status;stage='upstream-status';
    if(!response.ok)throw unavailable();
    stage='read-body';const body=await boundedBody(response,MAX_BYTES);
    stage='parse-body';const data=JSON.parse(body);
    stage='normalize';const locations=normalizeLockers(data);
    const value={locations,updatedAt:now()};
    // Cache contains public location details only. It is not a public HTTP route.
    stage='cache-write';if(store)await store.put(cacheKey,Response.json(value,{headers:{'Cache-Control':`public, max-age=${MAX_AGE/1000}`,'X-CV-Directory-Time':String(value.updatedAt)}}));
    memory=value;return value;
   }catch{
    // A negative cache hit must not postpone the original retry deadline.
    if(cachedFailure)throw unavailable();
    // Fixed labels/status only. Never log credentials, response bodies or exception messages.
    diagnostic(`Locker directory unavailable: ${stage}; HTTP ${upstreamStatus}`);
    retryAt=Math.max(retryAt,now()+60000);
    try{if(store)await store.put(cacheKey,Response.json({failed:true,retryAt},{headers:{'Cache-Control':'public, max-age=60'}}));}catch{}
    throw unavailable();
   }
  })();
  try{return await pending;}finally{pending=null;}
 };
}
const legacySource=createLockerSource();
async function source(env){
 if(env.LOCKER_SHARED_ENABLED!=='true')return legacySource(env);
 const response=await env.AUTH.fetch('https://auth.internal/maps/directory',{method:'POST'});
 if(!response.ok)throw unavailable();
 const value=JSON.parse(await boundedBody(response,3000000));
 if(!Array.isArray(value.locations)||!Number.isFinite(value.updatedAt)||Date.now()-value.updatedAt>=MAX_AGE||value.updatedAt>Date.now())throw unavailable();
 return value;
}
// This cache was written only after validation. Stream its JSON without parsing and
// serializing the full directory again. Call only after the site's form-session check.
export async function cachedLockerResponse(store=globalThis.caches?.default,now=Date.now()){
 try{
  const cached=await store?.match(CACHE_KEY),stamp=Number(cached?.headers.get('X-CV-Directory-Time'));
  if(!cached?.ok||!cached.headers.has('X-CV-Directory-Time')||!Number.isFinite(stamp)||now<stamp||now-stamp>=MAX_AGE)return null;
  return new Response(cached.body,{headers:{'Content-Type':'application/json','Cache-Control':'private, no-store'}});
 }catch{return null;}
}
export async function lockerAPI(request,env,getLocations=source){
 const url=new URL(request.url),fail=(status,error)=>Response.json({error},{status,headers:{'Cache-Control':'private, no-store'}});
 if(url.hostname!=='customvibe.co.za'||request.headers.get('sec-fetch-site')==='cross-site')return fail(403,'Forbidden');
 if(request.method!=='GET')return fail(405,'Method not allowed');
 if(!enabled(env))return fail(503,'Locker search is temporarily unavailable. You can still enter a preference below.');
 const session=await verifyToken(cookie(request,'__Host-cv-form'),env.SESSION_SECRET,'form');
 if(!session)return fail(401,'Refresh the page to search for lockers.');
 if(getLocations===source){const cached=await cachedLockerResponse();if(cached)return cached;}
 try{const value=await getLocations(env);if(env.LOCKER_SHARED_ENABLED==='true'&&globalThis.caches?.default)await caches.default.put(CACHE_KEY,Response.json(value,{headers:{'Cache-Control':`public, max-age=${Math.max(1,Math.floor((MAX_AGE-(Date.now()-value.updatedAt))/1000))}`,'X-CV-Directory-Time':String(value.updatedAt)}}));return Response.json(value,{headers:{'Cache-Control':'private, no-store'}});}catch{return fail(503,'Locker search is temporarily unavailable. Retry or enter a preference below.');}
}
export async function verifyLockerSelection(locker,env,getLocations=source){
 if(!locker.id)return {name:locker.name,area:locker.area};
 if(!enabled(env))throw unavailable();
 const {locations}=await getLocations(env),found=locations.find(item=>item.id===locker.id);
 if(!found||found.name!==locker.name||found.area!==locker.area)throw Object.assign(new Error('Choose your locker again. Its details have changed or it is no longer listed.'),{status:409});
 return {id:found.id,name:found.name,area:found.area,provider:'tcg-locker'};
}
