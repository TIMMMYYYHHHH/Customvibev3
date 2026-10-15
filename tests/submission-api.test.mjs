import test from 'node:test';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';import {readFileSync} from 'node:fs';
import {submissions} from '../server/submissions.mjs';import security from '../security/index.mjs';import {defaultContent} from '../src/content/model.mjs';import {random,secure} from '../server/auth.mjs';
function database(){const db=new DatabaseSync(':memory:');db.exec(readFileSync('migrations/security/0001.sql','utf8'));db.exec(readFileSync('migrations/security/0002_submissions.sql','utf8'));const prepare=(sql,args=[])=>({bind(...args){return prepare(sql,args)},run:async()=>({meta:db.prepare(sql).run(...args)}),first:async()=>db.prepare(sql).get(...args)||null,all:async()=>({results:db.prepare(sql).all(...args)})});let queue=Promise.resolve();return {prepare,batch(statements){const operation=queue.then(async()=>{db.exec('BEGIN');try{const rows=[];for(const statement of statements)rows.push(await statement.all());db.exec('COMMIT');return rows}catch(e){db.exec('ROLLBACK');throw e}});queue=operation.catch(()=>{});return operation}}}
const origin='https://customvibe.co.za';
function setup(){const DB=database();return {DB,SUBMISSIONS_ENABLED:'true',RESEND_API_KEY:random(),TURNSTILE_SECRET_KEY:random(),TURNSTILE_SITE_KEY:'test-site-key',SESSION_SECRET:random(),AUTH:{fetch:(url,init)=>security.fetch(new Request(url,init),{DB})},CATALOGUE:{fetch:async()=>Response.json(defaultContent)}};}
async function form(env){const r=await submissions(new Request(origin+'/api/forms'),env);const config=await r.json();return {cookie:r.headers.get('set-cookie').split(';')[0],csrf:config.csrf};}
const payload=()=>({id:crypto.randomUUID(),createdAt:Math.floor(Date.now()/1000),name:'Visitor',email:'visitor@example.com',message:'A question about photo magnets.'});
function post(path,context,data,extra={}){return new Request(origin+path,{method:'POST',headers:{origin,'Content-Type':'application/json','CF-Connecting-IP':'192.0.2.7',cookie:context.cookie,'X-CSRF-Token':context.csrf,...extra},body:JSON.stringify({payload:data,turnstile:'test-response'})});}
test('forms fail closed without provider credentials and reject cross-origin POSTs',async()=>{
 assert.equal((await (await submissions(new Request(origin+'/api/forms'),{})).json()).available,false);
 assert.equal((await submissions(post('/api/contact',{cookie:'',csrf:''},payload(),{origin:'https://attacker.invalid'}),setup())).status,403);
});
test('contact retries keep identical provider idempotency keys and do not resend once accepted',async()=>{
 const env=setup(),context=await form(env),data=payload(),calls=[];let fail=true;
 const network=async(url,init)=>{if(url.includes('siteverify'))return Response.json({success:true,hostname:'customvibe.co.za',action:'contact'});calls.push({key:init.headers['Idempotency-Key'],body:init.body});if(fail){fail=false;throw new Error('Simulated timeout')}return Response.json({id:'test-provider-id'})};
 assert.equal((await submissions(post('/api/contact',context,data),env,network)).status,503);
 assert.equal((await submissions(post('/api/contact',context,data),env,network)).status,200);
 assert.equal((await submissions(post('/api/contact',context,data),env,network)).status,200);
 assert.equal(calls.length,2);assert.equal(calls[0].key,calls[1].key);assert.equal(calls[0].body,calls[1].body);
 assert.equal((await submissions(post('/api/contact',context,{...data,message:'Changed request'}),env,network)).status,409);
});
test('invalid Turnstile host/action and invalid CSRF never reach email delivery',async()=>{
 const env=setup(),context=await form(env);let sends=0;
 for(const challenge of [{success:true,hostname:'attacker.invalid',action:'contact'},{success:true,hostname:'customvibe.co.za',action:'order'},{success:false}]){
  const r=await submissions(post('/api/contact',context,payload()),env,async url=>{if(url.includes('siteverify'))return Response.json(challenge);sends++;return Response.json({id:'bad'})});assert.equal(r.status,403);
 }
 const r=await submissions(post('/api/contact',{...context,csrf:random()},payload()),env,async()=>{sends++;throw Error('Must not call provider')});assert.equal(r.status,403);assert.equal(sends,0);
});
test('atomic form limits are separate from login attempts and persist across requests',async()=>{
 const env=setup(),context=await form(env);const network=async url=>Response.json(url.includes('siteverify')?{success:true,hostname:'customvibe.co.za',action:'contact'}:{id:'accepted'});
 const statuses=[];for(let i=0;i<6;i++)statuses.push((await submissions(post('/api/contact',context,payload()),env,network)).status);assert.deepEqual(statuses,[200,200,200,200,200,429]);
});
test('a failed customer receipt does not resend owner artwork on retry',async()=>{
 const env=setup(),context=await form(env);const jpeg=readFileSync('tests/fixtures/print-tile.jpg').toString('base64');
 const data={id:crypto.randomUUID(),createdAt:Math.floor(Date.now()/1000),contact:{name:'Test',email:'customer@example.com',phone:'0821234567'},locker:{name:'Preferred locker',area:'Durban'},consent:true,items:[{kind:'photo',qty:1,files:[jpeg]}]};let owner=0,receipt=0;
 const network=async(url,init)=>{if(url.includes('siteverify'))return Response.json({success:true,hostname:'customvibe.co.za',action:'order'});const mail=JSON.parse(init.body);if(mail.to[0]==='customvibe03@gmail.com')owner++;else{receipt++;if(receipt===1)return new Response(null,{status:503});}return Response.json({id:'accepted'});};
 const first=await (await submissions(post('/api/order-request',context,data),env,network)).json();assert.equal(first.ok,true);assert.equal(first.receiptSent,false);
 const next=await (await submissions(post('/api/order-request',context,data),env,network)).json();assert.equal(next.receiptSent,true);assert.equal(owner,1);assert.equal(receipt,2);
});
test('Turnstile CSP allowance is limited to public form pages',()=>{
 assert.ok(secure(new Response(''),{forms:true}).headers.get('Content-Security-Policy').includes('https://challenges.cloudflare.com'));
 assert.ok(!secure(new Response(''),{admin:true}).headers.get('Content-Security-Policy').includes('https://challenges.cloudflare.com'));
});
test('blocked IP requests cannot exhaust shared daily or monthly allowances',async()=>{
 const env=setup(),context=await form(env),network=async url=>Response.json(url.includes('siteverify')?{success:true,hostname:'customvibe.co.za',action:'contact'}:{id:'accepted'});
 for(let i=0;i<90;i++)await submissions(post('/api/contact',context,payload()),env,network);
 const rows=(await env.DB.prepare("SELECT count FROM attempts WHERE id LIKE 'forms:day:%' OR id LIKE 'forms:month:%'").all()).results;
 assert.deepEqual(rows.map(r=>r.count),[5,5]);
 assert.equal((await submissions(post('/api/contact',context,payload(),{'CF-Connecting-IP':'192.0.2.8'}),env,network)).status,200);
});
test('concurrent fresh requests reserve only the permitted quota',async()=>{
 const env=setup(),context=await form(env),network=async url=>Response.json(url.includes('siteverify')?{success:true,hostname:'customvibe.co.za',action:'contact'}:{id:'accepted'});
 const results=await Promise.all(Array.from({length:10},()=>submissions(post('/api/contact',context,payload()),env,network)));
 assert.equal(results.filter(r=>r.status===200).length,5);assert.equal(results.filter(r=>r.status===429).length,5);
 const rows=(await env.DB.prepare("SELECT count FROM attempts WHERE id LIKE 'forms:day:%' OR id LIKE 'forms:month:%'").all()).results;assert.deepEqual(rows.map(r=>r.count),[5,5]);
});
test('existing uncertain requests recover after one hour, but old fresh drafts cannot send',async()=>{
 const env=setup(),context=await form(env),data=payload(),realNow=Date.now;let failed=false;
 const network=async url=>{if(url.includes('siteverify'))return Response.json({success:true,hostname:'customvibe.co.za',action:'contact'});if(!failed){failed=true;throw Error('timeout')}return Response.json({id:'accepted'});};
 assert.equal((await submissions(post('/api/contact',context,data),env,network)).status,503);
 const now=Date.now();try{Date.now=()=>now+7200000;const refreshed=await form(env);assert.equal((await submissions(post('/api/contact',refreshed,data),env,network)).status,200);assert.equal((await submissions(post('/api/contact',refreshed,{...data,id:crypto.randomUUID()}),env,network)).status,410);}finally{Date.now=realNow;}
});
