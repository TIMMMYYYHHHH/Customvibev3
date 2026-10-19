import test from 'node:test';import assert from 'node:assert/strict';
import worker from '../admin/worker.mjs';
import {validateStoredContent} from '../server/content.mjs';
import {defaultContent} from '../src/content/model.mjs';
import {onRequest} from '../functions/_middleware.js';
test('admin assets and API fail closed without configuration',async()=>{for(const p of ['/','/assets/app.js','/content.json','/api/content','/api/session'])assert.equal((await worker.fetch(new Request('https://admin.customvibe.co.za'+p),{})).status,503)});
test('public never forwards admin routes or write APIs even with site gate off',async()=>{for(const p of ['/admin','/api/content','/internal/content','/server/auth.mjs','/.env','/backup.sql']){const r=await onRequest({request:new Request('https://customvibe.co.za'+p),env:{SITE_GATE_ENABLED:'false'},next:()=>{throw Error('Must not reach assets')}});assert.equal(r.status,404)}});
test('server rejects external images, traversal, spoofed image bytes and excessive payload',()=>{for(const image of ['https://attacker.invalid/a.png','/assets/../secret','data:image/png;base64,PGh0bWw+','data:image/svg+xml;base64,AAAA']){const c=structuredClone(defaultContent);c.images.logo=image;assert.throws(()=>validateStoredContent(c))}assert.doesNotThrow(()=>validateStoredContent(structuredClone(defaultContent)))});

test('legacy URLs redirect within middleware without exposing content or following an external target',async()=>{for(const [path,target] of [['/design','/studio'],['/quote.html','/checkout'],['/privacy.html','/privacy'],['/products/photos/index.html','/products/photos']]){const r=await onRequest({request:new Request('https://customvibe.co.za'+path+'?next=https://example.invalid'),env:{SITE_GATE_ENABLED:'false'}});assert.equal(r.status,301);assert.equal(new URL(r.headers.get('location')).pathname,target);assert.equal(new URL(r.headers.get('location')).hostname,'customvibe.co.za')}});

test('authenticated preview composes host-specific route CSS after auth without changing policy or response semantics',async()=>{
 const {random,signToken}=await import('../server/auth.mjs');const {readFile}=await import('node:fs/promises');
 const secret=random(),csrf=random(),token=await signToken({scope:'admin',csrf,jti:random(),exp:Math.floor(Date.now()/1000)+600},secret);
 const html=await readFile('dist/admin/preview.html','utf8');let calls=0;
 const env={ADMIN_PASSWORD_HASH:random(),ADMIN_PASSWORD_SALT:random(),ADMIN_SESSION_SECRET:secret,AUTH:{fetch:async()=>Response.json({revoked:false})},ASSETS:{fetch:async()=>{calls++;return new Response(html,{headers:{'Content-Type':'text/html','ETag':'old','Content-Length':String(html.length),'X-Fixture':'kept'}})}}};
 const request=(path,method='GET',auth=true)=>new Request('https://admin.customvibe.co.za'+path,{method,headers:auth?{cookie:'__Host-cv-admin='+token}:{}});
 assert.equal((await worker.fetch(request('/preview?page=%2Fcheckout','GET',false),env)).status,401);assert.equal(calls,0);
 for(const path of ['/preview?page=%2Fcheckout&at=2028-02-29T12%3A30','/preview.html?page=%2Fcheckout']){
  const r=await worker.fetch(request(path),env);assert.equal(r.status,200);const body=await r.text();assert.match(body,/<link[^>]+data-cv-route-style="checkout"/);
  assert.equal(r.headers.get('etag'),null);assert.equal(r.headers.get('content-length'),null);assert.equal(r.headers.get('x-fixture'),'kept');
  assert.equal(r.headers.get('x-frame-options'),'SAMEORIGIN');assert.match(r.headers.get('content-security-policy'),/form-action 'none'/);assert.match(r.headers.get('content-security-policy'),/frame-ancestors 'self'/);
 }
 for(const path of ['/preview?page=%2F','/preview?page=https%3A%2F%2Fevil.invalid%2Fcheckout'])assert.doesNotMatch(await(await worker.fetch(request(path),env)).text(),/<link[^>]+data-cv-route-style=/);
 assert.equal(await(await worker.fetch(request('/preview?page=%2Fcheckout','HEAD'),env)).text(),'');
 env.ASSETS.fetch=async()=>new Response('missing',{status:404,headers:{'Content-Type':'text/plain'}});
 const missing=await worker.fetch(request('/preview?page=%2Fcheckout'),env);assert.equal(missing.status,404);assert.equal(await missing.text(),'missing');
});
