import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {classifyChanges,validateRevision,validateReceipt,validateLedger,releaseState,rollbackPlan,assertUnchanged,validateBaseline} from '../scripts/release-manifest.mjs';
const sha='a'.repeat(40), old='b'.repeat(40), digest='c'.repeat(64), id='12345678-1234-1234-1234-123456789abc';
const receipt={account:'4f57d4e924674cb87b33d4c884745cf6',component:'security',id,sourceSha:sha,sourceDigest:digest,origin:'guarded-upload',evidenceUrl:'https://github.com/TIMMMYYYHHHH/Customvibev3/actions/runs/123',observedAt:'2026-10-19T00:00:00.000Z'};
test('shared storefront and authentication require paired clients',()=>{for(const path of ['src/App.jsx','public/image.png','server/auth.mjs'])assert.deepEqual(classifyChanges([path]).components,['pages','admin']);});
test('proof isolation and admin changes do not invent private releases',()=>{assert.deepEqual(classifyChanges(['server/proof-api.mjs']).components,['pages']);assert.deepEqual(classifyChanges(['admin/main.jsx']).components,['pages','admin']);});
test('private transitive import changes require service and its clients',()=>{assert.deepEqual(classifyChanges(['server/helper.mjs'],{security:['server/helper.mjs']}).components,['pages','admin','security']);});
test('migration requires schema prerequisite and compatible private service',()=>{const p=classifyChanges(['migrations/security/0010_mail.sql']);assert.deepEqual(p.components,['pages','admin','security']);assert.deepEqual(p.schemas,['security']);});
test('unknown runtime file blocks rather than silently narrowing scope',()=>assert.throws(()=>classifyChanges(['new-backend/worker.mjs']),/Unclassified/));
test('docs retain existing Pages publication without private service requirements',()=>assert.deepEqual(classifyChanges(['docs/note.md','tests/new.test.mjs']).components,['pages']));
test('manual revision must be exact reviewed event, checkout and latest main',()=>{assert.equal(validateRevision({reviewed:sha,event:sha,checkout:sha,latest:sha}),sha);for(const field of ['reviewed','event','checkout','latest'])assert.throws(()=>validateRevision({reviewed:sha,event:sha,checkout:sha,latest:sha,[field]:old}),/revision|SHA/);assert.throws(()=>validateRevision({reviewed:'main',event:sha,checkout:sha,latest:sha}),/SHA/);});
test('receipt needs exact observed version, account, source fingerprint and evidence',()=>{assert.equal(validateReceipt(receipt,{component:'security',id,sourceDigest:digest}).sourceSha,sha);for(const patch of [{account:'wrong'},{id:'wrong'},{sourceDigest:'d'.repeat(64)},{origin:'version-tag'},{evidenceUrl:''},{sourceSha:'main'}])assert.throws(()=>validateReceipt({...receipt,...patch},{component:'security',id,sourceDigest:digest}));});
test('migration ledger rejects missing and unexpectedly newer entries',()=>{assert.deepEqual(validateLedger(['0001.sql'],['0001.sql']),['0001.sql']);assert.throws(()=>validateLedger([],['0001.sql']),/ledger/);assert.throws(()=>validateLedger(['0001.sql','0002.sql'],['0001.sql']),/ledger/);});
test('partial failed upload never becomes verified and before versions survive',()=>{const p={required:['pages','admin'],before:{admin:id},completed:{pages:{id}}};assert.equal(releaseState(p),'partial');assert.equal(p.before.admin,id);assert.equal(releaseState({...p,completed:{pages:{id},admin:{id}}}),'verified');assert.equal(releaseState({...p,completed:{}}),'blocked');});
test('deployment drift aborts before overwriting another release',()=>{assertUnchanged({pages:id},{pages:id});assert.throws(()=>assertUnchanged({pages:id},{pages:'new'}),/changed/);});
test('partial baseline keeps original comparison SHA',()=>{const base={schemaVersion:1,repository:'TIMMMYYYHHHH/Customvibev3',state:'partial',sourceSha:sha,baseSha:old};assert.equal(validateBaseline(base).baseSha,old);assert.throws(()=>validateBaseline({...base,state:'verified'}));assert.throws(()=>validateBaseline({...base,repository:'other/repo'}));});
test('rollback preserves additive schema and attempt history and refuses incompatible backend',()=>{const p=rollbackPlan({current:{pages:id},expected:{pages:id},compatibleBackend:false});assert.deepEqual(p.order,['pages','admin']);assert.equal(p.retainSchema,true);assert.equal(p.retainSendAttemptHistory,true);assert.equal(p.backendRollback,'blocked');assert.throws(()=>rollbackPlan({current:{pages:'new'},expected:{pages:id},compatibleBackend:true}),/changed/);});

test('Worker observation rejects split, empty and failed deployments',async()=>{
 const {currentWorkerVersion}=await import('../scripts/release-manifest.mjs');
 const response={success:true,result:{deployments:[{created_on:'2026-10-19T00:00:00Z',versions:[{version_id:id,percentage:100}]}]}};
 assert.equal(currentWorkerVersion(response),id);
 for(const altered of [{success:false},{success:true,result:{deployments:[]}},{success:true,result:{deployments:[{versions:[{version_id:id,percentage:50}]}]}}])assert.throws(()=>currentWorkerVersion(altered));
});
test('metadata observation retains only current version IDs and public source SHA',async()=>{
 const {observeVersions}=await import('../scripts/release-manifest.mjs');
 const value=await observeVersions(async path=>path.includes('/pages/')?{success:true,result:{canonical_deployment:{id,latest_stage:{status:'success'},deployment_trigger:{metadata:{commit_hash:sha}},env_vars:{SECRET:'never serialize'}}}}:{success:true,result:{deployments:[{created_on:'2026-10-19T00:00:00Z',versions:[{version_id:id,percentage:100}]}]}});
 assert.deepEqual(value,{versions:{pages:id,admin:id,security:id,catalogue:id},pagesSha:sha});assert.ok(!JSON.stringify(value).includes('SECRET'));
});

test('reviewed private-service reuse permits source changes only when emitted runtime AND config are identical',()=>{
 const oldReceipt={...receipt,sourceDigest:'d'.repeat(64),runtimeDigest:'e'.repeat(64),configDigest:'f'.repeat(64)};
 const expected={component:'security',id,sourceDigest:digest,runtimeDigest:'e'.repeat(64),configDigest:'f'.repeat(64)};
 assert.equal(validateReceipt(oldReceipt,expected).sourceDigest,'d'.repeat(64));
 assert.throws(()=>validateReceipt(oldReceipt,{...expected,runtimeDigest:'1'.repeat(64)}));
 assert.throws(()=>validateReceipt(oldReceipt,{...expected,configDigest:'2'.repeat(64)}));
 assert.throws(()=>validateReceipt(oldReceipt,{component:'security',id,sourceDigest:digest}));
});


