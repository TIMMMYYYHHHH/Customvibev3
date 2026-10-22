import test from 'node:test';
import assert from 'node:assert/strict';
import security from '../security/index.mjs';
import {artworkEnv,manifest} from './helpers/artwork.mjs';
import {downloadOrderArchive} from '../admin/order-archive.mjs';
import {previewOrderUpdate,previewRetryUpdate,sendOrderUpdate} from '../admin/order-mail.mjs';
import {proofAPI} from '../server/proof-api.mjs';
const call=(env,path,body)=>security.fetch(new Request('https://internal/'+path,{method:'POST',body:JSON.stringify(body)}),env);
async function fixture(flag){
 const env=artworkEnv(),m=await manifest(),time=Math.floor(Date.now()/1000);
 env.AUTH={fetch:(url,options)=>security.fetch(new Request(url,options),env)};
 env.sql.prepare('INSERT INTO artwork_requests(id,owner,manifest,bytes,created,expires,finalized,reservation) VALUES(?,?,?,?,?,?,1,?)').run(m.id,m.owner,JSON.stringify(m.files),m.files[0].size,time,time+500,'seed');
 const snapshot={...(flag===undefined?{}:{approvalRequired:flag}),contact:{name:'Test',email:'test@example.com',phone:'0123456789'},locker:{name:'Locker',area:'Durban'},items:[{id:'item-1',kind:'photo',name:'Photo',qty:2,files:[{...m.files[0],index:0}]}],magnetQty:2,subtotalCents:10000,paymentStatus:'unpaid'};
 return {env,m,snapshot,create:()=>call(env,'orders/create',{id:m.id,fingerprint:'a'.repeat(64),snapshot,privateArtwork:true})};
}
test('approval flags and historical states never gate a stage or manufacture approval',async()=>{
 for(const flag of [undefined,false,true])for(const state of [null,'awaiting_approval','approved','changes_requested']){
  const {env,m,create}=await fixture(flag);assert.equal((await create()).status,200);
  if(state)env.sql.prepare('INSERT INTO proof_state(order_id,revision,digest,status) VALUES(?,1,?,?)').run(m.id,'b'.repeat(64),state);
  assert.equal((await call(env,'orders/status',{id:m.id,version:0,status:'in_progress'})).status,200,`${flag} ${state}`);
  assert.equal((await call(env,'orders/status',{id:m.id,version:0,status:'shipped'})).status,409);
  assert.equal(env.sql.prepare('SELECT status FROM proof_state WHERE order_id=?').get(m.id)?.status,state??undefined);
  assert.equal(env.sql.prepare('SELECT count(*) n FROM order_updates').get().n,0);
 }
});
test('new nonapproval snapshots still require matching immutable original hashes',async()=>{
 for(const flag of [undefined,false]){const {m,snapshot,create}=await fixture(flag);snapshot.items[0].files[0].sha256='f'.repeat(64);assert.equal((await create()).status,409,m.id);}
});
test('original artwork exports without a revision, and replacements win regardless of flags or approval state',async()=>{
 for(const flag of [undefined,false,true])for(const status of ['awaiting_approval','approved','changes_requested']){
  const original={index:0,name:'design-01-photo.jpg',size:3,proof:false};
  const order={id:'original',reference:'CV-000001',snapshot:{approvalRequired:flag,magnetQty:2,items:[{name:'Photo',kind:'photo',qty:2,files:[original]}]}};
  const fetches=[],fetchFile=async(index,f)=>{fetches.push(f.requestId||order.id);return new Response(new Uint8Array([1,2,3]),{headers:{'Content-Type':'image/jpeg'}})};
  await downloadOrderArchive(order,fetchFile);assert.deepEqual(fetches,['original']);fetches.length=0;
  order.proof={revision:2,status,digest:'abc',items:[{...order.snapshot.items[0],files:[{...original,requestId:'replacement',copies:2}]}]};
  const zip=await downloadOrderArchive(order,fetchFile);assert.deepEqual(fetches,['replacement']);
  const text=new TextDecoder().decode(zip);assert.doesNotMatch(text,/DO NOT PRINT|Approved for printing|approval|approved proof/);assert.match(text,/Payment status: Unpaid/);
 }
});
test('internal replacements preserve saved stage and expiry without customer capabilities',async()=>{
 const {env,m,create}=await fixture(false);await create();await call(env,'orders/status',{id:m.id,version:0,status:'in_progress'});
 const before=env.sql.prepare('SELECT * FROM orders').get();assert.equal((await call(env,'proofs/seed',{id:m.id,version:1})).status,200);
 const after=env.sql.prepare('SELECT * FROM orders').get();assert.equal(after.status,'in_progress');assert.equal(after.artwork_expires,before.artwork_expires);
 const d=await(await call(env,'orders/detail',{id:m.id})).json();assert.equal(d.proof.revision,1);assert.equal(d.proof.status,'prepared');assert.equal(d.snapshot.paymentStatus,'unpaid');assert.equal(env.sql.prepare('SELECT token_hash FROM proof_state').get().token_hash,null);
 assert.equal(env.sql.prepare('SELECT count(*) n FROM order_updates').get().n,0);
});
test('ordinary manual update ignores historical awaiting approval and preserves exact rejected-attempt retry',async()=>{
 const {env,m,create}=await fixture(true);await create();env.ADMIN_SEND_ENABLED='true';env.RESEND_API_KEY='local-fixture-only';
 env.sql.prepare("INSERT INTO proof_state(order_id,revision,digest,status) VALUES(?,1,?,'awaiting_approval')").run(m.id,'b'.repeat(64));
 const mail=await previewOrderUpdate(env,m.id);assert.equal(mail.version,0);assert.doesNotMatch(mail.text,/approve|proof#|revision/i);assert.equal(mail.proofToken,undefined);
 assert.equal(env.sql.prepare('SELECT version FROM orders').get().version,0);assert.equal(env.sql.prepare('SELECT token_hash FROM proof_state').get().token_hash,null);
 let sent=0;const network=async(_url,opts)=>{sent++;assert.equal(JSON.parse(opts.body).text,mail.text);return sent===1?Response.json({name:'validation_error',message:'Synthetic rejection'},{status:403}):Response.json({id:'local-accepted'})};
 assert.equal((await sendOrderUpdate(env,m.id,0,network)).status,503);assert.equal((await sendOrderUpdate(env,m.id,0,network)).status,409);
 const retry=await(await previewRetryUpdate(env,m.id,0)).json();assert.ok(retry.retryToken);assert.equal(retry.proofToken,undefined);
 assert.equal((await sendOrderUpdate(env,m.id,0,network,undefined,{...retry,retryToken:'f'.repeat(64)})).status,409);
 assert.equal((await sendOrderUpdate(env,m.id,0,network,undefined,retry)).status,200);assert.equal(sent,2);
});
test('retired customer proof and capability actions reject before any storage or mutation',async()=>{
 const env={AUTH:{fetch(){throw Error('Must not reach storage')}},DB:{prepare(){throw Error('Must not reach storage')}}};
 for(const path of ['/api/proof','/api/proof/session','/api/proof/files/0','/api/proof/approve','/api/proof/changes'])assert.equal((await proofAPI(new Request('https://customvibe.co.za'+path),env)).status,410);
 for(const action of ['issue','check-link','exchange','read','download','approve','changes'])assert.equal((await call(env,'proofs/'+action,{})).status,410);
});
