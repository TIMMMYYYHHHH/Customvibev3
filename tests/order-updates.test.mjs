import test from 'node:test';import assert from 'node:assert/strict';import security from '../security/index.mjs';import {artworkEnv} from './helpers/artwork.mjs';import {sendOrderUpdate,previewOrderUpdate,previewRetryUpdate} from '../admin/order-mail.mjs';
async function setup(){const env={...artworkEnv(),ADMIN_SEND_ENABLED:'true',SITE_GATE_ENABLED:'true',SUBMISSIONS_ENABLED:'true',RESEND_API_KEY:'test',ADMIN_TEST_RECIPIENTS:'owner@example.com'};env.AUTH={fetch:(url,init)=>security.fetch(new Request(url,init),env)};const id=crypto.randomUUID();await env.AUTH.fetch('https://internal/orders/create',{method:'POST',body:JSON.stringify({id,fingerprint:'a'.repeat(64),snapshot:{contact:{name:'<Test>',email:'owner@example.com',phone:'1234567'},locker:{name:'Locker',area:'Durban'},items:[{kind:'photo',name:'Photo',qty:1,files:[]}],magnetQty:1,subtotalCents:4000,paymentStatus:'unpaid'}})});return {env,id};}
test('manual updates reserve shared allowance and dispatch at most once per version',async()=>{const {env,id}=await setup();let sent=0;const network=async(url,init)=>{sent++;const b=JSON.parse(init.body);assert.deepEqual(b.to,['owner@example.com']);assert.equal(b.reply_to,'orders@customvibe.co.za');assert.match(b.text,/No payment/);return Response.json({id:'accepted'});};const responses=await Promise.all(Array.from({length:3},()=>sendOrderUpdate(env,id,0,network)));assert.equal(sent,1);assert.ok(responses.some(r=>r.status===200));assert.equal(env.sql.prepare("SELECT count FROM attempts WHERE id LIKE 'forms:day:%'").get().count,1);assert.equal(env.sql.prepare('SELECT state FROM order_updates').get().state,'accepted');});
test('uncertain sends, disabled email configuration and stale previews cannot dispatch',async()=>{const {env,id}=await setup();let sends=0;const network=async()=>{sends++;throw Error('timeout')};await sendOrderUpdate(env,id,0,network);await sendOrderUpdate(env,id,0,network);assert.equal(sends,1);assert.equal(env.sql.prepare('SELECT state FROM order_updates').get().state,'uncertain');for(const patch of [{ADMIN_SEND_ENABLED:'false'},{RESEND_API_KEY:''}]){const x=await setup();Object.assign(x.env,patch);assert.notEqual((await sendOrderUpdate(x.env,x.id,0,network)).status,200);}assert.equal(sends,1);assert.equal((await sendOrderUpdate(env,id,99,network)).status,409);const preview=await previewOrderUpdate(env,id);assert.equal(preview.to,'owner@example.com');assert.ok(!preview.html.includes('<Test>'));});
test('shared daily exhaustion prevents manual emails without consuming another reservation',async()=>{const {env,id}=await setup(),day=Math.floor(Date.now()/86400000);env.sql.prepare('INSERT INTO attempts(id,count,until) VALUES (?,?,?)').run('forms:day:'+day,80,(day+1)*86400);const response=await sendOrderUpdate(env,id,0,async()=>{throw Error('Must not send')});assert.equal(response.status,429);assert.equal(env.sql.prepare('SELECT count(*) n FROM order_updates').get().n,0);});

test('customer updates use the recorded recipient without an owner test allowlist or site-gate dependency',async()=>{
 for(const gate of ['true','false']){
  const {env,id}=await setup();env.SITE_GATE_ENABLED=gate;env.SUBMISSIONS_ENABLED='false';env.ADMIN_TEST_RECIPIENTS='someone-else@example.com';
  let payload;
  const response=await sendOrderUpdate(env,id,0,async(url,init)=>{payload=JSON.parse(init.body);return Response.json({id:'accepted'});});
  assert.equal(response.status,200);assert.deepEqual(payload.to,['owner@example.com']);
  assert.doesNotMatch(payload.subject,/test/i);assert.doesNotMatch(payload.text,/gated test|test request/i);
  assert.equal(env.sql.prepare('SELECT state FROM order_updates').get().state,'accepted');
 }
});

