// Exercise real CLI state transitions. Process/provider shims are child-only and synthetic.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readdir,writeFile,mkdir,readFile,rm,copyFile,chmod,realpath} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
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
 const job={id:118568540207,run_id:run.id,run_attempt:1,head_sha:head,name:'Node 22 build and fixture tests',status:'completed',conclusion:'success',started_at:'2026-10-20T10:01:42Z',completed_at:'2026-10-20T10:09:38Z',steps,url:'https://api.github.com/repos/TIMMMYYYHHHH/Customvibev3/actions/jobs/118568540207',run_url:'https://api.github.com/repos/TIMMMYYYHHHH/Customvibev3/actions/runs/39404961304',html_url:'https://github.com/TIMMMYYYHHHH/Customvibev3/actions/runs/39404961304/job/118568540207',check_run_url:'https://api.github.com/repos/TIMMMYYYHHHH/Customvibev3/check-runs/118568540207'};
 const log=['##[group]Operating System','Ubuntu','##[endgroup]','##[group]'+checkout,'##[endgroup]','##[group]Fetching the repository','[command]/usr/bin/git -c protocol.version=2 fetch --no-tags --prune --no-recurse-submodules --depth=1 origin +'+merge+':refs/remotes/pull/45/merge','##[endgroup]','##[group]Checking out the ref','[command]/usr/bin/git checkout --progress --force refs/remotes/pull/45/merge','##[endgroup]','[command]/usr/bin/git log -1 --format=%H',merge,'##[group]'+setup,'##[endgroup]','node: v22.23.3','##[group]Run npm ci','##[endgroup]','##[group]Run npm test','##[endgroup]','# tests 566','# suites 0','# pass 566','# fail 0','# cancelled 0','# skipped 0','# todo 0','# duration_ms 1','##[group]Run python3 -B -m unittest discover tests/python','##[endgroup]','.......','----------------------------------------------------------------------','Ran 7 tests in 0.001s','','OK','##[group]Post job cleanup.','##[endgroup]'].join('\n');
 const selector={version:1,origin:'owner-selected-github-validation',reviewed:true,repository:repo.full_name,repositoryId:repo.id,candidateSha:candidate,candidateTreeSha:tree,pullRequestNumber:45,prHeadSha:head,prBaseSha:base,checkedMergeSha:merge,checkedTreeSha:tree,workflowId:run.workflow_id,workflowPath:run.path,workflowSha256:'1021fd8f5c961d5e65b49a91e7870c339015f57c5e2b681a44cbaa4d225e2389',runId:run.id,runAttempt:1,jobId:job.id,checkRunId:job.id,checkSuiteId:987,url:run.html_url,nodeVersion:'v22.23.3',nodeTests:566,pythonTests:7,originalJobLogSha256:createHash('sha256').update(log).digest('hex'),ownerProofSha256:'d'.repeat(64)};
 const check={id:job.id,name:job.name,status:'completed',conclusion:'success',head_sha:head,app:{id:15368},check_suite:{id:987},started_at:job.started_at,completed_at:job.completed_at};
 const facts={workflow:{id:run.workflow_id,path:run.path,state:'active'},run,attempt:structuredClone(run),jobs:{total_count:1,jobs:[job]},check,commit:{sha:merge,tree:{sha:tree},parents:[{sha:base},{sha:head}]},mergedPull:{number:45,merged:true,merge_commit_sha:candidate,head:{sha:head,repo},base:{ref:'main',sha:'f'.repeat(40),repo}},rules:[{type:'required_status_checks',ruleset_id:25416396,parameters:{required_status_checks:[{context:job.name,integration_id:15368}]}}],log,runs:{total_count:1,workflow_runs:[structuredClone(run)]},finalRun:structuredClone(run),finalCheck:structuredClone(check)};
 return {selector,facts,local:{sourceSha:candidate,treeSha:tree,parents:[base,head],workflowSha256:selector.workflowSha256,publisherRuntime:'v22.23.3',compilerRuntime:'v22.23.3'},checkedAt:'2026-10-20T10:10:00.000Z'};
}

const preload=`
const cp=require('node:child_process'),fs=require('node:fs'),originalExec=cp.execFileSync;
const actualVersion=process.version;Object.defineProperty(process,'version',{get:()=>process.env.PUBLISHER_RUNTIME||(process.env.COMPILER_RUNTIME&&global.__apiCalls>=13?process.env.COMPILER_RUNTIME:actualVersion)});
const RealDate=Date;global.__clockShift=Number(process.env.CLOCK_SHIFT_MS||0);global.Date=class extends RealDate{constructor(...args){if(!args.length&&global.__delayNextDate){global.__delayNextDate=false;global.__clockShift+=Number(process.env.POST_VALIDATION_DELAY_MS||0);}super(...(args.length?args:[RealDate.now()+global.__clockShift]));}static now(){return RealDate.now()+global.__clockShift;}toISOString(){const result=super.toISOString();if(global.__apiCalls===13&&process.env.PARSE_DELAY_MS&&!global.__parseDelayed){global.__parseDelayed=true;global.__clockShift+=Number(process.env.PARSE_DELAY_MS);}if(global.__afterValidationClock){global.__afterValidationClock=false;global.__delayNextDate=true;}return result;}};
const sha=process.env.FIXTURE_SOURCE_SHA||'${sha}',old=process.env.FIXTURE_BASE_SHA||'${old}',id=process.env.FIXTURE_BEFORE_ID||'${id}',next=process.env.FIXTURE_NEXT_ID||'${next}';
cp.execFileSync=(program,args)=>{
 if(program==='git'){
  if(args[0]==='-C')args=args.slice(2);
  if(process.env.PRESENTATION_GIT&&(args[0]==='ls-tree'||args[0]==='grep'||(args[0]==='show'&&!args.includes('--format=%P')&&!String(args.at(-1)).endsWith(':.github/workflows/validate.yml'))||(args[0]==='rev-parse'&&String(args.at(-1)).includes(':')))){const mapped=args.map(v=>String(v).replaceAll(sha,process.env.PRESENTATION_SOURCE).replaceAll(old,process.env.PRESENTATION_BASE));return originalExec('git',mapped,{cwd:process.env.PRESENTATION_GIT,encoding:'utf8',stdio:['ignore','pipe','pipe']});}
  if(args[0]==='status')return '';
  if(args[0]==='diff'&&args[1]==='--name-status')return (process.env.ARCHIVE_STATUS||'A')+'\\t'+args.at(-1);
  if(args[0]==='diff')return process.env.CHANGED_PATH||'docs/release-process.md';
  if(args[0]==='merge-base')return args[1]===args[2]?args[1]:old;
  if(args[0]==='ls-tree'&&args[1]!=='-r'&&args.at(-1)==='docs/dependency-maintenance.md'&&process.env.RECOVERY_DOC_BEFORE)return '100644 blob '+(args[1]===old?process.env.RECOVERY_DOC_BEFORE:process.env.RECOVERY_DOC_AFTER)+'\\t'+args.at(-1);
  if(args[0]==='ls-tree'&&args[1]!=='-r'){const file=args.at(-1),bytes=fs.readFileSync(file),blob=require('node:crypto').createHash('sha1').update(Buffer.concat([Buffer.from('blob '+bytes.length+'\\0'),bytes])).digest('hex');return (process.env.ARCHIVE_MODE||'100644')+' blob '+(process.env.ARCHIVE_BLOB||blob)+'\\t'+file;}
  if(args[0]==='show'&&args.includes('--format=%P'))return old+' '+(process.env.FIXTURE_PR_HEAD_SHA||'e'.repeat(40));
  if(args[0]==='show'&&String(args.at(-1)).endsWith(':.github/workflows/validate.yml'))return fs.readFileSync('validate.yml');
  if(args[0]==='rev-parse'&&String(args.at(-1)).endsWith('^{tree}'))return 'd9ebd59f26e2fea7ef82e5e2831cb66851a5ae1a';
  if(args[0]==='show')return 'export default {};';
  if(args[0]==='ls-tree')return 'security/index.mjs\\ncatalogue/index.mjs\\nserver/proof-api.mjs';
  return sha;
 }
 if(program==='gh'){if(args.at(-1).includes('/actions/runs?'))return JSON.stringify({total_count:0,workflow_runs:[]});if(process.env.AMBIENT_GH_HOST_PROBE==='true'&&!(args.includes('--hostname')&&args[args.indexOf('--hostname')+1]==='github.com'))throw Error('PRIVATE_AMBIENT_HOST_SENTINEL');fs.appendFileSync('context-calls.log','current-main\\n');if(process.env.FAIL_CONTEXT==='true')throw Error('${marker}');return JSON.stringify({object:{sha:process.env.DRIFT==='true'?old:sha}});}
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

const fsp=require('node:fs/promises'),realRead=fsp.readFile,realWrite=fsp.writeFile;fsp.readFile=async(path,...rest)=>{const value=await realRead(path,...rest);if(String(path)==='dist/release/release-manifest.json'&&process.env.RECOVERY_FINAL_READ_DELAY_MS)global.__clockShift+=Number(process.env.RECOVERY_FINAL_READ_DELAY_MS);return value;};fsp.writeFile=async(path,data,...rest)=>{const out=await realWrite(path,data,...rest);if(String(path).endsWith('release-manifest.json')&&process.env.INTENT_DELAY_MS){const r=JSON.parse(String(data));if(r.attempts?.length===1&&!r.attempts[0].invokedAt)global.__clockShift+=Number(process.env.INTENT_DELAY_MS);}return out;};
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
 if(String(url).startsWith('https://api.github.com/')||String(url).startsWith('https://results-receiver.actions.githubusercontent.com/')){
  const f=JSON.parse(fs.readFileSync('mandatory.json')),s=f.selector,v=f.facts;global.__apiCalls=(global.__apiCalls||0)+1;
  if(options.method!=='GET'||options.headers?.Cookie||options.headers?.Referer)throw Error('Unexpected request');
  if(process.env.REQUIRE_NATIVE_AUTH==='true'){const download=String(url).startsWith('https://results-receiver.actions.githubusercontent.com/');if(download?options.headers?.Authorization!==undefined:options.headers?.Authorization!=='Bearer '+process.env.GH_TOKEN)throw Error('Synthetic auth boundary rejected');fs.appendFileSync('auth-boundary.log',download?'download-clean\\n':'fixed-api-native\\n');}
  fs.appendFileSync('validation-calls.log',String(url).startsWith('https://results-receiver.actions.githubusercontent.com/')?'log-download\\n':String(url)+'\\n');
  const base='https://api.github.com/repos/TIMMMYYYHHHH/Customvibev3/';const routes={
   ['actions/workflows/'+s.workflowId]:v.workflow,['actions/runs/'+s.runId]:global.__apiCalls>11?v.finalRun:v.run,['actions/runs/'+s.runId+'/attempts/'+s.runAttempt]:v.attempt,['actions/runs/'+s.runId+'/attempts/'+s.runAttempt+'/jobs?per_page=100']:v.jobs,['check-runs/'+s.checkRunId]:global.__apiCalls>12?v.finalCheck:v.check,['git/commits/'+s.checkedMergeSha]:v.commit,['pulls/'+s.pullRequestNumber]:v.mergedPull,['rules/branches/main']:v.rules,['actions/workflows/'+s.workflowId+'/runs?event=pull_request&head_sha='+s.prHeadSha+'&per_page=100']:v.runs};
  if(process.env.FAIL_VALIDATION==='network')throw Error('PRIVATE_NETWORK_SENTINEL');
  if(process.env.FAIL_VALIDATION==='echo')throw Error('PRIVATE_ECHO '+process.env.GH_TOKEN+' https://results-receiver.actions.githubusercontent.com/PRIVATE_SIGNED_SENTINEL');
  if(process.env.FAIL_VALIDATION==='deadline')global.__clockShift+=31000;
  const headers={'content-type':'application/json','x-ratelimit-remaining':String(process.env.FAIL_VALIDATION==='quota'?0:60-global.__apiCalls),'x-ratelimit-reset':String(global.__rateReset??=(Math.floor(Date.now()/1000)+3600))};
  if(process.env.FAIL_VALIDATION==='huge-quota')headers['x-ratelimit-remaining']='999999999999999999999999999999999999';
  if(process.env.FAIL_VALIDATION==='huge-reset')headers['x-ratelimit-reset']='999999999999999999999999999999999999';
  if(process.env.FAIL_VALIDATION==='changing-reset')headers['x-ratelimit-reset']=String(Math.floor(Date.now()/1000)+3600+global.__apiCalls);
  if(process.env.FAIL_VALIDATION==='late-quota'&&global.__apiCalls===11)headers['x-ratelimit-remaining']='0';
  if(process.env.FAIL_VALIDATION==='headers')delete headers['x-ratelimit-remaining'];
  if(process.env.FAIL_VALIDATION==='media')headers['content-type']='text/html';
  if(process.env.FAIL_VALIDATION==='pagination')headers.link='<https://api.github.com/?page=2>; rel=next';
  if(String(url).startsWith('https://results-receiver.actions.githubusercontent.com/')){headers['content-type']='text/plain';if(process.env.FAIL_VALIDATION==='download-redirect')return new Response(null,{status:302,headers:{location:'https://results-receiver.actions.githubusercontent.com/PRIVATE_SIGNED_SENTINEL'}});return new Response(process.env.FAIL_VALIDATION==='log-size'?'x'.repeat(4194305):v.log,{headers});}
  if(url===base+'actions/jobs/'+s.jobId+'/logs'){headers.location=process.env.REDIRECT_LOCATION||(process.env.FAIL_VALIDATION==='redirect'?'http://logs.invalid/PRIVATE_SIGNED_SENTINEL':'https://results-receiver.actions.githubusercontent.com/temporary');return new Response(null,{status:302,headers});}
  const path=String(url).slice(base.length);if(!(path in routes))throw Error('Unexpected GitHub path');
  if(global.__apiCalls===13&&process.env.POST_VALIDATION_DELAY_MS)global.__afterValidationClock=true;
  return new Response(process.env.FAIL_VALIDATION==='json-size'?'x'.repeat(1048577):process.env.FAIL_VALIDATION==='duplicate'?' {\"id\":1,\"id\":2}':JSON.stringify(routes[path]),{status:process.env.FAIL_VALIDATION==='status'?403:200,headers});
 }

 fs.appendFileSync('request-calls.log',String(url)+'\\n');
 if(!String(url).includes('/pages/projects/customvibe-business'))throw Error('Private request attempted');
 return {ok:true,json:async()=>({success:true,result:{canonical_deployment:{id:fs.existsSync('uploaded')?next:id,latest_stage:{status:'success'},deployment_trigger:{metadata:{commit_hash:fs.existsSync('uploaded')?sha:old}}}}})};
};
`;
async function fixture(t,{presentation=false}={}){
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
 const env={PATH:process.env.PATH,TMPDIR:tmpdir(),GH_TOKEN:'synthetic-native-github-token',GITHUB_ACTIONS:'true',GITHUB_REPOSITORY:baseline.repository,GITHUB_REF:'refs/heads/main',GITHUB_SHA:sha,GITHUB_EVENT_NAME:'workflow_dispatch',REVIEWED_SHA:sha,GITHUB_RUN_ID:'123',GITHUB_RUN_ATTEMPT:'1',CLOUDFLARE_ACCOUNT_ID:'4f57d4e924674cb87b33d4c884745cf6',CLOUDFLARE_API_TOKEN:'synthetic-pages-only-token',WRANGLER_SEND_METRICS:'false',RELEASE_EVIDENCE_JSON:JSON.stringify(evidence)};
 const fixture={dir,path,evidence,extraEnv:{},async run(args,extra={}){
  let result;try{result={status:0,stdout:execFileSync(process.execPath,['--require',join(dir,'preload.cjs'),args[0]==='capture-admin-inputs'?fixture.capture:fixture.cli||cli,...(args[0]==='capture-admin-inputs'?[]:args)],{cwd:dir,env:{...env,RELEASE_EVIDENCE_JSON:JSON.stringify(evidence),...fixture.extraEnv,...extra},encoding:'utf8',stdio:['ignore','pipe','pipe']})};}catch(e){result={status:e.status,stdout:String(e.stdout||''),stderr:String(e.stderr||'')};}
  const text=await readFile(path,'utf8').catch(()=> '{}');
  const log=name=>readFile(join(dir,name),'utf8').catch(()=> '');
  return {...result,text,record:JSON.parse(text),calls:await log('guard-calls.log'),requests:await log('request-calls.log'),uploads:await log('provider-calls.log'),validationRequests:await log('validation-calls.log'),contextCalls:await log('context-calls.log'),authBoundary:await log('auth-boundary.log')};
 }};
 fixture.cli=await coordinatorFixture(dir,{presentation});
 fixture.capture=join(dir,'capture-admin.mjs');await writeFile(fixture.capture,`import {adminAssetManifestInputs} from ${JSON.stringify(pathToFileURL(fixture.cli).href)};import {writeFile} from 'node:fs/promises';await writeFile('captured-admin.json',JSON.stringify(await adminAssetManifestInputs()));`);
 const seed=await fixture.run(['plan']);
 if(!seed.record.build)throw Error('Fixture source/build setup failed: '+seed.record.reasons?.join('; '));
 evidence.activationCompatibility={basis:'source-input-tooling-only-v1',reviewedAgainstSha:sha,baselineSha:old,observedAt:new Date().toISOString(),sourceInputDigest:seed.record.build.sourceInputDigest,compilerConfigDigest:seed.record.build.compiler.compilerConfigDigest,configDigest:seed.record.build.compiler.configDigest,pagesBuildDigest:seed.record.build.pages.sha256,adminAssetsDigest:seed.record.build.admin.sha256,historicalFunctionsDigest:null};
 for(const log of ['guard-calls.log','request-calls.log','provider-calls.log','validation-calls.log','context-calls.log','auth-boundary.log'])await writeFile(join(dir,log),'');
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
 const result=await f.run(['finish-local'],{GITHUB_ACTIONS:'false',GH_TOKEN:'',CLOUDFLARE_API_TOKEN:'',CUSTOMVIBE_MIGRATION_SOCKET:'/synthetic-only',FAIL_CONTEXT:'true',FAIL_GUARDS:'true'});
 assert.equal(result.status,1);assert.equal(result.record.state,'partial');assert.equal(result.record.finalProtection.checks.length,4);
 assert.equal(result.record.finalProtection.checks.filter(v=>v.identityCode==='FINAL_IDENTITY_OBSERVATION_FAILED').length,4);
 for(const name of ['check-deployment','check-admin-deployment','check-security-deployment','check-catalogue-deployment'])assert.match(result.calls,new RegExp(name+'[.]mjs'));
 assert.ok(!result.text.includes(marker));assert.match(result.record.reasons.join('\n'),/LOCAL_VERIFICATION_FAILED/);
});


