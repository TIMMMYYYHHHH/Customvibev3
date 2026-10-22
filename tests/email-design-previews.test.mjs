import {withShippingAgreement} from './helpers/shipping.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateOrder,orderEmails,fingerprintPayload} from '../server/submission-model.mjs';
import {orderRecord} from '../server/order-record.mjs';
import {defaultContent} from '../src/content/model.mjs';
const smallJpeg=()=>readFileSync('tests/fixtures/email-design-preview.jpg').toString('base64');
const request=()=>({id:'22222222-2222-4222-8222-222222222222',createdAt:Math.floor(Date.now()/1000),contact:{name:'Synthetic <test>',email:'synthetic@example.invalid',phone:'0123456789'},locker:{name:'Synthetic locker',area:'Test'},consent:true,items:[{kind:'photo',qty:3,files:[{size:2000,sha256:'a'.repeat(64)}],emailPreview:smallJpeg()}],emailPreviewVersion:1});
test('initial owner and customer emails share labelled bounded previews without storing image bytes',()=>{
 const order=validateOrder(withShippingAgreement(request(),defaultContent),defaultContent,true);
 assert.equal(order.emailPreviewVersion,1);assert.equal(order.items[0].emailPreview,smallJpeg());
 const pair=orderEmails(order,true);
 for(const mail of Object.values(pair)){
  assert.match(mail.html,/Design previews/);assert.match(mail.html,/Low-resolution previews/);assert.match(mail.html,/3 copies/);assert.match(mail.html,/cid:cv-design-1/);
  assert.match(mail.html,/alt="Preview of Your photo magnets/);assert.match(mail.html,/Unpaid/);assert.doesNotMatch(mail.html,/src="https:|approval required|Approve artwork/i);
  const images=mail.attachments.filter(a=>a.content_id?.startsWith('cv-design-'));assert.equal(images.length,1);assert.equal(images[0].content,smallJpeg());assert.equal(images[0].content_type,'image/jpeg');
  assert.match(mail.text,/Design previews/);assert.match(mail.text,/3 copies/);assert.ok(Buffer.byteLength(mail.html)<100000);
 }
 assert.doesNotMatch(pair.customer.html,/admin.customvibe/);
 const snapshot=orderRecord(order,true);assert.equal(snapshot.emailPreviewVersion,undefined);assert.equal(snapshot.items[0].emailPreview,undefined);assert.ok(!JSON.stringify(snapshot).includes(smallJpeg()));
 assert.notEqual(fingerprintPayload(order),fingerprintPayload({...order,items:order.items.map(({emailPreview,...item})=>item)}));
});
test('malformed, large, full-resolution and excessive preview data fail validation before sending',()=>{
 const jpeg=smallJpeg();
 for(const emailPreview of ['',{},'not jpeg',readFileSync('tests/fixtures/print-tile.jpg').toString('base64'),jpeg+'AAAA'])assert.throws(()=>validateOrder(withShippingAgreement({...request(),items:[{...request().items[0],emailPreview}]},defaultContent),defaultContent,true));
 assert.throws(()=>validateOrder(withShippingAgreement({...request(),emailPreviewVersion:2},defaultContent),defaultContent,true));
 assert.throws(()=>validateOrder(withShippingAgreement({...request(),emailPreviewVersion:undefined},defaultContent),defaultContent,true));
 assert.throws(()=>validateOrder(withShippingAgreement({...request(),items:Array.from({length:13},()=>({...request().items[0]}))},defaultContent),defaultContent,true));
});
test('legacy orders retain absent-preview shape and new orders explain omitted previews without hiding quantities',()=>{
 const original=request();delete original.emailPreviewVersion;delete original.items[0].emailPreview;
 const legacy=validateOrder(withShippingAgreement(original,defaultContent),defaultContent,true);assert.equal(Object.hasOwn(legacy,'emailPreviewVersion'),false);assert.equal(Object.hasOwn(legacy.items[0],'emailPreview'),false);assert.doesNotMatch(orderEmails(legacy,true).customer.html,/Design previews/);
 const modern=validateOrder(withShippingAgreement({...original,emailPreviewVersion:1,items:[...original.items,{kind:'photo',qty:2,files:[{size:2000,sha256:'b'.repeat(64)}],emailPreview:smallJpeg()}]},defaultContent),defaultContent,true);
 const mail=orderEmails(modern,true).customer;assert.match(mail.text,/1 of 2/);assert.match(mail.text,/5 magnets/);assert.match(mail.text,/3 copies/);assert.match(mail.text,/2 copies/);
 const unavailable=orderEmails(validateOrder(withShippingAgreement({...original,emailPreviewVersion:1},defaultContent),defaultContent,true),true).customer;assert.match(unavailable.text,/No design previews/);assert.match(unavailable.text,/3 copies/);
});
test('preview wire fitting measures UTF-8 envelopes once and preserves the original attempt',async()=>{
 const module=await import('../src/email-design-previews.mjs').catch(()=>({}));assert.equal(typeof module.fitEmailDesignPreviews,'function');
 const attempt={...request(),notes:'🧩'.repeat(33000),items:Array.from({length:13},()=>({...request().items[0]}))};
 const original=JSON.stringify(attempt),fit=module.fitEmailDesignPreviews(attempt);
 assert.equal(JSON.stringify(attempt),original);assert.ok(fit.items.filter(i=>i.emailPreview).length<13);
 assert.ok(new TextEncoder().encode(JSON.stringify({payload:fit,turnstile:'x'.repeat(2048),grant:'x'.repeat(1024),resume:'x'.repeat(1024),website:''})).length<=150000);
 const legacy={...attempt,items:attempt.items.map(({emailPreview,...item})=>item)};delete legacy.emailPreviewVersion;
 assert.equal(module.fitEmailDesignPreviews(legacy),legacy);
 const oversized={...attempt,notes:'🧩'.repeat(40000)};const without=module.fitEmailDesignPreviews(oversized);assert.equal(without.items.filter(i=>i.emailPreview).length,0);
});
test('selected collection quantities are multiplied into exact preview copy labels',()=>{
 const content=structuredClone(defaultContent);content.products.forEach(p=>p.status='available');
 const order=validateOrder(withShippingAgreement({...request(),items:[{id:'33333333-3333-4333-8333-333333333333',printVersion:1,kind:'alphabet',qty:3,designIds:['alphabet-1','alphabet-2'],designQuantities:[2,3],files:Array.from({length:2},()=>({size:2000,sha256:'a'.repeat(64)})),emailPreview:smallJpeg()}]},content),content,true);
 const mail=orderEmails(order,true).customer;assert.match(mail.text,/5 magnets per set/);assert.match(mail.text,/A: 6 copies/);assert.match(mail.text,/B: 9 copies/);
});
test('one selected collection design uses its multiplied copy count in both initial emails',()=>{
 const content=structuredClone(defaultContent);content.products.forEach(p=>p.status='available');
 const order=validateOrder(withShippingAgreement({...request(),items:[{id:'33333333-3333-4333-8333-333333333333',printVersion:1,kind:'alphabet',qty:3,designIds:['alphabet-1'],designQuantities:[2],files:[{size:2000,sha256:'a'.repeat(64)}],emailPreview:smallJpeg()}]},content),content,true);
 assert.equal(order.magnetQty,6);
 for(const mail of Object.values(orderEmails(order,true))){assert.match(mail.text,/A: 6 copies/);assert.match(mail.html,/A: 6 copies/);assert.match(mail.text,/2 magnets per set/);}
});

