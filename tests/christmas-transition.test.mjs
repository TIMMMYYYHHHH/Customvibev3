import test from 'node:test';
import assert from 'node:assert/strict';
import {fadeChristmasChange} from '../src/seasons/christmas/transition.mjs';

test('Christmas fade commits the real page and removes its temporary scope after finishing',async()=>{
 let finish,changed=0;
 const doc={documentElement:{dataset:{}},startViewTransition(update){update();return {ready:Promise.resolve(),finished:new Promise(resolve=>{finish=resolve})}}};
 const done=fadeChristmasChange(()=>changed++,{doc});
 assert.equal(changed,1);
 assert.equal(doc.documentElement.dataset.christmasTransition,'true');
 finish();await done;
 assert.equal(doc.documentElement.dataset.christmasTransition,undefined);
});
test('motion disabled or unsupported browsers switch immediately without a transition scope',async()=>{
 for(const supported of [true,false]){
  let changed=0,captured=0;
  const doc={documentElement:{dataset:{}}};
  if(supported)doc.startViewTransition=()=>{captured++;throw Error('must not run')};
  await fadeChristmasChange(()=>changed++,{doc,motion:!supported});
  assert.equal(changed,1);assert.equal(captured,0);assert.deepEqual(doc.documentElement.dataset,{});
 }
});
test('a cancelled fade cleans up and cannot remove the scope of a newer fade',async()=>{
 const entries=[];
 const doc={documentElement:{dataset:{}},startViewTransition(update){update();let finish;const entry={ready:Promise.resolve(),finished:new Promise(resolve=>{finish=resolve}),skipTransition(){finish()},finish(){finish()}};entries.push(entry);return entry}};
 let changed=0;
 const first=fadeChristmasChange(()=>changed++,{doc});
 const second=fadeChristmasChange(()=>changed++,{doc});
 await first;
 assert.equal(changed,2);assert.equal(doc.documentElement.dataset.christmasTransition,'true');
 entries[1].finish();await second;
 assert.deepEqual(doc.documentElement.dataset,{});
});
test('snapshot failure still applies the requested preference and leaves no scope',async()=>{
 let changed=0;
 const doc={documentElement:{dataset:{}},startViewTransition(){throw Error('unavailable')}};
 await fadeChristmasChange(()=>changed++,{doc});
 assert.equal(changed,1);assert.deepEqual(doc.documentElement.dataset,{});
});
