import test from 'node:test';
import assert from 'node:assert/strict';
import {artworkEnv} from './helpers/artwork.mjs';
import security from '../security/index.mjs';
import {recipientBinding} from '../server/mail-recipient.mjs';
import {reconcileMailDelivery} from '../server/mail-delivery.mjs';
import {sendOrderUpdate} from '../admin/order-mail.mjs';
let externalCalls=0;const originalFetch=globalThis.fetch;
test.before(()=>{globalThis.fetch=async()=>{externalCalls++;throw Error('External fetch forbidden')}});
test.after(()=>{globalThis.fetch=originalFetch;assert.equal(externalCalls,0)});

const now=()=>Math.floor(Date.now()/1000);
const call=(env,path,body)=>security.fetch(new Request('https://auth.internal/'+path,{method:'POST',body:JSON.stringify(body)}),env);
const keys=['purpose','attempt','acceptedAt','expiresAt','state','reason','complaint','source','checkedAt','occurredAt'].sort();
async function fixture(){
 const env={...artworkEnv(),ADMIN_SEND_ENABLED:'true',RESEND_API_KEY:'synthetic-only'};
 env.AUTH={fetch:(url,init)=>security.fetch(new Request(url,init),env)};
 const id=crypto.randomUUID(),snapshot={contact:{name:'Synthetic',email:'fixture@example.test',phone:'1234567'},locker:{name:'Synthetic',area:'Durban'},items:[{kind:'photo',name:'Photo',qty:1,files:[]}],magnetQty:1,subtotalCents:4000,paymentStatus:'unpaid'};
 assert.equal((await call(env,'orders/create',{id,fingerprint:'b'.repeat(64),snapshot})).status,200);
 assert.equal((await sendOrderUpdate(env,id,0,async()=>Response.json({id:'synthetic-projection-provider'}))).status,200);
 const row=env.sql.prepare('SELECT * FROM mail_delivery_state').get();
 const binding=await recipientBinding(row.provider_id,{to:['fixture@example.test']});
 const observe=async(type,offset=0)=>{const event={providerMessageId:row.provider_id,source:'webhook',type,eventId:crypto.randomUUID(),occurredAt:now()-offset,checkedAt:now(),...binding};assert.equal((await call(env,'mail-delivery/observe',event)).status,200);return event};
 const detail=async()=>{const d=await(await call(env,'orders/detail',{id})).json();for(const summary of d.mailDelivery){assert.deepEqual(Object.keys(summary).sort(),keys);assert.doesNotMatch(JSON.stringify(summary),/synthetic-projection-provider|fixture@|recipient|observations|reference|write_token/)}return d.mailDelivery};
 return {env,id,row,observe,detail};
}
test('zero observations expose acceptance only, and event/check times come from retained validated facts',async()=>{
 const f=await fixture();assert.deepEqual((await f.detail())[0],{purpose:'manual-update',attempt:f.row.attempt,acceptedAt:f.row.accepted_at,expiresAt:f.row.expires_at,state:'unconfirmed',reason:'no-delivery-evidence',complaint:false,source:null,checkedAt:null,occurredAt:null});
 const event=await f.observe('email.sent',10),summary=(await f.detail())[0];assert.equal(summary.source,'webhook');assert.equal(summary.checkedAt,event.checkedAt);assert.equal(summary.occurredAt,event.occurredAt);assert.equal(summary.reason,'provider-accepted');
});
test('ordinary delayed delivered and failed outcomes expose only their exact event time',async()=>{
 for(const [type,state,reason] of [['email.delivery_delayed','delayed','delivery-delayed'],['email.delivered','delivered','server-accepted'],['email.bounced','failed','delivery-bounced'],['email.failed','failed','delivery-failed'],['email.suppressed','failed','delivery-suppressed']]){
  const f=await fixture(),event=await f.observe(type,10),summary=(await f.detail())[0];assert.equal(summary.state,state);assert.equal(summary.reason,reason);assert.equal(summary.source,'webhook');assert.equal(summary.checkedAt,event.checkedAt);assert.equal(summary.occurredAt,event.occurredAt);
 }
});
test('different repeated delay times are ambiguous, and a weaker later event cannot supply a terminal time',async()=>{
 const f=await fixture();await f.observe('email.delivery_delayed',20);await f.observe('email.delivery_delayed',10);assert.equal((await f.detail())[0].occurredAt,null);
 const delivered=await f.observe('email.delivered',15);await f.observe('email.sent',5);const summary=(await f.detail())[0];assert.equal(summary.state,'delivered');assert.equal(summary.occurredAt,delivered.occurredAt);
});
test('retained check maximum stays distinct from request time, acceptance time and the supporting event',async()=>{
 const f=await fixture(),original=Date.now,base=now();
 try{Date.now=()=> (base+20)*1000;const delivered=await f.observe('email.delivered',10);Date.now=()=> (base+40)*1000;const sent=await f.observe('email.sent',5);Date.now=()=> (base+60)*1000;
  const summary=(await f.detail())[0];assert.equal(summary.checkedAt,sent.checkedAt);assert.equal(summary.occurredAt,delivered.occurredAt);assert.equal(summary.acceptedAt,f.row.accepted_at);assert.notEqual(summary.checkedAt,now());assert.notEqual(summary.occurredAt,summary.checkedAt);
 }finally{Date.now=original}
});
test('complaint preserves delivery outcome while omitting a guessed event time; terminal conflict omits time',async()=>{
 const f=await fixture();await f.observe('email.delivered',20);await f.observe('email.complained',10);let summary=(await f.detail())[0];assert.equal(summary.state,'delivered');assert.equal(summary.complaint,true);assert.equal(summary.reason,'delivery-complaint');assert.equal(summary.occurredAt,null);assert.equal(summary.source,'webhook');await f.observe('email.bounced',5);summary=(await f.detail())[0];assert.equal(summary.state,'needs-review');assert.equal(summary.occurredAt,null);
 const complaint=await fixture();await complaint.observe('email.complained',5);assert.equal((await complaint.detail())[0].state,'needs-review');assert.equal((await complaint.detail())[0].occurredAt,null);
});
test('event identity conflicts and capacity review never project an arbitrary occurrence',async()=>{
 const f=await fixture(),event=await f.observe('email.delivered',20),binding=await recipientBinding(f.row.provider_id,{to:['fixture@example.test']});
 await call(f.env,'mail-delivery/observe',{...event,type:'email.bounced',...binding});assert.equal((await f.detail())[0].reason,'event-id-conflict');assert.equal((await f.detail())[0].occurredAt,null);
 const capacity=await fixture();for(let i=0;i<65;i++)await capacity.observe('email.sent',10);assert.equal((await capacity.detail())[0].reason,'evidence-capacity');assert.equal((await capacity.detail())[0].occurredAt,null);
});
test('mixed validated sources omit provenance, manual-only observations retain actual checks without invented events',async()=>{
 const f=await fixture();await f.observe('email.delivered',10);let prior=JSON.parse(f.env.sql.prepare('SELECT snapshot FROM mail_delivery_state').get().snapshot);
 const receipt={state:'accepted',providerMessageId:f.row.provider_id,purpose:f.row.purpose,reference:f.row.reference,attempt:f.row.attempt,acceptedAt:f.row.accepted_at,expiresAt:f.row.expires_at};
 const manual={providerMessageId:receipt.providerMessageId,purpose:receipt.purpose,reference:receipt.reference,attempt:receipt.attempt,source:'manual-check',type:'email.delivered',checkedAt:now()};
 const mixed=reconcileMailDelivery({receipt,prior,observation:manual,now:now()}).delivery;f.env.sql.prepare('UPDATE mail_delivery_state SET snapshot=?').run(JSON.stringify(mixed));assert.deepEqual(((s)=>[s.source,s.checkedAt,s.occurredAt])((await f.detail())[0]),[null,null,null]);
 const onlyManual=reconcileMailDelivery({receipt,observation:manual,now:now()}).delivery;f.env.sql.prepare('UPDATE mail_delivery_state SET snapshot=?').run(JSON.stringify(onlyManual));const summary=(await f.detail())[0];assert.equal(summary.source,'manual-check');assert.equal(summary.checkedAt,manual.checkedAt);assert.equal(summary.occurredAt,null);
});
test('malformed stored evidence, original deadline and source purge never gain provenance',async()=>{
 const f=await fixture();await f.observe('email.delivered',10);const valid=f.env.sql.prepare('SELECT snapshot FROM mail_delivery_state').get().snapshot,broken=JSON.parse(valid);broken.observations[0].source='synthetic-invalid';f.env.sql.prepare('UPDATE mail_delivery_state SET snapshot=?').run(JSON.stringify(broken));assert.deepEqual(await f.detail(),[]);
 f.env.sql.prepare('UPDATE mail_delivery_state SET snapshot=?').run(valid);f.env.sql.function('unixepoch',()=>f.row.expires_at);assert.deepEqual(await f.detail(),[]);
 f.env.sql.function('unixepoch',()=>now());f.env.sql.prepare('DELETE FROM order_update_attempts').run();assert.deepEqual(await f.detail(),[]);assert.equal(f.env.sql.prepare('SELECT count(*) n FROM mail_delivery_state').get().n,0);
});
