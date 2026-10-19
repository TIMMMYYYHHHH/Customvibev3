import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeLockers,createLockerSource,lockerAPI,verifyLockerSelection,cachedLockerResponse} from '../server/lockers.mjs';
import {random,signToken} from '../server/auth.mjs';
const row=(patch={})=>({code:'CG123',status:'online',name:'Example locker',latitude:'-29.8',longitude:'31.04',address:'1 Example Road, Durban North',place:{town:'Durban North',postalCode:'4051'},type:{id:2,name:'Locker'},openinghours:[{day:'Monday',open_time:'08:00:00',close_time:'17:00:00'}],...patch});
const env=()=>({LOCKER_LOOKUP_ENABLED:'true',TCG_LOCKER_API_KEY:random(),SESSION_SECRET:random()});
const cache=()=>{const entries=new Map();return {async match(key){return entries.get(String(key))?.clone()},async put(key,response){entries.set(String(key),response.clone())}}};
test('validated cached directory streams privately, with expiry enforced and negative cache excluded',async()=>{
 const store=cache(),settings=env(),time=100000;
 await createLockerSource({cache:store,now:()=>time,network:async()=>Response.json([row()])})(settings);
 const response=await cachedLockerResponse(store,time+1);
 assert.equal(response.headers.get('Cache-Control'),'private, no-store');assert.equal(response.headers.get('X-CV-Directory-Time'),null);
 assert.equal((await response.json()).locations[0].id,'CG123');
 assert.equal(await cachedLockerResponse(store,time-1),null);assert.equal(await cachedLockerResponse(store,time+(6*60+15)*60000),null);
 const failed=cache();await assert.rejects(()=>createLockerSource({cache:failed,now:()=>time,network:async()=>new Response('',{status:503})})(settings));
 assert.equal(await cachedLockerResponse(failed,time+1),null);
});
test('failure diagnostics contain only fixed stages and status, never credentials or provider details',async()=>{
 const settings=env(),messages=[];
 const source=createLockerSource({cache:cache(),diagnostic:m=>messages.push(m),network:async()=>new Response('private upstream detail '+settings.TCG_LOCKER_API_KEY,{status:403})});
 await assert.rejects(()=>source(settings));
 assert.deepEqual(messages,['Locker directory unavailable: upstream-status; HTTP 403']);
});
test('provider data exposes only valid locker locations, never kiosks or arbitrary upstream fields',()=>{
 const list=normalizeLockers([row({private_token:'hidden'}),row({code:'K1',type:{id:1,name:'Kiosk'}}),row({code:'BAD',latitude:'0'}),row({code:'OFF',status:'offline'}),row({code:'UNKNOWN',status:undefined}),row({code:'DUP',name:''})]);
 assert.equal(list.length,1);assert.deepEqual(list[0],{id:'CG123',name:'Example locker',area:'Durban North',address:'1 Example Road, Durban North',postcode:'4051',lat:-29.8,lon:31.04,hours:'Monday 08:00–17:00'});
 assert.throws(()=>normalizeLockers({error:'upstream error'}));
 assert.throws(()=>normalizeLockers([row(),row()]));
});
test('locker source uses a fixed GET endpoint, server bearer key, bounded cache and concurrent request coalescing',async()=>{
 const settings=env(),store=cache();let count=0;
 const source=createLockerSource({cache:store,network:async(url,options)=>{count++;assert.equal(url,'https://api-pudo.co.za/api/v1/lockers-data');assert.equal(options.method,'GET');assert.equal(options.redirect,'manual');assert.equal(options.headers.Authorization,'Bearer '+settings.TCG_LOCKER_API_KEY);return Response.json([row()]);}});
 const results=await Promise.all([source(settings),source(settings),source(settings)]);assert.equal(count,1);assert.equal(results[0].locations[0].id,'CG123');
 await source(settings);assert.equal(count,1);
 const another=createLockerSource({cache:store,network:async()=>{throw Error('Cache must be reused')}});assert.equal((await another(settings)).locations.length,1);
});
test('failed and oversized upstream responses are not returned or cached as locker data',async()=>{
 for(const response of [new Response('secret upstream detail',{status:500}),new Response(null,{status:302,headers:{Location:'https://untrusted.example/'}}),Response.json({error:'private error'}),new Response('x'.repeat(8000001)),Response.json([])]){
  const source=createLockerSource({cache:cache(),network:async()=>response});await assert.rejects(()=>source(env()),/Locker lookup unavailable/);
 }
});
test('locker lookup rejects disabled, preview, cross-site and invalid-session requests before accessing the courier',async()=>{
 const settings=env();let calls=0;const source=async()=>{calls++;return {locations:normalizeLockers([row()]),updatedAt:Date.now()}};
 const request=new Request('https://customvibe.co.za/api/lockers');
 assert.equal((await lockerAPI(request,settings,source)).status,401);
 const token=await signToken({scope:'form',jti:random(),csrf:random(),exp:Math.floor(Date.now()/1000)+3600},settings.SESSION_SECRET);
 const req=(url='https://customvibe.co.za/api/lockers',extra={})=>new Request(url,{headers:{cookie:'__Host-cv-form='+token,...extra}});
 assert.equal((await lockerAPI(req(),{...settings,LOCKER_LOOKUP_ENABLED:'false'},source)).status,503);
 assert.equal((await lockerAPI(req('https://preview.pages.dev/api/lockers'),settings,source)).status,403);
 assert.equal((await lockerAPI(req(undefined,{'Sec-Fetch-Site':'cross-site'}),settings,source)).status,403);
 assert.equal(calls,0);
 const r=await lockerAPI(req(),settings,source);assert.equal(r.status,200);assert.doesNotMatch(await r.text(),new RegExp(settings.TCG_LOCKER_API_KEY));
});
test('selected IDs are checked against provider records and cannot override name, area or provider',async()=>{
 const settings=env(),list=normalizeLockers([row()]),source=async()=>({locations:list,updatedAt:Date.now()});
 const picked={id:'CG123',name:'Example locker',area:'Durban North',provider:'attacker',verified:true};
 assert.deepEqual(await verifyLockerSelection(picked,settings,source),{id:'CG123',name:'Example locker',area:'Durban North',provider:'tcg-locker'});
 await assert.rejects(()=>verifyLockerSelection({...picked,id:'MISSING'},settings,source),/Choose your locker again/);
 await assert.rejects(()=>verifyLockerSelection({...picked,name:'Changed name'},settings,source),/Choose your locker again/);
 await assert.rejects(()=>verifyLockerSelection(picked,{...settings,LOCKER_LOOKUP_ENABLED:'false'},source),/Locker lookup unavailable/);
 assert.deepEqual(await verifyLockerSelection({name:'Manual preference',area:'Durban'},settings,source),{name:'Manual preference',area:'Durban'});
});
test('expired directories refresh, failures back off, and stale locations are not silently accepted',async()=>{
 let time=10000000,calls=0,failing=false;
 const source=createLockerSource({now:()=>time,cache:cache(),network:async()=>{calls++;if(failing)throw Error('private upstream detail');return Response.json([row()]);}}),settings=env();
 await source(settings);time+=(6*60+15)*60000+1;failing=true;
 await assert.rejects(()=>source(settings),/Locker lookup unavailable/);assert.equal(calls,2);
 await assert.rejects(()=>source(settings));assert.equal(calls,2);
 time+=60001;failing=false;assert.equal((await source(settings)).updatedAt,time);assert.equal(calls,3);
});
test('shared failure cache retains its original deadline across fresh isolates',async()=>{
 let time=100000,calls=0;const store=cache(),settings=env();
 const make=failing=>createLockerSource({cache:store,now:()=>time,network:async()=>{calls++;if(failing)throw Error('offline');return Response.json([row()])}});
 await assert.rejects(()=>make(true)(settings));
 time+=30000;await assert.rejects(()=>make(false)(settings));
 time+=20000;await assert.rejects(()=>make(false)(settings));assert.equal(calls,1);
 time=160001;assert.equal((await make(false)(settings)).locations.length,1);assert.equal(calls,2);
});
