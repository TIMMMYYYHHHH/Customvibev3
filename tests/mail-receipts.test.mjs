import test from 'node:test';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import assert from 'node:assert/strict';
import security from '../security/index.mjs';
import {submissions} from '../server/submissions.mjs';
import {sendOrderUpdate,previewRetryUpdate} from '../admin/order-mail.mjs';
import {defaultContent} from '../src/content/model.mjs';
import {artworkEnv,tile} from './helpers/artwork.mjs';
const origin='https://customvibe.co.za';
const internal=(env,path,body)=>env.AUTH.fetch('https://internal/'+path,{method:'POST',body:JSON.stringify(body)});
function setup(){const env={...artworkEnv(),SUBMISSIONS_ENABLED:'true',RESEND_API_KEY:'synthetic',TURNSTILE_SECRET_KEY:'synthetic',TURNSTILE_SITE_KEY:'synthetic',SESSION_SECRET:'a'.repeat(64),ADMIN_SEND_ENABLED:'true',CATALOGUE:{fetch:async()=>Response.json(defaultContent)}};env.AUTH={fetch:(url,init)=>security.fetch(new Request(url,init),env)};return env;}
async function form(env){const r=await submissions(new Request(origin+'/api/forms'),env),config=await r.json();return {cookie:r.headers.get('set-cookie').split(';')[0],csrf:config.csrf};}
const order=()=>({id:crypto.randomUUID(),createdAt:Math.floor(Date.now()/1000),contact:{name:'Synthetic',email:'customer@example.com',phone:'0821234567'},locker:{name:'Fictional',area:'Durban'},consent:true,items:[{kind:'photo',qty:1,files:[tile.toString('base64')]}]});
const post=(context,payload)=>new Request(origin+'/api/order-request',{method:'POST',headers:{origin,'Content-Type':'application/json','CF-Connecting-IP':'192.0.2.7',cookie:context.cookie,'X-CSRF-Token':context.csrf},body:JSON.stringify({payload,turnstile:'synthetic'})});
function network(ids,seen=[]){return async(url,init)=>{if(url==='https://challenges.cloudflare.com/turnstile/v0/siteverify')return Response.json({success:true,hostname:'customvibe.co.za',action:'order'});assert.equal(url,'https://api.resend.com/emails');seen.push(JSON.parse(init.body));return Response.json({id:ids[seen.length-1]});};}
async function manual(env){const id=crypto.randomUUID();const snapshot={contact:{name:'Synthetic',email:'customer@example.com',phone:'1234567'},locker:{name:'Fictional',area:'Durban'},items:[{kind:'photo',name:'Photo',qty:1,files:[]}],magnetQty:1,subtotalCents:4000,paymentStatus:'unpaid'};assert.equal((await internal(env,'orders/create',{id,fingerprint:'b'.repeat(64),snapshot})).status,200);return id;}

