import test from 'node:test';import assert from 'node:assert/strict';
import {artworkEnv,tile,sha} from './helpers/artwork.mjs';
import {submissions} from '../server/submissions.mjs';import security from '../security/index.mjs';import admin from '../admin/worker.mjs';
import {defaultContent} from '../src/content/model.mjs';import {random,signToken} from '../server/auth.mjs';
const tileHash=await sha(tile);
const origin='https://customvibe.co.za';
function setup(){const storage={...artworkEnv(),ADMIN_LOCKOUT:{get:async()=>null},SITE_LOCKOUT:{get:async()=>null}};return {...storage,SITE_GATE_ENABLED:'true',SUBMISSIONS_ENABLED:'true',ARTWORK_STORAGE_ENABLED:'true',RESEND_API_KEY:'test',TURNSTILE_SECRET_KEY:'test',TURNSTILE_SITE_KEY:'test',SESSION_SECRET:random(),AUTH:{fetch:(url,init)=>security.fetch(new Request(url,init),storage)},CATALOGUE:{fetch:async()=>Response.json(defaultContent)}}}
async function form(env){const r=await submissions(new Request(origin+'/api/forms'),env);return {...await r.json(),cookie:r.headers.get('set-cookie').split(';')[0]}}
const payload=()=>({id:crypto.randomUUID(),createdAt:Math.floor(Date.now()/1000),contact:{name:'Test',email:'customer@example.com',phone:'0821234567'},locker:{name:'Test locker',area:'Durban'},consent:true,items:[{kind:'puzzle',qty:1,gridSize:3,files:Array.from({length:10},()=>({size:tile.length,sha256:tileHash}))}]});
function post(path,c,body,headers={}){return new Request(origin+path,{method:'POST',headers:{origin,cookie:c.cookie,'X-CSRF-Token':c.csrf,'CF-Connecting-IP':'192.0.2.1','Content-Type':'application/json',...headers},body:typeof body==='string'||body instanceof Uint8Array?body:JSON.stringify(body)})}
test('private puzzle submission requires verified uploads, keeps customer artwork out of attachments and retries safely',async()=>{
 const env=setup(),c=await form(env),data=payload(),mails=[];assert.equal(c.artworkStorage,true);
 const network=async(url,init)=>{if(url.includes('siteverify'))return Response.json({success:true,hostname:'customvibe.co.za',action:'order'});mails.push(JSON.parse(init.body));return Response.json({id:'accepted'})};
 const initial=await submissions(post('/api/artwork/init',c,{payload:data,turnstile:'test'}),env,network);assert.equal(initial.status,200);const {grant}=await initial.json();assert.ok(grant);
 const final=()=>submissions(post('/api/order-request',c,{payload:data,grant}),env,network);
 assert.equal((await final()).status,409);assert.equal(mails.length,0);
 const other=await form(env);
 assert.equal((await submissions(post('/api/artwork/upload',other,tile,{'Content-Type':'image/jpeg','X-Artwork-Grant':grant,'X-Artwork-Index':'0'}),env,network)).status,403);
 for(let i=0;i<10;i++)assert.equal((await submissions(post('/api/artwork/upload',c,tile,{'Content-Type':'image/jpeg','X-Artwork-Grant':grant,'X-Artwork-Index':String(i)}),env,network)).status,200);
 assert.equal((await final()).status,200);assert.equal((await final()).status,200);assert.equal(mails.length,2);assert.ok(mails[0].attachments.every(a=>a.content_id&&a.filename.startsWith('customvibe-')));assert.match(mails[0].text,new RegExp('https://admin.customvibe.co.za/artwork\\?request='+data.id));assert.match(mails[1].text,/No payment/);assert.equal(mails[1].reply_to,'orders@customvibe.co.za');assert.equal(env.objects.size,10);
 assert.equal((await submissions(post('/api/order-request',c,{payload:{...data,items:[{...data.items[0],qty:2}]},grant}),env,network)).status,403);
});
test('private init rejects preview, missing challenge, cross-origin and disabled sending before storage',async()=>{
 const env=setup(),c=await form(env),data=payload();let calls=0;const network=async()=>{calls++;return Response.json({success:false})};
 assert.equal((await submissions(post('/api/artwork/init',c,{payload:data}),env,network)).status,400);
 assert.equal((await submissions(post('/api/artwork/init',c,{payload:data,turnstile:'bad'}),env,network)).status,403);
 assert.equal((await submissions(post('/api/artwork/init',c,{payload:data,turnstile:'bad'},{origin:'https://evil.example'}),env,network)).status,403);
 env.SUBMISSIONS_ENABLED='false';assert.equal((await submissions(post('/api/artwork/init',c,{payload:data,turnstile:'test'}),env,network)).status,503);
 assert.equal(env.objects.size,0);assert.equal(calls,1);
});
test('admin downloads require separate admin sign-in and never expose unfinished files',async()=>{
 const env=setup();env.ADMIN_PASSWORD_HASH=random();env.ADMIN_PASSWORD_SALT=random();env.ADMIN_SESSION_SECRET=env.SESSION_SECRET;env.ASSETS={fetch:async()=>new Response('assets')};
 const id=crypto.randomUUID(),url='https://admin.customvibe.co.za/api/artwork/'+id;
 const anonymous=await admin.fetch(new Request(url),env);assert.notEqual(anonymous.status,200);
 const token=await signToken({scope:'admin',jti:random(),csrf:random(),exp:Math.floor(Date.now()/1000)+3600},env.SESSION_SECRET);
 const r=await admin.fetch(new Request(url,{headers:{cookie:'__Host-cv-admin='+token}}),env);assert.equal(r.status,404);assert.match(r.headers.get('Cache-Control'),/no-store/);
});
test('a retained private request resumes after form-session expiry only with its signed resume token',async()=>{
 const env=setup(),c=await form(env),data=payload();const network=async()=>Response.json({success:true,hostname:'customvibe.co.za',action:'order'});
 const first=await (await submissions(post('/api/artwork/init',c,{payload:data,turnstile:'test'}),env,network)).json();assert.ok(first.resume);
 const realNow=Date.now,now=Date.now();try{Date.now=()=>now+3601000;const fresh=await form(env);
  assert.equal((await submissions(post('/api/artwork/init',fresh,{payload:data,turnstile:'test'}),env,network)).status,403);
  const resumed=await submissions(post('/api/artwork/init',fresh,{payload:data,turnstile:'test',resume:first.resume}),env,network);assert.equal(resumed.status,200);
  const {grant}=await resumed.json();assert.equal((await submissions(post('/api/artwork/upload',fresh,tile,{'Content-Type':'image/jpeg','X-Artwork-Grant':grant,'X-Artwork-Index':'0'}),env,network)).status,200);
  assert.equal((await submissions(post('/api/artwork/init',fresh,{payload:{...data,contact:{...data.contact,email:'changed@example.com'}},turnstile:'test',resume:first.resume}),env,network)).status,403);
 }finally{Date.now=realNow;}
});
test('authenticated admin can retrieve finalized artwork bytes, while a site cookie cannot',async()=>{
 const env=setup(),c=await form(env),data=payload();env.ADMIN_PASSWORD_HASH=random();env.ADMIN_PASSWORD_SALT=random();env.ADMIN_SESSION_SECRET=random();env.ASSETS={fetch:async r=>new Response(new URL(r.url).pathname)};
 const network=async url=>Response.json(url.includes('siteverify')?{success:true,hostname:'customvibe.co.za',action:'order'}:{id:'accepted'});
 const {grant}=await (await submissions(post('/api/artwork/init',c,{payload:data,turnstile:'test'}),env,network)).json();
 for(let i=0;i<10;i++)await submissions(post('/api/artwork/upload',c,tile,{'Content-Type':'image/jpeg','X-Artwork-Grant':grant,'X-Artwork-Index':String(i)}),env,network);
 await submissions(post('/api/order-request',c,{payload:data,grant}),env,network);
 const token=await signToken({scope:'admin',jti:random(),csrf:random(),exp:Math.floor(Date.now()/1000)+3600},env.ADMIN_SESSION_SECRET),cookie='__Host-cv-admin='+token;
 const request=path=>new Request('https://admin.customvibe.co.za'+path,{headers:{cookie}});
 const detail=await admin.fetch(request('/api/artwork/'+data.id),env);assert.equal(detail.status,200);assert.equal((await detail.json()).files.length,10);
 const download=await admin.fetch(request('/api/artwork/'+data.id+'/1'),env);assert.equal(download.status,200);assert.deepEqual(Buffer.from(await download.arrayBuffer()),tile);assert.match(download.headers.get('Content-Disposition'),/row-1-col-1/);
 assert.equal(await (await admin.fetch(request('/artwork'),env)).text(),'/');
 const wrong=await admin.fetch(new Request('https://admin.customvibe.co.za/api/artwork/'+data.id+'/1',{headers:{cookie:c.cookie}}),env);assert.equal(wrong.status,401);
});
test('new board captures one mixed order before mail and keeps quantities on retry',async()=>{
 const env=setup();env.ORDER_RECORDS_ENABLED='true';const c=await form(env),data=payload();data.items.unshift({kind:'photo',qty:2,files:[{size:tile.length,sha256:tileHash}]});let sends=0;
 const network=async(url)=>{if(url.includes('siteverify'))return Response.json({success:true,hostname:'customvibe.co.za',action:'order'});assert.equal(env.sql.prepare('SELECT count(*) AS n FROM orders').get().n,1);sends++;return Response.json({id:'accepted'});};
 const {grant}=await(await submissions(post('/api/artwork/init',c,{payload:data,turnstile:'test'}),env,network)).json();
 for(let i=0;i<11;i++)await submissions(post('/api/artwork/upload',c,tile,{'Content-Type':'image/jpeg','X-Artwork-Grant':grant,'X-Artwork-Index':String(i)}),env,network);
 for(let i=0;i<2;i++)assert.equal((await submissions(post('/api/order-request',c,{payload:data,grant}),env,network)).status,200);
 const r=env.sql.prepare('SELECT * FROM orders').get();assert.ok(r);const s=JSON.parse(r.snapshot);assert.equal(s.magnetQty,11);assert.deepEqual(s.items.map(i=>i.qty),[2,1]);assert.equal(s.items.flatMap(i=>i.files).length,11);assert.equal(r.owner_sent,1);assert.equal(r.receipt_sent,1);assert.equal(sends,2);
});

