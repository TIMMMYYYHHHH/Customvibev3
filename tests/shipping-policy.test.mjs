import test from 'node:test';
import assert from 'node:assert/strict';
import {validateOrder,fingerprintPayload} from '../server/submission-model.mjs';
import {orderRecord} from '../server/order-record.mjs';
import {defaultContent} from '../src/content/model.mjs';
import {artworkEnv,tile,sha} from './helpers/artwork.mjs';
import security from '../security/index.mjs';
import {submissions} from '../server/submissions.mjs';
import {initArtwork,verifyArtworkGrant} from '../server/artwork-api.mjs';
import {random,verifyToken} from '../server/auth.mjs';
const policy=await import('../src/shipping.mjs').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e});
const file={size:2000,sha256:'a'.repeat(64)};
const raw=(qty,subtotal,delivery)=>({id:crypto.randomUUID(),createdAt:Math.floor(Date.now()/1000),contact:{name:'Synthetic',email:'synthetic@example.invalid',phone:'0123456789'},locker:{name:'Example locker',area:'Durban'},consent:true,shippingPolicyVersion:1,deliveryCents:delivery,totalCents:subtotal+delivery,items:[{kind:'photo',qty,files:[file]}]});
const call=(env,path,body)=>security.fetch(new Request('https://internal/orders/'+path,{method:'POST',body:JSON.stringify(body)}),env);

test('delivery charges R69 below R1000 and zero from exactly R1000 with safe integer totals',()=>{
 assert.equal(typeof policy.deliveryPrice,'function');assert.equal(typeof policy.orderTotal,'function');
 for(const [subtotal,fee,total] of [[0,6900,6900],[5000,6900,11900],[96000,6900,102900],[99999,6900,106899],[100000,0,100000],[100001,0,100001],[104000,0,104000],[Number.MAX_SAFE_INTEGER,0,Number.MAX_SAFE_INTEGER]]){
  assert.equal(policy.deliveryPrice(subtotal),fee);assert.equal(policy.orderTotal(subtotal),total);
 }
 for(const value of [-1,1.5,'100000',null,undefined,NaN,Infinity,Number.MAX_SAFE_INTEGER+1])for(const fn of [policy.deliveryPrice,policy.orderTotal])assert.throws(()=>fn(value));
});
test('new validated orders derive and snapshot agreed delivery and total from the validated merchandise subtotal',()=>{
 for(const [qty,subtotal,fee,total] of [[1,5000,6900,11900],[24,96000,6900,102900],[25,100000,0,100000],[26,104000,0,104000]]){
  const input=raw(qty,subtotal,fee),before=structuredClone(input),order=validateOrder(input,defaultContent,true),snapshot=orderRecord(order,true);
  assert.equal(order.subtotalCents,subtotal);assert.equal(order.deliveryCents,fee);assert.equal(order.totalCents,total);assert.equal(order.shippingPolicyVersion,1);
  assert.equal(snapshot.deliveryCents,fee);assert.equal(snapshot.totalCents,total);assert.equal(snapshot.shippingPolicyVersion,1);assert.equal(snapshot.paymentStatus,'unpaid');assert.deepEqual(input,before);
 }
});
test('missing shipping agreement and stale or spoofed shipping terms reject before new order acceptance',()=>{
 const input=raw(24,96000,6900);
 for(const patch of [{shippingPolicyVersion:undefined},{shippingPolicyVersion:0},{shippingPolicyVersion:'1'},{deliveryCents:undefined},{deliveryCents:null},{deliveryCents:0},{deliveryCents:-1},{deliveryCents:6900.5},{totalCents:undefined},{totalCents:null},{totalCents:96000},{totalCents:1}])assert.throws(()=>validateOrder({...input,...patch},defaultContent,true));
 const stale=raw(24,96000,6900);stale.items[0].qty=25;assert.throws(()=>validateOrder(stale,defaultContent,true));
});
test('orderRecord keeps historical absent or null shipping unknown without applying the current policy',()=>{
 const legacy=validateOrder(raw(6,27000,6900),defaultContent,true);delete legacy.shippingPolicyVersion;delete legacy.deliveryCents;delete legacy.totalCents;
 for(const terms of [{},{deliveryCents:null},{deliveryCents:null,totalCents:null}]){
  const input={...legacy,...terms},before=structuredClone(input),snapshot=orderRecord(input,true);
  for(const key of ['shippingPolicyVersion','deliveryCents','totalCents'])assert.equal(Object.hasOwn(snapshot,key),Object.hasOwn(input,key));
  for(const [key,value]of Object.entries(terms))assert.equal(snapshot[key],value);
  assert.equal(snapshot.subtotalCents,27000);assert.deepEqual(input,before);
 }
});
const saved=(terms={})=>({id:crypto.randomUUID(),fingerprint:'a'.repeat(64),privateArtwork:false,snapshot:{contact:{name:'Synthetic',email:'synthetic@example.invalid',phone:'0123456789'},locker:{name:'Locker',area:'Durban'},items:[{kind:'photo',name:'Photo',qty:1,files:[]}],magnetQty:1,subtotalCents:5000,paymentStatus:'unpaid',...terms}});
test('snapshot validation preserves legacy unknown shipping and validates exact known totals without repricing',async()=>{
 const env=artworkEnv();
 for(const terms of [{},{deliveryCents:null},{deliveryCents:null,totalCents:null},{deliveryCents:6900,totalCents:11900,shippingPolicyVersion:1},{deliveryCents:0,totalCents:5000}]){
  const b=saved(terms),before=structuredClone(b.snapshot);assert.equal((await call(env,'create',b)).status,200);assert.equal((await call(env,'create',b)).status,200);
  const detail=await(await call(env,'detail',{id:b.id})).json();assert.deepEqual(detail.snapshot,before);
  const listed=(await(await call(env,'list',{})).json()).orders.find(o=>o.id===b.id).snapshot;
  for(const key of ['deliveryCents','totalCents','shippingPolicyVersion']){assert.equal(Object.hasOwn(listed,key),Object.hasOwn(before,key));if(Object.hasOwn(before,key))assert.equal(listed[key],before[key]);}
  assert.equal((await call(env,'status',{id:b.id,status:'in_progress',version:0})).status,200);assert.deepEqual((await(await call(env,'detail',{id:b.id})).json()).snapshot,before);
 }
 for(const terms of [{deliveryCents:6900},{totalCents:11900},{deliveryCents:null,totalCents:11900},{deliveryCents:-1,totalCents:4999},{deliveryCents:6900,totalCents:11901},{deliveryCents:6900.5,totalCents:11900.5},{deliveryCents:'6900',totalCents:11900},{deliveryCents:6900,totalCents:Number.MAX_SAFE_INTEGER+1},{deliveryCents:6900,totalCents:11900,shippingPolicyVersion:2}])assert.equal((await call(env,'create',saved(terms))).status,400);
});
test('shipping agreement is part of frozen grant and retry identity, including free shipping',async()=>{
 for(const [qty,subtotal,fee]of [[1,5000,6900],[25,100000,0]]){
  const order=validateOrder(raw(qty,subtotal,fee),defaultContent,true),legacy={...order,deliveryCents:null};delete legacy.totalCents;delete legacy.shippingPolicyVersion;
  assert.notEqual(fingerprintPayload(order),fingerprintPayload(legacy));
  assert.equal(fingerprintPayload(order),fingerprintPayload({...order,items:order.items.map(({lineCents,...i})=>i)}));
  const storage=artworkEnv(),env={...storage,SESSION_SECRET:random(),AUTH:{fetch:(url,options)=>security.fetch(new Request(url,options),storage)}},session={jti:random(),csrf:random(),exp:Math.floor(Date.now()/1000)+3600};
  const first=await(await initArtwork(env,session,legacy,'192.0.2.1')).json();assert.ok(first.grant);
  assert.equal(await verifyArtworkGrant(first.grant,env,session,order),null);
  const resumed=await initArtwork(env,{...session,jti:random()},order,'192.0.2.1',first.resume);assert.equal(resumed.status,403);
 }
});

