import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import * as target from '../scripts/cloudflare-target.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
for(const [script,args] of [['set-email.mjs',['email']],['set-password.mjs',['site','customvibe-business']]]){
 test(`${script} rejects the personal account before credential input`,()=>{
  const result=spawnSync(process.execPath,[`scripts/${script}`,...args],{cwd:root,env:{PATH:process.env.PATH,CLOUDFLARE_ACCOUNT_ID:'32f76ae0716c90e27b7d012f58e9698c'},encoding:'utf8'});
  assert.equal(result.status,1);
  assert.match(result.stderr,/destination account/i);
  assert.doesNotMatch(result.stderr,/New password|RESEND_API_KEY \(hidden\)/);
 });
}

const account='4f57d4e924674cb87b33d4c884745cf6';
const env={CLOUDFLARE_ACCOUNT_ID:account};
const config={account_id:account,name:'customvibe-business'};
const protectedEnvironment=()=>({fail_open:false,env_vars:{SITE_GATE_ENABLED:{type:'plain_text',value:'true'},SUBMISSIONS_ENABLED:{type:'plain_text',value:'false'}}});
const projectResult=()=>({name:'customvibe-business',deployment_configs:{production:protectedEnvironment(),preview:protectedEnvironment()}});
async function verify(options={}){
 assert.equal(typeof target.verifyTarget,'function','Live destination verification must exist');
 return target.verifyTarget({scope:'site',project:'customvibe-business',env,config,request:async(path)=>({success:true,result:path.endsWith(account)?{id:account}:projectResult()}),...options});
}
test('missing account or a source config stops before network access',async()=>{
 for(const options of [{env:{}},{config:{...config,account_id:'32f76ae0716c90e27b7d012f58e9698c'}}]){
  let calls=0;
  await assert.rejects(verify({...options,request:async()=>{calls++;throw Error('Unexpected network')}}),/destination account/);
  assert.equal(calls,0);
 }
});
test('an unapproved project name stops before network access',async()=>{
 let calls=0;
 await assert.rejects(verify({project:'customvibe-public',request:async()=>{calls++}}),/resource/);
 assert.equal(calls,0);
});
test('inaccessible account and missing project fail without accepting credentials',async()=>{
 for(const request of [async()=>({success:false}),async(path)=>({success:true,result:path.endsWith(account)?{id:account}:{name:'another-project'}})]){
  await assert.rejects(verify({request}),/verification|resource/);
 }
});
test('open previews or preview sending prevent credential installation',async()=>{
 for(const field of ['fail_open','SUBMISSIONS_ENABLED']){
  const result=projectResult();
  if(field==='fail_open')result.deployment_configs.preview.fail_open=true;
  else result.deployment_configs.preview.env_vars.SUBMISSIONS_ENABLED.value='true';
  await assert.rejects(verify({request:async(path)=>({success:true,result:path.endsWith(account)?{id:account}:result})}),/protection/);
 }
});
test('secret installation verifies again and targets both protected environments',async()=>{
 const calls=[];
 const verified=await verify({request:async(path,method='GET',body)=>{
  calls.push({path,method,body});
  return {success:true,result:path.endsWith(account)?{id:account}:projectResult()};
 }});
 await verified.installSecrets({SESSION_SECRET:'test-value'});
 assert.deepEqual(calls.map(c=>c.method),['GET','GET','GET','GET','PATCH']);
 const write=calls.at(-1);
 assert.equal(write.path,`accounts/${account}/pages/projects/customvibe-business`);
 assert.deepEqual(write.body.deployment_configs.production.env_vars,{SESSION_SECRET:{type:'secret_text',value:'test-value'}});
 assert.deepEqual(write.body.deployment_configs.preview.env_vars,write.body.deployment_configs.production.env_vars);
});
test('a changed protection setting between prompt and write aborts installation',async()=>{
 let gets=0,writes=0;
 const verified=await verify({request:async(path,method='GET')=>{
  if(method!=='GET')writes++;
  if(path.endsWith(account))return {success:true,result:{id:account}};
  const result=projectResult();if(++gets>1)result.deployment_configs.preview.fail_open=true;
  return {success:true,result};
 }});
 await assert.rejects(verified.installSecrets({SESSION_SECRET:'test-value'}),/protection/);
 assert.equal(writes,0);
});

test('admin credentials go only to the verified destination Worker',async()=>{
 const writes=[];
 const verified=await verify({scope:'admin',project:'customvibe-admin',config:{account_id:account,name:'customvibe-admin'},request:async(path,method='GET',body)=>{
  if(method!=='GET')writes.push({path,method,body});
  return {success:true,result:path.endsWith(account)?{id:account}:{bindings:[{type:'service',name:'AUTH',service:'customvibe-security'}]}};
 }});
 await verified.installSecrets({ADMIN_PASSWORD_HASH:'test-hash',ADMIN_SESSION_SECRET:'test-session'});
 assert.deepEqual(writes.map(({path,method,body})=>[path,method,body.name]),[
  [`accounts/${account}/workers/scripts/customvibe-admin/secrets`,'PUT','ADMIN_PASSWORD_HASH'],
  [`accounts/${account}/workers/scripts/customvibe-admin/secrets`,'PUT','ADMIN_SESSION_SECRET']
 ]);
});
test('transport refuses default login and cross-account requests',async()=>{
 assert.throws(()=>target.createRequest(env),/token|socket/);
 const request=target.createRequest({...env,CLOUDFLARE_API_TOKEN:'test-token'});
 await assert.rejects(request('accounts/32f76ae0716c90e27b7d012f58e9698c'),/outside destination/);
 await assert.rejects(request(`accounts/${account}`,'DELETE'),/not allowed/);
});
test('transport does not expose credential-bearing network errors',async()=>{
 const originalFetch=globalThis.fetch;
 globalThis.fetch=async()=>{throw Error('test-sensitive-token')};
 try{
  const request=target.createRequest({...env,CLOUDFLARE_API_TOKEN:'test-sensitive-token'});
  await assert.rejects(request(`accounts/${account}`),error=>error.message.includes('Cloudflare request failed')&&!error.message.includes('test-sensitive-token'));
 }finally{globalThis.fetch=originalFetch}
});
test('Pages supported configuration uses required environment pin and live identity',async()=>{
 await verify({config:{name:'customvibe-business'}});
 await assert.rejects(verify({config:{name:'customvibe-business'},env:{}}),/destination account/);
});

test('credential maintenance accepts gated production sending while preview stays off',async()=>{
 const result=projectResult();result.deployment_configs.production.env_vars.SUBMISSIONS_ENABLED.value='true';
 const verified=await verify({request:async path=>({success:true,result:path.endsWith(account)?{id:account}:result})});
 await verified.installSecrets({RESEND_API_KEY:'test-value'});
});
