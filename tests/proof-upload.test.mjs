import test from 'node:test';import assert from 'node:assert/strict';
import {createProofUpload,submitProofUpload} from '../admin/proof-upload.mjs';
test('interrupted upload and lost publish response reuse immutable identity and completed slots',async()=>{
 const session=await createProofUpload({version:1,rows:[{key:'a',name:'design-01-face-1.jpg',proof:false},{key:'b',name:'design-01-face-2.jpg',proof:false}],draft:{a:{bytes:new Uint8Array([1])},b:{bytes:new Uint8Array([2])}},reusable:[],hash:async()=> 'a'.repeat(64)});
 const ids=[],slots=[];let failed=false,published=false,prepares=0;
 const transport={prepare:async b=>{ids.push(b.requestId);prepares++},upload:async(b,i)=>{ids.push(b.requestId);slots.push(i);if(i===1&&!failed){failed=true;throw Error('Connection lost')}},publish:async b=>{ids.push(b.requestId);if(!published){published=true;throw Error('Success response lost')}return {ok:true}}};
 await assert.rejects(submitProofUpload(session,transport));await assert.rejects(submitProofUpload(session,transport));assert.deepEqual(await submitProofUpload(session,transport),{ok:true});assert.equal(prepares,1);assert.equal(new Set(ids).size,1);assert.deepEqual(slots,[0,1,1]);
});
