import test from 'node:test';
import assert from 'node:assert/strict';
import * as c from '../src/commerce.mjs';

test('bundle price applies to combined photo quantities and rejects invalid counts', () => {
  assert.equal(typeof c.photoPrice, 'function');
  for (const [qty, cents] of [[0,0],[1,5000],[5,25000],[6,25000],[7,29200],[8,33300],[9,37500],[10,40000],[12,48000]]) assert.equal(c.photoPrice(qty),cents);
  assert.throws(()=>c.photoPrice(-1)); assert.throws(()=>c.photoPrice(1.5));
});
test('unknown pack pricing cannot become a misleading complete total', () => {
  assert.equal(typeof c.summarize, 'function');
  assert.deepEqual(c.summarize([{kind:'photo',qty:3},{kind:'photo',qty:3},{kind:'alphabet',qty:1}]),{photoQty:6,puzzleQty:0,pricedQty:6,knownCents:25000,unpriced:true,magnetQty:32});
  assert.equal(c.summarize([{kind:'puzzle',gridSize:3,qty:1}]).unpriced,false);
});
test('crop fills output without blank edges at extremes', () => {
  assert.equal(typeof c.cropRect,'function');
  assert.deepEqual(c.cropRect(1200,800,400,400,1,0.5,0.5),{sx:200,sy:0,sw:800,sh:800});
  const r=c.cropRect(1200,800,1500,300,1,1,1);
  assert.deepEqual(r,{sx:0,sy:560,sw:1200,sh:240});
  assert.throws(()=>c.cropRect(0,800,400,400,1,0,0));
});
test('3 by 3 and 5 by 5 puzzles cover a square crop with distinct square pieces', () => {
 for(const n of [3,5]){
  const tiles=c.puzzleRects({sx:30,sy:60,sw:900,sh:900},n);
  assert.equal(tiles.length,n*n);
  assert.equal(new Set(tiles.map(t=>`${t.sx},${t.sy}`)).size,n*n);
  assert.equal(tiles.reduce((a,t)=>a+t.sw*t.sh,0),810000);
  tiles.forEach((t,i)=>assert.deepEqual(t,{sx:30+(i%n)*900/n,sy:60+Math.floor(i/n)*900/n,sw:900/n,sh:900/n}));
 }
 assert.throws(()=>c.puzzleRects({sx:0,sy:0,sw:900,sh:600},3));
 assert.throws(()=>c.puzzleRects({sx:0,sy:0,sw:900,sh:900},4));
});
test('basket totals count every square in multiple puzzle packs',()=>{
 assert.equal(c.summarize([{kind:'puzzle',gridSize:3,qty:2},{kind:'puzzle',gridSize:5,qty:1}]).magnetQty,43);
});

test('photo tier nudges reflect the actual extra cost at each boundary',()=>{
 assert.equal(c.nextPhotoTier(0),null);
 assert.deepEqual(c.nextPhotoTier(1),{target:6,remaining:5,total:25000,extra:20000,saving:5000});
 assert.deepEqual(c.nextPhotoTier(5),{target:6,remaining:1,total:25000,extra:0,saving:5000});
 assert.deepEqual(c.nextPhotoTier(6),{target:10,remaining:4,total:40000,extra:15000,saving:10000});
 assert.equal(c.nextPhotoTier(9).extra,2500);
 assert.equal(c.nextPhotoTier(10),null);
 assert.equal(c.nextPhotoTier(25),null);
 assert.throws(()=>c.nextPhotoTier(-1));
 assert.throws(()=>c.nextPhotoTier(1.5));
});
test('photo magnets and puzzle pieces share tiers, excluding premade packs',()=>{
 const basket=c.summarize([{kind:'photo',qty:4},{kind:'puzzle',gridSize:3,qty:1}]);
 assert.deepEqual(basket,{photoQty:4,puzzleQty:9,pricedQty:13,knownCents:52000,unpriced:false,magnetQty:13});
 const withPack=c.summarize([{kind:'photo',qty:1},{kind:'puzzle',gridSize:3,qty:1},{kind:'alphabet',qty:1}]);
 assert.equal(withPack.magnetQty,36);assert.equal(withPack.pricedQty,10);assert.equal(withPack.knownCents,40000);assert.equal(withPack.unpriced,true);
 assert.equal(c.nextPhotoTier(withPack.pricedQty),null);
 const puzzle=c.summarize([{kind:'puzzle',gridSize:3,qty:1}]);
 assert.equal(puzzle.knownCents,37500);assert.equal(c.nextPhotoTier(puzzle.pricedQty).remaining,1);
 assert.equal(c.summarize([{kind:'puzzle',gridSize:5,qty:2}]).knownCents,200000);
});
