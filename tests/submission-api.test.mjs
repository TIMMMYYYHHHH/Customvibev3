import {withShippingAgreement} from './helpers/shipping.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';import {readFileSync,readdirSync} from 'node:fs';
import {artworkEnv,tile,sha} from './helpers/artwork.mjs';
import {submissions} from '../server/submissions.mjs';import security from '../security/index.mjs';import {defaultContent} from '../src/content/model.mjs';import {random,secure} from '../server/auth.mjs';
function database(){const db=new DatabaseSync(':memory:');for(const f of readdirSync('migrations/security').filter(f=>f.endsWith('.sql')).sort())db.exec(readFileSync('migrations/security/'+f,'utf8'));const prepare=(sql,args=[])=>({bind(...args){return prepare(sql,args)},run:async()=>({meta:db.prepare(sql).run(...args)}),first:async()=>db.prepare(sql).get(...args)||null,all:async()=>({results:db.prepare(sql).all(...args)})});let queue=Promise.resolve();return {prepare,batch(statements){const operation=queue.then(async()=>{db.exec('BEGIN');try{const rows=[];for(const statement of statements)rows.push(await statement.all());db.exec('COMMIT');return rows}catch(e){db.exec('ROLLBACK');throw e}});queue=operation.catch(()=>{});return operation}}}
const origin='https://customvibe.co.za';
function setup(){const DB=database();return {DB,SITE_GATE_ENABLED:'true',SUBMISSIONS_ENABLED:'true',RESEND_API_KEY:random(),W3FORMS_ACCESS_KEY:'w3f_test_key',TURNSTILE_SECRET_KEY:random(),TURNSTILE_SITE_KEY:'test-site-key',SESSION_SECRET:random(),AUTH:{fetch:(url,init)=>security.fetch(new Request(url,init),{DB})},CATALOGUE:{fetch:async()=>Response.json(defaultContent)}};}
async function form(env){const r=await submissions(new Request(origin+'/api/forms'),env);const config=await r.json();return {cookie:r.headers.get('set-cookie').split(';')[0],csrf:config.csrf};}
const payload=()=>({id:crypto.randomUUID(),createdAt:Math.floor(Date.now()/1000),name:'Visitor',email:'visitor@example.com',message:'A question about photo magnets.'});
function post(path,context,data,extra={}){return new Request(origin+path,{method:'POST',headers:{origin,'Content-Type':'application/json','CF-Connecting-IP':'192.0.2.7',cookie:context.cookie,'X-CSRF-Token':context.csrf,...extra},body:JSON.stringify({payload:withShippingAgreement(data),turnstile:'test-response'})});}
test('forms fail closed without provider credentials and reject cross-origin POSTs',async()=>{
 assert.equal((await (await submissions(new Request(origin+'/api/forms'),{})).json()).available,false);
 assert.equal((await submissions(post('/api/contact',{cookie:'',csrf:''},payload(),{origin:'https://attacker.invalid'}),setup())).status,403);
});
test('legacy order mode does not advertise locker search or accept selected IDs before side effects',async()=>{
 const env={...setup(),LOCKER_LOOKUP_ENABLED:'true',TCG_LOCKER_API_KEY:random()},context=await form(env),jpeg=readFileSync('tests/fixtures/print-tile.jpg').toString('base64');let sends=0,storage=0;
 const data={id:crypto.randomUUID(),createdAt:Math.floor(Date.now()/1000),contact:{name:'Test',email:'customer@example.com',phone:'0821234567'},locker:{id:'CG123',name:'Example locker',area:'Durban North'},consent:true,items:[{kind:'photo',qty:1,files:[jpeg]}]};
 const realAuth=env.AUTH;env.AUTH={fetch:(...args)=>{storage++;return realAuth.fetch(...args)}};
 const network=async url=>{if(url.includes('siteverify'))return Response.json({success:true,hostname:'customvibe.co.za',action:'order'});sends++;return Response.json({id:'accepted'})};
 assert.equal((await submissions(post('/api/order-request',context,data),env,network,async()=>{throw Error('Must not look up')})).status,400);assert.equal(sends,0);assert.equal(storage,0);
 const config=await (await submissions(new Request(origin+'/api/forms'),env)).json();assert.equal(config.lockerSearch,false);assert.equal(config.paymentStatus,'coming-soon');assert.ok(!JSON.stringify(config).includes(env.TCG_LOCKER_API_KEY));
});
test('contact uses only W3Forms and repeated or concurrent requests cannot duplicate delivery',async()=>{
 const env={...setup(),W3FORMS_ACCESS_KEY:'w3f_test_key'},context=await form(env),data=payload(),calls=[];
 const network=async(url,init)=>{if(url.includes('siteverify'))return Response.json({success:true,hostname:'customvibe.co.za',action:'contact'});calls.push({url,headers:init.headers,body:JSON.parse(init.body)});return Response.json({success:true,message:'Form submitted successfully'});};
 await Promise.all(Array.from({length:3},()=>submissions(post('/api/contact',context,data),env,network)));
 const final=await submissions(post('/api/contact',context,data),env,network);assert.equal(final.status,200);assert.equal(calls.length,1);
 assert.equal(calls[0].url,'https://api.w3forms.com/submit');assert.equal(calls[0].headers.Origin,origin);
 assert.deepEqual(calls[0].body,{access_key:'w3f_test_key',name:'Visitor',email:'visitor@example.com',message:'A question about photo magnets.',reference:data.id,subject:'CustomVibe contact message',from_name:'CustomVibe website',company_website:''});
 assert.equal((await submissions(post('/api/contact',context,{...data,message:'Changed request'}),env,network)).status,409);
});
test('uncertain W3Forms delivery is never automatically resent or reported as successful',async()=>{
 for(const failure of ['timeout','rejected','malformed']){
  const env={...setup(),W3FORMS_ACCESS_KEY:'w3f_test_key'},context=await form(env),data=payload();let sends=0;
  const network=async url=>{if(url.includes('siteverify'))return Response.json({success:true,hostname:'customvibe.co.za',action:'contact'});sends++;if(failure==='timeout')throw Error('timeout');return failure==='rejected'?Response.json({success:false,error:'Rejected'},{status:400}):Response.json({unexpected:true});};
  for(let i=0;i<2;i++){const r=await submissions(post('/api/contact',context,data),env,network);assert.equal(r.status,503);const body=await r.json();assert.equal(body.manualReview,true);assert.equal(body.reference,data.id);assert.notEqual(body.ok,true);}
  assert.equal(sends,1);
 }
});
test('provider readiness is independent for contact and order forms and secrets stay server-side',async()=>{
 const env={...setup(),W3FORMS_ACCESS_KEY:'w3f_test_key'};delete env.RESEND_API_KEY;
 delete env.CATALOGUE;
 const contact=await (await submissions(new Request(origin+'/api/forms?kind=contact'),env)).json();assert.equal(contact.available,true);assert.ok(!JSON.stringify(contact).includes('w3f_test_key'));
 assert.equal((await (await submissions(new Request(origin+'/api/forms?kind=order'),env)).json()).available,false);
 const context=await form({...env,RESEND_API_KEY:'test',CATALOGUE:{}});let forwarded;
 const accepted=await submissions(post('/api/contact',context,{...payload(),attachments:['not forwarded'],photo:'not forwarded'}),env,async(url,init)=>{if(url.includes('siteverify'))return Response.json({success:true,hostname:'customvibe.co.za',action:'contact'});forwarded=JSON.parse(init.body);return Response.json({success:true,message:'Form submitted successfully'});});
 assert.equal(accepted.status,200);assert.equal(forwarded.attachments,undefined);assert.equal(forwarded.photo,undefined);
 env.RESEND_API_KEY='re_test_key';env.CATALOGUE={};delete env.W3FORMS_ACCESS_KEY;
 assert.equal((await (await submissions(new Request(origin+'/api/forms?kind=contact'),env)).json()).available,false);
 assert.equal((await (await submissions(new Request(origin+'/api/forms?kind=order'),env)).json()).available,true);
});
test('lost claim acknowledgement or failed send marking cannot dispatch a contact twice',async()=>{
 for(const failure of ['claim-contact','mark']){
  const env=setup(),context=await form(env),data=payload(),realAuth=env.AUTH;let fault=true,sends=0;
  env.AUTH={fetch:async(url,init)=>{if(url.endsWith('/'+failure)&&fault){fault=false;if(failure==='claim-contact')await realAuth.fetch(url,init);throw Error('Service binding interrupted')}return realAuth.fetch(url,init);}};
  const network=async url=>{if(url.includes('siteverify'))return Response.json({success:true,hostname:'customvibe.co.za',action:'contact'});sends++;return Response.json({success:true,message:'Form submitted successfully'});};
  for(let i=0;i<2;i++){const result=await submissions(post('/api/contact',context,data),env,network);assert.equal(result.status,503);assert.equal((await result.json()).manualReview,true);}
  assert.equal(sends,failure==='claim-contact'?0:1);
 }
});
test('invalid Turnstile host/action and invalid CSRF never reach email delivery',async()=>{
 const env=setup(),context=await form(env);let sends=0;
 for(const challenge of [{success:true,hostname:'attacker.invalid',action:'contact'},{success:true,hostname:'customvibe.co.za',action:'order'},{success:false}]){
  const r=await submissions(post('/api/contact',context,payload()),env,async url=>{if(url.includes('siteverify'))return Response.json(challenge);sends++;return Response.json({id:'bad'})});assert.equal(r.status,403);
 }
 const r=await submissions(post('/api/contact',{...context,csrf:random()},payload()),env,async()=>{sends++;throw Error('Must not call provider')});assert.equal(r.status,403);assert.equal(sends,0);
});
test('atomic form limits are separate from login attempts and persist across requests',async()=>{
 const env=setup(),context=await form(env);const network=async url=>Response.json(url.includes('siteverify')?{success:true,hostname:'customvibe.co.za',action:'contact'}:{success:true,message:'Form submitted successfully'});
 const statuses=[];for(let i=0;i<6;i++)statuses.push((await submissions(post('/api/contact',context,payload()),env,network)).status);assert.deepEqual(statuses,[200,200,200,200,200,429]);
});
test('a failed customer receipt does not resend owner artwork on retry',async()=>{
 const env=setup(),context=await form(env);const jpeg=readFileSync('tests/fixtures/print-tile.jpg').toString('base64');
 const data={id:crypto.randomUUID(),createdAt:Math.floor(Date.now()/1000),contact:{name:'Test',email:'customer@example.com',phone:'0821234567'},locker:{name:'Preferred locker',area:'Durban'},consent:true,items:[{kind:'photo',qty:1,files:[jpeg]}]};let owner=0,receipt=0;
 const network=async(url,init)=>{if(url.includes('siteverify'))return Response.json({success:true,hostname:'customvibe.co.za',action:'order'});const mail=JSON.parse(init.body);if(mail.to[0]==='hello@customvibe.co.za')owner++;else{receipt++;if(receipt===1)return new Response(null,{status:503});}return Response.json({id:'accepted'});};
 const first=await (await submissions(post('/api/order-request',context,data),env,network)).json();assert.equal(first.ok,true);assert.equal(first.receiptSent,false);
 const next=await (await submissions(post('/api/order-request',context,data),env,network)).json();assert.equal(next.receiptSent,true);assert.equal(owner,1);assert.equal(receipt,2);
});
test('Turnstile CSP allowance is limited to public form pages',()=>{
 assert.ok(secure(new Response(''),{forms:true}).headers.get('Content-Security-Policy').includes('https://challenges.cloudflare.com'));
 assert.ok(!secure(new Response(''),{admin:true}).headers.get('Content-Security-Policy').includes('https://challenges.cloudflare.com'));
});
test('blocked IP requests cannot exhaust shared daily or monthly allowances',async()=>{
 const env=setup(),context=await form(env),network=async url=>Response.json(url.includes('siteverify')?{success:true,hostname:'customvibe.co.za',action:'contact'}:{success:true,message:'Form submitted successfully'});
 for(let i=0;i<90;i++)await submissions(post('/api/contact',context,payload()),env,network);
 const rows=(await env.DB.prepare("SELECT count FROM attempts WHERE id LIKE 'forms:day:%' OR id LIKE 'forms:month:%'").all()).results;
 assert.deepEqual(rows.map(r=>r.count),[5,5]);
 assert.equal((await submissions(post('/api/contact',context,payload(),{'CF-Connecting-IP':'192.0.2.8'}),env,network)).status,200);
});
test('concurrent fresh requests reserve only the permitted quota',async()=>{
 const env=setup(),context=await form(env),network=async url=>Response.json(url.includes('siteverify')?{success:true,hostname:'customvibe.co.za',action:'contact'}:{success:true,message:'Form submitted successfully'});
 const results=await Promise.all(Array.from({length:10},()=>submissions(post('/api/contact',context,payload()),env,network)));
 assert.equal(results.filter(r=>r.status===200).length,5);assert.equal(results.filter(r=>r.status===429).length,5);
 const rows=(await env.DB.prepare("SELECT count FROM attempts WHERE id LIKE 'forms:day:%' OR id LIKE 'forms:month:%'").all()).results;assert.deepEqual(rows.map(r=>r.count),[5,5]);
});
test('uncertain contacts remain held after one hour and old fresh drafts cannot send',async()=>{
 const env=setup(),context=await form(env),data=payload(),realNow=Date.now;let sends=0;
 const network=async url=>{if(url.includes('siteverify'))return Response.json({success:true,hostname:'customvibe.co.za',action:'contact'});sends++;throw Error('timeout')};
 assert.equal((await submissions(post('/api/contact',context,data),env,network)).status,503);
 const now=Date.now();try{Date.now=()=>now+7200000;const refreshed=await form(env);assert.equal((await submissions(post('/api/contact',refreshed,data),env,network)).status,503);assert.equal(sends,1);assert.equal((await submissions(post('/api/contact',refreshed,{...data,id:crypto.randomUUID()}),env,network)).status,410);}finally{Date.now=realNow;}
});

