import test from 'node:test';
import assert from 'node:assert/strict';
import {rehearseRecovery} from './fixtures/recovery-rehearsal.mjs';
test('disposable paired-store restore reconciles hashes, original expiry, missing files and revoked access before serving',async()=>{
 const result=await rehearseRecovery();assert.equal(result.providerRestorePerformed,false);assert.equal(result.dec04,'OPEN');assert.equal(result.invalidFiles.length,2);assert.equal(result.fixture.lostOrders,1);assert.ok(Object.values(result.checks).every(Boolean));
});
test('recovery evidence detects omitted legacy capability invalidation',async()=>{
 await assert.rejects(rehearseRecovery({negativeControl:true}),/legacyCapabilitiesCleared/);
});
