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
