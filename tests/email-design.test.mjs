import test from 'node:test';
import assert from 'node:assert/strict';
import {orderEmails} from '../server/submission-model.mjs';
import {orderUpdateEmail} from '../server/order-update-email.mjs';
const fixture=()=>({id:'824943b6-81ca-42cf-8ab1-92b2c85394fe',referenceVersion:1,contact:{name:'Alex <img src=x onerror=alert(1)>',email:'alex@example.com',phone:'+27 00 000 0000'},locker:{name:'A & B',area:'<Durban>'},items:[{kind:'photo',name:'Photo <test>',qty:2,files:['jpeg']},{kind:'puzzle',name:'Puzzle magnets',gridSize:3,qty:2,files:[]}],magnetQty:20,subtotalCents:80000,deliveryCents:null,paymentStatus:'unpaid'});
test('shared email preserves quantities, unpaid facts and escapes customer fields',()=>{
 const {owner,customer}=orderEmails(fixture(),true);
 for(const mail of [owner,customer]){
  assert.match(mail.text,/2 sets.*18 magnets/);
  assert.match(mail.html,/2 sets/);assert.match(mail.html,/>18</);
  assert.match(mail.text,/No payment has been taken/);assert.match(mail.html,/Unpaid/);
  assert.doesNotMatch(mail.text,/not yet accepted|Payment received|payment was successful/);
  assert.ok(!mail.html.includes('<img src=x'));assert.match(mail.html,/&lt;test&gt;/);
  assert.match(mail.html,/&lt;Durban&gt;/);assert.ok(Buffer.byteLength(mail.html)<100000);
 }
 assert.match(owner.html,/https:\/\/admin.customvibe.co.za\/artwork\?request=/);
 assert.doesNotMatch(customer.html,/admin.customvibe|1200|customvibe03/);
 assert.equal(owner.reply_to,'alex@example.com');assert.equal(customer.reply_to,'orders@customvibe.co.za');
});
test('inline branding is self-contained and never replaces legacy print attachments',()=>{
 const {owner,customer}=orderEmails(fixture(),false);
 assert.equal(owner.attachments.filter(a=>!a.content_id).length,1);
 assert.equal(owner.attachments.find(a=>!a.content_id).content,'jpeg');
 for(const mail of [owner,customer,orderUpdateEmail({reference:'CV-000042',status:'new',version:2,snapshot:fixture()})]){
  const ids=[...mail.html.matchAll(/src="cid:([^"]+)"/g)].map(m=>m[1]);assert.ok(ids.length>=2);
  for(const id of ids){const asset=mail.attachments.find(a=>a.content_id===id);assert.ok(asset);assert.equal(asset.content_type,'image/png');assert.equal(Buffer.from(asset.content,'base64').subarray(1,4).toString(),'PNG');}
  assert.doesNotMatch(mail.html,/<svg|src="https:|src="data:/);assert.match(mail.text,/From our tribe to yours\./);
 }
});
test('each saved stage has consistent preview facts without inventing payment or shipping',()=>{
 for(const status of ['new','in_progress','ready_to_ship','shipped']){
  const mail=orderUpdateEmail({reference:'CV-000042',status,version:7,snapshot:fixture()});
  assert.equal(mail.version,7);assert.equal(mail.to,'alex@example.com');assert.match(mail.html,/CV-000042/);assert.match(mail.text,/20/);
  assert.match(mail.html,/Unpaid/);assert.doesNotMatch(mail.html,/Payment received|payment was successful/);
  assert.ok(!mail.html.includes('<img src=x'));assert.doesNotMatch(mail.text,/tracking number|booked|delivery date/i);
  if(status==='ready_to_ship')assert.match(mail.text,/when they have been dispatched/);
 }
});
test('catalogue quantities cannot be misrepresented as individual magnets',()=>{
 const order={...fixture(),items:[{kind:'alphabet',name:'Alphabet pack',qty:2,files:[]}],magnetQty:52};
 const mail=orderEmails(order,true).customer;
 assert.doesNotMatch(mail.text,/Alphabet pack:.*= 2 magnets/);
 assert.match(mail.text,/Alphabet pack: 2 units/);assert.match(mail.text,/52 magnets in total/);
 assert.doesNotMatch(mail.html,/>2<\/td>/);
});
test('essential email headings and branding remain readable without image loading',()=>{
 const pair=orderEmails(fixture(),true);
 const variants=[pair.customer,pair.owner,...['new','in_progress','ready_to_ship','shipped'].map(status=>orderUpdateEmail({reference:'CV-000042',status,version:1,snapshot:fixture()}))];
 for(const mail of variants){
  const withoutImages=mail.html.replace(/<img\b[^>]*>/g,'');
  const heading=withoutImages.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)?.[1].replace(/<[^>]+>/g,'').trim();
  assert.ok(heading?.length>10,'Order heading must be live text, not a fixed-background image');
  assert.match(withoutImages,/From our tribe to yours\./);
  assert.match(withoutImages,/>CustomVibe<\/span>/);
 }
});
test('one magnet is singular in customer and owner HTML and plain text',()=>{
 const one={...fixture(),items:[{kind:'photo',name:'Photo magnet',qty:1,files:[]}],magnetQty:1};
 for(const mail of Object.values(orderEmails(one,true))){
  assert.doesNotMatch(mail.text,/\b1 magnets\b/);assert.doesNotMatch(mail.html,/\b1 magnets\b/);
  assert.match(mail.text,/1 magnet in total/);assert.match(mail.html,/1 magnet in total/);
 }
});
