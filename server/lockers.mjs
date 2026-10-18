import {boundedBody,cookie,verifyToken} from './auth.mjs';

// This adapter has no booking, billing, rate or arbitrary-proxy capability.
const ENDPOINT='https://api-pudo.co.za/api/v1/lockers-data';
const MAX_AGE=6*60*60*1000,MAX_BYTES=8000000;
const unavailable=()=>Object.assign(new Error('Locker lookup unavailable'),{status:503});
export const lockerLookupEnabled=env=>env.LOCKER_LOOKUP_ENABLED==='true'&&typeof env.TCG_LOCKER_API_KEY==='string'&&env.TCG_LOCKER_API_KEY.length>=20;
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

export function createLockerSource({network=fetch,cache,now=Date.now}={}){
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
   const cacheKey='https://customvibe.co.za/internal-cache/locker-directory-v1';
   let cachedFailure=false;
   try{
    const cached=await store?.match(cacheKey);
    if(cached){const value=await cached.json();if(value.failed&&value.retryAt>now()){retryAt=value.retryAt;cachedFailure=true;throw unavailable();}if(Array.isArray(value.locations)&&Number.isFinite(value.updatedAt)&&now()>=value.updatedAt&&now()-value.updatedAt<MAX_AGE){memory=value;return value;}}
    const response=await network(ENDPOINT,{method:'GET',headers:{Authorization:'Bearer '+env.TCG_LOCKER_API_KEY,Accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(12000)});
    if(!response.ok)throw unavailable();
    const locations=normalizeLockers(JSON.parse(await boundedBody(response,MAX_BYTES)));
    const value={locations,updatedAt:now()};
    // Cache contains public location details only. It is not a public HTTP route.
    if(store)await store.put(cacheKey,Response.json(value,{headers:{'Cache-Control':`public, max-age=${MAX_AGE/1000}`}}));
    memory=value;return value;
   }catch{
    // A negative cache hit must not postpone the original retry deadline.
    if(cachedFailure)throw unavailable();
    retryAt=Math.max(retryAt,now()+60000);
    try{if(store)await store.put(cacheKey,Response.json({failed:true,retryAt},{headers:{'Cache-Control':'public, max-age=60'}}));}catch{}
    throw unavailable();
   }
  })();
  try{return await pending;}finally{pending=null;}
 };
}
const source=createLockerSource();
export async function lockerAPI(request,env,getLocations=source){
 const url=new URL(request.url),fail=(status,error)=>Response.json({error},{status,headers:{'Cache-Control':'private, no-store'}});
 if(url.hostname!=='customvibe.co.za'||request.headers.get('sec-fetch-site')==='cross-site')return fail(403,'Forbidden');
 if(request.method!=='GET')return fail(405,'Method not allowed');
 if(!enabled(env))return fail(503,'Locker search is temporarily unavailable. You can still enter a preference below.');
 const session=await verifyToken(cookie(request,'__Host-cv-form'),env.SESSION_SECRET,'form');
 if(!session)return fail(401,'Refresh the page to search for lockers.');
 try{return Response.json(await getLocations(env),{headers:{'Cache-Control':'private, no-store'}});}catch{return fail(503,'Locker search is temporarily unavailable. Retry or enter a preference below.');}
}
export async function verifyLockerSelection(locker,env,getLocations=source){
 if(!locker.id)return {name:locker.name,area:locker.area};
 if(!enabled(env))throw unavailable();
 const {locations}=await getLocations(env),found=locations.find(item=>item.id===locker.id);
 if(!found||found.name!==locker.name||found.area!==locker.area)throw Object.assign(new Error('Choose your locker again. Its details have changed or it is no longer listed.'),{status:409});
 return {id:found.id,name:found.name,area:found.area,provider:'tcg-locker'};
}