const now=Date.parse('2026-10-20T01:00:00.000Z');
const fresh='2026-10-20T00:59:00.000Z';
function prerequisiteFixture(required=['pages']){
 const names=['pages','admin','security','catalogue'];
 const before=Object.fromEntries(names.map(c=>[c,id]));
 const sourceDigests=Object.fromEntries(names.map(c=>[c,digest]));
 const privateBuild=Object.fromEntries(names.slice(1).map(c=>[c,{runtimeDigest:'e'.repeat(64),configDigest:'f'.repeat(64)}]));
 const source=[{name:'0001.sql',sha256:digest}];
 const schemaSources=Object.fromEntries(['security','content'].map(c=>[c,{databaseId:id,source}]));
 const evidence={sourceSha:sha,observedAt:fresh,guards:{},receipts:{},schema:{},staged:{reviewedAgainstSha:sha,observedAt:fresh,clientPairCompatibleWithSchema:true,rollback:{pagesId:id,adminId:id,sourceSha:old,pagesBuildDigest:digest,adminAssetsDigest:digest,adminRuntimeDigest:digest,adminConfigDigest:digest}}};
 for(const c of ['admin','security','catalogue']){
  evidence.guards[c]={account:receipt.account,component:c,id,origin:'private-helper-get',candidateSha:sha,observedAt:fresh,protection:'passed'};
  evidence.receipts[c]={...receipt,component:c,observedAt:fresh,runtimeDigest:'e'.repeat(64),configDigest:'f'.repeat(64),assetsDigest:digest};
 }
 for(const family of ['security','content'])evidence.schema[family]={origin:'console-metadata',databaseId:id,reviewedAgainstSha:sha,observedAt:fresh,sourceFiles:structuredClone(source),applied:['0001.sql'],objectsDigest:digest,ddlReviewed:true};
 return {required,sourceSha:sha,before,beforePagesSourceSha:old,sourceDigests,privateBuild,schemaSources,evidence,now};
}
test('Pages-only scope permits unrelated unknown services but cannot become fully verified',async()=>{
 const release=await import('../scripts/release-manifest.mjs');const f=prerequisiteFixture();f.evidence={};
 const result=release.validatePrerequisites(f);
 assert.equal(result.components.catalogue.status,'blocked');assert.equal(result.schema.content.status,'blocked');assert.equal(result.complete,false);
});
test('required private service needs fresh source-bound guard, real closure and schema evidence',async()=>{
 const release=await import('../scripts/release-manifest.mjs');const f=prerequisiteFixture(['pages','admin','security']);
 assert.equal(release.validatePrerequisites(f).components.security.status,'verified');
 for(const mutate of [
  x=>delete x.evidence.receipts.security,
  x=>x.evidence.receipts.security.sourceSha='UNKNOWN',
  x=>delete x.evidence.receipts.security.runtimeDigest,
  x=>x.evidence.guards.security.observedAt='2026-10-19T00:00:00.000Z',
  x=>x.evidence.guards.security.observedAt=1,
  x=>x.evidence.guards.security.observedAt='2026-10-20T01:01:00.000Z',
  x=>x.evidence.guards.security.candidateSha=old,
  x=>x.evidence.guards.security.id='87654321-1234-1234-1234-123456789abc',
  x=>x.evidence.schema.security.applied=[],
  x=>x.evidence.schema.security.objectsDigest='UNKNOWN',
  x=>x.evidence.schema.security.reviewedAgainstSha=old,
  x=>x.evidence.schema.security.sourceFiles[0].sha256='1'.repeat(64),
  x=>delete x.evidence.schema.security,
 ]){const altered=structuredClone(f);mutate(altered);assert.throws(()=>release.validatePrerequisites(altered));}
});
test('shared client scope requires reviewed fresh rollback and Admin before-version evidence',async()=>{
 const release=await import('../scripts/release-manifest.mjs');const f=prerequisiteFixture(['pages','admin']);
 assert.equal(release.validatePrerequisites(f).staged.status,'verified');
 for(const mutate of [x=>delete x.evidence.staged,x=>x.evidence.staged.rollback.adminId='UNKNOWN',x=>x.evidence.staged.rollback.sourceSha='UNKNOWN',x=>x.evidence.staged.rollback.sourceSha=sha,x=>x.evidence.staged.clientPairCompatibleWithSchema=false,x=>x.evidence.staged.observedAt='2026-10-19T00:00:00.000Z',x=>delete x.evidence.guards.admin]){
  const altered=structuredClone(f);mutate(altered);assert.throws(()=>release.validatePrerequisites(altered));
 }
});
test('catalogue changes cannot upload with unknown content schema or catalogue provenance',async()=>{
 const release=await import('../scripts/release-manifest.mjs');const f=prerequisiteFixture(['pages','admin','catalogue']);
 assert.equal(release.validatePrerequisites(f).schema.content.status,'verified');
 for(const mutate of [x=>delete x.evidence.schema.content,x=>delete x.evidence.receipts.catalogue]){const a=structuredClone(f);mutate(a);assert.throws(()=>release.validatePrerequisites(a));}
});

test('fresh active guards and staged rollback retain their own different version identities',async()=>{
 const release=await import('../scripts/release-manifest.mjs');const f=prerequisiteFixture(['pages','admin']);
 f.rollbackBefore={...f.before};f.before.admin='87654321-1234-1234-1234-123456789abc';f.evidence.guards.admin.id=f.before.admin;
 assert.equal(release.validatePrerequisites(f).components.admin.guard.id,'87654321-1234-1234-1234-123456789abc');
});
test('verified baseline cannot be manufactured from source SHA and a state label',()=>{
 assert.throws(()=>validateBaseline({schemaVersion:1,repository:'TIMMMYYYHHHH/Customvibev3',state:'verified',sourceSha:sha,baseSha:old}));
});
test('guarded receipt rejects numeric and future times and retains full asset closure',()=>{
 for(const observedAt of [1,new Date(Date.now()+3600000).toISOString()])assert.throws(()=>validateReceipt({...receipt,observedAt},{component:'security',id,sourceDigest:digest}));
 assert.equal(validateReceipt({...receipt,assetsDigest:digest},{component:'security',id,sourceDigest:digest}).assetsDigest,digest);
});

