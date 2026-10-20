// Exercise real CLI state transitions. Process/provider shims are child-only and synthetic.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,mkdir,readFile,rm,copyFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root=fileURLToPath(new URL('../',import.meta.url));
const cli=fileURLToPath(new URL('../scripts/release-manifest.mjs',import.meta.url));
const sha='a'.repeat(40),old='b'.repeat(40),id='12345678-1234-1234-1234-123456789abc',next='87654321-1234-1234-1234-123456789abc';
const marker='PRIVATE_SENTINEL_MUST_NOT_PERSIST';
function mandatoryCliFixture(){
 const candidate=sha,head='e'.repeat(40),base=old,merge='bc4e80b61dd30338e62f1b922dded516cd250d30',tree='d9ebd59f26e2fea7ef82e5e2831cb66851a5ae1a';
 const repo={full_name:'TIMMMYYYHHHH/Customvibev3',id:1269416306,private:false};
 const checkout='Run actions/checkout@11d5960a326750d5838078e36cf38b85af677262',setup='Run actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020';
 const names=['Set up job',checkout,setup,'Install locked dependencies','Build storefront and server-rendered pages','Build admin and storefront preview','Verify shipped third-party notices','Run local fixture tests','Run Python security-helper fixtures','Post '+setup,'Post '+checkout,'Complete job'];
 const steps=[{"name":"Set up job","status":"completed","conclusion":"success","number":1,"started_at":"2026-10-20T10:01:42Z","completed_at":"2026-10-20T10:01:43Z"},{"name":"Run actions/checkout@11d5960a326750d5838078e36cf38b85af677262","status":"completed","conclusion":"success","number":2,"started_at":"2026-10-20T10:01:43Z","completed_at":"2026-10-20T10:01:48Z"},{"name":"Run actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020","status":"completed","conclusion":"success","number":3,"started_at":"2026-10-20T10:01:48Z","completed_at":"2026-10-20T10:01:49Z"},{"name":"Install locked dependencies","status":"completed","conclusion":"success","number":4,"started_at":"2026-10-20T10:01:49Z","completed_at":"2026-10-20T10:01:56Z"},{"name":"Build storefront and server-rendered pages","status":"completed","conclusion":"success","number":5,"started_at":"2026-10-20T10:01:56Z","completed_at":"2026-10-20T10:02:09Z"},{"name":"Build admin and storefront preview","status":"completed","conclusion":"success","number":6,"started_at":"2026-10-20T10:02:09Z","completed_at":"2026-10-20T10:02:15Z"},{"name":"Verify shipped third-party notices","status":"completed","conclusion":"success","number":7,"started_at":"2026-10-20T10:02:15Z","completed_at":"2026-10-20T10:02:24Z"},{"name":"Run local fixture tests","status":"completed","conclusion":"success","number":8,"started_at":"2026-10-20T10:02:24Z","completed_at":"2026-10-20T10:09:35Z"},{"name":"Run Python security-helper fixtures","status":"completed","conclusion":"success","number":9,"started_at":"2026-10-20T10:09:35Z","completed_at":"2026-10-20T10:09:35Z"},{"name":"Post Run actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020","status":"completed","conclusion":"success","number":17,"started_at":"2026-10-20T10:09:35Z","completed_at":"2026-10-20T10:09:35Z"},{"name":"Post Run actions/checkout@11d5960a326750d5838078e36cf38b85af677262","status":"completed","conclusion":"success","number":18,"started_at":"2026-10-20T10:09:35Z","completed_at":"2026-10-20T10:09:35Z"},{"name":"Complete job","status":"completed","conclusion":"success","number":19,"started_at":"2026-10-20T10:09:35Z","completed_at":"2026-10-20T10:09:35Z"}];
 const run={id:39404961304,run_attempt:1,workflow_id:389570831,path:'.github/workflows/validate.yml',name:'Validate proposed CustomVibe changes',event:'pull_request',head_sha:head,repository:repo,head_repository:repo,pull_requests:[],status:'completed',conclusion:'success',check_suite_id:987,created_at:'2026-10-20T10:01:39Z',run_started_at:'2026-10-20T10:01:42Z',updated_at:'2026-10-20T10:09:38Z',html_url:'https://github.com/TIMMMYYYHHHH/Customvibev3/actions/runs/39404961304'};
 const job={id:118568540207,run_id:run.id,run_attempt:1,head_sha:head,name:'Node 22 build and fixture tests',status:'completed',conclusion:'success',started_at:'2026-10-20T10:01:42Z',completed_at:'2026-10-20T10:09:38Z',steps,check_run_url:'https://api.github.com/repos/TIMMMYYYHHHH/Customvibev3/check-runs/118568540207'};
 const log=['##[group]Operating System','Ubuntu','##[endgroup]','##[group]'+checkout,'##[endgroup]','##[group]Fetching the repository','[command]/usr/bin/git -c protocol.version=2 fetch --no-tags --prune --no-recurse-submodules --depth=1 origin +'+merge+':refs/remotes/pull/45/merge','##[endgroup]','##[group]Checking out the ref','[command]/usr/bin/git checkout --progress --force refs/remotes/pull/45/merge','##[endgroup]','[command]/usr/bin/git log -1 --format=%H',merge,'##[group]'+setup,'##[endgroup]','node: v22.23.3','##[group]Run npm ci','##[endgroup]','##[group]Run npm test','##[endgroup]','# tests 566','# suites 0','# pass 566','# fail 0','# cancelled 0','# skipped 0','# todo 0','# duration_ms 1','##[group]Run python3 -B -m unittest discover tests/python','##[endgroup]','.......','----------------------------------------------------------------------','Ran 7 tests in 0.001s','','OK','##[group]Post job cleanup.','##[endgroup]'].join('\n');
 const selector={version:1,origin:'owner-selected-github-validation',reviewed:true,repository:repo.full_name,repositoryId:repo.id,candidateSha:candidate,candidateTreeSha:tree,pullRequestNumber:45,prHeadSha:head,prBaseSha:base,checkedMergeSha:merge,checkedTreeSha:tree,workflowId:run.workflow_id,workflowPath:run.path,workflowSha256:'1021fd8f5c961d5e65b49a91e7870c339015f57c5e2b681a44cbaa4d225e2389',runId:run.id,runAttempt:1,jobId:job.id,checkRunId:job.id,checkSuiteId:987,url:run.html_url,nodeVersion:'v22.23.3',nodeTests:566,pythonTests:7,originalJobLogSha256:createHash('sha256').update(log).digest('hex'),ownerProofSha256:'d'.repeat(64)};
 const check={id:job.id,name:job.name,status:'completed',conclusion:'success',head_sha:head,app:{id:15368},check_suite:{id:987},started_at:job.started_at,completed_at:job.completed_at};
 const facts={workflow:{id:run.workflow_id,path:run.path,state:'active'},run,attempt:structuredClone(run),jobs:{total_count:1,jobs:[job]},check,commit:{sha:merge,tree:{sha:tree},parents:[{sha:base},{sha:head}]},mergedPull:{number:45,merged:true,merge_commit_sha:candidate,head:{sha:head,repo},base:{ref:'main',sha:'f'.repeat(40),repo}},rules:[{type:'required_status_checks',ruleset_id:25416396,parameters:{required_status_checks:[{context:job.name,integration_id:15368}]}}],log,runs:{total_count:1,workflow_runs:[structuredClone(run)]},finalRun:structuredClone(run),finalCheck:structuredClone(check)};
 return {selector,facts,local:{sourceSha:candidate,treeSha:tree,parents:[base,head],workflowSha256:selector.workflowSha256,publisherRuntime:'v22.23.3',compilerRuntime:'v22.23.3'},checkedAt:'2026-10-20T10:10:00.000Z'};
}