test('pre-dashboard artwork grants and recovery tokens survive added price snapshots',async()=>{
 const {validateOrder}=await import('../server/submission-model.mjs');const {initArtwork,verifyArtworkGrant}=await import('../server/artwork-api.mjs');const env=setup(),data=payload(),order=validateOrder(data,defaultContent,true),legacy={...order,items:order.items.map(({lineCents,...i})=>i)};const session={jti:random(),csrf:random(),exp:Math.floor(Date.now()/1000)+3600};
 const oldHash=Buffer.from(await crypto.subtle.sign('HMAC',await crypto.subtle.importKey('raw',new TextEncoder().encode(env.SESSION_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']),new TextEncoder().encode(JSON.stringify(legacy)))).toString('hex');
 const first=await(await initArtwork(env,session,legacy,'192.0.2.1')).json();
 const {verifyToken}=await import('../server/auth.mjs');const claims=await verifyToken(first.grant,env.SESSION_SECRET,'artwork');
 const oldGrant=await signToken({...claims,hash:oldHash},env.SESSION_SECRET);assert.ok(await verifyArtworkGrant(oldGrant,env,session,order));
 const recovery=await verifyToken(first.resume,env.SESSION_SECRET,'artwork-resume');const oldResume=await signToken({...recovery,hash:oldHash},env.SESSION_SECRET);
 const fresh={...session,jti:random(),csrf:random()};assert.equal((await initArtwork(env,fresh,order,'192.0.2.1',oldResume)).status,200);
});

test('31 photo designs complete the private order flow and retain all saved entries',async()=>{
 const env=setup();env.ORDER_RECORDS_ENABLED='true';const c=await form(env),data=payload();data.referenceVersion=2;
 data.items=Array.from({length:31},()=>({kind:'photo',qty:1,files:[{size:tile.length,sha256:tileHash}]}));
 const mails=[],network=async(url,init)=>{if(url.includes('siteverify'))return Response.json({success:true,hostname:'customvibe.co.za',action:'order'});mails.push(JSON.parse(init.body));return Response.json({id:'accepted'});};
 const initial=await submissions(post('/api/artwork/init',c,{payload:data,turnstile:'test'}),env,network);assert.equal(initial.status,200);const {grant}=await initial.json();
 for(let i=0;i<31;i++)assert.equal((await submissions(post('/api/artwork/upload',c,tile,{'Content-Type':'image/jpeg','X-Artwork-Grant':grant,'X-Artwork-Index':String(i)}),env,network)).status,200);
 assert.equal((await submissions(post('/api/order-request',c,{payload:data,grant}),env,network)).status,200);
 const stored=await(await env.AUTH.fetch('https://internal/orders/detail',{method:'POST',body:JSON.stringify({id:data.id})})).json();assert.equal(stored.snapshot.items.length,31);assert.equal(stored.snapshot.magnetQty,31);assert.equal(mails.length,2);assert.equal(env.objects.size,31);
});
test('private order requests retain the exact 150000-byte body limit before provider or storage work',async()=>{
 const env=setup(),c=await form(env),raw=JSON.stringify({payload:payload(),turnstile:'test'});let calls=0;
 const network=async()=>{calls++;return Response.json({success:true,hostname:'customvibe.co.za',action:'order'})};
 const body=raw.padEnd(150000,' ');assert.equal((await submissions(post('/api/artwork/init',c,body),env,network)).status,200);assert.equal(calls,1);
 assert.equal((await submissions(post('/api/artwork/init',c,body+' '),env,network)).status,400);assert.equal(calls,1);
});
test('oversized saved order details reject before reserving artwork or sending mail',async()=>{
 const env=setup();env.ORDER_RECORDS_ENABLED='true';const c=await form(env),data=payload(),catalogue=structuredClone(defaultContent);
 const pack=catalogue.products.find(p=>p.id==='alphabet');pack.status='available';pack.pricingMode='fixed';pack.priceCents=10000;pack.name='A'.repeat(200);env.CATALOGUE={fetch:async()=>Response.json(catalogue)};
 data.items=Array.from({length:150},()=>({kind:'alphabet',qty:1,files:[]}));data.items.push({kind:'photo',qty:1,files:[{size:tile.length,sha256:tileHash}]});
 let storageCalls=0;const auth=env.AUTH;env.AUTH={fetch:async(...args)=>{storageCalls++;return auth.fetch(...args)}};
 const network=async url=>{assert.ok(url.includes('siteverify'));return Response.json({success:true,hostname:'customvibe.co.za',action:'order'})};
 assert.equal((await submissions(post('/api/artwork/init',c,{payload:data,turnstile:'test'}),env,network)).status,400);assert.equal(storageCalls,0);assert.equal(env.objects.size,0);
});

test('artwork after 100 file-free entries keeps its matching design number',async()=>{
 const env=setup();env.ORDER_RECORDS_ENABLED='true';const c=await form(env),data=payload(),catalogue=structuredClone(defaultContent);
 const pack=catalogue.products.find(p=>p.id==='alphabet');pack.status='available';pack.pricingMode='fixed';pack.priceCents=10000;env.CATALOGUE={fetch:async()=>Response.json(catalogue)};
 data.items=Array.from({length:100},()=>({kind:'alphabet',qty:1,files:[]}));data.items.push({kind:'photo',qty:1,files:[{size:tile.length,sha256:tileHash}]});
 const network=async()=>Response.json({success:true,hostname:'customvibe.co.za',action:'order'});
 const initial=await submissions(post('/api/artwork/init',c,{payload:data,turnstile:'test'}),env,network);assert.equal(initial.status,200);
 const row=env.sql.prepare('SELECT manifest FROM artwork_requests WHERE id=?').get(data.id);assert.equal(JSON.parse(row.manifest)[0].name,'design-101-photo.jpg');
});
test('selected locker is validated once and signed recovery survives directory outages without duplicate orders',async()=>{
 const env={...setup(),ORDER_RECORDS_ENABLED:'true',LOCKER_LOOKUP_ENABLED:'true',TCG_LOCKER_API_KEY:random()},c=await form(env),data=payload();data.locker={id:'CG123',name:'Example locker',area:'Durban North'};let lookups=0,sends=0;
 assert.equal(c.lockerSearch,true);
 const source=async()=>{lookups++;return {locations:[data.locker]}};
 const offline=async()=>{throw Error('Directory is offline')};
 const network=async(url,init)=>{if(url.includes('siteverify'))return Response.json({success:true,hostname:'customvibe.co.za',action:'order'});sends++;assert.match(JSON.parse(init.body).text,/CG123/);return Response.json({id:'accepted'})};
 const invalid=await submissions(post('/api/artwork/init',c,{payload:{...data,locker:{...data.locker,id:'BAD'}},turnstile:'test'}),env,network,source);assert.equal(invalid.status,400);assert.equal(env.sql.prepare('SELECT count(*) AS n FROM artwork_requests').get().n,0);
 const first=await(await submissions(post('/api/artwork/init',c,{payload:data,turnstile:'test'}),env,network,source)).json();assert.ok(first.grant);assert.equal(lookups,2);
 const fresh=await form(env);
 assert.equal((await submissions(post('/api/artwork/init',fresh,{payload:data,turnstile:'test',resume:'forged'}),env,network,offline)).status,403);
 assert.equal((await submissions(post('/api/artwork/init',fresh,{payload:{...data,locker:{...data.locker,name:'Changed'}},turnstile:'test',resume:first.resume}),env,network,offline)).status,403);
 const resumed=await submissions(post('/api/artwork/init',fresh,{payload:data,turnstile:'test',resume:first.resume}),env,network,offline);assert.equal(resumed.status,200);const {grant}=await resumed.json();
 assert.equal((await submissions(post('/api/order-request',fresh,{payload:data,grant:'forged'}),env,network,offline)).status,403);
 for(let i=0;i<10;i++)assert.equal((await submissions(post('/api/artwork/upload',fresh,tile,{'Content-Type':'image/jpeg','X-Artwork-Grant':grant,'X-Artwork-Index':String(i)}),env,network)).status,200);
 assert.equal((await submissions(post('/api/order-request',fresh,{payload:{...data,locker:{...data.locker,area:'Changed'}},grant}),env,network,offline)).status,403);
 for(let i=0;i<2;i++)assert.equal((await submissions(post('/api/order-request',fresh,{payload:data,grant}),env,network,offline)).status,200);
 assert.equal(sends,2);const rows=env.sql.prepare('SELECT snapshot FROM orders').all();assert.equal(rows.length,1);assert.deepEqual(JSON.parse(rows[0].snapshot).locker,{...data.locker,provider:'tcg-locker'});
});