const origin='https://customvibe.co.za';
async function privateContext(){
 const storage=artworkEnv(),env={...storage,SITE_GATE_ENABLED:'true',SUBMISSIONS_ENABLED:'true',ARTWORK_STORAGE_ENABLED:'true',ORDER_RECORDS_ENABLED:'true',RESEND_API_KEY:'synthetic',TURNSTILE_SECRET_KEY:'synthetic',TURNSTILE_SITE_KEY:'synthetic',SESSION_SECRET:random(),AUTH:{fetch:(url,options)=>security.fetch(new Request(url,options),storage)},CATALOGUE:{fetch:async()=>Response.json(defaultContent)}};
 const response=await submissions(new Request(origin+'/api/forms'),env),config={...await response.json(),cookie:response.headers.get('set-cookie').split(';')[0]};
 const session=await verifyToken(config.cookie.slice(config.cookie.indexOf('=')+1),env.SESSION_SECRET,'form');
 const post=(path,body,headers={})=>new Request(origin+path,{method:'POST',headers:{origin,cookie:config.cookie,'X-CSRF-Token':config.csrf,'CF-Connecting-IP':'192.0.2.1','Content-Type':'application/json',...headers},body:body instanceof Uint8Array?body:JSON.stringify(body)});
 let sends=0;const network=async url=>{if(url.includes('siteverify'))return Response.json({success:true,hostname:'customvibe.co.za',action:'order'});sends++;return Response.json({id:'synthetic-accepted-'+sends})};
 const input=raw(1,5000,6900);input.items[0].files=[{size:tile.length,sha256:await sha(tile)}];
 return {env,config,session,post,network,input,sends:()=>sends};
}
test('old pending and accepted private attempts cannot silently gain shipping or duplicate saved orders or email',async()=>{
 for(const accepted of [false,true]){
  const h=await privateContext(),current=validateOrder(h.input,defaultContent,true),legacy={...current,deliveryCents:null};delete legacy.totalCents;delete legacy.shippingPolicyVersion;
  const first=await(await initArtwork(h.env,h.session,legacy,'192.0.2.1')).json();
  if(accepted){
   assert.equal((await submissions(h.post('/api/artwork/upload',tile,{'Content-Type':'image/jpeg','X-Artwork-Grant':first.grant,'X-Artwork-Index':'0'}),h.env,h.network)).status,200);
   const {completeArtwork}=await import('../server/artwork-api.mjs');const grant=await verifyArtworkGrant(first.grant,h.env,h.session,legacy);assert.equal((await completeArtwork(h.env,grant,legacy)).status,200);
   const snapshot=orderRecord(legacy,true);delete snapshot.deliveryCents;
   assert.equal((await call(h.env,'create',{id:legacy.id,fingerprint:'a'.repeat(64),snapshot,privateArtwork:true})).status,200);
   for(const stage of ['owner_sent','receipt_sent'])assert.equal((await call(h.env,'delivery',{id:legacy.id,stage})).status,200);
  }
  const before=h.env.sql.prepare('SELECT * FROM orders').all(),oldPage={...h.input};delete oldPage.shippingPolicyVersion;delete oldPage.deliveryCents;delete oldPage.totalCents;
  assert.equal((await submissions(h.post('/api/order-request',{payload:oldPage,grant:first.grant}),h.env,h.network)).status,400);
  assert.equal((await submissions(h.post('/api/order-request',{payload:h.input,grant:first.grant}),h.env,h.network)).status,403);
  assert.equal((await submissions(h.post('/api/artwork/init',{payload:h.input,turnstile:'synthetic',resume:first.resume}),h.env,h.network)).status,403);
  assert.deepEqual(h.env.sql.prepare('SELECT * FROM orders').all(),before);assert.equal(h.sends(),0);
 }
});
test('new private order freezes shipping totals and retries once accepted without a second order or duplicate sends',async()=>{
 const h=await privateContext();const first=await(await submissions(h.post('/api/artwork/init',{payload:h.input,turnstile:'synthetic'}),h.env,h.network)).json();assert.ok(first.grant);
 assert.equal((await submissions(h.post('/api/artwork/upload',tile,{'Content-Type':'image/jpeg','X-Artwork-Grant':first.grant,'X-Artwork-Index':'0'}),h.env,h.network)).status,200);
 const finish=payload=>submissions(h.post('/api/order-request',{payload,grant:first.grant}),h.env,h.network);
 assert.equal((await finish(h.input)).status,200);const original=h.env.sql.prepare('SELECT * FROM orders').get(),snapshot=JSON.parse(original.snapshot);
 assert.equal(snapshot.deliveryCents,6900);assert.equal(snapshot.totalCents,11900);assert.equal(snapshot.shippingPolicyVersion,1);assert.equal(snapshot.subtotalCents,5000);
 assert.equal((await finish(h.input)).status,200);assert.equal(h.sends(),2);assert.equal(h.env.sql.prepare('SELECT count(*) AS n FROM orders').get().n,1);assert.equal(h.env.sql.prepare('SELECT snapshot FROM orders').get().snapshot,original.snapshot);
 assert.equal((await finish({...h.input,deliveryCents:0,totalCents:5000})).status,400);assert.equal(h.sends(),2);assert.equal(h.env.sql.prepare('SELECT snapshot FROM orders').get().snapshot,original.snapshot);
});

