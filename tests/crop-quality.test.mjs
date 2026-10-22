import test from 'node:test';
import assert from 'node:assert/strict';
import * as quality from '../src/commerce.mjs';
import {build} from 'esbuild';
import {createRequire} from 'node:module';

test('quality uses source crop pixels, not the upscaled print output',()=>{
 assert.equal(typeof quality.cropQuality,'function');
 const result=quality.cropQuality({w:1200,h:600,zoom:2,format:'photo'});
 assert.equal(result.pixels,300);
 assert.equal(result.ppi,120);
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
 const photo={w:749,h:2000,zoom:1,format:'photo'};
 assert.equal(quality.cropQuality(photo).level,'soft');
 assert.equal(quality.cropQuality({...photo,w:750}).level,'good');
 assert.deepEqual(quality.cropQuality(photo),quality.cropQuality({...photo,rotation:90,x:0,y:1}));
 assert.equal(quality.cropQuality({...photo,w:374}).level,'low');
 assert.equal(quality.cropQuality({...photo,w:375}).level,'soft');
 assert.equal(quality.cropQuality({}).level,'unknown');
});
test('zoom and each puzzle grid retain the independently calculated 300 and 150 ppi boundaries',()=>{
 for(const [format,gridSize,zoom] of [['photo',1,2],['puzzle',3,1],['puzzle',5,1],['puzzle',3,2],['puzzle',5,2]]){
  for(const [tilePixels,level,ppi] of [[749,'soft',299],[750,'good',300],[374,'low',149],[375,'soft',150]]){
   const edge=tilePixels*gridSize*zoom;
   const result=quality.cropQuality({w:edge,h:edge,format,gridSize,zoom});
   assert.equal(result.pixels,tilePixels,`${format} ${gridSize} zoom ${zoom}`);
   assert.equal(result.ppi,ppi);
   assert.equal(result.level,level);
  }
 }
 assert.equal(quality.cropQuality({w:1200,h:1200,format:'photo'}).ppi,480);
});
test('help presents exact puzzle dimensions and source guidance for the finished face',async()=>{
 const built=await build({entryPoints:['src/HelpContent.jsx'],bundle:true,write:false,format:'cjs',platform:'node',external:['react'],logLevel:'silent'});
 const module={exports:{}};
 new Function('require','module','exports',built.outputFiles[0].text)(createRequire(import.meta.url),module,module.exports);
 const questions=module.exports.questions({single:5000,six:25000,ten:40000});
 assert.match(questions.find(q=>q.id==='puzzles').a,/19\.05 cm or 31\.75 cm square/);
 assert.match(questions.find(q=>q.id==='quality').a,/6\.35 cm print size/);
 assert.match(questions.find(q=>q.id==='quality').a,/300 ppi, about 750 pixels per tile edge/);
});
