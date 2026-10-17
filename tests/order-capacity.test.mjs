import test from 'node:test';
import assert from 'node:assert/strict';
import * as commerce from '../src/commerce.mjs';
test('capacity counts copies as magnets but shares their artwork files',()=>{
 assert.equal(typeof commerce.orderCapacity,'function');
 const capacity=commerce.orderCapacity([{kind:'puzzle',gridSize:5,qty:4}]);
 assert.equal(capacity.magnets,100);assert.equal(capacity.files,26);assert.equal(capacity.allowed,true);
 assert.equal(commerce.orderCapacity([{kind:'puzzle',gridSize:5,qty:5}]).allowed,true);
});
test('capacity includes puzzle proofs and rejects 61 files before upload',()=>{
 assert.equal(typeof commerce.orderCapacity,'function');
 const puzzles=Array.from({length:6},()=>({kind:'puzzle',gridSize:3,qty:1}));
 assert.equal(commerce.orderCapacity(puzzles).files,60);assert.equal(commerce.orderCapacity(puzzles).allowed,true);
 assert.equal(commerce.orderCapacity([...puzzles,{kind:'photo',qty:1}]).allowed,false);
});
test('capacity allows more than 30 entries within artwork limits and includes pack magnets',()=>{
 assert.equal(typeof commerce.orderCapacity,'function');
 const photos=Array.from({length:30},()=>({kind:'photo',qty:1}));
 assert.equal(commerce.orderCapacity(photos).allowed,true);
 assert.equal(commerce.orderCapacity([...photos,{kind:'photo',qty:1}]).allowed,true);
 const content={products:[{id:'alphabet',count:26}]};
 assert.equal(commerce.orderCapacity([{kind:'alphabet',qty:3},{kind:'photo',qty:22}],content).allowed,true);
 assert.equal(commerce.orderCapacity([{kind:'alphabet',qty:3},{kind:'photo',qty:23}],content).allowed,true);
});

test('large repeat quantities use the same file capacity',()=>{
 const capacity=commerce.orderCapacity([{kind:'photo',qty:1000}]);
 assert.equal(capacity.allowed,true);assert.equal(capacity.magnets,1000);assert.equal(capacity.files,1);
});

test('photo entries are bounded by files while file-free collection entries have no fixed cap',()=>{
 const photos=Array.from({length:60},()=>({kind:'photo',qty:1}));
 assert.equal(commerce.orderCapacity(photos).allowed,true);
 assert.equal(commerce.orderCapacity([...photos,{kind:'photo',qty:1}]).allowed,false);
 assert.equal(commerce.orderCapacity(Array.from({length:75},()=>({kind:'alphabet',qty:1}))).allowed,true);
});
