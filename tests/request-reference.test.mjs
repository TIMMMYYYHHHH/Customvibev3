import test from 'node:test';
import assert from 'node:assert/strict';
import {validateOrder,orderEmails,fingerprintPayload} from '../server/submission-model.mjs';
import {orderRecord} from '../server/order-record.mjs';
import {orderUpdateEmail} from '../server/order-update-email.mjs';
import {defaultContent} from '../src/content/model.mjs';
import security from '../security/index.mjs';
import {artworkEnv,tile} from './helpers/artwork.mjs';
const id='12345678-9abc-4def-8123-456789abcdef';
const input=()=>({id,referenceVersion:1,createdAt:Math.floor(Date.now()/1000),contact:{name:'Test',email:'test@example.com',phone:'0821234567'},locker:{name:'Locker',area:'Durban'},consent:true,items:[{kind:'photo',qty:1,files:[tile.toString('base64')]}]});
const call=(env,path,body)=>security.fetch(new Request('https://internal/orders/'+path,{method:'POST',body:JSON.stringify(body)}),env);
test('older emailed references stay traceable while admin and new manual updates use sequential numbers',async()=>{
 const order=validateOrder(input(),defaultContent),emails=orderEmails(order,true),snapshot=orderRecord(order,false);
 const reference=emails.customer.subject.split(' ').at(-1);
 assert.match(reference,/^CV-(?:[0-9A-HJKMNP-TV-Z]{4}-){3}[0-9A-HJKMNP-TV-Z]{4}$/);
 assert.ok(reference.length<25);assert.equal(snapshot.reference,reference);
 for(const email of [emails.owner,emails.customer]){assert.ok(email.subject.includes(reference));assert.ok(email.text.includes('Reference: '+reference));assert.ok(email.html.includes(reference));assert.match(email.text,/Unpaid|UNPAID/);}
 assert.ok(emails.owner.text.includes('/artwork?request='+id));
 const env=artworkEnv(),body={id,fingerprint:'a'.repeat(64),snapshot};
 assert.equal((await call(env,'create',body)).status,200);
 assert.equal((await(await call(env,'create',body)).json()).reference,'CV-000001');
 const detail=await(await call(env,'detail',{id})).json();assert.equal(detail.reference,'CV-000001');assert.equal(detail.previousReference,reference);
 assert.ok(orderUpdateEmail(detail).text.includes('CV-000001'));
 assert.equal((await(await call(env,'list',{})).json()).orders[0].reference,'CV-000001');
});
test('legacy payloads keep email references, fingerprints and stored sequential references',async()=>{
 const raw=input();delete raw.referenceVersion;const order=validateOrder(raw,defaultContent);
 assert.equal(order.referenceVersion,undefined);assert.ok(orderEmails(order).customer.text.includes('CV-'+id));
 const snapshot=orderRecord(order,false);assert.equal(snapshot.reference,undefined);
 assert.equal(JSON.parse(fingerprintPayload(order)).referenceVersion,undefined);
 const env=artworkEnv(),body={id,fingerprint:'a'.repeat(64),snapshot};await call(env,'create',body);
 assert.equal((await(await call(env,'create',body)).json()).reference,'CV-000001');
 assert.equal((await(await call(env,'detail',{id})).json()).reference,'CV-000001');
});
test('reference version is validated and cannot silently reinterpret a retry',()=>{
 for(const referenceVersion of [0,3,'1',null])assert.throws(()=>validateOrder({...input(),referenceVersion},defaultContent));
 const modern=validateOrder(input(),defaultContent),raw=input();delete raw.referenceVersion;
 assert.notEqual(fingerprintPayload(modern),fingerprintPayload(validateOrder(raw,defaultContent)));
});
test('a forced short-reference collision cannot create an ambiguous second record',async()=>{
 const env=artworkEnv(),one=validateOrder(input(),defaultContent),two=validateOrder({...input(),id:'12345678-9abc-4def-8123-456789abcdee'},defaultContent);
 const records=[one,two].map(order=>({id:order.id,fingerprint:'a'.repeat(64),snapshot:orderRecord(order,false)}));
 const results=await Promise.all(records.map(body=>call(env,'create',body)));
 assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
 assert.equal((await(await call(env,'list',{})).json()).orders.length,1);
});

