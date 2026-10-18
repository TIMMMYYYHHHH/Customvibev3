import test from 'node:test';
import assert from 'node:assert/strict';
import {restingFace,faceAt,eyePath} from '../src/seasons/christmas/santa-motion.mjs';
test('Santa wakes and looks into each journey, then winks or sleeps',()=>{
 const asleep=restingFace(false),awake=restingFace(true);
 assert.deepEqual(faceAt(true,0,asleep),asleep);
 const travelling=faceAt(true,.3,asleep);
 assert.equal(travelling.left,1);
 assert.equal(travelling.right,1);
 assert.equal(travelling.turn,1);
 assert.ok(travelling.hat<0);
 assert.equal(faceAt(false,.3,awake).turn,-1);
 assert.deepEqual(faceAt(true,1,asleep),awake);
 assert.deepEqual(faceAt(false,1,awake),asleep);
});
test('reversal starts at the exact live face and all interpolation remains continuous',()=>{
 const interrupted=faceAt(true,.63,restingFace(false));
 assert.deepEqual(faceAt(false,0,interrupted),interrupted);
 for(const on of [true,false]){
  let previous=faceAt(on,0,restingFace(!on));
  for(let i=1;i<=1000;i++){
   const next=faceAt(on,i/1000,restingFace(!on));
   for(const key of Object.keys(next))assert.ok(Math.abs(next[key]-previous[key])<.2);
   assert.ok(next.left>=0&&next.left<=1&&next.right>=0&&next.right<=1);
   previous=next;
  }
 }
 assert.equal((eyePath(440,0).match(/[MCZ]/g)||[]).join(''),(eyePath(440,1).match(/[MCZ]/g)||[]).join(''));
});