// Real final guard programs run against synthetic metadata. The parent CLI's
// existing helper transport is simulated at the socket boundary, with no socket
// listener and no network. The race starts after its initial version readback.
async function completionFixture(t,{allFour=false,presentation=false,planOnly=false,adminManifest=false}={}){
 if(presentation)allFour=true;
 const f=await fixture(t,{presentation}),root=fileURLToPath(new URL('../',import.meta.url));
 const hash=value=>createHash('sha256').update(value).digest('hex');
 const adminData=adminManifest?await adminInputFixture(f):undefined;
 const components={};
 for(const c of ['admin','security','catalogue']){
  await mkdir(join(f.dir,'dist/release/private',c),{recursive:true});await writeFile(join(f.dir,'dist/release/private',c,'worker.js'),adminManifest&&c==='admin'?'fixture-admin-candidate':'fixture-worker');
  components[c]={runtimeDigest:hash(JSON.stringify([['worker.js',hash(adminManifest&&c==='admin'?'fixture-admin-candidate':'fixture-worker')]])),configDigest:hash(await readFile(join(f.dir,`wrangler.${c}.jsonc`)))};
 }
 if(adminManifest){const capture=await f.run(['capture-admin-inputs']);assert.equal(capture.status,0,capture.stderr);components.admin.assetManifest=JSON.parse(await readFile(join(f.dir,'captured-admin.json'),'utf8'));}
 await writeFile(join(f.dir,'dist/release/private-build-manifest.json'),JSON.stringify({sourceSha:sha,components}));
 const evidence={...f.evidence,guards:Object.fromEntries(['admin','security','catalogue'].map(c=>[c,{id}]))};
 let source=preload.replace('cp.execFileSync=(program,args)=>{','const actualExec=cp.execFileSync;cp.execFileSync=(program,args,options={})=>{');
 const a=source.indexOf(' if(program===process.execPath){'),b=source.indexOf("\n throw Error('Unexpected process');",a);
 source=source.slice(0,a)+`
 if(program===process.execPath){
  fs.appendFileSync('guard-calls.log',args.join(' ')+'\\n');
  if(process.env.FAIL_GUARD_INVOCATION==='true')throw Error('synthetic guard invocation failure');
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
 if(String(url).startsWith('https://api.github.com/')||String(url).startsWith('https://results-receiver.actions.githubusercontent.com/')){
  const f=JSON.parse(fs.readFileSync('mandatory.json')),s=f.selector,v=f.facts;global.__apiCalls=(global.__apiCalls||0)+1;
  if(options.method!=='GET'||options.headers?.Cookie||options.headers?.Referer)throw Error('Unexpected request');
  if(process.env.REQUIRE_NATIVE_AUTH==='true'){const download=String(url).startsWith('https://results-receiver.actions.githubusercontent.com/');if(download?options.headers?.Authorization!==undefined:options.headers?.Authorization!=='Bearer '+process.env.GH_TOKEN)throw Error('Synthetic auth boundary rejected');fs.appendFileSync('auth-boundary.log',download?'download-clean\\n':'fixed-api-native\\n');}
  fs.appendFileSync('validation-calls.log',String(url).startsWith('https://results-receiver.actions.githubusercontent.com/')?'log-download\\n':String(url)+'\\n');
  const base='https://api.github.com/repos/TIMMMYYYHHHH/Customvibev3/';const routes={
   ['actions/workflows/'+s.workflowId]:v.workflow,['actions/runs/'+s.runId]:global.__apiCalls>11?v.finalRun:v.run,['actions/runs/'+s.runId+'/attempts/'+s.runAttempt]:v.attempt,['actions/runs/'+s.runId+'/attempts/'+s.runAttempt+'/jobs?per_page=100']:v.jobs,['check-runs/'+s.checkRunId]:global.__apiCalls>12?v.finalCheck:v.check,['git/commits/'+s.checkedMergeSha]:v.commit,['pulls/'+s.pullRequestNumber]:v.mergedPull,['rules/branches/main']:v.rules,['actions/workflows/'+s.workflowId+'/runs?event=pull_request&head_sha='+s.prHeadSha+'&per_page=100']:v.runs};
  if(process.env.FAIL_VALIDATION==='network')throw Error('PRIVATE_NETWORK_SENTINEL');
  if(process.env.FAIL_VALIDATION==='echo')throw Error('PRIVATE_ECHO '+process.env.GH_TOKEN+' https://results-receiver.actions.githubusercontent.com/PRIVATE_SIGNED_SENTINEL');
  if(process.env.FAIL_VALIDATION==='deadline')global.__clockShift+=31000;
  const headers={'content-type':'application/json','x-ratelimit-remaining':String(process.env.FAIL_VALIDATION==='quota'?0:60-global.__apiCalls),'x-ratelimit-reset':String(global.__rateReset??=(Math.floor(Date.now()/1000)+3600))};
  if(process.env.FAIL_VALIDATION==='huge-quota')headers['x-ratelimit-remaining']='999999999999999999999999999999999999';
  if(process.env.FAIL_VALIDATION==='huge-reset')headers['x-ratelimit-reset']='999999999999999999999999999999999999';
  if(process.env.FAIL_VALIDATION==='changing-reset')headers['x-ratelimit-reset']=String(Math.floor(Date.now()/1000)+3600+global.__apiCalls);
  if(process.env.FAIL_VALIDATION==='late-quota'&&global.__apiCalls===11)headers['x-ratelimit-remaining']='0';
  if(process.env.FAIL_VALIDATION==='headers')delete headers['x-ratelimit-remaining'];
  if(process.env.FAIL_VALIDATION==='media')headers['content-type']='text/html';
  if(process.env.FAIL_VALIDATION==='pagination')headers.link='<https://api.github.com/?page=2>; rel=next';
  if(String(url).startsWith('https://results-receiver.actions.githubusercontent.com/')){headers['content-type']='text/plain';if(process.env.FAIL_VALIDATION==='download-redirect')return new Response(null,{status:302,headers:{location:'https://results-receiver.actions.githubusercontent.com/PRIVATE_SIGNED_SENTINEL'}});return new Response(process.env.FAIL_VALIDATION==='log-size'?'x'.repeat(4194305):v.log,{headers});}
  if(url===base+'actions/jobs/'+s.jobId+'/logs'){headers.location=process.env.REDIRECT_LOCATION||(process.env.FAIL_VALIDATION==='redirect'?'http://logs.invalid/PRIVATE_SIGNED_SENTINEL':'https://results-receiver.actions.githubusercontent.com/temporary');return new Response(null,{status:302,headers});}
  const path=String(url).slice(base.length);if(!(path in routes))throw Error('Unexpected GitHub path');
  if(global.__apiCalls===13&&process.env.POST_VALIDATION_DELAY_MS)global.__afterValidationClock=true;
  return new Response(process.env.FAIL_VALIDATION==='json-size'?'x'.repeat(1048577):process.env.FAIL_VALIDATION==='duplicate'?' {\"id\":1,\"id\":2}':JSON.stringify(routes[path]),{status:process.env.FAIL_VALIDATION==='status'?403:200,headers});
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
 if(presentation)Object.assign(f.extraEnv,await presentationGitFixture(f.dir));
 const planned=await f.run(['plan'],{RELEASE_EVIDENCE_JSON:JSON.stringify(evidence)});
 if(presentation){assert.equal(planned.status,1);assert.ok(planned.record.build,planned.record.reasons.join('\n'));assert.match(planned.record.reasons.join('\n'),/ACTIVATION_COMPATIBILITY/);}
 else assert.equal(planned.status,0,JSON.stringify(planned));
 if(allFour){
  const r=planned.record,observedAt=new Date().toISOString(),account='4f57d4e924674cb87b33d4c884745cf6';evidence.guards={};evidence.receipts={};evidence.schema={};
  for(const c of ['admin','security','catalogue']){evidence.guards[c]={account,component:c,id,origin:'private-helper-get',candidateSha:sha,observedAt,protection:'passed'};if(c!=='admin')evidence.receipts[c]={account,component:c,id,sourceSha:old,sourceDigest:r.sourceDigests[c],...components[c],origin:'guarded-upload',evidenceUrl:'https://github.com/TIMMMYYYHHHH/Customvibev3/actions/runs/100',observedAt};}
  for(const family of ['security','content']){const item=r.schemaSources[family];evidence.schema[family]={origin:'console-metadata',databaseId:item.databaseId,reviewedAgainstSha:sha,observedAt,sourceFiles:item.source,applied:item.source.map(v=>v.name),objectsDigest:'c'.repeat(64),ddlReviewed:true};}
  const baselineRuntime=adminManifest?hash(JSON.stringify([['worker.js',hash('fixture-worker')]])):components.admin.runtimeDigest;
  const baselineAssets=adminManifest?hash('genuine retained baseline Admin assets'):r.build.admin.sha256;
  evidence.staged={reviewedAgainstSha:sha,observedAt,clientPairCompatibleWithSchema:true,rollback:{pagesId:id,adminId:id,sourceSha:old,pagesBuildDigest:r.build.pages.sha256,adminAssetsDigest:baselineAssets,adminRuntimeDigest:baselineRuntime,adminConfigDigest:components.admin.configDigest}};
  if(presentation){
   evidence.baseline={schemaVersion:2,repository:evidence.baseline.repository,state:'verified',sourceSha:old,baseSha:old,reviewed:true,evidenceUrl:evidence.baseline.evidenceUrl,prerequisites:{complete:true},guards:{protection:'passed'},components:Object.fromEntries(['pages','admin','security','catalogue'].map(c=>[c,{receipt:{account,component:c,id,sourceSha:old,sourceDigest:r.sourceDigests[c],origin:'guarded-upload',evidenceUrl:evidence.baseline.evidenceUrl,observedAt,...(components[c]?{runtimeDigest:c==='admin'?baselineRuntime:components[c].runtimeDigest,configDigest:components[c].configDigest}:{}),...(c==='admin'?{assetsDigest:baselineAssets}:{})}}]))};
   evidence.activationCompatibility={...evidence.activationCompatibility,basis:'reviewed-public-presentation-v1',adminAssetsDigest:r.build.admin.sha256,sourceInputDigest:r.build.sourceInputDigest,baselineSourceInputDigest:r.build.baselineSourceInputDigest,presentation:r.build.presentation};
   if(adminManifest)evidence.activationCompatibility.adminAssetManifest={basis:'reviewed-admin-asset-manifest-v1',baseline:{sourceSha:old,id,runtimeDigest:baselineRuntime,configDigest:components.admin.configDigest,assetsDigest:baselineAssets,manifestSha256:adminData.policy.baselineManifestSha256},candidate:{sourceSha:sha,runtimeDigest:components.admin.runtimeDigest,configDigest:components.admin.configDigest,...components.admin.assetManifest}};
  }
  const full=await f.run(['plan'],{CHANGED_PATH:presentation?f.extraEnv.CHANGED_PATH:'scripts/release-manifest.mjs',RELEASE_EVIDENCE_JSON:JSON.stringify(evidence)});assert.equal(full.status,0,full.record.reasons.join('\n'));assert.equal(full.record.required.length,4);
 }
 if(planOnly)return {...f,originalEvidence:evidence};
 const uploaded=await f.run(['publish','pages'],{UPLOAD_RESULT:'success'});assert.equal(uploaded.status,0);
 if(allFour)await writeFile(join(f.dir,'admin-uploaded'),'synthetic actual Admin acknowledgement');
 const record=uploaded.record,observedAt=new Date().toISOString(),account='4f57d4e924674cb87b33d4c884745cf6';
 const finalEvidence={sourceSha:sha,guards:{},receipts:{},schema:{},...(record.evidence.staged?{staged:structuredClone(record.evidence.staged)}:{})};
 for(const c of ['admin','security','catalogue']){
  finalEvidence.guards[c]={account,component:c,id:allFour&&c==='admin'?next:id,origin:'private-helper-get',candidateSha:sha,observedAt,protection:'passed'};
  finalEvidence.receipts[c]={account,component:c,id:allFour&&c==='admin'?next:id,sourceSha:allFour&&c!=='admin'?old:sha,sourceDigest:record.sourceDigests[c],runtimeDigest:components[c].runtimeDigest,configDigest:components[c].configDigest,...(c==='admin'?{assetsDigest:record.build.admin.sha256}:{}),origin:'guarded-upload',evidenceUrl:'https://github.com/TIMMMYYYHHHH/Customvibev3/actions/runs/123',observedAt};
 }
 for(const family of ['security','content']){const item=record.schemaSources[family];finalEvidence.schema[family]={origin:'console-metadata',databaseId:item.databaseId,reviewedAgainstSha:sha,observedAt,sourceFiles:item.source,applied:item.source.map(v=>v.name),objectsDigest:'c'.repeat(64),ddlReviewed:true};}
 await writeFile(join(f.dir,'guard-calls.log'),'');
 const artifactBytes=await readFile(f.path);finalEvidence.githubArtifact={origin:'owner-github-run-artifact',reviewed:true,sourceSha:sha,runId:'123',url:'https://github.com/TIMMMYYYHHHH/Customvibev3/actions/runs/123',artifactName:'release-manifest-123',runStatus:'completed',conclusion:'success',manifestSha256:hash(artifactBytes),runAttempt:'1',artifactId:'321',jobId:'987',zipSha256:'c'.repeat(64),publishStep:{name:'Publish protected Pages from the reviewed build',number:9,startedAt:record.attempts[0].startedAt,completedAt:new Date().toISOString()}};
 return {...f,originalEvidence:evidence,finalEvidence,local(extra={}){return f.run(['finish-local'],{GITHUB_ACTIONS:'false',GH_TOKEN:'',CLOUDFLARE_API_TOKEN:'',CUSTOMVIBE_MIGRATION_SOCKET:'/synthetic-only',RELEASE_EVIDENCE_JSON:JSON.stringify(finalEvidence),...extra});}};
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
 // Archive N needs its own synthetic matched validation, never M's tuple.
 const mandatory=mandatoryCliFixture(),s=mandatory.selector,head='f'.repeat(40),merge='d'.repeat(40),runId=39404961305,jobId=118568540208,suiteId=988;
 Object.assign(s,{candidateSha:candidate,prBaseSha:sha,prHeadSha:head,checkedMergeSha:merge,pullRequestNumber:46,runId,jobId,checkRunId:jobId,checkSuiteId:suiteId,url:`https://github.com/TIMMMYYYHHHH/Customvibev3/actions/runs/${runId}`});
 for(const run of [mandatory.facts.run,mandatory.facts.attempt,mandatory.facts.finalRun,mandatory.facts.runs.workflow_runs[0]])Object.assign(run,{id:runId,head_sha:head,check_suite_id:suiteId,html_url:s.url});
 Object.assign(mandatory.facts.jobs.jobs[0],{id:jobId,run_id:runId,head_sha:head,url:`https://api.github.com/repos/TIMMMYYYHHHH/Customvibev3/actions/jobs/${jobId}`,run_url:`https://api.github.com/repos/TIMMMYYYHHHH/Customvibev3/actions/runs/${runId}`,html_url:`${s.url}/job/${jobId}`,check_run_url:`https://api.github.com/repos/TIMMMYYYHHHH/Customvibev3/check-runs/${jobId}`});
 for(const check of [mandatory.facts.check,mandatory.facts.finalCheck])Object.assign(check,{id:jobId,head_sha:head,check_suite:{id:suiteId}});
 mandatory.facts.commit={sha:merge,tree:{sha:s.checkedTreeSha},parents:[{sha},{sha:head}]};Object.assign(mandatory.facts.mergedPull,{number:46,merge_commit_sha:candidate});mandatory.facts.mergedPull.head.sha=head;
 mandatory.facts.log=mandatory.facts.log.replaceAll('bc4e80b61dd30338e62f1b922dded516cd250d30',merge).replaceAll('/pull/45/','/pull/46/');s.originalJobLogSha256=hash(mandatory.facts.log);await writeFile(join(dir.dir,'mandatory.json'),JSON.stringify(mandatory));
 const evidence={sourceSha:candidate,mandatoryValidation:s,baseline:{...record,reviewed:true,evidenceUrl:`https://github.com/TIMMMYYYHHHH/Customvibev3/blob/${candidate}/${archivePath}`},archivedRelease:{origin:'reviewed-complete-release-archive',reviewed:true,path:archivePath,sha256:hash(await readFile(join(dir.dir,archivePath))),sourceSha:sha,reviewedAgainstSha:candidate}};
 const env={FIXTURE_SOURCE_SHA:candidate,FIXTURE_PR_HEAD_SHA:head,FIXTURE_BASE_SHA:sha,FIXTURE_BEFORE_ID:next,FIXTURE_NEXT_ID:newId,GITHUB_SHA:candidate,REVIEWED_SHA:candidate,GITHUB_RUN_ID:'456',CHANGED_PATH:archivePath};
 const seeded=await dir.run(['plan'],{...env,RELEASE_EVIDENCE_JSON:JSON.stringify(evidence)});assert.ok(seeded.record.build,seeded.record.reasons?.join('; '));
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
 record.pagesUploadEvidence=null;delete record.prewriteValidation;delete record.completionEvidence;delete record.runAttempt;delete record.attempts;delete record.build;delete record.activationCompatibility;delete record.mandatoryValidation;record.historicalFunctionsDigest=null;record.components.security.receipt.sourceSha=old;
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
 for(const mutate of mutations){const x=structuredClone(original);mutate(x);if(x.facts.runs.workflow_runs.length>1&&x.facts.runs.total_count===1)x.facts.runs.total_count=x.facts.runs.workflow_runs.length;await writeFile(join(f.dir,'mandatory.json'),JSON.stringify(x));await writeFile(join(f.dir,'validation-calls.log'),'');const r=await f.run(['plan']);assert.equal(r.status,1,mutate.toString());assert.equal(r.uploads,'');assert.equal(r.calls,'');assert.equal(r.requests,'');assert.equal(r.record.attempts,undefined);assert.equal(r.record.planComplete,false);assert.ok(r.validationRequests.trim().split('\n').length<=13);assert.doesNotMatch(r.text+r.stdout+r.stderr,/PRIVATE_|https:\/\/logs/);}
});
test('actual publisher and actual captured compiler patch mismatches cannot be replaced by selector agreement',async t=>{
 const f=await fixture(t);for(const extra of [{PUBLISHER_RUNTIME:'v22.23.4'},{PUBLISHER_RUNTIME:'v24.0.0'},{COMPILER_RUNTIME:'v22.23.4'}]){const r=await f.run(['plan'],extra);assert.equal(r.status,1);assert.equal(r.uploads,'');assert.equal(r.record.planComplete,false);assert.match(r.record.reasons.join(''),/PLAN_MANDATORY_VALIDATION_FAILED/);}
});
test('delay after invocation verification beyond 30 seconds rejects before actual API invocation',async t=>{
 const f=await fixture(t);assert.equal((await f.run(['plan'])).status,0);const r=await f.run(['publish','pages'],{UPLOAD_RESULT:'success',POST_VALIDATION_DELAY_MS:'30001'});assert.equal(r.status,1);assert.equal(r.uploads,'');assert.equal(r.record.attempts[0].outcome,'not-invoked');assert.equal(r.record.prewriteValidation,undefined);
});


