// Release metadata only. Never read customer rows, stored login tokens, or secret values.
import {readFile,writeFile,mkdir,readdir,stat,rm,open} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {resolve,relative,dirname,posix} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {createRequest,DESTINATION_ACCOUNT,PAGES_PROJECT} from './cloudflare-target.mjs';
export const REPOSITORY='TIMMMYYYHHHH/Customvibev3';
const COMPONENTS=['pages','admin','security','catalogue'];
const SHA=/^[a-f0-9]{40}$/,DIGEST=/^[a-f0-9]{64}$/,ID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const OUTPUT='dist/release/release-manifest.json';
const ensure=(condition,message)=>{if(!condition)throw Error(message);};
const hash=value=>createHash('sha256').update(value).digest('hex');
function command(program,args,{env=process.env}={}){return execFileSync(program,args,{env,encoding:'utf8',maxBuffer:16*1024*1024,stdio:['ignore','pipe','pipe']}).trim();}
function git(...args){return command('git',args);}
// Official fixed-origin evidence under the existing native token authorizes publication.
const VALIDATION_PATH='.github/workflows/validate.yml',VALIDATION_HASH='1021fd8f5c961d5e65b49a91e7870c339015f57c5e2b681a44cbaa4d225e2389';
const VALIDATION_JOB='Node 22 build and fixture tests',VALIDATION_NAME='Validate proposed CustomVibe changes';
const CHECKOUT='Run actions/checkout@11d5960a326750d5838078e36cf38b85af677262',SETUP_NODE='Run actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020';
const VALIDATION_STEPS=['Set up job',CHECKOUT,SETUP_NODE,'Install locked dependencies','Build storefront and server-rendered pages','Build admin and storefront preview','Verify shipped third-party notices','Run local fixture tests','Run Python security-helper fixtures','Post '+SETUP_NODE,'Post '+CHECKOUT,'Complete job'];
const SELECTOR_KEYS=['version','origin','reviewed','repository','repositoryId','candidateSha','candidateTreeSha','pullRequestNumber','prHeadSha','prBaseSha','checkedMergeSha','checkedTreeSha','workflowId','workflowPath','workflowSha256','runId','runAttempt','jobId','checkRunId','checkSuiteId','url','nodeVersion','nodeTests','pythonTests','originalJobLogSha256','ownerProofSha256'];
const safeNumber=n=>Number.isSafeInteger(n)&&n>0;
const node22=v=>typeof v==='string'&&/^v22[.](0|[1-9][0-9]*)[.](0|[1-9][0-9]*)$/.test(v);
function validationSelector(s){
 ensure(exactKeys(s,SELECTOR_KEYS)&&s.version===1&&s.origin==='owner-selected-github-validation'&&s.reviewed===true&&s.repository===REPOSITORY&&s.repositoryId===1269416306,'Invalid mandatory validation selector.');
 for(const k of ['candidateSha','candidateTreeSha','prHeadSha','prBaseSha','checkedMergeSha','checkedTreeSha'])ensure(SHA.test(s[k]||''),'Invalid validation SHA.');
 for(const k of ['pullRequestNumber','workflowId','runId','runAttempt','jobId','checkRunId','checkSuiteId','nodeTests','pythonTests'])ensure(safeNumber(s[k]),'Invalid validation identifier.');
 for(const k of ['workflowSha256','originalJobLogSha256','ownerProofSha256'])ensure(DIGEST.test(s[k]||''),'Invalid validation digest.');
 ensure(s.workflowPath===VALIDATION_PATH&&s.workflowSha256===VALIDATION_HASH&&s.url===`https://github.com/${REPOSITORY}/actions/runs/${s.runId}`&&node22(s.nodeVersion),'Unapproved validation workflow/runtime.');return s;
}
function apiTime(v){ensure(typeof v==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:[.]\d{3})?Z$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString()===v.replace(/Z$/,v.includes('.')?'Z':'.000Z'),'Invalid validation clock.');return new Date(v).toISOString();}
const success=v=>v?.status==='completed'&&v.conclusion==='success';
function sameRepo(r){return r?.full_name===REPOSITORY&&r.id===1269416306&&r.private===false;}
function sameIdentityRepo(r){return r?.id===1269416306&&r.name==='Customvibev3'&&r.url===`https://api.github.com/repos/${REPOSITORY}`;}
export function parseMandatoryValidationLog(log){
 ensure(typeof log==='string'&&Buffer.byteLength(log)<=4*1024*1024&&!log.includes('\ufffd'),'Invalid validation log.');
 // Parse actual API bytes; display-format projections belong only in local tests.
 const lines=log.split(/\r?\n/).map(l=>l.replace(/^\ufeff?(?:\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d[.]\d+Z) /,'').replace(/\x1b\[[0-9;]*m/g,''));
 const once=value=>{const found=lines.map((l,i)=>l===value?i:-1).filter(i=>i>=0);ensure(found.length===1,'Ambiguous validation log boundary.');return found[0];};
 const checkout=once('##[group]'+CHECKOUT),setup=once('##[group]'+SETUP_NODE),install=once('##[group]Run npm ci'),node=once('##[group]Run npm test'),python=once('##[group]Run python3 -B -m unittest discover tests/python');
 const os=once('##[group]Operating System'),osEnd=lines.indexOf('##[endgroup]',os);
 ensure(os<osEnd&&osEnd<checkout&&lines.slice(os+1,osEnd).includes('Ubuntu')&&checkout<setup&&setup<install&&install<node&&node<python,'Validation log platform/step order differs.');
 const c=lines.slice(checkout,setup),fetch=c.filter(l=>/^\[command\]\/usr\/bin\/git -c protocol[.]version=2 fetch /.test(l));
 ensure(fetch.length===1,'Missing pinned checkout fetch.');const selected=/^\[command\]\/usr\/bin\/git -c protocol[.]version=2 fetch --no-tags --prune --no-recurse-submodules --depth=1 origin \+([a-f0-9]{40}):refs\/remotes\/pull\/([1-9][0-9]*)\/merge$/.exec(fetch[0]);ensure(selected,'Wrong checkout merge ref.');
 const ref=`refs/remotes/pull/${selected[2]}/merge`,select='[command]/usr/bin/git checkout --progress --force '+ref;ensure(safeNumber(Number(selected[2]))&&c.filter(l=>l===select).length===1,'Wrong checkout selection.');
 const fetching=once('##[group]Fetching the repository')-checkout,selecting=once('##[group]Checking out the ref')-checkout;ensure(0<fetching&&fetching<c.indexOf(fetch[0])&&c.indexOf(fetch[0])<selecting&&selecting<c.indexOf(select),'Checkout order differs.');
 const logIndex=c.indexOf('[command]/usr/bin/git log -1 --format=%H');ensure(logIndex>c.indexOf(select)&&c.filter(l=>l==='[command]/usr/bin/git log -1 --format=%H').length===1&&c[logIndex+1]===selected[1],'Wrong checked synthetic source.');
 const versions=lines.slice(setup,install).filter(l=>l.startsWith('node: '));ensure(versions.length===1&&node22(versions[0].slice(6)),'Missing exact tested runtime.');
 const n=lines.slice(node,python),summaries=n.map((l,i)=>/^# tests /.test(l)?i:-1).filter(i=>i>=0);ensure(summaries.length===1,'Missing or duplicate Node footer.');
 const tail=n.slice(summaries[0]);const m=/^# tests ([1-9][0-9]*)\n# suites (?:0|[1-9][0-9]*)\n# pass ([1-9][0-9]*)\n# fail 0\n# cancelled 0\n# skipped 0\n# todo 0\n# duration_ms [0-9]+(?:[.][0-9]+)?\s*$/.exec(tail.join('\n'));ensure(m&&m[1]===m[2]&&safeNumber(Number(m[1])),'Incomplete or skipped Node tests.');
 const p=lines.slice(python),pythonSummaries=p.filter(l=>/^Ran /.test(l));ensure(pythonSummaries.length===1,'Missing or duplicate Python footer.');const pm=/^Ran ([1-9][0-9]*) tests? in [0-9]+(?:[.][0-9]+)?s$/.exec(pythonSummaries[0]);const pi=p.indexOf(pythonSummaries[0]);ensure(pm&&safeNumber(Number(pm[1]))&&p[pi+1]===''&&p[pi+2]==='OK'&&p.filter(l=>l==='OK').length===1,'Incomplete or skipped Python tests.');
 ensure(!p.slice(pi+3).some(l=>/^(?:Ran |OK|FAILED|# tests |# skipped )/.test(l)),'Conflicting log suffix.');
 return {checkoutRef:ref,pullRequestNumber:Number(selected[2]),checkedMergeSha:selected[1],nodeVersion:versions[0].slice(6),nodeTests:Number(m[1]),pythonTests:Number(pm[1]),originalJobLogSha256:hash(log)};
}
export function validateMandatoryValidation(selector,facts,local,checkedAt){
 const s=validationSelector(selector),f=facts,r=f.run,j=f.jobs?.jobs?.[0];utc(checkedAt);
 ensure(local?.sourceSha===s.candidateSha&&local.treeSha===s.candidateTreeSha&&local.workflowSha256===VALIDATION_HASH&&local.parents?.length===2&&local.parents[0]===s.prBaseSha&&local.parents[1]===s.prHeadSha,'Candidate ancestry/workflow differs.');
 ensure(node22(local.publisherRuntime)&&local.publisherRuntime===s.nodeVersion&&local.compilerRuntime===s.nodeVersion,'CI/publisher/compiler runtime differs.');
 ensure(f.workflow?.id===s.workflowId&&f.workflow.path===VALIDATION_PATH&&f.workflow.state==='active','Workflow differs.');
 function run(v){ensure(v?.id===s.runId&&v.run_attempt===s.runAttempt&&v.workflow_id===s.workflowId&&v.path===VALIDATION_PATH&&v.name===VALIDATION_NAME&&v.event==='pull_request'&&v.head_sha===s.prHeadSha&&sameRepo(v.repository)&&sameRepo(v.head_repository)&&v.check_suite_id===s.checkSuiteId&&v.html_url===s.url&&success(v),'Validation run differs.');ensure(Array.isArray(v.pull_requests)&&v.pull_requests.length<=1,'Ambiguous PR association.');for(const pr of v.pull_requests)ensure(pr.number===s.pullRequestNumber&&pr.head?.sha===s.prHeadSha&&sameIdentityRepo(pr.head?.repo)&&pr.base?.ref==='main'&&sameIdentityRepo(pr.base?.repo),'Contradictory PR association.');return {id:v.id,attempt:v.run_attempt,createdAt:apiTime(v.created_at),startedAt:apiTime(v.run_started_at),updatedAt:apiTime(v.updated_at)};}
 const runProjection=run(r);ensure(utc(runProjection.createdAt)<=utc(runProjection.startedAt)&&utc(runProjection.startedAt)<=utc(runProjection.updatedAt),'Reversed validation run.');for(const v of [f.attempt,f.finalRun])ensure(canonical(run(v))===canonical(runProjection),'Latest attempt drifted.');
 ensure(f.jobs.total_count===1&&f.jobs.jobs.length===1&&j.id===s.jobId&&j.run_id===s.runId&&j.run_attempt===s.runAttempt&&j.head_sha===s.prHeadSha&&j.name===VALIDATION_JOB&&success(j)&&j.url===`https://api.github.com/repos/${REPOSITORY}/actions/jobs/${s.jobId}`&&j.run_url===`https://api.github.com/repos/${REPOSITORY}/actions/runs/${s.runId}`&&j.html_url===`https://github.com/${REPOSITORY}/actions/runs/${s.runId}/job/${s.jobId}`&&j.check_run_url===`https://api.github.com/repos/${REPOSITORY}/check-runs/${s.checkRunId}`,'Validation job differs.');
 const startedAt=apiTime(j.started_at),completedAt=apiTime(j.completed_at);ensure(utc(startedAt)<=utc(completedAt)&&utc(runProjection.createdAt)<=utc(startedAt)&&utc(completedAt)<=utc(runProjection.updatedAt),'Validation job clock differs.');
 ensure(j.steps?.length===VALIDATION_STEPS.length,'Unknown validation steps.');let last=utc(startedAt);
 const steps=j.steps.map((v,i)=>{ensure(v.name===VALIDATION_STEPS[i]&&v.number===[1,2,3,4,5,6,7,8,9,17,18,19][i]&&success(v),'Unsuccessful validation step.');const a=apiTime(v.started_at),b=apiTime(v.completed_at);ensure(last<=utc(a)&&utc(a)<=utc(b)&&utc(b)<=utc(completedAt),'Validation step clock differs.');last=utc(b);return {number:v.number,name:v.name,status:'completed',conclusion:'success',startedAt:a,completedAt:b};});
 function check(v){ensure(v?.id===s.checkRunId&&v.name===VALIDATION_JOB&&success(v)&&v.head_sha===s.prHeadSha&&v.app?.id===15368&&v.check_suite?.id===s.checkSuiteId&&apiTime(v.started_at)===startedAt&&apiTime(v.completed_at)===completedAt,'Required check differs.');return {id:v.id,suiteId:v.check_suite.id,appId:15368,name:VALIDATION_JOB,status:'completed',conclusion:'success'};}
 const checkProjection=check(f.check);ensure(canonical(check(f.finalCheck))===canonical(checkProjection),'Required check drifted.');
 ensure(f.commit?.sha===s.checkedMergeSha&&f.commit.tree?.sha===s.checkedTreeSha&&s.checkedTreeSha===s.candidateTreeSha&&f.commit.parents?.length===2&&f.commit.parents[0].sha===local.parents[0]&&f.commit.parents[1].sha===local.parents[1],'Synthetic ancestry differs.');
 const pr=f.mergedPull;ensure(pr?.number===s.pullRequestNumber&&pr.merged===true&&pr.merge_commit_sha===s.candidateSha&&pr.head?.sha===s.prHeadSha&&sameRepo(pr.head?.repo)&&pr.base?.ref==='main'&&sameRepo(pr.base?.repo),'Merged PR differs.');
 ensure(Array.isArray(f.rules)&&f.rules.some(v=>v.type==='required_status_checks'&&v.ruleset_id===25416396&&v.parameters?.required_status_checks?.some(c=>c.context===VALIDATION_JOB&&c.integration_id===15368)),'Required protection differs.');
 const parsed=parseMandatoryValidationLog(f.log);for(const k of ['pullRequestNumber','checkedMergeSha','nodeVersion','nodeTests','pythonTests','originalJobLogSha256'])ensure(parsed[k]===s[k],'Validation log expectation differs.');
 ensure(f.runs?.total_count===f.runs.workflow_runs?.length&&f.runs.total_count>0&&f.runs.total_count<=100,'Incomplete validation run list.');let selected=0;const ids=new Set();
 for(const other of f.runs.workflow_runs){ensure(safeNumber(other.id)&&!ids.has(other.id)&&other.workflow_id===s.workflowId&&other.event==='pull_request'&&other.head_sha===s.prHeadSha&&safeNumber(other.run_attempt),'Invalid validation listing.');ids.add(other.id);if(other.id===s.runId){selected++;ensure(canonical(run(other))===canonical(runProjection),'Selected list attempt differs.');continue;}const a=utc(apiTime(other.created_at)),b=utc(apiTime(other.run_started_at)),c=utc(apiTime(other.updated_at));ensure(a<=b&&b<=c&&other.run_attempt===1&&a<utc(runProjection.createdAt)&&a<utc(startedAt)&&b<utc(startedAt)&&c<utc(startedAt),'Superseding or ambiguous validation run.');}ensure(selected===1,'Selected run absent.');
 const content={version:1,origin:'github-public-api',selector:Object.fromEntries(SELECTOR_KEYS.map(k=>[k,s[k]])),candidateSha:s.candidateSha,candidateTreeSha:s.candidateTreeSha,parents:[...local.parents],checkedMergeSha:s.checkedMergeSha,checkedTreeSha:s.checkedTreeSha,prBaseSha:local.parents[0],checkoutRef:parsed.checkoutRef,pullRequestNumber:parsed.pullRequestNumber,publisherRuntime:local.publisherRuntime,compilerRuntime:local.compilerRuntime,nodeVersion:parsed.nodeVersion,nodeTests:parsed.nodeTests,pythonTests:parsed.pythonTests,originalJobLogSha256:parsed.originalJobLogSha256,workflow:{id:s.workflowId,path:VALIDATION_PATH,sha256:VALIDATION_HASH,state:'active'},run:runProjection,job:{id:s.jobId,name:VALIDATION_JOB,status:'completed',conclusion:'success',startedAt,completedAt,steps},check:checkProjection,rules:{rulesetId:25416396,requiredCheck:VALIDATION_JOB,integrationId:15368}};
 return {...content,contentDigest:hash(canonical(content)),checkedAt};
}
const RECEIPT_KEYS=['version','origin','selector','candidateSha','candidateTreeSha','parents','checkedMergeSha','checkedTreeSha','prBaseSha','checkoutRef','pullRequestNumber','publisherRuntime','compilerRuntime','nodeVersion','nodeTests','pythonTests','originalJobLogSha256','workflow','run','job','check','rules','contentDigest','checkedAt'];
function validateValidationReceipt(v,record){
 ensure(exactKeys(v,RECEIPT_KEYS)&&v.version===1&&v.origin==='github-public-api','Missing validation receipt.');const s=validationSelector(v.selector);const {checkedAt,contentDigest,...content}=v;utc(checkedAt);ensure(hash(canonical(content))===contentDigest&&v.candidateSha===record.sourceSha&&v.candidateSha===s.candidateSha&&v.candidateTreeSha===s.candidateTreeSha&&v.checkedMergeSha===s.checkedMergeSha&&v.checkedTreeSha===s.checkedTreeSha&&v.prBaseSha===s.prBaseSha&&canonical(v.parents)===canonical([s.prBaseSha,s.prHeadSha])&&v.checkoutRef===`refs/remotes/pull/${s.pullRequestNumber}/merge`&&v.pullRequestNumber===s.pullRequestNumber,'Validation receipt content differs.');ensure(node22(v.nodeVersion)&&v.nodeVersion===s.nodeVersion&&v.publisherRuntime===v.nodeVersion&&v.compilerRuntime===v.nodeVersion&&record.build.compiler.runtime===v.nodeVersion&&v.nodeTests===s.nodeTests&&v.pythonTests===s.pythonTests&&v.originalJobLogSha256===s.originalJobLogSha256,'Retained validation runtime/results differ.');
 ensure(exactKeys(v.workflow,['id','path','sha256','state'])&&v.workflow.id===s.workflowId&&v.workflow.path===VALIDATION_PATH&&v.workflow.sha256===VALIDATION_HASH&&v.workflow.state==='active'&&exactKeys(v.run,['id','attempt','createdAt','startedAt','updatedAt'])&&v.run.id===s.runId&&v.run.attempt===s.runAttempt,'Retained workflow/run differs.');for(const k of ['createdAt','startedAt','updatedAt'])utc(v.run[k]);
 ensure(exactKeys(v.job,['id','name','status','conclusion','startedAt','completedAt','steps'])&&v.job.id===s.jobId&&v.job.name===VALIDATION_JOB&&success(v.job)&&v.job.steps?.length===VALIDATION_STEPS.length,'Retained validation job differs.');let prior=utc(v.job.startedAt);for(const [i,step]of v.job.steps.entries()){ensure(exactKeys(step,['number','name','status','conclusion','startedAt','completedAt'])&&step.name===VALIDATION_STEPS[i]&&step.number===[1,2,3,4,5,6,7,8,9,17,18,19][i]&&success(step)&&prior<=utc(step.startedAt)&&utc(step.startedAt)<=utc(step.completedAt)&&utc(step.completedAt)<=utc(v.job.completedAt),'Retained validation step differs.');prior=utc(step.completedAt);}
 ensure(canonical(v.check)===canonical({id:s.checkRunId,suiteId:s.checkSuiteId,appId:15368,name:VALIDATION_JOB,status:'completed',conclusion:'success'})&&canonical(v.rules)===canonical({rulesetId:25416396,requiredCheck:VALIDATION_JOB,integrationId:15368}),'Retained check/protection differs.');return v;
}
function validateMandatoryRecord(record,{invocation=false,now}={}){
 const m=record.mandatoryValidation;ensure(exactKeys(m,invocation?['version','plan','invocation']:['version','plan'])&&m.version===1,'Missing mandatory validation record.');const plan=validateValidationReceipt(m.plan,record);if(invocation){const actual=validateValidationReceipt(m.invocation,record);ensure(actual.contentDigest===plan.contentDigest,'Invocation validation changed.');if(now!==undefined)ensure(utc(actual.checkedAt)<=now&&now-utc(actual.checkedAt)<=30000,'Mandatory validation observation expired.');}return m;
}
function validationLocal(ctx,compilerRuntime=process.version){const parents=git('show','-s','--format=%P',ctx.sourceSha).split(' ');return {sourceSha:ctx.sourceSha,treeSha:git('rev-parse',`${ctx.sourceSha}^{tree}`),parents,workflowSha256:hash(execFileSync('git',['show',`${ctx.sourceSha}:${VALIDATION_PATH}`],{maxBuffer:1024*1024,stdio:['ignore','pipe','pipe']})),publisherRuntime:process.version,compilerRuntime};}
// Duplicate keys are rejected before JSON.parse can silently discard them.
function strictJson(text){let i=0;function space(){while(/\s/.test(text[i]||'')&&i<text.length)i++;}function value(){space();if(text[i]==='{'){i++;const seen=new Set();space();if(text[i]==='}'){i++;return;}while(true){space();ensure(text[i]==='"','Invalid JSON.');const key=string();ensure(!seen.has(key),'Duplicate JSON key.');seen.add(key);space();ensure(text[i++]===':','Invalid JSON.');value();space();const c=text[i++];if(c==='}')return;ensure(c===',','Invalid JSON.');}}else if(text[i]==='['){i++;space();if(text[i]===']'){i++;return;}while(true){value();space();const c=text[i++];if(c===']')return;ensure(c===',','Invalid JSON.');}}else if(text[i]==='"')string();else{const m=/^(?:true|false|null|-?(?:0|[1-9][0-9]*)(?:[.][0-9]+)?(?:[eE][+-]?[0-9]+)?)/.exec(text.slice(i));ensure(m,'Invalid JSON.');i+=m[0].length;}}function string(){const start=i++;while(i<text.length){if(text[i]==='\\'){i+=2;continue;}if(text[i++]==='"')return JSON.parse(text.slice(start,i));}throw Error('Invalid JSON.');}value();space();ensure(i===text.length,'Invalid JSON.');return JSON.parse(text);}
function nativeGitHubToken(){const token=process.env.GH_TOKEN;ensure(typeof token==='string'&&token.trim().length>0&&!/[\r\n]/.test(token),'Native GitHub token required.');return token;}
export async function readMandatoryValidation(selector,local,{phase='plan'}={}){
 try{
 const token=nativeGitHubToken();ensure(['plan','invocation'].includes(phase),'Invalid validation phase.');
 const s=validationSelector(selector),origin=`https://api.github.com/repos/${REPOSITORY}/`,deadline=Date.now()+30000,controller=new AbortController(),timer=setTimeout(()=>controller.abort(),30000);let calls=0;
 const apiPaths=new Set([`actions/workflows/${s.workflowId}`,`actions/runs/${s.runId}`,`actions/runs/${s.runId}/attempts/${s.runAttempt}`,`actions/runs/${s.runId}/attempts/${s.runAttempt}/jobs?per_page=100`,`check-runs/${s.checkRunId}`,`git/commits/${s.checkedMergeSha}`,`pulls/${s.pullRequestNumber}`,'rules/branches/main',`actions/jobs/${s.jobId}/logs`,`actions/workflows/${s.workflowId}/runs?event=pull_request&head_sha=${s.prHeadSha}&per_page=100`]);
 async function body(response,max){const chunks=[];let size=0;ensure(response.body&&typeof response.body.getReader==='function','Missing bounded response stream.');const reader=response.body.getReader();try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;ensure(size<=max&&Date.now()<=deadline,'Response limit exceeded.');chunks.push(Buffer.from(value));}}finally{reader.releaseLock();}return new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(Buffer.concat(chunks));}
 async function get(path,{log=false,download=false}={}){
 ensure(++calls<=13&&Date.now()<=deadline,'Validation read budget exceeded.');const url=download?path:origin+path;
 if(!download){const target=new URL(url);ensure(apiPaths.has(path)&&target.origin==='https://api.github.com'&&!target.username&&!target.password&&(!target.port||target.port==='443')&&target.pathname.startsWith(`/repos/${REPOSITORY}/`),'Invalid evidence origin.');}
 const response=await fetch(url,{method:'GET',redirect:log?'manual':'error',signal:controller.signal,credentials:'omit',referrerPolicy:'no-referrer',...(download?{}:{headers:{Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',Authorization:`Bearer ${token}`}})});ensure(Date.now()<=deadline,'Validation read expired.');
 if(!download){const remaining=response.headers.get('x-ratelimit-remaining'),end=response.headers.get('x-ratelimit-reset');ensure(/^(?:0|[1-9][0-9]*)$/.test(remaining||'')&&/^[1-9][0-9]*$/.test(end||''),'Missing quota headers.');const needed=(phase==='plan'?31:18)-(calls-1);ensure(Number.isSafeInteger(Number(remaining))&&Number.isSafeInteger(Number(end)*1000)&&Number(remaining)>=needed&&Number(end)*1000>Date.now(),'Insufficient public API reserve.');ensure(!response.headers.get('link'),'Paginated validation response.');}
 if(log){ensure(response.status===302,'Missing official log redirect.');const location=response.headers.get('location');ensure(typeof location==='string'&&location.length>0&&location.length<=4096&&/^[\x21-\x7e]+$/.test(location)&&!location.includes('\\'),'Invalid log redirect.');const u=new URL(location),host=u.hostname;ensure(u.protocol==='https:'&&location.startsWith('https://')&&!u.username&&!u.password&&(!u.port||u.port==='443')&&!u.hash&&host&&!host.endsWith('.')&&host.length<=253&&host.split('.').every(label=>/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))&&(host==='results-receiver.actions.githubusercontent.com'||host.endsWith('.blob.core.windows.net'))&&[host,host+':443'].includes(u.host),'Invalid log redirect.');return location;}
 ensure(response.status===200,'Public validation read failed.');const type=response.headers.get('content-type')||'';ensure(download?/^text\/plain(?:;|$)/i.test(type):/^(?:application\/json|application\/vnd[.]github[+]json)(?:;|$)/i.test(type),'Unexpected validation media.');const text=await body(response,download?4*1024*1024:1024*1024);return download?text:strictJson(text);
 }
 try{
 const workflow=await get(`actions/workflows/${s.workflowId}`),run=await get(`actions/runs/${s.runId}`),attempt=await get(`actions/runs/${s.runId}/attempts/${s.runAttempt}`),jobs=await get(`actions/runs/${s.runId}/attempts/${s.runAttempt}/jobs?per_page=100`);
 ensure(jobs.total_count===1&&jobs.jobs?.length===1&&jobs.jobs[0].id===s.jobId&&jobs.jobs[0].check_run_url===origin+`check-runs/${s.checkRunId}`,'Unbound validation job.');
 const check=await get(`check-runs/${s.checkRunId}`),commit=await get(`git/commits/${s.checkedMergeSha}`),mergedPull=await get(`pulls/${s.pullRequestNumber}`),rules=await get('rules/branches/main');const location=await get(`actions/jobs/${s.jobId}/logs`,{log:true}),log=await get(location,{download:true});const runs=await get(`actions/workflows/${s.workflowId}/runs?event=pull_request&head_sha=${s.prHeadSha}&per_page=100`),finalRun=await get(`actions/runs/${s.runId}`),finalCheck=await get(`check-runs/${s.checkRunId}`);
 const receipt=validateMandatoryValidation(s,{workflow,run,attempt,jobs,check,commit,mergedPull,rules,log,runs,finalRun,finalCheck},local,new Date().toISOString());ensure(Date.now()<=deadline,'Validation read expired.');return receipt;
 }finally{clearTimeout(timer);controller.abort();}
 }catch{throw Error('Mandatory public GitHub validation failed.');}
}

// Hash the actual inner multipart File, never a separate prebuild or a rewritten module.
const TOOLING_PATHS=new Set(['.github/workflows/publish.yml','docs/release-process.md','docs/releases/README.md','scripts/check-admin-deployment.mjs','scripts/check-catalogue-deployment.mjs','scripts/check-deployment.mjs','scripts/check-security-deployment.mjs','scripts/release-manifest.mjs','tests/deployment-safety.test.mjs','tests/release-cli.test.mjs','tests/release-manifest.test.mjs']);
// Source recognition confers no publication authority on these shared modules.
const SHARED_RUNTIME_PATHS=new Set(['shared/finance-costs.mjs','shared/finance-report.mjs']);
// Independently reviewed M/S to corrected PR47 content, including its separate
// nonshipping print regression. Suffixes and operator lists confer no authority.
const PRESENTATION_ENTRIES=[
 ['index.html','615e463834f226d6cf1ebcd03e5531b9c8535f69','618e5002998db47014174393216c913eede6fb01'],
 ['src/button-system.css','0c5790252e1dc1ffe5f48674efc208cbffd3f6e0','7fad2ba9c9e4d501adbbf18f4de66feb9d5e5cfd'],
 ['src/consistency.css','2bee9d951e0438db52d304efea6e86d0be9c8a4c','acc40d8da9b2c393f85d06bffea1a4628c109a56'],
 ['src/designs/collection-picker.css','c80088a6c8b8e6f898b46c706d7617f34e26814a','0f6aa6df61241ed473a102ff7811c61a5371f7e4'],
 ['tests/contact-print.browser.mjs',null,'116ef654d68b438fc646d4be8563b37b3cab9b59']
].map(([path,baseBlob,candidateBlob])=>({path,mode:'100644',baseBlob,candidateBlob}));
const PRESENTATION_PATHS=new Set(PRESENTATION_ENTRIES.map(v=>v.path));
function validatePresentationInputs(value){
 ensure(exactKeys(value,['baselineSourceInputDigest','sourceInputDigest','protectedInputDigest','entries'])&&['baselineSourceInputDigest','sourceInputDigest','protectedInputDigest'].every(k=>DIGEST.test(value[k]||''))&&value.baselineSourceInputDigest!==value.sourceInputDigest&&canonical(value.entries)===canonical(PRESENTATION_ENTRIES),'Presentation inputs are not the independently reviewed content.');return value;
}
function trackedTree(sha){
 ensure(SHA.test(sha||''),'Invalid presentation source.');
 const entries=git('ls-tree','-rz',sha).split('\0').filter(Boolean).map(line=>{const m=/^(100644|100755) blob ([a-f0-9]{40})\t([^\0\r\n]+)$/.exec(line);ensure(m,'Presentation tree contains an unsupported file mode or type.');return {path:m[3],mode:m[1],blob:m[2]};});
 ensure(entries.length>0&&new Set(entries.map(v=>v.path)).size===entries.length,'Incomplete presentation tree.');return entries;
}
export function presentationInputs(baseSha,sourceSha,{archivePath}={}){
 const before=trackedTree(baseSha),after=trackedTree(sourceSha),prior=new Map(before.map(v=>[v.path,v])),current=new Map(after.map(v=>[v.path,v]));
 for(const v of PRESENTATION_ENTRIES){const a=prior.get(v.path),b=current.get(v.path);ensure((v.baseBlob===null?!a:a?.mode===v.mode&&a.blob===v.baseBlob)&&b?.mode===v.mode&&b.blob===v.candidateBlob,'Presentation blob or mode differs from the independent review.');}
 const protectedEntries=entries=>entries.filter(v=>!TOOLING_PATHS.has(v.path)&&!PRESENTATION_PATHS.has(v.path)&&v.path!==archivePath).sort((a,b)=>a.path.localeCompare(b.path,'en'));
 const protectedBefore=protectedEntries(before),protectedAfter=protectedEntries(after);ensure(canonical(protectedBefore)===canonical(protectedAfter),'Protected presentation inputs changed.');
 // The sole excluded test must not become a shipping import. All other shipping
 // source remains protected, including build programs and their input files.
 const shipping=after.filter(v=>isSourceInput(v.path)&&/[.](mjs|js|jsx|ts|tsx)$/.test(v.path)).map(v=>v.path);
 if(shipping.length){let referenced;try{referenced=git('grep','-I','-l','-F','contact-print.browser',sourceSha,'--',...shipping);}catch(error){ensure(error.status===1,'Cannot verify nonshipping presentation test.');}ensure(!referenced,'Presentation test is a shipping dependency.');}
 const inputs=entries=>hash(entries.filter(v=>isSourceInput(v.path)).sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0).map(v=>`${v.path}\0${v.blob}`).join('\n'));
 return validatePresentationInputs({baselineSourceInputDigest:inputs(before),sourceInputDigest:inputs(after),protectedInputDigest:hash(canonical(protectedBefore)),entries:structuredClone(PRESENTATION_ENTRIES)});
}
const CONTROL_NAMES=['_headers','_redirects','_routes.json'];
const UPLOAD_KEYS=['manifest','branch','commit_hash','commit_dirty','_worker.bundle','functions-filepath-routing-config.json','wrangler_config_hash','pages_build_output_dir',...CONTROL_NAMES];
const exactKeys=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).sort().join('\0')===[...keys].sort().join('\0');
function canonical(value){return JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);}
const digestBytes=bytes=>({sha256:hash(bytes),bytes:bytes.length});
function multipartParts(bytes){
 ensure(Buffer.isBuffer(bytes)&&bytes.length>0&&bytes.length<=32*1024*1024,'Invalid Worker multipart size.');
 const line=bytes.indexOf('\r\n');ensure(line>2&&line<100,'Invalid Worker multipart boundary.');
 const delimiter=bytes.subarray(0,line);ensure(/^--[-a-zA-Z0-9]{8,96}$/.test(delimiter.toString()),'Invalid Worker multipart boundary.');
 const separator=Buffer.concat([Buffer.from('\r\n'),delimiter]);const parts=[];let cursor=line+2;
 while(cursor<bytes.length){
  ensure(parts.length<32,'Too many Worker parts.');const end=bytes.indexOf(separator,cursor);ensure(end>=0,'Unterminated Worker multipart.');
  const headerEnd=bytes.indexOf('\r\n\r\n',cursor);ensure(headerEnd>=cursor&&headerEnd<end&&headerEnd-cursor<1024,'Invalid Worker part headers.');
  const header=bytes.subarray(cursor,headerEnd).toString('utf8');const match=/^Content-Disposition: form-data; name="([a-zA-Z0-9_.-]+)"(?:; filename="([a-zA-Z0-9_.-]+)")?(?:\r\nContent-Type: ([a-zA-Z0-9/+.-]+))?$/.exec(header);
  ensure(match&&(!match[2]||match[2]===match[1]),'Unexpected Worker part headers.');
  parts.push({name:match[1],filename:match[2],type:match[3]||'',bytes:bytes.subarray(headerEnd+4,end)});
  cursor=end+separator.length;
  if(bytes.subarray(cursor,cursor+2).toString()==='--'){cursor+=2;if(bytes.subarray(cursor).toString()==='\r\n')cursor+=2;ensure(cursor===bytes.length,'Unexpected Worker multipart suffix.');break;}
  ensure(bytes.subarray(cursor,cursor+2).toString()==='\r\n','Invalid Worker separator.');cursor+=2;
 }
 ensure(new Set(parts.map(p=>p.name)).size===parts.length,'Duplicate Worker part.');return parts;
}
function safeAssetInventory(inventory){
 ensure(Array.isArray(inventory)&&inventory.length>0&&inventory.length<30000,'Missing local asset inventory.');
 const paths=new Set();return inventory.map(v=>{ensure(exactKeys(v,['path','sha256','bytes'])&&typeof v.path==='string'&&v.path.length<400&&/^[a-zA-Z0-9_./@+ -]+$/.test(v.path)&&!v.path.startsWith('/')&&!v.path.split('/').includes('..')&&DIGEST.test(v.sha256)&&Number.isSafeInteger(v.bytes)&&v.bytes>=0&&!paths.has(v.path),'Invalid local asset fingerprint.');paths.add(v.path);return {...v};}).sort((a,b)=>a.path.localeCompare(b.path,'en'));
}
function expectedMetadata(config,main){
 ensure(config?.name===PAGES_PROJECT&&config.compatibility_date==='2026-06-16'&&config.limits?.cpu_ms===1000&&config.env?.production?.vars?.SITE_GATE_ENABLED==='true','Unexpected reviewed Pages configuration.');
 const production=config.env.production;ensure(exactKeys(production.vars,['SITE_GATE_ENABLED','LOCKER_LOOKUP_ENABLED','SUBMISSIONS_ENABLED','ARTWORK_STORAGE_ENABLED','ORDER_RECORDS_ENABLED','MAP_LOOKUP_ENABLED','LOCKER_SHARED_ENABLED'])&&Object.values(production.vars).every(v=>v==='true')&&canonical(production.services)===canonical([{binding:'AUTH',service:'customvibe-security'},{binding:'CATALOGUE',service:'customvibe-catalogue'}]),'Unexpected reviewed production bindings.');
 return {main_module:main,bindings:[...Object.entries(production.vars).map(([name,text])=>({name,type:'plain_text',text})),...production.services.map(v=>({name:v.binding,type:'service',service:v.service}))],compatibility_date:config.compatibility_date,compatibility_flags:[],limits:{cpu_ms:1000}};
}
function proofContext(expected){
 ensure(SHA.test(expected.sourceSha||'')&&/^[1-9][0-9]{0,19}$/.test(expected.runId||'')&&['sourceInputDigest','compilerConfigDigest','configDigest','buildDigest','assetsDigest'].every(k=>DIGEST.test(expected[k]||'')),'Missing upload provenance binding.');
 return Object.fromEntries(['sourceSha','runId','sourceInputDigest','compilerConfigDigest','configDigest','buildDigest','assetsDigest'].map(k=>[k,expected[k]]));
}
export function capturePagesAcknowledgement(response,{sourceSha}){
 ensure(SHA.test(sourceSha||'')&&ID.test(response?.id||'')&&response.environment==='production'&&response.deployment_trigger?.metadata?.commit_hash===sourceSha,'Missing source-bound uploader acknowledgement.');
 ensure(typeof response.created_on==='string'&&response.created_on.length<=35&&Number.isFinite(Date.parse(response.created_on))&&Date.parse(response.created_on)<=Date.now()+30000,'Invalid uploader acknowledgement time.');
 return {id:response.id,sourceSha,environment:'production',createdAt:new Date(response.created_on).toISOString()};
}
export async function capturePagesUpload(result,expected){
 try{
 const binding=proofContext(expected),form=result?.formData;ensure(form&&typeof form.entries==='function','No returned uploader FormData.');
 const entries=[...form.entries()];ensure(entries.length<=UPLOAD_KEYS.length&&new Set(entries.map(([k])=>k)).size===entries.length&&entries.every(([k])=>UPLOAD_KEYS.includes(k)),'Unexpected returned upload entry.');
 const fields=new Map(entries);for(const k of UPLOAD_KEYS.filter(k=>!CONTROL_NAMES.includes(k)))ensure(fields.has(k),'Missing returned upload entry.');
 ensure(fields.get('branch')==='main'&&fields.get('commit_hash')===binding.sourceSha&&fields.get('commit_dirty')==='false'&&fields.get('wrangler_config_hash')===expected.configDigest&&fields.get('pages_build_output_dir')==='dist/client','Returned upload source/config differs.');
 const controls={};
 for(const k of [...CONTROL_NAMES,'functions-filepath-routing-config.json']){
  const file=fields.get(k);if(CONTROL_NAMES.includes(k)&&!expected.controls?.[k]){ensure(!file,'Unexpected control upload.');continue;}
  ensure(file?.name===k&&typeof file.arrayBuffer==='function'&&file.size>0&&file.size<1024*1024,'Missing or invalid upload control.');const data=Buffer.from(await file.arrayBuffer());controls[k]=digestBytes(data);
  if(k!=='functions-filepath-routing-config.json')ensure(canonical(controls[k])===canonical(expected.controls[k]),'Uploaded controls changed.');
 }
 const assetInventory=safeAssetInventory(expected.assetInventory),manifest=JSON.parse(fields.get('manifest'));
 const paths=assetInventory.filter(v=>!CONTROL_NAMES.includes(v.path)).map(v=>'/'+v.path).sort();
 ensure(exactKeys(manifest,paths)&&Object.values(manifest).every(v=>typeof v==='string'&&/^[a-f0-9]{32}$/.test(v)),'Uploaded asset manifest differs from local assets.');
 const worker=fields.get('_worker.bundle');ensure(worker?.name==='_worker.bundle'&&typeof worker.arrayBuffer==='function'&&worker.size>0&&worker.size<=32*1024*1024,'Missing actual uploaded Worker File.');
 const bytes=Buffer.from(await worker.arrayBuffer()),parts=multipartParts(bytes),metadataPart=parts.find(p=>p.name==='metadata');
 ensure(parts.length===2&&metadataPart&&!metadataPart.filename&&metadataPart.bytes.length<32000,'Unexpected Worker module inventory.');
 const metadata=JSON.parse(metadataPart.bytes.toString('utf8'));ensure(/^functionsWorker-0[.][0-9]+[.]js$/.test(metadata.main_module||'')&&canonical(metadata)===canonical(expectedMetadata(expected.config,metadata.main_module)),'Unexpected Worker upload metadata.');
 const module=parts.find(p=>p.name===metadata.main_module);ensure(module?.filename===metadata.main_module&&module.type==='application/javascript+module'&&module.bytes.length>0,'Unexpected Worker executable.');
 const acknowledgement=capturePagesAcknowledgement(result.deploymentResponse,binding);
 const proof={pagesUploadEvidenceVersion:1,...binding,uploadedBundleDigest:hash(bytes),uploadedBundleBytes:bytes.length,uploadedModuleInventory:[{name:module.name,type:module.type,...digestBytes(module.bytes)}],metadataDigest:hash(metadataPart.bytes),controlInventory:controls,assetManifestDigest:hash(fields.get('manifest')),assetInventory,acknowledgement};
 return {...proof,integrityDigest:hash(canonical(proof))};
 }catch{throw Error('Returned Pages upload fingerprints are invalid.');}
}
export function validatePagesUploadEvidence(value,expected){
 const keys=['pagesUploadEvidenceVersion','sourceSha','runId','sourceInputDigest','compilerConfigDigest','configDigest','buildDigest','assetsDigest','uploadedBundleDigest','uploadedBundleBytes','uploadedModuleInventory','metadataDigest','controlInventory','assetManifestDigest','assetInventory','acknowledgement','integrityDigest'];
 ensure(exactKeys(value,keys)&&value.pagesUploadEvidenceVersion===1,'Missing acknowledged upload evidence.');
 const {integrityDigest,...proof}=value;ensure(DIGEST.test(integrityDigest||'')&&hash(canonical(proof))===integrityDigest,'Upload artifact integrity mismatch.');
 for(const [k,v] of Object.entries(proofContext(expected)))ensure(value[k]===v,'Upload evidence belongs to another source/run/build/compiler.');
 for(const k of ['uploadedBundleDigest','metadataDigest','assetManifestDigest'])ensure(DIGEST.test(value[k]),'Invalid uploaded fingerprint.');
 ensure(Number.isSafeInteger(value.uploadedBundleBytes)&&value.uploadedBundleBytes>0&&value.uploadedBundleBytes<=32*1024*1024,'Invalid uploaded size.');
 ensure(Array.isArray(value.uploadedModuleInventory)&&value.uploadedModuleInventory.length===1&&value.uploadedModuleInventory.every(v=>exactKeys(v,['name','type','sha256','bytes'])&&/^functionsWorker-0[.][0-9]+[.]js$/.test(v.name)&&v.type==='application/javascript+module'&&DIGEST.test(v.sha256)&&Number.isSafeInteger(v.bytes)&&v.bytes>0),'Invalid module fingerprints.');
 ensure(Object.keys(value.controlInventory).every(k=>[...CONTROL_NAMES,'functions-filepath-routing-config.json'].includes(k))&&value.controlInventory['functions-filepath-routing-config.json'],'Invalid control fingerprints.');
 for(const v of Object.values(value.controlInventory))ensure(exactKeys(v,['sha256','bytes'])&&DIGEST.test(v.sha256)&&Number.isSafeInteger(v.bytes)&&v.bytes>0,'Invalid control fingerprint.');
 if(expected.controls)for(const k of CONTROL_NAMES)ensure(canonical(value.controlInventory[k])===canonical(expected.controls[k]),'Control fingerprint mismatch.');
 const assets=safeAssetInventory(value.assetInventory);if(expected.assetInventory)ensure(canonical(assets)===canonical(safeAssetInventory(expected.assetInventory)),'Asset fingerprint mismatch.');
 const ack=value.acknowledgement;ensure(exactKeys(ack,['id','sourceSha','environment','createdAt'])&&ID.test(ack.id)&&(!expected.id||ack.id===expected.id)&&ack.sourceSha===value.sourceSha&&ack.environment==='production'&&typeof ack.createdAt==='string'&&Number.isFinite(Date.parse(ack.createdAt))&&new Date(ack.createdAt).toISOString()===ack.createdAt,'Upload acknowledgement mismatch.');
 return structuredClone(value);
}
// A release archive is a reviewed historical record, not arbitrary JSON whose
// filename happens to be under docs/. Never infer source provenance from its URL.
const ARCHIVE_RECORD_KEYS=['schemaVersion','repository','state','required','completed','reasons','planComplete','sourceSha','workflow','observedAt','baseSha','paths','schemas','beforePagesSourceSha','before','components','sourceDigests','schemaSources','build','activationCompatibility','prerequisites','evidence','guards','attempts','pagesUploadEvidence','githubArtifact','finalProtection','finalIdentityReadbacks','archivedRelease','historicalFunctionsDigest','runAttempt','prewriteValidation','completionEvidence','mandatoryValidation'];
function historicalTime(value){ensure(typeof value==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d[.]\d{3}Z$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString()===value&&Date.parse(value)<=Date.now()+30000,'Invalid historical observation.');return value;}
export function validateReleaseArchiveRecord(record,{sourceSha,candidateSha,baseline}={}){
 if(record?.kind==='paired-release-recovery-v1')return validatePairedRecoveryRecord(record,{sourceSha,candidateSha,baseline});
 const summary=validateBaseline(record);ensure(summary.state==='verified'&&record.schemaVersion===2&&record.sourceSha===sourceSha&&sourceSha!==candidateSha,'Archive is not the completed historical baseline.');
 ensure(Object.keys(record).every(k=>ARCHIVE_RECORD_KEYS.includes(k))&&(!record.reasons||record.reasons.length===0)&&(!('planComplete' in record)||record.planComplete===true),'Archive contains unknown or incomplete release fields.');
 const receipts={};
 ensure(exactKeys(record.components,COMPONENTS)&&exactKeys(record.completed,COMPONENTS),'Archive needs all four original receipts and completions.');
 for(const c of COMPONENTS){
  ensure(exactKeys(record.components[c],['receipt']),'Archive component contains unrecognized data.');const raw=record.components[c].receipt;
  const safe=validateReceipt(raw,{component:c,id:raw?.id,sourceDigest:raw?.sourceDigest});
  ensure(canonical(raw)===canonical(safe)&&exactKeys(record.completed[c],['id'])&&record.completed[c].id===safe.id,'Archive receipt/completion is not sanitized and source-bound.');
  if(baseline){const prior=baseline.components?.[c]?.receipt;ensure(canonical(safe)===canonical(validateReceipt(prior,{component:c,id:prior?.id,sourceDigest:prior?.sourceDigest})),'Archive relabels the reviewed baseline receipt.');}
  ensure(!safe.evidenceUrl.includes('/blob/'+candidateSha+'/'),'Archived receipt cannot refer to its future archive commit.');receipts[c]=safe;
 }
 ensure(receipts.pages.sourceSha===sourceSha,'Historical Pages source mismatch.');
 if(record.build?.inactiveDelivery){const check=record.finalProtection?.checks?.find(v=>v.component==='pages');validateInactiveIngress(check?.inactiveIngress,{id:receipts.pages.id,sourceSha,now:utc(check?.identityObservedAt)});}
 const final=record.finalProtection;ensure(final?.status==='passed'&&final.expectedSourceSha===sourceSha&&Array.isArray(final.checks)&&final.checks.length===4,'Archive lacks complete final protections.');historicalTime(final.observedAt);
 ensure(new Set(final.checks.map(v=>v.component)).size===4&&Array.isArray(record.finalIdentityReadbacks)&&record.finalIdentityReadbacks.length===4&&new Set(record.finalIdentityReadbacks.map(v=>v.component)).size===4,'Archive lacks independent final readbacks.');
 for(const c of COMPONENTS){
  const check=final.checks.find(v=>v.component===c),read=record.finalIdentityReadbacks.find(v=>v.component===c);
  ensure(check?.status==='passed'&&check.identityStatus==='passed'&&!check.code&&!check.identityCode&&check.expectedId===receipts[c].id&&check.observedId===receipts[c].id&&read?.identityStatus==='passed'&&!read.identityCode&&read.expectedId===check.expectedId&&read.observedId===check.observedId,'Archive final identity does not bind the original receipt.');
  historicalTime(check.protectionObservedAt);historicalTime(check.identityObservedAt);ensure(read.identityObservedAt===check.identityObservedAt,'Archive readback observation differs.');
  if(c==='pages')ensure(check.observedSourceSha===sourceSha&&read.observedSourceSha===sourceSha,'Archive final Pages source differs.');
 }
 if(record.workflow){ensure(exactKeys(record.workflow,['runId','url','event'])&&/^[1-9][0-9]{0,19}$/.test(record.workflow.runId)&&record.workflow.url===`https://github.com/${REPOSITORY}/actions/runs/${record.workflow.runId}`&&['push','workflow_dispatch'].includes(record.workflow.event)&&receipts.pages.evidenceUrl===record.workflow.url,'Archive workflow does not retain the original actual Pages run.');}
 if(record.historicalFunctionsDigest!==undefined)ensure(record.historicalFunctionsDigest===null,'Historical unknown Functions bytes cannot be inferred.');
 if(record.pagesUploadEvidence){const build=record.build;validatePagesUploadEvidence(record.pagesUploadEvidence,{sourceSha,runId:record.workflow?.runId,sourceInputDigest:build?.sourceInputDigest,compilerConfigDigest:build?.compiler?.compilerConfigDigest,configDigest:build?.compiler?.configDigest,buildDigest:build?.pages?.sha256,assetsDigest:build?.pages?.sha256,id:receipts.pages.id});}
 if(record.pagesUploadEvidence){
  ensure(record.prewriteValidation&&record.completionEvidence,'Automated archives require actual prewrite and current completion evidence.');
  validateArtifactHandoff(record.githubArtifact,{record,manifestDigest:record.githubArtifact?.manifestSha256});
  const completion=record.completionEvidence;
  ensure(exactKeys(completion,['version','prewriteValidationDigest','completedAt','evidence'])&&completion.version===1&&completion.prewriteValidationDigest===record.prewriteValidation.integrityDigest,'Invalid completion evidence shape.');historicalTime(completion.completedAt);
  const checked=completePair({record,evidence:completion.evidence,observed:{pagesSha:sourceSha,versions:Object.fromEntries(COMPONENTS.map(c=>[c,receipts[c].id]))},now:utc(completion.completedAt)});
  ensure(canonical(checked.completionEvidence)===canonical(completion),'Completion evidence contains unknown or altered fields.');
  if(record.build?.inactiveDelivery)ensure(canonical(checked.components)===canonical(record.components)&&canonical(checked.prerequisites)===canonical(record.prerequisites),'Inactive Delivery archive changed the actual mixed component receipts or prerequisites.');
 }else ensure(!('prewriteValidation' in record)&&!('completionEvidence' in record)&&!('runAttempt' in record)&&!('attempts' in record)&&!('build' in record)&&!('activationCompatibility' in record)&&!('mandatoryValidation' in record),'Automated records cannot fall back to the historical manual archive path.');
 // Reject payload-bearing or secret/provider diagnostic fields anywhere. Other
 // provenance content is accepted only through the exact reviewed archive hash.
 validateArchiveMetadata(record,candidateSha);
 return {sourceSha,receiptDigest:hash(canonical(receipts))};
}
function validateArchiveMetadata(record,candidateSha){
 let nodes=0;function bounded(value){ensure(++nodes<=30000,'Archive metadata is too large.');if(Array.isArray(value)){ensure(value.length<=30000,'Archive array is too large.');for(const item of value)bounded(item);}else if(value&&typeof value==='object'){for(const [key,item]of Object.entries(value)){ensure(!/^(?:token|secret|secret_key|password|customer|body|raw|output|stdout|stderr|formdata|bindings|env_vars|diagnostic|diagnostics|providerresponse|providerdiagnostics)$/i.test(key),'Archive contains raw or private payload fields.');bounded(item);}}else if(typeof value==='string')ensure(value.length<=1000&&!value.includes('/blob/'+candidateSha+'/'),'Archive contains unbounded or self-referential metadata.');else ensure(value===null||typeof value==='boolean'||(typeof value==='number'&&Number.isFinite(value)),'Invalid archive metadata.');}bounded(record);
}
// A new recovery entry never replaces or edits a failed working manifest.
// This policy admits only the independently proved T invocation failure.
const PAIRED_RECOVERY_POLICY=Object.freeze(
{
 "sourceSha":"8058ccfb7313e359043e0148e2b514327b8fb04a",
 "original":{"bytes":148701,"sha256":"c9271253c236391104164adab499a6c5ddd9091b28f2100d5c6391337655ca15","canonicalSha256":"6d61acc807c82695aa41f789d34decc79d1ecf24e0e6224448d0d69f7e4ffb86"},
 "failed":{"bytes":154660,"sha256":"aafa0cdc1adce87e8a9bff0e58bec49bc9e886de396040cb325f2b44a3b1d26c","canonicalSha256":"e286990d3ffc233fc0a3630fb1456f9f52e97556135854eeab7d60b931084d24"},
 "admin":{"bytes":624,"sha256":"8572fc97b636081623af0b31ec99d72a03ac1b9489ddec9e9f6be8c6aa490745","canonicalSha256":"d4ef680cc1f7ed17339c92995be4f0bca4a198709e70b694c12904e61e352c6c"},
 "zipSha256":"61e2a0749a4e6a6077fa79d7f62bb39268b815a1611bdc536d619650ab6a39eb",
 "artifactCanonicalSha256":"c25605d0d105dfe757bcbd14a9bdf746821ac39fd9220284af66fbb101e8ad4e",
 "stampVersion":2,
 "leasePath":"/private/tmp/customvibe-artwork-access.lease",
 "nodeRuntime":"v24.19.0",
 "compilerRoot":"node_modules",
 "installedInputs":{"sha256":"92f1cbb0e4ec704fcdda1b273b88a3e1ccea33c044df3a30370ceccae65b7390","fileCount":13436,"bytes":284043434},
 "nodeSha256":"2bf0da35856edc1840d7cbc90e937811bf23a03d44aea07e4b491be44af18d91",
 "docChanges":[{"path":"docs/dependency-maintenance.md","before":{"mode":"100644","blob":"edd3924c040c9ad534dc506004a69608f1dbbcc2"},"after":{"mode":"100644","blob":"65b03d43ddd58dfdd95a97c80ee93cdf3a6ac460"}}]
});
const RECOVERY_REASON='FINAL_GUARD_FAILED: One or more local component protections failed.';
const RECOVERY_PATHS=new Set(['scripts/release-manifest.mjs','tests/release-manifest.test.mjs','tests/release-cli.test.mjs','docs/release-process.md','docs/releases/README.md']);
function recoveryMember(value,key){
 const expected=PAIRED_RECOVERY_POLICY[key];
 ensure(exactKeys(value,['sha256','canonicalSha256','bytes','value'])&&value.sha256===expected.sha256&&value.canonicalSha256===expected.canonicalSha256&&hash(canonical(value.value))===expected.canonicalSha256&&value.bytes===expected.bytes&&Number.isSafeInteger(value.bytes)&&value.bytes>0&&value.bytes<1024*1024,'Immutable recovery history differs.');return value.value;
}
export function validatePairedRecoveryHistory(history){
 ensure(history&&typeof history==='object','Immutable recovery history missing.');
 const original=recoveryMember(history.original,'original'),failed=recoveryMember(history.failed,'failed'),admin=recoveryMember(history.admin,'admin');
 ensure(original.schemaVersion===2&&original.sourceSha===PAIRED_RECOVERY_POLICY.sourceSha&&original.repository===REPOSITORY&&original.state==='partial'&&original.planComplete===true&&original.reasons.length===0&&original.prewriteValidation?.version===PAIRED_RECOVERY_POLICY.stampVersion&&original.attempts?.length===1&&original.attempts[0].outcome==='observed','Original acknowledged release is not eligible.');
 ensure(failed.sourceSha===original.sourceSha&&failed.state==='partial'&&canonical(failed.reasons)===canonical([RECOVERY_REASON])&&!failed.completionEvidence&&canonical(authorizationSnapshot(failed,original.prewriteValidation.version))===canonical(authorizationSnapshot(original,original.prewriteValidation.version))&&canonical(failed.attempts)===canonical(original.attempts),'Failed recovery history is not the retained invocation failure.');
 ensure(hash(canonical(history.artifact))===PAIRED_RECOVERY_POLICY.artifactCanonicalSha256,'Immutable actual GitHub handoff differs.');
 const artifact=validateArtifactHandoff(history.artifact,{record:original,manifestDigest:history.original.sha256});ensure(artifact.zipSha256===PAIRED_RECOVERY_POLICY.zipSha256,'Original ZIP differs.');
 validatePrewriteAuthorization(original,{repository:REPOSITORY,sourceSha:original.sourceSha,runId:artifact.runId,runAttempt:artifact.runAttempt});
 ensure(failed.finalProtection?.status==='failed'&&failed.finalProtection.checks?.length===4&&failed.finalIdentityReadbacks?.length===4,'Historical failure proof incomplete.');
 for(const c of COMPONENTS){const g=failed.finalProtection.checks.find(v=>v.component===c),r=failed.finalIdentityReadbacks.find(v=>v.component===c),id=failed.completed[c]?.id;ensure(g?.status==='failed'&&g.code==='PROTECTION_OBSERVATION_FAILED'&&g.identityStatus==='passed'&&g.expectedId===id&&g.observedId===id&&r?.identityStatus==='passed'&&r.observedId===id&&r.expectedId===id,'Failure was not guard invocation only.');}
 ensure(admin.id===failed.completed.admin.id&&admin.sourceSha===original.sourceSha&&admin.sourceDigest===original.sourceDigests.admin&&admin.assetsDigest===original.build.admin.sha256&&admin.runtimeDigest===original.build.private.admin.runtimeDigest&&admin.configDigest===original.build.private.admin.configDigest,'Admin acknowledgement/closure changed.');
 return {original,failed,admin,artifact};
}
function recoveryRevision(proof,{readGit=true}={}){
 ensure(exactKeys(proof,['reviewed','revision','tree','changes'])&&proof.reviewed===true&&SHA.test(proof.revision||'')&&SHA.test(proof.tree||'')&&Array.isArray(proof.changes)&&proof.changes.length<=6,'Reviewed verifier revision missing.');
 const names=new Set();for(const entry of proof.changes){ensure(exactKeys(entry,['path','before','after'])&&!names.has(entry.path),'Duplicate verifier entry.');names.add(entry.path);for(const side of ['before','after'])ensure(exactKeys(entry[side],['mode','blob'])&&entry[side].mode==='100644'&&SHA.test(entry[side].blob||''),'Verifier mode/blob missing.');ensure(RECOVERY_PATHS.has(entry.path)||PAIRED_RECOVERY_POLICY.docChanges.some(v=>canonical(v)===canonical(entry)),'Unreviewed product/schema/documentation change.');}
 if(readGit){
  const revisionGit=(...args)=>git('-C',dirname(dirname(fileURLToPath(import.meta.url))),...args);const target=PAIRED_RECOVERY_POLICY.sourceSha;ensure(revisionGit('merge-base',target,proof.revision)===target&&revisionGit('rev-parse',proof.revision+'^{tree}')===proof.tree,'Verifier ancestry/tree differs.');
  if(target===proof.revision){ensure(proof.changes.length===0,'Unchanged verifier has changes.');return structuredClone(proof);}
  const tree=sha=>new Map(revisionGit('ls-tree','-r',sha).split('\n').filter(Boolean).map(v=>{const m=/^(100644|100755|120000) blob ([a-f0-9]{40})\t(.+)$/.exec(v);ensure(m,'Unsupported tracked entry.');return [m[3],{mode:m[1],blob:m[2]}];}));
  const before=tree(target),after=tree(proof.revision),actual=[];ensure(before.size===after.size&&[...before.keys()].every(p=>after.has(p)),'Verifier added or removed source.');for(const [path,v]of before)if(canonical(v)!==canonical(after.get(path)))actual.push({path,before:v,after:after.get(path)});
  ensure(canonical(actual.sort((a,b)=>a.path.localeCompare(b.path,'en')))===canonical([...proof.changes].sort((a,b)=>a.path.localeCompare(b.path,'en'))),'Complete verifier Git entry inventory differs.');
 }
 return structuredClone(proof);
}
function recoveryFinal(final,readbacks,original,components,checkedAt){
 ensure(final?.status==='passed'&&final.expectedSourceSha===original.sourceSha&&final.checks?.length===4&&readbacks?.length===4&&new Set(final.checks.map(v=>v.component)).size===4&&new Set(readbacks.map(v=>v.component)).size===4,'Recovery final protections incomplete.');
 freshTime(final.observedAt,utc(checkedAt));
 for(const c of COMPONENTS){const g=final.checks.find(v=>v.component===c),r=readbacks.find(v=>v.component===c),id=components[c].receipt.id;ensure(g?.status==='passed'&&g.identityStatus==='passed'&&!g.code&&!g.identityCode&&g.expectedId===id&&g.observedId===id&&r?.identityStatus==='passed'&&!r.identityCode&&r.expectedId===id&&r.observedId===id&&r.identityObservedAt===g.identityObservedAt,'Recovery current identity/protection differs.');for(const t of [g.protectionObservedAt,g.identityObservedAt])freshTime(t,utc(checkedAt));if(c==='pages')ensure(g.observedSourceSha===original.sourceSha&&r.observedSourceSha===original.sourceSha,'Recovery Pages source differs.');}
}
export function validatePairedRecoveryRecord(record,{sourceSha,candidateSha,baseline,readGit=true}={}){
 ensure(exactKeys(record,['schemaVersion','kind','repository','state','sourceSha','baseSha','required','components','completed','prerequisites','guards','finalProtection','finalIdentityReadbacks','recovery'])&&record.schemaVersion===3&&record.kind==='paired-release-recovery-v1'&&record.repository===REPOSITORY&&record.state==='verified','Unrecognized canonical recovery entry.');
 const r=record.recovery;ensure(exactKeys(r,['version','original','failed','admin','artifact','verifier','supportStartedAt','conservativeCutoff','checkedAt','evidence','localCompiler','sourceChecks','providerMutations'])&&r.version===1&&r.providerMutations===0,'Recovery provenance is incomplete.');
 validateArchiveMetadata(record,candidateSha);
 ensure(canonical(r.localCompiler)===canonical({runtime:PAIRED_RECOVERY_POLICY.nodeRuntime,nodeSha256:PAIRED_RECOVERY_POLICY.nodeSha256,installedInputs:PAIRED_RECOVERY_POLICY.installedInputs}),'Recovery local compiler provenance differs.');
 const h=validatePairedRecoveryHistory(r);ensure(record.sourceSha===h.original.sourceSha&&(!sourceSha||sourceSha===record.sourceSha)&&record.sourceSha!==candidateSha&&record.baseSha===h.original.baseSha&&canonical(record.required)===canonical(COMPONENTS),'Recovery target differs.');
 ensure(exactKeys(r.sourceChecks,['first','final']),'Recovery source observations missing.');for(const check of Object.values(r.sourceChecks)){ensure(exactKeys(check,['sourceSha','mainSha','noActiveProductionRun','observedAt'])&&check.sourceSha===record.sourceSha&&check.mainSha===r.verifier.revision&&check.noActiveProductionRun===true,'Recovery source/main observation differs.');freshTime(check.observedAt,utc(r.checkedAt));}
 historicalTime(r.checkedAt);ensure(utc(r.conservativeCutoff)===utc(r.supportStartedAt)+600000&&utc(r.checkedAt)<=utc(r.conservativeCutoff),'Recovery support cutoff expired.');freshTime(r.supportStartedAt,utc(r.checkedAt));recoveryRevision(r.verifier,{readGit});
 const admin=validateReceipt(r.evidence.receipts?.admin,{component:'admin',id:h.admin.id,sourceDigest:h.admin.sourceDigest,...h.original.build.private.admin,now:utc(r.checkedAt)});for(const k of ['account','component','id','sourceSha','sourceDigest','runtimeDigest','configDigest','assetsDigest','origin','observedAt'])ensure(admin[k]===h.admin[k],'Recovery Admin receipt relabelled.');ensure(canonical(admin)===canonical(validateReceipt(h.failed.components.admin.receipt,{component:'admin',id:h.admin.id,sourceDigest:h.admin.sourceDigest,...h.original.build.private.admin,now:utc(r.checkedAt)})),'Recovery Admin receipt differs from its immutable acknowledgement association.');
 const observed={pagesSha:record.sourceSha,versions:Object.fromEntries(COMPONENTS.map(c=>[c,record.completed[c]?.id]))};
 const checked=completePair({record:{...h.original,githubArtifact:h.artifact},evidence:r.evidence,observed,now:utc(r.checkedAt)});
 for(const key of ['components','completed','prerequisites'])ensure(canonical(record[key])===canonical(checked[key]),'Recovered pair closure differs.');ensure(canonical(record.guards)===canonical({protection:'passed',publication:'recovered pair independently observed'}),'Recovery guard summary differs.');recoveryFinal(record.finalProtection,record.finalIdentityReadbacks,h.original,record.components,r.checkedAt);
 if(baseline)for(const c of COMPONENTS)ensure(canonical(record.components[c].receipt)===canonical(baseline.components?.[c]?.receipt),'Recovery baseline receipts differ.');
 return {sourceSha:record.sourceSha,receiptDigest:hash(canonical(Object.fromEntries(COMPONENTS.map(c=>[c,record.components[c].receipt]))))};
}
export function createPairedRecoveryRecord({history,verifier,supportStartedAt,evidence,finalProtection,finalIdentityReadbacks,sourceChecks,checkedAt}){
 const h=validatePairedRecoveryHistory(history),now=utc(checkedAt);ensure(now<=utc(supportStartedAt)+600000,'Recovery support cutoff expired.');
 const observed={pagesSha:h.original.sourceSha,versions:Object.fromEntries(finalIdentityReadbacks.map(v=>[v.component,v.observedId]))},pair=completePair({record:{...h.original,githubArtifact:h.artifact},evidence,observed,now});
 const value={schemaVersion:3,kind:'paired-release-recovery-v1',repository:REPOSITORY,state:'verified',sourceSha:h.original.sourceSha,baseSha:h.original.baseSha,required:[...COMPONENTS],components:pair.components,completed:pair.completed,prerequisites:pair.prerequisites,guards:{protection:'passed',publication:'recovered pair independently observed'},finalProtection:structuredClone(finalProtection),finalIdentityReadbacks:structuredClone(finalIdentityReadbacks),recovery:{version:1,original:history.original,failed:history.failed,admin:history.admin,artifact:history.artifact,verifier,supportStartedAt,conservativeCutoff:new Date(utc(supportStartedAt)+600000).toISOString(),checkedAt,evidence:pair.completionEvidence.evidence,sourceChecks,localCompiler:{runtime:PAIRED_RECOVERY_POLICY.nodeRuntime,nodeSha256:PAIRED_RECOVERY_POLICY.nodeSha256,installedInputs:PAIRED_RECOVERY_POLICY.installedInputs},providerMutations:0}};
 validatePairedRecoveryRecord(value,{readGit:false});return value;
}

function validateRecoveryDocChanges(value){ensure(Array.isArray(value)&&value.length<=PAIRED_RECOVERY_POLICY.docChanges.length&&new Set(value.map(v=>v.path)).size===value.length&&value.every(v=>PAIRED_RECOVERY_POLICY.docChanges.some(p=>canonical(p)===canonical(v))),'Unreviewed recovery document tuple.');return value;}
// One closed T -> inactive Delivery transition, independently reviewed at head39.
// These exact facts are not configurable by operator evidence or environment.
const INACTIVE_DELIVERY_POLICY=Object.freeze(
{
 "baselineSha": "8058ccfb7313e359043e0148e2b514327b8fb04a",
 "archivePath": "docs/releases/2026-10-20-release-T-canonical-recovery.json",
 "archiveBlob": "15c23602955057ea1cef544901642526b969da1f",
 "baseline": {
  "archiveSha256": "5ffa589528503e0661c5815266190e22442252b5bb61fd74c39ede1091290cf5",
  "receiptDigest": "cca92993afd03e856253183b61db1129523310d65e217d7ca95a69327bec049f",
  "rollback": {
   "pagesId": "afae3b21-0d47-4f3a-ab63-ee211cd1de8e",
   "adminId": "ddea75c2-294e-4906-92eb-80370470392b",
   "sourceSha": "8058ccfb7313e359043e0148e2b514327b8fb04a",
   "pagesBuildDigest": "dc379858bf25bdddd081a5df8cf03b62fdbda3864ff26aa985336a3c38607960",
   "adminAssetsDigest": "8c59382c355df19fd803437544bc5b0188b060b892814d90655a1efac1fcfecc",
   "adminRuntimeDigest": "632866622fd3136540efba5e8296e9d0e2fd6de411f9f52ba809e4527ebbea74",
   "adminConfigDigest": "3b3591a4c85d95a3d38abfb0118ee4367f449be05448a9ac469f8a4333fd38b0"
  }
 },
 "catalogue": {
  "id": "92f3472a-3153-447d-a8be-c79db9498407",
  "sourceSha": "3a16bff91fdab22715450e201f9c874885931d36",
  "sourceDigest": "33e4c7ce5545c7db61633546fc61a3bc239a5ac2c60cb3930087adfd5018f373",
  "runtimeDigest": "f8d7429fb2f1b2a81a387465e90099d70ac0868ef263e81899285f1957c8a1e3",
  "configDigest": "fc8a86ac35832ca9308105784fe648d10b1a8ac45bbe516d5d16c25b0715ac17",
  "evidenceUrl": "https://github.com/TIMMMYYYHHHH/Customvibev3/blob/431a4814c6fa717e38d81f64a54c50dd846000e5/docs/releases/2026-10-20-release-K-catalogue-upload-receipt.json"
 },
 "catalogueInputs": {
  "inputCount": 52,
  "inputPathsDigest": "157cdb15f5d1c6f385d1039da3613d64cf28917682e313aafc90bea3c6ecd853",
  "inputInventoryDigest": "05330406124d45da8cf2154c7d4a1ac7c2b9832684988d943913f50a463ce674",
  "importGraphDigest": "33992702b6d366eeeb443f4200be451d7a98ed7aca74386b5b4aca2968a0e09e"
 },
 "entries": [
  {
   "path": "admin/OrderDetail.jsx",
   "mode": "100644",
   "baseBlob": "e32dbd29063eac11735ab609992ad12ce6a43d0d",
   "candidateBlob": "f5cc54589b1d7c19b1afc4e8213d4f48f0e156b9"
  },
  {
   "path": "admin/mail-delivery.mjs",
   "mode": "100644",
   "baseBlob": null,
   "candidateBlob": "e896e6f1cd2179d50aeb91ed79e3393d5a244107"
  },
  {
   "path": "admin/order-mail.mjs",
   "mode": "100644",
   "baseBlob": "0453367797108b8604dd65d627fc14b9ca1e0733",
   "candidateBlob": "5cb91e5e6cda53a4630bbb4fb7e7520751c8380f"
  },
  {
   "path": "catalogue/index.mjs",
   "mode": "100644",
   "baseBlob": "94b30c5ce4a017794603f16dc81355732222a01d",
   "candidateBlob": "6245cddfa869ef242a8efcd3f98aba052574fa8b"
  },
  {
   "path": "docs/availability-runbook.md",
   "mode": "100644",
   "baseBlob": null,
   "candidateBlob": "3f63cef2476e0ec23d1f8ce20ecf472bc1254c24"
  },
  {
   "path": "docs/email-delivery-reconciliation.md",
   "mode": "100644",
   "baseBlob": null,
   "candidateBlob": "ed443124cec3c47a9ed472a86f5e6b857b59306c"
  },
  {
   "path": "docs/email-delivery-webhook-runbook.md",
   "mode": "100644",
   "baseBlob": null,
   "candidateBlob": "63ad486aa69f2b4aa9e5f43e7b0653bfc88c4039"
  },
  {
   "path": "docs/mail-delivery-admin.md",
   "mode": "100644",
   "baseBlob": null,
   "candidateBlob": "82803f9bf0b6be99e826e997de0d3d51ab8cc001"
  },
  {
   "path": "docs/mail-delivery-backend.md",
   "mode": "100644",
   "baseBlob": null,
   "candidateBlob": "8a76a45278de60add620dbb06654f7fec88f4cb1"
  },
  {
   "path": "docs/mail-delivery-integration.md",
   "mode": "100644",
   "baseBlob": null,
   "candidateBlob": "c16d0b5d44e82863c0e0ec6e3079a2d19e599b72"
  },
  {
   "path": "docs/superpowers/plans/2026-10-20-mail-delivery-backend.md",
   "mode": "100644",
   "baseBlob": null,
   "candidateBlob": "5a461bd9fb9584bc37a86bed288addb1b093aa6f"
  },
  {
   "path": "functions/_middleware.js",
   "mode": "100644",
   "baseBlob": "b7a97720ebe3012844ece8643490bcf5711fc4ac",
   "candidateBlob": "ad95491d57d93d8fdec396360eb643da458b49e0"
  },
  {
   "path": "migrations/security/0012_mail_delivery.sql",
   "mode": "100644",
   "baseBlob": null,
   "candidateBlob": "f4138cab01adad6c3e7bb196863909e13692da4b"
  },
  {
   "path": "package-lock.json",
   "mode": "100644",
   "baseBlob": "ad10111804d934e9be4f8cc14b73ed38ec889d64",
   "candidateBlob": "a115eb6c16355d095940c5f182ad3cdb7ffc5819"
  },
  {
   "path": "package.json",
   "mode": "100644",
   "baseBlob": "08ecb4193c223add3d5a7a1e75b36f1d413047b3",
   "candidateBlob": "3457bec703f083c7b998a9b76fe1b688308942ae"
  },
  {
   "path": "security/index.mjs",
   "mode": "100644",
   "baseBlob": "f3f3c53f054e26792d56f0d8011b9a93fd1fe385",
   "candidateBlob": "b2003638d9e8c823ece59187b86167ce1885498d"
  },
  {
   "path": "security/mail-delivery.mjs",
   "mode": "100644",
   "baseBlob": null,
   "candidateBlob": "97a4252bd92d34e96eaa47ec4d3bc285dcd147fc"
  },
  {
   "path": "security/orders.mjs",
   "mode": "100644",
   "baseBlob": "9607e2bef272c63dcd0c6c065b82f2c6e6d36f7e",
   "candidateBlob": "7d9b17e33e32c74b8185419de681996b07ddafb9"
  },
  {
   "path": "security/submissions.mjs",
   "mode": "100644",
   "baseBlob": "b6e5e44ca42d40e3f642757ebd7f3169bdb8fb9e",
   "candidateBlob": "29cedc24188d500c0b8cc21b479a62c3119bfc64"
  },
  {
   "path": "server/mail-delivery.mjs",
   "mode": "100644",
   "baseBlob": null,
   "candidateBlob": "292de5de954b76e517d9006d11c9eec1da41993a"
  },
  {
   "path": "server/mail-recipient.mjs",
   "mode": "100644",
   "baseBlob": null,
   "candidateBlob": "fd6bfed565fcc96c9117b553fa54bce236bebe5b"
  },
  {
   "path": "server/mail-webhook.mjs",
   "mode": "100644",
   "baseBlob": null,
   "candidateBlob": "acad4b67dd1452aae3a4e5ef08df528357837186"
  },
  {
   "path": "server/submissions.mjs",
   "mode": "100644",
   "baseBlob": "71f31019483d82976ca5ca4136fca827d4f0f3f6",
   "candidateBlob": "64a219f7e60b9d89e765d000f878e61dd50f48f8"
  },
  {
   "path": "tests/availability-diagnostics.test.mjs",
   "mode": "100644",
   "baseBlob": "34ab771d9c37f67ac84240dc30fcb0ddf98252cb",
   "candidateBlob": "06776cc9cac4fd9a0a3fbf2c5b89a85661752da7"
  },
  {
   "path": "tests/fixtures/mail-delivery-admin.html",
   "mode": "100644",
   "baseBlob": null,
   "candidateBlob": "57d4f6d67b326c689d5bddc91109a629f4d09ef4"
  },
  {
   "path": "tests/fixtures/mail-delivery-admin.jsx",
   "mode": "100644",
   "baseBlob": null,
   "candidateBlob": "032445240f114a08325145988ffdd131898f4904"
  },
  {
   "path": "tests/fixtures/mail-delivery-integrated-worker.mjs",
   "mode": "100644",
   "baseBlob": null,
   "candidateBlob": "fbb5fc178bea37f22a96ef6b856109cd4a14bb14"
  },
  {
   "path": "tests/fixtures/mail-delivery-security-worker.mjs",
   "mode": "100644",
   "baseBlob": null,
   "candidateBlob": "75d6f2027fb43fbe74e117c648df29c70ad20056"
  },
  {
   "path": "tests/fixtures/mail-webhook-worker.mjs",
   "mode": "100644",
   "baseBlob": null,
   "candidateBlob": "1e0a28a2c79fd62d5c8416d5303f709ca0891690"
  },
  {
   "path": "tests/fixtures/released-submissions-db231.mjs",
   "mode": "100644",
   "baseBlob": null,
   "candidateBlob": "71f31019483d82976ca5ca4136fca827d4f0f3f6"
  },
  {
   "path": "tests/mail-delivery-admin.browser.mjs",
   "mode": "100644",
   "baseBlob": null,
   "candidateBlob": "9a0b23fa6ab42dcbc51fc97b56e8d0e4e041dcdb"
  },
  {
   "path": "tests/mail-delivery-admin.test.mjs",
   "mode": "100644",
   "baseBlob": null,
   "candidateBlob": "9f9eeb7699b423e8f559295e8e752cf16d3cc192"
  },
  {
   "path": "tests/mail-delivery-integration.test.mjs",
   "mode": "100644",
   "baseBlob": null,
   "candidateBlob": "f710fb962b636cdb02eb1e19edbe9adfc1bb3ca9"
  },
  {
   "path": "tests/mail-delivery-persistence.test.mjs",
   "mode": "100644",
   "baseBlob": null,
   "candidateBlob": "e1f1765f659a2cbab724d3e1ef0c7709bad99a14"
  },
  {
   "path": "tests/mail-delivery-projection.test.mjs",
   "mode": "100644",
   "baseBlob": null,
   "candidateBlob": "b874011a599c3dd2a1674ac6660a8b9d8a278c43"
  },
  {
   "path": "tests/mail-delivery.test.mjs",
   "mode": "100644",
   "baseBlob": null,
   "candidateBlob": "888ee819c8c0628599d32ad7385fb6ded793b8ef"
  },
  {
   "path": "tests/mail-receipts.test.mjs",
   "mode": "100644",
   "baseBlob": "1776c31af72340831d6eae36ed7ec551c5840f25",
   "candidateBlob": "1acb4ebec7e9dec0116485cd2ddece006f5db0e1"
  },
  {
   "path": "tests/mail-recipient.test.mjs",
   "mode": "100644",
   "baseBlob": null,
   "candidateBlob": "f3ee10cade864a23f766786582992e932dcc25a3"
  },
  {
   "path": "tests/mail-webhook.test.mjs",
   "mode": "100644",
   "baseBlob": null,
   "candidateBlob": "2e77ae99eef6ad8f60548354abd12568084a2a59"
  },
  {
   "path": "tests/manual-update-attempts.browser.mjs",
   "mode": "100644",
   "baseBlob": "b115a8cbc7e81a8b63ce6dfa51c3da9805866974",
   "candidateBlob": "ca1ce9004e19f95d563556a57de036cca54e5aab"
  }
 ]
}
);
const INACTIVE_DELIVERY_PATHS=new Set(INACTIVE_DELIVERY_POLICY.entries.map(v=>v.path));
function validateInactiveDeliveryInputs(v){
 ensure(exactKeys(v,['baselineSourceInputDigest','sourceInputDigest','protectedInputDigest','entries'])&&['baselineSourceInputDigest','sourceInputDigest','protectedInputDigest'].every(k=>DIGEST.test(v[k]||''))&&v.sourceInputDigest!==v.baselineSourceInputDigest&&canonical(v.entries)===canonical(INACTIVE_DELIVERY_POLICY.entries),'Inactive Delivery source facts differ from the fixed review.');return v;
}
export function inactiveDeliveryInputs(baseSha,sourceSha,{archivePath}={}){
 const p=INACTIVE_DELIVERY_POLICY;ensure(baseSha===p.baselineSha&&SHA.test(sourceSha||'')&&sourceSha!==baseSha&&archivePath===p.archivePath,'Inactive Delivery requires the genuine T baseline and canonical archive.');
 const before=trackedTree(baseSha),after=trackedTree(sourceSha),prior=new Map(before.map(v=>[v.path,v])),current=new Map(after.map(v=>[v.path,v]));
 for(const v of p.entries){const a=prior.get(v.path),b=current.get(v.path);ensure((v.baseBlob===null?!a:a?.mode===v.mode&&a.blob===v.baseBlob)&&b?.mode===v.mode&&b.blob===v.candidateBlob,'Inactive Delivery blob/mode differs from the independent review.');}
 const excluded=new Set([...TOOLING_PATHS,...INACTIVE_DELIVERY_PATHS,p.archivePath,...PAIRED_RECOVERY_POLICY.docChanges.map(v=>v.path)]);
 const protectedEntries=entries=>entries.filter(v=>!excluded.has(v.path)).sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
 const protectedBefore=protectedEntries(before);ensure(canonical(protectedBefore)===canonical(protectedEntries(after)),'Protected inactive Delivery tree changed.');
 return validateInactiveDeliveryInputs({baselineSourceInputDigest:sourceInputs(baseSha),sourceInputDigest:sourceInputs(sourceSha),protectedInputDigest:hash(canonical(protectedBefore)),entries:structuredClone(p.entries)});
}
export function inactiveDeliveryBaseline(record){
 const {reviewed,evidenceUrl,...core}=record;validatePairedRecoveryRecord(core,{sourceSha:INACTIVE_DELIVERY_POLICY.baselineSha});
 const receipts=Object.fromEntries(COMPONENTS.map(c=>[c,record.components[c].receipt])),pages=receipts.pages,admin=receipts.admin;
 const facts={archiveSha256:INACTIVE_DELIVERY_POLICY.baseline.archiveSha256,receiptDigest:hash(canonical(receipts)),rollback:{pagesId:pages.id,adminId:admin.id,sourceSha:pages.sourceSha,pagesBuildDigest:pages.buildDigest,adminAssetsDigest:admin.assetsDigest,adminRuntimeDigest:admin.runtimeDigest,adminConfigDigest:admin.configDigest}};
 ensure(canonical(facts)===canonical(INACTIVE_DELIVERY_POLICY.baseline),'Inactive Delivery rollback differs from genuine T recovery.');return facts;
}
export function inactiveDeliveryIngress(project,{id,sourceSha,observedAt=new Date().toISOString()}){
 const read=config=>{ensure(config?.env_vars&&typeof config.env_vars==='object'&&!Array.isArray(config.env_vars),'Inactive Delivery environment observation missing.');if(!Object.hasOwn(config.env_vars,'MAIL_EVENTS_ENABLED'))return 'absent';const flag=config.env_vars.MAIL_EVENTS_ENABLED;ensure(exactKeys(flag,['type','value'])&&flag.type==='plain_text'&&flag.value==='false','Mail event ingress is enabled or unknown.');return 'false';};
 const deployment=project?.canonical_deployment;ensure(deployment?.id===id&&deployment.environment==='production'&&deployment.deployment_trigger?.metadata?.commit_hash===sourceSha,'Inactive Delivery canonical observation differs.');
 return validateInactiveIngress({id,sourceSha,observedAt,production:read(project.deployment_configs?.production),preview:read(project.deployment_configs?.preview),canonical:read(deployment)},{id,sourceSha,now:utc(observedAt)});
}
function validateInactiveIngress(v,{id,sourceSha,now}){
 ensure(exactKeys(v,['id','sourceSha','observedAt','production','preview','canonical'])&&v.id===id&&ID.test(id||'')&&v.sourceSha===sourceSha&&SHA.test(sourceSha||'')&&['production','preview','canonical'].every(k=>['absent','false'].includes(v[k])),'Inactive Delivery ingress evidence differs.');
 const at=utc(v.observedAt);ensure(at<=now+30000&&now-at<=30000,'Inactive Delivery ingress observation expired.');return v;
}
const CATALOGUE_METAFILE='dist/release/private-inputs/catalogue-metafile.json';
function validateCatalogueInputFacts(v){
 const p=INACTIVE_DELIVERY_POLICY.catalogueInputs;ensure(exactKeys(v,['version','inputCount','inputPathsDigest','inputInventoryDigest','importGraphDigest','metafileSha256'])&&v.version===1&&Object.keys(p).every(k=>v[k]===p[k])&&DIGEST.test(v.metafileSha256||''),'Catalogue complete compiler/import closure differs.');return v;
}
export async function inactiveCatalogueInputs(){
 const bytes=await readFile(CATALOGUE_METAFILE);ensure(bytes.length>0&&bytes.length<2*1024*1024,'Invalid Catalogue compiler metadata size.');const metadata=strictJson(bytes.toString('utf8')),paths=Object.keys(metadata.inputs||{}).sort(),p=INACTIVE_DELIVERY_POLICY.catalogueInputs;
 ensure(paths.length===p.inputCount&&hash(canonical(paths))===p.inputPathsDigest,'Catalogue compiler input paths changed.');
 const inventory=[],graph=[];
 for(const path of paths){ensure(path===posix.normalize(path)&&!path.startsWith('/')&&!path.startsWith('../')&&!path.includes('\\')&&!path.includes('\0'),'Unsafe Catalogue compiler input.');const input=metadata.inputs[path],data=await readFile(path);ensure(input.bytes===data.length&&Array.isArray(input.imports)&&input.imports.every(v=>v.external?v.path==='<runtime>':paths.includes(v.path)),'Unresolved Catalogue import.');inventory.push([path,hash(data),data.length]);graph.push([path,input.imports]);}
 const outputs=Object.entries(metadata.outputs||{}).filter(([path])=>!path.endsWith('.map'));ensure(outputs.length===1&&resolve(outputs[0][0])===resolve('dist/release/private/catalogue/index.js')&&outputs[0][1].entryPoint==='catalogue/index.mjs'&&outputs[0][1].bytes===(await stat('dist/release/private/catalogue/index.js')).size&&Array.isArray(outputs[0][1].imports)&&outputs[0][1].imports.length===0&&Object.keys(outputs[0][1].inputs||{}).every(path=>paths.includes(path)),'Catalogue emitted runtime/input metadata differs.');
 return validateCatalogueInputFacts({version:1,inputCount:paths.length,inputPathsDigest:hash(canonical(paths)),inputInventoryDigest:hash(canonical(inventory)),importGraphDigest:hash(canonical(graph)),metafileSha256:hash(bytes)});
}
function validateInactivePrivate({sourceSha,sourceDigests,privateBuild,evidence}){
 const security=evidence?.receipts?.security,catalogue=evidence?.receipts?.catalogue,p=INACTIVE_DELIVERY_POLICY;
 ensure(security?.sourceSha===sourceSha&&security.sourceDigest===sourceDigests.security,'Inactive Delivery needs actual candidate Security publication.');
 ensure(Object.keys(p.catalogue).every(k=>catalogue?.[k]===p.catalogue[k]),'Inactive Delivery must retain the actual K Catalogue receipt.');
 validateCatalogueInputFacts(privateBuild?.catalogue?.inputClosure);
 ensure(privateBuild.catalogue.runtimeDigest===p.catalogue.runtimeDigest&&privateBuild.catalogue.configDigest===p.catalogue.configDigest,'Candidate Catalogue emitted runtime/config differs from K.');
 ensure(canonical(evidence?.staged?.rollback)===canonical(p.baseline.rollback),'Inactive Delivery staged rollback is not genuine T.');
}

async function releaseArchive(proof,{paths,sourceSha,baseSha,baseline,presentation,inactiveDelivery}){
 if(presentation)validatePresentationInputs(presentation);if(inactiveDelivery)validateInactiveDeliveryInputs(inactiveDelivery);
 const docPaths=paths.filter(p=>PAIRED_RECOVERY_POLICY.docChanges.some(v=>v.path===p)),extra=paths.filter(p=>!TOOLING_PATHS.has(p)&&!(presentation&&PRESENTATION_PATHS.has(p))&&!(inactiveDelivery&&INACTIVE_DELIVERY_PATHS.has(p))&&!docPaths.includes(p));if(extra.length===0){ensure(!proof&&docPaths.length===0,'Unexpected archive evidence or document change without a recovery archive.');return undefined;}
 ensure(extra.length===1&&proof&&Object.keys(proof).every(k=>['origin','reviewed','path','sha256','sourceSha','reviewedAgainstSha','receiptDigest','recoveryDocChanges'].includes(k))&&proof.origin==='reviewed-complete-release-archive'&&proof.reviewed===true&&proof.path===extra[0]&&/^docs\/releases\/\d{4}-\d\d-\d\d-release-[a-zA-Z0-9_-]{1,64}[.]json$/.test(proof.path)&&DIGEST.test(proof.sha256||'')&&proof.sourceSha===baseSha&&proof.reviewedAgainstSha===sourceSha,'Archive is not an explicitly reviewed historical release record.');
 ensure(git('diff','--name-status',baseSha,sourceSha,'--',proof.path)==='A\t'+proof.path,'An archived record must be a new immutable addition.');
 const entry=git('ls-tree',sourceSha,'--',proof.path),match=/^100644 blob ([a-f0-9]{40})\t(.+)$/.exec(entry);ensure(match&&match[2]===proof.path,'Archive must be a committed regular file.');
 if(inactiveDelivery)ensure(proof.path===INACTIVE_DELIVERY_POLICY.archivePath&&proof.sha256===INACTIVE_DELIVERY_POLICY.baseline.archiveSha256&&match[1]===INACTIVE_DELIVERY_POLICY.archiveBlob,'Inactive Delivery archive is not the accepted T bytes.');
 const bytes=await readFile(proof.path);ensure(bytes.length>0&&bytes.length<2*1024*1024&&hash(bytes)===proof.sha256&&createHash('sha1').update(Buffer.concat([Buffer.from('blob '+bytes.length+'\0'),bytes])).digest('hex')===match[1],'Archive bytes differ from the reviewed committed record.');
 const record=JSON.parse(bytes.toString('utf8')),validated=validateReleaseArchiveRecord(record,{sourceSha:baseSha,candidateSha:sourceSha,baseline});
 const recoveryDocChanges=docPaths.map(path=>{ensure(record.kind==='paired-release-recovery-v1'&&baseSha===PAIRED_RECOVERY_POLICY.sourceSha,'Only the complete recovery archive admits its exact dependency document.');const expected=PAIRED_RECOVERY_POLICY.docChanges.find(v=>v.path===path);for(const [side,sha]of [['before',baseSha],['after',sourceSha]])ensure(git('ls-tree',sha,'--',path)===expected[side].mode+' blob '+expected[side].blob+'\t'+path,'Recovery document Git blob/mode differs.');return expected;});
 if(proof.recoveryDocChanges!==undefined)ensure(canonical(validateRecoveryDocChanges(proof.recoveryDocChanges))===canonical(recoveryDocChanges),'Recovery archive document proof differs.');
 if(proof.receiptDigest!==undefined)ensure(proof.receiptDigest===validated.receiptDigest,'Archive original receipt binding changed.');
 return {...(recoveryDocChanges.length?{recoveryDocChanges}:{}),origin:proof.origin,reviewed:true,path:proof.path,sha256:proof.sha256,sourceSha:baseSha,reviewedAgainstSha:sourceSha,receiptDigest:validated.receiptDigest};
}

// Fixed data from the independently reviewed retained input/manifest comparison.
// There is no environment, evidence or command-line eligibility override.
const ADMIN_MANIFEST_POLICY=Object.freeze({
 "inputCount": 63,
 "inputPathsDigest": "452ac699e8cc2eabf5c3abc0b932c5100a05bb9569067a87d25a48c8e4d93df3",
 "protectedInputDigest": "f21d97dd4142245ad9d1ce41424e96c911e82db622250c1be9607e73db005528",
 "inputInventoryDigest": "19f1a70961cad4c061964fbfdcd1636756e166ab4abf3d12faaa55cf39ea6cc8",
 "baselineManifestSha256": "df5b83212280c77865eeb77c616adb262070368132ff8084ad1b4b949fabb329",
 "manifestSha256": "62c0c0a6323dec4c2801ae0684038c2eb53e109446c8c1c3ecb0b9a0452fbd61",
 "manifestBytes": 9321,
 "deltas": [
  [
   "admin/preview.html",
   "file",
   "assets/preview-DClyXgPw.js",
   "assets/preview-BO2S5IF5.js"
  ],
  [
   "admin/preview.html",
   "css",
   [
    "assets/preview-Bmgh2UZY.css"
   ],
   [
    "assets/preview-B8oIOMo5.css"
   ]
  ],
  [
   "src/Checkout.jsx",
   "file",
   "assets/Checkout-DujRvOPI.js",
   "assets/Checkout-yiAHbjDd.js"
  ],
  [
   "src/CollectionReview.jsx",
   "file",
   "assets/CollectionReview-DTTUK1U2.js",
   "assets/CollectionReview-CFlK5LvH.js"
  ],
  [
   "src/Editor.jsx",
   "file",
   "assets/Editor-A_tQgYFk.js",
   "assets/Editor-ClNrCAAT.js"
  ],
  [
   "src/designs/BusinessStudio.jsx",
   "file",
   "assets/BusinessStudio-A0vgIenU.js",
   "assets/BusinessStudio-Crs7nnJN.js"
  ],
  [
   "src/designs/HandyStudio.jsx",
   "file",
   "assets/HandyStudio-DC1xw29y.js",
   "assets/HandyStudio-DQlNggb1.js"
  ]
 ]
});
const ADMIN_MANIFEST_PATH='dist/admin/.vite/manifest.json',ADMIN_METAFILE='dist/release/private-inputs/admin-metafile.json';
const ADMIN_INPUT_KEYS=['version','inputCount','inputPathsDigest','protectedInputDigest','inputInventoryDigest','metafileSha256','manifestSha256','manifestBytes','assetsDigest'];
function validateAdminInputFacts(v){
 const p=ADMIN_MANIFEST_POLICY;
 ensure(exactKeys(v,ADMIN_INPUT_KEYS)&&v.version===1&&['inputCount','inputPathsDigest','protectedInputDigest','inputInventoryDigest','manifestSha256','manifestBytes'].every(k=>v[k]===p[k])&&DIGEST.test(v.metafileSha256||'')&&DIGEST.test(v.assetsDigest||''),'Admin generated input facts differ from the fixed review.');return v;
}
// Validate paths before reading input bytes. Raw metadata stays outside the
// runtime aggregate; only its bounded fingerprint travels with the release.
export async function adminAssetManifestInputs(){
 const bytes=await readFile(ADMIN_METAFILE);ensure(bytes.length>0&&bytes.length<2*1024*1024,'Invalid Admin compiler metadata size.');
 const metadata=strictJson(bytes.toString('utf8')),paths=Object.keys(metadata.inputs||{}).sort(),p=ADMIN_MANIFEST_POLICY;
 ensure(paths.length===p.inputCount&&hash(JSON.stringify(paths))===p.inputPathsDigest&&paths.includes(ADMIN_MANIFEST_PATH),'Admin compiler input path inventory changed.');
 const inventory=[];
 for(const path of paths){
  ensure(path===posix.normalize(path)&&!path.startsWith('/')&&!path.startsWith('../')&&!path.includes('\\')&&!path.includes('\0'),'Unsafe Admin compiler input.');
  const input=metadata.inputs[path],data=await readFile(path);ensure(input.bytes===data.length&&Array.isArray(input.imports)&&input.imports.every(v=>v.external?v.path==='<runtime>':paths.includes(v.path)),'Unresolved Admin compiler input.');inventory.push([path,hash(data),data.length]);
 }
 const outputs=Object.entries(metadata.outputs||{}).filter(([path])=>!path.endsWith('.map'));
 ensure(outputs.length===1&&resolve(outputs[0][0])===resolve('dist/release/private/admin/worker.js')&&outputs[0][1].entryPoint==='admin/worker.mjs'&&outputs[0][1].bytes===(await stat('dist/release/private/admin/worker.js')).size&&Array.isArray(outputs[0][1].imports)&&outputs[0][1].imports.length===0&&Object.keys(outputs[0][1].inputs||{}).every(path=>paths.includes(path)),'Admin compiler output metadata differs from its actual emitted runtime.');
 const protectedInputDigest=hash(JSON.stringify(inventory.filter(v=>v[0]!==ADMIN_MANIFEST_PATH))),inputInventoryDigest=hash(JSON.stringify(inventory));
 const manifestBytes=await readFile(ADMIN_MANIFEST_PATH),text=manifestBytes.toString('utf8'),manifest=strictJson(text),prior=structuredClone(manifest);
 ensure(hash(manifestBytes)===p.manifestSha256&&manifestBytes.length===p.manifestBytes,'Admin manifest is not the reviewed candidate.');
 let oldText=text;
 for(const [entry,field,before,after]of p.deltas){
  ensure(canonical(manifest[entry]?.[field])===canonical(after),'Admin manifest field changed.');prior[entry][field]=before;
  const oldValue=JSON.stringify(Array.isArray(before)?before[0]:before),newValue=JSON.stringify(Array.isArray(after)?after[0]:after);
  ensure(oldText.split(newValue).length===2,'Ambiguous Admin manifest field.');oldText=oldText.replace(newValue,oldValue);
 }
 ensure(hash(oldText)===p.baselineManifestSha256&&canonical(strictJson(oldText))===canonical(prior),'Admin manifest changed outside its seven reviewed fields.');
 const files=new Set();async function walk(dir){for(const name of (await readdir(dir)).sort()){const path=resolve(dir,name);if((await stat(path)).isDirectory())await walk(path);else files.add(relative(resolve('dist/admin'),path).split('\\').join('/'));}}await walk(resolve('dist/admin'));
 for(const value of Object.values(manifest)){
  ensure(value&&typeof value==='object'&&!Array.isArray(value),'Invalid Admin manifest entry.');
  for(const field of ['file','css','assets'])if(Object.hasOwn(value,field)){
   const references=field==='file'?[value[field]]:value[field];ensure(Array.isArray(references),'Invalid Admin asset references.');
   for(const path of references)ensure(typeof path==='string'&&path===posix.normalize(path)&&!path.startsWith('/')&&!path.startsWith('../')&&!/[\\:?\0]/.test(path)&&files.has(path),'Admin manifest asset is missing or unsafe.');
  }
  for(const field of ['imports','dynamicImports'])if(Object.hasOwn(value,field))ensure(Array.isArray(value[field])&&value[field].every(key=>Object.hasOwn(manifest,key)),'Admin manifest import is unresolved.');
 }
 return validateAdminInputFacts({version:1,inputCount:paths.length,inputPathsDigest:hash(JSON.stringify(paths)),protectedInputDigest,inputInventoryDigest,metafileSha256:hash(bytes),manifestSha256:hash(manifestBytes),manifestBytes:manifestBytes.length,assetsDigest:(await bundleDigest('dist/admin')).sha256});
}
function validateAdminManifestCompatibility(v,expected){
 const admin=expected.privateBuild?.admin,rollback=expected.rollback,b=expected.adminManifestBaseline;
 ensure(exactKeys(v,['basis','baseline','candidate'])&&v.basis==='reviewed-admin-asset-manifest-v1'&&exactKeys(v.baseline,['sourceSha','id','runtimeDigest','configDigest','assetsDigest','manifestSha256']),'Invalid Admin manifest compatibility.');
 ensure(b&&canonical(v.baseline)===canonical(b)&&b.sourceSha===expected.baseSha&&b.id===expected.before?.admin&&b.id===rollback?.adminId&&b.sourceSha===rollback?.sourceSha&&b.runtimeDigest===rollback?.adminRuntimeDigest&&b.configDigest===rollback?.adminConfigDigest&&b.assetsDigest===rollback?.adminAssetsDigest&&b.manifestSha256===ADMIN_MANIFEST_POLICY.baselineManifestSha256,'Admin baseline manifest provenance differs.');
 const c=v.candidate;ensure(exactKeys(c,['sourceSha','runtimeDigest','configDigest',...ADMIN_INPUT_KEYS])&&c.sourceSha===expected.sourceSha&&c.runtimeDigest===admin?.runtimeDigest&&c.configDigest===admin?.configDigest&&c.configDigest===b.configDigest&&DIGEST.test(c.runtimeDigest||''),'Admin candidate runtime/config differs.');
 const facts=Object.fromEntries(ADMIN_INPUT_KEYS.map(k=>[k,c[k]]));validateAdminInputFacts(facts);ensure(canonical(facts)===canonical(admin.assetManifest)&&c.assetsDigest===expected.adminAssetsDigest,'Admin candidate manifest/input/assets binding differs.');return structuredClone(v);
}

export function validateActivationCompatibility(value,expected){
 const presentation=value?.basis==='reviewed-public-presentation-v1',delivery=value?.basis==='reviewed-inactive-delivery-v1';
 ensure((presentation||delivery||value?.basis==='source-input-tooling-only-v1')&&value.reviewedAgainstSha===expected.sourceSha&&value.baselineSha===expected.baseSha&&value.baselineSha===expected.beforePagesSourceSha&&value.historicalFunctionsDigest===null,'Activation compatibility is not reviewed source-based evidence.');
 const linked=expected.archivedRelease?.sourceSha===expected.baseSha&&expected.archivedRelease.reviewedAgainstSha===expected.sourceSha&&DIGEST.test(expected.archivedRelease.receiptDigest||'');
 const recoveredDocs=expected.archivedRelease?.recoveryDocChanges===undefined?[]:validateRecoveryDocChanges(expected.archivedRelease.recoveryDocChanges);
 const archive=p=>linked&&(expected.archivedRelease.path===p||(expected.baseSha===PAIRED_RECOVERY_POLICY.sourceSha&&recoveredDocs.some(v=>v.path===p)));
 if(delivery){
  ensure(exactKeys(value,['basis','reviewedAgainstSha','baselineSha','observedAt','sourceInputDigest','baselineSourceInputDigest','inactiveDelivery','compilerConfigDigest','configDigest','pagesBuildDigest','adminAssetsDigest','historicalFunctionsDigest',...(Object.hasOwn(value,'privateSnapshotGap')?['privateSnapshotGap']:[])])&&(!Object.hasOwn(value,'privateSnapshotGap')||value.privateSnapshotGap==='Final reads detect drift after the write; no distributed lock or autonomous runtime/schema safety is claimed.'),'Unexpected inactive Delivery compatibility fields.');
  const p=INACTIVE_DELIVERY_POLICY,facts=validateInactiveDeliveryInputs(expected.inactiveDelivery);validateInactiveDeliveryInputs(value.inactiveDelivery);
  ensure(expected.baseSha===p.baselineSha&&canonical(facts)===canonical(value.inactiveDelivery)&&facts.baselineSourceInputDigest===expected.baselineSourceInputDigest&&value.baselineSourceInputDigest===expected.baselineSourceInputDigest&&facts.sourceInputDigest===expected.sourceInputDigest,'Inactive Delivery source comparison differs.');
  ensure(canonical(expected.deliveryBaseline)===canonical(p.baseline)&&linked&&expected.archivedRelease.path===p.archivePath&&expected.archivedRelease.sha256===p.baseline.archiveSha256&&expected.archivedRelease.receiptDigest===p.baseline.receiptDigest&&canonical(expected.rollback)===canonical(p.baseline.rollback)&&expected.before.pages===p.baseline.rollback.pagesId&&expected.before.admin===p.baseline.rollback.adminId,'Inactive Delivery genuine baseline/archive/rollback binding missing.');
  ensure(new Set(expected.paths).size===expected.paths.length&&p.entries.every(v=>expected.paths.includes(v.path))&&expected.paths.every(path=>TOOLING_PATHS.has(path)||INACTIVE_DELIVERY_PATHS.has(path)||archive(path)),'Unreviewed inactive Delivery path.');
  validateInactiveIngress(expected.inactiveIngress,{id:expected.before.pages,sourceSha:expected.baseSha,now:expected.now??Date.now()});
  validateInactivePrivate(expected);
 }else if(presentation){
  ensure(exactKeys(value,['basis','reviewedAgainstSha','baselineSha','observedAt','sourceInputDigest','baselineSourceInputDigest','presentation','compilerConfigDigest','configDigest','pagesBuildDigest','adminAssetsDigest','historicalFunctionsDigest',...(Object.hasOwn(value,'privateSnapshotGap')?['privateSnapshotGap']:[]),...(Object.hasOwn(value,'adminAssetManifest')?['adminAssetManifest']:[])])&&(!Object.hasOwn(value,'privateSnapshotGap')||value.privateSnapshotGap==='Final reads detect drift after the write; no distributed lock or autonomous runtime/schema safety is claimed.'), 'Unexpected presentation compatibility fields.');
  const facts=validatePresentationInputs(expected.presentation);validatePresentationInputs(value.presentation);
  ensure(canonical(value.presentation)===canonical(facts)&&value.baselineSourceInputDigest===expected.baselineSourceInputDigest&&facts.baselineSourceInputDigest===expected.baselineSourceInputDigest&&facts.sourceInputDigest===expected.sourceInputDigest,'Presentation source/baseline/protected comparison differs.');
  ensure(new Set(expected.paths).size===expected.paths.length&&PRESENTATION_ENTRIES.every(v=>expected.paths.includes(v.path))&&expected.paths.every(p=>TOOLING_PATHS.has(p)||PRESENTATION_PATHS.has(p)||archive(p)),'Unreviewed presentation path.');
  const admin=expected.privateBuild?.admin,rollback=expected.rollback;
  if(value.adminAssetManifest)validateAdminManifestCompatibility(value.adminAssetManifest,expected);
  else ensure(DIGEST.test(admin?.runtimeDigest||'')&&DIGEST.test(admin?.configDigest||'')&&admin.runtimeDigest===rollback?.adminRuntimeDigest&&admin.configDigest===rollback?.adminConfigDigest,'Presentation changed the private Admin executable or configuration.');
 }else ensure(expected.paths.every(p=>TOOLING_PATHS.has(p)||archive(p))&&expected.sourceInputDigest===expected.baselineSourceInputDigest,'Activation changes application/runtime/build inputs.');
 for(const k of ['sourceInputDigest','compilerConfigDigest','configDigest','pagesBuildDigest','adminAssetsDigest'])ensure(DIGEST.test(expected[k]||'')&&value[k]===expected[k],'Activation source/compiler/config/assets comparison differs.');
 return {basis:value.basis,reviewedAgainstSha:value.reviewedAgainstSha,baselineSha:value.baselineSha,observedAt:freshTime(value.observedAt,expected.now??Date.now()),...Object.fromEntries(['sourceInputDigest','compilerConfigDigest','configDigest','pagesBuildDigest','adminAssetsDigest'].map(k=>[k,value[k]])),...(delivery?{baselineSourceInputDigest:value.baselineSourceInputDigest,inactiveDelivery:structuredClone(value.inactiveDelivery)}:{}),...(presentation?{baselineSourceInputDigest:value.baselineSourceInputDigest,presentation:structuredClone(value.presentation),...(value.adminAssetManifest?{adminAssetManifest:structuredClone(value.adminAssetManifest)}:{})}:{}),historicalFunctionsDigest:null,privateSnapshotGap:'Final reads detect drift after the write; no distributed lock or autonomous runtime/schema safety is claimed.'};
}
function isSourceInput(path){return (SHARED_RUNTIME_PATHS.has(path)||/^(src\/|public\/|data\/|server\/|functions\/|admin\/|security\/|catalogue\/|migrations\/|scripts\/|package(-lock)?[.]json$|vite[.]|wrangler.*[.]jsonc$|index[.]html$)/.test(path))&&!TOOLING_PATHS.has(path);}
function sourceInputs(sha){
 const files=git('ls-tree','-r','--name-only',sha).split('\n').filter(isSourceInput);
 ensure(files.length>0,'Missing source inputs.');return hash(files.sort().map(p=>`${p}\0${git('rev-parse',`${sha}:${p}`)}`).join('\n'));
}
const COMPILER_OPTIONS={directory:'dist/client',functionsDirectory:'functions',bundle:true,sourceMaps:false,branch:'main',commitDirty:false,args:{config:'wrangler.jsonc'}};
const COMPILER_FILES=['node','wrangler-package','wrangler-api','wrangler-esbuild-api','wrangler-esbuild-package','wrangler-esbuild-binary','vite-esbuild-api','vite-esbuild-binary','vite','react-plugin'];
export function validateCompilerEvidence(value,{configDigest,lockfileDigest}){
 ensure(exactKeys(value,['wranglerVersion','runtime','files','dependencyInputs','lockfileDigest','configDigest','options','compilerConfigDigest'])&&value.wranglerVersion==='4.150.0'&&/^v(?:22|24)[.][0-9]+[.][0-9]+$/.test(value.runtime)&&value.configDigest===configDigest&&value.lockfileDigest===lockfileDigest&&canonical(value.options)===canonical(COMPILER_OPTIONS),'Invalid retained uploader compiler/config evidence.');
 ensure(Array.isArray(value.files)&&value.files.length===COMPILER_FILES.length&&value.files.every((v,i)=>exactKeys(v,['name','sha256','bytes'])&&v.name===COMPILER_FILES[i]&&DIGEST.test(v.sha256)&&Number.isSafeInteger(v.bytes)&&v.bytes>0),'Invalid retained compiler file fingerprints.');
 ensure(exactKeys(value.dependencyInputs,['sha256','fileCount','bytes'])&&DIGEST.test(value.dependencyInputs.sha256)&&Number.isSafeInteger(value.dependencyInputs.fileCount)&&value.dependencyInputs.fileCount>0&&Number.isSafeInteger(value.dependencyInputs.bytes)&&value.dependencyInputs.bytes>0,'Invalid installed dependency input inventory.');
 const {compilerConfigDigest,...facts}=value;ensure(DIGEST.test(compilerConfigDigest||'')&&hash(canonical(facts))===compilerConfigDigest,'Retained compiler integrity differs.');return structuredClone(value);
}
// Optimizer/config caches are generated outputs, not installed compiler inputs.
export async function installedInputDigest(root){
 const inventory=[];async function walk(directory){for(const entry of (await readdir(directory,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name,'en'))){
  if(directory===root&&['.vite','.vite-temp'].includes(entry.name))continue;
  const path=resolve(directory,entry.name);if(relative(root,path)==='.mf/cf.json')continue;
  if(entry.isDirectory())await walk(path);else{const bytes=await readFile(path);inventory.push([relative(root,path),hash(bytes),bytes.length]);}
 }}await walk(root);return {sha256:hash(canonical(inventory)),fileCount:inventory.length,bytes:inventory.reduce((n,v)=>n+v[2],0)};
}
async function compilerConfig(){
 const require=createRequire(import.meta.url),wranglerRequire=createRequire(require.resolve('wrangler'));
 ensure(JSON.parse(await readFile(require.resolve('wrangler/package.json'),'utf8')).version==='4.150.0','Unreviewed Pages compiler version.');
 const binary='@esbuild/'+process.platform+'-'+process.arch+'/bin/esbuild';
 const paths=[process.execPath,require.resolve('wrangler/package.json'),require.resolve('wrangler'),wranglerRequire.resolve('esbuild'),wranglerRequire.resolve('esbuild/package.json'),wranglerRequire.resolve(binary),require.resolve('esbuild'),require.resolve(binary),require.resolve('vite'),require.resolve('@vitejs/plugin-react')];
 const files=await Promise.all(paths.map(async(path,i)=>({name:COMPILER_FILES[i],...digestBytes(await readFile(path))})));
 const dependencyRoot=resolve(dirname(require.resolve('wrangler/package.json')),'..');
 const dependencyInputs=await installedInputDigest(dependencyRoot);
 const facts={wranglerVersion:'4.150.0',runtime:process.version,files,dependencyInputs,lockfileDigest:hash(await readFile('package-lock.json')),configDigest:hash(await readFile('wrangler.jsonc')),options:COMPILER_OPTIONS};
 return {...facts,compilerConfigDigest:hash(canonical(facts))};
}
async function uploadContext(record){
 const config=JSON.parse(await readFile('wrangler.jsonc','utf8')),assets=await fileInventory('dist/client');const controls=Object.fromEntries(assets.filter(v=>CONTROL_NAMES.includes(v.path)).map(({path,...v})=>[path,v]));
 return {sourceSha:record.sourceSha,runId:record.workflow.runId,sourceInputDigest:record.build.sourceInputDigest,compilerConfigDigest:record.build.compiler.compilerConfigDigest,configDigest:record.build.compiler.configDigest,buildDigest:record.build.pages.sha256,assetsDigest:record.build.pages.sha256,config,assetInventory:assets,controls};
}
export async function officialPagesUpload(expected,{record,onAcknowledgement=async()=>{}}={}){
 // Disable disk diagnostics before importing Wrangler. Only bounded hashes escape this call.
 process.env.WRANGLER_LOG='none';process.env.WRANGLER_WRITE_LOGS='false';process.env.WRANGLER_SEND_METRICS='false';
 try{
  const {unstable_pages}=await import('wrangler');
  ensure(record?.sourceSha===expected.sourceSha,'Missing matched publication plan.');validateMandatoryRecord(record);
  const invocationContext=context({native:true}),invocation=await readMandatoryValidation(record.mandatoryValidation.plan.selector,validationLocal(invocationContext,record.build.compiler.runtime),{phase:'invocation'});
  const onBeforeInvoke=({invokedAt,mandatoryValidation})=>armPrewrite(record,invocationContext,invokedAt,mandatoryValidation);
  const options={directory:'dist/client',accountId:DESTINATION_ACCOUNT,projectName:PAGES_PROJECT,branch:'main',commitHash:expected.sourceSha,commitDirty:false,functionsDirectory:'functions',bundle:true,sourceMaps:false,args:{config:'wrangler.jsonc'}};
  // The official API exposes invocation, not its internal HTTP POST clock.
  // No await or I/O may separate this synchronous gate from the one invocation.
  const invokedAt=new Date().toISOString(),gate=onBeforeInvoke({invokedAt,mandatoryValidation:invocation});
  if(gate&&typeof gate.then==='function'){Promise.resolve(gate).catch(()=>{});throw Error('Pre-invoke validation must be synchronous.');}
  const result=await unstable_pages.deploy(options);
  const acknowledgementObservedAt=new Date().toISOString();
  const acknowledgement=capturePagesAcknowledgement(result.deploymentResponse,expected);
  await onAcknowledgement(acknowledgement,{acknowledgementObservedAt});
  return await capturePagesUpload(result,expected);
 }catch{if(record?.attempts?.length===1&&!record.attempts[0].invokedAt){record.attempts[0].outcome='not-invoked';record.reasons.push('PREWRITE_REJECTED: No uploader invocation occurred.');}throw Error('Official Pages upload or fingerprint validation failed.');}
}
export function validateArtifactHandoff(value,{record,manifestDigest}){
 ensure(value?.origin==='owner-github-run-artifact'&&value.reviewed===true&&value.sourceSha===record.sourceSha&&value.runId===record.workflow.runId&&value.url===record.workflow.url&&value.artifactName===`release-manifest-${record.workflow.runId}`&&value.runStatus==='completed'&&value.conclusion==='success'&&DIGEST.test(manifestDigest||'')&&value.manifestSha256===manifestDigest,'Downloaded GitHub artifact/run integrity is not reviewed.');
 ensure(exactKeys(value,['origin','reviewed','sourceSha','runId','url','artifactName','runStatus','conclusion','manifestSha256','runAttempt','artifactId','jobId','zipSha256','publishStep'])&&value.runAttempt===record.runAttempt&&positiveId(value.artifactId)&&positiveId(value.jobId)&&DIGEST.test(value.zipSha256||''),'Artifact attempt/identity binding is missing.');
 const step=value.publishStep;
 ensure(exactKeys(step,['name','number','startedAt','completedAt'])&&step.name==='Publish protected Pages from the reviewed build'&&Number.isSafeInteger(step.number)&&step.number>0,'Publishing step binding is missing.');
 const start=utc(step.startedAt),end=utc(step.completedAt);ensure(start<=end,'Publishing step clock is reversed.');
 const attempt=record.attempts?.[0];
 for(const time of [record.prewriteValidation?.checkedAt,record.prewriteValidation?.invokedAt,attempt?.startedAt,attempt?.invokedAt,attempt?.acknowledgementObservedAt])ensure(utc(time)>=start-30000&&utc(time)<=end+30000,'Prewrite clocks are outside the actual publishing step.');
 return structuredClone(value);
}
async function fileInventory(directory){
 const values=[];async function walk(dir){for(const name of (await readdir(dir)).sort()){const path=resolve(dir,name),s=await stat(path);if(s.isDirectory())await walk(path);else values.push({path:relative(resolve(directory),path),...digestBytes(await readFile(path))});}}await walk(resolve(directory));return safeAssetInventory(values);
}

export function classifyChanges(paths,dependencies={}){
 const components=new Set(['pages']),schemas=new Set();
 for(const path of paths){
  if(/^(docs\/|tests\/|[.]github\/|[^/]+[.]md$|[.]gitignore$)/.test(path))continue;
  if(SHARED_RUNTIME_PATHS.has(path)||/^(src\/|public\/|data\/|admin\/|server\/)/.test(path)){
   if(!/^server\/proof-api[.]mjs$/.test(path))components.add('admin');
  }else if(/^functions\//.test(path)){}
  else if(/^security\//.test(path)){components.add('security');components.add('admin');}
  else if(/^catalogue\//.test(path)){components.add('catalogue');components.add('admin');}
  else if(/^migrations\/(security|content)\//.test(path)){
   const family=path.split('/')[1];schemas.add(family);components.add(family==='security'?'security':'catalogue');components.add('admin');
  }else if(/^(scripts\/|package(-lock)?[.]json$|vite[.].*|index[.]html$|wrangler.*[.]jsonc$)/.test(path)){
   // Toolchain/configuration changes can affect every bundle or binding.
   for(const c of COMPONENTS)components.add(c);
  }else throw Error('Unclassified release path: '+path);
  for(const c of ['security','catalogue'])if(dependencies[c]?.includes(path)){components.add(c);components.add('admin');}
 }
 return {components:COMPONENTS.filter(c=>components.has(c)),schemas:[...schemas].sort()};
}
export function validateRevision({reviewed,event,checkout,latest}){
 for(const value of [reviewed,event,checkout,latest])ensure(SHA.test(value||''),'Expected an exact lowercase 40-character SHA.');
 ensure([event,checkout,latest].every(value=>value===reviewed),'Reviewed revision, event, checkout and current main must match.');return reviewed;
}
export function validateReceipt(receipt,{component,id,sourceDigest,runtimeDigest,configDigest,now=Date.now()}){
 ensure(receipt?.account===DESTINATION_ACCOUNT&&receipt.component===component,'Receipt account/component mismatch.');
 ensure(ID.test(receipt.id||'')&&receipt.id===id,'Receipt does not match the observed version.');
 ensure(SHA.test(receipt.sourceSha||'')&&DIGEST.test(receipt.sourceDigest||''),'Receipt source fingerprint missing.');
 const unchangedRuntime=DIGEST.test(runtimeDigest||'')&&DIGEST.test(configDigest||'')&&receipt.runtimeDigest===runtimeDigest&&receipt.configDigest===configDigest;
 ensure(receipt.sourceDigest===sourceDigest||unchangedRuntime,'Receipt source fingerprint mismatch without identical emitted runtime and configuration.');
 ensure(receipt.origin==='guarded-upload','Source provenance needs a guarded upload receipt, never a version tag.');
 ensure(new RegExp('^https://github[.]com/'+REPOSITORY+'/(?:actions/runs/[0-9]+(?:/[a-zA-Z0-9_/#?=&.-]*)?|blob/[a-f0-9]{40}/docs/releases/[a-zA-Z0-9_.-]+[.]json)$').test(receipt.evidenceUrl||''),'Upload evidence must reference this repository workflow run or reviewed immutable release record.');
 ensure(typeof receipt.observedAt==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d[.]\d{3}Z$/.test(receipt.observedAt)&&Number.isFinite(Date.parse(receipt.observedAt))&&new Date(receipt.observedAt).toISOString()===receipt.observedAt&&Date.parse(receipt.observedAt)<=now+30000,'Receipt observation time missing or invalid.');
 for(const k of ['runtimeDigest','configDigest','assetsDigest','buildDigest'])if(receipt[k]!==undefined)ensure(typeof receipt[k]==='string'&&DIGEST.test(receipt[k]),'Invalid closure digest.');
 return Object.fromEntries(['account','component','id','sourceSha','sourceDigest','runtimeDigest','configDigest','origin','evidenceUrl','observedAt','assetsDigest','buildDigest'].filter(k=>receipt[k]!==undefined).map(k=>[k,receipt[k]]));
}
export function validateLedger(applied,expected){
 ensure(Array.isArray(applied)&&applied.every(v=>typeof v==='string')&&JSON.stringify([...applied].sort())===JSON.stringify([...expected].sort()),'Applied migration ledger differs from reviewed source; inspect missing or newer migrations.');return [...applied].sort();
}
export function releaseState({required,completed}){return required.every(c=>completed[c]?.id)?'verified':Object.keys(completed).length?'partial':'blocked';}
export function assertUnchanged(expected,current){for(const [component,id] of Object.entries(expected))ensure(current[component]===id,'Current '+component+' deployment changed; re-plan without overwriting it.');}
export function validateBaseline(record){
 if(record?.kind==='paired-release-recovery-v1'){const {reviewed,evidenceUrl,...core}=record;validatePairedRecoveryRecord(core,{sourceSha:record.sourceSha});return {schemaVersion:2,repository:REPOSITORY,state:'verified',sourceSha:record.sourceSha,baseSha:record.sourceSha};}
 ensure([1,2].includes(record?.schemaVersion)&&record.repository===REPOSITORY,'Unrecognized release baseline.');
 ensure(['verified','partial','blocked'].includes(record.state)&&SHA.test(record.sourceSha||'')&&SHA.test(record.baseSha||''),'Baseline source evidence missing.');
 if(record.state==='verified'){
  ensure(record.schemaVersion===2&&record.prerequisites?.complete===true&&record.guards?.protection==='passed','A verified label is not complete provenance.');
  for(const c of COMPONENTS){const receipt=record.components?.[c]?.receipt;validateReceipt(receipt,{component:c,id:receipt?.id,sourceDigest:receipt?.sourceDigest});}
 }
 return {schemaVersion:record.schemaVersion,repository:REPOSITORY,state:record.state,sourceSha:record.sourceSha,baseSha:record.state==='verified'?record.sourceSha:record.baseSha};
}
// Operator-reviewed snapshots are an explicit trust boundary, not authenticated by a URL.
// Fresh active observations never replace the original guarded upload/source chain.
const MAX_EVIDENCE_AGE_MS=10*60*1000;
function freshTime(value,now){
 ensure(typeof value==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d[.]\d{3}Z$/.test(value),'Observation time must be canonical UTC.');
 const time=Date.parse(value);ensure(Number.isFinite(time)&&new Date(time).toISOString()===value&&time<=now+30000&&now-time<=MAX_EVIDENCE_AGE_MS,'Observation is stale or in the future.');return value;
}
function guardEvidence(value,component,{sourceSha,id,now}){
 ensure(value?.account===DESTINATION_ACCOUNT&&value.component===component&&value.origin==='private-helper-get'&&value.candidateSha===sourceSha&&ID.test(id||'')&&value.id===id&&value.protection==='passed','Private guard snapshot does not match this plan.');
 return {account:DESTINATION_ACCOUNT,component,id,origin:value.origin,candidateSha:sourceSha,observedAt:freshTime(value.observedAt,now),protection:'passed'};
}
function schemaEvidence(value,expected,{sourceSha,now}){
 ensure(value?.origin==='console-metadata'&&value.databaseId===expected.databaseId&&value.reviewedAgainstSha===sourceSha&&value.ddlReviewed===true&&DIGEST.test(value.objectsDigest||''),'Reviewed schema metadata is missing.');
 ensure(Array.isArray(value.sourceFiles)&&JSON.stringify(value.sourceFiles)===JSON.stringify(expected.source),'Schema source checksums differ from reviewed source.');
 const applied=validateLedger(value.applied,expected.source.map(v=>v.name));
 return {origin:value.origin,databaseId:expected.databaseId,reviewedAgainstSha:sourceSha,observedAt:freshTime(value.observedAt,now),sourceFiles:expected.source,applied,objectsDigest:value.objectsDigest,ddlReviewed:true,remoteChecksumEvidence:'source checksums only; remote ledger has no checksums'};
}
export function validatePrerequisites({required,sourceSha,before,sourceDigests,privateBuild,schemaSources,evidence={},beforePagesSourceSha,now=Date.now(),rollbackBefore=before,requireStaged=required.includes('admin'),inactiveDelivery}){
 ensure(Array.isArray(required)&&required.includes('pages')&&required.every(c=>COMPONENTS.includes(c))&&SHA.test(sourceSha||''),'Invalid release scope.');
 if(inactiveDelivery){validateInactiveDeliveryInputs(inactiveDelivery);validateInactivePrivate({sourceSha,sourceDigests,privateBuild,evidence});}
 const result={components:{},schema:{},staged:{status:requireStaged?'blocked':'not-required'},complete:false};
 for(const component of ['admin','security','catalogue']){
  const needed=required.includes(component);let value={status:'blocked',code:'UNKNOWN_OR_UNVERIFIED'};
  try{
   const guard=guardEvidence(evidence.guards?.[component],component,{sourceSha,id:before[component],now});
   if(component==='admin')value={status:'verified',guard};
   else {
    const build=privateBuild[component];ensure(DIGEST.test(build?.runtimeDigest||'')&&DIGEST.test(build?.configDigest||''),'Comparison build missing.');
    const raw=evidence.receipts?.[component];
    ensure(raw?.runtimeDigest===build.runtimeDigest&&raw.configDigest===build.configDigest,'Private upload closure does not match reviewed runtime/config.');
    const receipt=validateReceipt(raw,{component,id:before[component],sourceDigest:sourceDigests[component],...build,now});
    value={status:'verified',guard,receipt};
   }
  }catch{if(needed)throw Error('Required private provenance or current guard is unknown, stale or incompatible.');}
  result.components[component]=value;
 }
 for(const family of ['security','content']){
  const component=family==='security'?'security':'catalogue';
  try{result.schema[family]={status:'verified',evidence:schemaEvidence(evidence.schema?.[family],schemaSources[family],{sourceSha,now})};}
  catch{result.schema[family]={status:'blocked',code:'UNKNOWN_OR_UNVERIFIED'};if(required.includes(component))throw Error('Required schema evidence is unknown, stale or incompatible.');}
 }
 if(requireStaged){
  const staged=evidence.staged,rollback=staged?.rollback;
  ensure(staged?.reviewedAgainstSha===sourceSha&&staged.clientPairCompatibleWithSchema===true&&rollback&&rollback.pagesId===rollbackBefore.pages&&rollback.adminId===rollbackBefore.admin&&ID.test(rollback.pagesId||'')&&ID.test(rollback.adminId||'')&&SHA.test(beforePagesSourceSha||'')&&rollback.sourceSha===beforePagesSourceSha&&['pagesBuildDigest','adminAssetsDigest','adminRuntimeDigest','adminConfigDigest'].every(k=>DIGEST.test(rollback[k]||'')),'Paired publication requires a reviewed compatible staged plan and matching rollback versions.');
  result.staged={status:'verified',evidence:{reviewedAgainstSha:sourceSha,observedAt:freshTime(staged.observedAt,now),clientPairCompatibleWithSchema:true,rollback:Object.fromEntries(['pagesId','adminId','sourceSha','pagesBuildDigest','adminAssetsDigest','adminRuntimeDigest','adminConfigDigest'].map(k=>[k,rollback[k]]))}};
 }
 result.complete=['admin','security','catalogue'].every(c=>result.components[c].status==='verified')&&['security','content'].every(f=>result.schema[f].status==='verified');
 return result;
}
export function rollbackPlan({current,expected,compatibleBackend=false}){
 assertUnchanged(expected,current);return {order:['pages','admin'],backendRollback:compatibleBackend?'only after compatible clients and explicit review':'blocked',retainSchema:true,retainSendAttemptHistory:true};
}
export function currentWorkerVersion(response){
 ensure(response?.success,'Cannot observe Worker deployment metadata.');
 const deployments=Array.isArray(response.result)?response.result:response.result?.deployments;
 ensure(Array.isArray(deployments)&&deployments.length&&deployments.every(d=>Number.isFinite(Date.parse(d.created_on))),'No unambiguous current Worker deployment found.');
 const active=[...deployments].sort((a,b)=>Date.parse(b.created_on)-Date.parse(a.created_on))[0];
 ensure(active.versions?.length===1&&active.versions[0].percentage===100&&ID.test(active.versions[0].version_id||''),'Split or unknown Worker deployment requires explicit review.');
 return active.versions[0].version_id;
}
export async function observeVersions(request){
 ensure(typeof request==='function','Private observation requires an explicit existing helper request.');
 const response=await request(`accounts/${DESTINATION_ACCOUNT}/pages/projects/${PAGES_PROJECT}`);
 ensure(response.success&&response.result?.canonical_deployment?.latest_stage?.status==='success','Cannot observe successful canonical Pages deployment.');
 const deployment=response.result.canonical_deployment;
 ensure(ID.test(deployment.id||''),'Pages deployment ID missing.');
 const versions={pages:deployment.id};
 for(const component of COMPONENTS.slice(1))versions[component]=currentWorkerVersion(await request(`accounts/${DESTINATION_ACCOUNT}/workers/scripts/customvibe-${component}/deployments`));
 return {versions,pagesSha:deployment.deployment_trigger?.metadata?.commit_hash};
}
function dependencyFiles(sha,entry){
 const visited=new Set();
 function visit(file){
  if(visited.has(file))return;visited.add(file);
  let text;try{text=git('show',`${sha}:${file}`);}catch{throw Error('Missing release dependency: '+file);}
  if(!/[.](mjs|js|jsx|ts|tsx)$/.test(file))return;
  const imports=text.matchAll(/(?:from\s*|import\s*\(\s*|import\s*)['"]([.][^'"]+)['"]/g);
  for(const match of imports){const target=posix.normalize(posix.join(posix.dirname(file),match[1]));ensure(!target.startsWith('../'),'Dependency leaves repository.');visit(target);}
 }
 visit(entry);return [...visited].sort();
}
function dependencies(sha){return {security:dependencyFiles(sha,'security/index.mjs'),catalogue:dependencyFiles(sha,'catalogue/index.mjs')};}
export function fingerprint(sha,component){
 const privateFiles=component==='security'||component==='catalogue'?dependencyFiles(sha,`${component}/index.mjs`):null;
 const dep=dependencies(sha);
 const files=git('ls-tree','-r','--name-only',sha).split('\n').filter(path=>privateFiles?privateFiles.includes(path)||path===`wrangler.${component}.jsonc`||/^package(-lock)?[.]json$/.test(path):(SHARED_RUNTIME_PATHS.has(path)||/^(src\/|public\/|data\/|server\/|scripts\/|functions\/|admin\/|package|vite|wrangler|index[.]html)/.test(path))&&classifyChanges([path],dep).components.includes(component));
 return hash(files.map(path=>`${path}\0${git('rev-parse',`${sha}:${path}`)}`).join('\n'));
}
async function bundleDigest(directory,{runtimeOnly=false}={}){
 const files=[];async function walk(dir){for(const name of (await readdir(dir)).sort()){const path=resolve(dir,name);if((await stat(path)).isDirectory())await walk(path);else if(!runtimeOnly||(!path.endsWith('.map')&&name!=='README.md'))files.push([relative(directory,path),hash(await readFile(path))]);}}
 await walk(resolve(directory));ensure(files.length>0,'Built output is empty.');return {sha256:hash(JSON.stringify(files)),fileCount:files.length};
}
async function privateBuilds(){
 const sourceSha=git('rev-parse','HEAD');const components={};let inactiveDelivery;try{inactiveDelivery=inactiveDeliveryInputs(INACTIVE_DELIVERY_POLICY.baselineSha,sourceSha,{archivePath:INACTIVE_DELIVERY_POLICY.archivePath});}catch{}
 for(const component of ['admin','security','catalogue']){
  const directory=`dist/release/private/${component}`;
  await rm(directory,{recursive:true,force:true});
  const metafile=component==='admin'?ADMIN_METAFILE:component==='catalogue'&&inactiveDelivery?CATALOGUE_METAFILE:undefined;if(metafile){await mkdir(dirname(metafile),{recursive:true});await rm(metafile,{force:true});}
  command('npx',['--no-install','wrangler','deploy','--dry-run','--config',`wrangler.${component}.jsonc`,'--outdir',directory,...(metafile?['--metafile',metafile]:[])]);
  components[component]={...(component==='catalogue'&&inactiveDelivery?{inputClosure:await inactiveCatalogueInputs()}:{}),runtimeDigest:(await bundleDigest(directory,{runtimeOnly:true})).sha256,configDigest:hash(await readFile(`wrangler.${component}.jsonc`)),...(component==='admin'&&hash(await readFile(ADMIN_MANIFEST_PATH))===ADMIN_MANIFEST_POLICY.manifestSha256?{assetManifest:await adminAssetManifestInputs()}:{})};
 }
 await writeFile('dist/release/private-build-manifest.json',JSON.stringify({sourceSha,components},null,2)+'\n');
}
async function readJson(path){ensure((await stat(path)).size<2*1024*1024,'Metadata file too large.');return JSON.parse(await readFile(path,'utf8'));}
async function save(record){await mkdir(dirname(OUTPUT),{recursive:true});await writeFile(OUTPUT,JSON.stringify(record,null,2)+'\n');}
function context({native=false}={}){
 if(native)nativeGitHubToken();
 ensure(process.env.GITHUB_REPOSITORY===REPOSITORY&&process.env.GITHUB_REF==='refs/heads/main','Release requires the expected repository main branch.');
 ensure(process.env.GITHUB_EVENT_NAME==='workflow_dispatch','Publication requires explicit manual dispatch.');
 const sourceSha=process.env.REVIEWED_SHA;
 const latest=JSON.parse(command('gh',['api','--hostname','github.com',`repos/${REPOSITORY}/git/ref/heads/main`])).object.sha;
 validateRevision({reviewed:sourceSha,event:process.env.GITHUB_SHA,checkout:git('rev-parse','HEAD'),latest});
 ensure(!git('status','--porcelain'),'Release checkout must be clean.');
 ensure(positiveId(process.env.GITHUB_RUN_ID)&&positiveId(process.env.GITHUB_RUN_ATTEMPT),'Actual GitHub run and attempt IDs required.');
 return {sourceSha,repository:REPOSITORY,runAttempt:process.env.GITHUB_RUN_ATTEMPT,workflow:{runId:process.env.GITHUB_RUN_ID,url:`https://github.com/${REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`,event:process.env.GITHUB_EVENT_NAME},observedAt:new Date().toISOString()};
}
async function schemaSources(){
 const result={};
 for(const family of ['security','content']){
  const config=await readJson(family==='security'?'wrangler.security.jsonc':'wrangler.catalogue.jsonc');
  const db=config.d1_databases?.[0];ensure(ID.test(db?.database_id||''),'Schema destination missing.');
  const names=(await readdir(`migrations/${family}`)).filter(n=>n.endsWith('.sql')).sort();
  result[family]={databaseId:db.database_id,source:await Promise.all(names.map(async name=>({name,sha256:hash(await readFile(`migrations/${family}/${name}`))})))};
 }
 return result;
}
function inputEvidence(sourceSha){
 const text=process.env.RELEASE_EVIDENCE_JSON||'';ensure(text.length>0&&Buffer.byteLength(text)<100000,'Explicit sanitized evidence input is required.');
 const value=strictJson(text);ensure(value&&typeof value==='object'&&!Array.isArray(value)&&value.sourceSha===sourceSha,'Evidence was reviewed for a different source.');ensure(Object.keys(value).every(k=>['sourceSha','baseline','mandatoryValidation','guards','receipts','schema','staged','activationCompatibility','archivedRelease','githubArtifact'].includes(k)),'Unknown evidence input.');
 if(value.activationCompatibility?.basis==='reviewed-inactive-delivery-v1'){
  // The completed T record exceeds the bounded dispatch payload. Resolve only
  // its fixed immutable bytes already committed in this exact candidate tree.
  const locator=value.baseline,p=INACTIVE_DELIVERY_POLICY;ensure(exactKeys(locator,['sourceSha','reviewed','evidenceUrl'])&&locator.sourceSha===p.baselineSha&&locator.reviewed===true&&locator.evidenceUrl===`https://github.com/${REPOSITORY}/blob/a27d393e35b6657c4800560bbcaffe3bceaf33f9/${p.archivePath}`,'Inactive Delivery baseline locator differs.');
  const bytes=Buffer.from(execFileSync('git',['show',`${sourceSha}:${p.archivePath}`],{maxBuffer:2*1024*1024,stdio:['ignore','pipe','pipe']}));ensure(hash(bytes)===p.baseline.archiveSha256,'Inactive Delivery baseline committed bytes changed.');value.baseline={...strictJson(bytes.toString('utf8')),reviewed:true,evidenceUrl:locator.evidenceUrl};
 }
 return value;
}
async function observePages(request=createRequest(),{inactiveDelivery=false}={}){
 const response=await request(`accounts/${DESTINATION_ACCOUNT}/pages/projects/${PAGES_PROJECT}`);
 const deployment=response?.result?.canonical_deployment;
 ensure(response.success&&deployment?.latest_stage?.status==='success'&&ID.test(deployment.id||'')&&SHA.test(deployment.deployment_trigger?.metadata?.commit_hash||''),'Successful canonical Pages metadata missing.');
 return {pages:deployment.id,sourceSha:deployment.deployment_trigger.metadata.commit_hash,...(inactiveDelivery?{inactiveIngress:inactiveDeliveryIngress(response.result,{id:deployment.id,sourceSha:deployment.deployment_trigger.metadata.commit_hash})}:{})};
}
// Poll only read-only canonical metadata while the exact old production pair is
// still visible. This never retries an upload or accepts an unrelated version.
export async function observeAcknowledgedPages(request,{id,sourceSha,beforeId,beforeSourceSha,inactiveDelivery=false},pause=()=>new Promise(resolve=>setTimeout(resolve,5000))){
 ensure(ID.test(id||'')&&SHA.test(sourceSha||'')&&ID.test(beforeId||'')&&SHA.test(beforeSourceSha||''),'Unbound Pages observation.');
 for(let attempt=0;attempt<24;attempt++){
  const observed=await observePages(request,{inactiveDelivery});
  if(observed.pages===id&&observed.sourceSha===sourceSha)return observed;
  ensure(observed.pages===beforeId&&observed.sourceSha===beforeSourceSha,'Canonical Pages changed to another ID/source.');
  if(attempt<23)await pause();
 }
 throw Error('Acknowledged Pages is not successful canonical production.');
}
function prerequisiteInput(record,evidence=record.evidence){return {required:record.required,sourceSha:record.sourceSha,before:record.before,sourceDigests:record.sourceDigests,beforePagesSourceSha:record.beforePagesSourceSha,privateBuild:record.build.private,schemaSources:record.schemaSources,evidence,inactiveDelivery:record.build.inactiveDelivery};}
const positiveId=value=>typeof value==='string'&&/^[1-9][0-9]{0,19}$/.test(value);
function utc(value){ensure(typeof value==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d[.]\d{3}Z$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString()===value,'Invalid phase clock.');return Date.parse(value);}
function compatibilityInput(record){return {sourceSha:record.sourceSha,baseSha:record.baseSha,beforePagesSourceSha:record.beforePagesSourceSha,paths:record.paths,archivedRelease:record.archivedRelease,sourceInputDigest:record.build.sourceInputDigest,baselineSourceInputDigest:record.build.baselineSourceInputDigest??record.build.sourceInputDigest,presentation:record.build.presentation,inactiveDelivery:record.build.inactiveDelivery,deliveryBaseline:record.build.deliveryBaseline,inactiveIngress:record.build.inactiveIngress,evidence:record.evidence,sourceDigests:record.sourceDigests,before:record.before,adminManifestBaseline:record.build.adminManifestBaseline,privateBuild:record.build.private,rollback:record.evidence?.staged?.rollback,compilerConfigDigest:record.build.compiler.compilerConfigDigest,configDigest:record.build.compiler.configDigest,pagesBuildDigest:record.build.pages.sha256,adminAssetsDigest:record.build.admin.sha256};}
function authorizationSnapshot(record,version=record.prewriteValidation?.version??2){
 return Object.fromEntries([...(version===2?['mandatoryValidation']:[]),'sourceSha','repository','workflow','runAttempt','planComplete','baseSha','beforePagesSourceSha','before','required','schemas','paths','archivedRelease','sourceDigests','schemaSources','build','activationCompatibility','evidence'].map(k=>[k,record[k]]));
}
function validateOriginalAt(record,now){
 const prerequisites=validatePrerequisites({...prerequisiteInput(record),now});
 ensure(canonical(sanitizedEvidence(record.sourceSha,prerequisites))===canonical(record.evidence),'Original evidence changed or contains unrecognized data.');
 validateActivationCompatibility(record.activationCompatibility,{...compatibilityInput(record),now});
}
// Only the coordinator callback can arm a pending intent. Hashes bind content;
// reviewed runner source and genuine owner artifact retrieval supply authority.
function armPrewrite(record,ctx,invokedAt,invocation){
 const attempt=record.attempts?.[0];
 ensure(record.planComplete===true&&record.state==='planned'&&record.reasons.length===0&&record.attempts?.length===1&&attempt.component==='pages'&&attempt.outcome==='unconfirmed'&&!attempt.invokedAt&&!attempt.acknowledgement&&!record.prewriteValidation&&!record.pagesUploadEvidence,'Prewrite intent is not new.');
 ensure(ctx.sourceSha===record.sourceSha&&ctx.workflow.runId===record.workflow.runId&&ctx.runAttempt===record.runAttempt&&record.repository===REPOSITORY,'Prewrite run/source changed.');
 record.mandatoryValidation.invocation=invocation;const now=utc(invokedAt);validateMandatoryRecord(record,{invocation:true,now});ensure(utc(attempt.startedAt)<=now,'Prewrite clock reversed.');validateOriginalAt(record,now);
 const stamp={version:2,repository:REPOSITORY,sourceSha:record.sourceSha,runId:record.workflow.runId,runAttempt:record.runAttempt,coordinatorAttempt:1,checkedAt:invokedAt,invokedAt,snapshotDigest:hash(canonical(authorizationSnapshot(record)))};
 record.prewriteValidation={...stamp,integrityDigest:hash(canonical(stamp))};attempt.invokedAt=invokedAt;attempt.prewriteValidationDigest=record.prewriteValidation.integrityDigest;
}
export function validatePrewriteAuthorization(record,context){
 const stamp=record.prewriteValidation,attempt=record.attempts?.[0];
 ensure(exactKeys(stamp,['version','repository','sourceSha','runId','runAttempt','coordinatorAttempt','checkedAt','invokedAt','snapshotDigest','integrityDigest'])&&[1,2].includes(stamp.version)&&stamp.repository===REPOSITORY&&stamp.sourceSha===record.sourceSha&&stamp.runId===record.workflow?.runId&&stamp.runAttempt===record.runAttempt&&positiveId(stamp.runAttempt)&&stamp.coordinatorAttempt===1,'Missing source/run-bound prewrite stamp.');
 ensure(context?.repository===REPOSITORY&&context.sourceSha===record.sourceSha&&context.runId===stamp.runId&&context.runAttempt===stamp.runAttempt,'Prewrite authority belongs to another run attempt.');
 const {integrityDigest,...fields}=stamp;
 ensure(DIGEST.test(integrityDigest||'')&&hash(canonical(fields))===integrityDigest&&hash(canonical(authorizationSnapshot(record,stamp.version)))===stamp.snapshotDigest,'Prewrite snapshot integrity differs.');
 ensure(record.planComplete===true&&record.attempts?.length===1&&attempt.component==='pages'&&attempt.invokedAt===stamp.invokedAt&&attempt.prewriteValidationDigest===integrityDigest,'Prewrite attempt link differs.');
 ensure(Object.keys(attempt).every(k=>['component','startedAt','outcome','invokedAt','prewriteValidationDigest','acknowledgementObservedAt','acknowledgement','protection'].includes(k))&&['unconfirmed','observed'].includes(attempt.outcome),'Unexpected attempt metadata.');
 if(stamp.version===2)validateMandatoryRecord(record,{invocation:true,now:utc(stamp.invokedAt)});else ensure(!('mandatoryValidation' in record),'Legacy stamp cannot carry matched validation.');
 const invoked=utc(stamp.invokedAt),received=utc(attempt.acknowledgementObservedAt),now=context.now??Date.now();
 ensure(stamp.checkedAt===stamp.invokedAt&&utc(attempt.startedAt)<=invoked&&invoked<=received&&received<=now+30000,'Prewrite runner clocks are reversed or in the future.');
 const proof=validatePagesUploadEvidence(record.pagesUploadEvidence,{sourceSha:record.sourceSha,runId:stamp.runId,sourceInputDigest:record.build.sourceInputDigest,compilerConfigDigest:record.build.compiler.compilerConfigDigest,configDigest:record.build.compiler.configDigest,buildDigest:record.build.pages.sha256,assetsDigest:record.build.pages.sha256});
 ensure(canonical(attempt.acknowledgement)===canonical(proof.acknowledgement),'Acknowledgement/stamp link differs.');
 const created=utc(proof.acknowledgement.createdAt);ensure(created>=invoked-30000&&created<=received+30000,'Provider creation is outside the invocation/receipt interval.');
 if(record.components?.pages?.receipt)ensure(received<=utc(record.components.pages.receipt.observedAt)&&utc(record.components.pages.receipt.observedAt)<=now+30000,'Canonical receipt clock reversed.');
 validateOriginalAt(record,invoked);validateOriginalAt(record,Math.max(invoked,created));
 return {version:1,prewriteValidationDigest:integrityDigest,invokedAt:stamp.invokedAt};
}
function runAuthorizationContext(ctx){return {repository:ctx.repository,sourceSha:ctx.sourceSha,runId:ctx.workflow.runId,runAttempt:ctx.runAttempt};}
function sanitizedEvidence(sourceSha,prerequisites){
 return {sourceSha,guards:Object.fromEntries(Object.entries(prerequisites.components).filter(([,v])=>v.guard).map(([k,v])=>[k,v.guard])),receipts:Object.fromEntries(Object.entries(prerequisites.components).filter(([,v])=>v.receipt).map(([k,v])=>[k,v.receipt])),schema:Object.fromEntries(Object.entries(prerequisites.schema).filter(([,v])=>v.evidence).map(([k,v])=>[k,v.evidence])),...(prerequisites.staged.evidence?{staged:prerequisites.staged.evidence}:{})};
}
async function plan(){
 let record={schemaVersion:2,repository:REPOSITORY,state:'blocked',required:[],completed:{},reasons:[],planComplete:false};let phase='CONTEXT';
 try{
  ensure(process.env.PUBLISH_ADMIN!=='true','GitHub publication is Pages-only.');
  const ctx=context({native:true});record={...record,...ctx};
  phase='MANDATORY_VALIDATION';const evidence=inputEvidence(ctx.sourceSha);record.mandatoryValidation={version:1,plan:await readMandatoryValidation(evidence.mandatoryValidation,validationLocal(ctx))};
  phase='GUARDS';command(process.execPath,['scripts/check-deployment.mjs','before']);
  phase='BASELINE';const previous=validateBaseline(evidence.baseline),baseSha=previous.baseSha;
  if(evidence.activationCompatibility?.basis==='reviewed-public-presentation-v1')ensure(previous.schemaVersion===2&&previous.state==='verified','Presentation release needs a genuinely completed reviewed baseline.');
  ensure(evidence.baseline.reviewed===true&&typeof evidence.baseline.evidenceUrl==='string'&&new RegExp('^https://github[.]com/'+REPOSITORY+'/(?:actions/runs/[0-9]+|blob/[a-f0-9]{40}/docs/releases/[a-zA-Z0-9_.-]+[.]json)$').test(evidence.baseline.evidenceUrl),'Baseline needs an explicitly reviewed immutable evidence reference.');
  phase='SCOPE';ensure(git('merge-base',baseSha,ctx.sourceSha)===baseSha,'Baseline must be an ancestor of reviewed main.');
  const paths=git('diff','--name-only',baseSha,ctx.sourceSha).split('\n').filter(Boolean),dep=dependencies(ctx.sourceSha),prior=dependencies(baseSha);
  const classification=classifyChanges(paths,Object.fromEntries(['security','catalogue'].map(c=>[c,[...new Set([...dep[c],...prior[c]])]])));
  const delivery=evidence.activationCompatibility?.basis==='reviewed-inactive-delivery-v1',inactiveDelivery=delivery?inactiveDeliveryInputs(baseSha,ctx.sourceSha,{archivePath:evidence.archivedRelease?.path}):undefined,deliveryBaseline=delivery?inactiveDeliveryBaseline(evidence.baseline):undefined;
  const presentation=!delivery&&paths.some(p=>PRESENTATION_PATHS.has(p))?presentationInputs(baseSha,ctx.sourceSha,{archivePath:evidence.archivedRelease?.path}):undefined;
  phase='ARCHIVE';record.archivedRelease=await releaseArchive(evidence.archivedRelease,{paths,sourceSha:ctx.sourceSha,baseSha,baseline:evidence.baseline,presentation,inactiveDelivery});
  phase='VERSIONS';const pages=await observePages(undefined,{inactiveDelivery:delivery});
  record={...record,baseSha,paths,required:classification.components,schemas:classification.schemas,beforePagesSourceSha:pages.sourceSha,before:{pages:pages.pages,...Object.fromEntries(['admin','security','catalogue'].filter(c=>ID.test(evidence.guards?.[c]?.id||'')).map(c=>[c,evidence.guards[c].id]))},components:{},sourceDigests:Object.fromEntries(COMPONENTS.map(c=>[c,fingerprint(ctx.sourceSha,c)])),schemaSources:await schemaSources()};
  phase='BUILD';let comparison={components:{}};
  try{comparison=await readJson('dist/release/private-build-manifest.json');ensure(comparison.sourceSha===ctx.sourceSha,'Comparison build source differs.');
   for(const c of Object.keys(comparison.components)){ensure(['admin','security','catalogue'].includes(c),'Unknown comparison component.');ensure((await bundleDigest(`dist/release/private/${c}`,{runtimeOnly:true})).sha256===comparison.components[c].runtimeDigest&&hash(await readFile(`wrangler.${c}.jsonc`))===comparison.components[c].configDigest,'Comparison bytes/config changed.');if(comparison.components[c].inputClosure)ensure(c==='catalogue'&&inactiveDelivery&&canonical(await inactiveCatalogueInputs())===canonical(comparison.components[c].inputClosure),'Catalogue compiler/input evidence changed.');if(comparison.components[c].assetManifest)ensure(c==='admin'&&canonical(await adminAssetManifestInputs())===canonical(comparison.components[c].assetManifest),'Admin compiler input evidence changed.');}
  }catch{comparison={components:{}};ensure(!record.required.some(c=>['admin','security','catalogue'].includes(c)),'Required private comparison build missing or changed.');}
  record.build={schemaVersion:2,sourceSha:ctx.sourceSha,sourceInputDigest:sourceInputs(ctx.sourceSha),...(inactiveDelivery?{baselineSourceInputDigest:inactiveDelivery.baselineSourceInputDigest,inactiveDelivery,deliveryBaseline,inactiveIngress:pages.inactiveIngress}:{}),...(presentation?{baselineSourceInputDigest:presentation.baselineSourceInputDigest,presentation}:{}),compiler:await compilerConfig(),ssr:await bundleDigest('dist/ssr'),private:comparison.components,pages:await bundleDigest('dist/client'),admin:await bundleDigest('dist/admin')};
  phase='MANDATORY_VALIDATION';validateMandatoryRecord(record);
  if(evidence.activationCompatibility?.adminAssetManifest){const receipt=evidence.baseline.components?.admin?.receipt;ensure(receipt?.sourceSha===baseSha&&DIGEST.test(receipt.assetsDigest||''),'Genuine baseline Admin asset receipt missing.');record.build.adminManifestBaseline={sourceSha:receipt.sourceSha,id:receipt.id,runtimeDigest:receipt.runtimeDigest,configDigest:receipt.configDigest,assetsDigest:receipt.assetsDigest,manifestSha256:ADMIN_MANIFEST_POLICY.baselineManifestSha256};}
  phase='ACTIVATION_COMPATIBILITY';record.activationCompatibility=validateActivationCompatibility(evidence.activationCompatibility,{...compatibilityInput(record),baselineSourceInputDigest:sourceInputs(baseSha),rollback:evidence.staged?.rollback,evidence});
  await writeFile('dist/release/build-manifest.json',JSON.stringify(record.build,null,2)+'\n');
  phase='PREREQUISITES';record.prerequisites=validatePrerequisites(prerequisiteInput(record,evidence));
  record.evidence=sanitizedEvidence(ctx.sourceSha,record.prerequisites);
  record.guards={publication:'pending',privateObservation:'reviewed fresh snapshots; live helper completion required',payments:'disabled; application acceptance separate',customerEmails:'manual only; application acceptance separate'};
  record.planComplete=true;record.state='planned';await save(record);
 }catch{record.reasons.push(`PLAN_${phase}_FAILED: Planning stopped. Review source, baseline and bounded evidence.`);await save(record);throw Error('Planning failed.');}
}
// Guard every component against its validated receipt, then independently retain
// a final identity readback. A safe replacement version is still deployment drift.
function expectedIdentities(record,components){
 let acknowledgedId;
 try{
  const ack=record.attempts?.at(-1)?.acknowledgement;ensure(exactKeys(ack,['id','sourceSha','environment','createdAt']),'No bounded acknowledgement.');
  acknowledgedId=capturePagesAcknowledgement({id:ack.id,environment:ack.environment,created_on:ack.createdAt,deployment_trigger:{metadata:{commit_hash:ack.sourceSha}}},{sourceSha:record.sourceSha}).id;
 }catch{}
 return Object.fromEntries(components.map(c=>[c,record.components?.[c]?.receipt?.id||record.completed?.[c]?.id||(c==='pages'?(record.pagesUploadEvidence?.acknowledgement?.id||acknowledgedId):undefined)||record.before?.[c]]).filter(([,id])=>ID.test(id||'')));
}
async function observeProtection(components,{expected={},sourceSha,request,inactiveDelivery=false}={}){
 const checks=[];
 for(const component of components){
  const script=component==='pages'?'scripts/check-deployment.mjs':`scripts/check-${component}-deployment.mjs`;
  const env={...process.env,CLOUDFLARE_ACCOUNT_ID:DESTINATION_ACCOUNT,EXPECTED_RELEASE_SHA:SHA.test(sourceSha||'')?sourceSha:'',EXPECTED_PAGES_DEPLOYMENT_ID:expected.pages||'',EXPECTED_ADMIN_VERSION:expected.admin||'',EXPECTED_SECURITY_VERSION:expected.security||'',EXPECTED_CATALOGUE_VERSION:expected.catalogue||''};
  const check={component,status:'passed',...(ID.test(expected[component]||'')?{expectedId:expected[component]}:{})};
  try{command(process.execPath,[script,...(component==='pages'?['after']:[])],{env});}
  catch{check.status='failed';check.code='PROTECTION_OBSERVATION_FAILED';}
  check.protectionObservedAt=new Date().toISOString();checks.push(check);
 }
 for(const check of checks){
  try{
   ensure(typeof request==='function','No observation transport.');
   if(check.component==='pages'){
    const observed=await observePages(request,{inactiveDelivery});check.observedId=observed.pages;check.observedSourceSha=observed.sourceSha;if(inactiveDelivery)check.inactiveIngress=observed.inactiveIngress;
   }else check.observedId=currentWorkerVersion(await request(`accounts/${DESTINATION_ACCOUNT}/workers/scripts/customvibe-${check.component}/deployments`));
   if(!check.expectedId||(check.component==='pages'&&!SHA.test(sourceSha||''))){check.status='failed';check.identityCode='FINAL_IDENTITY_UNBOUND';}
   else if(check.observedId!==check.expectedId||(check.component==='pages'&&check.observedSourceSha!==sourceSha)){check.status='failed';check.identityCode='FINAL_IDENTITY_DRIFT';}
   else check.identityStatus='passed';
  }catch{check.status='failed';check.identityCode='FINAL_IDENTITY_OBSERVATION_FAILED';}
  check.identityObservedAt=new Date().toISOString();
 }
 return {status:checks.every(c=>c.status==='passed')?'passed':'failed',observedAt:new Date().toISOString(),...(SHA.test(sourceSha||'')?{expectedSourceSha:sourceSha}:{}),checks};
}
function incompleteState(record){return record.attempts?.length||Object.keys(record.completed||{}).length?'partial':'blocked';}
async function publish(component){
 ensure(component==='pages','Only Pages publication is permitted; Admin uses the unchanged private helper.');
 const record=await readJson(OUTPUT);let attempted=false,failure;
 try{
  const ctx=context({native:true});ensure(ctx.sourceSha===record.sourceSha&&record.planComplete===true&&record.state==='planned','No current complete publication plan.');
  validateMandatoryRecord(record);validatePrerequisites(prerequisiteInput(record));
  const pages=await observePages(undefined,{inactiveDelivery:!!record.build.inactiveDelivery});ensure(pages.pages===record.before.pages&&pages.sourceSha===record.beforePagesSourceSha,'Pages deployment drifted; re-plan.');if(record.build.inactiveDelivery)record.build.inactiveIngress=pages.inactiveIngress;
  await verifyBuild(record);
  command(process.execPath,['scripts/check-deployment.mjs','before']);
  record.attempts??=[];record.attempts.push({component,startedAt:new Date().toISOString(),outcome:'unconfirmed'});await save(record);attempted=true;
  record.pagesUploadEvidence=await officialPagesUpload(await uploadContext(record),{record,onAcknowledgement:async (acknowledgement,{acknowledgementObservedAt})=>{const attempt=record.attempts[0];ensure(!attempt.acknowledgement&&!attempt.acknowledgementObservedAt,'Acknowledgement already captured.');attempt.acknowledgement=acknowledgement;attempt.acknowledgementObservedAt=acknowledgementObservedAt;await save(record);}});
  await save(record);
  validatePrewriteAuthorization(record,runAuthorizationContext(ctx));
  await verifyBuild(record,{afterWrite:true});
  const observed=await observeAcknowledgedPages(createRequest(),{id:record.pagesUploadEvidence.acknowledgement.id,sourceSha:record.sourceSha,beforeId:record.before.pages,beforeSourceSha:record.beforePagesSourceSha,inactiveDelivery:!!record.build.inactiveDelivery});
  record.components.pages={receipt:{account:DESTINATION_ACCOUNT,component:'pages',id:observed.pages,sourceSha:record.sourceSha,sourceDigest:record.sourceDigests.pages,buildDigest:record.build.pages.sha256,origin:'guarded-upload',evidenceUrl:record.workflow.url,observedAt:new Date().toISOString()}};
  record.completed.pages={id:observed.pages};record.attempts.at(-1).outcome='observed';record.state='partial';
 }catch{failure=Error('Pages publication failed.');record.state=incompleteState(record);record.reasons.push('PUBLICATION_FAILED: Upload or observation failed; inspect metadata before retrying.');}
 finally{
  if(attempted){const protection=await observeProtection(['pages'],{expected:expectedIdentities(record,['pages']),sourceSha:record.sourceSha,request:createRequest(),inactiveDelivery:!!record.build.inactiveDelivery});record.attempts.at(-1).protection=protection;if(protection.status!=='passed'){record.state='partial';record.reasons.push('POST_ATTEMPT_GUARD_FAILED: Pages protection/source observation failed.');failure??=Error('Protection failed.');}}
  await save(record);
 }
 if(failure)throw failure;
}
async function finish(){
 const record=await readJson(OUTPUT);let failure;
 try{
  const ctx=context();ensure(record.planComplete===true&&ctx.sourceSha===record.sourceSha&&record.prewriteValidation?.version===2,'Source, matched validation or plan changed.');
  validatePagesUploadEvidence(record.pagesUploadEvidence,{...await uploadContext(record),id:record.completed.pages?.id});
  validatePrewriteAuthorization(record,runAuthorizationContext(ctx));
  await verifyBuild(record,{afterWrite:true});
  const pages=await observePages();ensure(pages.pages===record.completed.pages?.id&&pages.sourceSha===record.sourceSha,'Pages publication is not confirmed.');
  ensure(record.reasons.length===0&&record.attempts?.length===1&&record.attempts[0].outcome==='observed','A failed or unconfirmed attempt remains.');
 }catch{failure=Error('Pages final verification failed.');record.reasons.push('FINAL_VERIFICATION_FAILED: Pages receipt remains incomplete.');}
 finally{
  record.finalProtection=await observeProtection(['pages'],{expected:expectedIdentities(record,['pages']),sourceSha:record.sourceSha,request:createRequest(),inactiveDelivery:!!record.build.inactiveDelivery});record.guards??={};record.guards.protection=record.finalProtection.status;
  if(record.finalProtection.checks.some(c=>c.identityCode))record.reasons.push('FINAL_IDENTITY_FAILED: Final deployment IDs or Pages source do not match validated receipts.');
  if(record.finalProtection.status!=='passed'){record.reasons.push('FINAL_GUARD_FAILED: Pages protection/source check failed.');failure??=Error('Protection failed.');}
  record.guards.publication=failure?'incomplete':'Pages observed; paired verification pending';record.state=incompleteState(record);record.observedAt=new Date().toISOString();await save(record);
 }
 if(failure)throw failure;
}
export function completePair({record,evidence,observed,now=Date.now()}){
 ensure(record.build.sourceSha===record.sourceSha&&record.planComplete===true&&record.reasons.length===0&&record.attempts?.length===1&&record.attempts[0].outcome==='observed','A failed or unconfirmed attempt remains.');
 ensure(COMPONENTS.every(c=>ID.test(record.before[c]||'')),'Full paired verification needs every observed before version.');
 ensure(evidence?.sourceSha===record.sourceSha&&observed.pagesSha===record.sourceSha&&observed.versions.pages===record.completed.pages?.id,'Source/Pages drift detected.');
 validatePagesUploadEvidence(record.pagesUploadEvidence,{sourceSha:record.sourceSha,runId:record.workflow.runId,sourceInputDigest:record.build.sourceInputDigest,compilerConfigDigest:record.build.compiler.compilerConfigDigest,configDigest:record.build.compiler.configDigest,buildDigest:record.build.pages.sha256,assetsDigest:record.build.pages.sha256,id:record.completed.pages.id});
 validatePrewriteAuthorization(record,{repository:REPOSITORY,sourceSha:record.sourceSha,runId:record.githubArtifact?.runId,runAttempt:record.githubArtifact?.runAttempt,now});
 const expected={...record.before,pages:record.completed.pages.id};
 if(record.required.includes('admin'))expected.admin=evidence.receipts?.admin?.id;
 assertUnchanged(expected,observed.versions);
 ensure(!record.required.includes('admin')||canonical(evidence.staged?.rollback)===canonical(record.evidence.staged?.rollback),'Completion changed the original rollback.');
 const prerequisites=validatePrerequisites({...prerequisiteInput(record,evidence),required:COMPONENTS,before:observed.versions,rollbackBefore:record.before,requireStaged:record.required.includes('admin'),now});
 const adminBuild=record.build.private.admin,admin=evidence.receipts?.admin,pages=record.components.pages?.receipt;
 ensure((!record.required.includes('admin')||(admin?.sourceSha===record.sourceSha&&admin.sourceDigest===record.sourceDigests.admin))&&admin?.assetsDigest===record.build.admin.sha256&&admin.runtimeDigest===adminBuild?.runtimeDigest&&admin.configDigest===adminBuild?.configDigest,'Admin source/runtime/config/all-assets closure is incomplete.');
 ensure(pages?.sourceSha===record.sourceSha&&pages.buildDigest===record.build.pages.sha256,'Pages source/build closure is incomplete.');
 const components={pages:{receipt:validateReceipt(pages,{component:'pages',id:observed.versions.pages,sourceDigest:record.sourceDigests.pages,now})},admin:{receipt:validateReceipt(admin,{component:'admin',id:observed.versions.admin,sourceDigest:record.sourceDigests.admin,...adminBuild,now})}};
 for(const c of ['security','catalogue'])components[c]={receipt:prerequisites.components[c].receipt};
 const current=sanitizedEvidence(record.sourceSha,prerequisites);current.receipts.admin=components.admin.receipt;
 return {components,completed:Object.fromEntries(COMPONENTS.map(c=>[c,{id:observed.versions[c]}])),prerequisites,completionEvidence:{version:1,prewriteValidationDigest:record.prewriteValidation.integrityDigest,completedAt:new Date(now).toISOString(),evidence:current}};
}
async function verifyBuild(record,{local=false,afterWrite=false}={}){
 const inactiveDelivery=record.build.inactiveDelivery?inactiveDeliveryInputs(record.baseSha,record.sourceSha,{archivePath:record.archivedRelease?.path}):undefined;
 const presentation=record.build.presentation?presentationInputs(record.baseSha,record.sourceSha,{archivePath:record.archivedRelease?.path}):undefined;
 await releaseArchive(record.archivedRelease,{paths:record.paths,sourceSha:record.sourceSha,baseSha:record.baseSha,presentation,inactiveDelivery});
 ensure(!git('status','--porcelain'),'Release source changed after planning.');
 const configDigest=hash(await readFile('wrangler.jsonc')),lockfileDigest=hash(await readFile('package-lock.json'));
 validateCompilerEvidence(record.build.compiler,{configDigest,lockfileDigest});
 // Local Node24/platform bytes are different provenance. Actual runtime/assets
 // parity is checked below; never relabel the retained GitHub compiler as local.
 ensure(sourceInputs(record.sourceSha)===record.build.sourceInputDigest&&(local||(await compilerConfig()).compilerConfigDigest===record.build.compiler.compilerConfigDigest)&&(await bundleDigest('dist/ssr')).sha256===record.build.ssr.sha256,'Source/compiler/SSR inputs changed.');
 if(inactiveDelivery)ensure(record.activationCompatibility?.basis==='reviewed-inactive-delivery-v1'&&canonical(inactiveDelivery)===canonical(record.build.inactiveDelivery)&&inactiveDelivery.baselineSourceInputDigest===record.build.baselineSourceInputDigest&&inactiveDelivery.sourceInputDigest===record.build.sourceInputDigest,'Inactive Delivery source/protected facts changed.');
 else if(presentation)ensure(record.activationCompatibility?.basis==='reviewed-public-presentation-v1'&&canonical(presentation)===canonical(record.build.presentation)&&presentation.baselineSourceInputDigest===record.build.baselineSourceInputDigest&&presentation.sourceInputDigest===record.build.sourceInputDigest,'Presentation baseline/protected inputs differ.');
 else ensure(!['reviewed-public-presentation-v1','reviewed-inactive-delivery-v1'].includes(record.activationCompatibility?.basis)&&sourceInputs(record.baseSha)===record.build.sourceInputDigest,'Baseline runtime/build inputs differ.');
 if(!afterWrite)validateActivationCompatibility(record.activationCompatibility,compatibilityInput(record));
 ensure((await bundleDigest('dist/client')).sha256===record.build.pages.sha256&&(await bundleDigest('dist/admin')).sha256===record.build.admin.sha256,'Client output changed after planning.');
 for(const c of Object.keys(record.build.private)){
  if(record.build.private[c].inputClosure){const actual=await inactiveCatalogueInputs(),retained=record.build.private[c].inputClosure;ensure(c==='catalogue'&&inactiveDelivery&&Object.keys(actual).filter(k=>!local||k!=='metafileSha256').every(k=>actual[k]===retained[k]),'Catalogue candidate compiler/import closure changed.');}
  if(record.build.private[c].assetManifest){const facts=await adminAssetManifestInputs(),retained=record.build.private[c].assetManifest,keys=ADMIN_INPUT_KEYS.filter(k=>!local||k!=='metafileSha256');ensure(c==='admin'&&keys.every(k=>facts[k]===retained[k]),'Admin candidate compiler input/manifest/assets changed.');}
  ensure((await bundleDigest(`dist/release/private/${c}`,{runtimeOnly:true})).sha256===record.build.private[c].runtimeDigest&&hash(await readFile(`wrangler.${c}.jsonc`))===record.build.private[c].configDigest,'Private comparison bytes/config changed after planning.');
 }
}
async function finishLocal(){
 ensure(process.env.GITHUB_ACTIONS!=='true'&&process.env.CUSTOMVIBE_MIGRATION_SOCKET&&!process.env.CLOUDFLARE_API_TOKEN,'Paired completion requires the unchanged local private helper, never the GitHub Pages credential.');
 const record=await readJson(OUTPUT);let failure,completionInput;
 const request=createRequest({CLOUDFLARE_ACCOUNT_ID:DESTINATION_ACCOUNT,CUSTOMVIBE_MIGRATION_SOCKET:process.env.CUSTOMVIBE_MIGRATION_SOCKET});
 try{
  const ctx=context();ensure(ctx.sourceSha===record.sourceSha&&record.planComplete===true&&record.prewriteValidation?.version===2,'Local source does not match the exact matched workflow source.');
  ensure(record.reasons.length===0&&record.attempts?.length===1&&record.attempts[0].outcome==='observed','An upload remains failed or unconfirmed.');
  const observed=await observeVersions(request);ensure(observed.pagesSha===record.sourceSha&&observed.versions.pages===record.completed.pages?.id,'Pages drifted since its receipt.');
  const evidence=inputEvidence(record.sourceSha);
  record.githubArtifact=validateArtifactHandoff(evidence.githubArtifact,{record,manifestDigest:hash(await readFile(OUTPUT))});
  validatePagesUploadEvidence(record.pagesUploadEvidence,{...await uploadContext(record),id:record.completed.pages?.id});
  validatePrewriteAuthorization(record,{repository:REPOSITORY,sourceSha:ctx.sourceSha,runId:record.githubArtifact.runId,runAttempt:record.githubArtifact.runAttempt});
  await verifyBuild(record,{local:true,afterWrite:true});
  for(const c of COMPONENTS)ensure(fingerprint(record.sourceSha,c)===record.sourceDigests[c],'Recorded source fingerprint differs from exact checkout.');
  const {completionEvidence,...paired}=completePair({record,evidence,observed});Object.assign(record,paired);
  completionInput=evidence;

 }catch{failure=Error('Local paired verification failed.');record.reasons.push('LOCAL_VERIFICATION_FAILED: Source, current versions, full closure or schema evidence is incomplete.');}
 finally{
  record.finalProtection=await observeProtection(COMPONENTS,{expected:expectedIdentities(record,COMPONENTS),sourceSha:record.sourceSha,request,inactiveDelivery:!!record.build.inactiveDelivery});record.guards??={};record.guards.protection=record.finalProtection.status;
  if(record.finalProtection.checks.some(c=>c.identityCode))record.reasons.push('FINAL_IDENTITY_FAILED: Final deployment IDs or Pages source do not match validated receipts.');
  if(record.finalProtection.status!=='passed'){record.reasons.push('FINAL_GUARD_FAILED: One or more local component protections failed.');failure??=Error('Protection failed.');}
  record.finalIdentityReadbacks=record.finalProtection.checks.map(({component,expectedId,observedId,observedSourceSha,identityStatus,identityCode,identityObservedAt})=>Object.fromEntries(Object.entries({component,expectedId,observedId,observedSourceSha,identityStatus,identityCode,identityObservedAt}).filter(([,v])=>v!==undefined)));
  if(!failure){
   try{Object.assign(record,completePair({record,evidence:completionInput,observed:{pagesSha:record.finalProtection.checks.find(c=>c.component==='pages')?.observedSourceSha,versions:Object.fromEntries(record.finalProtection.checks.map(c=>[c.component,c.observedId]))}}));}
   catch{failure=Error('Current completion evidence expired or changed.');record.reasons.push('LOCAL_COMPLETION_EVIDENCE_FAILED: Fresh completion checks failed.');}
  }
  record.guards.publication=failure?'incomplete':'paired versions observed';record.state=failure?incompleteState(record):'verified';record.observedAt=new Date().toISOString();await save(record);
 }
 if(failure)throw failure;
}
async function recoverLocal(inputPath,outputPath){
 ensure(process.env.GITHUB_ACTIONS!=='true'&&process.env.CUSTOMVIBE_MIGRATION_SOCKET&&!process.env.CLOUDFLARE_API_TOKEN,'Recovery is local and read-only.');
 ensure(inputPath&&outputPath&&process.argv.length===5,'Use recover-local INPUT_JSON NEW_OUTPUT_JSON.');
 const destination=resolve(outputPath),out=await open(destination,'wx',0o600);let lease,leaseInode,result;
 try{
  const inputBytes=await readFile(inputPath);ensure(inputBytes.length<100000,'Recovery input is too large.');const input=strictJson(inputBytes.toString('utf8'));
  ensure(exactKeys(input,['version','originalPath','failedPath','adminReceiptPath','zipPath','artifact','evidence','supportStartedAt','verifier'])&&input.version===1,'Unexpected recovery input.');
  const inputs=[];async function member(path,key){ensure(resolve(path)!==destination,'Recovery output overlaps history.');const bytes=await readFile(path);ensure(bytes.length>0&&bytes.length<1024*1024,'Recovery input size invalid.');const value=strictJson(bytes.toString('utf8')),entry={sha256:hash(bytes),canonicalSha256:hash(canonical(value)),bytes:bytes.length,value};recoveryMember(entry,key);inputs.push({path,sha256:hash(bytes)});return entry;}
  const history={original:await member(input.originalPath,'original'),failed:await member(input.failedPath,'failed'),admin:await member(input.adminReceiptPath,'admin'),artifact:input.artifact};
  const zip=await readFile(input.zipPath);ensure(zip.length>0&&zip.length<16*1024*1024&&hash(zip)===PAIRED_RECOVERY_POLICY.zipSha256,'Original ZIP bytes differ.');inputs.push({path:input.zipPath,sha256:hash(zip)},{path:inputPath,sha256:hash(inputBytes)});
  const h=validatePairedRecoveryHistory(history),verifier=recoveryRevision(input.verifier);ensure(process.version===PAIRED_RECOVERY_POLICY.nodeRuntime&&hash(await readFile(process.execPath))===PAIRED_RECOVERY_POLICY.nodeSha256,'Local compiler runtime differs.');
  const verifierRoot=dirname(dirname(fileURLToPath(import.meta.url)));ensure(git('-C',verifierRoot,'rev-parse','HEAD')===verifier.revision&&!git('-C',verifierRoot,'status','--porcelain'),'Verifier checkout must be exact and clean.');
  function currentSource(){ensure(JSON.parse(command('gh',['api','--hostname','github.com',`repos/${REPOSITORY}/git/ref/heads/main`])).object.sha===verifier.revision,'Current main differs from reviewed verifier.');for(const status of ['queued','in_progress','waiting','pending','requested']){const v=JSON.parse(command('gh',['api','--hostname','github.com',`repos/${REPOSITORY}/actions/runs?branch=main&status=${status}&per_page=100`]));ensure(v.total_count===0&&v.workflow_runs.length===0,'Production workflow overlap.');}ensure(git('rev-parse','HEAD')===h.original.sourceSha&&!git('status','--porcelain'),'Deployed source checkout differs.');return {sourceSha:h.original.sourceSha,mainSha:verifier.revision,noActiveProductionRun:true,observedAt:new Date().toISOString()};}
  const firstSource=currentSource();freshTime(input.supportStartedAt,Date.now());ensure(canonical(await installedInputDigest(resolve(PAIRED_RECOVERY_POLICY.compilerRoot)))===canonical(PAIRED_RECOVERY_POLICY.installedInputs),'Local installed compiler inputs differ.');await verifyBuild(h.original,{local:true,afterWrite:true});for(const c of COMPONENTS)ensure(fingerprint(h.original.sourceSha,c)===h.original.sourceDigests[c],'Recovery source fingerprint differs.');ensure(canonical(await schemaSources())===canonical(h.original.schemaSources),'Recovery schema source differs.');
  const leasePath=PAIRED_RECOVERY_POLICY.leasePath;lease=await open(leasePath,'wx',0o600);await lease.writeFile(JSON.stringify({purpose:'read-only paired canonical recovery',at:new Date().toISOString()}));leaseInode=(await lease.stat()).ino;
  const base=createRequest({CLOUDFLARE_ACCOUNT_ID:DESTINATION_ACCOUNT,CUSTOMVIBE_MIGRATION_SOCKET:process.env.CUSTOMVIBE_MIGRATION_SOCKET}),allowed=new Set([`accounts/${DESTINATION_ACCOUNT}/pages/projects/${PAGES_PROJECT}`,...['admin','security','catalogue'].map(c=>`accounts/${DESTINATION_ACCOUNT}/workers/scripts/customvibe-${c}/deployments`)]);let reads=0;
  const request=async(path,method='GET',body)=>{ensure(allowed.has(path)&&method==='GET'&&body===undefined&&++reads<=8,'Recovery permits fixed identity GETs only.');return base(path,'GET');};
  const observed=await observeVersions(request),operational={...h.original,githubArtifact:h.artifact};completePair({record:operational,evidence:input.evidence,observed});
  const expected={...observed.versions};const finalProtection=await observeProtection(COMPONENTS,{expected,sourceSha:h.original.sourceSha,request});
  const finalIdentityReadbacks=finalProtection.checks.map(({component,expectedId,observedId,observedSourceSha,identityStatus,identityCode,identityObservedAt})=>Object.fromEntries(Object.entries({component,expectedId,observedId,observedSourceSha,identityStatus,identityCode,identityObservedAt}).filter(([,v])=>v!==undefined)));
  // Every potentially expensive final read precedes the single completion clock.
  await verifyBuild(h.original,{local:true,afterWrite:true});ensure(canonical(await installedInputDigest(resolve(PAIRED_RECOVERY_POLICY.compilerRoot)))===canonical(PAIRED_RECOVERY_POLICY.installedInputs),'Local installed compiler inputs changed.');const finalSource=currentSource();recoveryRevision(verifier);for(const file of inputs)ensure(hash(await readFile(file.path))===file.sha256,'Immutable recovery input changed.');ensure(hash(await readFile(OUTPUT))===history.failed.sha256,'Failed working manifest changed.');
  await lease.close();ensure((await stat(leasePath)).ino===leaseInode,'Lease ownership changed.');await rm(leasePath);lease=undefined;
  const checkedAt=new Date().toISOString();result=createPairedRecoveryRecord({history,verifier,supportStartedAt:input.supportStartedAt,evidence:input.evidence,finalProtection,finalIdentityReadbacks,sourceChecks:{first:firstSource,final:finalSource},checkedAt});
 }catch{result={kind:'paired-release-recovery-attempt',state:'blocked',reason:'RECOVERY_REJECTED: History, closure, current guards, source or fresh support failed. Original records remain unchanged.'};throw Error('Read-only recovery rejected.');}
 finally{if(lease){await lease.close();const s=await stat(PAIRED_RECOVERY_POLICY.leasePath);ensure(s.ino===leaseInode,'Lease ownership changed.');await rm(PAIRED_RECOVERY_POLICY.leasePath);}try{await out.writeFile(JSON.stringify(result,null,2)+'\n');}finally{await out.close();}}
}

async function main(){
 await mkdir('dist/release',{recursive:true});
 const mode=process.argv[2];
 if(mode==='fingerprints'){const sha=process.argv[3];ensure(SHA.test(sha||''),'Supply an exact SHA.');console.log(JSON.stringify(Object.fromEntries(COMPONENTS.map(c=>[c,fingerprint(sha,c)])),null,2));}
 else if(mode==='private-builds')await privateBuilds();
 else if(mode==='recover-local')await recoverLocal(process.argv[3],process.argv[4]);
 else if(mode==='plan')await plan();else if(mode==='publish')await publish(process.argv[3]);else if(mode==='finish')await finish();else if(mode==='finish-local')await finishLocal();
 else throw Error('Use fingerprints SHA, private-builds, plan, publish pages, finish, or finish-local. Private publication is never automated.');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)main().catch(()=>{console.error('Release stopped. See the sanitized release manifest and the failing check; no credentials are printed.');process.exitCode=1;});