import {submissions} from '../server/submissions.mjs';
function submissionEnv(records=true){const env={...artworkEnv(),SITE_GATE_ENABLED:'true',SUBMISSIONS_ENABLED:'true',ORDER_RECORDS_ENABLED:String(records),RESEND_API_KEY:'local-test-only',TURNSTILE_SECRET_KEY:'local-test-only',TURNSTILE_SITE_KEY:'test-site',SESSION_SECRET:'a'.repeat(64),CATALOGUE:{fetch:async()=>Response.json(defaultContent)}};env.AUTH={fetch:(url,init)=>security.fetch(new Request(url,init),env)};return env;}
async function formContext(env){const response=await submissions(new Request('https://customvibe.co.za/api/forms'),env);const body=await response.json();return {cookie:response.headers.get('set-cookie').split(';')[0],csrf:body.csrf};}
const submit=(env,context,payload,network)=>submissions(new Request('https://customvibe.co.za/api/order-request',{method:'POST',headers:{origin:'https://customvibe.co.za','Content-Type':'application/json','CF-Connecting-IP':'192.0.2.1',cookie:context.cookie,'X-CSRF-Token':context.csrf},body:JSON.stringify({payload,turnstile:'synthetic'})}),env,network);
test('confirmation and retries keep the same email reference and full UUID idempotency keys',async()=>{
 for(const records of [true,false])for(const modern of [true,false]){
  const env=submissionEnv(records),context=await formContext(env),raw=input(),sent=[];if(!modern)delete raw.referenceVersion;
  let receiptAttempts=0;const network=async(url,init)=>{if(url.includes('siteverify'))return Response.json({success:true,hostname:'customvibe.co.za',action:'order'});const email=JSON.parse(init.body);sent.push({email,key:init.headers['Idempotency-Key']});if(email.to[0]==='test@example.com'&&receiptAttempts++===0)return new Response(null,{status:503});return Response.json({id:'synthetic-accepted'});};
  const first=await(await submit(env,context,raw,network)).json();assert.equal(first.ok,true);assert.equal(first.receiptSent,false);
  const second=await(await submit(env,context,raw,network)).json();assert.equal(second.reference,first.reference);assert.equal(second.receiptSent,true);
  if(modern)assert.match(first.reference,/^CV-(?:[0-9A-HJKMNP-TV-Z]{4}-){3}[0-9A-HJKMNP-TV-Z]{4}$/);else assert.equal(first.reference,'CV-'+id);
  assert.equal(sent.length,3);for(const {email,key}of sent){assert.ok(email.subject.includes(first.reference));assert.ok(email.text.includes(first.reference));assert.ok(key.includes(id));}
  assert.equal(sent.filter(({key})=>key.endsWith('-owner')).length,1);
  assert.deepEqual(sent[1],sent[2]);
  if(records){const row=env.sql.prepare('SELECT id,snapshot FROM orders').get();assert.equal(row.id,id);if(modern)assert.equal(JSON.parse(row.snapshot).reference,first.reference);}
  const changed={...raw,referenceVersion:modern?undefined:1};assert.equal((await submit(env,context,changed,network)).status,409);assert.equal(sent.length,3);
 }
});
test('a reference collision stops all mail and gives a reviewable response',async()=>{
 const env=submissionEnv(),context=await formContext(env),raw=input();let sends=0;
 const network=async(url)=>{if(url.includes('siteverify'))return Response.json({success:true,hostname:'customvibe.co.za',action:'order'});sends++;return Response.json({id:'synthetic-accepted'});};
 assert.equal((await submit(env,context,raw,network)).status,200);
 const collision=await submit(env,context,{...raw,id:'12345678-9abc-4def-8123-456789abcdee'},network);
 assert.equal(collision.status,409);assert.match((await collision.json()).error,/reference.*review/i);assert.equal(sends,2);
});

