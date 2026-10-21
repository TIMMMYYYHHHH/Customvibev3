import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {buildSync} from 'esbuild';
import {createPrintJob} from '../admin/print-layout.mjs';
const require=createRequire(import.meta.url),module={exports:{}};
const code=buildSync({entryPoints:['admin/PrintSheet.jsx'],bundle:true,platform:'node',format:'cjs',write:false,packages:'external',logLevel:'silent'}).outputFiles[0].text;
new Function('require','module','exports',code)(require,module,module.exports);

test('SVG displays contiguous live @CustomVibe segments from the shared model on all four rotated flaps',()=>{
 assert.equal(typeof module.exports.SheetPreview,'function');
 const file={index:0,name:'design-01-photo.jpg',size:123,proof:false},order={id:'12345678-1234-1234-1234-123456789abc',reference:'CV-SYNTHETIC',version:0,artworkExpires:Math.floor(Date.now()/1000)+3600,snapshot:{magnetQty:1,items:[{kind:'photo',qty:1,files:[file]}]}};
 const job=createPrintJob(order),html=renderToStaticMarkup(React.createElement(module.exports.SheetPreview,{page:job.pages[0],urls:new Map([[file.name,'data:image/jpeg;base64,synthetic']]),showGuides:true}));
 assert.equal((html.match(/<text\b/g)||[]).length,4);assert.equal((html.match(/<tspan fill="#291438">@Custom<\/tspan><tspan fill="#ae2e5b">Vibe<\/tspan>/g)||[]).length,4);assert.doesNotMatch(html,/@customvibe|@mypicmag|textLength|letter-spacing/);
 for(const brand of job.pages[0].placements[0].branding)assert.ok(html.includes(`translate(${brand.xMm} ${brand.yMm}) rotate(${brand.rotation})`));
 assert.ok(html.includes(`font-size="${6*25.4/72}"`));assert.ok(html.includes('width="68" height="68"'));assert.equal(job.pages[0].placements[0].face.sizeMm,63.5);
});


test('the reset callback supplies the 68 mm default and clears all placement adjustments',()=>{
 const reset=module.exports.defaultPrintCalibration();assert.equal(reset.imageMm,68);assert.equal(reset.sheetXMm,0);assert.equal(reset.sheetYMm,0);assert.equal(reset.rowSpacingMm,0);assert.equal(reset.columnSpacingMm,0);assert.equal(reset.showGuides,true);assert.ok(reset.slotOffsets.every(s=>s.xMm===0&&s.yMm===0));
 const nextReset=module.exports.defaultPrintCalibration();assert.deepEqual(nextReset,reset);assert.notEqual(nextReset.slotOffsets,reset.slotOffsets);
 const html=renderToStaticMarkup(React.createElement(module.exports.default,{order:{id:'synthetic'},onClose:()=>{}}));assert.match(html,/default 68 mm image extends 2.25 mm beyond each edge of the 63.5 mm finished face/);
});
