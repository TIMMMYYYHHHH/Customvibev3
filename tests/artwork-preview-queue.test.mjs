import test from 'node:test';
import assert from 'node:assert/strict';
import {createPreviewQueue} from '../admin/preview-queue.mjs';

test('artwork requests use two slots and queued cancellation never starts a request',async()=>{
 const queue=createPreviewQueue(2);let active=0,peak=0,started=0;const releases=[];
 const task=()=>{started++;active++;peak=Math.max(peak,active);return new Promise(resolve=>releases.push(()=>{active--;resolve('image')}))};
 const a=queue(task),b=queue(task),controller=new AbortController();
 const cancelled=queue(task,controller.signal);const rejected=assert.rejects(cancelled,{name:'AbortError'});controller.abort();
 const c=queue(task);await Promise.resolve();assert.equal(started,2);releases.shift()();await a;await new Promise(resolve=>setImmediate(resolve));assert.equal(started,3);releases.shift()();releases.shift()();await Promise.all([b,c,rejected]);assert.equal(peak,2);
});

test('a failed artwork request frees its slot and is never automatically replayed',async()=>{
 const queue=createPreviewQueue(1);let failures=0;
 const first=queue(async()=>{failures++;throw Error('Unavailable')});const next=queue(async()=>'next');
 await assert.rejects(first,/Unavailable/);assert.equal(await next,'next');assert.equal(failures,1);
});