const canonical=value=>JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
const hash=value=>createHash('sha256').update(value).digest('hex');
function sealAuthorization(record){
 const snapshot=Object.fromEntries(['sourceSha','repository','workflow','runAttempt','planComplete','baseSha','beforePagesSourceSha','before','required','schemas','paths','archivedRelease','sourceDigests','schemaSources','build','activationCompatibility','evidence'].map(k=>[k,record[k]]));
 const stamp={version:1,repository:record.repository,sourceSha:record.sourceSha,runId:record.workflow.runId,runAttempt:record.runAttempt,coordinatorAttempt:1,checkedAt:fresh,invokedAt:fresh,snapshotDigest:hash(canonical(snapshot))};
 record.prewriteValidation={...stamp,integrityDigest:hash(canonical(stamp))};
 Object.assign(record.attempts[0],{component:'pages',startedAt:fresh,invokedAt:fresh,prewriteValidationDigest:record.prewriteValidation.integrityDigest,acknowledgementObservedAt:fresh,acknowledgement:structuredClone(record.pagesUploadEvidence.acknowledgement)});
}
async function completeFixture(){
 const f=prerequisiteFixture(['pages','admin']);const newer='87654321-1234-1234-1234-123456789abc';
 const record={schemaVersion:2,sourceSha:sha,required:['pages','admin'],planComplete:true,before:f.before,beforePagesSourceSha:old,sourceDigests:f.sourceDigests,build:{sourceSha:sha,private:f.privateBuild,pages:{sha256:digest},admin:{sha256:digest}},schemaSources:f.schemaSources,evidence:structuredClone(f.evidence),reasons:[],attempts:[{outcome:'observed'}],completed:{pages:{id:newer}},components:{pages:{receipt:{...receipt,component:'pages',id:newer,buildDigest:digest,observedAt:fresh}}}};
 delete record.evidence.observedAt;delete record.evidence.receipts.admin;
 for(const v of Object.values(record.evidence.schema))v.remoteChecksumEvidence='source checksums only; remote ledger has no checksums';
 const observed={pagesSha:sha,versions:{...f.before,pages:newer,admin:newer}};
 f.evidence.guards.admin.id=newer;f.evidence.receipts.admin.id=newer;
 const upload=await uploadFixture();upload.deploymentResponse.id=newer;record.workflow={runId:'123',url:'https://github.com/TIMMMYYYHHHH/Customvibev3/actions/runs/123'};record.build.sourceInputDigest=digest;record.build.compiler={compilerConfigDigest:digest,configDigest:digest};record.pagesUploadEvidence=await (await import('../scripts/release-manifest.mjs')).capturePagesUpload(upload,upload.expected);
 record.repository='TIMMMYYYHHHH/Customvibev3';record.runAttempt='1';record.workflow.event='workflow_dispatch';record.baseSha=old;record.schemas=[];record.paths=['scripts/release-manifest.mjs'];
 record.activationCompatibility={basis:'source-input-tooling-only-v1',reviewedAgainstSha:sha,baselineSha:old,observedAt:fresh,sourceInputDigest:digest,compilerConfigDigest:digest,configDigest:digest,pagesBuildDigest:digest,adminAssetsDigest:digest,historicalFunctionsDigest:null};
 record.githubArtifact={runId:'123',runAttempt:'1'};sealAuthorization(record);
 return {record,evidence:f.evidence,observed,now};
}
test('local full evidence keeps real private source and binds paired Admin to current complete closure',async()=>{
 const release=await import('../scripts/release-manifest.mjs');const f=await completeFixture();
 f.evidence.receipts.security.sourceSha=old;f.evidence.receipts.security.sourceDigest='1'.repeat(64);
 const value=release.completePair(f);
 assert.equal(value.prerequisites.complete,true);assert.equal(value.components.security.receipt.sourceSha,old);assert.equal(value.completed.admin.id,'87654321-1234-1234-1234-123456789abc');
});
test('local full evidence rejects drift, unknown provenance, altered assets and prior failed attempts',async()=>{
 const release=await import('../scripts/release-manifest.mjs');
 for(const mutate of [x=>x.observed.versions.security='87654321-1234-1234-1234-123456789abc',x=>delete x.evidence.receipts.catalogue,x=>delete x.evidence.schema.content,x=>x.evidence.receipts.admin.assetsDigest='1'.repeat(64),x=>x.evidence.receipts.admin.sourceSha=old,x=>x.evidence.receipts.admin.sourceDigest='1'.repeat(64),x=>x.record.build.sourceSha=old,x=>x.record.attempts[0].outcome='unconfirmed',x=>x.record.reasons.push('PUBLICATION_FAILED'),x=>x.observed.pagesSha=old]){
  const f=await completeFixture();mutate(f);assert.throws(()=>release.completePair(f));
 }
});

test('workflow pins source and keeps current permission and Pages-only publication boundary',async()=>{
 const {readFile}=await import('node:fs/promises');const workflow=await readFile(new URL('../.github/workflows/publish.yml',import.meta.url),'utf8');
 assert.match(workflow,/ref: \$\{\{ github.sha \}\}/);assert.match(workflow,/permissions:\n  contents: read\nconcurrency:/);
 assert.doesNotMatch(workflow,/actions: read|publish admin|check-admin-deployment|check-security-deployment|check-catalogue-deployment|d1 execute|d1 migrations/);
 const validation=await readFile(new URL('../.github/workflows/validate.yml',import.meta.url));assert.equal(hash(validation),'1021fd8f5c961d5e65b49a91e7870c339015f57c5e2b681a44cbaa4d225e2389');assert.match(validation.toString(),/CV_CHECK_BUILT_NOTICES: '1'/);assert.match(workflow,/check-dependency-notices.mjs --outputs --bundles/);
 assert.match(workflow,/group: customvibe-production/);assert.match(workflow,/if: always\(\) && steps.release_plan.outcome == 'success'/);
});

test('proved Pages-only changes can retain an unchanged Admin original source with full real closure',async()=>{
 const release=await import('../scripts/release-manifest.mjs');const f=await completeFixture();
 f.record.required=['pages'];delete f.record.evidence.staged;sealAuthorization(f.record);
 f.observed.versions.admin=id;f.evidence.guards.admin.id=id;f.evidence.receipts.admin.id=id;
 f.evidence.receipts.admin.sourceSha=old;f.evidence.receipts.admin.sourceDigest='1'.repeat(64);
 const value=release.completePair(f);assert.equal(value.components.admin.receipt.sourceSha,old);assert.equal(value.prerequisites.complete,true);
});