test('native GH_TOKEN authenticates each fixed evidence GET and never reaches the log download',async t=>{
 const f=await fixture(t);const r=await f.run(['plan'],{REQUIRE_NATIVE_AUTH:'true'});
 assert.equal(r.status,0,r.record.reasons?.join('\n'));
 assert.deepEqual(r.authBoundary.trim().split('\n'),[...Array(9).fill('fixed-api-native'),'download-clean',...Array(3).fill('fixed-api-native')]);
 assert.doesNotMatch(r.text+r.stdout+r.stderr,/synthetic-native-github-token|Bearer /);
});
test('missing native GH_TOKEN cannot fall back to ambient owner auth before plan or publish context',async t=>{
 const f=await fixture(t);
 const missing=await f.run(['plan'],{GH_TOKEN:''});
 assert.equal(missing.status,1);assert.equal(missing.contextCalls,'');assert.equal(missing.validationRequests,'');assert.equal(missing.calls,'');assert.equal(missing.requests,'');assert.equal(missing.uploads,'');
 assert.equal((await f.run(['plan'])).status,0);
 await writeFile(join(f.dir,'context-calls.log'),'');await writeFile(join(f.dir,'validation-calls.log'),'');await writeFile(join(f.dir,'guard-calls.log'),'');await writeFile(join(f.dir,'request-calls.log'),'');
 const rejected=await f.run(['publish','pages'],{GH_TOKEN:''});assert.equal(rejected.status,1);assert.equal(rejected.contextCalls,'');assert.equal(rejected.validationRequests,'');assert.equal(rejected.uploads,'');
});