test('stale checkout shipping terms ask for a fresh delivery-total review before grants records or mail',async()=>{
 const h=await privateContext(),auth=h.env.AUTH;let authCalls=0;h.env.AUTH={fetch(...args){authCalls++;return auth.fetch(...args)}};
 for(const patch of [{shippingPolicyVersion:undefined},{deliveryCents:0,totalCents:5000},{totalCents:11901}]){
  const response=await submissions(h.post('/api/artwork/init',{payload:{...h.input,...patch},turnstile:'synthetic'}),h.env,h.network);
  assert.equal(response.status,400);const body=await response.json();assert.match(body.error,/refresh checkout/i);assert.match(body.error,/review.*delivery.*total.*before submitting/i);
 }
 const invalid=await submissions(h.post('/api/artwork/init',{payload:{...h.input,contact:{...h.input.contact,email:'invalid-email'}},turnstile:'synthetic'}),h.env,h.network);
 assert.equal(invalid.status,400);const body=await invalid.json();assert.match(body.error,/Check your details, products and artwork/);assert.doesNotMatch(body.error,/invalid-email|refresh checkout|SHIPPING_TERMS_CHANGED/);
 assert.equal(authCalls,0);assert.equal(h.sends(),0);assert.equal(h.env.objects.size,0);
 for(const table of ['orders','artwork_requests','submissions'])assert.equal(h.env.sql.prepare('SELECT count(*) AS n FROM '+table).get().n,0);
});
