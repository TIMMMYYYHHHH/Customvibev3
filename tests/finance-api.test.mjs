import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../admin/worker.mjs';
import security from '../security/index.mjs';
import {artworkEnv} from './helpers/artwork.mjs';
import {onRequest} from '../functions/_middleware.js';
import {random,signToken} from '../server/auth.mjs';
const origin='https://admin.customvibe.co.za';
async function fixture(run){const env=artworkEnv(),secret=random(),csrf=random(),token=await signToken({scope:'admin',csrf,jti:random(),exp:Math.floor(Date.now()/1000)+600},secret);Object.assign(env,{ADMIN_PASSWORD_HASH:random(),ADMIN_PASSWORD_SALT:random(),ADMIN_SESSION_SECRET:secret,AUTH:{fetch:(url,init)=>new URL(url).pathname==='/status'?Response.json({revoked:false}):security.fetch(new Request(url,init),env)},ASSETS:{fetch:()=>{throw Error('Finance must not use assets')}}});const req=(path,{method='GET',body,headers={},auth=true}={})=>worker.fetch(new Request(origin+path,{method,headers:{...(auth?{cookie:'__Host-cv-admin='+token}:{}),origin,'X-CSRF-Token':csrf,'Content-Type':'application/json',...headers},...(body===undefined?{}:{body:typeof body==='string'?body:JSON.stringify(body)})}),env);try{await run(env,req)}finally{env.sql.close()}}

test('Admin finance routes require authentication and public site never exposes them',()=>fixture(async(env,req)=>{
 for(const path of ['/api/finance/settings','/api/finance/month?month=2026-11','/api/finance/orders/11111111-1111-4111-8111-111111111111']){
  assert.equal((await req(path,{auth:false})).status,401);
  assert.equal((await onRequest({request:new Request('https://customvibe.co.za'+path),env:{SITE_GATE_ENABLED:'false'},next:()=>{throw Error('Public finance access')}})).status,404);
 }
 assert.deepEqual(await(await req('/api/finance/settings')).json(),{version:0,entries:[],updatedAt:null});
}));

test('Admin finance writes require Origin, CSRF, JSON and bounded strict data',()=>fixture(async(env,req)=>{
 const path='/api/finance/settings',body={version:0,entries:[]};
 for(const headers of [{origin:'https://evil.invalid'},{'X-CSRF-Token':'bad'},{'sec-fetch-site':'cross-site'}])assert.equal((await req(path,{method:'POST',body,headers})).status,403);
 assert.equal((await req(path,{method:'POST',body,headers:{'Content-Type':'text/plain'}})).status,415);
 for(const bad of ['{',JSON.stringify({...body,actor:'Tim'}),JSON.stringify({...body,entries:Array(101).fill({})}),' '.repeat(65537),JSON.stringify({...body,entries:[{name:'日'.repeat(30000)}]})])assert.equal((await req(path,{method:'POST',body:bad})).status,400);
 assert.equal((await req(path,{method:'PUT',body})).status,405);
 assert.equal((await req(path,{method:'POST',body})).status,200);
 assert.equal(env.sql.prepare('SELECT actor FROM finance_changes').get().actor,'authenticated-admin');
}));

test('Admin finance rejects unknown routes, malformed IDs and noncanonical or unknown query fields',()=>fixture(async(env,req)=>{
 for(const path of ['/api/finance/unknown','/api/finance/orders/nope','/api/finance/orders/11111111-1111-4111-8111-111111111111/send'])assert.equal((await req(path)).status,404);
 for(const query of ['month=2026-13','month=2026-11&before=0','month=2026-11&before=1.2','month=2026-11&before=01','month=2026-11&revision=-1','month=2026-11&revision=9007199254740992','month=2026-11&validUntil=abc','month=2026-11&actor=Tim','month=2026-11&month=2026-10'])assert.equal((await req('/api/finance/month?'+query)).status,400,query);
 assert.equal((await req('/api/finance/settings?actor=Tim')).status,400);
 assert.equal((await req('/api/finance/month?month=2026-11',{method:'POST',body:{}})).status,405);
 assert.equal((await req('/api/finance/orders/11111111-1111-4111-8111-111111111111/confirm')).status,405);
}));

test('protected order finance routes expose nullable records, recalculate saves and confirm without touching orders',()=>fixture(async(env,req)=>{
 const id=crypto.randomUUID(),time=Math.floor(Date.now()/1000),path='/api/finance/orders/'+id;
 env.sql.prepare('INSERT INTO orders(id,fingerprint,snapshot,created,expires,artwork_expires) VALUES(?,?,?,?,?,?)').run(id,'a'.repeat(64),JSON.stringify({magnetQty:1,subtotalCents:5000,paymentStatus:'unpaid'}),time,time+1000,time+1209600);
 const before=env.sql.prepare('SELECT * FROM orders WHERE id=?').get(id);
 assert.deepEqual(await(await req(path)).json(),{orderId:id,orderVersion:0,cost:null});
 const line={id:crypto.randomUUID(),name:'Synthetic expense',category:'courier',unit:'parcel',packCents:750,packQuantity:1,basis:'per_order',usageMilli:1000,magnetsPerSheet:null,active:true,excluded:false,amountCents:1};
 assert.equal((await req(path,{method:'POST',body:{version:0,orderVersion:0,lines:[line],actor:'Tim'}})).status,400);
 const saved=await req(path,{method:'POST',body:{version:0,orderVersion:0,lines:[line]}});assert.equal(saved.status,200);assert.equal((await saved.json()).cost.totalCents,750);
 const confirmation=await req(path+'/confirm',{method:'POST',body:{version:1,orderVersion:0}});assert.equal(confirmation.status,200);assert.equal((await confirmation.json()).cost.status,'confirmed');
 assert.deepEqual(env.sql.prepare('SELECT * FROM orders WHERE id=?').get(id),before);assert.equal(env.sql.prepare('SELECT count(*) n FROM order_update_attempts').get().n,0);
}));