const preload=`
const cp=require('node:child_process'),fs=require('node:fs');
const actualVersion=process.version;Object.defineProperty(process,'version',{get:()=>process.env.PUBLISHER_RUNTIME||(process.env.COMPILER_RUNTIME&&global.__apiCalls>=13?process.env.COMPILER_RUNTIME:actualVersion)});
const RealDate=Date;global.__clockShift=Number(process.env.CLOCK_SHIFT_MS||0);global.Date=class extends RealDate{constructor(...args){super(...(args.length?args:[RealDate.now()+global.__clockShift]));}static now(){return RealDate.now()+global.__clockShift;}toISOString(){const result=super.toISOString();if(global.__afterValidationClock){global.__afterValidationClock=false;global.__clockShift+=Number(process.env.POST_VALIDATION_DELAY_MS||0);}return result;}};
const sha=process.env.FIXTURE_SOURCE_SHA||'${sha}',old=process.env.FIXTURE_BASE_SHA||'${old}',id=process.env.FIXTURE_BEFORE_ID||'${id}',next=process.env.FIXTURE_NEXT_ID||'${next}';
cp.execFileSync=(program,args)=>{
 if(program==='git'){
  if(args[0]==='status')return '';
  if(args[0]==='diff'&&args[1]==='--name-status')return (process.env.ARCHIVE_STATUS||'A')+'\\t'+args.at(-1);
  if(args[0]==='diff')return process.env.CHANGED_PATH||'docs/release-process.md';
  if(args[0]==='merge-base')return old;
  if(args[0]==='ls-tree'&&args[1]!=='-r'){const file=args.at(-1),bytes=fs.readFileSync(file),blob=require('node:crypto').createHash('sha1').update(Buffer.concat([Buffer.from('blob '+bytes.length+'\\0'),bytes])).digest('hex');return (process.env.ARCHIVE_MODE||'100644')+' blob '+(process.env.ARCHIVE_BLOB||blob)+'\\t'+file;}
  if(args[0]==='show'&&args.includes('--format=%P'))return old+' '+('e'.repeat(40));
  if(args[0]==='show'&&String(args.at(-1)).endsWith(':.github/workflows/validate.yml'))return fs.readFileSync('validate.yml');
  if(args[0]==='rev-parse'&&String(args.at(-1)).endsWith('^{tree}'))return 'd9ebd59f26e2fea7ef82e5e2831cb66851a5ae1a';
  if(args[0]==='show')return 'export default {};';
  if(args[0]==='ls-tree')return 'security/index.mjs\\ncatalogue/index.mjs\\nserver/proof-api.mjs';
  return sha;
 }
 if(program==='gh'){if(process.env.FAIL_CONTEXT==='true')throw Error('${marker}');return JSON.stringify({object:{sha:process.env.DRIFT==='true'?old:sha}});}
 if(program==='npx'){
  fs.appendFileSync('provider-calls.log',args.join(' ')+'\\n');
  if(process.env.UPLOAD_RESULT==='success'){fs.writeFileSync('uploaded','yes');return 'synthetic acknowledgement';}
  throw Object.assign(Error('${marker}'),{stdout:'${marker}',stderr:'${marker}'});
 }
 if(program===process.execPath){
  fs.appendFileSync('guard-calls.log',args.join(' ')+'\\n');
  if(process.env.FAIL_GUARDS==='true'&&args.at(-1)==='after')throw Error('${marker}');return '';
 }
 throw Error('Unexpected process');
};

const fsp=require('node:fs/promises'),realWrite=fsp.writeFile;fsp.writeFile=async(path,data,...rest)=>{const out=await realWrite(path,data,...rest);if(String(path).endsWith('release-manifest.json')&&process.env.INTENT_DELAY_MS){const r=JSON.parse(String(data));if(r.attempts?.length===1&&!r.attempts[0].invokedAt)global.__clockShift+=Number(process.env.INTENT_DELAY_MS);}return out;};
const fakeApi=\`
import fs from 'node:fs';
global.__clockShift+=Number(process.env.IMPORT_DELAY_MS||0);
export const unstable_pages={async deploy(options){
 fs.appendFileSync('provider-calls.log','official-pages-api\\\\n');
 if(process.env.UPLOAD_RESULT!=='success')throw Error('PRIVATE_SENTINEL_MUST_NOT_PERSIST');
 fs.writeFileSync('uploaded','yes');
 const creation=new Date().toISOString();global.__clockShift+=Number(process.env.PROVIDER_DELAY_MS||process.env.ACK_DELAY_MS||0);
 const config=JSON.parse(fs.readFileSync('wrangler.jsonc','utf8')),production=config.env.production;
 const main='functionsWorker-0.123.js',metadata={main_module:main,bindings:[...Object.entries(production.vars).map(([name,text])=>({name,type:'plain_text',text})),...production.services.map(v=>({name:v.binding,type:'service',service:v.service}))],compatibility_date:config.compatibility_date,compatibility_flags:[],limits:config.limits};
 const inner=new FormData();inner.set('metadata',JSON.stringify(metadata));inner.set(main,new File(['export default {};'],main,{type:'application/javascript+module'}));
 const outer=new FormData();outer.set('_worker.bundle',new File([await new Response(inner).arrayBuffer()],'_worker.bundle'));outer.set('manifest',JSON.stringify({'/index.html':'a'.repeat(32)}));outer.set('branch','main');outer.set('commit_hash',options.commitHash);outer.set('commit_dirty','false');outer.set('wrangler_config_hash',requireHash(fs.readFileSync('wrangler.jsonc')));outer.set('pages_build_output_dir','dist/client');outer.set('functions-filepath-routing-config.json',new File(['{"routes":[]}'],'functions-filepath-routing-config.json'));
 if(process.env.BAD_UPLOAD_PAYLOAD==='multipart')outer.set('_worker.bundle',new File(['PRIVATE_INVALID_MULTIPART_SENTINEL'],'_worker.bundle'));
 if(process.env.BAD_UPLOAD_PAYLOAD==='metadata'){const altered=new FormData();altered.set('metadata',JSON.stringify({...metadata,private:'PRIVATE_METADATA_SENTINEL'}));altered.set(main,new File(['PRIVATE_CODE_SENTINEL'],main,{type:'application/javascript+module'}));outer.set('_worker.bundle',new File([await new Response(altered).arrayBuffer()],'_worker.bundle'));}
 if(process.env.ACK_THEN_MUTATE==='true')fs.writeFileSync('dist/client/index.html','changed after acknowledgement');
 return {formData:outer,deploymentResponse:{id:process.env.WRONG_ACK_ID==='true'?'11111111-1234-1234-1234-123456789abc':(process.env.FIXTURE_NEXT_ID||'${next}'),environment:process.env.INVALID_ACK==='environment'?'preview':'production',created_on:process.env.INVALID_ACK==='date'?'PRIVATE_DATE_SENTINEL':process.env.ACK_DELAY_MS?creation:new Date().toISOString(),deployment_trigger:{metadata:{commit_hash:process.env.INVALID_ACK==='source'?'${old}':options.commitHash}},diagnostic:'PRIVATE_SENTINEL_MUST_NOT_PERSIST'}};
}};
import {createHash} from 'node:crypto';const requireHash=x=>createHash('sha256').update(x).digest('hex');
\`;
require('node:module').registerHooks({resolve(specifier,context,nextResolve){if(specifier==='wrangler'&&context.conditions.includes('import'))return {url:'data:text/javascript,'+encodeURIComponent(fakeApi),shortCircuit:true};return nextResolve(specifier,context);}});

require('node:module').syncBuiltinESMExports();
global.fetch=async (url,options)=>{
 if(String(url).startsWith('https://api.github.com/')||String(url).startsWith('https://logs.invalid/')){
  const f=JSON.parse(fs.readFileSync('mandatory.json')),s=f.selector,v=f.facts;global.__apiCalls=(global.__apiCalls||0)+1;
  if(options.method!=='GET'||options.headers?.Authorization||options.headers?.Cookie)throw Error('Unexpected authenticated request');
  fs.appendFileSync('validation-calls.log',String(url).startsWith('https://logs.invalid/')?'log-download\\n':String(url)+'\\n');
  const base='https://api.github.com/repos/TIMMMYYYHHHH/Customvibev3/';const routes={
   ['actions/workflows/'+s.workflowId]:v.workflow,['actions/runs/'+s.runId]:global.__apiCalls>11?v.finalRun:v.run,['actions/runs/'+s.runId+'/attempts/'+s.runAttempt]:v.attempt,['actions/runs/'+s.runId+'/attempts/'+s.runAttempt+'/jobs?per_page=100']:v.jobs,['check-runs/'+s.checkRunId]:global.__apiCalls>12?v.finalCheck:v.check,['git/commits/'+s.checkedMergeSha]:v.commit,['pulls/'+s.pullRequestNumber]:v.mergedPull,['rules/branches/main']:v.rules,['actions/workflows/'+s.workflowId+'/runs?event=pull_request&head_sha='+s.prHeadSha+'&per_page=100']:v.runs};
  if(process.env.FAIL_VALIDATION==='network')throw Error('PRIVATE_NETWORK_SENTINEL');
  const headers={'content-type':'application/json','x-ratelimit-remaining':String(process.env.FAIL_VALIDATION==='quota'?0:60-global.__apiCalls),'x-ratelimit-reset':String(global.__rateReset??=(Math.floor(Date.now()/1000)+3600))};
  if(process.env.FAIL_VALIDATION==='headers')delete headers['x-ratelimit-remaining'];
  if(process.env.FAIL_VALIDATION==='media')headers['content-type']='text/html';
  if(process.env.FAIL_VALIDATION==='pagination')headers.link='<https://api.github.com/?page=2>; rel=next';
  if(String(url).startsWith('https://logs.invalid/')){headers['content-type']='text/plain';return new Response(v.log,{headers});}
  if(url===base+'actions/jobs/'+s.jobId+'/logs'){headers.location=process.env.FAIL_VALIDATION==='redirect'?'http://logs.invalid/PRIVATE_SIGNED_SENTINEL':'https://logs.invalid/temporary';return new Response(null,{status:302,headers});}
  const path=String(url).slice(base.length);if(!(path in routes))throw Error('Unexpected GitHub path');
  if(global.__apiCalls===13&&process.env.POST_VALIDATION_DELAY_MS)global.__afterValidationClock=true;
  return new Response(process.env.FAIL_VALIDATION==='duplicate'?' {\"id\":1,\"id\":2}':JSON.stringify(routes[path]),{status:process.env.FAIL_VALIDATION==='status'?403:200,headers});
 }

 fs.appendFileSync('request-calls.log',String(url)+'\\n');
 if(!String(url).includes('/pages/projects/customvibe-business'))throw Error('Private request attempted');
 return {ok:true,json:async()=>({success:true,result:{canonical_deployment:{id:fs.existsSync('uploaded')?next:id,latest_stage:{status:'success'},deployment_trigger:{metadata:{commit_hash:fs.existsSync('uploaded')?sha:old}}}}})};
};
`;
async function fixture(t){
 const dir=await mkdtemp(join(tmpdir(),'customvibe-release-cli-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 await mkdir(join(dir,'dist/release'),{recursive:true});
 for(const side of ['client','admin','ssr']){await mkdir(join(dir,'dist',side));await writeFile(join(dir,'dist',side,'index.html'),'fixture');}
 await writeFile(join(dir,'preload.cjs'),preload);
 const mandatory=mandatoryCliFixture();await writeFile(join(dir,'mandatory.json'),JSON.stringify(mandatory));await copyFile(join(root,'.github/workflows/validate.yml'),join(dir,'validate.yml'));
 for(const name of ['wrangler.jsonc','package-lock.json'])await copyFile(join(root,name),join(dir,name));
 for(const family of ['security','content']){await mkdir(join(dir,'migrations',family),{recursive:true});await writeFile(join(dir,'migrations',family,'0001.sql'),'-- fixture only');await writeFile(join(dir,family==='security'?'wrangler.security.jsonc':'wrangler.catalogue.jsonc'),JSON.stringify({d1_databases:[{database_name:family,database_id:id}]}));}
 await writeFile(join(dir,'wrangler.admin.jsonc'),'{}');
 const path=join(dir,'dist/release/release-manifest.json');
 const baseline={schemaVersion:1,repository:'TIMMMYYYHHHH/Customvibev3',state:'partial',sourceSha:old,baseSha:old,reviewed:true,evidenceUrl:'https://github.com/TIMMMYYYHHHH/Customvibev3/actions/runs/100'};
 const evidence={baseline,sourceSha:sha,mandatoryValidation:mandatory.selector};
 const env={PATH:process.env.PATH,TMPDIR:tmpdir(),GITHUB_ACTIONS:'true',GITHUB_REPOSITORY:baseline.repository,GITHUB_REF:'refs/heads/main',GITHUB_SHA:sha,GITHUB_EVENT_NAME:'workflow_dispatch',REVIEWED_SHA:sha,GITHUB_RUN_ID:'123',GITHUB_RUN_ATTEMPT:'1',CLOUDFLARE_ACCOUNT_ID:'4f57d4e924674cb87b33d4c884745cf6',CLOUDFLARE_API_TOKEN:'synthetic-pages-only-token',WRANGLER_SEND_METRICS:'false',RELEASE_EVIDENCE_JSON:JSON.stringify(evidence)};
 const fixture={dir,path,evidence,async run(args,extra={}){
  let result;try{result={status:0,stdout:execFileSync(process.execPath,['--require',join(dir,'preload.cjs'),cli,...args],{cwd:dir,env:{...env,RELEASE_EVIDENCE_JSON:JSON.stringify(evidence),...extra},encoding:'utf8',stdio:['ignore','pipe','pipe']})};}catch(e){result={status:e.status,stdout:String(e.stdout||''),stderr:String(e.stderr||'')};}
  const text=await readFile(path,'utf8').catch(()=> '{}');
  const log=name=>readFile(join(dir,name),'utf8').catch(()=> '');
  return {...result,text,record:JSON.parse(text),calls:await log('guard-calls.log'),requests:await log('request-calls.log'),uploads:await log('provider-calls.log'),validationRequests:await log('validation-calls.log')};
 }};
 const seed=await fixture.run(['plan']);
 if(!seed.record.build)throw Error('Fixture source/build setup failed: '+JSON.stringify(seed));
 evidence.activationCompatibility={basis:'source-input-tooling-only-v1',reviewedAgainstSha:sha,baselineSha:old,observedAt:new Date().toISOString(),sourceInputDigest:seed.record.build.sourceInputDigest,compilerConfigDigest:seed.record.build.compiler.compilerConfigDigest,configDigest:seed.record.build.compiler.configDigest,pagesBuildDigest:seed.record.build.pages.sha256,adminAssetsDigest:seed.record.build.admin.sha256,historicalFunctionsDigest:null};
 for(const log of ['guard-calls.log','request-calls.log','provider-calls.log','validation-calls.log'])await writeFile(join(dir,log),'');
 return fixture;
}
test('Pages-only publication needs no private request and records partial unknown compatibility',async t=>{
 const f=await fixture(t);assert.equal((await f.run(['plan'])).status,0);
 const published=await f.run(['publish','pages'],{UPLOAD_RESULT:'success'});assert.equal(published.status,0,JSON.stringify(published));
 const done=await f.run(['finish']);assert.equal(done.status,0);assert.equal(done.record.state,'partial');
 assert.equal(done.record.completed.pages.id,next);assert.equal(done.record.prerequisites.components.catalogue.status,'blocked');
 assert.equal(done.record.prerequisites.schema.content.status,'blocked');assert.ok(!done.requests.includes('/workers/'));assert.ok(!done.uploads.includes('d1'));
});
test('required private/schema and shared Admin staged evidence fail closed before upload',async t=>{
 for(const path of ['security/orders.mjs','catalogue/index.mjs','src/App.jsx']){
  const f=await fixture(t);const plan=await f.run(['plan'],{CHANGED_PATH:path});assert.equal(plan.status,1);assert.equal(plan.record.state,'blocked');
  const upload=await f.run(['publish','pages']);assert.equal(upload.status,1);assert.equal(upload.uploads,'');assert.ok(!upload.requests.includes('/workers/'));
 }
});
test('missing baseline or source drift never uploads and stores only sanitized stage errors',async t=>{
 for(const extra of [{RELEASE_EVIDENCE_JSON:''},{DRIFT:'true'},{FAIL_CONTEXT:'true'}]){
  const f=await fixture(t);const result=await f.run(['plan'],extra);assert.equal(result.status,1);assert.equal(result.record.state,'blocked');assert.equal(result.uploads,'');
  assert.ok(!result.text.includes(marker));assert.ok(!(result.stdout+result.stderr).includes(marker));
 }
});
test('lost Pages acknowledgement still observes protection and preserves failure',async t=>{
 const f=await fixture(t);await f.run(['plan']);const result=await f.run(['publish','pages']);
 assert.equal(result.status,1);assert.equal(result.record.state,'partial');assert.equal(result.record.attempts[0].outcome,'unconfirmed');assert.equal(result.record.completed.pages,undefined);
 assert.equal(result.record.attempts[0].protection.status,'failed');assert.equal(result.record.attempts[0].protection.checks[0].identityCode,'FINAL_IDENTITY_DRIFT');assert.match(result.calls,/check-deployment.mjs after/);assert.ok(!result.text.includes(marker));
 const final=await f.run(['finish']);assert.equal(final.status,1);assert.equal(final.record.state,'partial');assert.equal(final.record.attempts[0].outcome,'unconfirmed');
});
test('post-attempt guard failure preserves the primary upload failure and final observation',async t=>{
 const f=await fixture(t);await f.run(['plan']);const result=await f.run(['publish','pages'],{FAIL_GUARDS:'true'});
 assert.equal(result.status,1);assert.equal(result.record.attempts[0].protection.status,'failed');assert.match(result.record.reasons.join('\n'),/PUBLICATION_FAILED/);assert.match(result.record.reasons.join('\n'),/POST_ATTEMPT_GUARD_FAILED/);
 const done=await f.run(['finish'],{FAIL_CONTEXT:'true',FAIL_GUARDS:'true'});assert.equal(done.status,1);assert.equal(done.record.finalProtection.status,'failed');assert.equal(done.record.state,'partial');assert.ok(!done.text.includes(marker));
});
test('Admin publication and local completion cannot run from GitHub or use its Pages credential',async t=>{
 const f=await fixture(t);const admin=await f.run(['publish','admin']);assert.equal(admin.status,1);assert.equal(admin.uploads,'');assert.equal(admin.requests,'');
 const local=await f.run(['finish-local']);assert.equal(local.status,1);assert.equal(local.uploads,'');assert.equal(local.requests,'');
});

test('Pages drift and changed built output abort before an upload attempt',async t=>{
 for(const mutate of [async f=>writeFile(join(f.dir,'uploaded'),'unrelated newer release'),async f=>writeFile(join(f.dir,'dist/client/index.html'),'changed after planning')]){
  const f=await fixture(t);await f.run(['plan']);await mutate(f);const result=await f.run(['publish','pages']);
  assert.equal(result.status,1);assert.equal(result.uploads,'');assert.equal(result.record.attempts,undefined);
 }
});
test('local final failure still attempts every protection independently',async t=>{
 const f=await fixture(t);await f.run(['plan']);await f.run(['publish','pages'],{UPLOAD_RESULT:'success'});
 await writeFile(join(f.dir,'guard-calls.log'),'');
 const result=await f.run(['finish-local'],{GITHUB_ACTIONS:'false',CLOUDFLARE_API_TOKEN:'',CUSTOMVIBE_MIGRATION_SOCKET:'/synthetic-only',FAIL_CONTEXT:'true',FAIL_GUARDS:'true'});
 assert.equal(result.status,1);assert.equal(result.record.state,'partial');assert.equal(result.record.finalProtection.checks.length,4);
 assert.equal(result.record.finalProtection.checks.filter(v=>v.identityCode==='FINAL_IDENTITY_OBSERVATION_FAILED').length,4);
 for(const name of ['check-deployment','check-admin-deployment','check-security-deployment','check-catalogue-deployment'])assert.match(result.calls,new RegExp(name+'[.]mjs'));
 assert.ok(!result.text.includes(marker));assert.match(result.record.reasons.join('\n'),/LOCAL_VERIFICATION_FAILED/);
});


// Real final guard programs run against synthetic metadata. The parent CLI's
// existing helper transport is simulated at the socket boundary, with no socket
// listener and no network. The race starts after its initial version readback.
async function completionFixture(t,{allFour=false}={}){
 const f=await fixture(t),root=fileURLToPath(new URL('../',import.meta.url));
 const hash=value=>createHash('sha256').update(value).digest('hex');
 const components={};
 for(const c of ['admin','security','catalogue']){
  await mkdir(join(f.dir,'dist/release/private',c),{recursive:true});await writeFile(join(f.dir,'dist/release/private',c,'worker.js'),'fixture-worker');
  components[c]={runtimeDigest:hash(JSON.stringify([['worker.js',hash('fixture-worker')]])),configDigest:hash(await readFile(join(f.dir,`wrangler.${c}.jsonc`)))};
 }
 await writeFile(join(f.dir,'dist/release/private-build-manifest.json'),JSON.stringify({sourceSha:sha,components}));
 const evidence={...f.evidence,guards:Object.fromEntries(['admin','security','catalogue'].map(c=>[c,{id}]))};
 let source=preload.replace('cp.execFileSync=(program,args)=>{','const actualExec=cp.execFileSync;cp.execFileSync=(program,args,options={})=>{');
 const a=source.indexOf(' if(program===process.execPath){'),b=source.indexOf("\n throw Error('Unexpected process');",a);
 source=source.slice(0,a)+`
 if(program===process.execPath){
  fs.appendFileSync('guard-calls.log',args.join(' ')+'\\n');
  if(process.env.RACE_COMPONENT&&!fs.existsSync('race-on'))fs.writeFileSync('race-on',process.env.RACE_COMPONENT);
  if(process.env.FAIL_FINAL_IDENTITY)fs.writeFileSync('final-readback','yes');
  fs.appendFileSync('guard-bindings.log',JSON.stringify({script:args[0],expected:Object.fromEntries(Object.entries(options.env||{}).filter(([k])=>k.startsWith('EXPECTED_')))})+'\\n');
  return actualExec(process.execPath,['--require',require('node:path').resolve('guard-preload.cjs'),require('node:path').join(${JSON.stringify(root)},args[0]),...args.slice(1)],{cwd:process.cwd(),env:{...(options.env||process.env),CUSTOMVIBE_MIGRATION_SOCKET:'',CLOUDFLARE_API_TOKEN:'synthetic-guard-token'},encoding:'utf8',stdio:['ignore','pipe','pipe']});
 }
`+source.slice(b);
 const metadata=`
const replacement='11111111-1234-1234-1234-123456789abc';
function version(c){const raced=fs.existsSync('race-on')?fs.readFileSync('race-on','utf8'):'';return raced===c?(c==='pages'?replacement:next):(c==='admin'&&fs.existsSync('admin-uploaded')?next:c==='pages'&&fs.existsSync('uploaded')?next:id);}
function metadata(path){
 if(path.includes('/pages/'))return {success:true,result:{canonical_deployment:{id:version('pages'),latest_stage:{status:'success'},deployment_trigger:{metadata:{commit_hash:fs.existsSync('race-on')&&fs.readFileSync('race-on','utf8')==='pages-source'?old:fs.existsSync('uploaded')?sha:old}}}}};
 for(const c of ['admin','security','catalogue'])if(path.includes('customvibe-'+c+'/deployments'))return {success:true,result:{deployments:[{created_on:'2026-10-20T00:00:00.000Z',versions:[{version_id:version(c),percentage:100}]}]}};
 throw Error('Unexpected synthetic helper metadata path');
}
`;
 source+=metadata+`
const net=require('node:net'),{EventEmitter}=require('node:events');
net.createConnection=()=>{
 const connection=new EventEmitter();connection.setTimeout=()=>connection;
 connection.write=line=>{const request=JSON.parse(line);if(request.method!=='GET'||request.account!=='4f57d4e924674cb87b33d4c884745cf6')throw Error('Unexpected helper operation');fs.appendFileSync('helper-calls.log',request.path+'\\n');if(process.env.FAIL_FINAL_IDENTITY&&fs.existsSync('final-readback')&&request.path.includes('customvibe-'+process.env.FAIL_FINAL_IDENTITY+'/deployments')){setImmediate(()=>connection.emit('error',Error('${marker}')));return;}setImmediate(()=>connection.emit('data',Buffer.from(JSON.stringify(metadata(request.path))+'\\n')));};
 connection.end=()=>setImmediate(()=>connection.emit('end'));connection.destroy=error=>connection.emit('error',error);
 setImmediate(()=>connection.emit('connect'));return connection;
};
require('node:module').syncBuiltinESMExports();
`;
 await writeFile(join(f.dir,'preload.cjs'),source);
 const security=JSON.parse(await readFile(join(root,'wrangler.security.jsonc'),'utf8')),catalogue=JSON.parse(await readFile(join(root,'wrangler.catalogue.jsonc'),'utf8'));
 const bindings=[...(security.d1_databases||[]).map(v=>({name:v.binding,type:'d1',id:v.database_id})),...(security.kv_namespaces||[]).map(v=>({name:v.binding,type:'kv_namespace',namespace_id:v.id})),...(security.r2_buckets||[]).map(v=>({name:v.binding,type:'r2_bucket',bucket_name:v.bucket_name}))];
 const guardSource=`const fs=require('node:fs');const sha='${sha}',old='${old}',id='${id}',next='${next}';${metadata}
const services={AUTH:{service:'customvibe-security'},CATALOGUE:{service:'customvibe-catalogue'}};
const privateKeys=['SITE_PASSWORD_HASH','SITE_PASSWORD_SALT','SESSION_SECRET','RESEND_API_KEY','W3FORMS_ACCESS_KEY','TURNSTILE_SECRET_KEY','TURNSTILE_SITE_KEY'];
function settings(c){if(c==='admin')return {bindings:[{name:'SITE_GATE_ENABLED',text:'true'},{name:'ADMIN_SEND_ENABLED',text:'true'},{name:'AUTH',service:'customvibe-security'},...['ADMIN_PASSWORD_HASH','ADMIN_SESSION_SECRET','RESEND_API_KEY'].map(name=>({name,type:'secret_text'}))]};if(c==='security')return {bindings:${JSON.stringify(bindings)}};return {bindings:[{name:'CONTENT_DB',type:'d1',id:${JSON.stringify(catalogue.d1_databases[0].database_id)}}]};}
global.fetch=async (url,options)=>{
 if(String(url).startsWith('https://api.github.com/')||String(url).startsWith('https://logs.invalid/')){
  const f=JSON.parse(fs.readFileSync('mandatory.json')),s=f.selector,v=f.facts;global.__apiCalls=(global.__apiCalls||0)+1;
  if(options.method!=='GET'||options.headers?.Authorization||options.headers?.Cookie)throw Error('Unexpected authenticated request');
  fs.appendFileSync('validation-calls.log',String(url).startsWith('https://logs.invalid/')?'log-download\\n':String(url)+'\\n');
  const base='https://api.github.com/repos/TIMMMYYYHHHH/Customvibev3/';const routes={
   ['actions/workflows/'+s.workflowId]:v.workflow,['actions/runs/'+s.runId]:global.__apiCalls>11?v.finalRun:v.run,['actions/runs/'+s.runId+'/attempts/'+s.runAttempt]:v.attempt,['actions/runs/'+s.runId+'/attempts/'+s.runAttempt+'/jobs?per_page=100']:v.jobs,['check-runs/'+s.checkRunId]:global.__apiCalls>12?v.finalCheck:v.check,['git/commits/'+s.checkedMergeSha]:v.commit,['pulls/'+s.pullRequestNumber]:v.mergedPull,['rules/branches/main']:v.rules,['actions/workflows/'+s.workflowId+'/runs?event=pull_request&head_sha='+s.prHeadSha+'&per_page=100']:v.runs};
  if(process.env.FAIL_VALIDATION==='network')throw Error('PRIVATE_NETWORK_SENTINEL');
  const headers={'content-type':'application/json','x-ratelimit-remaining':String(process.env.FAIL_VALIDATION==='quota'?0:60-global.__apiCalls),'x-ratelimit-reset':String(global.__rateReset??=(Math.floor(Date.now()/1000)+3600))};
  if(process.env.FAIL_VALIDATION==='headers')delete headers['x-ratelimit-remaining'];
  if(process.env.FAIL_VALIDATION==='media')headers['content-type']='text/html';
  if(process.env.FAIL_VALIDATION==='pagination')headers.link='<https://api.github.com/?page=2>; rel=next';
  if(String(url).startsWith('https://logs.invalid/')){headers['content-type']='text/plain';return new Response(v.log,{headers});}
  if(url===base+'actions/jobs/'+s.jobId+'/logs'){headers.location=process.env.FAIL_VALIDATION==='redirect'?'http://logs.invalid/PRIVATE_SIGNED_SENTINEL':'https://logs.invalid/temporary';return new Response(null,{status:302,headers});}
  const path=String(url).slice(base.length);if(!(path in routes))throw Error('Unexpected GitHub path');
  if(global.__apiCalls===13&&process.env.POST_VALIDATION_DELAY_MS)global.__afterValidationClock=true;
  return new Response(process.env.FAIL_VALIDATION==='duplicate'?' {\"id\":1,\"id\":2}':JSON.stringify(routes[path]),{status:process.env.FAIL_VALIDATION==='status'?403:200,headers});
 }
const path=String(url);let payload;
 if(path.endsWith('/accounts/4f57d4e924674cb87b33d4c884745cf6'))payload={success:true,result:{id:'4f57d4e924674cb87b33d4c884745cf6'}};
 else if(path.includes('/pages/')){
  payload=metadata(path);const environments=Object.fromEntries(['production','preview'].map(c=>[c,{fail_open:false,services,env_vars:{SITE_GATE_ENABLED:{value:'true'},SUBMISSIONS_ENABLED:{value:c==='production'?'true':'false'},...Object.fromEntries(privateKeys.map(name=>[name,{type:'secret_text'}]))}}]));
  payload.result={...payload.result,name:'customvibe-business',production_branch:'main',deployment_configs:environments};payload.result.canonical_deployment={...payload.result.canonical_deployment,environment:'production',...environments.production};
 }else if(path.endsWith('/settings')){const c=['admin','security','catalogue'].find(c=>path.includes('customvibe-'+c+'/'));if(!c)throw Error('Unexpected guard');payload={success:true,result:settings(c)};}
 else payload=metadata(path);
 return {ok:true,json:async()=>payload};
};`;
 await writeFile(join(f.dir,'guard-preload.cjs'),guardSource);
 const planned=await f.run(['plan'],{RELEASE_EVIDENCE_JSON:JSON.stringify(evidence)});assert.equal(planned.status,0,JSON.stringify(planned));
 if(allFour){
  const r=planned.record,observedAt=new Date().toISOString(),account='4f57d4e924674cb87b33d4c884745cf6';evidence.guards={};evidence.receipts={};evidence.schema={};
  for(const c of ['admin','security','catalogue']){evidence.guards[c]={account,component:c,id,origin:'private-helper-get',candidateSha:sha,observedAt,protection:'passed'};if(c!=='admin')evidence.receipts[c]={account,component:c,id,sourceSha:old,sourceDigest:r.sourceDigests[c],...components[c],origin:'guarded-upload',evidenceUrl:'https://github.com/TIMMMYYYHHHH/Customvibev3/actions/runs/100',observedAt};}
  for(const family of ['security','content']){const item=r.schemaSources[family];evidence.schema[family]={origin:'console-metadata',databaseId:item.databaseId,reviewedAgainstSha:sha,observedAt,sourceFiles:item.source,applied:item.source.map(v=>v.name),objectsDigest:'c'.repeat(64),ddlReviewed:true};}
  evidence.staged={reviewedAgainstSha:sha,observedAt,clientPairCompatibleWithSchema:true,rollback:{pagesId:id,adminId:id,sourceSha:old,pagesBuildDigest:r.build.pages.sha256,adminAssetsDigest:r.build.admin.sha256,adminRuntimeDigest:components.admin.runtimeDigest,adminConfigDigest:components.admin.configDigest}};
  const full=await f.run(['plan'],{CHANGED_PATH:'scripts/release-manifest.mjs',RELEASE_EVIDENCE_JSON:JSON.stringify(evidence)});assert.equal(full.status,0,full.record.reasons.join('\n'));assert.equal(full.record.required.length,4);
 }
 const uploaded=await f.run(['publish','pages'],{UPLOAD_RESULT:'success'});assert.equal(uploaded.status,0);
 if(allFour)await writeFile(join(f.dir,'admin-uploaded'),'synthetic actual Admin acknowledgement');
 const record=uploaded.record,observedAt=new Date().toISOString(),account='4f57d4e924674cb87b33d4c884745cf6';
 const finalEvidence={sourceSha:sha,guards:{},receipts:{},schema:{},...(record.evidence.staged?{staged:structuredClone(record.evidence.staged)}:{})};
 for(const c of ['admin','security','catalogue']){
  finalEvidence.guards[c]={account,component:c,id:allFour&&c==='admin'?next:id,origin:'private-helper-get',candidateSha:sha,observedAt,protection:'passed'};
  finalEvidence.receipts[c]={account,component:c,id:allFour&&c==='admin'?next:id,sourceSha:allFour&&c!=='admin'?old:sha,sourceDigest:record.sourceDigests[c],...components[c],...(c==='admin'?{assetsDigest:record.build.admin.sha256}:{}),origin:'guarded-upload',evidenceUrl:'https://github.com/TIMMMYYYHHHH/Customvibev3/actions/runs/123',observedAt};
 }
 for(const family of ['security','content']){const item=record.schemaSources[family];finalEvidence.schema[family]={origin:'console-metadata',databaseId:item.databaseId,reviewedAgainstSha:sha,observedAt,sourceFiles:item.source,applied:item.source.map(v=>v.name),objectsDigest:'c'.repeat(64),ddlReviewed:true};}
 await writeFile(join(f.dir,'guard-calls.log'),'');
 const artifactBytes=await readFile(f.path);finalEvidence.githubArtifact={origin:'owner-github-run-artifact',reviewed:true,sourceSha:sha,runId:'123',url:'https://github.com/TIMMMYYYHHHH/Customvibev3/actions/runs/123',artifactName:'release-manifest-123',runStatus:'completed',conclusion:'success',manifestSha256:hash(artifactBytes),runAttempt:'1',artifactId:'321',jobId:'987',zipSha256:'c'.repeat(64),publishStep:{name:'Publish protected Pages from the reviewed build',number:9,startedAt:record.attempts[0].startedAt,completedAt:new Date().toISOString()}};
 return {...f,finalEvidence,local(extra={}){return f.run(['finish-local'],{GITHUB_ACTIONS:'false',CLOUDFLARE_API_TOKEN:'',CUSTOMVIBE_MIGRATION_SOCKET:'/synthetic-only',RELEASE_EVIDENCE_JSON:JSON.stringify(finalEvidence),...extra});}};
}
test('real CLI local completion verifies unchanged final component identities',async t=>{
 const f=await completionFixture(t),result=await f.local();assert.equal(result.status,0);assert.equal(result.record.state,'verified');
});
for(const component of ['pages','pages-source','admin','security','catalogue'])test(`real CLI rejects ${component} replacement between initial readback and final actual guards`,async t=>{
 const f=await completionFixture(t),result=await f.local({RACE_COMPONENT:component});
 assert.equal(result.status,1);assert.equal(result.record.state,'partial');assert.equal(result.record.guards.publication,'incomplete');
 assert.equal(result.record.finalProtection.checks.length,4);
 for(const name of ['check-deployment','check-admin-deployment','check-security-deployment','check-catalogue-deployment'])assert.match(result.calls,new RegExp(name+'[.]mjs'));
 const check=result.record.finalProtection.checks.find(v=>v.component===(component==='pages-source'?'pages':component));
 assert.equal(check.identityCode,'FINAL_IDENTITY_DRIFT');assert.equal(check.code,'PROTECTION_OBSERVATION_FAILED');
 assert.equal(check.expectedId,component.startsWith('pages')?next:id);
 assert.equal(check.observedId,component==='pages'?'11111111-1234-1234-1234-123456789abc':component==='pages-source'?next:next);
 if(component==='pages-source')assert.equal(check.observedSourceSha,old);
 assert.match(result.record.reasons.join('\n'),/FINAL_IDENTITY_FAILED/);assert.ok(!result.text.includes(marker));
});


test('passing final identities cannot erase a prior local publication failure',async t=>{
 const f=await completionFixture(t);const record=JSON.parse(await readFile(f.path,'utf8'));
 record.reasons.push('PUBLICATION_FAILED: prior synthetic uncertain attempt');await writeFile(f.path,JSON.stringify(record));
 const result=await f.local();assert.equal(result.status,1);assert.equal(result.record.state,'partial');
 assert.equal(result.record.finalProtection.status,'passed');assert.match(result.record.reasons.join('\n'),/PUBLICATION_FAILED/);
 assert.equal(result.record.finalProtection.checks.filter(v=>v.identityStatus==='passed').length,4);
});
test('one failed final identity read cannot suppress the other component readbacks',async t=>{
 const f=await completionFixture(t),result=await f.local({FAIL_FINAL_IDENTITY:'admin'});
 assert.equal(result.status,1);assert.equal(result.record.state,'partial');
 assert.equal(result.record.finalProtection.checks.find(v=>v.component==='admin').identityCode,'FINAL_IDENTITY_OBSERVATION_FAILED');
 assert.equal(result.record.finalProtection.checks.filter(v=>v.identityStatus==='passed').length,3);
 assert.match(result.record.reasons.join('\n'),/FINAL_IDENTITY_FAILED/);assert.ok(!result.text.includes(marker));
});

// Execute the installed public API with a no-network Undici dispatcher. The
// dispatcher sees actual serialized POST bytes, not a replacement deploy stub.
test('installed pinned Pages API receipt matches each actual submitted inner File despite randomized compiler module names',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'customvibe-pages-api-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 const root=fileURLToPath(new URL('../',import.meta.url));
 const script=`
 import fs from 'node:fs/promises';import {createRequire} from 'node:module';import {createHash} from 'node:crypto';
 import {officialPagesUpload,capturePagesUpload} from ${JSON.stringify(new URL('../scripts/release-manifest.mjs',import.meta.url).href)};
 const require=createRequire(${JSON.stringify(new URL('../package.json',import.meta.url).href)}),{setGlobalDispatcher}=require('undici');
 const hash=v=>createHash('sha256').update(v).digest('hex'),sha='${sha}',id='${id}';
 await fs.mkdir('dist/client',{recursive:true});await fs.mkdir('functions');
 await fs.writeFile('dist/client/index.html','synthetic noncustomer asset');await fs.writeFile('functions/[[path]].js','export function onRequest(){return new Response("PRIVATE_CODE_SENTINEL")}');
 await fs.copyFile(${JSON.stringify(join(root,'wrangler.jsonc'))},'wrangler.jsonc');
 for(const k of ['_headers','_redirects','_routes.json'])await fs.writeFile('dist/client/'+k,k==='_routes.json'?JSON.stringify({version:1,include:['/*'],exclude:[]}):k==='_headers'?'/*\\n  X-Content-Type-Options: nosniff':'/old / 302');
 let captured=[],mode='success',postCount=0,events=[];
 setGlobalDispatcher({dispatch(options,handler){(async()=>{
  if(String(options.origin)!=='https://api.cloudflare.com')throw Error('Unexpected synthetic origin');
  let chunks=[];if(options.body)for await(const c of options.body)chunks.push(Buffer.from(c));const bytes=Buffer.concat(chunks);let result;
  if(options.path.endsWith('/upload-token'))result={jwt:'e30.'+Buffer.from('{}').toString('base64url')+'.x'};
  else if(options.path.endsWith('/check-missing'))result=[];
  else if(options.path.endsWith('/upsert-hashes'))result={};
  else if(options.path.endsWith('/deployments')){
   postCount++;events.push('post');const posted=await new Response(bytes,{headers:{'content-type':options.headers['content-type']}}).formData();const worker=posted.get('_worker.bundle');const raw=Buffer.from(await worker.arrayBuffer());
   const boundary=raw.subarray(2,raw.indexOf('\\r\\n')).toString();const parts=await new Response(raw,{headers:{'content-type':'multipart/form-data; boundary='+boundary}}).formData();const metadata=JSON.parse(parts.get('metadata'));const module=parts.get(metadata.main_module);captured.push({rawHash:hash(raw),moduleHash:hash(Buffer.from(await module.arrayBuffer())),bytes:raw.length,submittedSha:posted.get('commit_hash'),outerFileType:worker.type});
   if(mode==='lost')throw Error('PRIVATE_PROVIDER_SENTINEL');
   result={id,environment:'production',created_on:new Date().toISOString(),deployment_trigger:{metadata:{commit_hash:sha}},diagnostic:'PRIVATE_PROVIDER_SENTINEL'};
  }else if(options.path.endsWith('/pages/projects/customvibe-business'))result={production_branch:'main',deployment_configs:{production:{compatibility_date:'2026-06-16'}}};
  else throw Error('Unexpected synthetic path');
  handler.onConnect(()=>{});handler.onHeaders(200,['content-type','application/json'],()=>{},'OK');handler.onData(Buffer.from(JSON.stringify({success:true,result})));handler.onComplete([]);
 })().catch(e=>handler.onError(e));return true;}});
 const config=JSON.parse(await fs.readFile('wrangler.jsonc','utf8')),assetInventory=[];
 for(const path of ['index.html','_headers','_redirects','_routes.json']){const b=await fs.readFile('dist/client/'+path);assetInventory.push({path,sha256:hash(b),bytes:b.length});}
 const expected={sourceSha:sha,runId:'123',sourceInputDigest:'c'.repeat(64),compilerConfigDigest:hash(await fs.readFile(require.resolve('wrangler'))),configDigest:hash(await fs.readFile('wrangler.jsonc')),buildDigest:'c'.repeat(64),assetsDigest:'c'.repeat(64),config,assetInventory,controls:Object.fromEntries(assetInventory.filter(v=>v.path!=='index.html').map(({path,...v})=>[path,v]))};
 const {unstable_pages}=require('wrangler'),proofs=[],returnedMime=[];for(let i=0;i<2;i++){const result=await unstable_pages.deploy({directory:'dist/client',accountId:'4f57d4e924674cb87b33d4c884745cf6',projectName:'customvibe-business',branch:'main',commitHash:sha,commitDirty:false,functionsDirectory:'functions',bundle:true,sourceMaps:false,args:{config:'wrangler.jsonc'}});returnedMime.push(result.formData.get('_worker.bundle').type);proofs.push(await capturePagesUpload(result,expected));}let beforeCount=0,ackClock;
 const rejected=[];let failure='';mode='lost';try{await unstable_pages.deploy({directory:'dist/client',accountId:'4f57d4e924674cb87b33d4c884745cf6',projectName:'customvibe-business',branch:'main',commitHash:sha,commitDirty:false,functionsDirectory:'functions',bundle:true,sourceMaps:false,args:{config:'wrangler.jsonc'}})}catch{failure='Actual uploader failure retained.';}
 console.log(JSON.stringify({proofs,captured,returnedMime,postCount,failure,beforeCount,ackClock,events,rejected}));
 `;
 await writeFile(join(dir,'fixture.mjs'),script);
 const output=execFileSync(process.execPath,[join(dir,'fixture.mjs')],{cwd:dir,encoding:'utf8',stdio:['ignore','pipe','pipe'],env:{PATH:process.env.PATH,TMPDIR:tmpdir(),CLOUDFLARE_API_TOKEN:'PRIVATE_TOKEN_SENTINEL',CLOUDFLARE_ACCOUNT_ID:'4f57d4e924674cb87b33d4c884745cf6',WRANGLER_SEND_METRICS:'false',WRANGLER_WRITE_LOGS:'false',WRANGLER_LOG:'none'}});
 const result=JSON.parse(output);assert.equal(result.postCount,3);assert.equal(result.proofs.length,2);assert.deepEqual(result.returnedMime,['','']);
 for(let i=0;i<2;i++){assert.equal(result.proofs[i].uploadedBundleDigest,result.captured[i].rawHash);assert.equal(result.proofs[i].uploadedBundleBytes,result.captured[i].bytes);assert.equal(result.proofs[i].uploadedModuleInventory[0].sha256,result.captured[i].moduleHash);assert.equal(result.captured[i].submittedSha,sha);assert.equal(result.proofs[i].acknowledgement.id,id);}
 assert.notEqual(result.proofs[0].uploadedBundleDigest,result.proofs[1].uploadedBundleDigest);assert.notEqual(result.proofs[0].uploadedModuleInventory[0].name,result.proofs[1].uploadedModuleInventory[0].name);
 assert.match(result.failure,/Actual uploader failure retained/);assert.doesNotMatch(output,/PRIVATE_|export function|Authorization|Bearer|jwt|diagnostic/);
});

test('post-acknowledgement build failure retains the actual upload receipt and remains unconfirmed',async t=>{
 const f=await fixture(t);await f.run(['plan']);const result=await f.run(['publish','pages'],{UPLOAD_RESULT:'success',ACK_THEN_MUTATE:'true'});
 assert.equal(result.status,1);assert.equal(result.record.state,'partial');assert.equal(result.record.attempts[0].outcome,'unconfirmed');assert.equal(result.record.completed.pages,undefined);assert.ok(result.record.pagesUploadEvidence);assert.equal(result.record.pagesUploadEvidence.acknowledgement.id,next);assert.equal(result.record.attempts[0].protection.checks[0].expectedId,next);assert.equal(result.record.attempts[0].protection.status,'passed');assert.match(result.calls,/check-deployment.mjs after/);assert.doesNotMatch(result.text+result.stdout+result.stderr,/PRIVATE_/);
});
test('same-source canonical deployment with another acknowledgement ID cannot confirm publication',async t=>{
 const f=await fixture(t);await f.run(['plan']);const result=await f.run(['publish','pages'],{UPLOAD_RESULT:'success',WRONG_ACK_ID:'true'});
 assert.equal(result.status,1);assert.equal(result.record.attempts[0].outcome,'unconfirmed');assert.equal(result.record.completed.pages,undefined);assert.ok(result.record.pagesUploadEvidence);assert.equal(result.record.pagesUploadEvidence.acknowledgement.id,'11111111-1234-1234-1234-123456789abc');assert.match(result.calls,/check-deployment.mjs after/);
});
test('private change across pre-upload snapshot interval is detected at local completion after the Pages write',async t=>{
 const f=await completionFixture(t);await writeFile(join(f.dir,'race-on'),'catalogue');const result=await f.local();
 assert.equal(result.status,1);assert.equal(result.record.state,'partial');assert.equal(result.record.pagesUploadEvidence.acknowledgement.id,next);assert.equal(result.record.finalProtection.checks.length,4);assert.match(result.record.reasons.join('\n'),/LOCAL_VERIFICATION_FAILED/);
});
test('tampered or cross-run downloaded artifact blocks local completion while all final checks still run',async t=>{
 for(const mutate of [f=>f.finalEvidence.githubArtifact.runId='456',f=>f.finalEvidence.githubArtifact.manifestSha256='c'.repeat(64),f=>f.finalEvidence.githubArtifact.conclusion='failure']){
  const f=await completionFixture(t);mutate(f);const result=await f.local();assert.equal(result.status,1);assert.equal(result.record.state,'partial');assert.equal(result.record.finalProtection.checks.length,4);assert.match(result.record.reasons.join('\n'),/LOCAL_VERIFICATION_FAILED/);
 }
});
test('push and stale reviewed source inputs stop before any upload invocation',async t=>{
 const f=await fixture(t);const pushed=await f.run(['plan'],{GITHUB_EVENT_NAME:'push'});assert.equal(pushed.status,1);assert.equal(pushed.uploads,'');
 const evidence=structuredClone(f.evidence);evidence.activationCompatibility.sourceInputDigest='d'.repeat(64);const changed=await f.run(['plan'],{RELEASE_EVIDENCE_JSON:JSON.stringify(evidence)});assert.equal(changed.status,1);assert.match(changed.record.reasons.join('\n'),/ACTIVATION_COMPATIBILITY/);assert.equal(changed.uploads,'');
});

test('local completion preserves original Node22 compiler provenance without claiming local Node24 compiler byte equality',async t=>{
 const f=await completionFixture(t),record=JSON.parse(await readFile(f.path,'utf8'));
 const canonical=value=>JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v),hash=v=>createHash('sha256').update(v).digest('hex');
 record.build.compiler.runtime='v22.23.3';record.build.compiler.files[0].sha256='e'.repeat(64);
 const {compilerConfigDigest,...compiler}=record.build.compiler;record.build.compiler.compilerConfigDigest=hash(canonical(compiler));
 record.activationCompatibility.compilerConfigDigest=record.build.compiler.compilerConfigDigest;
 const {integrityDigest,...proof}=record.pagesUploadEvidence;proof.compilerConfigDigest=record.build.compiler.compilerConfigDigest;record.pagesUploadEvidence={...proof,integrityDigest:hash(canonical(proof))};
 const snapshot=Object.fromEntries(['mandatoryValidation','sourceSha','repository','workflow','runAttempt','planComplete','baseSha','beforePagesSourceSha','before','required','schemas','paths','archivedRelease','sourceDigests','schemaSources','build','activationCompatibility','evidence'].map(k=>[k,record[k]]));
 record.prewriteValidation.snapshotDigest=hash(canonical(snapshot));const {integrityDigest:oldStamp,...stamp}=record.prewriteValidation;record.prewriteValidation.integrityDigest=hash(canonical(stamp));record.attempts[0].prewriteValidationDigest=record.prewriteValidation.integrityDigest;
 await writeFile(f.path,JSON.stringify(record));f.finalEvidence.githubArtifact.manifestSha256=hash(await readFile(f.path));
 const result=await f.local();assert.equal(result.status,0);assert.equal(result.record.state,'verified');assert.equal(result.record.build.compiler.runtime,'v22.23.3');assert.equal(result.record.pagesUploadEvidence.compilerConfigDigest,record.build.compiler.compilerConfigDigest);
});

