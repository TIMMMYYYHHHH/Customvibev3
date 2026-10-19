// Release metadata only. Never read customer rows, stored login tokens, or secret values.
import {readFile,writeFile,mkdir,readdir,stat,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {resolve,relative,dirname,posix} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRequest,DESTINATION_ACCOUNT,PAGES_PROJECT} from './cloudflare-target.mjs';
export const REPOSITORY='TIMMMYYYHHHH/Customvibev3';
const COMPONENTS=['pages','admin','security','catalogue'];
const SHA=/^[a-f0-9]{40}$/,DIGEST=/^[a-f0-9]{64}$/,ID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const OUTPUT='dist/release/release-manifest.json';
const ensure=(condition,message)=>{if(!condition)throw Error(message);};
const hash=value=>createHash('sha256').update(value).digest('hex');
function command(program,args){return execFileSync(program,args,{encoding:'utf8',maxBuffer:16*1024*1024,stdio:['ignore','pipe','pipe']}).trim();}
function git(...args){return command('git',args);}
export function classifyChanges(paths,dependencies={}){
 const components=new Set(['pages']),schemas=new Set();
 for(const path of paths){
  if(/^(docs\/|tests\/|[.]github\/|[^/]+[.]md$|[.]gitignore$)/.test(path))continue;
  if(/^(src\/|public\/|data\/|admin\/|server\/)/.test(path)){
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
export function validateReceipt(receipt,{component,id,sourceDigest,runtimeDigest,configDigest}){
 ensure(receipt?.account===DESTINATION_ACCOUNT&&receipt.component===component,'Receipt account/component mismatch.');
 ensure(ID.test(receipt.id||'')&&receipt.id===id,'Receipt does not match the observed version.');
 ensure(SHA.test(receipt.sourceSha||'')&&DIGEST.test(receipt.sourceDigest||''),'Receipt source fingerprint missing.');
 const unchangedRuntime=DIGEST.test(runtimeDigest||'')&&DIGEST.test(configDigest||'')&&receipt.runtimeDigest===runtimeDigest&&receipt.configDigest===configDigest;
 ensure(receipt.sourceDigest===sourceDigest||unchangedRuntime,'Receipt source fingerprint mismatch without identical emitted runtime and configuration.');
 ensure(receipt.origin==='guarded-upload','Source provenance needs a guarded upload receipt, never a version tag.');
 ensure(new RegExp('^https://github[.]com/'+REPOSITORY+'/(?:actions/runs/[0-9]+(?:/[a-zA-Z0-9_/#?=&.-]*)?|blob/[a-f0-9]{40}/docs/releases/[a-zA-Z0-9_.-]+[.]json)$').test(receipt.evidenceUrl||''),'Upload evidence must reference this repository workflow run or reviewed immutable release record.');
 ensure(Number.isFinite(Date.parse(receipt.observedAt)),'Receipt observation time missing.');
 return Object.fromEntries(['account','component','id','sourceSha','sourceDigest','runtimeDigest','configDigest','origin','evidenceUrl','observedAt'].filter(k=>receipt[k]!==undefined).map(k=>[k,receipt[k]]));
}
export function validateLedger(applied,expected){
 ensure(Array.isArray(applied)&&applied.every(v=>typeof v==='string')&&JSON.stringify([...applied].sort())===JSON.stringify([...expected].sort()),'Applied migration ledger differs from reviewed source; inspect missing or newer migrations.');return [...applied].sort();
}
export function releaseState({required,completed}){return required.every(c=>completed[c]?.id)?'verified':Object.keys(completed).length?'partial':'blocked';}
export function assertUnchanged(expected,current){for(const [component,id] of Object.entries(expected))ensure(current[component]===id,'Current '+component+' deployment changed; re-plan without overwriting it.');}
export function validateBaseline(record){
 ensure(record?.schemaVersion===1&&record.repository===REPOSITORY,'Unrecognized release baseline.');
 ensure(['verified','partial','blocked'].includes(record.state)&&SHA.test(record.sourceSha||'')&&SHA.test(record.baseSha||''),'Baseline source evidence missing.');
 return {...record,baseSha:record.state==='verified'?record.sourceSha:record.baseSha};
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
export async function observeVersions(request=createRequest()){
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
 const files=git('ls-tree','-r','--name-only',sha).split('\n').filter(path=>privateFiles?privateFiles.includes(path)||path===`wrangler.${component}.jsonc`||/^package(-lock)?[.]json$/.test(path):/^(src\/|public\/|data\/|server\/|scripts\/|functions\/|admin\/|package|vite|wrangler|index[.]html)/.test(path)&&classifyChanges([path],dep).components.includes(component));
 return hash(files.map(path=>`${path}\0${git('rev-parse',`${sha}:${path}`)}`).join('\n'));
}
async function bundleDigest(directory,{runtimeOnly=false}={}){
 const files=[];async function walk(dir){for(const name of (await readdir(dir)).sort()){const path=resolve(dir,name);if((await stat(path)).isDirectory())await walk(path);else if(!runtimeOnly||(!path.endsWith('.map')&&name!=='README.md'))files.push([relative(directory,path),hash(await readFile(path))]);}}
 await walk(resolve(directory));ensure(files.length>0,'Built output is empty.');return {sha256:hash(JSON.stringify(files)),fileCount:files.length};
}
async function privateBuilds(){
 const sourceSha=git('rev-parse','HEAD');const components={};
 for(const component of ['security','catalogue']){
  const directory=`dist/release/private/${component}`;
  await rm(directory,{recursive:true,force:true});
  command('npx',['--no-install','wrangler','deploy','--dry-run','--config',`wrangler.${component}.jsonc`,'--outdir',directory]);
  components[component]={runtimeDigest:(await bundleDigest(directory,{runtimeOnly:true})).sha256,configDigest:hash(await readFile(`wrangler.${component}.jsonc`))};
 }
 await writeFile('dist/release/private-build-manifest.json',JSON.stringify({sourceSha,components},null,2)+'\n');
}
async function readJson(path){ensure((await stat(path)).size<2*1024*1024,'Metadata file too large.');return JSON.parse(await readFile(path,'utf8'));}
async function save(record){await mkdir(dirname(OUTPUT),{recursive:true});await writeFile(OUTPUT,JSON.stringify(record,null,2)+'\n');}
function context(){
 ensure(process.env.GITHUB_REPOSITORY===REPOSITORY&&process.env.GITHUB_REF==='refs/heads/main','Release requires the expected repository main branch.');
 const sourceSha=process.env.GITHUB_EVENT_NAME==='workflow_dispatch'?process.env.REVIEWED_SHA:process.env.GITHUB_SHA;
 const latest=JSON.parse(command('gh',['api',`repos/${REPOSITORY}/git/ref/heads/main`])).object.sha;
 validateRevision({reviewed:sourceSha,event:process.env.GITHUB_SHA,checkout:git('rev-parse','HEAD'),latest});
 ensure(!git('status','--porcelain'),'Release checkout must be clean.');
 return {sourceSha,repository:REPOSITORY,workflow:{runId:process.env.GITHUB_RUN_ID,url:`https://github.com/${REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`,event:process.env.GITHUB_EVENT_NAME},observedAt:new Date().toISOString()};
}
async function migrationState(){
 const result={};
 for(const family of ['security','content']){
  const configPath=family==='security'?'wrangler.security.jsonc':'wrangler.catalogue.jsonc';
  const config=await readJson(configPath),db=config.d1_databases[0];
  const names=(await readdir(`migrations/${family}`)).filter(n=>n.endsWith('.sql')).sort();
  const source=await Promise.all(names.map(async name=>({name,sha256:hash(await readFile(`migrations/${family}/${name}`))})));
  // A read-only ledger query. No migration apply, exports or customer columns.
  const raw=JSON.parse(command('npx',['--no-install','wrangler','d1','execute',db.database_name,'--remote','--config',configPath,'--json','--command','SELECT name FROM d1_migrations ORDER BY id']));
  ensure(Array.isArray(raw)&&raw.every(r=>r.success===true),'Migration ledger observation failed.');
  const applied=raw.flatMap(r=>r.results||[]).map(r=>r.name);
  result[family]={databaseId:db.database_id,source,applied:validateLedger(applied,names),checksumEvidence:'source files only; remote ledger has no checksums'};
 }
 return result;
}
async function baseline(){
 if(process.env.RELEASE_EVIDENCE_JSON){const parsed=JSON.parse(process.env.RELEASE_EVIDENCE_JSON);ensure(JSON.stringify(parsed).length<100000,'Release evidence too large.');return validateBaseline(parsed);}
 // Only this protected workflow's artifacts, never an artifact supplied by a PR.
 const runs=JSON.parse(command('gh',['run','list','--repo',REPOSITORY,'--workflow','publish.yml','--branch','main','--limit','20','--json','databaseId']));
 for(const run of runs){
  if(String(run.databaseId)===process.env.GITHUB_RUN_ID)continue;
  try{
   const dir=`dist/release/baselines/${run.databaseId}`;
   command('gh',['run','download',String(run.databaseId),'--repo',REPOSITORY,'--name',`release-manifest-${run.databaseId}`,'--dir',dir]);
   const value=validateBaseline(await readJson(`${dir}/release-manifest.json`));
   ensure(String(value.workflow?.runId)===String(run.databaseId),'Artifact run identity mismatch.');return value;
  }catch{/* An expired/missing artifact is not a valid baseline. Continue bounded search. */}
 }
 throw Error('No trustworthy release baseline artifact. Supply a sanitized bootstrap release record with observed versions and guarded-upload evidence.');
}
async function plan(){
 let record={schemaVersion:1,repository:REPOSITORY,state:'blocked',required:[],completed:{},reasons:[]};
 let phase='CONTEXT';
 try{
  const ctx=context();record={...record,...ctx};
  phase='GUARDS';
  command(process.execPath,['scripts/check-deployment.mjs','before']);
  command(process.execPath,['scripts/check-admin-deployment.mjs']);
  command(process.execPath,['scripts/check-catalogue-deployment.mjs']);
  command(process.execPath,['scripts/check-security-deployment.mjs']);
  phase='BASELINE';
  const previous=await baseline();const baseSha=previous.baseSha;
  phase='SCOPE';
  ensure(git('merge-base',baseSha,ctx.sourceSha)===baseSha,'Release baseline is not an ancestor of reviewed main.');
  const paths=git('diff','--name-only',baseSha,ctx.sourceSha).split('\n').filter(Boolean);
  const dep=dependencies(ctx.sourceSha);const priorDep=dependencies(baseSha);
  const classification=classifyChanges(paths,Object.fromEntries(['security','catalogue'].map(c=>[c,[...new Set([...dep[c],...priorDep[c]])]])));
  if(process.env.PUBLISH_ADMIN==='true'&&!classification.components.includes('admin'))classification.components.push('admin');
  phase='VERSIONS';
  const before=(await observeVersions()).versions;
  phase='SCHEMA';
  const migration=await migrationState();
  record={...record,baseSha,paths,required:classification.components,schemas:classification.schemas,before,components:{},migration,guards:{publication:'pending',gates:'existing guards required',payments:'disabled; runtime acceptance remains separate',customerEmails:'manual only; runtime acceptance remains separate'}};
  phase='BUILD';
  const privateBuild=await readJson('dist/release/private-build-manifest.json');ensure(privateBuild.sourceSha===ctx.sourceSha,'Private runtime comparison was built from a different source revision.');
  for(const component of ['security','catalogue']){ensure((await bundleDigest(`dist/release/private/${component}`,{runtimeOnly:true})).sha256===privateBuild.components[component].runtimeDigest&&hash(await readFile(`wrangler.${component}.jsonc`))===privateBuild.components[component].configDigest,'Private runtime comparison changed after build.');}
  const build={schemaVersion:1,sourceSha:ctx.sourceSha,private:privateBuild.components,pages:await bundleDigest('dist/client'),admin:await bundleDigest('dist/admin')};
  await writeFile('dist/release/build-manifest.json',JSON.stringify(build,null,2)+'\n');record.build=build;
  phase='RECEIPTS';
  for(const component of COMPONENTS){
   const sourceDigest=fingerprint(ctx.sourceSha,component);
   record.components[component]={account:DESTINATION_ACCOUNT,component,desiredSourceSha:ctx.sourceSha,sourceDigest};
   if(['security','catalogue'].includes(component)||!record.required.includes(component)){
    const receipt=validateReceipt(previous.components?.[component]?.receipt,{component,id:record.before[component],sourceDigest,...privateBuild.components[component]});
    if(receipt.sourceDigest!==sourceDigest)record.components[component].compatibility='Identical emitted runtime and configuration; original deployed source retained.';
    record.components[component].receipt=receipt;
    if(record.required.includes(component))record.completed[component]={id:receipt.id,reusedPrerequisite:true};
   }
  }
  record.state='planned';await save(record);
  if(process.env.GITHUB_OUTPUT)await writeFile(process.env.GITHUB_OUTPUT,`publish_admin=${record.required.includes('admin')}\n`,{flag:'a'});
 }catch(error){record.reasons.push(`PLAN_${phase}_FAILED: Planning stopped. Review the recorded stage, baseline and required read permissions.`);await save(record);throw error;}
}
// Every check is read-only and independently attempted. Never serialize caught errors.
async function observeProtection(components){
 const checks=[];
 for(const component of components){
  const script=component==='pages'?'scripts/check-deployment.mjs':`scripts/check-${component}-deployment.mjs`;
  try{command(process.execPath,[script,...(component==='pages'?['after']:[])]);checks.push({component,status:'passed'});}
  catch{checks.push({component,status:'failed',code:'PROTECTION_OBSERVATION_FAILED'});}
 }
 return {status:checks.every(check=>check.status==='passed')?'passed':'failed',observedAt:new Date().toISOString(),checks};
}
function incompleteState(record){return record.attempts?.length||Object.keys(record.completed||{}).length?'partial':'blocked';}
async function publish(component){
 ensure(['pages','admin'].includes(component),'Only existing client publication is automated.');
 const record=await readJson(OUTPUT);
 let attempted=false,failure;
 try{
  const ctx=context();ensure(ctx.sourceSha===record.sourceSha,'Planned source revision changed.');
  ensure(record.required.includes(component)&&['planned','partial'].includes(record.state),'Component is not in this release plan.');
  const expected={...record.before,...Object.fromEntries(Object.entries(record.completed).map(([c,v])=>[c,v.id]))};
  assertUnchanged(expected,(await observeVersions()).versions);
  const bundle=await bundleDigest(component==='pages'?'dist/client':'dist/admin');ensure(bundle.sha256===record.build[component].sha256,'Built output changed after validation.');
  command(process.execPath,[component==='pages'?'scripts/check-deployment.mjs':'scripts/check-admin-deployment.mjs',...(component==='pages'?['before']:[])]);
  const args=component==='pages'?['--no-install','wrangler','pages','deploy','dist/client','--project-name',PAGES_PROJECT,'--branch','main','--commit-hash',record.sourceSha]:['--no-install','wrangler','deploy','--config','wrangler.admin.jsonc'];
  record.attempts??=[];record.attempts.push({component,startedAt:new Date().toISOString(),outcome:'unconfirmed'});await save(record);
  attempted=true;
  const output=command('npx',args);
  // Do not persist provider output: it may contain URLs or configuration details.
  const observed=await observeVersions();
  if(component==='pages')ensure(observed.pagesSha===record.sourceSha,'Canonical Pages source does not match reviewed build.');
  else {const version=output.match(/Current Version ID:\s*([a-f0-9-]{36})/i)?.[1];ensure(version&&version===observed.versions.admin,'Uploaded admin version is not the current observed version.');}
  const unaffected=Object.fromEntries(Object.entries(expected).filter(([c])=>c!==component));assertUnchanged(unaffected,observed.versions);
  record.components[component].receipt={account:DESTINATION_ACCOUNT,component,id:observed.versions[component],sourceSha:record.sourceSha,sourceDigest:record.components[component].sourceDigest,origin:'guarded-upload',evidenceUrl:record.workflow.url,observedAt:new Date().toISOString()};
  record.attempts.at(-1).outcome='observed';
  record.completed[component]={id:observed.versions[component]};record.state='partial';
 }catch(error){
  failure=error;record.state=incompleteState(record);
  record.reasons.push('PUBLICATION_FAILED: Publication or observation failed; inspect provider deployment metadata before retrying.');
 }finally{
  // A rejected command can still have reached Cloudflare. Observe protection even
  // when its acknowledgement or the subsequent version read was lost.
  if(attempted){
   const protection=await observeProtection([component]);record.attempts.at(-1).protection=protection;
   if(protection.status!=='passed'){
    record.state='partial';record.reasons.push('POST_ATTEMPT_GUARD_FAILED: Protection/source observation after the upload attempt failed.');
    failure??=Error('Post-attempt protection observation failed.');
   }
  }
  await save(record);
 }
 if(failure)throw failure;
}
async function finish(){
 const record=await readJson(OUTPUT);let failure;
 try{
  context();assertUnchanged({...record.before,...Object.fromEntries(Object.entries(record.completed).map(([c,v])=>[c,v.id]))},(await observeVersions()).versions);
  for(const component of COMPONENTS)validateReceipt(record.components[component].receipt,{component,id:record.completed[component]?.id||record.before[component],sourceDigest:record.components[component].sourceDigest,...record.build.private[component]});
  const migration=await migrationState();ensure(JSON.stringify(migration)===JSON.stringify(record.migration),'Migration state changed during release.');
  ensure(process.env.RELEASE_PUBLICATION_SUCCEEDED!=='false'&&record.reasons.length===0&&!record.attempts?.some(a=>a.outcome!=='observed'),'A prior publication remains failed or unconfirmed.');
  ensure(releaseState(record)==='verified','Required components remain incomplete.');
 }catch(error){failure=error;record.reasons.push('FINAL_VERIFICATION_FAILED: Release remains incomplete. Inspect recorded versions, receipts and schema.');}
 finally{
  // Best effort across every surface, even if source/version/schema validation
  // failed first. A successful safety read never clears the original failure.
  record.finalProtection=await observeProtection(COMPONENTS);
  record.guards??={};record.guards.protection=record.finalProtection.status;
  if(record.finalProtection.status!=='passed'){
   record.reasons.push('FINAL_GUARD_FAILED: One or more final protection/source observations failed.');
   failure??=Error('Final protection observation failed.');
  }
  record.guards.publication=failure?'incomplete':'passed';
  record.state=failure?incompleteState(record):'verified';record.observedAt=new Date().toISOString();await save(record);
 }
 if(failure)throw failure;
}
async function main(){
 await mkdir('dist/release',{recursive:true});
 const mode=process.argv[2];
 if(mode==='fingerprints'){const sha=process.argv[3];ensure(SHA.test(sha||''),'Supply an exact SHA.');console.log(JSON.stringify(Object.fromEntries(COMPONENTS.map(c=>[c,fingerprint(sha,c)])),null,2));}
 else if(mode==='private-builds')await privateBuilds();
 else if(mode==='plan')await plan();else if(mode==='publish')await publish(process.argv[3]);else if(mode==='finish')await finish();
 else throw Error('Use fingerprints SHA, private-builds, plan, publish pages|admin, or finish. Planning observes metadata but never publishes.');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)main().catch(()=>{console.error('Release stopped. See the sanitized release manifest and the failing check; no credentials are printed.');process.exitCode=1;});