test('initial owner and customer acceptance retain separate provider IDs/timestamps without exposing receipts publicly',async()=>{
 const env=setup(),context=await form(env),payload=order(),seen=[],before=Math.floor(Date.now()/1000);
 const r=await submissions(post(context,payload),env,network(['owner-accepted_1','customer-accepted_2'],seen));assert.equal(r.status,200);const result=await r.json();assert.equal(result.status,'unpaid-request');assert.equal(result.receiptSent,true);assert.doesNotMatch(JSON.stringify(result),/owner-accepted|customer-accepted|acceptedAt|delivered/i);
 const row=env.sql.prepare('SELECT * FROM submissions').get();assert.equal(row.owner_provider_id,'owner-accepted_1');assert.equal(row.receipt_provider_id,'customer-accepted_2');for(const t of [row.owner_accepted_at,row.receipt_accepted_at])assert.ok(Number.isSafeInteger(t)&&t>=before&&t<=Math.floor(Date.now()/1000));
 const expires=row.expires;assert.equal((await submissions(post(context,payload),env,network([],seen))).status,200);assert.equal(seen.length,2);assert.equal(env.sql.prepare('SELECT expires FROM submissions').get().expires,expires);
});
test('manual accepted metadata is tied to the exact reservation and never unlocks resend',async()=>{
 const env=setup(),id=await manual(env);let sends=0;const response=await sendOrderUpdate(env,id,0,async()=>{sends++;return Response.json({id:'manual-accepted_1'})});assert.equal(response.status,200);
 const row=env.sql.prepare('SELECT * FROM order_update_attempts').get();assert.equal(row.provider_message_id,'manual-accepted_1');assert.ok(Number.isSafeInteger(row.accepted_at));assert.equal(row.state,'accepted');assert.equal(row.order_id,id);assert.equal(row.version,0);
 const detail=await(await internal(env,'orders/detail',{id})).json();assert.equal(detail.updates[0].providerMessageId,'manual-accepted_1');assert.equal(detail.updates[0].purpose,'manual-update');assert.equal(detail.updates[0].acceptedAt,row.accepted_at);await internal(env,'orders/mark-update',{id,version:0,attempt:row.attempt,state:'accepted',providerMessageId:'late-different-id'});assert.equal(env.sql.prepare('SELECT provider_message_id FROM order_update_attempts').get().provider_message_id,'manual-accepted_1');
 assert.equal((await sendOrderUpdate(env,id,0,async()=>{sends++;assert.fail('accepted must not resend')})).status,409);assert.equal(sends,1);
});
test('definitive rejection keeps no accepted receipt; explicit retry stores only its own accepted receipt',async()=>{
 const env=setup(),id=await manual(env);assert.equal((await sendOrderUpdate(env,id,0,async()=>Response.json({name:'validation_error',message:'Synthetic rejection'},{status:422}))).status,503);
 let rows=env.sql.prepare('SELECT * FROM order_update_attempts').all();assert.equal(rows[0].provider_message_id,null);assert.equal(rows[0].accepted_at,null);assert.equal(rows[0].rejected,1);
 const preview=await(await previewRetryUpdate(env,id,0)).json();assert.equal((await sendOrderUpdate(env,id,0,async()=>Response.json({id:'retry-accepted_2'}),undefined,preview)).status,200);
 rows=env.sql.prepare('SELECT * FROM order_update_attempts ORDER BY rowid').all();assert.equal(rows.length,2);assert.equal(rows[0].provider_message_id,null);assert.equal(rows[1].provider_message_id,'retry-accepted_2');assert.notEqual(rows[0].attempt,rows[1].attempt);
});
test('invalid provider IDs remain uncertain and cannot create accepted metadata or manual retries',async()=>{
 for(const id of ['', ' '.repeat(2), 'x'.repeat(129), 'id\nvalue', 'a@example.com', 42, null]){
  const env=setup(),orderId=await manual(env);let sends=0;assert.equal((await sendOrderUpdate(env,orderId,0,async()=>{sends++;return Response.json({id})})).status,503);
  const row=env.sql.prepare('SELECT * FROM order_update_attempts').get();assert.equal(row.state,'uncertain');assert.equal(row.provider_message_id,null);assert.equal(row.accepted_at,null);assert.equal((await(await previewRetryUpdate(env,orderId,0)).json()).retryToken,undefined);assert.equal((await sendOrderUpdate(env,orderId,0,async()=>{sends++;assert.fail('uncertain must not resend')})).status,409);assert.equal(sends,1);
 }
});

