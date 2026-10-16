import test from 'node:test';import assert from 'node:assert/strict';import {createSubmissionState} from '../src/submission-state.mjs';
test('submission identity and success survive form subscriber unmount/remount',()=>{
 const state=createSubmissionState(),attempt={id:'same-request',message:'draft'};const unsubscribe=state.subscribe(()=>{});state.update({attempt,pending:true});unsubscribe();
 const unmountAgain=state.subscribe(()=>{});assert.equal(state.getSnapshot().attempt,attempt);state.update({result:{ok:true}});unmountAgain();assert.equal(state.getSnapshot().result.ok,true);
});
test('definitive validation rejection allows corrections; ambiguous sends retain identity',()=>{
 const state=createSubmissionState(),attempt={id:'one'};state.update({attempt,pending:true});state.rejected(400,'Invalid');assert.equal(state.getSnapshot().pending,false);assert.equal(state.getSnapshot().attempt,null);
 state.update({attempt,pending:true});state.rejected(503,'Unknown');state.rejected(400,'Invalid');assert.equal(state.getSnapshot().attempt,attempt);assert.equal(state.getSnapshot().pending,true);
});
test('starting another request resets completed submission memory and notifies subscribers',()=>{
 const state=createSubmissionState();let notices=0;state.subscribe(()=>notices++);
 state.update({attempt:{id:'finished'},pending:true,result:{ok:true},uploads:['artwork'],resume:'resume',uncertain:true,manualReview:false});
 assert.equal(typeof state.resetCompleted,'function');assert.equal(state.resetCompleted(),true);
 assert.deepEqual(state.getSnapshot(),{attempt:null,pending:false,busy:false,result:null,error:'',uncertain:false,manualReview:false,uploads:null,resume:null});
 assert.equal(notices,2);
});
test('a failed, uncertain or busy submission cannot be reset as completed',()=>{
 for(const patch of [{attempt:{id:'failed'},pending:true,error:'Retry'},{attempt:{id:'uncertain'},pending:true,uncertain:true},{attempt:{id:'busy'},pending:true,busy:true,result:{ok:true}}]){
  const state=createSubmissionState();state.update(patch);const before=state.getSnapshot();assert.equal(typeof state.resetCompleted,'function');assert.equal(state.resetCompleted(),false);assert.equal(state.getSnapshot(),before);
 }
});
