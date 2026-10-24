import test from 'node:test';
import assert from 'node:assert/strict';
import {submissions} from '../server/submissions.mjs';
import security from '../security/index.mjs';
import {artworkEnv,tile} from './helpers/artwork.mjs';
import {defaultContent} from '../src/content/model.mjs';
import {withShippingAgreement} from './helpers/shipping.mjs';
const call=(env,path,body)=>security.fetch(new Request('https://internal/'+path,{method:'POST',body:JSON.stringify(body)}),env);
const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r});return {promise,resolve}};
async function fixture(){
 const env={...artworkEnv(),ORDER_RECORDS_ENABLED:'true',SUBMISSIONS_ENABLED:'true',RESEND_API_KEY:'synthetic',TURNSTILE_SECRET_KEY:'synthetic',TURNSTILE_SITE_KEY:'synthetic',SESSION_SECRET:'a'.repeat(64),CATALOGUE:{fetch:async()=>Response.json(defaultContent)}};
 env.AUTH={fetch:(url,init)=>security.fetch(new Request(url,init),env)};
 const origin='https://customvibe.co.za',form=await submissions(new Request(origin+'/api/forms'),env),config=await form.json(),cookie=form.headers.get('set-cookie').split(';')[0],payload={id:crypto.randomUUID(),createdAt:Math.floor(Date.now()/1000),contact:{name:'Synthetic concurrent customer',email:'synthetic@example.test',phone:'0821234567'},locker:{name:'Fictional',area:'Durban'},consent:true,items:[{kind:'photo',qty:1,files:[tile.toString('base64')]}]},calls=[];
 const request=()=>new Request(origin+'/api/order-request',{method:'POST',headers:{origin,'Content-Type':'application/json','CF-Connecting-IP':'192.0.2.7',cookie,'X-CSRF-Token':config.csrf},body:JSON.stringify({payload:withShippingAgreement(payload),turnstile:'synthetic'})});
 let erased=false;const network=async(url,init)=>{if(url.includes('siteverify'))return Response.json({success:true,hostname:'customvibe.co.za',action:'order'});const email=JSON.parse(init.body);calls.push({afterErasure:erased,to:email.to[0],key:init.headers['Idempotency-Key']});return Response.json({id:'synthetic-provider-'+calls.length})};
 const preview=async()=>{const response=await call(env,'privacy/preview-erasure',{id:payload.id,version:0});assert.equal(response.status,200);return response.json()};
 const erase=async p=>{const response=await call(env,'privacy/erase',{id:payload.id,version:0,expectedDigest:p.digest,operationId:crypto.randomUUID(),confirmation:p.reference,acknowledged:true});const result=await response.json();if(result.state==='complete')erased=true;return {response,result}};
 return {env,request,network,calls,payload,preview,erase};
}
test('a delayed successful order-create response cannot dispatch after another request completes and erasure wins',async()=>{
 const f=await fixture(),reached=deferred(),release=deferred(),fetch=f.env.AUTH.fetch;let held=false;
 f.env.AUTH.fetch=async(url,init)=>{const response=await fetch(url,init);if(!held&&new URL(url).pathname==='/orders/create'&&response.ok){held=true;reached.resolve();await release.promise;}return response};
 const first=submissions(f.request(),f.env,f.network);await reached.promise;
 assert.equal((await submissions(f.request(),f.env,f.network)).status,200);const p=await f.preview();assert.deepEqual(p.blockers,[]);assert.equal((await f.erase(p)).result.state,'complete');release.resolve();const delayed=await first;assert.equal(delayed.status,503);assert.equal(f.calls.filter(c=>c.afterErasure).length,0);assert.equal(f.calls.length,2);assert.deepEqual(f.calls.map(c=>c.key),['cv-order-'+f.payload.id+'-owner','cv-order-'+f.payload.id+'-customer']);
});
test('a durable dispatch claim that wins first blocks correction and erasure until its caller finishes',async()=>{
 const f=await fixture(),reached=deferred(),release=deferred(),fetch=f.env.AUTH.fetch;let held=false;
 f.env.AUTH.fetch=async(url,init)=>{const response=await fetch(url,init);if(!held&&new URL(url).pathname==='/submissions/claim-dispatch'&&response.ok){held=true;reached.resolve();await release.promise;}return response};
 const first=submissions(f.request(),f.env,f.network);await Promise.race([reached.promise,first.then(()=>assert.fail('Initial workflow must claim durable dispatch authorization before provider calls.'))]);
 assert.equal((await submissions(f.request(),f.env,f.network)).status,200);let p=await f.preview();assert.ok(p.blockers.some(s=>s.includes('initial email request')));assert.equal((await f.erase(p)).response.status,409);assert.equal((await call(f.env,'privacy/preview-correction',{id:f.payload.id,version:0,contact:{name:'New',email:'new@example.test',phone:'0821234567'}})).status,409);
 release.resolve();assert.equal((await first).status,200);p=await f.preview();assert.deepEqual(p.blockers,[]);assert.equal((await f.erase(p)).result.state,'complete');assert.equal(f.calls.filter(c=>c.afterErasure).length,0);assert.ok(f.calls.every(c=>c.key==='cv-order-'+f.payload.id+(c.to==='hello@customvibe.co.za'?'-owner':'-customer')));
});
test('erasure can win after dispatch preflight but before its queued authorization mutation, with no later provider call',async()=>{
 const f=await fixture(),reached=deferred(),release=deferred(),fetch=f.env.AUTH.fetch,batch=f.env.DB.batch.bind(f.env.DB);let held=false,inClaim=false,erasedInQueue=false,preview;
 f.env.AUTH.fetch=async(url,init)=>{const path=new URL(url).pathname;if(path==='/submissions/claim-dispatch')inClaim=true;try{const response=await fetch(url,init);if(!held&&path==='/orders/create'&&response.ok){held=true;reached.resolve();await release.promise;}return response}finally{if(path==='/submissions/claim-dispatch')inClaim=false}};
 const first=submissions(f.request(),f.env,f.network);await reached.promise;assert.equal((await submissions(f.request(),f.env,f.network)).status,200);preview=await f.preview();
 f.env.DB.batch=async statements=>{if(inClaim&&!erasedInQueue){erasedInQueue=true;assert.equal((await f.erase(preview)).result.state,'complete');}return batch(statements)};
 release.resolve();assert.equal((await first).status,503);assert.equal(erasedInQueue,true);assert.equal(f.calls.filter(c=>c.afterErasure).length,0);assert.equal(f.env.sql.prepare('SELECT count(*) n FROM initial_order_dispatches').get().n,0);
});
test('uncertain initial execution retains its opaque authorization after another same-key request succeeds and the original submission clock expires',async()=>{
 const f=await fixture();let firstProvider=true;const network=async(url,init)=>{if(!url.includes('siteverify')&&firstProvider){firstProvider=false;throw Error('Synthetic uncertain provider outcome')}return f.network(url,init)};
 assert.equal((await submissions(f.request(),f.env,network)).status,503);const pending=f.env.sql.prepare('SELECT * FROM initial_order_dispatches').get();assert.ok(pending);assert.equal((await submissions(f.request(),f.env,f.network)).status,200);assert.equal(f.env.sql.prepare('SELECT count(*) n FROM initial_order_dispatches').get().n,1);let p=await f.preview();assert.ok(p.blockers.some(s=>s.includes('initial email request')));assert.equal((await f.erase(p)).response.status,409);
 const clock=Date.now;Date.now=()=>pending.expires*1000+1000;try{f.env.sql.prepare('DELETE FROM submissions WHERE expires<=?').run(Math.floor(Date.now()/1000));p=await f.preview();assert.ok(p.blockers.some(s=>s.includes('initial email request')));assert.equal((await f.erase(p)).response.status,409);}finally{Date.now=clock;}
 assert.equal(f.env.sql.prepare('SELECT expires FROM initial_order_dispatches').get().expires,pending.expires);assert.doesNotMatch(JSON.stringify(pending),/Synthetic concurrent|synthetic@example|0821234567/);
});
