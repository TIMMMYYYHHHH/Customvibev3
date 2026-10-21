import test from 'node:test';
import assert from 'node:assert/strict';
import {businessDesigns,sampleBusinessValues,validateBusinessValues,businessPayload,businessMatrix} from '../src/designs/business.mjs';
import {validateTemplate} from '../src/designs/templates.mjs';
import {validateOrder} from '../server/submission-model.mjs';
import {orderRecord} from '../server/order-record.mjs';
import {printInstructions} from '../admin/order-archive.mjs';
import {defaultContent} from '../src/content/model.mjs';
test('all nine business designs validate and keep exact print details through private orders',()=>{
 const content=structuredClone(defaultContent);content.products.find(p=>p.id==='business').status='available';
 assert.equal(businessDesigns.length,9);
 for(const design of businessDesigns){
 const values=sampleBusinessValues(design.id);assert.deepEqual(validateTemplate('business',values),values);
 const order=validateOrder({id:crypto.randomUUID(),createdAt:Math.floor(Date.now()/1000),contact:{name:'Local fixture',email:'test@example.com',phone:'0821234567'},locker:{name:'Test locker',area:'Durban'},consent:true,items:[{id:crypto.randomUUID(),kind:'business',qty:3,printVersion:1,designMode:'self',values,files:[{size:2000,sha256:'a'.repeat(64)}]}]},content,true);
 const record=orderRecord(order,true);assert.deepEqual(record.items[0].values,values);assert.equal(record.magnetQty,3);assert.match(record.items[0].name,new RegExp(design.name));
 const instructions=printInstructions({reference:'LOCAL',snapshot:record,proof:{revision:1,status:'awaiting_approval',digest:'local'}});
 assert.ok(instructions.includes(values.entries[0]));assert.match(instructions,/Finished size: 63\.5 × 63\.5 mm/);assert.doesNotMatch(instructions,/DO NOT PRINT|approved proof/);
 }
});
test('business QR rejects unsafe links, excessive density and mismatched QR modes',()=>{
 const values=sampleBusinessValues('02-salon');
 for(const url of ['javascript:alert(1)','https://user:password@example.com','file:///tmp/file','https://example.com/'+'x'.repeat(250)])assert.throws(()=>validateBusinessValues({...values,qr:{mode:'url',url}}));
 assert.throws(()=>validateBusinessValues({...values,qr:{mode:'wifi',network:'Cafe',password:'password',security:'WPA'}}));
 assert.throws(()=>validateBusinessValues({...values,edition:2}));
 assert.throws(()=>validateBusinessValues({...values,entries:['']}));
 assert.throws(()=>validateBusinessValues({...values,entries:['A\nB']}));
 assert.ok(businessMatrix(values).size<=49);
});
test('Wi-Fi retains exact network/password, escapes delimiters and can switch to a portal',()=>{
 const values={...sampleBusinessValues('04-wifi'),qr:{mode:'wifi',network:'Guest; Cafe',password:' pass:123 ',security:'WPA'}};
 assert.deepEqual(validateBusinessValues(values),values);
 assert.equal(businessPayload(values),'WIFI:T:WPA;S:Guest\\; Cafe;P: pass\\:123 ;;');
 assert.equal(businessPayload({...values,qr:{mode:'url',url:'https://customvibe.co.za'}}),'https://customvibe.co.za');
 assert.equal(validateBusinessValues({...values,qr:{mode:'wifi',network:'Guest',password:'unused',security:'nopass'}}).qr.password,'');
});
