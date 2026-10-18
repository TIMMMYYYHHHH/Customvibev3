import test from 'node:test';
import assert from 'node:assert/strict';
import security from '../security/index.mjs';
import {artworkEnv,manifest} from './helpers/artwork.mjs';
const call=(env,path,body)=>security.fetch(new Request('https://internal/orders/'+path,{method:'POST',body:JSON.stringify(body)}),env);
const record=()=>({id:crypto.randomUUID(),fingerprint:'a'.repeat(64),snapshot:{contact:{name:'Test',email:'owner@example.com',phone:'0821234567'},locker:{name:'Locker',area:'Durban'},items:[{kind:'photo',name:'Photo',qty:2,files:[{index:0,name:'design-01-photo.jpg',size:32,proof:false}]}],magnetQty:2,subtotalCents:8000,paymentStatus:'unpaid'},privateArtwork:false});
test('records are idempotent with six-month details and fourteen-day artwork',async()=>{const env=artworkEnv(),b=record();assert.equal((await call(env,'create',b)).status,200);assert.equal((await call(env,'create',b)).status,200);assert.equal((await call(env,'create',{...b,fingerprint:'b'.repeat(64)})).status,409);const list=await(await call(env,'list',{})).json();assert.equal(list.orders.length,1);const d=await(await call(env,'detail',{id:b.id})).json();assert.equal(d.snapshot.items[0].qty,2);assert.equal(d.artworkExpires-d.created,1209600);assert.ok(d.expires-d.created>=181*86400);assert.match(d.reference,/^CV-\d{6}$/);env.sql.exec(`UPDATE orders SET expires=0`);assert.equal((await call(env,'detail',{id:b.id})).status,410);assert.equal((await(await call(env,'list',{})).json()).orders.length,0);});
test('concurrent status edits conflict and never send mail',async()=>{const env=artworkEnv(),b=record();await call(env,'create',b);const changes=await Promise.all(['in_progress','shipped'].map(status=>call(env,'status',{id:b.id,status,version:0})));assert.deepEqual(changes.map(r=>r.status).sort(),[200,409]);const d=await(await call(env,'detail',{id:b.id})).json();assert.equal(d.version,1);assert.equal(d.history.length,1);assert.equal(d.updates.length,0);assert.equal((await call(env,'status',{id:b.id,status:'paid',version:1})).status,400);});
test('private requests require finalized matching artwork and inherit expiry',async()=>{const env=artworkEnv(),b=record();b.privateArtwork=true;assert.equal((await call(env,'create',b)).status,409);const m=await manifest(b.id);env.sql.prepare('INSERT INTO artwork_requests(id,owner,manifest,bytes,created,expires,finalized,reservation) VALUES (?,?,?,?,?,?,?,?)').run(b.id,m.owner,JSON.stringify(m.files),32,1,Math.floor(Date.now()/1000)+300,1,'test');b.snapshot.items[0].files=[{index:0,...m.files[0]}];assert.equal((await call(env,'create',b)).status,200);const d=await(await call(env,'detail',{id:b.id})).json();assert.ok(d.artworkExpires-d.created<=300);assert.ok(d.expires>d.artworkExpires);});

test('expiry erases contact records and both histories without touching current requests',async()=>{
 const {cleanOrders}=await import('../security/orders.mjs');const env=artworkEnv(),old=record(),current=record();
 await call(env,'create',old);await call(env,'create',current);await call(env,'status',{id:old.id,status:'in_progress',version:0});await call(env,'claim-update',{id:old.id,version:1});
 env.sql.prepare('UPDATE orders SET expires=0 WHERE id=?').run(old.id);
 for(const path of ['detail','status','claim-update'])assert.equal((await call(env,path,{id:old.id,status:'shipped',version:1})).status,410);
 await cleanOrders(env);
 assert.equal(env.sql.prepare('SELECT count(*) AS n FROM orders').get().n,1);
 for(const table of ['order_updates','order_history'])assert.equal(env.sql.prepare('SELECT count(*) AS n FROM '+table).get().n,0);
 assert.equal((await call(env,'detail',{id:current.id})).status,200);
});

test('stored item prices preserve submitted bundle allocation after catalogue changes',async()=>{
 const {validateOrder}=await import('../server/submission-model.mjs');const {orderRecord}=await import('../server/order-record.mjs');const {defaultContent}=await import('../src/content/model.mjs');const catalogue=structuredClone(defaultContent);
 const m=await manifest();const input={id:crypto.randomUUID(),createdAt:Math.floor(Date.now()/1000),contact:{name:'Test',email:'owner@example.com',phone:'0821234567'},locker:{name:'Test',area:'Test'},consent:true,items:[{kind:'photo',qty:2,files:m.files},{kind:'puzzle',qty:1,gridSize:3,files:Array.from({length:10},()=>m.files[0])}]};
 const order=validateOrder(input,catalogue,true),snapshot=orderRecord(order,true),env=artworkEnv();
 assert.ok(Number.isSafeInteger(snapshot.items[0].lineCents));assert.equal(snapshot.items.reduce((n,i)=>n+i.lineCents,0),snapshot.subtotalCents);
 catalogue.pricing.single+=1000;catalogue.pricing.ten+=1000;
 const b={id:order.id,fingerprint:'a'.repeat(64),snapshot,privateArtwork:false};await call(env,'create',b);
 assert.deepEqual((await(await call(env,'detail',{id:b.id})).json()).snapshot.items,snapshot.items);
 assert.notEqual(validateOrder(input,catalogue,true).subtotalCents,snapshot.subtotalCents);
});

test('order records preserve quantities above 100 without weakening numeric validation',async()=>{
 const env=artworkEnv(),b=record();b.snapshot.items[0].qty=1000;b.snapshot.magnetQty=1000;b.snapshot.subtotalCents=4000000;
 assert.equal((await call(env,'create',b)).status,200);
 const detail=await(await call(env,'detail',{id:b.id})).json();assert.equal(detail.snapshot.magnetQty,1000);assert.equal(detail.snapshot.items[0].qty,1000);
 for(const qty of [0,-1,1.5,Number.MAX_SAFE_INTEGER+1]){const bad=record();bad.snapshot.items[0].qty=qty;assert.equal((await call(env,'create',bad)).status,400);}
});

test('saved orders accept over 30 entries but retain the exact record-size boundary',async()=>{
 const env=artworkEnv(),b=record();b.snapshot.items=Array.from({length:60},()=>structuredClone(b.snapshot.items[0]));b.snapshot.magnetQty=120;b.snapshot.subtotalCents=480000;
 b.snapshot.padding='';b.snapshot.padding='x'.repeat(40000-JSON.stringify(b.snapshot).length);
 assert.equal(JSON.stringify(b.snapshot).length,40000);assert.equal((await call(env,'create',b)).status,200);
 const detail=await(await call(env,'detail',{id:b.id})).json();assert.equal(detail.snapshot.items.length,60);
 const oversized=structuredClone(b);oversized.id=crypto.randomUUID();oversized.snapshot.padding+='x';assert.equal((await call(env,'create',oversized)).status,400);
});
