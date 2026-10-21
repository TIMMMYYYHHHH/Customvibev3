import test from 'node:test';import assert from 'node:assert/strict';
import {validateOrder,orderEmails,fingerprintPayload} from '../server/submission-model.mjs';
import {orderRecord} from '../server/order-record.mjs';import {printInstructions} from '../admin/order-archive.mjs';import {defaultContent} from '../src/content/model.mjs';
const request=()=>({id:'22222222-2222-4222-8222-222222222222',createdAt:Math.floor(Date.now()/1000),contact:{name:'Example',email:'example@example.com',phone:'0123456789'},locker:{name:'Locker',area:'Durban'},consent:true,items:[{kind:'photo',qty:1,files:[{size:2000,sha256:'a'.repeat(64)}]}]});
test('order notes reach the private record, email summaries and print instructions safely',()=>{
 const notes='Please centre the logo.\nKeep <script>alert(1)</script> as literal text.';
 const order=validateOrder({...request(),notes},defaultContent,true);assert.equal(order.notes,notes);
 const snapshot=orderRecord(order,true);assert.equal(snapshot.notes,notes);assert.equal(snapshot.approvalRequired,undefined);
 const mail=orderEmails(order,true);assert.ok(mail.owner.text.includes(notes));assert.ok(mail.customer.text.includes(notes));assert.match(mail.owner.html,/&lt;script&gt;/);assert.doesNotMatch(mail.owner.html,/<script>alert/);
 assert.ok(printInstructions({reference:'CV-123456',snapshot,proof:{revision:1,status:'awaiting_approval',digest:'abc'}}).includes(notes));
});
test('notes are optional, bounded and included in the immutable retry fingerprint',()=>{
 const base=validateOrder(request(),defaultContent,true);assert.equal(Object.hasOwn(base,'notes'),false);
 const blank=validateOrder({...request(),notes:'  \n '},defaultContent,true);assert.equal(Object.hasOwn(blank,'notes'),false);
 for(const notes of [3,{},'a'.repeat(1001),'bad\u0000note'])assert.throws(()=>validateOrder({...request(),notes},defaultContent,true));
 assert.equal(validateOrder({...request(),notes:'  Two copies please.  '},defaultContent,true).notes,'Two copies please.');
 assert.notEqual(fingerprintPayload(base),fingerprintPayload({...base,notes:'Use the crop shown.'}));
});
