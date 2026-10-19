import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createRequest,DESTINATION_ACCOUNT} from '../scripts/cloudflare-target.mjs';
import {diagnoseAdmin} from '../scripts/diagnose-admin-deployment.mjs';

const sentinel='DO_NOT_PRINT_PRIVATE_RESPONSE_OR_TOKEN';
const env={CLOUDFLARE_ACCOUNT_ID:DESTINATION_ACCOUNT,CLOUDFLARE_API_TOKEN:sentinel};
async function diagnostic(fetcher){
 assert.equal(typeof diagnoseAdmin,'function','Read-only admin diagnostic must exist');
 const original=globalThis.fetch;globalThis.fetch=fetcher;
 try{return await diagnoseAdmin({env})}finally{globalThis.fetch=original}
}
test('diagnostic identifies an HTTP rejection with numeric provider codes only',async()=>{
 const result=await diagnostic(async(url,options)=>{
  assert.equal(url,`https://api.cloudflare.com/client/v4/accounts/${DESTINATION_ACCOUNT}/workers/scripts/customvibe-admin/settings`);
  assert.equal(options.method,'GET');
  return new Response(JSON.stringify({success:false,errors:[{code:10000,message:sentinel},{code:sentinel},{code:1.5},{code:-1},{code:1234567}]}),{status:403,statusText:sentinel});
 });
 assert.deepEqual(result,{ok:false,check:'ADMIN_SETTINGS_READ',category:'HTTP_ERROR',httpStatus:403,cloudflareCodes:[10000]});
 assert.doesNotMatch(JSON.stringify(result),new RegExp(sentinel));
});
test('diagnostic limits provider codes and discards duplicate, nonnumeric and malformed entries',async()=>{
 const result=await diagnostic(async()=>new Response(JSON.stringify({errors:[100,101,102,103,104,105,100].map(code=>({code,message:sentinel}))}),{status:429}));
 assert.deepEqual(result.cloudflareCodes,[100,101,102,103,104]);
});
test('diagnostic classifies invalid response and fixed transport categories without exception text',async()=>{
 for(const [fetcher,category] of [
  [async()=>new Response(sentinel,{status:502}),'HTTP_ERROR'],
  [async()=>new Response(sentinel,{status:200}),'INVALID_JSON'],
  [async()=>{throw Object.assign(Error(sentinel),{cause:{code:'ENOTFOUND',message:sentinel}})},'DNS_ERROR'],
  [async()=>{throw Object.assign(Error(sentinel),{cause:{code:'CERT_HAS_EXPIRED',message:sentinel}})},'TLS_ERROR'],
  [async()=>{throw Object.assign(Error(sentinel),{name:'TimeoutError'})},'TIMEOUT'],
  [async()=>{throw Object.assign(Error(sentinel),{cause:{code:sentinel}})},'NETWORK_ERROR']
 ]){
  const result=await diagnostic(fetcher);
  assert.equal(result.ok,false);assert.equal(result.category,category);
  assert.doesNotMatch(JSON.stringify(result),new RegExp(sentinel));
 }
});
test('diagnostic success reveals no settings, bindings, values or returned metadata',async()=>{
 const result=await diagnostic(async()=>new Response(JSON.stringify({success:true,result:{bindings:[{name:sentinel,text:sentinel}],url:sentinel}})));
 assert.deepEqual(result,{ok:true,check:'ADMIN_SETTINGS_READ',category:'READ_OK'});
});
test('diagnostic handles provider rejection at HTTP 200 without copying messages',async()=>{
 const result=await diagnostic(async()=>new Response(JSON.stringify({success:false,errors:[{code:10000,message:sentinel}],result:sentinel})));
 assert.deepEqual(result,{ok:false,check:'ADMIN_SETTINGS_READ',category:'API_ERROR',cloudflareCodes:[10000]});
});
test('diagnostic transport refuses every write and default credential fallback',async()=>{
 let calls=0;const original=globalThis.fetch;globalThis.fetch=async()=>{calls++;throw Error(sentinel)};
 try{
  const request=createRequest(env,{diagnostic:true});
  for(const method of ['PATCH','PUT','POST','DELETE'])await assert.rejects(request(`accounts/${DESTINATION_ACCOUNT}` ,method),/read-only/);
  assert.equal(calls,0);
  assert.throws(()=>createRequest({CLOUDFLARE_ACCOUNT_ID:DESTINATION_ACCOUNT},{diagnostic:true}),/token|socket/);
  assert.throws(()=>createRequest({...env,CUSTOMVIBE_MIGRATION_SOCKET:sentinel},{diagnostic:true}),/without a migration socket/);
 }finally{globalThis.fetch=original}
});
test('diagnostic rejects local configuration failures without exception content',async()=>{
 assert.deepEqual(await diagnoseAdmin({env:{}}),{ok:false,check:'ADMIN_SETTINGS_READ',category:'CONFIGURATION_ERROR'});
});
test('dedicated diagnostic workflow is dispatch only, exact SHA, main only and has no upload command',async()=>{
 const workflow=await readFile(new URL('../.github/workflows/diagnose-admin.yml',import.meta.url),'utf8');
 assert.match(workflow,/workflow_dispatch:/);assert.doesNotMatch(workflow,/\n  (push|pull_request):/);
 assert.match(workflow,/github\.ref == 'refs\/heads\/main'/);
 assert.match(workflow,/test "\$EXPECTED_SHA" = "\$GITHUB_SHA"/);
 assert.match(workflow,/CUSTOMVIBE_PAGES_DEPLOY_TOKEN/);
 assert.match(workflow,/contents: read/);
 assert.doesNotMatch(workflow,/wrangler|publish_admin|actions: write|contents: write|npm ci|npm run|curl|printenv/);
});

test('diagnostic CLI fails with a single safe record when explicit configuration is absent',()=>{
 const run=spawnSync(process.execPath,[fileURLToPath(new URL('../scripts/diagnose-admin-deployment.mjs',import.meta.url))],{env:{},encoding:'utf8'});
 assert.equal(run.status,1);assert.equal(run.stderr,'');
 assert.deepEqual(JSON.parse(run.stdout),{ok:false,check:'ADMIN_SETTINGS_READ',category:'CONFIGURATION_ERROR'});
});
