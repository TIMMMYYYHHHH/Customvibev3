import test from 'node:test';import assert from 'node:assert/strict';import {build} from 'esbuild';import {createRequire} from 'node:module';import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';
test('customer-update destination identifies the recipient and keeps attempted updates blocked with history accessible',async()=>{
 const built=await build({entryPoints:['admin/OrderDetail.jsx'],bundle:true,write:false,format:'cjs',platform:'node',external:['react'],logLevel:'silent'});const module={exports:{}};new Function('require','module','exports',built.outputFiles[0].text)(createRequire(import.meta.url),module,module.exports);
 const order={id:'11111111-1111-4111-8111-111111111111',reference:'CV-000001',version:3,status:'in_progress',expires:Math.floor(Date.now()/1000)+300,history:[],updates:[{version:3,status:'in_progress',state:'accepted',updated:1700000000}],snapshot:{contact:{name:'Customer',email:'customer@example.com',phone:'1234567'},locker:{name:'Locker',area:'Durban'},magnetQty:1,subtotalCents:10000,items:[]}};
 const html=renderToStaticMarkup(React.createElement(module.exports.default,{order,onChange:()=>{}}));
 const update=html.match(/<section[^>]*id="customer-update"[^>]*>([\s\S]*?)<\/section>/)?.[1];
 assert.ok(update,'dashboard shortcut has a customer-update destination');
 assert.match(update,/customer@example.com/);assert.match(update,/In progress/);
 assert.match(update,/<button[^>]*disabled=""[^>]*>Preview update<\/button>/);
 assert.match(update,/href="#order-activity"/);assert.match(html,/id="order-activity"/);assert.match(html,/Provider accepted/);assert.doesNotMatch(html,/>Send update<\/button>/);
});
test('order detail exposes print quantities, proof labels and manual update action',async()=>{const built=await build({entryPoints:['admin/OrderDetail.jsx'],bundle:true,write:false,format:'cjs',platform:'node',external:['react'],logLevel:'silent'});const module={exports:{}};new Function('require','module','exports',built.outputFiles[0].text)(createRequire(import.meta.url),module,module.exports);const Detail=module.exports.default;const order={id:'11111111-1111-4111-8111-111111111111',reference:'CV-000001',version:0,status:'new',expires:Math.floor(Date.now()/1000)+300,history:[],updates:[],snapshot:{contact:{name:'<Test>',email:'test@example.com',phone:'1234567'},locker:{name:'Locker',area:'Durban'},magnetQty:11,subtotalCents:10000,items:[{kind:'photo',name:'Photo',qty:2,files:[{index:0,name:'design-01-photo.jpg',size:10}]},{kind:'puzzle',name:'Puzzle',qty:1,gridSize:3,files:[{index:1,name:'design-02-proof.jpg',size:10,proof:true}]}]}};const html=renderToStaticMarkup(React.createElement(Detail,{order,onChange:()=>{}}));assert.match(html,/Print 2 copies/);assert.match(html,/9 pieces per set/);assert.match(html,/Preview only/);assert.match(html,/Download all/);assert.match(html,/Preview update/);assert.ok(!html.includes('<Test>'));});

test('replacement proof individual downloads use current source files and exact copy quantities',async()=>{
 const built=await build({entryPoints:['admin/OrderDetail.jsx'],bundle:true,write:false,format:'cjs',platform:'node',external:['react'],logLevel:'silent'});
 const module={exports:{}};new Function('require','module','exports',built.outputFiles[0].text)(createRequire(import.meta.url),module,module.exports);
 const original='11111111-1111-4111-8111-111111111111',replacement='22222222-2222-4222-8222-222222222222';
 const order={id:original,reference:'CV-000001',version:2,status:'new',expires:Math.floor(Date.now()/1000)+300,history:[],updates:[],snapshot:{approvalRequired:true,contact:{name:'Sample',email:'sample@example.com',phone:'0000000'},locker:{name:'Locker',area:'Durban'},magnetQty:6,subtotalCents:25000,items:[{kind:'alphabet',name:'Letters',qty:2,designQuantities:[2,1],files:[{index:0,name:'design-01-alphabet-1.jpg',size:3},{index:1,name:'design-01-alphabet-2.jpg',size:3}]}]},proof:{revision:2,status:'approved',items:[{kind:'alphabet',name:'Letters',qty:2,files:[{requestId:replacement,index:7,name:'design-01-alphabet-1.jpg',size:3,copies:4},{requestId:original,index:1,name:'design-01-alphabet-2.jpg',size:3,copies:2}]}]}};
 for(const status of ['approved','awaiting_approval','changes_requested'])for(const flag of [undefined,false,true]){
  order.snapshot.approvalRequired=flag;
  order.proof.status=status;
  const html=renderToStaticMarkup(React.createElement(module.exports.default,{order,onChange:()=>{}}));
  assert.ok(html.includes(`href="/api/artwork/${replacement}/7"`),'replacement file must be downloadable');
  assert.ok(html.includes(`href="/api/artwork/${original}/1"`),'unchanged source file remains reusable');
  assert.ok(!html.includes(`href="/api/artwork/${original}/0"`),'superseded file must not appear as current artwork');
  assert.match(html,/4 copies/);assert.match(html,/2 copies/);assert.match(html,/Per-file quantities below/);
  assert.doesNotMatch(html,/Do not print until|Customer design approval|requires approval|Publish revision for approval/i);assert.match(html,/Download all/);assert.match(html,/Preview update/);
 }
 order.expires=1;
 const expired=renderToStaticMarkup(React.createElement(module.exports.default,{order,onChange:()=>{}}));
 assert.doesNotMatch(expired,/>Download image</);
});
