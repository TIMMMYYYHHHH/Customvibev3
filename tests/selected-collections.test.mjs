import {withShippingAgreement} from './helpers/shipping.mjs';
import test from 'node:test';import assert from 'node:assert/strict';
import {defaultContent} from '../src/content/model.mjs';
import {summarize,orderCapacity} from '../src/commerce.mjs';
import {validateOrder} from '../server/submission-model.mjs';
import {orderRecord} from '../server/order-record.mjs';
import {proofRows} from '../src/proof-manifest.mjs';
import {emailOrderSummary} from '../server/email-order-summary.mjs';
const content=structuredClone(defaultContent);content.products.forEach(p=>p.status='available');
const file={size:2000,sha256:'a'.repeat(64)};
const chosen={id:'11111111-1111-4111-8111-111111111111',kind:'alphabet',qty:2,printVersion:1,designIds:['alphabet-1','alphabet-3','alphabet-26'],files:[file,file,file]};
const payload=items=>({id:'22222222-2222-4222-8222-222222222222',createdAt:Math.floor(Date.now()/1000),contact:{name:'Test',email:'test@example.com',phone:'0123456789'},locker:{name:'Locker',area:'Durban'},consent:true,items});
test('chosen letters price their actual magnets and copies reuse the selected files',()=>{
 const sum=summarize([chosen],content);assert.equal(sum.magnetQty,6);assert.equal(sum.knownCents,27000);assert.equal(orderCapacity([chosen],content).files,3);
 assert.equal(summarize([{kind:'counting',qty:1,designIds:['counting-2','counting-10']},{kind:'photo',qty:4}],content).knownCents,27000);
});
test('chosen letters retain their identities and exact face count through order and proof records',()=>{
 const order=validateOrder(withShippingAgreement(payload([chosen]),content),content,true),record=orderRecord(order,true);
 assert.equal(order.subtotalCents,27000);assert.equal(order.items[0].faceCount,3);assert.deepEqual(record.items[0].designIds,chosen.designIds);assert.match(record.items[0].name,/A, C, Z/);assert.equal(proofRows(record).length,3);assert.match(emailOrderSummary(order).text,/A, C, Z/);
});
test('invalid selections cannot buy empty, duplicate, unrelated or missing faces',()=>{
 for(const designIds of [[],['alphabet-1','alphabet-1'],['counting-1'],['alphabet-27'],'alphabet-1',null])assert.throws(()=>validateOrder(withShippingAgreement(payload([{...chosen,designIds,files:Array(26).fill(file)}]),content),content,true));
 assert.throws(()=>validateOrder(withShippingAgreement(payload([{...chosen,designIds:['alphabet-1']}]),content),content,true));
 assert.throws(()=>validateOrder(withShippingAgreement(payload([{...chosen,kind:'words',designIds:['words-1'],files:Array(4).fill(file)}]),content),content,true));
});
test('full sets remain compatible and server derives count rather than trusting the browser',()=>{
 const all={...chosen,qty:1,files:Array(26).fill(file)};delete all.designIds;
 assert.equal(validateOrder(withShippingAgreement(payload([all]),content),content,true).magnetQty,26);
 const order=validateOrder(withShippingAgreement(payload([{...chosen,faceCount:26,count:26}]),content),content,true);assert.equal(order.magnetQty,6);
});

test('editing into an existing selection merges copies and later adds exactly one set',async()=>{
 const {mergeCollectionItem}=await import('../src/designs/products.mjs');assert.equal(typeof mergeCollectionItem,'function');
 const a={...chosen,id:'a',qty:1,designIds:['alphabet-1']},b={...chosen,id:'b',qty:1,designIds:['alphabet-2']};
 const edited=mergeCollectionItem([a,b],{...b,designIds:['alphabet-1']},'b');assert.equal(edited.length,1);assert.equal(edited[0].qty,2);
 const added=mergeCollectionItem(edited,{...a,id:'c'});assert.equal(added.length,1);assert.equal(added[0].qty,3);
 const full={...a,id:'full'};delete full.designIds;assert.equal(mergeCollectionItem(added,full).length,2);
});

test('different quantities per letter price all copies but upload each face only once',()=>{
 const item={...chosen,designQuantities:[2,1,3]};
 const order=validateOrder(withShippingAgreement(payload([item]),content),content,true),record=orderRecord(order,true);
 assert.equal(order.magnetQty,12);assert.equal(order.subtotalCents,48000);
 assert.equal(order.items[0].faceCount,3);assert.equal(orderCapacity([item],content).files,3);
 assert.deepEqual(record.items[0].designQuantities,[2,1,3]);
 assert.match(record.items[0].name,/A × 2, C, Z × 3/);
 assert.deepEqual(proofRows(record).map(r=>r.copies),[4,2,6]);
});
test('per-letter quantities reject malformed, mismatched and unsafe counts',()=>{
 for(const designQuantities of [[],[2],[0,1,1],[-1,1,1],[1.5,1,1],['2',1,1],null,{},[Number.MAX_SAFE_INTEGER,1,1]])assert.throws(()=>validateOrder(withShippingAgreement(payload([{...chosen,designQuantities}]),content),content,true));
 assert.throws(()=>validateOrder(withShippingAgreement(payload([{...chosen,designIds:undefined,designQuantities:[2],files:Array(26).fill(file)}]),content),content,true));
});
test('selections with different per-letter quantities stay distinct when adding or editing',async()=>{
 const {mergeCollectionItem}=await import('../src/designs/products.mjs');
 const a={...chosen,qty:1,designQuantities:[2,1,1]},b={...chosen,id:'b',qty:1,designQuantities:[1,2,1]};
 assert.equal(mergeCollectionItem([a],b).length,2);
 const merged=mergeCollectionItem([a,b],{...b,designQuantities:[2,1,1]},'b');
 assert.equal(merged.length,1);assert.equal(merged[0].qty,2);
});
