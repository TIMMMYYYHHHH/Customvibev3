import {withShippingAgreement} from './helpers/shipping.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {defaultContent,validateContent} from '../src/content/model.mjs';
import {summarize} from '../src/commerce.mjs';
import {validateStoredContent} from '../server/content.mjs';
import {validateOrder} from '../server/submission-model.mjs';
import {orderRecord} from '../server/order-record.mjs';
const file={size:2000,sha256:'a'.repeat(64)};
const payload=items=>({id:crypto.randomUUID(),createdAt:Math.floor(Date.now()/1000),contact:{name:'Fixture',email:'fixture@example.com',phone:'0123456789'},locker:{name:'Locker',area:'Durban'},consent:true,items});

test('model defaults and shipped fallback calculate the approved tiers without changing catalogue fields',async()=>{
 const fallback=JSON.parse(await readFile(new URL('../data/site-content.json',import.meta.url)));
 for(const content of [defaultContent,fallback]){
  const before=structuredClone(content);validateContent(content);validateStoredContent(content);
  for(const [qty,total] of [[1,5000],[2,10000],[3,15000],[4,20000],[5,25000],[6,27000],[7,31500],[8,36000],[9,40500],[10,40000],[11,44000]])assert.equal(summarize([{kind:'photo',qty}],content).knownCents,total);
  assert.deepEqual(content,before);
 }
});

test('selected design quantities and set copies share one basket rate with photos and puzzles',()=>{
 const selected={id:crypto.randomUUID(),kind:'alphabet',qty:2,printVersion:1,designIds:['alphabet-1','alphabet-3'],designQuantities:[2,1],files:[file,file]};
 for(const [items,qty,total,lines] of [
  [[{kind:'photo',qty:1,files:[file]},{...selected,qty:1}],4,20000,[5000,15000]],
  [[{kind:'photo',qty:1,files:[file]},selected],7,31500,[4500,27000]],
  [[{kind:'puzzle',qty:1,gridSize:3,files:Array(10).fill(file)}],9,40500,[40500]],
  [[{kind:'photo',qty:1,files:[file]},{kind:'puzzle',qty:1,gridSize:3,files:Array(10).fill(file)}],10,40000,[4000,36000]],
  [[{kind:'photo',qty:2,files:[file]},{kind:'puzzle',qty:1,gridSize:3,files:Array(10).fill(file)},selected],17,68000,[8000,36000,24000]]
 ]){
  const raw=payload(items),before=structuredClone(raw),order=validateOrder(withShippingAgreement(raw,defaultContent),defaultContent,true),saved=orderRecord(order,true);
  assert.equal(order.magnetQty,qty);assert.equal(order.subtotalCents,total);assert.deepEqual(order.items.map(i=>i.lineCents),lines);
  assert.deepEqual(saved.items.map(i=>i.lineCents),lines);assert.equal(saved.subtotalCents,total);assert.equal(order.paymentStatus,'unpaid');
  assert.deepEqual(raw,before,'pricing must not add magnets, alter selections or rewrite the browser submission');
 }
});

const built=await build({stdin:{contents:"export {ContentProvider} from './src/content/ContentProvider.jsx'; export {default as TierNudge} from './src/TierNudge.jsx'; export {questions} from './src/HelpContent.jsx';",resolveDir:process.cwd(),loader:'jsx'},bundle:true,write:false,format:'cjs',platform:'node',external:['react'],logLevel:'silent'});
const module={exports:{}};new Function('require','module','exports',built.outputFiles[0].text)(createRequire(import.meta.url),module,module.exports);
const nudge=quantity=>renderToStaticMarkup(React.createElement(module.exports.ContentProvider,{initialContent:defaultContent},React.createElement(module.exports.TierNudge,{quantity,onAdd:()=>{}})));
test('nine-magnet nudge explains that adding one reduces the total by R5 without implying automatic addition',()=>{
 const html=nudge(9).replace(/&nbsp;|&#xA0;/g,' ');
 assert.match(html,/Add 1 more magnet/);assert.match(html,/save R\s?5/i);assert.match(html,/10 magnets for <strong>R\s?400<\/strong>/);
 assert.doesNotMatch(html,/R\s?-5|nothing extra|Keep your total|free magnet/i);
 assert.match(html,/<button[^>]*type="button"/);
});
test('five-magnet nudge reports R20 extra and pricing FAQ explains whole-basket rates',()=>{
 const html=nudge(5).replace(/&nbsp;|&#xA0;/g,' ');assert.match(html,/R\s?20 more in total/);assert.doesNotMatch(html,/nothing extra|free magnet/i);
 const answer=module.exports.questions(defaultContent.pricing).find(q=>q.id==='pricing').a;
 assert.match(answer,/1.5 magnets.*R\s?50 each/);assert.match(answer,/6.9 magnets.*R\s?45 each/);assert.match(answer,/10.*R\s?40 each/);
 assert.match(answer,/whole basket/i);assert.match(answer,/photo.*puzzle.*collection/i);
});
