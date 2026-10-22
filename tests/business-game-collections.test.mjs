import {withShippingAgreement} from './helpers/shipping.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultContent,canPurchase} from '../src/content/model.mjs';
import {printManifest,isSelectableCollection,upgradeCollections} from '../src/designs/products.mjs';
import {validateOrder} from '../server/submission-model.mjs';
import {orderRecord} from '../server/order-record.mjs';
import {proofRows} from '../src/proof-manifest.mjs';
const file={size:2000,sha256:'a'.repeat(64)};
const item={id:'11111111-1111-4111-8111-111111111111',kind:'noughts-crosses',qty:1,printVersion:1,files:Array(10).fill(file)};
const payload=items=>({id:'22222222-2222-4222-8222-222222222222',createdAt:Math.floor(Date.now()/1000),contact:{name:'Fixture',email:'fixture@example.com',phone:'0123456789'},locker:{name:'Locker',area:'Durban'},consent:true,items});
test('game is ten square magnets, five of each, available only as a complete set',()=>{
 const product=defaultContent.products.find(p=>p.id===item.kind);
 assert.ok(canPurchase(product));assert.equal(isSelectableCollection(product),false);
 const designs=printManifest(product).designs;
 assert.equal(designs.length,10);assert.equal(designs.filter(d=>d.values.title==='X').length,5);assert.equal(designs.filter(d=>d.values.title==='O').length,5);
 const order=validateOrder(withShippingAgreement(payload([item]),defaultContent),defaultContent,true);
 assert.equal(order.magnetQty,10);assert.equal(order.subtotalCents,40000);
 const record=orderRecord(order,true);assert.equal(record.items[0].faceCount,10);assert.equal(proofRows(record).length,10);
 assert.equal(record.items[0].style,undefined);
 const two=validateOrder(withShippingAgreement(payload([{...item,qty:2}]),defaultContent),defaultContent,true);
 assert.equal(two.magnetQty,20);assert.deepEqual(proofRows(orderRecord(two,true)).map(r=>r.copies),Array(10).fill(2));
});
test('server rejects partial game sets, custom quantities, styles and missing print faces',()=>{
 for(const change of [{designIds:['noughts-crosses-1']},{designQuantities:[5,5]},{style:'watercolour'},{files:Array(9).fill(file)}])assert.throws(()=>validateOrder(withShippingAgreement(payload([{...item,...change}]),defaultContent),defaultContent,true));
});
test('catalogue adds the game once and preserves existing owner edits and availability',()=>{
 const original=structuredClone(defaultContent.products).filter(p=>p.id!==item.kind);original[0].name='Owner copy';
 const upgraded=upgradeCollections(original);assert.equal(upgraded[0].name,'Owner copy');assert.equal(upgraded.filter(p=>p.id===item.kind).length,1);
 upgraded.find(p=>p.id===item.kind).status='hidden';assert.equal(upgradeCollections(upgraded).find(p=>p.id===item.kind).status,'hidden');
});