async function uploadFixture(){
 const {createHash}=await import('node:crypto');const hash=x=>createHash('sha256').update(x).digest('hex');
 const config=JSON.parse(await (await import('node:fs/promises')).readFile(new URL('../wrangler.jsonc',import.meta.url),'utf8'));
 const metadata={main_module:'functionsWorker-0.123.js',bindings:[...Object.entries(config.env.production.vars).map(([name,text])=>({name,type:'plain_text',text})),...config.env.production.services.map(v=>({name:v.binding,type:'service',service:v.service}))],compatibility_date:config.compatibility_date,compatibility_flags:[],limits:config.limits};
 const module='export default { fetch(){return new Response("'+ 'PRIVATE_CODE_SENTINEL'+'")} };';
 const inner=new FormData();inner.set('metadata',JSON.stringify(metadata));inner.set(metadata.main_module,new File([module],metadata.main_module,{type:'application/javascript+module'}));
 const bytes=await new Response(inner).arrayBuffer();const formData=new FormData();formData.set('_worker.bundle',new File([bytes],'_worker.bundle'));formData.set('branch','main');formData.set('commit_hash',sha);formData.set('commit_dirty','false');formData.set('manifest',JSON.stringify({'/index.html':'a'.repeat(32)}));formData.set('wrangler_config_hash',digest);formData.set('pages_build_output_dir','dist/client');
 formData.set('functions-filepath-routing-config.json',new File(['{"routes":[]}'],'functions-filepath-routing-config.json'));
 for(const name of ['_headers','_redirects','_routes.json'])formData.set(name,new File(['fixture-'+name],name));
 const expected={sourceSha:sha,runId:'123',sourceInputDigest:digest,compilerConfigDigest:digest,configDigest:digest,buildDigest:digest,assetsDigest:digest,config,assetInventory:[{path:'index.html',sha256:digest,bytes:7}],controls:Object.fromEntries(['_headers','_redirects','_routes.json'].map(n=>[n,{sha256:hash('fixture-'+n),bytes:Buffer.byteLength('fixture-'+n)}]))};
 const deploymentResponse={id,environment:'production',created_on:'2026-10-20T00:59:00.000Z',deployment_trigger:{metadata:{commit_hash:sha}},secret:'PRIVATE_PROVIDER_SENTINEL'};
 return {formData,deploymentResponse,expected,module,rawHash:hash(Buffer.from(bytes)),hash};
}
test('actual returned inner File bytes with empty MIME retain exact unnormalized fingerprints and bounded acknowledgement',async()=>{
 const {capturePagesUpload,validatePagesUploadEvidence}=await import('../scripts/release-manifest.mjs');const f=await uploadFixture();
 assert.equal(f.formData.get('_worker.bundle').type,'');const proof=await capturePagesUpload(f,f.expected);
 assert.equal(proof.uploadedBundleDigest,f.rawHash);assert.equal(proof.uploadedModuleInventory[0].sha256,f.hash(f.module));assert.equal(proof.acknowledgement.id,id);
 assert.equal(validatePagesUploadEvidence(proof,{...f.expected,id}).sourceSha,sha);
 assert.doesNotMatch(JSON.stringify(proof),/PRIVATE_|export default|bindings|\.text|formData/);
 const other=await uploadFixture();other.formData.set('_worker.bundle',f.formData.get('_worker.bundle'));other.deploymentResponse={...f.deploymentResponse,secret:'PRIVATE_SENTINEL'};assert.equal((await capturePagesUpload(other,f.expected)).integrityDigest,proof.integrityDigest);
});
test('upload sanitizer rejects unexpected entries, modules, nested config, source, acknowledgement and asset/control substitution',async()=>{
 const {capturePagesUpload}=await import('../scripts/release-manifest.mjs');
 for(const mutate of [f=>f.formData.set('upload_jwt','PRIVATE_SENTINEL'),f=>f.formData.append('branch','main'),f=>f.formData.set('commit_hash',old),f=>f.formData.set('manifest','{"/customer-email@example.com":"bad"}'),f=>f.formData.set('wrangler_config_hash','1'.repeat(64)),f=>f.formData.set('_headers',new File(['changed'],'_headers')),f=>f.deploymentResponse.id='not-id',f=>f.deploymentResponse.environment='preview',f=>f.deploymentResponse.deployment_trigger.metadata.commit_hash=old,f=>f.expected.config.env.production.vars.SITE_GATE_ENABLED='false']){
  const f=await uploadFixture();mutate(f);await assert.rejects(()=>capturePagesUpload(f,f.expected));
 }
});
test('uploaded proof cannot borrow prebuild digest, another run or a changed acknowledgement',async()=>{
 const {capturePagesUpload,validatePagesUploadEvidence}=await import('../scripts/release-manifest.mjs');const f=await uploadFixture(),proof=await capturePagesUpload(f,f.expected);
 for(const mutate of [p=>p.uploadedBundleDigest='e'.repeat(64),p=>p.runId='456',p=>p.sourceSha=old,p=>p.acknowledgement.id='87654321-1234-1234-1234-123456789abc',p=>p.assetInventory.push({path:'PRIVATE_SENTINEL',sha256:digest,bytes:1}),p=>p.private='PRIVATE_SENTINEL']){const p=structuredClone(proof);mutate(p);assert.throws(()=>validatePagesUploadEvidence(p,{...f.expected,id}));}
 assert.throws(()=>validatePagesUploadEvidence(proof,{...f.expected,runId:'456',id}));
});
test('activation compatibility compares actual source inputs and full client assets while retaining historical unknown Functions bytes',async()=>{
 const {validateActivationCompatibility}=await import('../scripts/release-manifest.mjs');const f={sourceSha:sha,baseSha:old,sourceInputDigest:digest,baselineSourceInputDigest:digest,compilerConfigDigest:digest,configDigest:digest,pagesBuildDigest:digest,adminAssetsDigest:digest,beforePagesSourceSha:old,paths:['scripts/release-manifest.mjs'],now};
 const evidence={basis:'source-input-tooling-only-v1',reviewedAgainstSha:sha,baselineSha:old,observedAt:fresh,sourceInputDigest:digest,compilerConfigDigest:digest,configDigest:digest,pagesBuildDigest:digest,adminAssetsDigest:digest,historicalFunctionsDigest:null};
 assert.equal(validateActivationCompatibility(evidence,f).historicalFunctionsDigest,null);
 for(const mutate of [v=>v.paths=['src/App.jsx'],v=>v.baselineSourceInputDigest='e'.repeat(64),v=>v.pagesBuildDigest='e'.repeat(64)]){const v=structuredClone(f);mutate(v);assert.throws(()=>validateActivationCompatibility(evidence,v));}
 for(const patch of [{baselineSha:sha},{historicalFunctionsDigest:digest},{basis:'byte-identical'}, {observedAt:'2026-10-19T00:00:00.000Z'}])assert.throws(()=>validateActivationCompatibility({...evidence,...patch},f));
});
test('workflow activation is manual only and immutable archive cannot recurse through push',async()=>{
 const workflow=await (await import('node:fs/promises')).readFile(new URL('../.github/workflows/publish.yml',import.meta.url),'utf8');assert.doesNotMatch(workflow,/^  push:/m);assert.match(workflow,/workflow_dispatch:/);
});