test('valid acknowledgement survives actual CLI multipart or metadata failure and binds all later protection without retry',async t=>{
 for(const payload of ['multipart','metadata']){
  const f=await fixture(t);assert.equal((await f.run(['plan'])).status,0);
  const result=await f.run(['publish','pages'],{UPLOAD_RESULT:'success',BAD_UPLOAD_PAYLOAD:payload});
  assert.equal(result.status,1);assert.equal(result.record.state,'partial');assert.equal(result.record.attempts[0].outcome,'unconfirmed');
  assert.equal(result.record.attempts[0].acknowledgement?.id,next);assert.equal(result.record.attempts[0].acknowledgement.sourceSha,sha);
  assert.deepEqual(Object.keys(result.record.attempts[0].acknowledgement).sort(),['createdAt','environment','id','sourceSha']);
  assert.equal(result.record.pagesUploadEvidence,undefined);assert.equal(result.record.completed.pages,undefined);assert.equal(result.record.attempts[0].protection.status,'passed');assert.equal(result.record.attempts[0].protection.checks[0].expectedId,next);
  assert.equal(result.uploads.trim().split('\n').length,1);assert.doesNotMatch(result.text+result.stdout+result.stderr,/PRIVATE_|export default|formData/);
  const final=await f.run(['finish']);assert.equal(final.status,1);assert.equal(final.record.state,'partial');assert.equal(final.record.finalProtection.checks[0].expectedId,next);assert.equal(final.record.finalProtection.status,'passed');assert.equal(final.uploads.trim().split('\n').length,1);assert.match(final.record.reasons.join('\n'),/PUBLICATION_FAILED/);
 }
});

