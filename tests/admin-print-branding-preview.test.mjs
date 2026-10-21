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
 assert.ok(html.includes(`font-size="${6*25.4/72}"`));
});