test('nested Worker metadata/modules and malformed JSON cannot emit private diagnostic payloads',async()=>{
 const {capturePagesUpload}=await import('../scripts/release-manifest.mjs');
 for(const change of [parts=>parts.set('metadata','PRIVATE_CUSTOMER_SENTINEL'),parts=>{const v=JSON.parse(parts.get('metadata'));v.bindings.push({name:'TOKEN',type:'secret_text',text:'PRIVATE_TOKEN_SENTINEL'});parts.set('metadata',JSON.stringify(v));},parts=>parts.set('PRIVATE_MODULE_SENTINEL',new File(['PRIVATE_CODE_SENTINEL'],'PRIVATE_MODULE_SENTINEL'))]){
  const f=await uploadFixture(),raw=Buffer.from(await f.formData.get('_worker.bundle').arrayBuffer()),boundary=raw.subarray(2,raw.indexOf('\r\n')).toString(),parts=await new Response(raw,{headers:{'content-type':'multipart/form-data; boundary='+boundary}}).formData();
  change(parts);f.formData.set('_worker.bundle',new File([await new Response(parts).arrayBuffer()],'_worker.bundle'));
  await assert.rejects(()=>capturePagesUpload(f,f.expected),e=>!e.message.includes('PRIVATE_')&&e.message==='Returned Pages upload fingerprints are invalid.');
 }
});

test('queued acknowledgement waits only for canonical observation and cannot accept another ID at the same source',async()=>{
 const {observeAcknowledgedPages}=await import('../scripts/release-manifest.mjs'),next='87654321-1234-1234-1234-123456789abc';let calls=0,pauses=0;
 const response=(deployment,source)=>({success:true,result:{canonical_deployment:{id:deployment,latest_stage:{status:'success'},deployment_trigger:{metadata:{commit_hash:source}}}}});
 const binding={id:next,sourceSha:sha,beforeId:id,beforeSourceSha:old};
 assert.equal((await observeAcknowledgedPages(async()=>++calls===1?response(id,old):response(next,sha),binding,async()=>pauses++)).pages,next);assert.equal(calls,2);assert.equal(pauses,1);
 await assert.rejects(()=>observeAcknowledgedPages(async()=>response(id,sha),binding,async()=>{}));
 await assert.rejects(()=>observeAcknowledgedPages(async()=>response(id,old),binding,async()=>{}));
});

test('installed compiler inputs exclude generated Vite caches but detect actual dependency edits',async t=>{
 const {installedInputDigest}=await import('../scripts/release-manifest.mjs'),fs=await import('node:fs/promises'),{tmpdir}=await import('node:os'),{join}=await import('node:path');
 const directory=await fs.mkdtemp(join(tmpdir(),'customvibe-compiler-inputs-'));t.after(()=>fs.rm(directory,{recursive:true,force:true}));
 await fs.mkdir(join(directory,'vendor'));await fs.writeFile(join(directory,'vendor/compiler.js'),'installed compiler input');
 const before=await installedInputDigest(directory);
 for(const cache of ['.vite','.vite-temp']){await fs.mkdir(join(directory,cache));await fs.writeFile(join(directory,cache,'generated.js'),'generated output');}
 await fs.mkdir(join(directory,'.mf'));await fs.writeFile(join(directory,'.mf/cf.json'),'generated request metadata');
 assert.deepEqual(await installedInputDigest(directory),before);await fs.writeFile(join(directory,'.mf/actual-compiler.js'),'must remain hashed');assert.notEqual((await installedInputDigest(directory)).sha256,before.sha256);await fs.rm(join(directory,'.mf/actual-compiler.js'));await fs.writeFile(join(directory,'vendor/compiler.js'),'changed actual dependency');assert.notEqual((await installedInputDigest(directory)).sha256,before.sha256);
});


