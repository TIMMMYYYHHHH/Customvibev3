import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {defaultContent,canPurchase} from '../src/content/model.mjs';
import {artworkStyles,artworkUrl,collectionPreviewStyle,initialArtworkStyle} from '../src/designs/artwork.mjs';
import {packIds,collectionDesigns} from '../src/designs/catalogue.mjs';
import {upgradeCollections,mergeCollectionItem,isSelectableCollection} from '../src/designs/products.mjs';
import {validateOrder} from '../server/submission-model.mjs';import {orderRecord} from '../server/order-record.mjs';import {proofRows} from '../src/proof-manifest.mjs';import {readContent,validateStoredContent} from '../server/content.mjs';
const file={size:2000,sha256:'a'.repeat(64)},payload=items=>({id:'22222222-2222-4222-8222-222222222222',createdAt:Math.floor(Date.now()/1000),contact:{name:'Fixture',email:'fixture@example.com',phone:'0123456789'},locker:{name:'Locker',area:'Durban'},consent:true,items});
const item=(kind,style)=>({id:'11111111-1111-4111-8111-111111111111',kind,style,qty:2,printVersion:1,designIds:[`${kind}-1`,`${kind}-2`],designQuantities:[2,1],files:[file,file]});
test('all six collections accept individual designs in all five styles with exact proof copies',()=>{for(const kind of packIds)for(const style of artworkStyles){const p=defaultContent.products.find(p=>p.id===kind);assert.ok(canPurchase(p));assert.ok(isSelectableCollection(p));const order=validateOrder(payload([item(kind,style.id)]),defaultContent,true),record=orderRecord(order,true);assert.equal(order.magnetQty,6);assert.equal(order.subtotalCents,25000);assert.equal(record.items[0].style,style.id);assert.ok(record.items[0].name.includes(style.name));assert.deepEqual(proofRows(record).map(r=>r.copies),[4,2]);}});
test('unknown styles and foreign design identities cannot enter orders',()=>{for(const style of ['unknown','../paper',null,{}])assert.throws(()=>validateOrder(payload([item('words',style)]),defaultContent,true));assert.throws(()=>validateOrder(payload([{...item('thanks','paper'),designIds:['words-1','thanks-2']}]),defaultContent,true));});
test('style identity separates baskets and edits merge only matching designs and styles',()=>{const a=item('words','paper'),b={...item('words','clay'),id:'b'};assert.equal(mergeCollectionItem([a],b).length,2);const merged=mergeCollectionItem([a,b],{...b,style:'paper'},'b');assert.equal(merged.length,1);assert.equal(merged[0].qty,4);});
test('all 360 approved artwork files exist and remain square PNG originals',async()=>{let count=0;for(const kind of packIds)for(const d of collectionDesigns(kind))for(const s of artworkStyles){const b=await readFile('public'+artworkUrl(d.id,s.id));assert.equal(b.toString('ascii',1,4),'PNG');assert.equal(b.readUInt32BE(16),b.readUInt32BE(20));count++;}assert.equal(count,360);});
test('legacy catalogue upgrade preserves custom copy and future admin availability decisions',async()=>{const old=structuredClone(defaultContent);for(const p of old.products)if(packIds.includes(p.id)){delete p.artworkEdition;p.status='coming-soon';if(!['alphabet','counting'].includes(p.id))p.count=4;}old.products[0].name='Owner copy';const db={prepare:()=>({first:async()=>({body:JSON.stringify(old)})})};const current=await readContent(db,defaultContent);assert.equal(current.products[0].name,'Owner copy');for(const p of current.products.filter(p=>packIds.includes(p.id)))assert.equal(p.status,'available');const words=current.products.find(p=>p.id==='words');assert.equal(words.count,9);words.status='hidden';const saved=validateStoredContent(current);assert.equal(upgradeCollections(saved.products).find(p=>p.id==='words').status,'hidden');assert.equal(saved.products.find(p=>p.id==='words').artworkEdition,1);});

test('new collection selections open in the advertised style, while basket edits preserve the chosen style',()=>{
 const expected={alphabet:'watercolour',counting:'gouache',words:'paper',colours:'clay',reminders:'pencil',thanks:'watercolour'};
 for(const [id,style] of Object.entries(expected)){
  assert.equal(collectionPreviewStyle(id),style);assert.equal(initialArtworkStyle(id),style);
  for(const choice of artworkStyles)assert.equal(initialArtworkStyle(id,{style:choice.id}),choice.id);
  assert.equal(initialArtworkStyle(id,{}),'watercolour');
 }
});