async function archiveFixture(t){
 const completed=await completionFixture(t),done=await completed.local();assert.equal(done.status,0);
 const record=done.record,dir=await fixture(t),candidate='c'.repeat(40),newId='11111111-1234-1234-1234-123456789abc',archivePath='docs/releases/2026-10-20-release-M.json';
 await mkdir(join(dir.dir,'docs/releases'),{recursive:true});await writeFile(join(dir.dir,archivePath),JSON.stringify(record,null,2)+'\n');
 const hash=v=>createHash('sha256').update(v).digest('hex');
 const evidence={sourceSha:candidate,baseline:{...record,reviewed:true,evidenceUrl:`https://github.com/TIMMMYYYHHHH/Customvibev3/blob/${candidate}/${archivePath}`},archivedRelease:{origin:'reviewed-complete-release-archive',reviewed:true,path:archivePath,sha256:hash(await readFile(join(dir.dir,archivePath))),sourceSha:sha,reviewedAgainstSha:candidate}};
 const env={FIXTURE_SOURCE_SHA:candidate,FIXTURE_BASE_SHA:sha,FIXTURE_BEFORE_ID:next,FIXTURE_NEXT_ID:newId,GITHUB_SHA:candidate,REVIEWED_SHA:candidate,GITHUB_RUN_ID:'456',CHANGED_PATH:archivePath};
 const seeded=await dir.run(['plan'],{...env,RELEASE_EVIDENCE_JSON:JSON.stringify(evidence)});assert.ok(seeded.record.build);
 const build=seeded.record.build;evidence.activationCompatibility={basis:'source-input-tooling-only-v1',reviewedAgainstSha:candidate,baselineSha:sha,observedAt:new Date().toISOString(),sourceInputDigest:build.sourceInputDigest,compilerConfigDigest:build.compiler.compilerConfigDigest,configDigest:build.compiler.configDigest,pagesBuildDigest:build.pages.sha256,adminAssetsDigest:build.admin.sha256,historicalFunctionsDigest:null};
 return {...dir,record,evidence,env,candidate,newId,archivePath,async runArchive(args,extra={}){return dir.run(args,{...env,RELEASE_EVIDENCE_JSON:JSON.stringify(evidence),...extra});}};
}
test('real CLI completes M before genuine archive N and accepts manual N dispatch without source relabelling or archive push publication',async t=>{
 const f=await archiveFixture(t);
 const pushed=await f.runArchive(['plan'],{GITHUB_EVENT_NAME:'push'});assert.equal(pushed.status,1);assert.equal(pushed.uploads,'');
 const planned=await f.runArchive(['plan']);assert.equal(planned.status,0,planned.record.reasons.join('\n'));assert.equal(planned.record.baseSha,sha);assert.equal(planned.record.beforePagesSourceSha,sha);assert.equal(planned.record.archivedRelease.sourceSha,sha);
 const archived=JSON.parse(await readFile(join(f.dir,f.archivePath),'utf8'));assert.equal(archived.state,'verified');assert.equal(archived.sourceSha,sha);assert.equal(archived.components.pages.receipt.sourceSha,sha);assert.equal(archived.workflow.runId,'123');assert.doesNotMatch(JSON.stringify(archived),new RegExp('/blob/'+f.candidate+'/'));assert.equal(archived.pagesUploadEvidence.historicalFunctionsDigest,undefined);
 const dispatched=await f.runArchive(['publish','pages'],{UPLOAD_RESULT:'success'});assert.equal(dispatched.status,0,dispatched.record.reasons.join('\n'));assert.equal(dispatched.record.sourceSha,f.candidate);assert.equal(dispatched.record.completed.pages.id,f.newId);assert.equal(dispatched.record.pagesUploadEvidence.runId,'456');assert.equal(dispatched.record.state,'partial');assert.equal(dispatched.uploads.trim().split('\n').length,1);
});

