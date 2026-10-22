import test from 'node:test';
import assert from 'node:assert/strict';
import {emailOrderSummary} from '../server/email-order-summary.mjs';
import {emailDesignPreviews} from '../server/email-design-previews.mjs';
import {orderEmails} from '../server/submission-model.mjs';
import {orderUpdateEmail} from '../server/order-update-email.mjs';
import {money} from '../src/commerce.mjs';

// These saved facts deliberately keep CV-000009's historical subtotal.
const mixed=()=>({id:'99999999-9999-4999-8999-999999999999',referenceVersion:1,contact:{name:'Synthetic customer',email:'synthetic@example.invalid',phone:'0123456789'},locker:{name:'Example locker',area:'Durban'},emailPreviewVersion:1,items:[{kind:'photo',name:'Photo magnets',qty:2,faceCount:1,files:[],emailPreview:'preview'},{kind:'alphabet',name:'Alphabet · Watercolour',qty:2,faceCount:2,designIds:['alphabet-1','alphabet-2'],designQuantities:[2,1],files:[],emailPreview:'preview'}],magnetQty:8,subtotalCents:33300,paymentStatus:'unpaid'});

test('mixed saved order distinguishes order items, set copies and exact magnets without repricing',()=>{
 const order=mixed(),before=JSON.stringify(order),summary=emailOrderSummary(order);
 assert.match(summary.text,/2 order items · 8 magnets/);
 assert.match(summary.html,/2 order items · 8 magnets/);
 assert.match(summary.text,/Photo magnets: 2 copies = 2 magnets/);
 assert.match(summary.text,/Alphabet · Watercolour: 2 sets · 3 magnets per set · A: 4 copies; B: 2 copies = 6 magnets/);
 assert.match(summary.html,/>6<\/td>/);assert.match(summary.html,/>2<\/td>/);
 assert.doesNotMatch(summary.text,/units|included in total|R\s*360|R\s*41/);
 assert.ok(summary.text.includes(`Magnet subtotal: ${money(33300)}`));
 assert.equal(JSON.stringify(order),before);
 const previews=emailDesignPreviews(order);
 assert.match(previews.text,/2 sets · 3 magnets per set · A: 4 copies; B: 2 copies/);
 for(const mail of Object.values(orderEmails(order,true))){
  assert.match(mail.text,/2 order items · 8 magnets/);assert.match(mail.text,/A: 4 copies; B: 2 copies/);
  assert.match(mail.text,/Total magnets: 8\b/);
  assert.match(mail.html.replace(/<[^>]*>/g,' '),/Total magnets\s+8\b/);
  assert.ok(mail.text.includes(`Magnet subtotal: ${money(33300)}`));assert.match(mail.text,/No payment has been taken/);
 }
});

test('both initial recipients get a separate total for sixty magnets across three collection items',()=>{
 const order={...mixed(),referenceVersion:2,items:[
  {kind:'alphabet',name:'The alphabet club · Watercolour storybook',qty:1,faceCount:26,files:[]},
  {kind:'alphabet',name:'The alphabet club · Bold painted gouache',qty:1,faceCount:26,files:[]},
  {kind:'counting',name:'Count on a little fun · Bold painted gouache',qty:1,faceCount:8,designIds:['counting-1','counting-2','counting-3','counting-4','counting-5','counting-6','counting-7','counting-8'],files:[]}
 ],magnetQty:60,subtotalCents:240000,shippingPolicyVersion:1,deliveryCents:0,totalCents:240000},before=structuredClone(order);
 for(const mail of Object.values(orderEmails(order,true,'CV-000010'))){
  assert.match(mail.text,/Total magnets: 60\b/);
  assert.match(mail.html.replace(/<[^>]*>/g,' '),/Total magnets\s+60\b/);
  assert.match(mail.text,/3 order items · 60 magnets/);
  assert.match(mail.text,/1 set · 26 magnets per set = 26 magnets/);
  assert.match(mail.text,/1: 1 copy; 2: 1 copy; 3: 1 copy; 4: 1 copy; 5: 1 copy; 6: 1 copy; 7: 1 copy; 8: 1 copy = 8 magnets/);
  assert.match(mail.text,/PUDO locker delivery: Free/);
  assert.ok(mail.text.includes(`Order total: ${money(240000)}`));
  assert.match(mail.text,/No payment has been taken/);
 }
 assert.deepEqual(order,before);
});

