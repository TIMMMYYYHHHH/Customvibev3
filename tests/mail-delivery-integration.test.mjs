import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {readFileSync,readdirSync} from 'node:fs';
import {build} from 'esbuild';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
import {unstable_splitSqlQuery} from 'wrangler';
import {signToken} from '../server/auth.mjs';

const secret='whsec_'+Buffer.from('synthetic-only-integration-webhook-secret').toString('base64');
const adminSecret='a'.repeat(64),origin='https://customvibe.co.za',endpoint=origin+'/api/mail-events/resend';
const now=()=>Math.floor(Date.now()/1000),iso=t=>new Date(t*1000).toISOString();
const single=(db,query,...args)=>db.prepare(query).bind(...args).first();
const total=(db,table)=>single(db,'SELECT count(*) n FROM '+table).then(r=>r.n);
function signed(messageId,to,type='email.delivered',extra={}){
 const time=now(),eventId=extra.eventId||crypto.randomUUID(),body=extra.body??JSON.stringify({type,created_at:iso(extra.occurredAt??time-10),data:{email_id:messageId,to:[to],subject:'PRIVATE_SUBJECT_SENTINEL',body:'PRIVATE_BODY_SENTINEL',tags:{private:'PRIVATE_TAG_SENTINEL'},diagnostic:'PRIVATE_DIAGNOSTIC_SENTINEL',...extra.data}});
 const signature='v1,'+createHmac('sha256',Buffer.from(secret.slice(6),'base64')).update(`${eventId}.${time}.${body}`).digest('base64');
 return {body,method:'POST',headers:{'content-type':'application/json','svix-id':eventId,'svix-timestamp':String(time),'svix-signature':signature,...extra.headers}};
}
async function setup(t){
 const ingress=await build({entryPoints:['tests/fixtures/mail-delivery-integrated-worker.mjs'],bundle:true,format:'esm',platform:'browser',write:false});
 const backend=await build({entryPoints:['tests/fixtures/mail-delivery-security-worker.mjs'],bundle:true,format:'esm',platform:'browser',write:false});
 const runtime=new Miniflare(convertV4MiniflareOptions({workers:[
  {name:'ingress',modules:true,script:ingress.outputFiles[0].text,compatibilityDate:'2026-06-16',serviceBindings:{AUTH:'security'},bindings:{MAIL_EVENTS_ENABLED:'true',MAIL_EVENTS_ENVIRONMENT:'production',CF_PAGES:'1',CF_PAGES_BRANCH:'main',RESEND_WEBHOOK_SECRET:secret,ADMIN_SEND_ENABLED:'true',RESEND_API_KEY:'synthetic-only',ADMIN_PASSWORD_HASH:'b'.repeat(64),ADMIN_PASSWORD_SALT:'c'.repeat(64),ADMIN_SESSION_SECRET:adminSecret}},
  {name:'security',modules:true,script:backend.outputFiles[0].text,compatibilityDate:'2026-06-16',d1Databases:['DB'],kvNamespaces:['ADMIN_LOCKOUT','SITE_LOCKOUT']},
 ]}));
 t.after(async()=>{const security=await runtime.getWorker('security');assert.equal((await(await security.fetch('https://auth.internal/_fixture/stats')).json()).networkAttempts,0);assert.equal((await(await runtime.dispatchFetch(origin+'/_fixture/stats')).json()).networkAttempts,0)});
 t.after(()=>runtime.dispose());
 const db=await runtime.getD1Database('DB','security');
 // Only this ephemeral Miniflare D1 database receives migrations, including 0012.
 for(const file of readdirSync('migrations/security').filter(f=>f.endsWith('.sql')).sort())await db.batch(unstable_splitSqlQuery(readFileSync('migrations/security/'+file,'utf8')).map(sql=>db.prepare(sql)));
 const id=crypto.randomUUID(),source=crypto.randomUUID().replaceAll('-','')+'a'.repeat(32),owner='owner@example.test',customer='customer@example.test';
 const response=await runtime.dispatchFetch(origin+'/_fixture/seed',{method:'POST',body:JSON.stringify({id,source,owner,customer})});assert.equal(response.status,200,await response.clone().text());
 const providers=await response.json(),token=await signToken({scope:'admin',exp:now()+600,jti:'d'.repeat(64),csrf:'e'.repeat(64)},adminSecret);
 const detail=async(cookie='__Host-cv-admin='+token)=>runtime.dispatchFetch('https://admin.customvibe.co.za/api/orders/'+id,{headers:{cookie}});
 const deliver=(purpose,type,extra={})=>runtime.dispatchFetch(endpoint,signed(providers[purpose],purpose==='owner'?owner:customer,type,extra));
 return {runtime,db,id,source,owner,customer,providers,detail,deliver};
}
test('actual isolated signed Worker ingress uses AUTH dispatcher and transactional D1 for all purposes and authorized detail',async t=>{
 const f=await setup(t);assert.equal(await total(f.db,'mail_delivery_state'),3);assert.equal((await single(f.db,'SELECT order_id FROM submissions WHERE id=?',f.source)).order_id,f.id);
 assert.equal((await f.detail('')).status,401);assert.equal((await f.detail('__Host-cv-admin=invalid')).status,401);
 let detail=await(await f.detail()).json();assert.equal(detail.mailDelivery.length,3);assert.ok(detail.mailDelivery.every(d=>d.state==='unconfirmed'&&d.source===null));
 for(const purpose of ['owner','customer','manual']){const response=await f.deliver(purpose,'email.delivered');assert.equal(response.status,200,JSON.stringify(await(await f.runtime.dispatchFetch(origin+'/_fixture/stats')).json()));assert.equal((await single(f.db,'SELECT snapshot FROM mail_delivery_state WHERE provider_id=?',f.providers[purpose])).snapshot.includes('server-accepted'),true)}
 detail=await(await f.detail()).json();assert.equal(detail.mailDelivery.length,3);assert.ok(detail.mailDelivery.every(d=>d.state==='delivered'&&d.source==='webhook'&&Number.isInteger(d.checkedAt)&&Number.isInteger(d.occurredAt)));
 assert.deepEqual(new Set(detail.mailDelivery.map(d=>d.purpose)),new Set(['owner-notification','customer-receipt','manual-update']));
 assert.doesNotMatch(JSON.stringify(detail.mailDelivery),/fixture-|PRIVATE_|@example|recipient|observations|reference|providerMessageId/);
 for(const table of ['mail_delivery_state','mail_delivery_events']){const rows=await f.db.prepare('SELECT * FROM '+table).all();assert.doesNotMatch(JSON.stringify(rows.results),/PRIVATE_|@example|subject|diagnostic/)}
 const stats=await(await f.runtime.dispatchFetch(origin+'/_fixture/stats')).json();assert.equal(stats.networkAttempts,0);assert.equal(stats.providerCalls,1);
});
test('integrated signature validation, permanent ignored responses, source tuple/cardinality and public routing fail closed',async t=>{
 const f=await setup(t),before=await total(f.db,'mail_delivery_events');
 assert.equal((await f.runtime.dispatchFetch(endpoint,signed(f.providers.owner,f.owner,'email.delivered',{headers:{'svix-signature':'v1,invalid'}}))).status,400);
 for(const extra of [{body:'{'},{data:{to:['a@example.test','b@example.test']}},{data:{cc:['cc@example.test']}}])assert.equal((await f.runtime.dispatchFetch(endpoint,signed(f.providers.owner,f.owner,'email.delivered',extra))).status,204);
 assert.equal((await f.runtime.dispatchFetch(endpoint,signed('unmatched-provider',f.owner))).status,204);
 assert.equal((await f.runtime.dispatchFetch(endpoint,signed(f.providers.owner,'wrong@example.test'))).status,204);assert.equal(await total(f.db,'mail_delivery_events'),before);
 const acceptedBefore=await single(f.db,'SELECT owner_sent,receipt_sent,owner_provider_id,receipt_provider_id FROM submissions WHERE id=?',f.source);
 await f.db.prepare('UPDATE submissions SET receipt_provider_id=owner_provider_id,receipt_accepted_at=owner_accepted_at WHERE id=?').bind(f.source).run();assert.equal((await f.deliver('owner','email.delivered')).status,204);assert.equal(await total(f.db,'mail_delivery_events'),before);
 await f.db.prepare('UPDATE submissions SET receipt_provider_id=?,receipt_accepted_at=owner_accepted_at WHERE id=?').bind(acceptedBefore.receipt_provider_id,f.source).run();
 // No legacy public API proxy can call the newly added private path, even with
 // the website gate explicitly off in this isolated fixture.
 const statsBefore=await(await f.runtime.dispatchFetch(origin+'/_fixture/stats')).json();
 for(const path of ['/api/mail-delivery/observe','/internal/mail-delivery/observe','/api/auth/mail-delivery/observe','/api/mail-events/resend/','/admin/mail-delivery/observe']){
  const r=await f.runtime.dispatchFetch(origin+path,{method:'POST',headers:{'X-Synthetic-Gate-Off':'yes','content-type':'application/json'},body:'{}'});assert.equal(r.status,404,path);
 }
 const statsAfter=await(await f.runtime.dispatchFetch(origin+'/_fixture/stats')).json();assert.equal(statsAfter.privateCalls,statsBefore.privateCalls);assert.equal(statsAfter.networkAttempts,0);
 for(const headers of [{'X-Synthetic-Preview':'yes'},{'X-Synthetic-Inactive':'yes'}])assert.equal((await f.runtime.dispatchFetch(endpoint,signed(f.providers.owner,f.owner,'email.delivered',{headers}))).status,503);
 const redirected=await f.runtime.dispatchFetch(endpoint,signed(f.providers.owner,f.owner,'email.delivered',{headers:{'X-Synthetic-Private-Redirect':'yes'}}));assert.equal(redirected.status,503);assert.equal(redirected.headers.get('location'),null);assert.doesNotMatch(await redirected.text(),/external.invalid|private-sentinel/);assert.equal(await total(f.db,'mail_delivery_events'),before);
});
test('actual D1 final expiry assertion rolls back snapshot and claim in the same batch',async t=>{
 const f=await setup(t),sourceBefore=await single(f.db,'SELECT * FROM submissions WHERE id=?',f.source),stateBefore=await single(f.db,'SELECT * FROM mail_delivery_state WHERE provider_id=?',f.providers.owner);
 await f.db.prepare("CREATE TRIGGER synthetic_expiry_crossing BEFORE INSERT ON mail_delivery_events BEGIN UPDATE submissions SET expires=unixepoch() WHERE id='"+f.source+"'; END;").run();
 assert.equal((await f.deliver('owner','email.delivered')).status,503);assert.equal(await total(f.db,'mail_delivery_events'),0);assert.deepEqual(await single(f.db,'SELECT * FROM mail_delivery_state WHERE provider_id=?',f.providers.owner),stateBefore);assert.deepEqual(await single(f.db,'SELECT * FROM submissions WHERE id=?',f.source),sourceBefore);
 await f.db.exec('DROP TRIGGER synthetic_expiry_crossing');assert.equal((await f.deliver('owner','email.delivered')).status,200);
});
test('real D1 concurrent CAS merges distinct events and unique claims cannot transfer across receipts',async t=>{
 const f=await setup(t),events=[signed(f.providers.owner,f.owner,'email.delivered'),signed(f.providers.owner,f.owner,'email.delivery_delayed')];
 const responses=await Promise.all(events.map(event=>f.runtime.dispatchFetch(endpoint,event)));for(let i=0;i<responses.length;i++){assert.ok([200,503].includes(responses[i].status));if(responses[i].status===503)assert.equal((await f.runtime.dispatchFetch(endpoint,events[i])).status,200)}
 let state=JSON.parse((await single(f.db,'SELECT snapshot FROM mail_delivery_state WHERE provider_id=?',f.providers.owner)).snapshot);assert.equal(state.state,'delivered');assert.equal(state.observations.length,2);assert.equal(await total(f.db,'mail_delivery_events'),2);
 const eventId=crypto.randomUUID(),sameClaim=[signed(f.providers.owner,f.owner,'email.sent',{eventId}),signed(f.providers.customer,f.customer,'email.sent',{eventId})];
 const claims=await Promise.all(sameClaim.map(event=>f.runtime.dispatchFetch(endpoint,event)));assert.ok(claims.every(r=>[200,204,503].includes(r.status)));assert.equal((await single(f.db,'SELECT count(*) n FROM mail_delivery_events WHERE event_id=?',eventId)).n,1);
 const claim=await single(f.db,'SELECT state_id FROM mail_delivery_events WHERE event_id=?',eventId),winner=await single(f.db,'SELECT provider_id FROM mail_delivery_state WHERE id=?',claim.state_id);const loser=winner.provider_id===f.providers.owner?1:0;assert.equal((await f.runtime.dispatchFetch(endpoint,sameClaim[loser])).status,204);
 assert.equal((await single(f.db,'SELECT count(*) n FROM mail_delivery_events WHERE event_id=?',eventId)).n,1);
});
test('integrated D1 atomic claim rollback, uncertain reply replay and retained event conflicts remain truthful',async t=>{
 const f=await setup(t);await f.db.exec("CREATE TRIGGER synthetic_claim_failure BEFORE INSERT ON mail_delivery_events BEGIN SELECT RAISE(ABORT,'synthetic claim failure'); END;");
 assert.equal((await f.deliver('owner','email.delivered')).status,503);assert.equal(await total(f.db,'mail_delivery_events'),0);assert.equal((await single(f.db,'SELECT snapshot FROM mail_delivery_state WHERE provider_id=?',f.providers.owner)).snapshot,null);
 await f.db.exec('DROP TRIGGER synthetic_claim_failure');
 const event=signed(f.providers.owner,f.owner,'email.delivered',{headers:{'X-Synthetic-Lose-Reply':'yes'}});assert.equal((await f.runtime.dispatchFetch(endpoint,event)).status,503);assert.equal(await total(f.db,'mail_delivery_events'),1);
 delete event.headers['X-Synthetic-Lose-Reply'];assert.equal((await f.runtime.dispatchFetch(endpoint,event)).status,200);assert.equal(await total(f.db,'mail_delivery_events'),1);
 assert.equal((await f.deliver('customer','email.delivered',{eventId:event.headers['svix-id']})).status,204);
 assert.equal((await f.deliver('owner','email.bounced',{eventId:event.headers['svix-id']})).status,200);let state=JSON.parse((await single(f.db,'SELECT snapshot FROM mail_delivery_state WHERE provider_id=?',f.providers.owner)).snapshot);assert.equal(state.reason,'event-id-conflict');assert.equal(state.observations.length,1);assert.equal(await total(f.db,'mail_delivery_events'),1);
 const detail=await(await f.detail()).json(),summary=detail.mailDelivery.find(d=>d.purpose==='owner-notification');assert.equal(summary.state,'needs-review');assert.equal(summary.occurredAt,null);
});
test('integrated D1 ordering retains terminal outcomes and complaint while original expiry and cleanup hide evidence',async t=>{
 const f=await setup(t);for(const type of ['email.delivery_delayed','email.delivered','email.sent','email.complained'])assert.equal((await f.deliver('manual',type)).status,200);
 let summary=(await(await f.detail()).json()).mailDelivery.find(d=>d.purpose==='manual-update');assert.equal(summary.state,'delivered');assert.equal(summary.complaint,true);assert.equal(summary.occurredAt,null);
 assert.equal((await f.deliver('manual','email.bounced')).status,200);summary=(await(await f.detail()).json()).mailDelivery.find(d=>d.purpose==='manual-update');assert.equal(summary.state,'needs-review');
 // Exact database expiry, without waiting for periodic cleanup. The original
 // accepted history stays intact and evidence cannot be resurrected by replay.
 await f.db.prepare('UPDATE orders SET artwork_expires=unixepoch() WHERE id=?').bind(f.id).run();assert.equal((await f.deliver('manual','email.delivered')).status,204);assert.equal((await(await f.detail()).json()).mailDelivery.some(d=>d.purpose==='manual-update'),false);
 const security=await f.runtime.getWorker('security');assert.equal((await security.fetch('https://auth.internal/_fixture/cleanup',{method:'POST'})).status,204);
 assert.equal(await total(f.db,'mail_delivery_events'),0);assert.equal(await total(f.db,'order_update_attempts'),1);assert.equal((await single(f.db,'SELECT state FROM order_update_attempts WHERE order_id=?',f.id)).state,'accepted');
 assert.equal((await(await f.runtime.dispatchFetch(origin+'/_fixture/stats')).json()).networkAttempts,0);
});
