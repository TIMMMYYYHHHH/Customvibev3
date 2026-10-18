import test from 'node:test';
import assert from 'node:assert/strict';
import {artworkEnv} from './helpers/artwork.mjs';
import {orderService,cleanOrders} from '../security/orders.mjs';
import {proofService} from '../security/proofs.mjs';
const call=(env,path,body)=>orderService(new Request('https://internal/orders/'+path,{method:'POST',body:JSON.stringify(body)}),env);
const record=()=>({id:crypto.randomUUID(),fingerprint:'a'.repeat(64),snapshot:{contact:{name:'Customer',email:'customer@example.com',phone:'1234567'},locker:{name:'Locker',area:'Durban'},items:[{kind:'photo',name:'Photo',qty:1,files:[]}],magnetQty:1,subtotalCents:4000,paymentStatus:'unpaid'}});
async function create(env){const b=record();assert.equal((await call(env,'create',b)).status,200);return b.id}
test('fulfilled records get six calendar months independently of original artwork and reopen safely',async()=>{
 const env=artworkEnv(),id=await create(env);let d=await(await call(env,'detail',{id})).json();assert.equal(d.artworkExpires-d.created,1209600);assert.ok(d.expires>d.created+180*86400);
 assert.equal((await call(env,'status',{id,status:'fulfilled',version:0})).status,200);
 d=await(await call(env,'detail',{id})).json();assert.equal(d.status,'fulfilled');assert.ok(d.fulfilledAt);assert.ok(d.expires>d.fulfilledAt+180*86400);assert.equal(d.updates.length,0);assert.equal(d.snapshot.paymentStatus,'unpaid');const original=d.artworkExpires,expiry=d.expires;
 assert.equal((await call(env,'status',{id,status:'shipped',version:1})).status,200);d=await(await call(env,'detail',{id})).json();assert.equal(d.fulfilledAt,null);assert.equal(d.expires,expiry);assert.equal(d.artworkExpires,original);
});
test('artwork expiry keeps details and approval audit, blocks proof access, and order cleanup stays independent',async()=>{
 const env=artworkEnv(),id=await create(env),time=Math.floor(Date.now()/1000);env.sql.prepare("UPDATE orders SET artwork_expires=?,snapshot=json_set(snapshot,'$.approvalRequired',json('true')) WHERE id=?").run(time-1,id);
 env.sql.prepare("INSERT INTO proof_state(order_id,revision,digest,status,token_hash,approved_at) VALUES (?,1,?,'approved',?,?)").run(id,'a'.repeat(64),'b'.repeat(64),time-20);
 env.sql.prepare('INSERT INTO proof_revisions(order_id,revision,digest,manifest,created) VALUES (?,1,?,?,?)').run(id,'a'.repeat(64),'[]',time-30);
 const proof=(path,body)=>proofService(new Request('https://internal/proofs/'+path,{method:'POST',body:JSON.stringify(body)}),env);
 assert.equal((await proof('exchange',{tokenHash:'b'.repeat(64),sessionId:'c'.repeat(64)})).status,403);
 assert.equal((await proof('seed',{id,version:0})).status,410);
 await cleanOrders(env);const d=await(await call(env,'detail',{id})).json();assert.equal(d.snapshot.contact.name,'Customer');assert.equal(env.sql.prepare('SELECT count(*) n FROM proof_revisions').get().n,0);assert.equal(env.sql.prepare('SELECT status FROM proof_state').get().status,'approved');
 assert.equal((await call(env,'status',{id,status:'fulfilled',version:0})).status,200);
 env.sql.prepare('UPDATE orders SET expires=? WHERE id=?').run(time-1,id);await cleanOrders(env);assert.equal(env.sql.prepare('SELECT count(*) n FROM orders').get().n,0);assert.equal(env.sql.prepare('SELECT count(*) n FROM proof_state').get().n,0);
});
test('latest three fulfilled are globally sorted by completion and older results remain searchable',async()=>{
 const env=artworkEnv();const ids=[];for(let n=0;n<60;n++){const id=await create(env);ids.push(id);env.sql.prepare("UPDATE orders SET status='fulfilled',fulfilled_at=? WHERE id=?").run(1000+n,id)}
 // Oldest submitted order completed most recently.
 env.sql.prepare('UPDATE orders SET fulfilled_at=5000 WHERE id=?').run(ids[0]);
 let list=await(await call(env,'list',{})).json();assert.deepEqual(list.orders.map(o=>o.id),[ids[0],ids[59],ids[58]]);assert.equal(list.fulfilledCount,60);assert.ok(list.fulfilledNext);
 const older=await(await call(env,'list',{stage:'fulfilled',fulfilledBefore:list.fulfilledNext})).json();assert.equal(older.orders.length,50);assert.ok(!older.orders.some(o=>list.orders.some(x=>x.id===o.id)));
 const search=await(await call(env,'list',{q:'CV-000002'})).json();assert.equal(search.orders[0].id,ids[1]);assert.equal(search.orders[0].snapshot.subtotalCents,4000);
});
test('six-month retention clamps month-end and migration preserves expired records and artwork dates',async()=>{
 const {sixMonthsAfter}=await import('../server/order-retention.mjs');
 for(const [from,to] of [['2026-08-31T11:15:00Z','2027-02-28T11:15:00Z'],['2027-08-31T11:15:00Z','2028-02-29T11:15:00Z'],['2026-10-18T11:15:00Z','2027-04-18T11:15:00Z']])assert.equal(new Date(sixMonthsAfter(Date.parse(from)/1000)*1000).toISOString(),new Date(to).toISOString());
 const {DatabaseSync}=await import('node:sqlite'),{readFileSync,readdirSync}=await import('node:fs');const db=new DatabaseSync(':memory:');for(const file of readdirSync('migrations/security').filter(f=>f.endsWith('.sql')&&!f.startsWith('0008')).sort())db.exec(readFileSync('migrations/security/'+file,'utf8'));
 const time=Math.floor(Date.now()/1000),created=time-100;for(const [id,expires] of [['active',time+100],['expired',time-100]])db.prepare('INSERT INTO orders(id,fingerprint,snapshot,created,expires) VALUES (?,?,?,?,?)').run(id,'hash','{}',created,expires);
 db.exec(readFileSync('migrations/security/0008_order_history_retention.sql','utf8'));const a=db.prepare("SELECT * FROM orders WHERE id='active'").get();assert.equal(a.expires,sixMonthsAfter(created));assert.equal(a.artwork_expires,time+100);assert.equal(db.prepare("SELECT expires FROM orders WHERE id='expired'").get().expires,time-100);
});
