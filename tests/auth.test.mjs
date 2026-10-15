import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {gate,hashPassword,signToken,verifyToken} from '../server/auth.mjs';
const random=()=>Buffer.from(webcrypto.getRandomValues(new Uint8Array(32))).toString('hex');
const secret=random(),salt=random();const password=random();
const env={SITE_PASSWORD_HASH:await hashPassword(password,salt),SITE_PASSWORD_SALT:salt,SESSION_SECRET:secret};
function services(){const count=new Map(),revoked=new Set();return {fetch:async(req,init)=>{const p=new URL(typeof req==='string'?req:req.url).pathname;const b=JSON.parse(init?.body||'{}');if(p==='/reserve'){const n=(count.get(b.key)||0)+1;count.set(b.key,n);return Response.json({allowed:n<=5})}if(p==='/revoke')revoked.add(b.jti);return Response.json({revoked:revoked.has(b.jti)})}}}
function request(path='/',options={}){return new Request('https://customvibe.co.za'+path,{...options,headers:{'CF-Connecting-IP':'192.0.2.1',...options.headers}})}
test('missing gate configuration fails closed for content and assets',async()=>{for(const path of ['/','/assets/a.js','/content.json','/sitemap.xml'])assert.equal((await gate(request(path),{},'site')).response.status,503)});
test('robots remains public and disallows crawling while gated',async()=>{const r=(await gate(request('/robots.txt'),{},'site')).response;assert.equal(r.status,200);assert.match(await r.text(),/Disallow: \/\n/)});
test('explicit false disables site gate but never admin auth',async()=>{assert.equal((await gate(request(),{SITE_GATE_ENABLED:'false'},'site')).response,null);assert.equal((await gate(request(),{SITE_GATE_ENABLED:'false'},'admin')).response.status,503)});
test('HMAC tokens reject tampering, wrong scope, expiry and wrong secret',async()=>{const claims={scope:'site',exp:Math.floor(Date.now()/1000)+60,jti:random(),csrf:random()};const token=await signToken(claims,secret);assert.deepEqual(await verifyToken(token,secret,'site'),claims);for(const [t,s,scope] of [[token+'x',secret,'site'],[token,random(),'site'],[token,secret,'admin']])assert.equal(await verifyToken(t,s,scope),null);assert.equal(await verifyToken(await signToken({...claims,exp:1},secret),secret,'site'),null)});
test('login requires same origin, issues secure cookie and session can be revoked',async()=>{const e={...env,AUTH:services()};const first=(await gate(request('/auth/login'),e,'site')).response;const html=await first.text();const csrf=html.match(/name="csrf" value="([^"]+)"/)[1];const pre=first.headers.get('set-cookie').split(';')[0];const form=new URLSearchParams({password,csrf});assert.equal((await gate(request('/auth/login',{method:'POST',body:form,headers:{cookie:pre,origin:'https://attacker.invalid'}}),e,'site')).response.status,403);const r=(await gate(request('/auth/login',{method:'POST',body:form,headers:{cookie:pre,origin:'https://customvibe.co.za'}}),e,'site')).response;assert.equal(r.status,303);assert.match(r.headers.get('set-cookie'),/HttpOnly; Secure; SameSite=Lax/);const cookie=r.headers.get('set-cookie').split(';')[0];const logged=await gate(request('/',{headers:{cookie}}),e,'site');assert.equal(logged.response,null);assert.equal((await gate(request('/auth/logout',{method:'POST',body:new URLSearchParams({csrf:logged.session.csrf}),headers:{cookie,origin:'https://customvibe.co.za'}}),e,'site')).response.status,303);assert.equal((await gate(request('/',{headers:{cookie}}),e,'site')).response.status,401)});
test('sixth login attempt is blocked before password hashing',async()=>{const e={...env,AUTH:services()};const first=(await gate(request(),e,'site')).response;const csrf=(await first.text()).match(/name="csrf" value="([^"]+)"/)[1];const cookie=first.headers.get('set-cookie').split(';')[0];let r;for(let i=0;i<6;i++)r=(await gate(request('/auth/login',{method:'POST',body:new URLSearchParams({password:random(),csrf}),headers:{cookie,origin:'https://customvibe.co.za'}}),e,'site')).response;assert.equal(r.status,429)});

for(const scope of ['site','admin']){
 const origin=scope==='admin'?'https://admin.customvibe.co.za':'https://customvibe.co.za';
 const makeRequest=(path,options={})=>new Request(origin+path,{...options,headers:{'CF-Connecting-IP':'192.0.2.1',...options.headers}});
 const environment=()=>({...env,ADMIN_PASSWORD_HASH:env.SITE_PASSWORD_HASH,ADMIN_PASSWORD_SALT:salt,ADMIN_SESSION_SECRET:secret,AUTH:services()});
 test(`${scope}: background icon requests and a second tab do not invalidate an open login form`,async()=>{
  const e=environment();
  const first=(await gate(makeRequest('/'),e,scope)).response;
  const csrf=(await first.text()).match(/name="csrf" value="([^"]+)"/)[1];
  let cookie=first.headers.get('set-cookie').split(';')[0];
  for(const path of ['/favicon.ico','/auth/login']){
   const next=(await gate(makeRequest(path,{headers:{cookie}}),e,scope)).response;
   const replacement=next.headers.get('set-cookie');
   if(replacement)cookie=replacement.split(';')[0];
  }
  const login=(await gate(makeRequest('/auth/login',{method:'POST',headers:{cookie,origin},body:new URLSearchParams({password,csrf})}),e,scope)).response;
  assert.equal(login.status,303);
 });
 test(`${scope}: background resources cannot issue a competing login cookie`,async()=>{
  for(const destination of ['image','script','style','empty']){
   const r=(await gate(makeRequest('/favicon.ico',{headers:{'Sec-Fetch-Dest':destination}}),environment(),scope)).response;
   assert.equal(r.status,401);
   assert.equal(r.headers.has('set-cookie'),false);
  }
 });
 test(`${scope}: a mismatched login token is still forbidden`,async()=>{
  const e=environment();const first=(await gate(makeRequest('/'),e,scope)).response;
  const cookie=first.headers.get('set-cookie').split(';')[0];
  const r=(await gate(makeRequest('/auth/login',{method:'POST',headers:{cookie,origin},body:new URLSearchParams({password,csrf:random()})}),e,scope)).response;
  assert.equal(r.status,403);
 });
}

test('admin login preserves only safe order/artwork return links',async()=>{
 const e={...env,ADMIN_PASSWORD_HASH:env.SITE_PASSWORD_HASH,ADMIN_PASSWORD_SALT:salt,ADMIN_SESSION_SECRET:secret,AUTH:services()};
 const origin='https://admin.customvibe.co.za';
 const id=crypto.randomUUID(),path='/orders?order='+id;
 const first=(await gate(new Request(origin+path),e,'admin')).response;
 const html=await first.text(),csrf=html.match(/name="csrf" value="([^"]+)"/)[1],cookie=first.headers.get('set-cookie').split(';')[0];
 assert.ok(html.includes('name="next" value="'+path+'"'));
 for(const [next,expected] of [[path,path],['/artwork?request='+id,'/artwork?request='+id],['//evil.invalid','/'],['/orders?order='+id+'&evil=1','/'],['https://evil.invalid','/']]){
  const r=(await gate(new Request(origin+'/auth/login',{method:'POST',headers:{cookie,origin,'CF-Connecting-IP':'192.0.2.1'},body:new URLSearchParams({password,csrf,next})}),e,'admin')).response;
  assert.equal(r.status,303);assert.equal(r.headers.get('location'),expected);
 }
});