test('official authenticated quota resets may differ and never require exact bucket decrements',async t=>{
 const f=await fixture(t);const r=await f.run(['plan'],{FAIL_VALIDATION:'changing-reset',REQUIRE_NATIVE_AUTH:'true'});assert.equal(r.status,0);assert.equal(r.validationRequests.trim().split('\n').length,13);
});
test('malicious download origins, extra redirects, echoed credentials, body and aggregate limits fail closed',async t=>{
 const f=await fixture(t);
 const extras=[...['http://results-receiver.actions.githubusercontent.com/PRIVATE_SIGNED_SENTINEL','https://evil.invalid/PRIVATE_SIGNED_SENTINEL','https://api.github.com/repos/other/repo/PRIVATE_SIGNED_SENTINEL','https://user:PRIVATE_SIGNED_SENTINEL@results-receiver.actions.githubusercontent.com/log','https://results-receiver.actions.githubusercontent.com:444/PRIVATE_SIGNED_SENTINEL','https://results-receiver.actions.githubusercontent.com/log#PRIVATE_SIGNED_SENTINEL'].map(REDIRECT_LOCATION=>({REDIRECT_LOCATION})),...['download-redirect','echo','json-size','log-size','deadline','late-quota'].map(FAIL_VALIDATION=>({FAIL_VALIDATION}))];
 for(const extra of extras){await writeFile(join(f.dir,'validation-calls.log'),'');const r=await f.run(['plan'],{...extra,REQUIRE_NATIVE_AUTH:'true'});assert.equal(r.status,1,JSON.stringify(extra));assert.equal(r.uploads,'');assert.equal(r.record.planComplete,false);assert.ok(r.validationRequests.trim().split('\n').length<=13);assert.doesNotMatch(r.text+r.stdout+r.stderr,/PRIVATE_|synthetic-native-github-token|Bearer |https:\/\/results-receiver/);assert.ok(!r.text.includes(createHash('sha256').update('synthetic-native-github-token').digest('hex')));}
});
test('selector and metadata origin forgeries never produce a credential-bearing request to that target',async t=>{
 const f=await fixture(t),original=mandatoryCliFixture();
 const changes=[x=>x.selector.url='https://evil.invalid/PRIVATE_SENTINEL',x=>x.selector.repository='other/repository',x=>x.selector.workflowPath='../other.yml',x=>x.selector.workflowId='1/../../other',x=>x.selector.headers={Authorization:'PRIVATE_SENTINEL'},x=>x.facts.jobs.jobs[0].check_run_url='https://evil.invalid/check-runs/1',x=>x.facts.jobs.jobs[0].check_run_url='https://api.github.com/repos/other/repository/check-runs/1'];
 for(const change of changes){const x=structuredClone(original);change(x);await writeFile(join(f.dir,'mandatory.json'),JSON.stringify(x));f.evidence.mandatoryValidation=x.selector;await writeFile(join(f.dir,'validation-calls.log'),'');const r=await f.run(['plan'],{REQUIRE_NATIVE_AUTH:'true'});assert.equal(r.status,1);assert.equal(r.uploads,'');assert.equal(r.requests,'');assert.doesNotMatch(r.validationRequests,/evil|other|PRIVATE/);assert.doesNotMatch(r.text+r.stdout+r.stderr,/PRIVATE_|synthetic-native-github-token/);}
});
test('unknown top-level evidence credentials or runtime options cannot be accepted as release proof',async t=>{
 const f=await fixture(t);for(const key of ['GH_TOKEN','headers','apiBaseUrl','evaluationClock','publisherRuntime']){const r=await f.run(['plan'],{RELEASE_EVIDENCE_JSON:JSON.stringify({...f.evidence,[key]:'PRIVATE_SENTINEL'})});assert.equal(r.status,1);assert.equal(r.uploads,'');assert.equal(r.validationRequests,'');assert.doesNotMatch(r.text+r.stdout+r.stderr,/PRIVATE_/);}
});

test('unsafe numeric quota and reset headers cannot authorize publication',async t=>{
 const f=await fixture(t);for(const FAIL_VALIDATION of ['huge-quota','huge-reset']){const r=await f.run(['plan'],{FAIL_VALIDATION});assert.equal(r.status,1);assert.equal(r.uploads,'');assert.equal(r.record.planComplete,false);}
});

test('native current-main context lookup pins the official host despite ambient gh host selection',async t=>{
 const f=await fixture(t),r=await f.run(['plan'],{GH_HOST:'synthetic.invalid',AMBIENT_GH_HOST_PROBE:'true',REQUIRE_NATIVE_AUTH:'true'});assert.equal(r.status,0);assert.equal(r.validationRequests.trim().split('\n').length,13);assert.doesNotMatch(r.text+r.stdout+r.stderr,/PRIVATE_|synthetic-native-github-token/);
});

test('raw API log hashing preserves a leading UTF-8 BOM rather than using a display projection digest',async t=>{
 const f=await fixture(t),m=mandatoryCliFixture();m.facts.log='\ufeff2026-10-20T10:00:00.000Z '+m.facts.log;m.selector.originalJobLogSha256=createHash('sha256').update(m.facts.log).digest('hex');f.evidence.mandatoryValidation=m.selector;await writeFile(join(f.dir,'mandatory.json'),JSON.stringify(m));const r=await f.run(['plan'],{REQUIRE_NATIVE_AUTH:'true'});assert.equal(r.status,0);assert.equal(r.record.mandatoryValidation.plan.originalJobLogSha256,m.selector.originalJobLogSha256);
});

test('the aggregate reader deadline includes synchronous parsing and validation before returning a receipt',async t=>{
 const f=await fixture(t),r=await f.run(['plan'],{PARSE_DELAY_MS:'31000'});assert.equal(r.status,1);assert.equal(r.uploads,'');assert.equal(r.record.planComplete,false);assert.match(r.record.reasons.join(''),/PLAN_MANDATORY_VALIDATION_FAILED/);
});

