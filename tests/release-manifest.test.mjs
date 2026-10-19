import test from 'node:test';
import assert from 'node:assert/strict';
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
test('partial baseline keeps original comparison SHA',()=>{const base={schemaVersion:1,repository:'TIMMMYYYHHHH/Customvibev3',state:'partial',sourceSha:sha,baseSha:old};assert.equal(validateBaseline(base).baseSha,old);assert.equal(validateBaseline({...base,state:'verified'}).baseSha,sha);assert.throws(()=>validateBaseline({...base,repository:'other/repo'}));});
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
test('workflow keeps immutable checkout, automatic required pairing and always-saved evidence',async()=>{
 const {readFile}=await import('node:fs/promises');const workflow=await readFile(new URL('../.github/workflows/publish.yml',import.meta.url),'utf8');
 assert.match(workflow,/ref: \$\{\{ github.sha \}\}/);assert.match(workflow,/steps.release_plan.outputs.publish_admin == 'true'/);assert.match(workflow,/if: always\(\)/);assert.match(workflow,/group: customvibe-production/);
 assert.doesNotMatch(workflow,/d1 migrations apply|db import|set-password|set-email|content-store/);
});

test('reviewed private-service reuse permits source changes only when emitted runtime AND config are identical',()=>{
 const oldReceipt={...receipt,sourceDigest:'d'.repeat(64),runtimeDigest:'e'.repeat(64),configDigest:'f'.repeat(64)};
 const expected={component:'security',id,sourceDigest:digest,runtimeDigest:'e'.repeat(64),configDigest:'f'.repeat(64)};
 assert.equal(validateReceipt(oldReceipt,expected).sourceDigest,'d'.repeat(64));
 assert.throws(()=>validateReceipt(oldReceipt,{...expected,runtimeDigest:'1'.repeat(64)}));
 assert.throws(()=>validateReceipt(oldReceipt,{...expected,configDigest:'2'.repeat(64)}));
 assert.throws(()=>validateReceipt(oldReceipt,{component:'security',id,sourceDigest:digest}));
});