test('full sets, selected single designs, puzzles, photos and saved fixed packs retain numeric counts',()=>{
 const order={...mixed(),items:[
  {kind:'alphabet',name:'Full alphabet',qty:2,faceCount:26},
  {kind:'alphabet',name:'Selected A',qty:3,faceCount:1,designIds:['alphabet-1'],designQuantities:[2]},
  {kind:'counting',name:'Selected numbers',qty:2,faceCount:2,designIds:['counting-1','counting-2']},
  {kind:'puzzle',name:'Puzzle',qty:2,gridSize:3},
  {kind:'photo',name:'Photo',qty:1},
  {kind:'information',name:'Handy template',qty:3,faceCount:1},
  {kind:'retired-fixed-pack',name:'Saved fixed pack',qty:2,faceCount:4}
 ],magnetQty:92};
 const summary=emailOrderSummary(order);
 for(const expected of [
  'Full alphabet: 2 sets · 26 magnets per set = 52 magnets',
  'Selected A: 3 sets · 2 magnets per set · A: 6 copies = 6 magnets',
  'Selected numbers: 2 sets · 2 magnets per set · 1: 2 copies; 2: 2 copies = 4 magnets',
  'Puzzle (3 × 3): 2 sets · 9 magnets per set = 18 magnets',
  'Photo: 1 copy = 1 magnet',
  'Handy template: 3 copies = 3 magnets',
  'Saved fixed pack: 2 sets · 4 magnets per set = 8 magnets'
 ])assert.ok(summary.text.includes(expected),expected);
 assert.doesNotMatch(summary.html,/Included in total|Not recorded/);
});

test('legacy missing or invalid per-item facts remain explicitly unknown in summary and previews',()=>{
 const order={...mixed(),items:[{kind:'alphabet',name:'Legacy alphabet',qty:2,emailPreview:'preview'}, {kind:'alphabet',name:'Incomplete selection',qty:2,faceCount:2,designIds:['alphabet-1','alphabet-2'],designQuantities:[3],emailPreview:'preview'}],magnetQty:52};
 const summary=emailOrderSummary(order),previews=emailDesignPreviews(order);
 assert.match(summary.text,/2 order items · 52 magnets/);
 assert.match(summary.text,/Total magnets: 52\b/);
 assert.match(summary.html.replace(/<[^>]*>/g,' '),/Total magnets\s+52\b/);
 assert.equal((summary.text.match(/magnet count not recorded/g)||[]).length,2);
 assert.equal((summary.html.match(/>Not recorded<\/td>/g)||[]).length,2);
 assert.equal((previews.text.match(/magnet count not recorded/g)||[]).length,2);
 assert.doesNotMatch(summary.text,/= 4 magnets|26 magnets per set/);
 assert.doesNotMatch(previews.text,/undefined|NaN|26 magnets per set/);
});

test('shared quantities preserve escaping and singular wording in both email locations',()=>{
 const order={...mixed(),items:[{kind:'photo',name:'Photo <script> & "label"',qty:1,emailPreview:'preview'}],notes:'<img src=x> & note',magnetQty:1};
 const summary=emailOrderSummary(order),previews=emailDesignPreviews(order);
 assert.match(summary.text,/1 order item · 1 magnet/);
 for(const result of [summary,previews]){
  assert.match(result.html,/Photo &lt;script&gt; &amp; &quot;label&quot;/);
  assert.doesNotMatch(result.html,/<script>|<img src=x>/);assert.doesNotMatch(result.text,/1 magnets|1 copies/);
 }
 assert.match(summary.html,/&lt;img src=x&gt; &amp; note/);
});

test('email rendering uses each saved subtotal and keeps manual updates on saved counts',()=>{
 for(const subtotalCents of [33300,36000]){
  const order={...mixed(),subtotalCents},before=JSON.stringify(order);
  for(const mail of Object.values(orderEmails(order,true))){
   assert.ok(mail.text.includes(`Magnet subtotal: ${money(subtotalCents)}`));
   assert.doesNotMatch(mail.text,/R\s*45 each|R\s*50 each|R\s*40 each/);
  }
  const update=orderUpdateEmail({reference:'CV-000009',status:'new',version:2,snapshot:order});
  assert.match(update.text,/Magnet count: 8/);assert.match(update.text,/No payment has been taken/);
  assert.equal(JSON.stringify(order),before);
 }
});
