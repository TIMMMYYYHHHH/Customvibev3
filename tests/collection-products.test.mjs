import test from 'node:test';import assert from 'node:assert/strict';
import {defaultContent,validateContent,canPurchase} from '../src/content/model.mjs';
import {summarize,orderCapacity} from '../src/commerce.mjs';
import {printManifest,collectionProducts} from '../src/designs/products.mjs';
const content=structuredClone(defaultContent);content.products=content.products.filter(p=>!collectionProducts.some(c=>c.id===p.id)).concat(collectionProducts.map(p=>({...p,status:'available'})));
test('pack contents participate in shared quantity discounts, including copies and mixed baskets',()=>{
 assert.equal(summarize([{kind:'alphabet',qty:1},{kind:'words',qty:1}],content).knownCents,140000);
 assert.equal(summarize([{kind:'alphabet',qty:2}],content).knownCents,208000);
 assert.equal(summarize([{kind:'words',qty:1},{kind:'business',qty:2}],content).knownCents,44000);
 assert.equal(summarize([{kind:'words',qty:1}],content).knownCents,37500);
 assert.equal(summarize([{kind:'wifi',qty:1},{kind:'puzzle',qty:1,gridSize:3}],content).knownCents,40000);
});
test('available built-in packs require matching complete versioned print manifests',()=>{
 assert.equal(validateContent(content),content);const alphabet=content.products.find(p=>p.id==='alphabet');assert.equal(printManifest(alphabet).designs.length,26);assert.equal(canPurchase(alphabet),true);
 const wrong={...alphabet,count:25};assert.equal(canPurchase(wrong),false);assert.throws(()=>validateContent({...content,products:content.products.map(p=>p.id==='alphabet'?wrong:p)}));
 assert.equal(canPurchase({...alphabet,printVersion:2}),false);
});
test('pack files count against upload capacity, while copies reuse exact artwork',()=>{
 assert.equal(orderCapacity([{kind:'alphabet',qty:2},{kind:'words',qty:1}],content).files,35);
 assert.equal(orderCapacity([{kind:'alphabet',qty:1},{kind:'alphabet',qty:1},{kind:'counting',qty:1}],content).allowed,false);
});