test('historical authorization binds immutable all-four facts while fresh completion uses a separate current review',async()=>{
 const {completePair,validatePrewriteAuthorization}=await import('../scripts/release-manifest.mjs');const f=await completeFixture();
 f.record.required=['pages','admin','security','catalogue'];sealAuthorization(f.record);
 const original=structuredClone(f.record),later=now+1200000;
 for(const v of [...Object.values(f.evidence.guards),...Object.values(f.evidence.schema),f.evidence.staged])v.observedAt=new Date(later-1000).toISOString();
 const done=completePair({...f,now:later});assert.equal(done.prerequisites.complete,true);
 assert.deepEqual(f.record,original);assert.equal(done.completionEvidence.completedAt,new Date(later).toISOString());assert.notEqual(done.completionEvidence.evidence.staged.observedAt,original.evidence.staged.observedAt);
 assert.deepEqual(done.completionEvidence.evidence.staged.rollback,original.evidence.staged.rollback);
 assert.equal(validatePrewriteAuthorization(f.record,{repository:f.record.repository,sourceSha:sha,runId:'123',runAttempt:'1',now:later}).prewriteValidationDigest,f.record.prewriteValidation.integrityDigest);
});
test('prewrite rejects missing, borrowed, tampered and cross-attempt authority including corrected self-hashes',async()=>{
 const {validatePrewriteAuthorization}=await import('../scripts/release-manifest.mjs');
 for(const mutate of [r=>delete r.prewriteValidation,r=>r.prewriteValidation.extra='PRIVATE_SENTINEL',r=>r.prewriteValidation.runAttempt='2',r=>r.prewriteValidation.sourceSha=old,r=>r.before.catalogue='87654321-1234-1234-1234-123456789abc',r=>r.build.pages.sha256='d'.repeat(64),r=>r.evidence.schema.content.applied=[],r=>r.evidence.receipts.security.sourceSha=old,r=>r.required=['pages'],r=>r.evidence.staged.rollback.adminConfigDigest='1'.repeat(64),r=>r.attempts[0].prewriteValidationDigest='e'.repeat(64),r=>r.attempts[0].acknowledgement.id=id,r=>r.attempts[0].invokedAt='2026-10-20T01:01:00.000Z',r=>r.attempts[0].acknowledgementObservedAt='2026-10-20T00:58:00.000Z']){
  const f=await completeFixture();mutate(f.record);assert.throws(()=>validatePrewriteAuthorization(f.record,{repository:f.record.repository,sourceSha:sha,runId:'123',runAttempt:'1',now}));
 }
 const f=await completeFixture();assert.throws(()=>validatePrewriteAuthorization(f.record,{repository:f.record.repository,sourceSha:sha,runId:'123',runAttempt:'2',now}));
 const r=f.record;r.evidence.staged.observedAt='2026-10-20T00:48:00.000Z';sealAuthorization(r);assert.throws(()=>validatePrewriteAuthorization(r,{repository:r.repository,sourceSha:sha,runId:'123',runAttempt:'1',now}));
});
test('current completion cannot reuse old guards or replace original rollback even after valid historical write',async()=>{
 const {completePair}=await import('../scripts/release-manifest.mjs');const f=await completeFixture();assert.throws(()=>completePair({...f,now:now+1200000}));
 for(const v of [...Object.values(f.evidence.guards),...Object.values(f.evidence.schema),f.evidence.staged])v.observedAt=new Date(now+1199000).toISOString();
 f.evidence.staged.rollback.pagesBuildDigest='d'.repeat(64);assert.throws(()=>completePair({...f,now:now+1200000}),/rollback/);
});
test('provider skew never extends the 600-second authorization age and reversed/future clocks reject',async()=>{
 const {validatePrewriteAuthorization}=await import('../scripts/release-manifest.mjs');
 for(const change of ['provider-old','provider-future','runner-future','receipt-reversed','expired-by-one']){
  const f=await completeFixture(),r=f.record;
  if(change==='expired-by-one'){
   for(const v of [...Object.values(r.evidence.guards),...Object.values(r.evidence.schema),r.evidence.staged,r.activationCompatibility])v.observedAt='2026-10-20T00:49:00.000Z';
   r.pagesUploadEvidence.acknowledgement.createdAt='2026-10-20T00:59:00.001Z';
  }else if(change==='provider-old')r.pagesUploadEvidence.acknowledgement.createdAt='2026-10-20T00:58:29.999Z';
  else if(change==='provider-future')r.pagesUploadEvidence.acknowledgement.createdAt='2026-10-20T00:59:30.001Z';
  else if(change==='runner-future')r.attempts[0].acknowledgementObservedAt='2026-10-20T01:00:30.001Z';
  else r.components.pages.receipt.observedAt='2026-10-20T00:58:59.999Z';
  const {integrityDigest,...proof}=r.pagesUploadEvidence;r.pagesUploadEvidence.integrityDigest=hash(canonical(proof));
  sealAuthorization(r);
  if(change==='runner-future')r.attempts[0].acknowledgementObservedAt='2026-10-20T01:00:30.001Z';
  assert.throws(()=>validatePrewriteAuthorization(r,{repository:r.repository,sourceSha:sha,runId:'123',runAttempt:'1',now}));
 }
});
test('genuine committed manual M remains byte exact with null Functions and original backend sources',async()=>{
 const {readFile}=await import('node:fs/promises'),{validateReleaseArchiveRecord}=await import('../scripts/release-manifest.mjs');
 const bytes=await readFile(new URL('../docs/releases/2026-10-20-release-M.json',import.meta.url)),r=JSON.parse(bytes);
 assert.equal(hash(bytes),'56439148a9b85d9b8d410dfc7222ad55e05ed06febefe2c14e050df425d795b2');
 assert.equal(validateReleaseArchiveRecord(r,{sourceSha:r.sourceSha,candidateSha:sha,baseline:r}).sourceSha,r.sourceSha);
 assert.equal(r.pagesUploadEvidence,null);assert.equal(r.historicalFunctionsDigest,null);assert.equal(r.components.security.receipt.sourceSha,'56bfa322eb50f67e4ad23c321f58c4fb98af44c5');
});

