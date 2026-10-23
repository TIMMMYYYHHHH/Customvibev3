import test from 'node:test';import assert from 'node:assert/strict';
import {stockAPI} from '../admin/stock-api.mjs';
const session={csrf:'token'},url='https://admin.example.invalid/api/stock/items';
const req=(method='GET',body,extra={})=>new Request(url,{method,headers:{Origin:'https://admin.example.invalid','X-CSRF-Token':'token','Content-Type':'application/json',...extra},...(body===undefined?{}:{body:JSON.stringify(body)})});
test('private stock API authenticates, verifies CSRF, rejects unknown fields and forwards structured errors',async()=>{
 const calls=[],env={AUTH:{fetch:async(url,options)=>{calls.push({url,options});return Response.json({error:'Changed',code:'CONFLICT'},{status:409})}}};assert.equal((await stockAPI(req(),env,null)).status,401);assert.equal((await stockAPI(req('POST',{}, {'X-CSRF-Token':'bad'}),env,session)).status,403);assert.equal((await stockAPI(req('POST',{unexpected:true}),env,session)).status,400);assert.equal(calls.length,0);
 const r=await stockAPI(req(),env,session);assert.equal(r.status,409);assert.deepEqual(await r.json(),{error:'Changed',code:'CONFLICT'});assert.ok(calls[0].url.endsWith('/stock/items-read'));
});
test('stock API bounds UTF-8 bytes and validates history query and methods',async()=>{
 const env={AUTH:{fetch:async()=>Response.json({})}};
 assert.equal((await stockAPI(req('POST',{operationId:'x',unit:'日'.repeat(22000)}),env,session)).status,413);
 for(const suffix of ['?revision=-1','?before=0','?revision=1&revision=1','?customer=x'])assert.equal((await stockAPI(new Request('https://admin.example.invalid/api/stock/history'+suffix),env,session)).status,400);
 assert.equal((await stockAPI(req('DELETE'),env,session)).status,405);
});
test('internal service has the structured stock dispatch and strict byte limit',async()=>{
 const {default:security}=await import('../security/index.mjs'),{artworkEnv}=await import('./helpers/artwork.mjs');const env=artworkEnv();try{
 const r=await security.fetch(new Request('https://internal/stock/items-read',{method:'POST',body:'{}'}),env);assert.equal(r.status,200);assert.deepEqual((await r.json()).items,[]);
 const oversized=await security.fetch(new Request('https://internal/stock/items-read',{method:'POST',body:' '.repeat(65537)}),env);assert.equal(oversized.status,413);assert.equal((await oversized.json()).code,'TOO_LARGE');
 }finally{env.sql.close()}
});
test('Admin worker routes stock through its existing gate with structured failures; public site never exposes stock',async()=>{
 const {default:worker}=await import('../admin/worker.mjs'),{default:security}=await import('../security/index.mjs'),{artworkEnv}=await import('./helpers/artwork.mjs'),{random,signToken}=await import('../server/auth.mjs'),{onRequest}=await import('../functions/_middleware.js');
 const env=artworkEnv(),secret=random(),csrf=random(),token=await signToken({scope:'admin',csrf,jti:random(),exp:Math.floor(Date.now()/1000)+600},secret);Object.assign(env,{ADMIN_PASSWORD_HASH:random(),ADMIN_PASSWORD_SALT:random(),ADMIN_SESSION_SECRET:secret,AUTH:{fetch:(url,init)=>new URL(url).pathname==='/status'?Response.json({revoked:false}):security.fetch(new Request(url,init),env)},ASSETS:{fetch:()=>{throw Error('Stock must not use assets')}}});
 try{for(const path of ['/api/stock/items','/api/stock/history','/api/stock/orders/11111111-1111-4111-8111-111111111111']){
 const denied=await worker.fetch(new Request('https://admin.example.invalid'+path),env);assert.equal(denied.status,401);assert.equal((await denied.json()).code,'UNAUTHORIZED');assert.equal((await onRequest({request:new Request('https://shop.example.invalid'+path),env:{SITE_GATE_ENABLED:'false'},next:()=>{throw Error('Public stock access')}})).status,404)}
 const response=await worker.fetch(new Request('https://admin.example.invalid/api/stock/items',{headers:{cookie:'__Host-cv-admin='+token}}),env);assert.equal(response.status,200);assert.deepEqual((await response.json()).items,[]);
 }finally{env.sql.close()}
});