test('initial mark failure keeps its existing truthful response and same-key recovery contract',async()=>{
 for(const stage of ['owner','receipt']){
  const env=setup(),context=await form(env),payload=order(),prepare=env.DB.prepare,keys=[];let fail=true;
  env.DB.prepare=(sql,...args)=>{const statement=prepare(sql,...args);return sql.startsWith(`UPDATE submissions SET ${stage}_sent=1,`)?{...statement,bind(...values){const bound=statement.bind(...values);return {...bound,first:async()=>{if(fail)throw Error('Synthetic D1 write failure');return bound.first()}}}}:statement;};
  const net=async(url,init)=>{if(url.includes('siteverify'))return Response.json({success:true,hostname:'customvibe.co.za',action:'order'});keys.push(init.headers['Idempotency-Key']);return Response.json({id:JSON.parse(init.body).to[0]==='hello@customvibe.co.za'?'owner-id':'receipt-id'});};
  const first=await submissions(post(context,payload),env,net),body=await first.json();assert.equal(first.status,stage==='owner'?503:200);if(stage==='owner')assert.notEqual(body.ok,true);else assert.equal(body.receiptSent,false);
  const row=env.sql.prepare('SELECT * FROM submissions').get();assert.equal(row[stage+'_sent'],0);assert.equal(row[stage+'_provider_id'],null);assert.equal(row[stage+'_accepted_at'],null);
  fail=false;const result=await(await submissions(post(context,payload),env,net)).json();assert.equal(result.receiptSent,true);const matching=keys.filter(k=>k.endsWith(stage==='owner'?'-owner':'-customer'));assert.equal(matching.length,2);assert.equal(matching[0],matching[1]);
 }
});
test('manual metadata transaction failure rolls back the outcome and keeps the attempt locked',async()=>{
 const env=setup(),id=await manual(env),prepare=env.DB.prepare;let sends=0;
 env.DB.prepare=(sql,...args)=>{const statement=prepare(sql,...args);return sql.startsWith('UPDATE order_update_attempts SET provider_message_id=')?{...statement,bind(...values){const bound=statement.bind(...values);return {...bound,all:async()=>{throw Error('Synthetic metadata failure')}}}}:statement;};
 assert.equal((await sendOrderUpdate(env,id,0,async()=>{sends++;return Response.json({id:'accepted-before-failure'})})).status,503);
 const row=env.sql.prepare('SELECT * FROM order_update_attempts').get();assert.equal(row.state,'pending');assert.equal(row.provider_message_id,null);assert.equal(row.accepted_at,null);assert.equal(env.sql.prepare('SELECT state FROM order_updates').get().state,'pending');
 env.DB.prepare=prepare;assert.equal((await sendOrderUpdate(env,id,0,async()=>{sends++;assert.fail('locked attempt')})).status,409);assert.equal(sends,1);
});
test('legacy marks remain compatible and later stale or legacy marks cannot replace accepted metadata',async()=>{
 const env=setup(),time=Math.floor(Date.now()/1000),id='c'.repeat(64);
 assert.equal((await internal(env,'submissions/reserve',{id,key:'d'.repeat(64),fingerprint:'e'.repeat(64),kind:'order',createdAt:time})).status,200);
 assert.equal((await internal(env,'submissions/mark',{id,stage:'owner_sent'})).status,200);let row=env.sql.prepare('SELECT * FROM submissions').get();assert.equal(row.owner_sent,1);assert.equal(row.owner_provider_id,null);assert.equal(row.owner_accepted_at,null);
 await internal(env,'submissions/mark',{id,stage:'receipt_sent',providerMessageId:'first-receipt',acceptedAt:0,purpose:'untrusted'});row=env.sql.prepare('SELECT * FROM submissions').get();const stamp=row.receipt_accepted_at;assert.equal(row.receipt_provider_id,'first-receipt');assert.ok(stamp>=time);
 await internal(env,'submissions/mark',{id,stage:'receipt_sent',providerMessageId:'late-receipt'});await internal(env,'submissions/mark',{id,stage:'receipt_sent'});row=env.sql.prepare('SELECT * FROM submissions').get();assert.equal(row.receipt_provider_id,'first-receipt');assert.equal(row.receipt_accepted_at,stamp);
 const orderId=await manual(env),claim=await(await internal(env,'orders/claim-update',{id:orderId,version:0})).json();await internal(env,'orders/mark-update',{id:orderId,version:0,state:'accepted'});row=env.sql.prepare('SELECT * FROM order_update_attempts').get();assert.equal(row.state,'accepted');assert.equal(row.provider_message_id,null);assert.equal(row.accepted_at,null);
 await internal(env,'orders/mark-update',{id:orderId,version:0,attempt:claim.attempt,state:'accepted',providerMessageId:'late-id'});assert.equal(env.sql.prepare('SELECT provider_message_id FROM order_update_attempts').get().provider_message_id,null);
});
test('private mark boundaries reject bad IDs, wrong outcomes and invalid times before changing success state',async()=>{
 const env=setup(),id='f'.repeat(64);await internal(env,'submissions/reserve',{id,key:'d'.repeat(64),fingerprint:'e'.repeat(64),kind:'order',createdAt:Math.floor(Date.now()/1000)});
 const orderId=await manual(env),claim=await(await internal(env,'orders/claim-update',{id:orderId,version:0})).json();
 for(const value of ['', 'x'.repeat(129), 'id\r\nraw', 'a@example.com', 1]){
  assert.equal((await internal(env,'submissions/mark',{id,stage:'owner_sent',providerMessageId:value})).status,400);
  assert.equal((await internal(env,'orders/mark-update',{id:orderId,version:0,attempt:claim.attempt,state:'accepted',providerMessageId:value})).status,400);
 }
 assert.equal((await internal(env,'orders/mark-update',{id:orderId,version:0,attempt:claim.attempt,state:'failed',providerMessageId:'not-acceptance'})).status,400);
 const realNow=Date.now;try{Date.now=()=>0;assert.equal((await internal(env,'submissions/mark',{id,stage:'owner_sent',providerMessageId:'valid-id'})).status,400);assert.equal((await internal(env,'orders/mark-update',{id:orderId,version:0,attempt:claim.attempt,state:'accepted',providerMessageId:'valid-id'})).status,400);}finally{Date.now=realNow;}
 assert.equal(env.sql.prepare('SELECT owner_sent FROM submissions').get().owner_sent,0);assert.equal(env.sql.prepare('SELECT state FROM order_updates').get().state,'pending');
});
test('receipt metadata follows existing expiry cleanup and does not extend original artwork or request deadlines',async()=>{
 const env=setup(),id=await manual(env),before=env.sql.prepare('SELECT * FROM orders').get();await sendOrderUpdate(env,id,0,async()=>Response.json({id:'cleanup-id'}));const after=env.sql.prepare('SELECT * FROM orders').get();assert.equal(after.artwork_expires,before.artwork_expires);assert.equal(after.expires,before.expires);assert.equal(after.artwork_expires,after.created+14*86400);
 const context=await form(env),requestTime=Math.floor(Date.now()/1000);await submissions(post(context,order()),env,network(['owner-cleanup','receipt-cleanup']));const row=env.sql.prepare('SELECT * FROM submissions').get(),time=Math.floor(Date.now()/1000);assert.ok(row.expires>=requestTime+172800&&row.expires<=time+172800);
 env.sql.prepare('UPDATE submissions SET expires=0').run();assert.equal((await internal(env,'submissions/mark',{id:row.id,stage:'owner_sent',providerMessageId:'must-not-persist'})).status,409);assert.equal(env.sql.prepare('SELECT owner_provider_id FROM submissions').get().owner_provider_id,'owner-cleanup');
 env.sql.prepare('UPDATE orders SET expires=0').run();await security.scheduled({cron:'0 * * * *'},env);assert.equal(env.sql.prepare('SELECT count(*) n FROM submissions').get().n,0);assert.equal(env.sql.prepare('SELECT count(*) n FROM order_update_attempts').get().n,0);
});

