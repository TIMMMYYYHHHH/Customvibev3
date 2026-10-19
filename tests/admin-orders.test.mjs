import test from 'node:test';import assert from 'node:assert/strict';
import admin from '../admin/worker.mjs';import security from '../security/index.mjs';import {artworkEnv} from './helpers/artwork.mjs';import {random,signToken} from '../server/auth.mjs';
async function setup(){const env={...artworkEnv(),ADMIN_LOCKOUT:{get:async()=>null},ADMIN_PASSWORD_HASH:random(),ADMIN_PASSWORD_SALT:random(),ADMIN_SESSION_SECRET:random(),ASSETS:{fetch:async r=>new Response(new URL(r.url).pathname)}};env.AUTH={fetch:(url,init)=>security.fetch(new Request(url,init),env)};const csrf=random();const token=await signToken({scope:'admin',jti:random(),csrf,exp:Math.floor(Date.now()/1000)+1800},env.ADMIN_SESSION_SECRET);return {env,csrf,cookie:'__Host-cv-admin='+token};}
test('board API is private and cannot be changed across origins or without CSRF',async()=>{const {env,csrf,cookie}=await setup(),url='https://admin.customvibe.co.za/api/orders';assert.equal((await admin.fetch(new Request(url),env)).status,401);const list=await admin.fetch(new Request(url,{headers:{cookie}}),env);assert.equal(list.status,200);assert.match(list.headers.get('Cache-Control'),/no-store/);assert.deepEqual((await list.json()).orders,[]);for(const headers of [{cookie},{cookie,origin:'https://evil.example','X-CSRF-Token':csrf}]){assert.equal((await admin.fetch(new Request(url+'/'+crypto.randomUUID()+'/status',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:'{}'}),env)).status,403);}assert.equal((await admin.fetch(new Request('https://admin.customvibe.co.za/orders',{headers:{cookie}}),env)).status,200);});

test('preview and manual send keep the full admin authentication boundary',async()=>{const {env,csrf,cookie}=await setup(),id=crypto.randomUUID(),root='https://admin.customvibe.co.za/api/orders/'+id;for(const path of ['', '/preview','/send']){const r=await admin.fetch(new Request(root+path,{headers:{cookie:'__Host-cv-admin=invalid'}}),env);assert.equal(r.status,401);assert.match(r.headers.get('Cache-Control'),/no-store/)}const expired=await signToken({scope:'admin',jti:random(),csrf,exp:1},env.ADMIN_SESSION_SECRET);assert.equal((await admin.fetch(new Request(root,{headers:{cookie:'__Host-cv-admin='+expired}}),env)).status,401);const request=new Request('https://preview.invalid/api/orders/'+id+'/send',{method:'POST',headers:{cookie,origin:'https://preview.invalid','X-CSRF-Token':csrf,'Content-Type':'application/json'},body:JSON.stringify({version:0})});assert.equal((await admin.fetch(request,env)).status,403);});

test('admin sign-in exposes only fixed brand assets without issuing login cookies',async()=>{
 const {env}=await setup();
 for(const path of ['/favicon.png','/icon-180.png','/admin-brand/fonts.css','/admin-brand/fredoka.woff2','/admin-brand/dm-sans.woff2']){
  const r=await admin.fetch(new Request('https://admin.customvibe.co.za'+path,{headers:{'Sec-Fetch-Dest':'font'}}),env);
  assert.equal(r.status,200,path);assert.equal(r.headers.has('set-cookie'),false);
  assert.equal((await admin.fetch(new Request('https://admin.customvibe.co.za'+path,{method:'POST'}),env)).status,405);
 }
 for(const path of ['/admin-brand/private.json','/assets/app.js','/content.json','/api/orders','/api/artwork/11111111-1111-4111-8111-000000000001/0']){
  assert.equal((await admin.fetch(new Request('https://admin.customvibe.co.za'+path),env)).status,401,path);
 }
 const login=await admin.fetch(new Request('https://admin.customvibe.co.za/'),env);
 assert.equal(login.status,401);const html=await login.text();
 assert.match(html, /rel="icon"[^>]*href="\/favicon.png"/);
 assert.match(html, /href="\/admin-brand\/fonts.css"/);
});