test('actual CLI rejects untrusted, changed, incomplete or self-referential archives before upload',async t=>{
 const f=await archiveFixture(t),original=await readFile(join(f.dir,f.archivePath)),trusted=structuredClone(f.evidence),hash=v=>createHash('sha256').update(v).digest('hex');
 const mutations=[
  e=>delete e.archivedRelease,e=>e.archivedRelease.reviewed=false,e=>e.archivedRelease.sha256='e'.repeat(64),e=>e.archivedRelease.sourceSha=f.candidate,e=>e.archivedRelease.reviewedAgainstSha=sha,e=>e.archivedRelease.path='docs/releases/ordinary.json',
 ];
 for(const mutate of mutations){const evidence=structuredClone(trusted);mutate(evidence);const result=await f.runArchive(['plan'],{RELEASE_EVIDENCE_JSON:JSON.stringify(evidence)});assert.equal(result.status,1);assert.equal(result.uploads,'');assert.match(result.record.reasons.join('\n'),/PLAN_ARCHIVE_FAILED/);}
 for(const mutate of [r=>r.state='partial',r=>r.components.security.receipt.sourceSha=f.candidate,r=>r.components.pages.receipt.evidenceUrl=`https://github.com/TIMMMYYYHHHH/Customvibev3/blob/${f.candidate}/${f.archivePath}`,r=>r.finalProtection.checks.pop(),r=>r.finalIdentityReadbacks[0].observedId=id,r=>r.providerDiagnostics='PRIVATE_PROVIDER_SENTINEL',r=>r.evidence.body='PRIVATE_CUSTOMER_SENTINEL']){
  const record=JSON.parse(original);mutate(record);const bytes=Buffer.from(JSON.stringify(record));await writeFile(join(f.dir,f.archivePath),bytes);const evidence=structuredClone(trusted);evidence.archivedRelease.sha256=hash(bytes);
  const result=await f.runArchive(['plan'],{RELEASE_EVIDENCE_JSON:JSON.stringify(evidence)});assert.equal(result.status,1);assert.equal(result.uploads,'');assert.match(result.record.reasons.join('\n'),/PLAN_ARCHIVE_FAILED/);assert.doesNotMatch(result.text+result.stdout+result.stderr,/PRIVATE_/);
 }
 const malformed=Buffer.from('{\"private\":\"PRIVATE_BROKEN_JSON_SENTINEL\"');await writeFile(join(f.dir,f.archivePath),malformed);const malformedEvidence=structuredClone(trusted);malformedEvidence.archivedRelease.sha256=hash(malformed);const invalidJson=await f.runArchive(['plan'],{RELEASE_EVIDENCE_JSON:JSON.stringify(malformedEvidence)});assert.equal(invalidJson.status,1);assert.equal(invalidJson.uploads,'');assert.doesNotMatch(invalidJson.text+invalidJson.stdout+invalidJson.stderr,/PRIVATE_/);
 await writeFile(join(f.dir,f.archivePath),original);
 for(const extra of [{ARCHIVE_STATUS:'M'},{ARCHIVE_MODE:'120000'},{ARCHIVE_BLOB:'e'.repeat(40)},{CHANGED_PATH:f.archivePath+'\nsrc/App.jsx'}]){const result=await f.runArchive(['plan'],{RELEASE_EVIDENCE_JSON:JSON.stringify(trusted),...extra});assert.equal(result.status,1);assert.equal(result.uploads,'');assert.match(result.record.reasons.join('\n'),/PLAN_ARCHIVE_FAILED/);}
});
test('strict historical manual archive permits unknown Functions bytes and retains original private receipt sources',async t=>{
 const f=await archiveFixture(t),{validateReleaseArchiveRecord}=await import('../scripts/release-manifest.mjs');const record=structuredClone(f.record);
 record.pagesUploadEvidence=null;delete record.prewriteValidation;delete record.completionEvidence;delete record.runAttempt;delete record.attempts;delete record.build;delete record.activationCompatibility;record.historicalFunctionsDigest=null;record.components.security.receipt.sourceSha=old;
 const baseline=structuredClone(record);const result=validateReleaseArchiveRecord(record,{sourceSha:sha,candidateSha:f.candidate,baseline});assert.equal(result.sourceSha,sha);assert.match(result.receiptDigest,/^[a-f0-9]{64}$/);assert.equal(record.pagesUploadEvidence,null);assert.equal(record.components.security.receipt.sourceSha,old);
});
test('invalid acknowledged source, environment or time is not retained or retried after upload',async t=>{
 for(const invalid of ['source','environment','date']){
  const f=await fixture(t);await f.run(['plan']);const result=await f.run(['publish','pages'],{UPLOAD_RESULT:'success',INVALID_ACK:invalid,BAD_UPLOAD_PAYLOAD:'multipart'});
  assert.equal(result.status,1);assert.equal(result.record.state,'partial');assert.equal(result.record.attempts[0].outcome,'unconfirmed');assert.equal(result.record.attempts[0].acknowledgement,undefined);assert.equal(result.record.pagesUploadEvidence,undefined);assert.equal(result.record.completed.pages,undefined);assert.equal(result.uploads.trim().split('\n').length,1);assert.equal(result.record.attempts[0].protection.checks[0].expectedId,id);assert.doesNotMatch(result.text+result.stdout+result.stderr,/PRIVATE_/);
 }
});