// Small synthetic content keeps these actual-Git tests independent of historical
// objects in shallow CI. Only fixed trusted policy DATA in a disposable module
// copy is adapted. The real coordinator never reads an eligibility override.
const presentationPolicy=[
 ['index.html','615e463834f226d6cf1ebcd03e5531b9c8535f69','618e5002998db47014174393216c913eede6fb01','<main>before</main>','<noscript>Shopping needs JavaScript</noscript><main>after</main>'],
 ['src/button-system.css','0c5790252e1dc1ffe5f48674efc208cbffd3f6e0','7fad2ba9c9e4d501adbbf18f4de66feb9d5e5cfd','button{color:black}','button{color:white}'],
 ['src/consistency.css','2bee9d951e0438db52d304efea6e86d0be9c8a4c','acc40d8da9b2c393f85d06bffea1a4628c109a56','body{margin:1px}','body{margin:2px}'],
 ['src/designs/collection-picker.css','c80088a6c8b8e6f898b46c706d7617f34e26814a','0f6aa6df61241ed473a102ff7811c61a5371f7e4','.picker{gap:1px}','.picker{gap:2px}'],
 ['tests/contact-print.browser.mjs',null,'116ef654d68b438fc646d4be8563b37b3cab9b59',null,'// nonshipping print regression fixture']
];
const gitBlob=text=>createHash('sha1').update('blob '+Buffer.byteLength(text)+'\0'+text).digest('hex');
function fixturePresentationPolicy(source){
 const start='const PRESENTATION_ENTRIES=[',end="].map(([path,baseBlob,candidateBlob])=>({path,mode:'100644',baseBlob,candidateBlob}));";
 assert.equal(source.split(start).length,2,'trusted policy start must be unique');assert.equal(source.split(end).length,2,'trusted policy end must be unique');
 const a=source.indexOf(start),b=source.indexOf(end,a)+end.length;assert.ok(b>a);
 let data=source.slice(a,b);
 for(const [,before,after,original,changed]of presentationPolicy)for(const [blob,text]of [[before,original],[after,changed]])if(blob){const token="'"+blob+"'";assert.equal(data.split(token).length,2,'expected trusted blob must occur exactly once');data=data.replace(token,"'"+gitBlob(text)+"'");}
 const adapted=source.slice(0,a)+data+source.slice(b);
 assert.equal(adapted.slice(0,a),source.slice(0,a));assert.equal(adapted.slice(a+data.length),source.slice(b),'all validator logic must remain byte-identical');
 return adapted;
}
// Only the fixed policy object is substituted in disposable copies. Its seven
// reviewed field deltas stay identical; the tiny input graph avoids a source copy.
function adminFixturePolicy(source){
 const start='const ADMIN_MANIFEST_POLICY=Object.freeze(',end='\n});';
 assert.equal(source.split(start).length,2,'Admin policy start must be unique');
 const a=source.indexOf(start)+start.length,b=source.indexOf(end,a)+2;assert.ok(b>a,'Admin policy terminator absent');
 const text=source.slice(a,b),policy=JSON.parse(text);
 assert.equal(policy.inputCount,63);assert.equal(policy.manifestBytes,9321);
 assert.equal(policy.baselineManifestSha256,'df5b83212280c77865eeb77c616adb262070368132ff8084ad1b4b949fabb329');
 assert.equal(policy.manifestSha256,'62c0c0a6323dec4c2801ae0684038c2eb53e109446c8c1c3ecb0b9a0452fbd61');
 assert.equal(policy.inputPathsDigest,'452ac699e8cc2eabf5c3abc0b932c5100a05bb9569067a87d25a48c8e4d93df3');
 assert.equal(policy.protectedInputDigest,'f21d97dd4142245ad9d1ce41424e96c911e82db622250c1be9607e73db005528');
 assert.equal(policy.inputInventoryDigest,'19f1a70961cad4c061964fbfdcd1636756e166ab4abf3d12faaa55cf39ea6cc8');
 const before={},after={};
 for(const [entry,field,oldValue,newValue]of policy.deltas){before[entry]??={};after[entry]??={};before[entry][field]=oldValue;after[entry][field]=newValue;}
 const baseline=JSON.stringify(before),manifest=JSON.stringify(after),digest=value=>createHash('sha256').update(value).digest('hex');
 const inputs={'admin/worker.mjs':'// unchanged private fixture','shared/route-styles.mjs':'// unchanged routing fixture','dist/admin/.vite/manifest.json':manifest};
 const inventory=Object.entries(inputs).sort(([a],[b])=>a<b?-1:1).map(([path,text])=>[path,digest(text),Buffer.byteLength(text)]);
 const data={...policy,inputCount:inventory.length,inputPathsDigest:digest(JSON.stringify(inventory.map(v=>v[0]))),protectedInputDigest:digest(JSON.stringify(inventory.filter(v=>v[0]!=='dist/admin/.vite/manifest.json'))),inputInventoryDigest:digest(JSON.stringify(inventory)),baselineManifestSha256:digest(baseline),manifestSha256:digest(manifest),manifestBytes:Buffer.byteLength(manifest)};
 const adapted=source.slice(0,a)+JSON.stringify(data,null,1)+source.slice(b);
 assert.equal(adapted.slice(0,a),source.slice(0,a));assert.equal(adapted.slice(a+JSON.stringify(data,null,1).length),source.slice(b),'Admin validator logic must stay byte-identical');
 assert.deepEqual(data.deltas,policy.deltas);
 return {source:adapted,policy:data,inputs,manifest,baseline};
}
async function adminInputFixture(f){
 const data=adminFixturePolicy(await readFile(cli,'utf8'));
 for(const [path,text]of Object.entries(data.inputs)){await mkdir(join(f.dir,path,'..'),{recursive:true});await writeFile(join(f.dir,path),text);}
 const manifest=JSON.parse(data.manifest);
 for(const entry of Object.values(manifest))for(const path of [entry.file,...(entry.css||[])].filter(Boolean)){await mkdir(join(f.dir,'dist/admin',path,'..'),{recursive:true});await writeFile(join(f.dir,'dist/admin',path),'actual candidate asset '+path);}
 // Copied files need not be manifest targets. They remain in the complete tree.
 await writeFile(join(f.dir,'dist/admin','copied-image.png'),'unreferenced copied static asset');
 await mkdir(join(f.dir,'dist/release/private/admin'),{recursive:true});await writeFile(join(f.dir,'dist/release/private/admin/worker.js'),'fixture-admin-candidate');
 const metadata={inputs:Object.fromEntries(Object.entries(data.inputs).map(([path,text])=>[path,{bytes:Buffer.byteLength(text),imports:[]}])),outputs:{'dist/release/private/admin/worker.js':{bytes:Buffer.byteLength('fixture-admin-candidate'),entryPoint:'admin/worker.mjs',inputs:{'admin/worker.mjs':{bytesInOutput:1}},imports:[]}}};
 await mkdir(join(f.dir,'dist/release/private-inputs'),{recursive:true});await writeFile(join(f.dir,'dist/release/private-inputs/admin-metafile.json'),JSON.stringify(metadata));
 return data;
}
async function coordinatorFixture(dir,{presentation=false}={}){
 const copy=join(dir,'coordinator');await mkdir(join(copy,'scripts'),{recursive:true});
 const source=await readFile(cli,'utf8');await writeFile(join(copy,'scripts/release-manifest.mjs'),presentation?adminFixturePolicy(fixturePresentationPolicy(source)).source:source);
 for(const name of ['cloudflare-target.mjs','deployment-protection.mjs'])await copyFile(join(root,'scripts',name),join(copy,'scripts',name));
 // All callers of fixture() use synthetic provider/runtime closures; their compiler
 // inventory can also be small and synthetic. The existing installed-API test
 // still exercises real pinned Wrangler separately. No production logic changes.
 const put=async(path,text)=>{const target=join(copy,'node_modules',path);await mkdir(join(target,'..'),{recursive:true});await writeFile(target,text);};
 for(const [name,main]of [['wrangler','wrangler-dist/cli.js'],['esbuild','lib/main.js'],['wrangler/node_modules/esbuild','lib/main.js'],['vite','index.js'],['@vitejs/plugin-react','index.js']]){await put(name+'/package.json',JSON.stringify({name:name.split('/').at(-1),version:name==='wrangler'?'4.150.0':'0.0.0',main}));await put(name+'/'+main,'// synthetic compiler input '+name);}
 for(const prefix of ['', 'wrangler/node_modules/'])await put(prefix+'@esbuild/'+process.platform+'-'+process.arch+'/bin/esbuild','synthetic esbuild executable bytes');
 return realpath(join(copy,'scripts/release-manifest.mjs'));
}
async function presentationGitFixture(dir){
 const repo=join(dir,'presentation-git');await mkdir(repo);
 const git=(...args)=>execFileSync('git',args,{cwd:repo,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
 git('init','-q');git('config','user.name','Release fixture');git('config','user.email','release-fixture@example.invalid');git('config','commit.gpgsign','false');git('config','core.hooksPath','/dev/null');
 for(const [path,,,before]of presentationPolicy)if(before!==null){await mkdir(join(repo,path,'..'),{recursive:true});await writeFile(join(repo,path),before);}
 for(const path of ['security/index.mjs','catalogue/index.mjs','server/proof-api.mjs','package.json','package-lock.json','wrangler.jsonc','wrangler.admin.jsonc','wrangler.security.jsonc','wrangler.catalogue.jsonc']){await mkdir(join(repo,path,'..'),{recursive:true});await writeFile(join(repo,path),path.endsWith('.mjs')?'export default {};':'{}');}
 git('add','.');git('commit','-qm','Synthetic manual baseline');const base=git('rev-parse','HEAD');
 for(const [path,,,,after]of presentationPolicy){await mkdir(join(repo,path,'..'),{recursive:true});await writeFile(join(repo,path),after);}
 git('add','.');git('commit','-qm','Exact reviewed presentation');const source=git('rev-parse','HEAD');
 return {PRESENTATION_GIT:repo,PRESENTATION_BASE:base,PRESENTATION_SOURCE:source,CHANGED_PATH:git('diff','--name-only',base,source)};
}
test('presentation fixture adapter fails on absent or ambiguous policy and preserves validator logic',async()=>{
 const source=await readFile(cli,'utf8'),adapted=fixturePresentationPolicy(source);assert.notEqual(adapted,source);
 assert.throws(()=>fixturePresentationPolicy(source.replace('615e463834f226d6cf1ebcd03e5531b9c8535f69','0'.repeat(40))));
 assert.throws(()=>fixturePresentationPolicy(source.replace("'615e463834f226d6cf1ebcd03e5531b9c8535f69'", "'615e463834f226d6cf1ebcd03e5531b9c8535f69','615e463834f226d6cf1ebcd03e5531b9c8535f69'")));
 assert.throws(()=>fixturePresentationPolicy(source+source));
 assert.throws(()=>adminFixturePolicy(source.replace('"inputCount": 63', '"missingCount": 63')));
 assert.throws(()=>adminFixturePolicy(source+source));
 assert.throws(()=>adminFixturePolicy(source.replace('f21d97dd4142245ad9d1ce41424e96c911e82db622250c1be9607e73db005528','0'.repeat(64))));
});
test('presentation CLI publishes and completes from manual baseline with unequal public hashes and original private sources',async t=>{
 const f=await completionFixture(t,{presentation:true}),result=await f.local();
 assert.equal(result.status,0,result.record.reasons.join('\n'));assert.equal(result.record.state,'verified');
 assert.equal(result.record.activationCompatibility.basis,'reviewed-public-presentation-v1');
 assert.notEqual(result.record.build.baselineSourceInputDigest,result.record.build.sourceInputDigest);
 assert.equal(result.record.components.security.receipt.sourceSha,old);assert.equal(result.record.components.catalogue.receipt.sourceSha,old);assert.equal(result.record.components.admin.receipt.sourceSha,sha);
 assert.equal(result.record.finalIdentityReadbacks.length,4);
 const {validateReleaseArchiveRecord}=await import(pathToFileURL(f.cli).href);
 assert.equal(validateReleaseArchiveRecord(result.record,{sourceSha:sha,candidateSha:'c'.repeat(40)}).sourceSha,sha);
 for(const mutate of [v=>v.build.baselineSourceInputDigest=v.build.sourceInputDigest,v=>v.build.presentation.protectedInputDigest='e'.repeat(64),v=>v.activationCompatibility.presentation.entries[0].candidateBlob='e'.repeat(40),v=>v.baseSha='e'.repeat(40)]){const record=structuredClone(result.record);mutate(record);assert.throws(()=>validateReleaseArchiveRecord(record,{sourceSha:sha,candidateSha:'c'.repeat(40)}));}
});

test('presentation CLI rejects incomplete manual baseline instead of activating from a partial label',async t=>{
 const f=await completionFixture(t,{presentation:true,planOnly:true}),evidence=structuredClone(f.originalEvidence);
 evidence.baseline.state='partial';const result=await f.run(['plan'],{RELEASE_EVIDENCE_JSON:JSON.stringify(evidence)});
 assert.equal(result.status,1);assert.equal(result.uploads,'');assert.equal(result.record.attempts,undefined);
});
test('presentation CLI derives eligibility from Git and rejects unrelated, substituted and mode-changed content',async t=>{
 const f=await fixture(t,{presentation:true}),env=await presentationGitFixture(f.dir),repo=env.PRESENTATION_GIT;
 const git=(...args)=>execFileSync('git',args,{cwd:repo,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
 const variants=[
  ['src/extra.jsx',async()=>writeFile(join(repo,'src/extra.jsx'),'export default null;')],
  ['src/unreviewed.css',async()=>writeFile(join(repo,'src/unreviewed.css'),'body{display:none}')],
  ['wrangler.admin.jsonc',async()=>writeFile(join(repo,'wrangler.admin.jsonc'),'{"changed":true}')],
  ['migrations/security/9999.sql',async()=>{await mkdir(join(repo,'migrations/security'),{recursive:true});await writeFile(join(repo,'migrations/security/9999.sql'),'SELECT 1;');}],
  ['security/index.mjs',async()=>writeFile(join(repo,'security/index.mjs'),'export default {changed:true};')],
  ['src/consistency.css',async()=>writeFile(join(repo,'src/consistency.css'),'body{display:none}')],
  ['index.html',async()=>chmod(join(repo,'index.html'),0o755)],
  ['tests/contact-print.browser.mjs',async()=>rm(join(repo,'tests/contact-print.browser.mjs'))]
 ];
 for(const [path,mutate]of variants){git('switch','--detach',env.PRESENTATION_SOURCE);await mutate();git('add','-A');git('commit','-qm','Invalid presentation '+path);Object.assign(f.extraEnv,env,{PRESENTATION_SOURCE:git('rev-parse','HEAD')});
  // Deliberately omit the unexpected path from the caller's list. Actual trees
  // must still reject it, including a caller trying to disguise another CSS file.
  const result=await f.run(['plan']);assert.equal(result.status,1,path);assert.match(result.record.reasons.join('\n'),/PLAN_SCOPE_FAILED/);assert.equal(result.uploads,'');assert.equal(result.record.attempts,undefined);
 }
 git('switch','--detach',env.PRESENTATION_BASE);await writeFile(join(repo,'server/proof-api.mjs'),"import '../tests/contact-print.browser.mjs';");git('add','.');git('commit','-qm','Unchanged shipping dependency');const base=git('rev-parse','HEAD');
 for(const [path,,,,after]of presentationPolicy){await mkdir(join(repo,path,'..'),{recursive:true});await writeFile(join(repo,path),after);}
 git('add','.');git('commit','-qm','Exact public blobs with shipping test import');Object.assign(f.extraEnv,env,{PRESENTATION_BASE:base,PRESENTATION_SOURCE:git('rev-parse','HEAD')});
 const shipping=await f.run(['plan']);assert.equal(shipping.status,1);assert.match(shipping.record.reasons.join('\n'),/PLAN_SCOPE_FAILED/);assert.equal(shipping.uploads,'');
});
test('presentation CLI rejects forged compatibility, missing rollback and stale or changed private prerequisites',async t=>{
 const f=await completionFixture(t,{presentation:true,planOnly:true});
 const mutations=[
  e=>e.activationCompatibility.baselineSourceInputDigest=e.activationCompatibility.sourceInputDigest,
  e=>e.activationCompatibility.presentation.protectedInputDigest='e'.repeat(64),
  e=>e.activationCompatibility.presentation.entries[0].candidateBlob='e'.repeat(40),
  e=>delete e.staged.rollback,
  e=>e.staged.rollback.adminRuntimeDigest='e'.repeat(64),
  e=>e.staged.rollback.adminConfigDigest='e'.repeat(64),
  e=>e.staged.observedAt='2026-10-19T00:00:00.000Z',
  e=>e.schema.security.observedAt='2026-10-19T00:00:00.000Z',
  e=>e.receipts.security.runtimeDigest='e'.repeat(64),
  e=>e.receipts.catalogue.configDigest='e'.repeat(64)
 ];
 for(const mutate of mutations){const evidence=structuredClone(f.originalEvidence);mutate(evidence);const result=await f.run(['plan'],{RELEASE_EVIDENCE_JSON:JSON.stringify(evidence)});assert.equal(result.status,1);assert.equal(result.uploads,'');assert.equal(result.record.attempts,undefined);}
});
test('presentation CLI refuses stale completion-cwd assets and private output drift before invoking Pages',async t=>{
 const f=await completionFixture(t,{presentation:true,planOnly:true});
 for(const path of ['dist/client/index.html','dist/admin/index.html','dist/ssr/index.html','dist/release/private/admin/worker.js']){const full=join(f.dir,path),bytes=await readFile(full);
  const planned=await f.run(['plan'],{RELEASE_EVIDENCE_JSON:JSON.stringify(f.originalEvidence)});assert.equal(planned.status,0,planned.record.reasons.join('\n'));
  await writeFile(full,'stale or changed output');const result=await f.run(['publish','pages'],{UPLOAD_RESULT:'success'});assert.equal(result.status,1,path);assert.equal(result.uploads,'');assert.equal(result.record.attempts,undefined);await writeFile(full,bytes);
 }
});

test('presentation CLI accepts only the separately bound genuine manual archive beside presentation paths',async t=>{
 const f=await completionFixture(t,{presentation:true,planOnly:true}),evidence=structuredClone(f.originalEvidence),observedAt=new Date().toISOString();
 const archive={schemaVersion:2,repository:evidence.baseline.repository,state:'verified',sourceSha:old,baseSha:old,prerequisites:{complete:true},guards:{protection:'passed'},components:evidence.baseline.components,completed:Object.fromEntries(['pages','admin','security','catalogue'].map(c=>[c,{id}])),historicalFunctionsDigest:null};
 const checks=['pages','admin','security','catalogue'].map(component=>({component,status:'passed',identityStatus:'passed',expectedId:id,observedId:id,protectionObservedAt:observedAt,identityObservedAt:observedAt,...(component==='pages'?{observedSourceSha:old}:{})}));
 archive.finalProtection={status:'passed',expectedSourceSha:old,observedAt,checks};archive.finalIdentityReadbacks=checks.map(v=>({...v}));
 const path='docs/releases/2026-10-20-release-M.json',repo=f.extraEnv.PRESENTATION_GIT;
 const git=(...args)=>execFileSync('git',args,{cwd:repo,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
 const bind=async value=>{const bytes=JSON.stringify(value);await mkdir(join(f.dir,path,'..'),{recursive:true});await mkdir(join(repo,path,'..'),{recursive:true});await writeFile(join(f.dir,path),bytes);await writeFile(join(repo,path),bytes);git('add','.');git('commit','-qm','Reviewed manual archive');f.extraEnv.PRESENTATION_SOURCE=git('rev-parse','HEAD');f.extraEnv.CHANGED_PATH=git('diff','--name-only',f.extraEnv.PRESENTATION_BASE,f.extraEnv.PRESENTATION_SOURCE);evidence.archivedRelease={origin:'reviewed-complete-release-archive',reviewed:true,path,sha256:createHash('sha256').update(bytes).digest('hex'),sourceSha:old,reviewedAgainstSha:sha};};
 await bind(archive);const result=await f.run(['plan'],{RELEASE_EVIDENCE_JSON:JSON.stringify(evidence)});assert.equal(result.status,0,result.record.reasons.join('\n'));assert.equal(result.record.archivedRelease.sourceSha,old);assert.notEqual(result.record.build.baselineSourceInputDigest,result.record.build.sourceInputDigest);
 const altered=structuredClone(archive);altered.components.security.receipt.sourceSha='e'.repeat(40);await bind(altered);const rejected=await f.run(['plan'],{RELEASE_EVIDENCE_JSON:JSON.stringify(evidence)});assert.equal(rejected.status,1);assert.match(rejected.record.reasons.join('\n'),/PLAN_ARCHIVE_FAILED/);assert.equal(rejected.uploads,'');
});


test('generated Admin manifest subcase completes, preserves original rollback and archives the new runtime',async t=>{
 const f=await completionFixture(t,{presentation:true,adminManifest:true}),snapshot=await readFile(f.path),workerPath=join(f.dir,'dist/release/private/admin/worker.js'),worker=await readFile(workerPath);
 await writeFile(workerPath,'different local compiler runtime');const drift=await f.local();assert.equal(drift.status,1);assert.match(drift.record.reasons.join('\n'),/LOCAL_VERIFICATION_FAILED/);assert.equal(drift.record.finalIdentityReadbacks.length,4);
 // Restore only this disposable scenario's pre-failure artifact to exercise the
 // independent positive completion. Production failures remain sticky.
 await writeFile(f.path,snapshot);await writeFile(workerPath,worker);const result=await f.local();
 assert.equal(result.status,0,result.record.reasons.join('\n'));assert.equal(result.record.state,'verified');
 const r=result.record;assert.equal(r.activationCompatibility.adminAssetManifest.basis,'reviewed-admin-asset-manifest-v1');assert.notEqual(r.build.private.admin.runtimeDigest,r.evidence.staged.rollback.adminRuntimeDigest);
 assert.equal(r.components.admin.receipt.runtimeDigest,r.build.private.admin.runtimeDigest);assert.equal(r.finalIdentityReadbacks.length,4);
 assert.equal(r.build.private.admin.assetManifest.inputCount,3);assert.notEqual(r.build.admin.sha256,r.build.adminManifestBaseline.assetsDigest);
 const {validateReleaseArchiveRecord}=await import(pathToFileURL(f.cli).href);assert.equal(validateReleaseArchiveRecord(r,{sourceSha:sha,candidateSha:'c'.repeat(40)}).sourceSha,sha);
 for(const mutate of [v=>v.build.adminManifestBaseline.assetsDigest='e'.repeat(64),v=>v.activationCompatibility.adminAssetManifest.candidate.runtimeDigest='e'.repeat(64),v=>v.build.private.admin.assetManifest.protectedInputDigest='e'.repeat(64)]){const record=structuredClone(r);mutate(record);assert.throws(()=>validateReleaseArchiveRecord(record,{sourceSha:sha,candidateSha:'c'.repeat(40)}));}
});
test('Admin compiler input capture rejects extra/missing/duplicate/changed inputs and manifest references',async t=>{
 const f=await fixture(t,{presentation:true}),data=await adminInputFixture(f),metadataPath=join(f.dir,'dist/release/private-inputs/admin-metafile.json'),original=await readFile(metadataPath,'utf8');
 assert.equal((await f.run(['capture-admin-inputs'])).status,0,'complete tree permits an unreferenced copied image');
 const reset=async()=>{await adminInputFixture(f);await writeFile(metadataPath,original);};
 const mutations=[
  async()=>{const v=JSON.parse(original);v.inputs['extra-private.js']={bytes:0,imports:[]};await writeFile(metadataPath,JSON.stringify(v));},
  async()=>{const v=JSON.parse(original);delete v.inputs['admin/worker.mjs'];await writeFile(metadataPath,JSON.stringify(v));},
  async()=>writeFile(metadataPath,original.replace('"inputs":{','"inputs":{"admin/worker.mjs":{"bytes":0,"imports":[]},')),
  async()=>writeFile(join(f.dir,'admin/worker.mjs'),'// substituted private input'),
  async()=>{const v=JSON.parse(original);v.outputs['dist/release/private/admin/worker.js'].bytes++;await writeFile(metadataPath,JSON.stringify(v));},
  async()=>{const v=JSON.parse(original);v.inputs['admin/worker.mjs'].imports=[{path:'../outside',external:false}];await writeFile(metadataPath,JSON.stringify(v));},
  async()=>writeFile(join(f.dir,'dist/admin/.vite/manifest.json'),data.manifest.replace('src/Checkout.jsx','src/Changed.jsx')),
  async()=>writeFile(join(f.dir,'dist/admin/.vite/manifest.json'),data.manifest.replace('assets/preview-BO2S5IF5.js','https://remote.invalid/worker.js')),
  async()=>rm(join(f.dir,'dist/admin/assets/preview-B8oIOMo5.css'))
 ];
 for(const mutate of mutations){await reset();await mutate();const result=await f.run(['capture-admin-inputs']);assert.notEqual(result.status,0);assert.equal(result.uploads,'');}
});
test('Admin manifest compatibility rejects wrong baseline, substituted runtime and post-plan candidate drift',async t=>{
 const f=await completionFixture(t,{presentation:true,adminManifest:true,planOnly:true}),original=structuredClone(f.originalEvidence);
 for(const mutate of [v=>v.baseline.components.admin.receipt.assetsDigest='e'.repeat(64),v=>v.activationCompatibility.adminAssetManifest.baseline.id=next,v=>v.activationCompatibility.adminAssetManifest.candidate.runtimeDigest='e'.repeat(64),v=>v.activationCompatibility.adminAssetManifest.candidate.inputInventoryDigest='e'.repeat(64)]){
  const evidence=structuredClone(original);mutate(evidence);const result=await f.run(['plan'],{RELEASE_EVIDENCE_JSON:JSON.stringify(evidence)});assert.equal(result.status,1);assert.equal(result.uploads,'');assert.equal(result.record.attempts,undefined);
 }
 assert.equal((await f.run(['plan'],{RELEASE_EVIDENCE_JSON:JSON.stringify(original)})).status,0);
 await writeFile(join(f.dir,'dist/admin/copied-image.png'),'changed complete-tree asset');const result=await f.run(['publish','pages'],{UPLOAD_RESULT:'success'});assert.equal(result.status,1);assert.equal(result.uploads,'');
});


test('private-builds requests the Admin metafile outside the runtime tree and captures actual inputs',async t=>{
 const f=await fixture(t,{presentation:true}),data=await adminInputFixture(f);
 const metadata=await readFile(join(f.dir,'dist/release/private-inputs/admin-metafile.json'),'utf8');
 let source=await readFile(join(f.dir,'preload.cjs'),'utf8');
 const marker=" if(program==='git'){";assert.ok(source.includes(marker));
 source=source.replace(marker,`
 if(program==='npx'){
  if(args.slice(0,4).join(' ')!=='--no-install wrangler deploy --dry-run')throw Error('Unexpected compiler command');
  const out=args[args.indexOf('--outdir')+1],admin=args.includes('wrangler.admin.jsonc');
  fs.mkdirSync(out,{recursive:true});fs.writeFileSync(out+'/worker.js',admin?'fixture-admin-candidate':'fixture-worker');
  if(admin){if(args[args.indexOf('--metafile')+1]!=='dist/release/private-inputs/admin-metafile.json')throw Error('Metafile must stay outside runtime tree');fs.writeFileSync('dist/release/private-inputs/admin-metafile.json',${JSON.stringify(metadata)});}
  else if(args.includes('--metafile'))throw Error('Unexpected extra private metadata');
  fs.appendFileSync('compiler-calls.log',JSON.stringify(args)+'\\n');return '';
 }
`+marker);
 await writeFile(join(f.dir,'preload.cjs'),source);
 const result=await f.run(['private-builds']);assert.equal(result.status,0,result.stderr);
 const record=JSON.parse(await readFile(join(f.dir,'dist/release/private-build-manifest.json'),'utf8'));
 assert.equal(record.sourceSha,sha);assert.equal(record.components.admin.assetManifest.inputCount,3);assert.equal(record.components.admin.assetManifest.protectedInputDigest,data.policy.protectedInputDigest);assert.equal(record.components.admin.assetManifest.manifestSha256,data.policy.manifestSha256);assert.equal(record.components.admin.runtimeDigest,createHash('sha256').update(JSON.stringify([['worker.js',createHash('sha256').update('fixture-admin-candidate').digest('hex')]])).digest('hex'));
 assert.deepEqual(Object.keys(record.components),['admin','security','catalogue']);
 const calls=(await readFile(join(f.dir,'compiler-calls.log'),'utf8')).trim().split('\n').map(JSON.parse);assert.equal(calls.length,3);assert.equal(calls.filter(v=>v.includes('--metafile')).length,1);
 assert.deepEqual((await readdir(join(f.dir,'dist/release/private/admin'))).sort(),['worker.js']);
});

const canonicalRecoveryJson=value=>JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
const recoveryHash=value=>createHash('sha256').update(value).digest('hex');
async function recoveryFixture(t){
 const hash=recoveryHash,canonical=canonicalRecoveryJson;
 const f=await completionFixture(t,{allFour:true}),original=await readFile(f.path),originalRecord=JSON.parse(original);
 const failedResult=await f.local({FAIL_GUARD_INVOCATION:'true'});assert.equal(failedResult.status,1);assert.deepEqual(failedResult.record.reasons,['FINAL_GUARD_FAILED: One or more local component protections failed.']);
 const failed=await readFile(f.path),admin=Buffer.from(JSON.stringify(f.finalEvidence.receipts.admin)),zip=Buffer.from('synthetic original immutable ZIP');
 for(const [name,bytes]of [['original.json',original],['failed.json',failed],['admin.json',admin],['original.zip',zip]])await writeFile(join(f.dir,name),bytes);
 const policy={sourceSha:sha,original:{bytes:original.length,sha256:hash(original),canonicalSha256:hash(canonical(originalRecord))},failed:{bytes:failed.length,sha256:hash(failed),canonicalSha256:hash(canonical(failedResult.record))},admin:{bytes:admin.length,sha256:hash(admin),canonicalSha256:hash(canonical(f.finalEvidence.receipts.admin))},zipSha256:hash(zip),artifactCanonicalSha256:hash(canonical({...f.finalEvidence.githubArtifact,zipSha256:hash(zip)})),stampVersion:2,leasePath:join(f.dir,'synthetic-recovery.lease'),nodeRuntime:process.version,nodeSha256:hash(await readFile(process.execPath)),compilerRoot:'coordinator/node_modules',installedInputs:await (await import(pathToFileURL(f.cli))).installedInputDigest(join(f.dir,'coordinator/node_modules')),docChanges:[]};
 let text=await readFile(f.cli,'utf8');const start='const PAIRED_RECOVERY_POLICY=Object.freeze(',end='\n});';assert.equal(text.split(start).length,2);const a=text.indexOf(start)+start.length,b=text.indexOf(end,a)+2;assert.ok(b>a);text=text.slice(0,a)+JSON.stringify(policy,null,2)+text.slice(b);await writeFile(f.cli,text);
 const artifact={...f.finalEvidence.githubArtifact,zipSha256:hash(zip)},input={version:1,originalPath:join(f.dir,'original.json'),failedPath:join(f.dir,'failed.json'),adminReceiptPath:join(f.dir,'admin.json'),zipPath:join(f.dir,'original.zip'),artifact,evidence:f.finalEvidence,supportStartedAt:new Date().toISOString(),verifier:{reviewed:true,revision:sha,tree:'d9ebd59f26e2fea7ef82e5e2831cb66851a5ae1a',changes:[]}};
 const out=join(f.dir,'new-recovery.json');await writeFile(join(f.dir,'recovery-input.json'),JSON.stringify(input));
 await writeFile(join(f.dir,'validate-recovery.mjs'),`import {readFile} from 'node:fs/promises';import {validateBaseline,validateReleaseArchiveRecord} from ${JSON.stringify(pathToFileURL(f.cli).href)};const r=JSON.parse(await readFile('validation-recovery.json','utf8'));validateBaseline(r);validateReleaseArchiveRecord(r,{sourceSha:${JSON.stringify(sha)},candidateSha:'c'.repeat(40)});`);
 return {...f,input,out,original,failed,async validate(record){await writeFile(join(f.dir,'validation-recovery.json'),JSON.stringify(record));execFileSync(process.execPath,['--require',join(f.dir,'preload.cjs'),join(f.dir,'validate-recovery.mjs')],{cwd:f.dir,env:process.env,stdio:['ignore','pipe','pipe']});},async recover(extra={},output=out){return f.run(['recover-local',join(f.dir,'recovery-input.json'),output],{GITHUB_ACTIONS:'false',GH_TOKEN:'',CLOUDFLARE_API_TOKEN:'',CUSTOMVIBE_MIGRATION_SOCKET:'/synthetic-only',...extra});}};
}
test('canonical recovery is a new exclusive entry with acknowledged history, fresh closure and unchanged sticky failure',async t=>{
 const f=await recoveryFixture(t),uploadsBefore=await readFile(join(f.dir,'provider-calls.log'),'utf8'),result=await f.recover();assert.equal(result.status,0,result.stderr);const recovered=JSON.parse(await readFile(f.out));
 assert.equal(recovered.kind,'paired-release-recovery-v1');assert.equal(recovered.state,'verified');assert.equal(recovered.sourceSha,sha);assert.equal(recovered.recovery.failed.value.state,'partial');assert.deepEqual(recovered.recovery.failed.value.reasons,['FINAL_GUARD_FAILED: One or more local component protections failed.']);assert.equal(recovered.components.admin.receipt.id,next);assert.equal(recovered.recovery.providerMutations,0);assert.deepEqual(await readFile(f.path),f.failed);assert.deepEqual(await readFile(join(f.dir,'original.json')),f.original);assert.equal(result.uploads,uploadsBefore);
 await f.validate(recovered);
 const before=await readFile(f.out);const repeated=await f.recover();assert.equal(repeated.status,1);assert.deepEqual(await readFile(f.out),before);assert.deepEqual(await readFile(f.path),f.failed);
 for(const mutate of [v=>v.recovery.failed.value.reasons=[],v=>v.recovery.artifact.conclusion='failure',v=>v.recovery.evidence.schema.content.ddlReviewed=false,v=>v.finalProtection.checks[0].observedId=id,v=>v.recovery.checkedAt=new Date(Date.parse(v.recovery.conservativeCutoff)+1).toISOString(),v=>v.recovery.original.value.sourceSha=old,v=>v.recovery.admin.value.assetsDigest='d'.repeat(64),v=>v.recovery.verifier.changes=[{path:'docs/unreviewed.md',before:{mode:'100644',blob:old},after:{mode:'100644',blob:sha}}],v=>v.recovery.original.value.providerDiagnostics='PRIVATE_UNARCHIVABLE_SENTINEL']){const changed=structuredClone(recovered);mutate(changed);await assert.rejects(()=>f.validate(changed));}
});

test('canonical recovery rejects current drift, stale schema, changed rollback and a clock crossing during the final read',async t=>{
 const f=await recoveryFixture(t),uploadsBefore=await readFile(join(f.dir,'provider-calls.log'),'utf8');
 const cases=[{env:{DRIFT:'true'}},{env:{RACE_COMPONENT:'security'}},{env:{RECOVERY_FINAL_READ_DELAY_MS:'600001'}},{mutate:v=>v.evidence.schema.content.ddlReviewed=false},{mutate:v=>v.evidence.staged.rollback.pagesBuildDigest='d'.repeat(64)},{mutate:v=>v.supportStartedAt=new Date(Date.now()-600001).toISOString()},{mutate:v=>v.artifact.runAttempt='2'}];
 for(const [i,c]of cases.entries()){await rm(join(f.dir,'race-on'),{force:true});const input=structuredClone(f.input);if(c.mutate)c.mutate(input);await writeFile(join(f.dir,'recovery-input.json'),JSON.stringify(input));const output=join(f.dir,'rejected-'+i+'.json'),result=await f.recover(c.env||{},output);assert.equal(result.status,1,'case '+i+' must reject');assert.equal(JSON.parse(await readFile(output)).state,'blocked');assert.equal(result.uploads,uploadsBefore);assert.deepEqual(await readFile(f.path),f.failed);assert.doesNotMatch(result.stdout+result.stderr,/PRIVATE_/);}
});

test('future CLI archive consumption binds the recovered pair and exact document Git tuple',async t=>{
 const f=await recoveryFixture(t);assert.equal((await f.recover()).status,0);const recovered=JSON.parse(await readFile(f.out));
 const a=await archiveFixture(t),path='docs/dependency-maintenance.md',blob=text=>createHash('sha1').update('blob '+Buffer.byteLength(text)+'\0'+text).digest('hex'),doc={path,before:{mode:'100644',blob:blob('old approved document')},after:{mode:'100644',blob:blob('new approved document')}};
 let source=await readFile(f.cli,'utf8');const token='"docChanges": []';assert.equal(source.split(token).length,2);source=source.replace(token,'"docChanges": '+JSON.stringify([doc]));await writeFile(a.cli,source);
 const bytes=JSON.stringify(recovered);await writeFile(join(a.dir,a.archivePath),bytes);a.evidence.baseline={...recovered,reviewed:true,evidenceUrl:a.evidence.baseline.evidenceUrl};a.evidence.archivedRelease.sha256=recoveryHash(bytes);
 const env={CHANGED_PATH:a.archivePath+'\n'+path,RECOVERY_DOC_BEFORE:doc.before.blob,RECOVERY_DOC_AFTER:doc.after.blob};
 const accepted=await a.runArchive(['plan'],env);assert.equal(accepted.status,0,accepted.record.reasons.join('\n'));assert.deepEqual(accepted.record.archivedRelease.recoveryDocChanges,[doc]);
 for(const patch of [{RECOVERY_DOC_AFTER:old},{RECOVERY_DOC_BEFORE:sha},{ARCHIVE_MODE:'120000'},{CHANGED_PATH:a.archivePath+'\ndocs/arbitrary.md'}]){const rejected=await a.runArchive(['plan'],{...env,...patch});assert.equal(rejected.status,1);assert.equal(rejected.uploads,'');}
});

test('canonical recovery rejects coordinated Admin URL and actual GitHub handoff substitutions',async t=>{
 const f=await recoveryFixture(t);assert.equal((await f.recover()).status,0);const original=JSON.parse(await readFile(f.out));
 const cases=[['Admin URL',v=>{const url='https://github.com/TIMMMYYYHHHH/Customvibev3/actions/runs/99999';v.recovery.evidence.receipts.admin.evidenceUrl=url;v.components.admin.receipt.evidenceUrl=url;}],['artifact ID',v=>v.recovery.artifact.artifactId='99999'],['job ID',v=>v.recovery.artifact.jobId='99999'],['publishing step bounds',v=>{v.recovery.artifact.publishStep.startedAt=new Date(Date.parse(v.recovery.artifact.publishStep.startedAt)-1000).toISOString();v.recovery.artifact.publishStep.completedAt=new Date(Date.parse(v.recovery.artifact.publishStep.completedAt)+1000).toISOString();}]];
 for(const [name,mutate]of cases)await t.test(name,async()=>{const changed=structuredClone(original);mutate(changed);await assert.rejects(()=>f.validate(changed));});
});

// Substitute only fixed data in a disposable coordinator. Every validation and
// lifecycle instruction remains byte-identical, as for the presentation fixture.
function deliveryFixturePolicy(source,adapt){
 const start='const INACTIVE_DELIVERY_POLICY=Object.freeze(\n',end='\n);';assert.equal(source.split(start).length,2);const a=source.indexOf(start)+start.length,b=source.indexOf(end,a);assert.ok(b>a);const data=adapt(JSON.parse(source.slice(a,b))),text=JSON.stringify(data,null,1),changed=source.slice(0,a)+text+source.slice(b);assert.equal(changed.slice(0,a),source.slice(0,a));assert.equal(changed.slice(a+text.length),source.slice(b));return {source:changed,policy:data};
}
async function inactiveDeliveryFixture(t){
 const f=await recoveryFixture(t),recovery=await f.recover();assert.equal(recovery.status,0,recovery.stderr);const archiveBytes=await readFile(f.out),baseline=JSON.parse(archiveBytes),candidate='c'.repeat(40),catalogueSource='d'.repeat(40),newId='22222222-1234-1234-1234-123456789abc',h=recoveryHash,canonical=canonicalRecoveryJson;
 const repo=join(f.dir,'delivery-git');await mkdir(repo);const git=(...args)=>execFileSync('git',args,{cwd:repo,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();git('init','-q');git('config','user.name','Release fixture');git('config','user.email','release-fixture@example.invalid');git('config','commit.gpgsign','false');git('config','core.hooksPath','/dev/null');
 let source=await readFile(f.cli,'utf8'),p;deliveryFixturePolicy(source,data=>{p=data;return data;});
 const beforeText=v=>v.path.endsWith('.json')?'{}\n':'// original '+v.path+'\n',afterText=v=>v.path==='catalogue/index.mjs'?'import {value} from "tiny";export default {value};\n':v.path.endsWith('.json')?'{"reviewed":true}\n':'// reviewed '+v.path+'\n';
 const put=async(path,text)=>{await mkdir(join(repo,path,'..'),{recursive:true});await writeFile(join(repo,path),text);};
 for(const v of p.entries)if(v.baseBlob!==null)await put(v.path,beforeText(v));
 for(const path of ['src/retained.mjs','wrangler.jsonc','wrangler.admin.jsonc','wrangler.security.jsonc','wrangler.catalogue.jsonc'])await put(path,path.endsWith('.mjs')?'export const retained=true;':'{}');
 git('add','.');git('commit','-qm','Synthetic genuine T tree');const baseTree=git('rev-parse','HEAD');
 for(const v of p.entries)await put(v.path,afterText(v));await put(p.archivePath,archiveBytes);await mkdir(join(f.dir,p.archivePath,'..'),{recursive:true});await writeFile(join(f.dir,p.archivePath),archiveBytes);git('add','.');git('commit','-qm','Exact inactive Delivery and canonical archive');const sourceTree=git('rev-parse','HEAD');
 for(const side of ['client','admin'])await writeFile(join(f.dir,'dist',side,'index.html'),'inactive Delivery '+side);
 await writeFile(join(f.dir,'dist/release/private/admin/worker.js'),'candidate Delivery Admin executable');await rm(join(f.dir,'dist/release/private/catalogue/worker.js'));await writeFile(join(f.dir,'dist/release/private/catalogue/index.js'),'catalogue closure runtime');
 await mkdir(join(f.dir,'catalogue'));await writeFile(join(f.dir,'catalogue/index.mjs'),afterText({path:'catalogue/index.mjs'}));await mkdir(join(f.dir,'node_modules/tiny'),{recursive:true});await writeFile(join(f.dir,'node_modules/tiny/index.js'),'export const value=true;');
 const inputs={'catalogue/index.mjs':{bytes:Buffer.byteLength(afterText({path:'catalogue/index.mjs'})),imports:[{path:'node_modules/tiny/index.js',kind:'import-statement',original:'tiny'}],format:'esm'},'node_modules/tiny/index.js':{bytes:Buffer.byteLength('export const value=true;'),imports:[],format:'esm'}};
 const metadata={inputs,outputs:{'dist/release/private/catalogue/index.js':{bytes:Buffer.byteLength('catalogue closure runtime'),entryPoint:'catalogue/index.mjs',inputs:{'catalogue/index.mjs':{bytesInOutput:1},'node_modules/tiny/index.js':{bytesInOutput:1}},imports:[]}}};await mkdir(join(f.dir,'dist/release/private-inputs'),{recursive:true});await writeFile(join(f.dir,'dist/release/private-inputs/catalogue-metafile.json'),JSON.stringify(metadata));
 await writeFile(join(f.dir,'migrations/security/0012_mail_delivery.sql'),'-- reviewed inactive Delivery schema');
 const components={};for(const c of ['admin','security','catalogue']){const name=c==='catalogue'?'index.js':'worker.js';components[c]={runtimeDigest:h(JSON.stringify([[name,h(await readFile(join(f.dir,'dist/release/private',c,name)))]])),configDigest:h(await readFile(join(f.dir,`wrangler.${c}.jsonc`)))};}
 const receiptDigest=h(canonical(Object.fromEntries(Object.entries(baseline.components).map(([c,v])=>[c,v.receipt])))),pages=baseline.components.pages.receipt,admin=baseline.components.admin.receipt,rollback={pagesId:pages.id,adminId:admin.id,sourceSha:pages.sourceSha,pagesBuildDigest:pages.buildDigest,adminAssetsDigest:admin.assetsDigest,adminRuntimeDigest:admin.runtimeDigest,adminConfigDigest:admin.configDigest};
 const adapted=deliveryFixturePolicy(source,data=>({...data,baselineSha:sha,archiveBlob:gitBlob(archiveBytes),baseline:{archiveSha256:h(archiveBytes),receiptDigest,rollback},catalogue:{...data.catalogue,id:next,sourceSha:catalogueSource,sourceDigest:'f'.repeat(64),runtimeDigest:components.catalogue.runtimeDigest,configDigest:components.catalogue.configDigest},entries:data.entries.map(v=>({...v,baseBlob:v.baseBlob===null?null:gitBlob(beforeText(v)),candidateBlob:gitBlob(afterText(v))})),catalogueInputs:{inputCount:2,inputPathsDigest:h(canonical(Object.keys(inputs).sort())),inputInventoryDigest:h(canonical(Object.keys(inputs).sort().map(path=>[path,h(path==='catalogue/index.mjs'?afterText({path}):'export const value=true;'),inputs[path].bytes]))),importGraphDigest:h(canonical(Object.keys(inputs).sort().map(path=>[path,inputs[path].imports])))}}));p=adapted.policy;await writeFile(f.cli,adapted.source);
 components.catalogue.inputClosure={version:1,...p.catalogueInputs,metafileSha256:h(JSON.stringify(metadata))};await writeFile(join(f.dir,'dist/release/private-build-manifest.json'),JSON.stringify({sourceSha:candidate,components}));
 const mandatory=mandatoryCliFixture();mandatory.selector.candidateSha=candidate;mandatory.selector.prBaseSha=sha;mandatory.facts.commit.parents[0].sha=sha;mandatory.facts.mergedPull.merge_commit_sha=candidate;await writeFile(join(f.dir,'mandatory.json'),JSON.stringify(mandatory));
 const safeMetadata=`
function deliveryMetadata(value){
 if(!value.result?.canonical_deployment)return value;const project=value.result;project.deployment_configs={production:{env_vars:{}},preview:{env_vars:{MAIL_EVENTS_ENABLED:{type:'plain_text',value:'false'}}}};project.canonical_deployment={...project.canonical_deployment,environment:'production',env_vars:{}};
 if(process.env.DELIVERY_FLAG_SCOPE&&(!process.env.DELIVERY_FLAG_AFTER_UPLOAD||fs.existsSync('uploaded'))){const scope=process.env.DELIVERY_FLAG_SCOPE,settings=scope==='canonical'?project.canonical_deployment:project.deployment_configs[scope];settings.env_vars.MAIL_EVENTS_ENABLED=process.env.DELIVERY_FLAG_VALUE==='secret'?{type:'secret_text'}:{type:'plain_text',value:'true'};}
 return value;
}
function metadata(path){return deliveryMetadata(initialMetadata(path));}
const deliveryFetch=global.fetch;global.fetch=async(url,options)=>{const result=await deliveryFetch(url,options);if(String(url).includes('/pages/projects/')){const value=deliveryMetadata(await result.json());return {...result,json:async()=>value};}return result;};
`;
 let preloadSource=await readFile(join(f.dir,'preload.cjs'),'utf8');preloadSource=preloadSource.replace('function metadata(path){','function initialMetadata(path){');await writeFile(join(f.dir,'preload.cjs'),preloadSource+safeMetadata);
 const guardPath=join(f.dir,'guard-preload.cjs');await writeFile(guardPath,(await readFile(guardPath,'utf8')).replace(`const sha='${sha}',old='${old}',id='${id}',next='${next}';`,`const sha=process.env.FIXTURE_SOURCE_SHA,old=process.env.FIXTURE_BASE_SHA,id=process.env.FIXTURE_BEFORE_ID,next=process.env.FIXTURE_NEXT_ID;`));
 Object.assign(f.extraEnv,{FIXTURE_SOURCE_SHA:candidate,FIXTURE_BASE_SHA:sha,FIXTURE_BEFORE_ID:next,FIXTURE_NEXT_ID:newId,GITHUB_SHA:candidate,REVIEWED_SHA:candidate,PRESENTATION_GIT:repo,PRESENTATION_BASE:baseTree,PRESENTATION_SOURCE:sourceTree,CHANGED_PATH:git('diff','--name-only',baseTree,sourceTree)});
 for(const name of ['uploaded','admin-uploaded','race-on','final-readback'])await rm(join(f.dir,name),{force:true});for(const name of ['provider-calls.log','validation-calls.log'])await writeFile(join(f.dir,name),'');
 const evidence={sourceSha:candidate,baseline:{sourceSha:sha,reviewed:true,evidenceUrl:`https://github.com/TIMMMYYYHHHH/Customvibev3/blob/a27d393e35b6657c4800560bbcaffe3bceaf33f9/${p.archivePath}`},mandatoryValidation:mandatory.selector,guards:{},receipts:{},schema:{},staged:{reviewedAgainstSha:candidate,observedAt:new Date().toISOString(),clientPairCompatibleWithSchema:true,rollback},archivedRelease:{origin:'reviewed-complete-release-archive',reviewed:true,path:p.archivePath,sha256:h(archiveBytes),sourceSha:sha,reviewedAgainstSha:candidate},activationCompatibility:{basis:'reviewed-inactive-delivery-v1'}};
 const run=(args,extra={})=>f.run(args,{RELEASE_EVIDENCE_JSON:JSON.stringify(evidence),...extra});
 const seed=await run(['plan']);assert.ok(seed.record.build,seed.record.reasons.join('\n'));assert.match(seed.record.reasons.join('\n'),/ACTIVATION_COMPATIBILITY/);const r=seed.record,observedAt=new Date().toISOString(),account='4f57d4e924674cb87b33d4c884745cf6';
 for(const c of ['admin','security','catalogue']){evidence.guards[c]={account,component:c,id:next,origin:'private-helper-get',candidateSha:candidate,observedAt,protection:'passed'};if(c!=='admin')evidence.receipts[c]={account,component:c,id:next,sourceSha:c==='security'?candidate:catalogueSource,sourceDigest:c==='security'?r.sourceDigests[c]:p.catalogue.sourceDigest,runtimeDigest:components[c].runtimeDigest,configDigest:components[c].configDigest,origin:'guarded-upload',evidenceUrl:c==='catalogue'?p.catalogue.evidenceUrl:'https://github.com/TIMMMYYYHHHH/Customvibev3/actions/runs/123',observedAt};}
 for(const family of ['security','content']){const v=r.schemaSources[family];evidence.schema[family]={origin:'console-metadata',databaseId:v.databaseId,reviewedAgainstSha:candidate,observedAt,sourceFiles:v.source,applied:v.source.map(v=>v.name),objectsDigest:'c'.repeat(64),ddlReviewed:true};}
 evidence.activationCompatibility={basis:'reviewed-inactive-delivery-v1',reviewedAgainstSha:candidate,baselineSha:sha,observedAt,sourceInputDigest:r.build.sourceInputDigest,baselineSourceInputDigest:r.build.baselineSourceInputDigest,inactiveDelivery:r.build.inactiveDelivery,compilerConfigDigest:r.build.compiler.compilerConfigDigest,configDigest:r.build.compiler.configDigest,pagesBuildDigest:r.build.pages.sha256,adminAssetsDigest:r.build.admin.sha256,historicalFunctionsDigest:null};
 const planned=await run(['plan']);assert.equal(planned.status,0,planned.record.reasons.join('\n'));
 const finalEvidence={sourceSha:candidate,guards:structuredClone(evidence.guards),receipts:structuredClone(evidence.receipts),schema:structuredClone(evidence.schema),staged:structuredClone(evidence.staged)};finalEvidence.guards.admin.id=newId;finalEvidence.receipts.admin={account,component:'admin',id:newId,sourceSha:candidate,sourceDigest:r.sourceDigests.admin,runtimeDigest:components.admin.runtimeDigest,configDigest:components.admin.configDigest,assetsDigest:r.build.admin.sha256,origin:'guarded-upload',evidenceUrl:'https://github.com/TIMMMYYYHHHH/Customvibev3/actions/runs/123',observedAt};
 return {...f,runDelivery:run,deliveryEvidence:evidence,finalEvidence,candidate,catalogueSource,newId,repo,p,async publish(extra={}){return run(['publish','pages'],{UPLOAD_RESULT:'success',...extra});},async handoff(){await writeFile(join(f.dir,'admin-uploaded'),'actual synthetic matching Admin acknowledgement');const record=JSON.parse(await readFile(f.path));finalEvidence.githubArtifact={...f.finalEvidence.githubArtifact,sourceSha:candidate,manifestSha256:h(await readFile(f.path)),publishStep:{name:'Publish protected Pages from the reviewed build',number:9,startedAt:record.attempts[0].startedAt,completedAt:new Date().toISOString()}};},localDelivery(extra={}){return f.run(['finish-local'],{GITHUB_ACTIONS:'false',GH_TOKEN:'',CLOUDFLARE_API_TOKEN:'',CUSTOMVIBE_MIGRATION_SOCKET:'/synthetic-only',RELEASE_EVIDENCE_JSON:JSON.stringify(finalEvidence),...extra});},async validateDelivery(record){await writeFile(join(f.dir,'validation-delivery.json'),JSON.stringify(record));await writeFile(join(f.dir,'validate-delivery.mjs'),`import {readFile} from 'node:fs/promises';import {validateReleaseArchiveRecord} from ${JSON.stringify(pathToFileURL(f.cli).href)};validateReleaseArchiveRecord(JSON.parse(await readFile('validation-delivery.json')),{sourceSha:${JSON.stringify(candidate)},candidateSha:'e'.repeat(40)});`);execFileSync(process.execPath,['--require',join(f.dir,'preload.cjs'),join(f.dir,'validate-delivery.mjs')],{cwd:f.dir,env:{...process.env,...f.extraEnv},stdio:['ignore','pipe','pipe']});}};
}
test('inactive Delivery CLI preserves genuine T rollback/K Catalogue through upload, matching Admin completion and archive',async t=>{
 const f=await inactiveDeliveryFixture(t),published=await f.publish();assert.equal(published.status,0,published.record.reasons.join('\n'));await f.handoff();const done=await f.localDelivery();assert.equal(done.status,0,done.record.reasons.join('\n'));assert.equal(done.record.state,'verified');assert.equal(done.record.components.catalogue.receipt.sourceSha,f.catalogueSource);assert.equal(done.record.components.security.receipt.sourceSha,f.candidate);assert.equal(done.record.components.admin.receipt.sourceSha,f.candidate);assert.notEqual(done.record.build.sourceInputDigest,done.record.build.baselineSourceInputDigest);assert.equal(done.record.before.pages,next);assert.equal(done.record.completed.pages.id,f.newId);assert.equal(done.record.finalProtection.checks.find(v=>v.component==='pages').inactiveIngress.preview,'false');assert.equal(done.uploads.trim().split('\n').length,1);await f.validateDelivery(done.record);
 for(const [i,mutate]of [v=>v.build.inactiveDelivery.entries[0].candidateBlob=sha,v=>v.build.deliveryBaseline.rollback.adminRuntimeDigest='d'.repeat(64),v=>v.finalProtection.checks.find(c=>c.component==='pages').inactiveIngress.preview='true',v=>delete v.finalProtection.checks.find(c=>c.component==='pages').inactiveIngress,v=>v.components.catalogue.receipt.sourceSha=f.candidate,v=>v.completionEvidence.evidence.receipts.security.sourceSha=old,v=>v.build.private.catalogue.inputClosure.importGraphDigest='d'.repeat(64)].entries()){const altered=structuredClone(done.record);mutate(altered);await assert.rejects(()=>f.validateDelivery(altered),"mutation "+i);}
 const failedFinal=await f.localDelivery({DELIVERY_FLAG_SCOPE:'production',DELIVERY_FLAG_VALUE:'secret'});assert.equal(failedFinal.status,1);assert.equal(failedFinal.record.state,'partial');assert.equal(failedFinal.record.completed.pages.id,f.newId);assert.equal(failedFinal.record.finalProtection.status,'failed');assert.equal(failedFinal.record.finalProtection.checks.length,4);
 const later=await f.localDelivery();assert.equal(later.status,1);assert.equal(later.record.state,'partial');assert.ok(later.record.reasons.includes('FINAL_GUARD_FAILED: One or more local component protections failed.'));assert.equal(later.uploads,done.uploads);
});

test('inactive Delivery rejects schema, source, rollback, receipt and ingress substitutions before a write',async t=>{
 const f=await inactiveDeliveryFixture(t),trusted=structuredClone(f.deliveryEvidence);
 const mutations=[v=>v.baseline.sourceSha=old,v=>v.baseline.extra=true,v=>v.staged.rollback.pagesBuildDigest='d'.repeat(64),v=>v.schema.security.applied.pop(),v=>v.schema.security.applied.push('0013_unreviewed.sql'),v=>v.schema.security.sourceFiles.at(-1).sha256='d'.repeat(64),v=>v.receipts.security.sourceSha=sha,v=>v.receipts.security.sourceDigest='f'.repeat(64),v=>v.receipts.catalogue.sourceSha=f.candidate,v=>v.receipts.catalogue.runtimeDigest='d'.repeat(64),v=>v.archivedRelease.sha256='d'.repeat(64),v=>v.activationCompatibility.extraPhase=true];
 for(const [i,mutate]of mutations.entries()){const evidence=structuredClone(trusted);mutate(evidence);const result=await f.runDelivery(['plan'],{RELEASE_EVIDENCE_JSON:JSON.stringify(evidence)});assert.equal(result.status,1,'mutation '+i);assert.equal(result.uploads,'');}
 for(const scope of ['production','preview','canonical'])for(const value of ['true','secret']){const result=await f.runDelivery(['plan'],{DELIVERY_FLAG_SCOPE:scope,DELIVERY_FLAG_VALUE:value});assert.equal(result.status,1,scope+' '+value);assert.equal(result.uploads,'');}
 assert.equal((await f.runDelivery(['plan'])).status,0);
 const drifted=await f.publish({DELIVERY_FLAG_SCOPE:'preview',DELIVERY_FLAG_VALUE:'secret'});assert.equal(drifted.status,1);assert.equal(drifted.uploads,'');assert.equal(drifted.record.attempts,undefined);
 const git=(...args)=>execFileSync('git',args,{cwd:f.repo,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim(),original=f.extraEnv.PRESENTATION_SOURCE;
 for(const [name,mutate]of [['blob',async()=>writeFile(join(f.repo,'security/mail-delivery.mjs'),'// changed foreign runtime')],['mode',async()=>chmod(join(f.repo,'security/index.mjs'),0o755)],['extra',async()=>writeFile(join(f.repo,'server/foreign.mjs'),'export default {};')],['schema',async()=>writeFile(join(f.repo,'migrations/security/0012_mail_delivery.sql'),'-- substituted schema')]]){git('reset','--hard',original);await mutate();git('add','.');git('commit','-qm','Rejected '+name);const changed=git('rev-parse','HEAD');const result=await f.runDelivery(['plan'],{PRESENTATION_SOURCE:changed});assert.equal(result.status,1,name);assert.equal(result.uploads,'');}
 git('reset','--hard',original);assert.equal((await f.runDelivery(['plan'])).status,0);
 // Changes after planning are independently rejected by verifyBuild as well.
 await writeFile(join(f.repo,'security/mail-delivery.mjs'),'// foreign after-plan executable');git('add','.');git('commit','-qm','Rejected post-plan source');const sourceDrift=await f.publish({PRESENTATION_SOURCE:git('rev-parse','HEAD')});assert.equal(sourceDrift.status,1);assert.equal(sourceDrift.uploads,'');
 git('reset','--hard',original);assert.equal((await f.runDelivery(['plan'])).status,0);const expired=await f.publish({IMPORT_DELAY_MS:'31001'});assert.equal(expired.status,1);assert.equal(expired.uploads,'');assert.equal(expired.record.attempts[0].outcome,'not-invoked');assert.match(expired.record.reasons.join('\n'),/PREWRITE_REJECTED/);
});
test('inactive Delivery actual compiler closure rejects dependency/import drift and captures metadata in private-builds',async t=>{
 const f=await inactiveDeliveryFixture(t),path=join(f.dir,'dist/release/private-inputs/catalogue-metafile.json'),original=await readFile(path),input=join(f.dir,'node_modules/tiny/index.js'),inputBytes=await readFile(input);
 for(const mutate of [async()=>writeFile(input,'changed dependency'),async()=>{const m=JSON.parse(original);m.inputs['catalogue/index.mjs'].imports=[];await writeFile(path,JSON.stringify(m));},async()=>{const m=JSON.parse(original);m.inputs['foreign.js']={bytes:0,imports:[]};await writeFile(path,JSON.stringify(m));},async()=>{const m=JSON.parse(original);m.outputs['dist/release/private/catalogue/index.js'].bytes++;await writeFile(path,JSON.stringify(m));}]){await mutate();const result=await f.runDelivery(['plan']);assert.equal(result.status,1);assert.equal(result.uploads,'');await writeFile(input,inputBytes);await writeFile(path,original);}
 assert.equal((await f.runDelivery(['plan'])).status,0);
 // Existing dry-run command gains only Catalogue's metafile on this exact case.
 const child=join(f.dir,'preload.cjs'),before=await readFile(child,'utf8');const replacement=`if(program==='npx'){
  fs.appendFileSync('compiler-calls.log',args.join(' ')+'\\n');const c=['admin','security','catalogue'].find(c=>args.includes('wrangler.'+c+'.jsonc')),directory=args[args.indexOf('--outdir')+1];if(!c)throw Error('Unexpected synthetic compile');fs.mkdirSync(directory,{recursive:true});fs.writeFileSync(directory+'/'+(c==='catalogue'?'index.js':'worker.js'),c==='catalogue'?'catalogue closure runtime':c==='admin'?'candidate Delivery Admin executable':'fixture-worker');if(c==='catalogue'){if(args[args.indexOf('--metafile')+1]!=='dist/release/private-inputs/catalogue-metafile.json')throw Error('Missing Catalogue metadata');fs.writeFileSync('dist/release/private-inputs/catalogue-metafile.json',${JSON.stringify(original.toString())});}return '';
 }`;
 const a=before.indexOf(" if(program==='npx'){"),b=before.indexOf(' if(program===process.execPath){',a);assert.ok(a>=0&&b>a);await writeFile(child,before.slice(0,a)+replacement+'\n'+before.slice(b));
 // No generated manifest is eligible for the separate historical Admin case.
 await mkdir(join(f.dir,'dist/admin/.vite'),{recursive:true});await writeFile(join(f.dir,'dist/admin/.vite/manifest.json'),'{}');const built=await f.runDelivery(['private-builds']);assert.equal(built.status,0,built.stderr);const manifest=JSON.parse(await readFile(join(f.dir,'dist/release/private-build-manifest.json')));assert.deepEqual(manifest.components.catalogue.inputClosure,{version:1,...f.p.catalogueInputs,metafileSha256:recoveryHash(original)});assert.match(await readFile(join(f.dir,'compiler-calls.log'),'utf8'),/wrangler.catalogue.jsonc.*--metafile dist\/release\/private-inputs\/catalogue-metafile.json/);assert.equal(built.uploads,'');
});
test('inactive Delivery post-write ingress failure keeps the actual acknowledgement and cannot heal on healthy reread',async t=>{
 const f=await inactiveDeliveryFixture(t),result=await f.publish({DELIVERY_FLAG_SCOPE:'preview',DELIVERY_FLAG_VALUE:'true',DELIVERY_FLAG_AFTER_UPLOAD:'true'});assert.equal(result.status,1);assert.equal(result.record.state,'partial');assert.equal(result.record.attempts[0].acknowledgement.id,f.newId);assert.equal(result.uploads.trim().split('\n').length,1);assert.ok(result.record.reasons.length>0);const reasons=[...result.record.reasons];const later=await f.runDelivery(['finish']);assert.equal(later.status,1);assert.equal(later.record.state,'partial');for(const reason of reasons)assert.ok(later.record.reasons.includes(reason));assert.equal(later.uploads,result.uploads);
});
