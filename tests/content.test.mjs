import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultContent,validateContent,canPurchase} from '../src/content/model.mjs';
import {photoPrice,summarize,nextPhotoTier} from '../src/commerce.mjs';
const copy=()=>{const c=structuredClone(defaultContent);c.products.forEach(p=>{if(p.id==='alphabet'){p.pricingMode='fixed';p.status='coming-soon'}});return c;};
test('legacy fixed-price packs need a real price and count; coming soon never purchasable',()=>{
 const c=copy();assert.equal(validateContent(c),c);
 const p=c.products[0];assert.equal(canPurchase(p),false);p.status='available';assert.throws(()=>validateContent(c),/price/i);
 p.priceCents=19000;assert.equal(canPurchase(p),true);assert.equal(validateContent(c),c);
 p.count=0;assert.throws(()=>validateContent(c),/count/i);
});
test('content rejects unsafe images, duplicate identifiers, and missing core products',()=>{
 const c=copy();c.images.logo='javascript:alert(1)';assert.throws(()=>validateContent(c),/image/i);
 const d=copy();d.products.push(d.products[0]);assert.throws(()=>validateContent(d),/unique/i);
 const e=copy();e.products=e.products.filter(p=>p.id!=='photos');assert.throws(()=>validateContent(e),/photos/i);
});
test('configured prices drive mixed totals, pack counts and nudges',()=>{
 const c=copy();c.pricing={single:6000,six:30000,ten:48000};
 Object.assign(c.products[0],{status:'available',priceCents:18000});
 assert.equal(photoPrice(9,c.pricing),45000);assert.equal(photoPrice(13,c.pricing),62400);
 const s=summarize([{kind:'photo',qty:1},{kind:'puzzle',gridSize:3,qty:1},{kind:'alphabet',qty:2}],c);
 assert.equal(s.knownCents,84000);assert.equal(s.magnetQty,62);assert.equal(s.unpriced,false);
 assert.equal(nextPhotoTier(9,c.pricing).extra,3000);
 c.products[0].status='coming-soon';assert.equal(summarize([{kind:'alphabet',qty:1}],c).unpriced,true);
});
test('pricing rejects a ten-magnet total below the six-magnet total',()=>{
 const c=copy();c.pricing.ten=100;assert.throws(()=>validateContent(c),/pricing/i);
});
test('the six-magnet price stays exact when admin uses cents',()=>{
 const pricing={single:5000,six:25050,ten:40000};
 assert.equal(photoPrice(6,pricing),25050);
 assert.equal(nextPhotoTier(5,pricing).extra,50);
});


test('approved pricing accepts the deliberate nine-to-ten reduction in both content validators',async()=>{
 const {validateStoredContent}=await import('../server/content.mjs');
 const c=copy();c.pricing={single:5000,six:27000,ten:40000};
 assert.equal(validateContent(c),c);assert.deepEqual(validateStoredContent(c).pricing,c.pricing);
 assert.equal(photoPrice(9,c.pricing),40500);assert.equal(photoPrice(10,c.pricing),40000);
});
test('legacy saved custom pack totals remain valid and are never reset to defaults',async()=>{
 const {readContent}=await import('../server/content.mjs');
 for(const pricing of [{single:5000,six:25000,ten:40000},{single:5000,six:25050,ten:40000},{single:6000,six:30000,ten:48000}]){
  const c=copy();c.pricing=pricing;c.revision=87;c.products[0].name='Saved owner catalogue';
  const db={prepare(){return {first:async()=>({body:JSON.stringify(c)})}}};
  assert.equal(validateContent(c),c);const loaded=await readContent(db,defaultContent);
  assert.deepEqual(loaded.pricing,pricing);assert.equal(loaded.revision,87);assert.equal(loaded.products[0].name,'Saved owner catalogue');
 }
 assert.equal(photoPrice(7,{single:5000,six:25000,ten:40000}),29167);
 assert.equal(photoPrice(8,{single:5000,six:25050,ten:40000}),33400);
});
