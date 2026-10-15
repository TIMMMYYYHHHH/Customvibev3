import test from 'node:test';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {validateContact,validateOrder,orderEmails} from '../server/submission-model.mjs';
import {defaultContent} from '../src/content/model.mjs';
const jpeg=()=>readFileSync('tests/fixtures/print-tile.jpg').toString('base64');
const input=()=>({id:crypto.randomUUID(),createdAt:Math.floor(Date.now()/1000),contact:{name:'Test customer',email:'customer@example.com',phone:'+27821234567'},locker:{name:'Preferred PUDO locker',area:'Durban'},consent:true,items:[{kind:'photo',qty:2,files:[jpeg()]}]});
test('orders use catalogue prices and fixed unpaid status, never client totals',()=>{
 const raw=input();raw.total=1;raw.paymentStatus='paid';const order=validateOrder(raw,defaultContent);
 assert.equal(order.subtotalCents,defaultContent.pricing.single*2);assert.equal(order.paymentStatus,'unpaid');assert.equal(order.deliveryCents,null);
 const emails=orderEmails(order);assert.equal(emails.owner.to[0],'customvibe03@gmail.com');assert.equal(emails.customer.to[0],'customer@example.com');assert.equal(emails.owner.attachments.length,1);assert.match(emails.customer.text,/No payment/);assert.match(emails.customer.text,/not yet accepted/);
});
test('orders reject spoofed images, malformed quantities, unknown products and missing consent',()=>{
 for(const mutate of [x=>x.items[0].files=['PHN2Zy8+'],x=>x.items[0].qty=-1,x=>x.items[0].qty=1.5,x=>x.items[0].kind='invisible-pack',x=>x.consent=false,x=>x.contact.email='a@example.com\r\nBcc: attacker@example.com',x=>x.createdAt=1]){const raw=input();mutate(raw);assert.throws(()=>validateOrder(raw,defaultContent));}
});
test('puzzle requests require each piece and a proof, with deterministic attachment names',()=>{
 const raw=input();raw.items=[{kind:'puzzle',qty:1,gridSize:3,files:Array.from({length:10},jpeg)}];
 const order=validateOrder(raw,defaultContent);assert.equal(order.magnetQty,9);const files=orderEmails(order).owner.attachments;
 assert.equal(files[0].filename,'design-01-proof.jpg');assert.equal(files[1].filename,'design-01-row-1-col-1.jpg');assert.equal(files[9].filename,'design-01-row-3-col-3.jpg');
 raw.items[0].files.pop();assert.throws(()=>validateOrder(raw,defaultContent));
});
test('contact content is validated and cannot alter email headers',()=>{
 const raw={id:crypto.randomUUID(),createdAt:Math.floor(Date.now()/1000),name:'Visitor',email:'visitor@example.com',message:'Please help with my magnets.'};assert.equal(validateContact(raw).email,raw.email);
 for(const patch of [{email:'x@y.com\nBcc: x@z.com'},{message:'x'.repeat(5001)},{name:''},{createdAt:0}])assert.throws(()=>validateContact({...raw,...patch}));
});
test('JPEG validation rejects missing tables, post-scan metadata and trailing data',()=>{
 const valid=readFileSync('tests/fixtures/print-tile.jpg');
 const sos=valid.indexOf(Buffer.from([255,218]));const scan=sos+2+valid.readUInt16BE(sos+2);
 for(const bad of [Buffer.from([255,216,255,219,0,2,255,196,0,2,255,192,0,11,8,4,176,4,176,1,1,17,0,255,218,0,8,1,1,0,0,63,0,1,255,217]),Buffer.concat([valid.subarray(0,scan),Buffer.from([255,225,0,8,69,120,105,102,0,0]),valid.subarray(scan)]),Buffer.concat([valid,Buffer.from('extra')]),Buffer.from([255,216,255,192,0,11,8,4,176,4,176,1,1,17,0,255,218,0,8,1,1,0,0,63,0,1,255,217])]){
  const raw=input();raw.items[0].files=[bad.toString('base64')];assert.throws(()=>validateOrder(raw,defaultContent));
 }
});
