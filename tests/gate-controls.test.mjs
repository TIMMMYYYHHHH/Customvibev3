import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gate,hashPassword,verifyToken} from '../server/auth.mjs';
import {gateButtonTokens} from '../server/button-styles.mjs';

// This catches server presentation values drifting away from the approved shared palette.
test('server-only gate tokens stay linked to the canonical action tokens',async()=>{
 const canonical=await readFile(new URL('../src/button-tokens.css',import.meta.url),'utf8');
 for(const name of ['cv-action','cv-action-hover','cv-radius']){
  const value=source=>source.match(new RegExp(`--${name}:\\s*([^;}]+)`))?.[1].trim();
  assert.ok(value(canonical),name);assert.equal(value(gateButtonTokens),value(canonical),name);
 }
});

for(const scope of ['site','admin'])test(`${scope}: styled gate preserves password rejection, CSRF, return and session lifetime`,async()=>{
 const salt='a'.repeat(64),secret='b'.repeat(64),password='synthetic-local-test';
 const hash=await hashPassword(password,salt),origin=scope==='admin'?'https://admin.customvibe.co.za':'https://customvibe.co.za';
 const env={SITE_PASSWORD_HASH:hash,SITE_PASSWORD_SALT:salt,SESSION_SECRET:secret,ADMIN_PASSWORD_HASH:hash,ADMIN_PASSWORD_SALT:salt,ADMIN_SESSION_SECRET:secret,AUTH:{fetch:async()=>Response.json({allowed:true,revoked:false})}};
 const request=(path,init={})=>new Request(origin+path,{...init,headers:{origin,'CF-Connecting-IP':'192.0.2.15',...init.headers}});
 const first=(await gate(request('/auth/login'),env,scope)).response,html=await first.text(),csrf=html.match(/name="csrf" value="([^"]+)"/)[1],cookie=first.headers.get('set-cookie').split(';')[0];
 const post=(token,value)=>gate(request('/auth/login',{method:'POST',headers:{cookie},body:new URLSearchParams({csrf:token,password:value,next:'/content'})}),env,scope);
 assert.equal((await post('invalid',password)).response.status,403);
 const invalid=(await post(csrf,'wrong')).response;assert.equal(invalid.status,401);assert.equal(invalid.headers.has('set-cookie'),false);assert.match(await invalid.text(),/role="alert">The password was not accepted\./);
 const now=Math.floor(Date.now()/1000),response=(await post(csrf,password)).response,issued=response.headers.get('set-cookie');
 assert.equal(response.status,303);assert.equal(response.headers.get('location'),scope==='admin'?'/content':'/');
 const ttl=scope==='admin'?1800:28800;assert.ok(issued.includes(`Max-Age=${ttl}; HttpOnly; Secure; SameSite=Lax`));
 const session=await verifyToken(issued.split(';')[0].split('=')[1],secret,scope);assert.ok(session.exp>=now+ttl&&session.exp<=now+ttl+2);
});