test('manual receipt fields expire with original artwork while normal later manual updates and history remain available',async()=>{
 const env=setup(),id=await manual(env);await sendOrderUpdate(env,id,0,async()=>Response.json({id:'before-artwork-expiry'}));env.sql.prepare('UPDATE orders SET artwork_expires=0 WHERE id=?').run(id);
 let detail=await(await internal(env,'orders/detail',{id})).json();assert.equal(detail.updates[0].providerMessageId,null);assert.equal(detail.updates[0].acceptedAt,null);
 const {cleanOrders}=await import('../security/orders.mjs');await cleanOrders(env);let rows=env.sql.prepare('SELECT * FROM order_update_attempts').all();assert.equal(rows.length,1);assert.equal(rows[0].state,'accepted');assert.equal(rows[0].provider_message_id,null);assert.equal(rows[0].accepted_at,null);
 assert.equal((await internal(env,'orders/status',{id,version:0,status:'in_progress'})).status,200);assert.equal((await sendOrderUpdate(env,id,1,async()=>Response.json({id:'after-artwork-expiry'}))).status,200);
 rows=env.sql.prepare('SELECT * FROM order_update_attempts').all();assert.equal(rows.length,2);assert.ok(rows.every(r=>r.state==='accepted'&&r.provider_message_id===null&&r.accepted_at===null));
});

// Backfill must not invent acceptance evidence for already-written legacy successes.
test('migration0011 preserves existing success and attempt records with unknown receipt metadata',()=>{
 const db=new DatabaseSync(':memory:');for(const file of readdirSync('migrations/security').filter(f=>f.endsWith('.sql')&&f<'0011').sort())db.exec(readFileSync('migrations/security/'+file,'utf8'));
 db.prepare("INSERT INTO submissions(id,fingerprint,reservation,kind,owner_sent,receipt_sent,expires) VALUES(?,?,?,?,?,?,?)").run('legacy','fingerprint','reservation','order',1,1,12345);
 db.prepare("INSERT INTO order_updates(order_id,version,status,state,created,updated,reservation) VALUES(?,?,?,?,?,?,?)").run('legacy-order',1,'new','accepted',10,11,'legacy-attempt');
 const beforeSubmission=db.prepare('SELECT * FROM submissions').get(),beforeAttempt=db.prepare('SELECT * FROM order_update_attempts').get();db.exec(readFileSync('migrations/security/0011_mail_receipt_metadata.sql','utf8'));
 const {owner_provider_id,owner_accepted_at,receipt_provider_id,receipt_accepted_at,...submission}=db.prepare('SELECT * FROM submissions').get();assert.deepEqual(submission,{...beforeSubmission});assert.deepEqual([owner_provider_id,owner_accepted_at,receipt_provider_id,receipt_accepted_at],[null,null,null,null]);
 const {provider_message_id,accepted_at,...attempt}=db.prepare('SELECT * FROM order_update_attempts').get();assert.deepEqual(attempt,{...beforeAttempt});assert.equal(provider_message_id,null);assert.equal(accepted_at,null);db.close();
});
