import test from 'node:test';
import assert from 'node:assert/strict';
import {ARTWORK_LIMITS as limits} from '../src/artwork-policy.mjs';
test('approved capacity increases preserve per-order and retention protections',()=>{
 assert.equal(limits.retainedBytes,2000000000);assert.equal(limits.dailyBytes,500000000);assert.equal(limits.monthlyBytes,5000000000);assert.equal(limits.monthlyOperations,100000);
 assert.equal(limits.files,60);assert.equal(limits.fileBytes,4000000);assert.equal(limits.requestBytes,32000000);assert.equal(limits.retentionSeconds,14*86400);assert.equal(limits.dailyRequests,20);assert.equal(limits.monthlyRequests,400);
});
