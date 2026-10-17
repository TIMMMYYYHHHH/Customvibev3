import test from 'node:test';
import assert from 'node:assert/strict';
import * as quality from '../src/commerce.mjs';

test('quality uses source crop pixels, not the upscaled print output',()=>{
 assert.equal(typeof quality.cropQuality,'function');
 const result=quality.cropQuality({w:1200,h:600,zoom:2,format:'photo'});
 assert.equal(result.pixels,300);
 assert.equal(result.ppi,101);
 assert.equal(result.level,'low');
});
test('puzzle quality divides the selected crop across the tile grid',()=>{
 assert.equal(typeof quality.cropQuality,'function');
 const photo={w:3000,h:4000,zoom:1,format:'puzzle'};
 assert.equal(quality.cropQuality({...photo,gridSize:3}).level,'good');
 assert.equal(quality.cropQuality({...photo,gridSize:3}).pixels,1000);
 assert.equal(quality.cropQuality({...photo,gridSize:5}).pixels,600);
 assert.equal(quality.cropQuality({...photo,gridSize:5}).level,'soft');
 assert.equal(quality.cropQuality({...photo,gridSize:5,zoom:2}).level,'low');
});
test('rotation and position preserve resolution and threshold rounding cannot hide a warning',()=>{
 assert.equal(typeof quality.cropQuality,'function');
 const photo={w:885,h:2000,zoom:1,format:'photo'};
 assert.equal(quality.cropQuality(photo).level,'soft');
 assert.equal(quality.cropQuality({...photo,w:886}).level,'good');
 assert.deepEqual(quality.cropQuality(photo),quality.cropQuality({...photo,rotation:90,x:0,y:1}));
 assert.equal(quality.cropQuality({...photo,w:442}).level,'low');
 assert.equal(quality.cropQuality({...photo,w:443}).level,'soft');
 assert.equal(quality.cropQuality({}).level,'unknown');
});