test('submission readiness follows its sending configuration independently of the website gate',async()=>{
 for(const gate of ['true','false']){
  const env=setup();env.SITE_GATE_ENABLED=gate;
  for(const kind of ['contact','order'])assert.equal((await (await submissions(new Request(origin+'/api/forms?kind='+kind),env)).json()).available,true);
  const context=await form(env);let sent=0;
  const response=await submissions(post('/api/contact',context,payload()),env,async url=>{if(url.includes('siteverify'))return Response.json({success:true,hostname:'customvibe.co.za',action:'contact'});sent++;return Response.json({success:true});});
  assert.equal(response.status,200);assert.equal(sent,1);
  env.SUBMISSIONS_ENABLED='false';
  assert.equal((await (await submissions(new Request(origin+'/api/forms'),env)).json()).available,false);
  assert.equal((await submissions(post('/api/contact',context,payload()),env,async()=>{throw Error('Disabled sending must not call providers')})).status,503);
 }
});


for(const finalized of [0,1])test(`absent artwork with finalized=${finalized} cannot reserve an order or dispatch email before validated repair`,async()=>{
 const storage=artworkEnv(),env={...setup(),...storage,ARTWORK_STORAGE_ENABLED:'true',ORDER_RECORDS_ENABLED:'true'};
 env.AUTH={fetch:(url,init)=>security.fetch(new Request(url,init),storage)};const context=await form(env);
 const data={id:crypto.randomUUID(),createdAt:Math.floor(Date.now()/1000),contact:{name:'Test',email:'customer@example.com',phone:'0821234567'},locker:{name:'Preferred locker',area:'Durban'},consent:true,items:[{kind:'photo',qty:1,files:[{size:tile.length,sha256:await sha(tile)}]}]};let sends=0;
 const network=async url=>{if(url.includes('siteverify'))return Response.json({success:true,hostname:'customvibe.co.za',action:'order'});sends++;return Response.json({id:'accepted'})};
 const initial=await submissions(post('/api/artwork/init',context,data),env,network);assert.equal(initial.status,200);const {grant}=await initial.json();
 const uploadFile=()=>submissions(new Request(origin+'/api/artwork/upload',{method:'POST',headers:{origin,cookie:context.cookie,'X-CSRF-Token':context.csrf,'Content-Type':'image/jpeg','X-Artwork-Grant':grant,'X-Artwork-Index':'0'},body:tile}),env,network);
 assert.equal((await uploadFile()).status,200);
 if(finalized){const owner=storage.sql.prepare('SELECT owner FROM artwork_requests WHERE id=?').get(data.id).owner;assert.equal((await env.AUTH.fetch('https://auth.internal/artwork/complete',{method:'POST',body:JSON.stringify({id:data.id,owner})})).status,200)}
 storage.objects.delete(data.id+'/0.jpg');
 const finish=()=>submissions(new Request(origin+'/api/order-request',{method:'POST',headers:{origin,cookie:context.cookie,'X-CSRF-Token':context.csrf,'CF-Connecting-IP':'192.0.2.7','Content-Type':'application/json'},body:JSON.stringify({payload:withShippingAgreement(data),grant})}),env,network);
 assert.equal((await finish()).status,409);assert.equal(sends,0);assert.equal(storage.sql.prepare('SELECT count(*) AS n FROM orders').get().n,0);assert.equal(storage.sql.prepare('SELECT count(*) AS n FROM submissions').get().n,0);
 assert.equal((await uploadFile()).status,200);assert.equal((await finish()).status,200);assert.equal(sends,2);assert.equal(storage.sql.prepare('SELECT count(*) AS n FROM orders').get().n,1);
 assert.equal(JSON.parse(storage.sql.prepare('SELECT snapshot FROM orders').get().snapshot).paymentStatus,'unpaid');
});