// Sanitized public fields retained from PR45 CI; this is not a claimed merged REST retrieval.
function mandatoryFixture(){
 const candidate='4c982eef68f29ffd0c53e8cea04e2f0eac3cda28',head='ea324e2c4ad58c821ee80e623c96d1389b49a3e9',base='409f0f74dcec4385422faf5fff0772021f625169',merge='bc4e80b61dd30338e62f1b922dded516cd250d30',tree='d9ebd59f26e2fea7ef82e5e2831cb66851a5ae1a';
 const repo={full_name:'TIMMMYYYHHHH/Customvibev3',id:1269416306,private:false};
 const checkout='Run actions/checkout@11d5960a326750d5838078e36cf38b85af677262',setup='Run actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020';
 const names=['Set up job',checkout,setup,'Install locked dependencies','Build storefront and server-rendered pages','Build admin and storefront preview','Verify shipped third-party notices','Run local fixture tests','Run Python security-helper fixtures','Post '+setup,'Post '+checkout,'Complete job'];
 const steps=[{"name":"Set up job","status":"completed","conclusion":"success","number":1,"started_at":"2026-10-20T10:01:42Z","completed_at":"2026-10-20T10:01:43Z"},{"name":"Run actions/checkout@11d5960a326750d5838078e36cf38b85af677262","status":"completed","conclusion":"success","number":2,"started_at":"2026-10-20T10:01:43Z","completed_at":"2026-10-20T10:01:48Z"},{"name":"Run actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020","status":"completed","conclusion":"success","number":3,"started_at":"2026-10-20T10:01:48Z","completed_at":"2026-10-20T10:01:49Z"},{"name":"Install locked dependencies","status":"completed","conclusion":"success","number":4,"started_at":"2026-10-20T10:01:49Z","completed_at":"2026-10-20T10:01:56Z"},{"name":"Build storefront and server-rendered pages","status":"completed","conclusion":"success","number":5,"started_at":"2026-10-20T10:01:56Z","completed_at":"2026-10-20T10:02:09Z"},{"name":"Build admin and storefront preview","status":"completed","conclusion":"success","number":6,"started_at":"2026-10-20T10:02:09Z","completed_at":"2026-10-20T10:02:15Z"},{"name":"Verify shipped third-party notices","status":"completed","conclusion":"success","number":7,"started_at":"2026-10-20T10:02:15Z","completed_at":"2026-10-20T10:02:24Z"},{"name":"Run local fixture tests","status":"completed","conclusion":"success","number":8,"started_at":"2026-10-20T10:02:24Z","completed_at":"2026-10-20T10:09:35Z"},{"name":"Run Python security-helper fixtures","status":"completed","conclusion":"success","number":9,"started_at":"2026-10-20T10:09:35Z","completed_at":"2026-10-20T10:09:35Z"},{"name":"Post Run actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020","status":"completed","conclusion":"success","number":17,"started_at":"2026-10-20T10:09:35Z","completed_at":"2026-10-20T10:09:35Z"},{"name":"Post Run actions/checkout@11d5960a326750d5838078e36cf38b85af677262","status":"completed","conclusion":"success","number":18,"started_at":"2026-10-20T10:09:35Z","completed_at":"2026-10-20T10:09:35Z"},{"name":"Complete job","status":"completed","conclusion":"success","number":19,"started_at":"2026-10-20T10:09:35Z","completed_at":"2026-10-20T10:09:35Z"}];
 const run={id:39404961304,run_attempt:1,workflow_id:389570831,path:'.github/workflows/validate.yml',name:'Validate proposed CustomVibe changes',event:'pull_request',head_sha:head,repository:repo,head_repository:repo,pull_requests:[],status:'completed',conclusion:'success',check_suite_id:987,created_at:'2026-10-20T10:01:39Z',run_started_at:'2026-10-20T10:01:42Z',updated_at:'2026-10-20T10:09:38Z',html_url:'https://github.com/TIMMMYYYHHHH/Customvibev3/actions/runs/39404961304'};
 const job={id:118568540207,run_id:run.id,run_attempt:1,head_sha:head,name:'Node 22 build and fixture tests',status:'completed',conclusion:'success',started_at:'2026-10-20T10:01:42Z',completed_at:'2026-10-20T10:09:38Z',steps,url:'https://api.github.com/repos/TIMMMYYYHHHH/Customvibev3/actions/jobs/118568540207',run_url:'https://api.github.com/repos/TIMMMYYYHHHH/Customvibev3/actions/runs/39404961304',html_url:'https://github.com/TIMMMYYYHHHH/Customvibev3/actions/runs/39404961304/job/118568540207',check_run_url:'https://api.github.com/repos/TIMMMYYYHHHH/Customvibev3/check-runs/118568540207'};
 const log=['##[group]Operating System','Ubuntu','##[endgroup]','##[group]'+checkout,'##[endgroup]','##[group]Fetching the repository','[command]/usr/bin/git -c protocol.version=2 fetch --no-tags --prune --no-recurse-submodules --depth=1 origin +'+merge+':refs/remotes/pull/45/merge','##[endgroup]','##[group]Checking out the ref','[command]/usr/bin/git checkout --progress --force refs/remotes/pull/45/merge','##[endgroup]','[command]/usr/bin/git log -1 --format=%H',merge,'##[group]'+setup,'##[endgroup]','node: v22.23.3','##[group]Run npm ci','##[endgroup]','##[group]Run npm test','##[endgroup]','# tests 566','# suites 0','# pass 566','# fail 0','# cancelled 0','# skipped 0','# todo 0','# duration_ms 1','##[group]Run python3 -B -m unittest discover tests/python','##[endgroup]','.......','----------------------------------------------------------------------','Ran 7 tests in 0.001s','','OK','##[group]Post job cleanup.','##[endgroup]'].join('\n');
 const selector={version:1,origin:'owner-selected-github-validation',reviewed:true,repository:repo.full_name,repositoryId:repo.id,candidateSha:candidate,candidateTreeSha:tree,pullRequestNumber:45,prHeadSha:head,prBaseSha:base,checkedMergeSha:merge,checkedTreeSha:tree,workflowId:run.workflow_id,workflowPath:run.path,workflowSha256:'1021fd8f5c961d5e65b49a91e7870c339015f57c5e2b681a44cbaa4d225e2389',runId:run.id,runAttempt:1,jobId:job.id,checkRunId:job.id,checkSuiteId:987,url:run.html_url,nodeVersion:'v22.23.3',nodeTests:566,pythonTests:7,originalJobLogSha256:hash(log),ownerProofSha256:'d'.repeat(64)};
 const check={id:job.id,name:job.name,status:'completed',conclusion:'success',head_sha:head,app:{id:15368},check_suite:{id:987},started_at:job.started_at,completed_at:job.completed_at};
 const facts={workflow:{id:run.workflow_id,path:run.path,state:'active'},run,attempt:structuredClone(run),jobs:{total_count:1,jobs:[job]},check,commit:{sha:merge,tree:{sha:tree},parents:[{sha:base},{sha:head}]},mergedPull:{number:45,merged:true,merge_commit_sha:candidate,head:{sha:head,repo},base:{ref:'main',sha:'f'.repeat(40),repo}},rules:[{type:'required_status_checks',ruleset_id:25416396,parameters:{required_status_checks:[{context:job.name,integration_id:15368}]}}],log,runs:{total_count:1,workflow_runs:[structuredClone(run)]},finalRun:structuredClone(run),finalCheck:structuredClone(check)};
 return {selector,facts,local:{sourceSha:candidate,treeSha:tree,parents:[base,head],workflowSha256:selector.workflowSha256,publisherRuntime:'v22.23.3',compilerRuntime:'v22.23.3'},checkedAt:'2026-10-20T10:10:00.000Z'};
}
test('mandatory validation authenticates empty postmerge associations and exact ordered ancestry',async()=>{
 const {validateMandatoryValidation}=await import('../scripts/release-manifest.mjs');const f=mandatoryFixture();const value=validateMandatoryValidation(f.selector,f.facts,f.local,f.checkedAt);assert.equal(value.candidateSha,f.selector.candidateSha);assert.equal(value.checkoutRef,'refs/remotes/pull/45/merge');assert.equal(value.publisherRuntime,'v22.23.3');assert.equal(value.compilerRuntime,'v22.23.3');assert.ok(!JSON.stringify(value).includes('Ubuntu'));
});
test('mandatory validation rejects independent ancestry, outcome, runtime, chronology and coverage failures',async()=>{
 const {validateMandatoryValidation}=await import('../scripts/release-manifest.mjs');
 const mutations=[f=>f.selector.extra=true,f=>f.selector.prBaseSha='e'.repeat(40),f=>f.local.parents.reverse(),f=>f.facts.commit.parents.reverse(),f=>f.local.treeSha='e'.repeat(40),f=>f.local.publisherRuntime='v22.23.4',f=>f.local.compilerRuntime='v22.23.4',f=>f.local.publisherRuntime='v24.0.0',f=>f.selector.nodeVersion='v22.023.3',f=>f.facts.mergedPull.merge_commit_sha='e'.repeat(40),f=>f.facts.mergedPull.head.sha='e'.repeat(40),f=>f.facts.mergedPull.base.ref='other',f=>f.facts.run.repository.private=true,f=>f.facts.run.event='push',f=>f.facts.run.head_sha=f.selector.checkedMergeSha,f=>f.facts.check.app.id=1,f=>f.facts.check.check_suite.id=1,f=>f.facts.jobs.jobs[0].steps[7].conclusion='skipped',f=>f.facts.jobs.jobs[0].steps.push(f.facts.jobs.jobs[0].steps[7]),f=>f.facts.finalRun.run_attempt=2,f=>f.facts.runs.total_count=2,f=>f.facts.runs.workflow_runs.push({...f.facts.run,id:12,conclusion:'failure'}),f=>f.facts.runs.workflow_runs.push({...f.facts.run,id:12,run_attempt:2,created_at:'2026-10-19T10:00:00Z'}),f=>f.facts.log=f.facts.log.replace('refs/remotes/pull/45/merge','refs/remotes/pull/44/merge'),f=>f.facts.log=f.facts.log.replace('# skipped 0','# skipped 1'),f=>f.facts.log+='\n# tests 566',f=>f.facts.log=f.facts.log.replace('\nOK','\nFAILED'),f=>f.facts.rules=[]];
 for(const mutate of mutations){const f=mandatoryFixture();mutate(f);assert.throws(()=>validateMandatoryValidation(f.selector,f.facts,f.local,f.checkedAt),undefined,mutate.toString());}
});

