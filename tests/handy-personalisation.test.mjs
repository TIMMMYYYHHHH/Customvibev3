import test from 'node:test';
import assert from 'node:assert/strict';
import {validateTemplate} from '../src/designs/templates.mjs';
import {validateOrder} from '../server/submission-model.mjs';
import {orderRecord} from '../server/order-record.mjs';
import {printInstructions} from '../admin/order-archive.mjs';
import {defaultContent} from '../src/content/model.mjs';
const values={handyTemplate:'07-family-week',edition:1,entries:['Swimming','Library','Soccer','Music','Family time']};
const content=structuredClone(defaultContent);content.products.find(p=>p.id==='information').status='available';
const payload=v=>({id:crypto.randomUUID(),createdAt:Math.floor(Date.now()/1000),contact:{name:'Local fixture',email:'test@example.com',phone:'0821234567'},locker:{name:'Test locker',area:'Durban'},consent:true,items:[{id:crypto.randomUUID(),kind:'information',qty:2,printVersion:1,designMode:'self',values:v,files:[{size:2000,sha256:'a'.repeat(64)}]}]});
test('handwritten family-week details survive validation and order capture exactly',()=>{
 assert.deepEqual(validateTemplate('information',values),values);
 const order=validateOrder(payload(values),content,true),record=orderRecord(order,true);
 assert.equal(order.magnetQty,2);assert.equal(record.items[0].faceCount,1);
 assert.match(record.items[0].name,/Family week/);assert.deepEqual(record.items[0].values,values);
 assert.equal(record.items[0].files.length,1);
 const instructions=printInstructions({reference:'LOCAL',snapshot:record,proof:{revision:1,status:'awaiting_approval',digest:'local'}});
 assert.match(instructions,/Monday: Swimming/);assert.match(instructions,/Finished size: 63\.5 × 63\.5 mm/);assert.doesNotMatch(instructions,/DO NOT PRINT|approved proof/);
});
test('handy templates reject unknown editions, field counts, control characters and unsupported glyphs',()=>{
 for(const v of [{...values,edition:2},{...values,handyTemplate:'missing'},{...values,entries:['Only one']},{...values,entries:['a\nb',...values.entries.slice(1)]},{...values,entries:['😀',...values.entries.slice(1)]}]) assert.throws(()=>validateTemplate('information',v));
});
test('entries must fit at their approved readable size instead of silently shrinking',()=>{
 assert.throws(()=>validateTemplate('information',{...values,entries:['WWWWWWWWWWWWWWWW',...values.entries.slice(1)]}),/fit|shorter/i);
});
test('blank fields are intentional, preserve spaces and never inject placeholder copy',()=>{
 const v={handyTemplate:'01-emergency',edition:1,entries:[' 082 123 4567 ','','']};
 assert.deepEqual(validateTemplate('information',v),v);
 assert.deepEqual(validateTemplate('information',{...v,entries:['','','']}).entries,['','','']);
});

test('all nine defaults fit and variants stay separate while an edit keeps the same line and copies',async()=>{
 const {handyDesigns,defaultHandyValues,saveHandyItem}=await import('../src/designs/handy.mjs');
 assert.equal(handyDesigns.length,9);
 for(const d of handyDesigns)assert.deepEqual(validateTemplate('information',defaultHandyValues(d.id)),defaultHandyValues(d.id));
 const first={id:'one',qty:3,values},second={id:'two',qty:1,values:{...values,entries:['Art club',...values.entries.slice(1)]}};
 let basket=saveHandyItem([first],second);assert.equal(basket.length,2);
 const edit={...first,values:{...values,entries:['Tennis',...values.entries.slice(1)]}};
 basket=saveHandyItem(basket,edit);assert.equal(basket.length,2);assert.equal(basket[0].qty,3);assert.equal(basket[0].values.entries[0],'Tennis');assert.equal(basket[1].values.entries[0],'Art club');
});

test('saving an edit preserves the latest basket quantity and cannot resurrect a removed line',async()=>{
 const {saveHandyItem}=await import('../src/designs/handy.mjs');
 const current={id:'one',qty:4,values},stale={...current,qty:2};
 assert.equal(saveHandyItem([current],stale,'one')[0].qty,4);
 assert.throws(()=>saveHandyItem([],stale,'one'),/no longer|removed/i);
});