test('one selected face per set keeps singular magnet wording and exact total copies',()=>{
 const content=structuredClone(defaultContent);content.products.forEach(p=>p.status='available');
 const order=validateOrder(withShippingAgreement({...request(),items:[{id:'33333333-3333-4333-8333-333333333333',printVersion:1,kind:'alphabet',qty:3,designIds:['alphabet-1'],designQuantities:[1],files:[{size:2000,sha256:'a'.repeat(64)}],emailPreview:smallJpeg()}]},content),content,true);
 for(const mail of Object.values(orderEmails(order,true))){assert.match(mail.text,/1 magnet per set/);assert.match(mail.text,/A: 3 copies/);assert.doesNotMatch(mail.text,/1 magnets/);}
});

test('preview dimension bounds and metadata checks do not depend only on byte limits',()=>{
 for(const edge of [1,63,161,1200]){const bytes=Buffer.from(smallJpeg(),'base64'),at=bytes.indexOf(Buffer.from([255,192]));bytes.writeUInt16BE(edge,at+5);bytes.writeUInt16BE(edge,at+7);assert.throws(()=>validateOrder(withShippingAgreement({...request(),items:[{...request().items[0],emailPreview:bytes.toString('base64')}]},defaultContent),defaultContent,true));}
 const bytes=Buffer.from(smallJpeg(),'base64');const tagged=Buffer.concat([bytes.subarray(0,2),Buffer.from([255,225,0,2]),bytes.subarray(2)]).toString('base64');assert.throws(()=>validateOrder(withShippingAgreement({...request(),items:[{...request().items[0],emailPreview:tagged}]},defaultContent),defaultContent,true));
});