test('fresh prewrite survives delayed CI finish without replacing original authorization times',async t=>{
 const f=await fixture(t);assert.equal((await f.run(['plan'])).status,0);
 const uploaded=await f.run(['publish','pages'],{UPLOAD_RESULT:'success'});assert.equal(uploaded.status,0);
 const done=await f.run(['finish'],{CLOCK_SHIFT_MS:'1200000'});
 assert.equal(done.status,0,done.record.reasons.join('\n'));assert.equal(done.record.state,'partial');
 assert.deepEqual(done.record.evidence,uploaded.record.evidence);assert.deepEqual(done.record.prewriteValidation,uploaded.record.prewriteValidation);
 assert.ok(done.record.prewriteValidation);assert.equal(done.uploads.trim().split('\n').length,1);
});
test('Wrangler import delay crossing original freshness window prevents actual invocation',async t=>{
 const f=await fixture(t);assert.equal((await f.run(['plan'])).status,0);
 const done=await f.run(['publish','pages'],{UPLOAD_RESULT:'success',IMPORT_DELAY_MS:'601000'});
 assert.equal(done.status,1);assert.equal(done.uploads,'');assert.equal(done.record.attempts.length,1);
 assert.equal(done.record.attempts[0].invokedAt,undefined);assert.equal(done.record.pagesUploadEvidence,undefined);assert.equal(done.record.attempts[0].outcome,'not-invoked');assert.match(done.record.reasons.join('\n'),/PREWRITE_REJECTED/);
});
test('all-four genuine successful artifact completes after long human delay only with fresh separate final review',async t=>{
 const f=await completionFixture(t,{allFour:true}),original=JSON.parse(await readFile(f.path,'utf8')),later=Date.now()+1200000;
 for(const v of [...Object.values(f.finalEvidence.guards),...Object.values(f.finalEvidence.schema),f.finalEvidence.staged])v.observedAt=new Date(later-1000).toISOString();
 const done=await f.local({CLOCK_SHIFT_MS:'1200000'});assert.equal(done.status,0,done.record.reasons.join('\n'));assert.equal(done.record.state,'verified');
 assert.deepEqual(done.record.evidence,original.evidence);assert.deepEqual(done.record.prewriteValidation,original.prewriteValidation);
 assert.notEqual(done.record.completionEvidence.evidence.staged.observedAt,original.evidence.staged.observedAt);
 assert.deepEqual(done.record.completionEvidence.evidence.staged.rollback,original.evidence.staged.rollback);
 assert.equal(done.record.components.admin.receipt.sourceSha,sha);assert.equal(done.record.components.security.receipt.sourceSha,old);assert.equal(done.record.components.catalogue.receipt.sourceSha,old);
 assert.equal(done.record.finalProtection.checks.length,4);assert.equal(done.uploads.trim().split('\n').length,1);
});
test('intent storage delay is checked before invocation and input cannot supply runner authority',async t=>{
 const f=await fixture(t);await f.run(['plan']);const delayed=await f.run(['publish','pages'],{UPLOAD_RESULT:'success',INTENT_DELAY_MS:'601000'});assert.equal(delayed.status,1);assert.equal(delayed.uploads,'');assert.equal(delayed.record.attempts[0].invokedAt,undefined);
 const rejected=await f.run(['plan'],{RELEASE_EVIDENCE_JSON:JSON.stringify({...f.evidence,prewriteValidation:{checkedAt:new Date().toISOString()}})});assert.equal(rejected.status,1);assert.equal(rejected.uploads,'');
});
test('provider creation after expiry retains actual ack and proof as held partial without retry',async t=>{
 const f=await fixture(t);await f.run(['plan']);const done=await f.run(['publish','pages'],{UPLOAD_RESULT:'success',PROVIDER_DELAY_MS:'601000'});
 assert.equal(done.status,1);assert.equal(done.record.state,'partial');assert.equal(done.record.attempts[0].acknowledgement.id,next);assert.ok(done.record.pagesUploadEvidence);assert.equal(done.record.completed.pages,undefined);assert.equal(done.uploads.trim().split('\n').length,1);
 const stopped=await f.run(['publish','pages'],{UPLOAD_RESULT:'success'});assert.equal(stopped.status,1);assert.equal(stopped.uploads.trim().split('\n').length,1);
});
test('late runner receipt of an in-window provider creation is historical authorization, not a stale write',async t=>{
 const f=await fixture(t);await f.run(['plan']);const done=await f.run(['publish','pages'],{UPLOAD_RESULT:'success',ACK_DELAY_MS:'1200000'});assert.equal(done.status,0,done.record.reasons.join('\n'));assert.equal(done.record.state,'partial');assert.equal(done.record.completed.pages.id,next);
});
test('normal handoff rejects missing stamp, rerun, artifact/job IDs and real step bounds and keeps local failures sticky',async t=>{
 for(const mutate of [f=>delete f.record.prewriteValidation,f=>f.finalEvidence.githubArtifact.runAttempt='2',f=>f.finalEvidence.githubArtifact.artifactId='wrong',f=>f.finalEvidence.githubArtifact.jobId='wrong',f=>f.finalEvidence.githubArtifact.publishStep.startedAt=new Date(Date.now()+60000).toISOString(),f=>f.finalEvidence.githubArtifact.publishStep.completedAt=new Date(Date.now()-60000).toISOString(),f=>f.finalEvidence.githubArtifact.publishStep.extra='PRIVATE_SENTINEL']){
  const f=await completionFixture(t);f.record=JSON.parse(await readFile(f.path,'utf8'));mutate(f);await writeFile(f.path,JSON.stringify(f.record));f.finalEvidence.githubArtifact.manifestSha256=createHash('sha256').update(await readFile(f.path)).digest('hex');
  const done=await f.local();assert.equal(done.status,1);assert.equal(done.record.state,'partial');assert.equal(done.record.finalProtection.checks.length,4);assert.doesNotMatch(done.text+done.stdout+done.stderr,/PRIVATE_/);
  if(!f.record.prewriteValidation){const retry=await f.local();assert.equal(retry.status,1);assert.match(retry.record.reasons.join('\n'),/LOCAL_VERIFICATION_FAILED/);}
 }
});
test('automatic archives cannot omit clocks or serialize private additions in new phase fields',async t=>{
 const f=await archiveFixture(t),{validateReleaseArchiveRecord}=await import('../scripts/release-manifest.mjs');
 for(const mutate of [r=>delete r.prewriteValidation,r=>delete r.completionEvidence,r=>r.prewriteValidation.privatePath='/private/PRIVATE_SENTINEL',r=>r.attempts[0].customer='PRIVATE_SENTINEL',r=>r.githubArtifact.publishStep.raw='PRIVATE_SENTINEL',r=>r.completionEvidence.ddl='PRIVATE_SENTINEL',r=>r.completionEvidence.evidence.schema.content.sql='PRIVATE_SENTINEL',r=>{r.pagesUploadEvidence=null;delete r.prewriteValidation;delete r.completionEvidence;delete r.runAttempt;}]){
  const record=structuredClone(f.record);mutate(record);assert.throws(()=>validateReleaseArchiveRecord(record,{sourceSha:sha,candidateSha:f.candidate,baseline:record}));
 }
});

