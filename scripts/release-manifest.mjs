// Release metadata only. Never read customer rows, stored login tokens, or secret values.
import {readFile,writeFile,mkdir,readdir,stat,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
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
function command(program,args,{env=process.env}={}){return execFileSync(program,args,{env,encoding:'utf8',maxBuffer:16*1024*1024,stdio:['ignore','pipe','pipe']}).trim();}
function git(...args){return command('git',args);}
// Hash the actual inner multipart File, never a separate prebuild or a rewritten module.
const TOOLING_PATHS=new Set(['.github/workflows/publish.yml','docs/release-process.md','docs/releases/README.md','scripts/check-admin-deployment.mjs','scripts/check-catalogue-deployment.mjs','scripts/check-deployment.mjs','scripts/check-security-deployment.mjs','scripts/release-manifest.mjs','tests/deployment-safety.test.mjs','tests/release-cli.test.mjs','tests/release-manifest.test.mjs']);
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
const ARCHIVE_RECORD_KEYS=['schemaVersion','repository','state','required','completed','reasons','planComplete','sourceSha','workflow','observedAt','baseSha','paths','schemas','beforePagesSourceSha','before','components','sourceDigests','schemaSources','build','activationCompatibility','prerequisites','evidence','guards','attempts','pagesUploadEvidence','githubArtifact','finalProtection','finalIdentityReadbacks','archivedRelease','historicalFunctionsDigest'];
function historicalTime(value){ensure(typeof value==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d[.]\d{3}Z$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString()===value&&Date.parse(value)<=Date.now()+30000,'Invalid historical observation.');return value;}
export function validateReleaseArchiveRecord(record,{sourceSha,candidateSha,baseline}={}){
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
 // Reject payload-bearing or secret/provider diagnostic fields anywhere. Other
 // provenance content is accepted only through the exact reviewed archive hash.
 let nodes=0;function bounded(value){ensure(++nodes<=30000,'Archive metadata is too large.');if(Array.isArray(value)){ensure(value.length<=30000,'Archive array is too large.');for(const item of value)bounded(item);}else if(value&&typeof value==='object'){for(const [key,item]of Object.entries(value)){ensure(!/^(?:token|secret|secret_key|password|customer|body|raw|output|stdout|stderr|formdata|bindings|env_vars|diagnostic|diagnostics|providerresponse|providerdiagnostics)$/i.test(key),'Archive contains raw or private payload fields.');bounded(item);}}else if(typeof value==='string')ensure(value.length<=1000&&!value.includes('/blob/'+candidateSha+'/'),'Archive contains unbounded or self-referential metadata.');else ensure(value===null||typeof value==='boolean'||(typeof value==='number'&&Number.isFinite(value)),'Invalid archive metadata.');}bounded(record);
 return {sourceSha,receiptDigest:hash(canonical(receipts))};
}
async function releaseArchive(proof,{paths,sourceSha,baseSha,baseline}){
 const extra=paths.filter(p=>!TOOLING_PATHS.has(p));if(extra.length===0){ensure(!proof,'Unexpected archive evidence without an archive change.');return undefined;}
 ensure(extra.length===1&&proof&&Object.keys(proof).every(k=>['origin','reviewed','path','sha256','sourceSha','reviewedAgainstSha','receiptDigest'].includes(k))&&proof.origin==='reviewed-complete-release-archive'&&proof.reviewed===true&&proof.path===extra[0]&&/^docs\/releases\/\d{4}-\d\d-\d\d-release-[a-zA-Z0-9_-]{1,64}[.]json$/.test(proof.path)&&DIGEST.test(proof.sha256||'')&&proof.sourceSha===baseSha&&proof.reviewedAgainstSha===sourceSha,'Archive is not an explicitly reviewed historical release record.');
 ensure(git('diff','--name-status',baseSha,sourceSha,'--',proof.path)==='A\t'+proof.path,'An archived record must be a new immutable addition.');
 const entry=git('ls-tree',sourceSha,'--',proof.path),match=/^100644 blob ([a-f0-9]{40})\t(.+)$/.exec(entry);ensure(match&&match[2]===proof.path,'Archive must be a committed regular file.');
 const bytes=await readFile(proof.path);ensure(bytes.length>0&&bytes.length<2*1024*1024&&hash(bytes)===proof.sha256&&createHash('sha1').update(Buffer.concat([Buffer.from('blob '+bytes.length+'\0'),bytes])).digest('hex')===match[1],'Archive bytes differ from the reviewed committed record.');
 const record=JSON.parse(bytes.toString('utf8')),validated=validateReleaseArchiveRecord(record,{sourceSha:baseSha,candidateSha:sourceSha,baseline});
 if(proof.receiptDigest!==undefined)ensure(proof.receiptDigest===validated.receiptDigest,'Archive original receipt binding changed.');
 return {origin:proof.origin,reviewed:true,path:proof.path,sha256:proof.sha256,sourceSha:baseSha,reviewedAgainstSha:sourceSha,receiptDigest:validated.receiptDigest};
}

export function validateActivationCompatibility(value,expected){
 ensure(value?.basis==='source-input-tooling-only-v1'&&value.reviewedAgainstSha===expected.sourceSha&&value.baselineSha===expected.baseSha&&value.baselineSha===expected.beforePagesSourceSha&&value.historicalFunctionsDigest===null,'Initial activation compatibility is not reviewed source-based evidence.');
 ensure(expected.paths.every(p=>TOOLING_PATHS.has(p)||(expected.archivedRelease?.path===p&&expected.archivedRelease.sourceSha===expected.baseSha&&expected.archivedRelease.reviewedAgainstSha===expected.sourceSha&&DIGEST.test(expected.archivedRelease.receiptDigest||'')))&&expected.sourceInputDigest===expected.baselineSourceInputDigest,'Activation changes application/runtime/build inputs.');
 for(const k of ['sourceInputDigest','compilerConfigDigest','configDigest','pagesBuildDigest','adminAssetsDigest'])ensure(DIGEST.test(expected[k]||'')&&value[k]===expected[k],'Activation source/compiler/config/assets comparison differs.');
 return {basis:value.basis,reviewedAgainstSha:value.reviewedAgainstSha,baselineSha:value.baselineSha,observedAt:freshTime(value.observedAt,expected.now??Date.now()),...Object.fromEntries(['sourceInputDigest','compilerConfigDigest','configDigest','pagesBuildDigest','adminAssetsDigest'].map(k=>[k,value[k]])),historicalFunctionsDigest:null,privateSnapshotGap:'Final reads detect drift after the write; no distributed lock or autonomous runtime/schema safety is claimed.'};
}
function sourceInputs(sha){
 const files=git('ls-tree','-r','--name-only',sha).split('\n').filter(p=>/^(src\/|public\/|data\/|server\/|functions\/|admin\/|security\/|catalogue\/|migrations\/|scripts\/|package(-lock)?[.]json$|vite[.]|wrangler.*[.]jsonc$|index[.]html$)/.test(p)&&!TOOLING_PATHS.has(p));
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
export async function officialPagesUpload(expected,{onAcknowledgement=async()=>{}}={}){
 // Disable disk diagnostics before importing Wrangler. Only bounded hashes escape this call.
 process.env.WRANGLER_LOG='none';process.env.WRANGLER_WRITE_LOGS='false';process.env.WRANGLER_SEND_METRICS='false';
 try{
  const {unstable_pages}=await import('wrangler');
  const result=await unstable_pages.deploy({directory:'dist/client',accountId:DESTINATION_ACCOUNT,projectName:PAGES_PROJECT,branch:'main',commitHash:expected.sourceSha,commitDirty:false,functionsDirectory:'functions',bundle:true,sourceMaps:false,args:{config:'wrangler.jsonc'}});
  const acknowledgement=capturePagesAcknowledgement(result.deploymentResponse,expected);
  await onAcknowledgement(acknowledgement);
  return await capturePagesUpload(result,expected);
 }catch{throw Error('Official Pages upload or fingerprint validation failed.');}
}
export function validateArtifactHandoff(value,{record,manifestDigest}){
 ensure(value?.origin==='owner-github-run-artifact'&&value.reviewed===true&&value.sourceSha===record.sourceSha&&value.runId===record.workflow.runId&&value.url===record.workflow.url&&value.artifactName===`release-manifest-${record.workflow.runId}`&&value.runStatus==='completed'&&value.conclusion==='success'&&DIGEST.test(manifestDigest||'')&&value.manifestSha256===manifestDigest,'Downloaded GitHub artifact/run integrity is not reviewed.');
 return {origin:value.origin,reviewed:true,sourceSha:value.sourceSha,runId:value.runId,url:value.url,artifactName:value.artifactName,runStatus:'completed',conclusion:'success',manifestSha256:manifestDigest};
}
async function fileInventory(directory){
 const values=[];async function walk(dir){for(const name of (await readdir(dir)).sort()){const path=resolve(dir,name),s=await stat(path);if(s.isDirectory())await walk(path);else values.push({path:relative(resolve(directory),path),...digestBytes(await readFile(path))});}}await walk(resolve(directory));return safeAssetInventory(values);
}

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
export function validatePrerequisites({required,sourceSha,before,sourceDigests,privateBuild,schemaSources,evidence={},beforePagesSourceSha,now=Date.now(),rollbackBefore=before,requireStaged=required.includes('admin')}){
 ensure(Array.isArray(required)&&required.includes('pages')&&required.every(c=>COMPONENTS.includes(c))&&SHA.test(sourceSha||''),'Invalid release scope.');
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
 const files=git('ls-tree','-r','--name-only',sha).split('\n').filter(path=>privateFiles?privateFiles.includes(path)||path===`wrangler.${component}.jsonc`||/^package(-lock)?[.]json$/.test(path):/^(src\/|public\/|data\/|server\/|scripts\/|functions\/|admin\/|package|vite|wrangler|index[.]html)/.test(path)&&classifyChanges([path],dep).components.includes(component));
 return hash(files.map(path=>`${path}\0${git('rev-parse',`${sha}:${path}`)}`).join('\n'));
}
async function bundleDigest(directory,{runtimeOnly=false}={}){
 const files=[];async function walk(dir){for(const name of (await readdir(dir)).sort()){const path=resolve(dir,name);if((await stat(path)).isDirectory())await walk(path);else if(!runtimeOnly||(!path.endsWith('.map')&&name!=='README.md'))files.push([relative(directory,path),hash(await readFile(path))]);}}
 await walk(resolve(directory));ensure(files.length>0,'Built output is empty.');return {sha256:hash(JSON.stringify(files)),fileCount:files.length};
}
async function privateBuilds(){
 const sourceSha=git('rev-parse','HEAD');const components={};
 for(const component of ['admin','security','catalogue']){
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
 ensure(process.env.GITHUB_EVENT_NAME==='workflow_dispatch','Publication requires explicit manual dispatch.');
 const sourceSha=process.env.REVIEWED_SHA;
 const latest=JSON.parse(command('gh',['api',`repos/${REPOSITORY}/git/ref/heads/main`])).object.sha;
 validateRevision({reviewed:sourceSha,event:process.env.GITHUB_SHA,checkout:git('rev-parse','HEAD'),latest});
 ensure(!git('status','--porcelain'),'Release checkout must be clean.');
 ensure(/^[1-9][0-9]{0,19}$/.test(process.env.GITHUB_RUN_ID||''),'Actual GitHub run ID required.');
 return {sourceSha,repository:REPOSITORY,workflow:{runId:process.env.GITHUB_RUN_ID,url:`https://github.com/${REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`,event:process.env.GITHUB_EVENT_NAME},observedAt:new Date().toISOString()};
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
 const text=process.env.RELEASE_EVIDENCE_JSON||'';ensure(text.length>0&&text.length<100000,'Explicit sanitized evidence input is required.');
 const value=JSON.parse(text);ensure(value&&typeof value==='object'&&!Array.isArray(value)&&value.sourceSha===sourceSha,'Evidence was reviewed for a different source.');return value;
}
async function observePages(request=createRequest()){
 const response=await request(`accounts/${DESTINATION_ACCOUNT}/pages/projects/${PAGES_PROJECT}`);
 const deployment=response?.result?.canonical_deployment;
 ensure(response.success&&deployment?.latest_stage?.status==='success'&&ID.test(deployment.id||'')&&SHA.test(deployment.deployment_trigger?.metadata?.commit_hash||''),'Successful canonical Pages metadata missing.');
 return {pages:deployment.id,sourceSha:deployment.deployment_trigger.metadata.commit_hash};
}
// Poll only read-only canonical metadata while the exact old production pair is
// still visible. This never retries an upload or accepts an unrelated version.
export async function observeAcknowledgedPages(request,{id,sourceSha,beforeId,beforeSourceSha},pause=()=>new Promise(resolve=>setTimeout(resolve,5000))){
 ensure(ID.test(id||'')&&SHA.test(sourceSha||'')&&ID.test(beforeId||'')&&SHA.test(beforeSourceSha||''),'Unbound Pages observation.');
 for(let attempt=0;attempt<24;attempt++){
  const observed=await observePages(request);
  if(observed.pages===id&&observed.sourceSha===sourceSha)return observed;
  ensure(observed.pages===beforeId&&observed.sourceSha===beforeSourceSha,'Canonical Pages changed to another ID/source.');
  if(attempt<23)await pause();
 }
 throw Error('Acknowledged Pages is not successful canonical production.');
}
function prerequisiteInput(record,evidence=record.evidence){return {required:record.required,sourceSha:record.sourceSha,before:record.before,sourceDigests:record.sourceDigests,beforePagesSourceSha:record.beforePagesSourceSha,privateBuild:record.build.private,schemaSources:record.schemaSources,evidence};}
function sanitizedEvidence(sourceSha,prerequisites){
 return {sourceSha,guards:Object.fromEntries(Object.entries(prerequisites.components).filter(([,v])=>v.guard).map(([k,v])=>[k,v.guard])),receipts:Object.fromEntries(Object.entries(prerequisites.components).filter(([,v])=>v.receipt).map(([k,v])=>[k,v.receipt])),schema:Object.fromEntries(Object.entries(prerequisites.schema).filter(([,v])=>v.evidence).map(([k,v])=>[k,v.evidence])),...(prerequisites.staged.evidence?{staged:prerequisites.staged.evidence}:{})};
}
async function plan(){
 let record={schemaVersion:2,repository:REPOSITORY,state:'blocked',required:[],completed:{},reasons:[],planComplete:false};let phase='CONTEXT';
 try{
  ensure(process.env.PUBLISH_ADMIN!=='true','GitHub publication is Pages-only.');
  const ctx=context();record={...record,...ctx};
  phase='GUARDS';command(process.execPath,['scripts/check-deployment.mjs','before']);
  phase='BASELINE';const evidence=inputEvidence(ctx.sourceSha),previous=validateBaseline(evidence.baseline),baseSha=previous.baseSha;
  ensure(evidence.baseline.reviewed===true&&typeof evidence.baseline.evidenceUrl==='string'&&new RegExp('^https://github[.]com/'+REPOSITORY+'/(?:actions/runs/[0-9]+|blob/[a-f0-9]{40}/docs/releases/[a-zA-Z0-9_.-]+[.]json)$').test(evidence.baseline.evidenceUrl),'Baseline needs an explicitly reviewed immutable evidence reference.');
  phase='SCOPE';ensure(git('merge-base',baseSha,ctx.sourceSha)===baseSha,'Baseline must be an ancestor of reviewed main.');
  const paths=git('diff','--name-only',baseSha,ctx.sourceSha).split('\n').filter(Boolean),dep=dependencies(ctx.sourceSha),prior=dependencies(baseSha);
  const classification=classifyChanges(paths,Object.fromEntries(['security','catalogue'].map(c=>[c,[...new Set([...dep[c],...prior[c]])]])));
  phase='ARCHIVE';record.archivedRelease=await releaseArchive(evidence.archivedRelease,{paths,sourceSha:ctx.sourceSha,baseSha,baseline:evidence.baseline});
  phase='VERSIONS';const pages=await observePages();
  record={...record,baseSha,paths,required:classification.components,schemas:classification.schemas,beforePagesSourceSha:pages.sourceSha,before:{pages:pages.pages,...Object.fromEntries(['admin','security','catalogue'].filter(c=>ID.test(evidence.guards?.[c]?.id||'')).map(c=>[c,evidence.guards[c].id]))},components:{},sourceDigests:Object.fromEntries(COMPONENTS.map(c=>[c,fingerprint(ctx.sourceSha,c)])),schemaSources:await schemaSources()};
  phase='BUILD';let comparison={components:{}};
  try{comparison=await readJson('dist/release/private-build-manifest.json');ensure(comparison.sourceSha===ctx.sourceSha,'Comparison build source differs.');
   for(const c of Object.keys(comparison.components)){ensure(['admin','security','catalogue'].includes(c),'Unknown comparison component.');ensure((await bundleDigest(`dist/release/private/${c}`,{runtimeOnly:true})).sha256===comparison.components[c].runtimeDigest&&hash(await readFile(`wrangler.${c}.jsonc`))===comparison.components[c].configDigest,'Comparison bytes/config changed.');}
  }catch{comparison={components:{}};ensure(!record.required.some(c=>['admin','security','catalogue'].includes(c)),'Required private comparison build missing or changed.');}
  record.build={schemaVersion:2,sourceSha:ctx.sourceSha,sourceInputDigest:sourceInputs(ctx.sourceSha),compiler:await compilerConfig(),ssr:await bundleDigest('dist/ssr'),private:comparison.components,pages:await bundleDigest('dist/client'),admin:await bundleDigest('dist/admin')};
  phase='ACTIVATION_COMPATIBILITY';record.activationCompatibility=validateActivationCompatibility(evidence.activationCompatibility,{sourceSha:ctx.sourceSha,baseSha,beforePagesSourceSha:pages.sourceSha,paths,archivedRelease:record.archivedRelease,sourceInputDigest:record.build.sourceInputDigest,baselineSourceInputDigest:sourceInputs(baseSha),compilerConfigDigest:record.build.compiler.compilerConfigDigest,configDigest:record.build.compiler.configDigest,pagesBuildDigest:record.build.pages.sha256,adminAssetsDigest:record.build.admin.sha256});
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
async function observeProtection(components,{expected={},sourceSha,request}={}){
 const checks=[];
 for(const component of components){
  const script=component==='pages'?'scripts/check-deployment.mjs':`scripts/check-${component}-deployment.mjs`;
  const env={...process.env,EXPECTED_RELEASE_SHA:SHA.test(sourceSha||'')?sourceSha:'',EXPECTED_PAGES_DEPLOYMENT_ID:expected.pages||'',EXPECTED_ADMIN_VERSION:expected.admin||'',EXPECTED_SECURITY_VERSION:expected.security||'',EXPECTED_CATALOGUE_VERSION:expected.catalogue||''};
  const check={component,status:'passed',...(ID.test(expected[component]||'')?{expectedId:expected[component]}:{})};
  try{command(process.execPath,[script,...(component==='pages'?['after']:[])],{env});}
  catch{check.status='failed';check.code='PROTECTION_OBSERVATION_FAILED';}
  check.protectionObservedAt=new Date().toISOString();checks.push(check);
 }
 for(const check of checks){
  try{
   ensure(typeof request==='function','No observation transport.');
   if(check.component==='pages'){
    const observed=await observePages(request);check.observedId=observed.pages;check.observedSourceSha=observed.sourceSha;
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
  const ctx=context();ensure(ctx.sourceSha===record.sourceSha&&record.planComplete===true&&record.state==='planned','No current complete publication plan.');
  validatePrerequisites(prerequisiteInput(record));
  ensure((await observePages()).pages===record.before.pages,'Pages deployment drifted; re-plan.');
  await verifyBuild(record);
  command(process.execPath,['scripts/check-deployment.mjs','before']);
  record.attempts??=[];record.attempts.push({component,startedAt:new Date().toISOString(),outcome:'unconfirmed'});await save(record);attempted=true;
  record.pagesUploadEvidence=await officialPagesUpload(await uploadContext(record),{onAcknowledgement:async acknowledgement=>{record.attempts.at(-1).acknowledgement=acknowledgement;await save(record);}});
  await save(record);
  await verifyBuild(record);
  const observed=await observeAcknowledgedPages(createRequest(),{id:record.pagesUploadEvidence.acknowledgement.id,sourceSha:record.sourceSha,beforeId:record.before.pages,beforeSourceSha:record.beforePagesSourceSha});
  record.components.pages={receipt:{account:DESTINATION_ACCOUNT,component:'pages',id:observed.pages,sourceSha:record.sourceSha,sourceDigest:record.sourceDigests.pages,buildDigest:record.build.pages.sha256,origin:'guarded-upload',evidenceUrl:record.workflow.url,observedAt:new Date().toISOString()}};
  record.completed.pages={id:observed.pages};record.attempts.at(-1).outcome='observed';record.state='partial';
 }catch{failure=Error('Pages publication failed.');record.state=incompleteState(record);record.reasons.push('PUBLICATION_FAILED: Upload or observation failed; inspect metadata before retrying.');}
 finally{
  if(attempted){const protection=await observeProtection(['pages'],{expected:expectedIdentities(record,['pages']),sourceSha:record.sourceSha,request:createRequest()});record.attempts.at(-1).protection=protection;if(protection.status!=='passed'){record.state='partial';record.reasons.push('POST_ATTEMPT_GUARD_FAILED: Pages protection/source observation failed.');failure??=Error('Protection failed.');}}
  await save(record);
 }
 if(failure)throw failure;
}
async function finish(){
 const record=await readJson(OUTPUT);let failure;
 try{
  const ctx=context();ensure(record.planComplete===true&&ctx.sourceSha===record.sourceSha,'Source or plan changed.');
  validatePagesUploadEvidence(record.pagesUploadEvidence,{...await uploadContext(record),id:record.completed.pages?.id});
  await verifyBuild(record);
  const pages=await observePages();ensure(pages.pages===record.completed.pages?.id&&pages.sourceSha===record.sourceSha,'Pages publication is not confirmed.');
  validatePrerequisites(prerequisiteInput(record));
  ensure(record.reasons.length===0&&record.attempts?.length===1&&record.attempts[0].outcome==='observed','A failed or unconfirmed attempt remains.');
 }catch{failure=Error('Pages final verification failed.');record.reasons.push('FINAL_VERIFICATION_FAILED: Pages receipt remains incomplete.');}
 finally{
  record.finalProtection=await observeProtection(['pages'],{expected:expectedIdentities(record,['pages']),sourceSha:record.sourceSha,request:createRequest()});record.guards??={};record.guards.protection=record.finalProtection.status;
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
 const expected={...record.before,pages:record.completed.pages.id};
 if(record.required.includes('admin'))expected.admin=evidence.receipts?.admin?.id;
 assertUnchanged(expected,observed.versions);
 const prerequisites=validatePrerequisites({...prerequisiteInput(record,evidence),required:COMPONENTS,before:observed.versions,rollbackBefore:record.before,evidence:{...evidence,staged:record.evidence.staged},requireStaged:record.required.includes('admin'),now});
 const adminBuild=record.build.private.admin,admin=evidence.receipts?.admin,pages=record.components.pages?.receipt;
 ensure((!record.required.includes('admin')||(admin?.sourceSha===record.sourceSha&&admin.sourceDigest===record.sourceDigests.admin))&&admin?.assetsDigest===record.build.admin.sha256&&admin.runtimeDigest===adminBuild?.runtimeDigest&&admin.configDigest===adminBuild?.configDigest,'Admin source/runtime/config/all-assets closure is incomplete.');
 ensure(pages?.sourceSha===record.sourceSha&&pages.buildDigest===record.build.pages.sha256,'Pages source/build closure is incomplete.');
 const components={pages:{receipt:validateReceipt(pages,{component:'pages',id:observed.versions.pages,sourceDigest:record.sourceDigests.pages,now})},admin:{receipt:validateReceipt(admin,{component:'admin',id:observed.versions.admin,sourceDigest:record.sourceDigests.admin,...adminBuild,now})}};
 for(const c of ['security','catalogue'])components[c]={receipt:prerequisites.components[c].receipt};
 return {components,completed:Object.fromEntries(COMPONENTS.map(c=>[c,{id:observed.versions[c]}])),prerequisites};
}
async function verifyBuild(record,{local=false}={}){
 await releaseArchive(record.archivedRelease,{paths:record.paths,sourceSha:record.sourceSha,baseSha:record.baseSha});
 ensure(!git('status','--porcelain'),'Release source changed after planning.');
 const configDigest=hash(await readFile('wrangler.jsonc')),lockfileDigest=hash(await readFile('package-lock.json'));
 validateCompilerEvidence(record.build.compiler,{configDigest,lockfileDigest});
 // Local Node24/platform bytes are different provenance. Actual runtime/assets
 // parity is checked below; never relabel the retained GitHub compiler as local.
 ensure(sourceInputs(record.sourceSha)===record.build.sourceInputDigest&&(local||(await compilerConfig()).compilerConfigDigest===record.build.compiler.compilerConfigDigest)&&(await bundleDigest('dist/ssr')).sha256===record.build.ssr.sha256,'Source/compiler/SSR inputs changed.');
 validateActivationCompatibility(record.activationCompatibility,{sourceSha:record.sourceSha,baseSha:record.baseSha,beforePagesSourceSha:record.beforePagesSourceSha,paths:record.paths,archivedRelease:record.archivedRelease,sourceInputDigest:record.build.sourceInputDigest,baselineSourceInputDigest:sourceInputs(record.baseSha),compilerConfigDigest:record.build.compiler.compilerConfigDigest,configDigest:record.build.compiler.configDigest,pagesBuildDigest:record.build.pages.sha256,adminAssetsDigest:record.build.admin.sha256,...(local?{now:Date.parse(record.activationCompatibility.observedAt)}:{})});
 ensure((await bundleDigest('dist/client')).sha256===record.build.pages.sha256&&(await bundleDigest('dist/admin')).sha256===record.build.admin.sha256,'Client output changed after planning.');
 for(const c of Object.keys(record.build.private)){
  ensure((await bundleDigest(`dist/release/private/${c}`,{runtimeOnly:true})).sha256===record.build.private[c].runtimeDigest&&hash(await readFile(`wrangler.${c}.jsonc`))===record.build.private[c].configDigest,'Private comparison bytes/config changed after planning.');
 }
}
async function finishLocal(){
 ensure(process.env.GITHUB_ACTIONS!=='true'&&process.env.CUSTOMVIBE_MIGRATION_SOCKET&&!process.env.CLOUDFLARE_API_TOKEN,'Paired completion requires the unchanged local private helper, never the GitHub Pages credential.');
 const record=await readJson(OUTPUT);let failure;
 const request=createRequest({CLOUDFLARE_ACCOUNT_ID:DESTINATION_ACCOUNT,CUSTOMVIBE_MIGRATION_SOCKET:process.env.CUSTOMVIBE_MIGRATION_SOCKET});
 try{
  const ctx=context();ensure(ctx.sourceSha===record.sourceSha&&record.planComplete===true,'Local source does not match the exact workflow source.');
  ensure(record.reasons.length===0&&record.attempts?.length===1&&record.attempts[0].outcome==='observed','An upload remains failed or unconfirmed.');
  const observed=await observeVersions(request);ensure(observed.pagesSha===record.sourceSha&&observed.versions.pages===record.completed.pages?.id,'Pages drifted since its receipt.');
  const evidence=inputEvidence(record.sourceSha);
  record.githubArtifact=validateArtifactHandoff(evidence.githubArtifact,{record,manifestDigest:hash(await readFile(OUTPUT))});
  validatePagesUploadEvidence(record.pagesUploadEvidence,{...await uploadContext(record),id:record.completed.pages?.id});
  await verifyBuild(record,{local:true});
  for(const c of COMPONENTS)ensure(fingerprint(record.sourceSha,c)===record.sourceDigests[c],'Recorded source fingerprint differs from exact checkout.');
  Object.assign(record,completePair({record,evidence,observed}));

 }catch{failure=Error('Local paired verification failed.');record.reasons.push('LOCAL_VERIFICATION_FAILED: Source, current versions, full closure or schema evidence is incomplete.');}
 finally{
  record.finalProtection=await observeProtection(COMPONENTS,{expected:expectedIdentities(record,COMPONENTS),sourceSha:record.sourceSha,request});record.guards??={};record.guards.protection=record.finalProtection.status;
  if(record.finalProtection.checks.some(c=>c.identityCode))record.reasons.push('FINAL_IDENTITY_FAILED: Final deployment IDs or Pages source do not match validated receipts.');
  if(record.finalProtection.status!=='passed'){record.reasons.push('FINAL_GUARD_FAILED: One or more local component protections failed.');failure??=Error('Protection failed.');}
  record.finalIdentityReadbacks=record.finalProtection.checks.map(({component,expectedId,observedId,observedSourceSha,identityStatus,identityCode,identityObservedAt})=>Object.fromEntries(Object.entries({component,expectedId,observedId,observedSourceSha,identityStatus,identityCode,identityObservedAt}).filter(([,v])=>v!==undefined)));
  record.guards.publication=failure?'incomplete':'paired versions observed';record.state=failure?incompleteState(record):'verified';record.observedAt=new Date().toISOString();await save(record);
 }
 if(failure)throw failure;
}
async function main(){
 await mkdir('dist/release',{recursive:true});
 const mode=process.argv[2];
 if(mode==='fingerprints'){const sha=process.argv[3];ensure(SHA.test(sha||''),'Supply an exact SHA.');console.log(JSON.stringify(Object.fromEntries(COMPONENTS.map(c=>[c,fingerprint(sha,c)])),null,2));}
 else if(mode==='private-builds')await privateBuilds();
 else if(mode==='plan')await plan();else if(mode==='publish')await publish(process.argv[3]);else if(mode==='finish')await finish();else if(mode==='finish-local')await finishLocal();
 else throw Error('Use fingerprints SHA, private-builds, plan, publish pages, finish, or finish-local. Private publication is never automated.');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)main().catch(()=>{console.error('Release stopped. See the sanitized release manifest and the failing check; no credentials are printed.');process.exitCode=1;});