test('fulfilled email thanks the customer, safely gates the review link and remains manual across reopen',async()=>{
 const {env,id}=await setup();const move=async(status,version)=>env.AUTH.fetch('https://internal/orders/status',{method:'POST',body:JSON.stringify({id,status,version})});
 assert.equal((await move('fulfilled',0)).status,200);let mail=await previewOrderUpdate(env,id);assert.match(mail.text,/Thank you/);assert.doesNotMatch(mail.html,/Review us on Google/);assert.match(mail.text,/No payment/);
 env.GOOGLE_REVIEW_URL='https://g.page/r/fictional-test/review';mail=await previewOrderUpdate(env,id);assert.match(mail.html,/Review us on Google/);assert.match(mail.text,/honest review/);assert.match(mail.text,/https:\/\/g.page/);
 let sends=0;const network=async(url,options)=>{sends++;assert.match(JSON.parse(options.body).html,/Review us on Google/);return Response.json({id:'accepted'})};
 assert.equal((await sendOrderUpdate(env,id,1,network)).status,200);assert.equal((await move('shipped',1)).status,200);assert.equal((await move('fulfilled',2)).status,200);assert.equal((await sendOrderUpdate(env,id,3,network)).status,409);assert.equal(sends,1);
 const {orderUpdateEmail}=await import('../server/order-update-email.mjs'),order={reference:'CV-1',status:'fulfilled',version:3,snapshot:{contact:{name:'<Name>',email:'test@example.com'},magnetQty:1}};
 for(const link of ['javascript:alert(1)','https://evil.example/review','https://g.page@evil.example/review']){const preview=orderUpdateEmail(order,{googleReviewUrl:link});assert.doesNotMatch(preview.html,/Review us on Google/);assert.ok(!preview.html.includes('<Name>'))}
});

test('definitive rejection requires a fresh explicit retry and preserves both attempts',async()=>{
 const {env,id}=await setup();let sends=0;const keys=[];const network=async(_,init)=>{sends++;keys.push(init.headers['Idempotency-Key']);return sends===1?Response.json({name:'validation_error',message:'Domain needs verification'},{status:403}):Response.json({id:'accepted'});};
 assert.equal((await sendOrderUpdate(env,id,0,network)).status,503);
 assert.equal((await sendOrderUpdate(env,id,0,network)).status,409);
 const preview=await retryMail(env,id);assert.ok(preview.retryAttempt);assert.match(preview.retryToken,/^[a-f0-9]{64}$/);
 const results=await Promise.all([sendOrderUpdate(env,id,0,network,undefined,preview),sendOrderUpdate(env,id,0,network,undefined,preview)]);
 assert.equal(results.filter(r=>r.status===200).length,1);assert.equal(sends,2);assert.notEqual(keys[0],keys[1]);
 const detail=await(await env.AUTH.fetch('https://internal/orders/detail',{method:'POST',body:JSON.stringify({id})})).json();assert.deepEqual(detail.updates.map(u=>u.state),['accepted','failed']);assert.equal(new Set(detail.updates.map(u=>u.attempt)).size,2);
 assert.equal(env.sql.prepare("SELECT count FROM attempts WHERE id LIKE 'forms:day:%'").get().count,2);
});