test('mandatory plan gate cannot be omitted, forged or replaced by legacy modes and never reaches provider guards',async t=>{
 for(const change of ['missing','forged','legacy','unknown']){const f=await fixture(t);if(change==='missing')delete f.evidence.mandatoryValidation;if(change==='forged')f.evidence.mandatoryValidation={origin:'github-public-api',contentDigest:'a'.repeat(64)};if(change==='legacy')f.evidence.mandatoryValidation.origin='owner-attestation';if(change==='unknown')f.evidence.mandatoryValidation.skip=true;const r=await f.run(['plan']);assert.equal(r.status,1);assert.equal(r.uploads,'');assert.equal(r.calls,'');assert.equal(r.requests,'');assert.equal(r.record.planComplete,false);assert.match(r.record.reasons.join(''),/PLAN_MANDATORY_VALIDATION_FAILED/);}
});
test('fixed reader rejects quota, headers, status, media, pagination, duplicate JSON, redirects and network errors without upload or private diagnostics',async t=>{
 for(const failure of ['quota','headers','status','media','pagination','duplicate','redirect','network']){const f=await fixture(t),r=await f.run(['plan'],{FAIL_VALIDATION:failure});assert.equal(r.status,1,failure);assert.equal(r.uploads,'');assert.equal(r.calls,'');assert.equal(r.requests,'');assert.match(r.record.reasons.join(''),/PLAN_MANDATORY_VALIDATION_FAILED/);assert.ok(r.validationRequests.trim().split('\n').length<=13);assert.doesNotMatch(r.text+r.stdout+r.stderr,/PRIVATE_|https:\/\/logs/);}
});
test('invocation requires a fresh internally retrieved matching receipt after the pinned import',async t=>{
 const f=await fixture(t);assert.equal((await f.run(['plan'])).status,0);const r=await f.run(['publish','pages'],{UPLOAD_RESULT:'success',IMPORT_DELAY_MS:'31000'});assert.equal(r.status,0);assert.equal(r.record.prewriteValidation.version,2);assert.equal(r.record.mandatoryValidation.plan.contentDigest,r.record.mandatoryValidation.invocation.contentDigest);assert.ok(Date.parse(r.record.mandatoryValidation.invocation.checkedAt)>=Date.parse(r.record.attempts[0].startedAt)+31000);assert.equal(r.validationRequests.trim().split('\n').length,26);assert.equal(r.uploads.trim(),'official-pages-api');
});