test('search finds retained orders beyond the first page and paginates matching results only',async()=>{
 const {env,cookie}=await setup(),time=Math.floor(Date.now()/1000);
 const add=(n,name,status='new',expired=false,legacy)=>env.sql.prepare('INSERT INTO orders(id,fingerprint,snapshot,status,created,expires) VALUES (?,?,?,?,?,?)').run(`11111111-1111-4111-8111-${String(n).padStart(12,'0')}`,'a'.repeat(64),JSON.stringify({contact:{name,email:'private@example.com'},magnetQty:1,referenceVersion:legacy?1:2,...(legacy?{reference:legacy}:{})}),status,time,expired?time-1:time+1000);
 add(1,'Older target','shipped',false,'CV-OLD-REFERENCE');
 for(let n=2;n<=112;n++)add(n,n%2?'Matching customer':'Other customer');
 add(113,'Older target expired','shipped',true);
 const get=async query=>{const r=await admin.fetch(new Request('https://admin.customvibe.co.za/api/orders?'+query,{headers:{cookie}}),env);assert.equal(r.status,200);return r.json()};
 const baseline=await get('');assert.equal(baseline.orders.length,50);assert.ok(!baseline.orders.some(o=>o.reference==='CV-000001'));
 for(const q of ['OLDER TARGET','cv-000001','old-reference']){const result=await get('q='+encodeURIComponent(q));assert.deepEqual(result.orders.map(o=>o.reference),['CV-000001']);assert.equal(result.next,null);assert.equal(result.orders[0].snapshot.contact.email,undefined)}
 const first=await get('q=matching');assert.equal(first.orders.length,50);assert.equal(first.next,13);
 const last=await get('q=matching&before='+first.next);assert.deepEqual(last.orders.map(o=>o.reference),['CV-000011','CV-000009','CV-000007','CV-000005','CV-000003']);assert.equal(last.next,null);
 assert.deepEqual((await get('q=customer&stage=shipped')).orders,[]);
 assert.deepEqual((await get('stage=shipped')).orders.map(o=>o.reference),['CV-000001']);
 for(const q of ["%' OR 1=1 --",'_','not found'])assert.deepEqual((await get('q='+encodeURIComponent(q))).orders,[]);
 assert.equal((await get('q=%20%20')).orders.length,50);
 for(const query of ['q='+ 'x'.repeat(161),'stage=invalid'])assert.equal((await admin.fetch(new Request('https://admin.customvibe.co.za/api/orders?'+query,{headers:{cookie}}),env)).status,400);
 assert.equal((await admin.fetch(new Request('https://admin.customvibe.co.za/api/orders?q=target'),env)).status,401);
});

test('retry preview is a CSRF-protected POST and GET previews cannot rotate a prepared capability',async t=>{
 const {env,csrf,cookie}=await setup(),id=crypto.randomUUID(),origin='https://admin.customvibe.co.za',root=origin+'/api/orders/'+id;
 Object.assign(env,{ADMIN_SEND_ENABLED:'true',RESEND_API_KEY:'synthetic-only'});
 await env.AUTH.fetch('https://internal/orders/create',{method:'POST',body:JSON.stringify({id,fingerprint:'a'.repeat(64),snapshot:{contact:{name:'Synthetic',email:'synthetic@example.invalid',phone:'0000000'},locker:{name:'Synthetic',area:'Test'},items:[{kind:'photo',name:'Photo',qty:1,files:[]}],magnetQty:1,subtotalCents:100,paymentStatus:'unpaid'}})});
 let sends=0;t.mock.method(globalThis,'fetch',async()=>{sends++;return sends===1?Response.json({name:'validation_error',message:'Synthetic rejected sender'},{status:403}):Response.json({id:'synthetic-accepted'});});
 const headers={cookie,origin,'X-CSRF-Token':csrf,'Content-Type':'application/json'};
 const post=(path,body,custom=headers)=>admin.fetch(new Request(root+path,{method:'POST',headers:custom,body:JSON.stringify(body)}),env);
 assert.equal((await post('/send',{version:0})).status,503);
 const original=env.sql.prepare('SELECT * FROM order_update_attempts').get();
 const get=await admin.fetch(new Request(root+'/preview',{headers:{cookie,origin:'https://other.invalid','Sec-Fetch-Site':'cross-site'}}),env);
 assert.equal(get.status,200);assert.equal((await get.json()).retryToken,undefined);assert.deepEqual(env.sql.prepare('SELECT * FROM order_update_attempts').get(),original);
 for(const custom of [{...headers,origin:'https://other.invalid','Sec-Fetch-Site':'cross-site'},{cookie,origin,'Content-Type':'application/json'}]){assert.equal((await post('/preview-retry',{version:0},custom)).status,403);assert.deepEqual(env.sql.prepare('SELECT * FROM order_update_attempts').get(),original);}
 assert.equal((await post('/preview-retry',{version:0},{...headers,cookie:'__Host-cv-admin=invalid'})).status,401);
 const issued=await post('/preview-retry',{version:0});assert.equal(issued.status,200);const preview=await issued.json();assert.match(preview.retryToken,/^[a-f0-9]{64}$/);assert.ok(preview.retryAttempt);assert.equal(sends,1);
 const prepared=env.sql.prepare('SELECT * FROM order_update_attempts').get();assert.ok(prepared.preview_hash);
 const again=await admin.fetch(new Request(root+'/preview',{headers:{cookie}}),env);assert.equal((await again.json()).retryToken,undefined);assert.deepEqual(env.sql.prepare('SELECT * FROM order_update_attempts').get(),prepared);
 assert.equal((await post('/preview-retry',{version:99})).status,409);assert.deepEqual(env.sql.prepare('SELECT * FROM order_update_attempts').get(),prepared);
 const outcomes=await Promise.all([post('/send',{version:0,retryAttempt:preview.retryAttempt,retryToken:preview.retryToken}),post('/send',{version:0,retryAttempt:preview.retryAttempt,retryToken:preview.retryToken})]);assert.equal(outcomes.filter(r=>r.status===200).length,1);assert.equal(sends,2);assert.equal(env.sql.prepare('SELECT count(*) n FROM order_update_attempts').get().n,2);
});