test('sequential orders use one server number across mail, confirmation, retries and manual updates',async()=>{
 const env=submissionEnv(),context=await formContext(env),raw={...input(),referenceVersion:2,reference:'CV-999999'},sent=[];
 let customerAttempts=0;
 const network=async(url,init)=>{if(url.includes('siteverify'))return Response.json({success:true,hostname:'customvibe.co.za',action:'order'});sent.push({email:JSON.parse(init.body),key:init.headers['Idempotency-Key']});if(sent.at(-1).email.to[0]==='test@example.com'&&customerAttempts++===0)return new Response(null,{status:503});return Response.json({id:'accepted-test'});};
 const first=await(await submit(env,context,raw,network)).json();assert.equal(first.ok,true);assert.equal(first.reference,'CV-000001');
 const second=await(await submit(env,context,raw,network)).json();assert.equal(second.reference,first.reference);assert.equal(second.receiptSent,true);
 assert.equal(sent.length,3);assert.deepEqual(sent[1],sent[2]);
 for(const {email,key} of sent){assert.ok(email.subject.includes(first.reference));assert.ok(email.html.includes(first.reference));assert.ok(key.includes(raw.id));assert.ok(!email.subject.includes('999999'));}
 const detail=await(await call(env,'detail',{id:raw.id})).json();assert.equal(detail.reference,first.reference);assert.equal(detail.previousReference,undefined);assert.equal(orderUpdateEmail(detail).subject.includes(first.reference),true);
 const before=env.sql.prepare('SELECT * FROM orders').get();await call(env,'list',{});await call(env,'detail',{id:raw.id});assert.deepEqual(env.sql.prepare('SELECT * FROM orders').get(),before);
});
test('existing long references become searchable aliases without rewriting snapshots or history',async()=>{
 const env=artworkEnv(),order=validateOrder(input(),defaultContent),snapshot=orderRecord(order,false),body={id:order.id,fingerprint:'b'.repeat(64),snapshot};
 delete snapshot.approvalRequired; // Historical record created before proof approval was introduced.
 await call(env,'create',body);await call(env,'status',{id:order.id,status:'in_progress',version:0});await call(env,'claim-update',{id:order.id,version:1});await call(env,'mark-update',{id:order.id,version:1,state:'accepted'});
 const before=env.sql.prepare('SELECT * FROM orders').get(),detail=await(await call(env,'detail',{id:order.id})).json();
 assert.equal(detail.reference,'CV-000001');assert.equal(detail.previousReference,snapshot.reference);assert.equal(detail.status,'in_progress');assert.equal(detail.updates[0].state,'accepted');
 const listed=(await(await call(env,'list',{})).json()).orders[0];assert.equal(listed.previousReference,snapshot.reference);
 assert.deepEqual(env.sql.prepare('SELECT * FROM orders').get(),before);assert.equal((await(await call(env,'claim-update',{id:order.id,version:1})).json()).claimed,false);
});

test('sequential numbering remains unique under concurrent creation and stable across retries',async()=>{
 const env=artworkEnv(),bodies=Array.from({length:8},(_,n)=>{const order=validateOrder({...input(),id:'12345678-9abc-4def-8123-'+String(n).padStart(12,'0'),referenceVersion:2},defaultContent);return {id:order.id,fingerprint:'a'.repeat(64),snapshot:orderRecord(order,false)};});
 const created=await Promise.all(bodies.map(async body=>(await call(env,'create',body)).json()));
 assert.equal(new Set(created.map(x=>x.reference)).size,8);
 const retries=await Promise.all(bodies.map(async body=>(await call(env,'create',body)).json()));
 assert.deepEqual(retries.map(x=>x.reference),created.map(x=>x.reference));
 assert.equal(env.sql.prepare('SELECT COUNT(*) AS n FROM orders').get().n,8);
});
test('sequential orders cannot send before a server number is assigned',async()=>{
 const env=submissionEnv(false),context=await formContext(env),raw={...input(),referenceVersion:2};let sends=0;
 const network=async url=>{if(url.includes('siteverify'))return Response.json({success:true,hostname:'customvibe.co.za',action:'order'});sends++;return Response.json({id:'unexpected'});};
 assert.equal((await submit(env,context,raw,network)).status,503);assert.equal(sends,0);
 assert.throws(()=>orderEmails(validateOrder(raw,defaultContent)),/not been assigned/);
 assert.notEqual(fingerprintPayload(validateOrder(raw,defaultContent)),fingerprintPayload(validateOrder(input(),defaultContent)));
});