test('private preview emails keep identical receipt retries and never persist thumbnail content',async()=>{
 const storage=artworkEnv(),env={...setup(),...storage,ARTWORK_STORAGE_ENABLED:'true',ORDER_RECORDS_ENABLED:'true'};
 env.AUTH={fetch:(url,init)=>security.fetch(new Request(url,init),storage)};const context=await form(env);
 const preview=readFileSync('tests/fixtures/email-design-preview.jpg').toString('base64');
 const data={id:crypto.randomUUID(),createdAt:Math.floor(Date.now()/1000),referenceVersion:2,contact:{name:'Synthetic preview',email:'customer@example.invalid',phone:'0821234567'},locker:{name:'Synthetic locker',area:'Test'},consent:true,emailPreviewVersion:1,items:[{kind:'photo',qty:2,files:[{size:tile.length,sha256:await sha(tile)}],emailPreview:preview}]};
 const sent=[];const network=async(url,options)=>{if(url.includes('siteverify'))return Response.json({success:true,hostname:'customvibe.co.za',action:'order'});const mail=JSON.parse(options.body);sent.push({body:options.body,key:options.headers['Idempotency-Key'],owner:mail.to[0]==='hello@customvibe.co.za'});return !sent.at(-1).owner&&sent.filter(s=>!s.owner).length===1?new Response(null,{status:503}):Response.json({id:'accepted'});};
 const started=await submissions(post('/api/artwork/init',context,data),env,network);assert.equal(started.status,200);const {grant,resume}=await started.json();assert.ok(grant.length<=1024);assert.ok(resume.length<=1024);
 const upload=await submissions(new Request(origin+'/api/artwork/upload',{method:'POST',headers:{origin,cookie:context.cookie,'X-CSRF-Token':context.csrf,'Content-Type':'image/jpeg','X-Artwork-Grant':grant,'X-Artwork-Index':'0'},body:tile}),env,network);assert.equal(upload.status,200);
 const finish=()=>submissions(new Request(origin+'/api/order-request',{method:'POST',headers:{origin,cookie:context.cookie,'X-CSRF-Token':context.csrf,'CF-Connecting-IP':'192.0.2.7','Content-Type':'application/json'},body:JSON.stringify({payload:withShippingAgreement(data),grant,website:''})}),env,network);
 const first=await(await finish()).json();assert.equal(first.receiptSent,false);const retried=await(await finish()).json();assert.equal(retried.receiptSent,true);assert.equal(sent.filter(s=>s.owner).length,1);
 const receipts=sent.filter(s=>!s.owner);assert.equal(receipts.length,2);assert.equal(receipts[0].body,receipts[1].body);assert.equal(receipts[0].key,receipts[1].key);
 for(const {body} of sent){const mail=JSON.parse(body);assert.match(mail.html,/Design previews/);assert.equal(mail.attachments.find(a=>a.content_id==='cv-design-1').content,preview);assert.ok(Buffer.byteLength(body)<200000);}
 const saved=storage.sql.prepare('SELECT snapshot FROM orders').get().snapshot;assert.ok(!saved.includes(preview));assert.ok(!saved.includes('emailPreview'));assert.equal(storage.objects.size,1);assert.deepEqual([...storage.objects.values()][0],new Uint8Array(tile));
 const altered={...data,items:[{...data.items[0],emailPreview:preview.slice(0,-4)+'AAAA'}]};assert.equal((await submissions(post('/api/artwork/init',context,altered),env,network)).status,400);assert.equal(sent.length,3);
});
