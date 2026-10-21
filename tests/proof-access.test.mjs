import test from 'node:test';import assert from 'node:assert/strict';import {proofAPI} from '../server/proof-api.mjs';import {random,signToken} from '../server/auth.mjs';
const origin='https://customvibe.co.za';
test('retired public proof endpoints deny all token scopes, expired sessions and old capabilities before storage',async()=>{
 const secret=random(),now=Math.floor(Date.now()/1000),env={SESSION_SECRET:secret,AUTH:{fetch(){throw Error('Retired endpoints must not reach storage')}}};
 for(const scope of ['site','admin','proof'])for(const exp of [now-1,now+600]){
  const token=await signToken({scope,exp,jti:random(),csrf:random()},secret);
  for(const path of ['/api/proof/session','/api/proof','/api/proof/files/0','/api/proof/approve','/api/proof/changes']){
   const response=await proofAPI(new Request(origin+path,{method:'POST',headers:{origin,cookie:`__Host-cv-proof=${token}`},body:JSON.stringify({token:random(),confirmed:true,revision:1})}),env);
   assert.equal(response.status,410,path);assert.equal(response.headers.has('set-cookie'),false);assert.doesNotMatch(await response.text(),/contact|manifest|sha256|private@example/);
  }
 }
});
test('cross-origin and unknown capabilities cannot establish or mutate a customer session',async()=>{
 const env={AUTH:{fetch(){throw Error('No storage access')}}};
 for(const headers of [{origin:'https://evil.example'},{cookie:'__Host-cv-site=anything'},{}]){
  const response=await proofAPI(new Request(origin+'/api/proof/session',{method:'POST',headers,body:JSON.stringify({token:random()})}),env);
  assert.equal(response.status,410);assert.equal(response.headers.has('set-cookie'),false);
 }
});
