import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import {emailOrderSummary} from '../server/email-order-summary.mjs';
import {money} from '../src/commerce.mjs';

async function loadUI(){
 const bundled=await build({stdin:{contents:"export {ContentProvider} from './src/content/ContentProvider.jsx'; export {CollectionPrice} from './src/CollectionPrice.jsx';",resolveDir:process.cwd(),loader:'jsx'},bundle:true,write:false,format:'cjs',platform:'node',external:['react'],logLevel:'silent'});
 const module={exports:{}};new Function('require','module','exports',bundled.outputFiles[0].text)(createRequire(import.meta.url),module,module.exports);return module.exports;
}
const order=()=>({items:[{kind:'photo',name:'Photo magnets',qty:25}],magnetQty:25,subtotalCents:100000,locker:{name:'Saved locker',area:'Durban'},paymentStatus:'unpaid'});

test('basket summary includes charged or free PUDO delivery and the complete unpaid total',async()=>{
 const {ContentProvider,CollectionPrice}=await loadUI();
 for(const [qty,subtotal,fee,total] of [[9,40500,6900,47400],[25,100000,0,100000]]){
  const sum={pricedQty:qty,photoQty:qty,puzzleQty:0,knownCents:subtotal,unpriced:false};
  const html=renderToStaticMarkup(React.createElement(ContentProvider,null,React.createElement(CollectionPrice,{sum})));
  assert.match(html,/PUDO locker delivery/);assert.match(html,/>Total</);
  assert.ok(html.includes(money(total)),html);assert.ok(html.includes(fee?money(fee):'Free'),html);
  assert.doesNotMatch(html,/To be confirmed|cost will be confirmed/);
 }
});

test('incomplete baskets keep the delivered total unknown until unavailable items are reviewed',async()=>{
 const {ContentProvider,CollectionPrice}=await loadUI();
 const html=renderToStaticMarkup(React.createElement(ContentProvider,null,React.createElement(CollectionPrice,{sum:{pricedQty:1,photoQty:1,puzzleQty:0,knownCents:5000,unpriced:true}})));
 assert.match(html,/Review basket/);assert.doesNotMatch(html,/>Total</);
 assert.match(html,/Delivery and total are available once all items have a price/);
});

test('initial email summary presents saved delivery and total without repricing historical orders',()=>{
 for(const [deliveryCents,totalCents] of [[0,100000],[6900,106900],[4200,104200]]){
  const saved={...order(),deliveryCents,totalCents},before=structuredClone(saved),summary=emailOrderSummary(saved);
  assert.ok(summary.text.includes('PUDO locker delivery: '+(deliveryCents?money(deliveryCents):'Free')));
  assert.ok(summary.text.includes('Order total: '+money(totalCents)));assert.ok(summary.html.includes(money(totalCents)));
  assert.deepEqual(saved,before);
 }
});

test('legacy email summary leaves missing saved delivery and total unknown',()=>{
 const summary=emailOrderSummary(order());
 assert.match(summary.text,/PUDO locker delivery: To confirm/);assert.match(summary.text,/Order total: To confirm/);
 assert.doesNotMatch(summary.text,/PUDO locker delivery: Free|R\s*69/);
});