const rejected=()=>Response.json({name:'validation_error',message:'Unverified sender'},{status:403});
const internal=(env,path,b)=>env.AUTH.fetch('https://internal/orders/'+path,{method:'POST',body:JSON.stringify(b)});
test('stale retry previews, stale attempts and late outcome marks cannot unlock or overwrite a later attempt',async()=>{
 const {env,id}=await setup();await sendOrderUpdate(env,id,0,rejected);const old=await retryMail(env,id),fresh=await retryMail(env,id);let sends=0;
 const network=async()=>{sends++;return rejected()};assert.equal((await sendOrderUpdate(env,id,0,network,undefined,old)).status,409);
 assert.equal((await sendOrderUpdate(env,id,0,network,undefined,fresh)).status,503);const latest=await retryMail(env,id);assert.notEqual(latest.retryAttempt,fresh.retryAttempt);
 await internal(env,'mark-update',{id,version:0,attempt:fresh.retryAttempt,state:'accepted'});
 assert.equal(env.sql.prepare('SELECT state FROM order_updates').get().state,'failed');
 assert.equal((await sendOrderUpdate(env,id,0,network,undefined,fresh)).status,409);assert.equal(sends,1);
 env.sql.prepare('UPDATE order_update_attempts SET preview_until=0').run();assert.equal((await sendOrderUpdate(env,id,0,network,undefined,latest)).status,409);
 const current=await retryMail(env,id);await internal(env,'status',{id,version:0,status:'in_progress'});assert.equal((await sendOrderUpdate(env,id,0,network,undefined,current)).status,409);
});
test('unclassified failures and ambiguous provider outcomes never become retryable',async()=>{
 for(const network of [async()=>{throw Error('timeout')},async()=>new Response('Timeout',{status:408}),async()=>Response.json({name:'application_error',message:'error'},{status:500}),async()=>Response.json({name:'concurrent_idempotent_requests',message:'in progress'},{status:409}),async()=>Response.json({name:'rate_limit_exceeded',message:'rate limit'},{status:429}),async()=>new Response('<html>error</html>',{status:403}),async()=>Response.json({id:''}),async()=>Response.json({message:'unclassified'},{status:400})]){
  const {env,id}=await setup();let sends=0;const net=async(...a)=>{sends++;return network(...a)};await sendOrderUpdate(env,id,0,net);const p=await retryMail(env,id);assert.equal(p.retryAttempt,undefined);assert.equal((await sendOrderUpdate(env,id,0,net,undefined,p)).status,409);assert.equal(sends,1);assert.equal(env.sql.prepare('SELECT state FROM order_updates').get().state,'uncertain');
 }
 const {env,id}=await setup();const claim=await(await internal(env,'claim-update',{id,version:0})).json();await internal(env,'mark-update',{id,version:0,state:'failed'});assert.ok(claim.claimed);assert.equal((await retryMail(env,id)).retryAttempt,undefined);
});
test('outcome recording failure keeps the reservation locked even after provider rejection',async()=>{
 const {env,id}=await setup(),original=env.AUTH.fetch;env.AUTH.fetch=(url,options)=>url.endsWith('/mark-update')?Response.json({error:'unavailable'},{status:503}):original(url,options);
 let sends=0;const net=async()=>{sends++;return rejected()};assert.equal((await sendOrderUpdate(env,id,0,net)).status,503);assert.equal((await retryMail(env,id)).retryAttempt,undefined);assert.equal((await sendOrderUpdate(env,id,0,net)).status,409);assert.equal(sends,1);assert.equal(env.sql.prepare('SELECT state FROM order_updates').get().state,'pending');
});
test('every retry respects daily and monthly quota without losing the rejected attempt',async()=>{
 for(const period of ['day','month']){const {env,id}=await setup();await sendOrderUpdate(env,id,0,rejected);const preview=await retryMail(env,id);env.sql.prepare('UPDATE attempts SET count=? WHERE id LIKE ?').run(period==='day'?80:2400,'forms:'+period+':%');
 assert.equal((await sendOrderUpdate(env,id,0,async()=>{assert.fail('quota must prevent send')},undefined,preview)).status,429);assert.equal(env.sql.prepare('SELECT count(*) n FROM order_update_attempts').get().n,1);assert.equal(env.sql.prepare('SELECT state FROM order_updates').get().state,'failed');}
});
test('fulfilled rejection or uncertainty remains one attempt across reopen and cannot borrow a retry preview',async()=>{
 for(const network of [rejected,async()=>Response.json({id:'accepted'}),async()=>{throw Error('timeout')}]){const {env,id}=await setup();await internal(env,'status',{id,version:0,status:'fulfilled'});let sends=0;const net=async()=>{sends++;return network()};await sendOrderUpdate(env,id,1,net);assert.equal((await retryMail(env,id)).retryAttempt,undefined);await internal(env,'status',{id,version:1,status:'shipped'});await internal(env,'status',{id,version:2,status:'fulfilled'});assert.equal((await sendOrderUpdate(env,id,3,net,undefined,{retryAttempt:env.sql.prepare('SELECT reservation FROM order_updates').get().reservation,retryToken:'a'.repeat(64)})).status,409);assert.equal(sends,1);}
});
test('expired orders reject a prepared retry without provider calls and cleanup erases every attempt',async()=>{
 const {env,id}=await setup();await sendOrderUpdate(env,id,0,rejected);let p=await retryMail(env,id);await sendOrderUpdate(env,id,0,rejected,undefined,p);p=await retryMail(env,id);env.sql.prepare('UPDATE orders SET expires=0 WHERE id=?').run(id);assert.equal((await sendOrderUpdate(env,id,0,async()=>{assert.fail('expired order')},undefined,p)).status,410);const {cleanOrders}=await import('../security/orders.mjs');await cleanOrders(env);assert.equal(env.sql.prepare('SELECT count(*) n FROM order_update_attempts').get().n,0);
});

test('late and legacy outcome marks cannot overwrite a pending retry reservation',async()=>{
 const {env,id}=await setup();await sendOrderUpdate(env,id,0,rejected);const preview=await retryMail(env,id);let release,started;const ready=new Promise(resolve=>started=resolve),pending=new Promise(resolve=>release=resolve);
 const sending=sendOrderUpdate(env,id,0,async()=>{started();await pending;return Response.json({id:'accepted'})},undefined,preview);await ready;
 await internal(env,'mark-update',{id,version:0,attempt:preview.retryAttempt,state:'accepted'});
 assert.equal((await internal(env,'mark-update',{id,version:0,state:'failed'})).status,409);
 assert.equal(env.sql.prepare('SELECT state FROM order_updates').get().state,'pending');assert.equal(env.sql.prepare('SELECT state FROM order_update_attempts WHERE attempt=?').get(preview.retryAttempt).state,'failed');release();assert.equal((await sending).status,200);assert.equal(env.sql.prepare('SELECT state FROM order_updates').get().state,'accepted');
});

async function retryMail(env,id){const detail=await(await internal(env,'detail',{id})).json();return (await previewRetryUpdate(env,id,detail.version)).json();}
