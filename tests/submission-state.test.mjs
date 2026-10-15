import test from 'node:test';import assert from 'node:assert/strict';import {createSubmissionState} from '../src/submission-state.mjs';
test('submission identity and success survive form subscriber unmount/remount',()=>{
 const state=createSubmissionState(),attempt={id:'same-request',message:'draft'};const unsubscribe=state.subscribe(()=>{});state.update({attempt,pending:true});unsubscribe();
 const unmountAgain=state.subscribe(()=>{});assert.equal(state.getSnapshot().attempt,attempt);state.update({result:{ok:true}});unmountAgain();assert.equal(state.getSnapshot().result.ok,true);
});
test('definitive validation rejection allows corrections; ambiguous sends retain identity',()=>{
 const state=createSubmissionState(),attempt={id:'one'};state.update({attempt,pending:true});state.rejected(400,'Invalid');assert.equal(state.getSnapshot().pending,false);assert.equal(state.getSnapshot().attempt,null);
 state.update({attempt,pending:true});state.rejected(503,'Unknown');state.rejected(400,'Invalid');assert.equal(state.getSnapshot().attempt,attempt);assert.equal(state.getSnapshot().pending,true);
});