test('retained premerge associations authenticate their abbreviated same-repository identities',async()=>{
 const {validateMandatoryValidation}=await import('../scripts/release-manifest.mjs'),f=mandatoryFixture(),repo={id:1269416306,name:'Customvibev3',url:'https://api.github.com/repos/TIMMMYYYHHHH/Customvibev3'};
 const association={number:45,head:{sha:f.selector.prHeadSha,repo},base:{ref:'main',sha:f.selector.prBaseSha,repo}};for(const r of [f.facts.run,f.facts.attempt,f.facts.finalRun,f.facts.runs.workflow_runs[0]])r.pull_requests=[structuredClone(association)];assert.equal(validateMandatoryValidation(f.selector,f.facts,f.local,f.checkedAt).pullRequestNumber,45);f.facts.run.pull_requests[0].head.repo.id=1;assert.throws(()=>validateMandatoryValidation(f.selector,f.facts,f.local,f.checkedAt));
});


test('mandatory log parser rejects misplaced checkout commands and malformed canonical summaries independently of selector hashes',async()=>{
 const {parseMandatoryValidationLog}=await import('../scripts/release-manifest.mjs');
 const original=mandatoryFixture().facts.log;
 const selection='[command]/usr/bin/git checkout --progress --force refs/remotes/pull/45/merge';
 const cases=[
  original.replace(selection+'\n','').replace('##[group]Fetching the repository',selection+'\n##[group]Fetching the repository'),
  original.replace('# duration_ms 1','# duration_ms 1.2.3'),
  original.replace('Ran 7 tests in 0.001s','Ran 7 tests in .s'),
  original.replace('##[group]Operating System\nUbuntu\n##[endgroup]','Ubuntu'),
  original.replace('##[group]Fetching the repository','##[group]Unrelated test output'),
  original.replace('##[group]Checking out the ref','##[group]Unrelated test output'),
  original.replace('# pass 566','# pass 565'),
  original.replace('\nOK','\nOK (skipped=1)'),
 ];
 assert.equal(parseMandatoryValidationLog(original).nodeTests,566);
 for(const log of cases)assert.throws(()=>parseMandatoryValidationLog(log));
});


test('same-head run policy inspects complete chronology rather than only count or green status',async()=>{
 const {validateMandatoryValidation}=await import('../scripts/release-manifest.mjs');
 const original=mandatoryFixture(),older={...structuredClone(original.facts.run),id:39404960000,created_at:'2026-10-20T10:00:00Z',run_started_at:'2026-10-20T10:01:00Z',updated_at:'2026-10-20T10:01:30Z',pull_requests:[]};
 function withRun(other){const f=mandatoryFixture();f.facts.runs.workflow_runs.push(other);f.facts.runs.total_count=2;return f;}
 const good=withRun(older);assert.equal(validateMandatoryValidation(good.selector,good.facts,good.local,good.checkedAt).run.id,39404961304);
 const alternatives=[
  {...older,created_at:'2026-10-20T10:01:39Z',run_started_at:'2026-10-20T10:01:40Z',updated_at:'2026-10-20T10:01:41Z'},
  {...older,run_attempt:2}, {...older,run_started_at:null}, {...older,updated_at:'2026-10-20T10:01:42Z'}, {...older,updated_at:'2026-10-20T10:00:59Z'},
  ...['failure','cancelled',null].map(conclusion=>({...older,created_at:'2026-10-20T10:10:00Z',run_started_at:'2026-10-20T10:10:01Z',updated_at:'2026-10-20T10:10:02Z',conclusion,status:conclusion?'completed':'queued'})),
 ];
 for(const other of alternatives){const f=withRun(other);assert.throws(()=>validateMandatoryValidation(f.selector,f.facts,f.local,f.checkedAt));}
});
test('mandatory validation independently rejects remaining identity, source, step and outcome mismatches',async()=>{
 const {validateMandatoryValidation}=await import('../scripts/release-manifest.mjs');
 const mutations=[f=>f.selector.repositoryId=1,f=>f.selector.workflowSha256='e'.repeat(64),f=>f.local.sourceSha='e'.repeat(40),f=>f.local.workflowSha256='e'.repeat(64),f=>f.local.parents.push('e'.repeat(40)),f=>f.facts.run.repository.id=1,f=>f.facts.run.repository.full_name='other/repo',f=>f.facts.run.head_repository.id=1,f=>f.facts.workflow.path='other.yml',f=>f.facts.workflow.state='disabled_manually',f=>f.facts.run.workflow_id=1,f=>f.facts.run.path='other.yml',f=>f.facts.run.id=1,f=>f.facts.run.check_suite_id=1,f=>f.facts.jobs.jobs[0].run_attempt=2,f=>f.facts.jobs.jobs[0].head_sha='e'.repeat(40),f=>f.facts.jobs.jobs[0].check_run_url='https://api.github.com/repos/other/repo/check-runs/1',f=>f.facts.jobs.jobs[0].steps[4].number=10,f=>f.facts.jobs.jobs[0].steps[4].started_at='2026-10-20T10:01:00Z',f=>f.facts.jobs.jobs[0].steps[4].conclusion='neutral',f=>f.facts.check.head_sha='e'.repeat(40),f=>f.facts.commit.parents.pop(),f=>f.facts.commit.parents[0].sha='e'.repeat(40),f=>f.facts.mergedPull.head.repo.private=true,f=>f.facts.mergedPull.base.repo.id=1,f=>f.facts.rules[0].parameters.required_status_checks[0].integration_id=1];
 for(const mutate of mutations){const f=mandatoryFixture();mutate(f);assert.throws(()=>validateMandatoryValidation(f.selector,f.facts,f.local,f.checkedAt));}
});

test('official job URLs must independently bind exact repository run and selected job',async()=>{
 const {validateMandatoryValidation}=await import('../scripts/release-manifest.mjs');
 for(const [key,value]of [['url','https://api.github.com/repos/other/repo/actions/jobs/118568540207'],['run_url','https://api.github.com/repos/TIMMMYYYHHHH/Customvibev3/actions/runs/1'],['html_url','https://github.com/TIMMMYYYHHHH/Customvibev3/actions/runs/39404961304/job/1']]){const f=mandatoryFixture();f.facts.jobs.jobs[0][key]=value;assert.throws(()=>validateMandatoryValidation(f.selector,f.facts,f.local,f.checkedAt));}
});
