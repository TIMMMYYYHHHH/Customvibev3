import test from 'node:test';import assert from 'node:assert/strict';
import {mapAPI} from '../server/map-api.mjs';import {random,signToken} from '../server/auth.mjs';
async function setup(){const env={MAP_LOOKUP_ENABLED:'true',GEOAPIFY_API_KEY:'fictional-provider-key',SESSION_SECRET:random(),AUTH:{fetch:async()=>Response.json({allowed:true})}};const token=await signToken({scope:'form',jti:'a'.repeat(64),csrf:'b'.repeat(64),exp:Math.floor(Date.now()/1000)+300},env.SESSION_SECRET);return {env,req:(body={},path='/api/map/search',extra={})=>new Request('https://customvibe.co.za'+path,{method:'POST',headers:{cookie:'__Host-cv-form='+token,origin:'https://customvibe.co.za','X-CSRF-Token':'b'.repeat(64),'Content-Type':'application/json',...extra},body:JSON.stringify(body)})}}
test('location proxy validates session, CSRF and query before calling fixed geocoder; key and upstream fields stay private',async()=>{
 const {env,req}=await setup();let calls=0;const network=async(url,opts)=>{calls++;const u=new URL(url);assert.equal(u.origin,'https://api.geoapify.com');assert.equal(u.searchParams.get('filter'),'countrycode:za');assert.equal(opts.redirect,'manual');return Response.json({results:[{lat:-29.8,lon:31.04,formatted:'Durban North',country_code:'za',private:'not exposed'},{lat:51,lon:0,formatted:'London'}]})};
 assert.equal((await mapAPI(req({query:'Durban'},undefined,{'X-CSRF-Token':'bad'}),env,{network})).status,403);assert.equal(calls,0);
 assert.equal((await mapAPI(req({query:'x'}),env,{network})).status,400);
 const r=await mapAPI(req({query:'Durban'}),env,{network});assert.deepEqual(await r.json(),{locations:[{lat:-29.8,lon:31.04,label:'Durban North'}]});assert.equal(calls,1);
 env.AUTH.fetch=async()=>Response.json({allowed:false});assert.equal((await mapAPI(req({query:'Durban'}),env,{network})).status,429);assert.equal(calls,1);
});
test('disabled and preview map calls fail closed without provider requests',async()=>{
 const {env,req}=await setup();const network=()=>{throw Error('must not call')};assert.equal((await mapAPI(req({query:'Durban'}),{...env,MAP_LOOKUP_ENABLED:'false'},{network})).status,503);
 assert.equal((await mapAPI(new Request('https://preview.pages.dev/api/map/tiles/10/600/600.png'),env,{network})).status,403);
});
test('tile proxy bounds provider access, caches public bytes and keeps session protection on warm requests',async()=>{
 const {env,req}=await setup();let calls=0,reservations=0;const entries=new Map();
 env.AUTH.fetch=async()=>{reservations++;return Response.json({allowed:true})};
 const cache={match:async key=>entries.get(key)?.clone(),put:async(key,value)=>entries.set(key,value.clone())};
 const network=async(url,options)=>{calls++;assert.match(url,/^https:\/\/maps\.geoapify\.com\/v1\/tile\/osm-carto\/11\/1200\/1201\.png\?/);assert.equal(options.redirect,'manual');return new Response(new Uint8Array([137,80,78,71]),{headers:{'Content-Type':'image/png'}})};
 const tile=path=>new Request('https://customvibe.co.za'+path,{headers:req().headers});
 for(const path of ['/api/map/tiles/18/1/1.png','/api/map/tiles/11/1/1.png','/api/map/tiles/11/3000/1.png'])assert.equal((await mapAPI(tile(path),env,{network,cache})).status,400);
 const path='/api/map/tiles/11/1200/1201.png';assert.equal((await mapAPI(tile(path),env,{network,cache})).status,200);
 assert.equal((await mapAPI(tile(path),env,{network,cache})).status,200);assert.equal(calls,1);assert.equal(reservations,1);
 assert.equal((await mapAPI(new Request('https://customvibe.co.za'+path),env,{network,cache})).status,401);assert.equal(calls,1);
});