test('real CLI rejects independent required-validation facts with zero uploader calls',async t=>{
 const f=await fixture(t),original=mandatoryCliFixture();
 const mutations=[x=>x.facts.run.repository.private=true,x=>x.facts.run.event='workflow_dispatch',x=>x.facts.run.head_sha=x.selector.checkedMergeSha,x=>x.facts.mergedPull.number=46,x=>x.facts.mergedPull.merged=false,x=>x.facts.mergedPull.merge_commit_sha=old,x=>x.facts.mergedPull.head.sha=old,x=>x.facts.mergedPull.base.ref='other',x=>x.facts.commit.tree.sha=old,x=>x.facts.commit.parents.reverse(),x=>x.facts.workflow.id=1,x=>x.facts.workflow.path='other.yml',x=>x.facts.workflow.state='disabled_manually',x=>x.facts.jobs.jobs[0].id=1,x=>x.facts.check.check_suite.id=1,x=>x.facts.check.app.id=1,x=>x.facts.jobs.jobs[0].steps[7].conclusion='skipped',x=>x.facts.check.conclusion='neutral',x=>x.facts.finalRun.run_attempt=2,x=>x.facts.finalCheck.conclusion='cancelled',x=>x.facts.runs.total_count=2,x=>x.facts.runs.workflow_runs=[],x=>x.facts.runs.workflow_runs[0].run_attempt=2,x=>x.facts.runs.workflow_runs.push({...x.facts.run,id:12,conclusion:'failure'}),x=>x.facts.runs.workflow_runs.push({...x.facts.run,id:12,status:'queued',conclusion:null}),x=>x.facts.runs.workflow_runs.push({...x.facts.run,id:12,conclusion:'cancelled'}),x=>x.facts.runs.workflow_runs.push({...x.facts.run,id:12,run_attempt:2,created_at:'2026-10-19T10:00:00Z'}),x=>x.facts.runs.workflow_runs.push({...x.facts.run,id:12,run_started_at:null}),x=>x.facts.log=x.facts.log.replace('refs/remotes/pull/45/merge','refs/remotes/pull/46/merge'),x=>x.facts.log=x.facts.log.replace('git checkout --progress --force refs/remotes/pull/45/merge','git checkout --progress --force other'),x=>x.facts.log=x.facts.log.replace('# skipped 0','# skipped 1'),x=>x.facts.log+='\n# tests 566',x=>x.facts.log=x.facts.log.replace('\nOK',''),x=>x.facts.log=x.facts.log.slice(0,-150),x=>x.facts.rules=[]];
 for(const mutate of mutations){const x=structuredClone(original);mutate(x);await writeFile(join(f.dir,'mandatory.json'),JSON.stringify(x));await writeFile(join(f.dir,'validation-calls.log'),'');const r=await f.run(['plan']);assert.equal(r.status,1,mutate.toString());assert.equal(r.uploads,'');assert.equal(r.calls,'');assert.equal(r.requests,'');assert.equal(r.record.attempts,undefined);assert.equal(r.record.planComplete,false);assert.ok(r.validationRequests.trim().split('\n').length<=13);assert.doesNotMatch(r.text+r.stdout+r.stderr,/PRIVATE_|https:\/\/logs/);}
});
test('actual publisher and actual captured compiler patch mismatches cannot be replaced by selector agreement',async t=>{
 const f=await fixture(t);for(const extra of [{PUBLISHER_RUNTIME:'v22.23.4'},{PUBLISHER_RUNTIME:'v24.0.0'},{COMPILER_RUNTIME:'v22.23.4'}]){const r=await f.run(['plan'],extra);assert.equal(r.status,1);assert.equal(r.uploads,'');assert.equal(r.record.planComplete,false);assert.match(r.record.reasons.join(''),/PLAN_MANDATORY_VALIDATION_FAILED/);}
});
test('delay after invocation verification beyond 30 seconds rejects before actual API invocation',async t=>{
 const f=await fixture(t);assert.equal((await f.run(['plan'])).status,0);const r=await f.run(['publish','pages'],{UPLOAD_RESULT:'success',POST_VALIDATION_DELAY_MS:'30001'});assert.equal(r.status,1);assert.equal(r.uploads,'');assert.equal(r.record.attempts[0].outcome,'not-invoked');assert.equal(r.record.prewriteValidation,undefined);
});
