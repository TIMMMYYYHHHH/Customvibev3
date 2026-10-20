import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const built=await build({entryPoints:['admin/OrderDetail.jsx'],bundle:true,write:false,format:'cjs',platform:'node',external:['react'],logLevel:'silent'});
const mod={exports:{}};new Function('require','module','exports',built.outputFiles[0].text)(createRequire(import.meta.url),mod,mod.exports);
const now=Math.floor(Date.now()/1000),acceptedAt=1792400400;
const delivery=(extra={})=>({purpose:'owner-notification',attempt:'synthetic-owner-attempt',acceptedAt,expiresAt:now+3600,state:'delivered',reason:'server-accepted',complaint:false,...extra});
const order=(extra={})=>({id:'11111111-1111-4111-8111-111111111111',reference:'CV-SYNTHETIC',version:2,status:'new',expires:now+86400,artworkExpires:now+3600,ownerSent:true,receiptSent:true,history:[],updates:[],snapshot:{contact:{name:'Synthetic fixture only',email:'synthetic@example.invalid',phone:'0000000000'},locker:{name:'Synthetic locker',area:'Fixture'},magnetQty:1,subtotalCents:100,items:[]},...extra});
const render=value=>renderToStaticMarkup(React.createElement(mod.exports.default,{order:value,onChange:()=>{}}));
const activity=html=>html.slice(html.indexOf('<section id="order-activity"'));

test('actual OrderDetail separates initial acceptance from every fixed delivery state',()=>{
 const cases=[['unconfirmed','no-delivery-evidence','Delivery unconfirmed'],['unconfirmed','provider-accepted','Delivery unconfirmed'],['delayed','delivery-delayed','Delivery delayed'],['delivered','server-accepted','Recipient server accepted'],['failed','delivery-bounced','Delivery failed: bounced'],['failed','delivery-failed','Delivery failed'],['failed','delivery-suppressed','Delivery failed: suppressed'],['needs-review','conflicting-outcomes','Needs review'],['needs-review','event-id-conflict','Needs review'],['needs-review','evidence-capacity','Needs review']];
 for(const purpose of ['owner-notification','customer-receipt','manual-update'])for(const [state,reason,label] of cases){const html=activity(render(order({mailDelivery:[delivery({purpose,state,reason})],updates:purpose==='manual-update'?[{attempt:'synthetic-owner-attempt',version:1,status:'in_progress',state:'accepted',updated:acceptedAt}]:[]})));assert.match(html,/Owner email/);assert.match(html,/provider accepted/i);assert.ok(html.includes(label),`${purpose}/${state}/${reason} must show ${label}`);}
});
test('initial customer receipt and exact manual attempt receive their own outcome',()=>{
 const html=activity(render(order({mailDelivery:[delivery({purpose:'customer-receipt',state:'delayed',reason:'delivery-delayed'}),delivery({purpose:'manual-update',attempt:'synthetic-manual',state:'failed',reason:'delivery-bounced'})],updates:[{attempt:'synthetic-manual',version:1,status:'in_progress',state:'accepted',acceptedAt,updated:acceptedAt}]})));
 assert.match(html,/Customer order email/);assert.match(html,/Delivery delayed/);assert.match(html,/In progress email[\s\S]*Provider accepted[\s\S]*Delivery failed: bounced/);
 assert.doesNotMatch(activity(render(order({mailDelivery:[delivery({purpose:'manual-update',attempt:'unmatched',state:'failed',reason:'delivery-bounced'})],updates:[{attempt:'different',version:1,status:'in_progress',state:'accepted',updated:acceptedAt}]}))),/Delivery failed/);
});
test('complaint remains visible alongside established delivery and failure',()=>{
 for(const [state,label] of [['delivered','Recipient server accepted'],['failed','Delivery failed'],['needs-review','Needs review']]){const html=activity(render(order({mailDelivery:[delivery({state,reason:'delivery-complaint',complaint:true})]})));assert.ok(html.includes(label));assert.match(html,/Complaint reported/);assert.match(html,/Provider accepted/);}
});
test('absent, legacy, expired and malformed projections do not fabricate outcomes or erase acceptance',()=>{
 for(const mailDelivery of [undefined,[],[delivery({expiresAt:now})],[delivery({expiresAt:now-1})],[delivery({purpose:'unknown'})],[delivery({state:'unknown'})],null]){const html=activity(render(order({mailDelivery})));assert.match(html,/provider accepted|Provider accepted/);assert.doesNotMatch(html,/Recipient server accepted|Delivery unconfirmed|Delivery delayed|Delivery failed|Needs review/);}
});
test('new projection output excludes identifiers, arbitrary diagnostics and guessed event time',()=>{
 const secret='PRIVATE_SENTINEL_DO_NOT_RENDER';const html=activity(render(order({mailDelivery:[delivery({providerMessageId:secret,reference:secret,recipientDigest:secret,source:secret,occurredAt:secret,checkedAt:secret,observations:[secret],diagnostics:secret})]})));
 assert.match(html,/Recipient server accepted/);assert.doesNotMatch(html,new RegExp(secret));assert.doesNotMatch(html,/Delivered at|Checked at/);
});
test('actual component retains manual preview access and never calls an external service during render',()=>{
 const previous=globalThis.fetch;let calls=0;globalThis.fetch=()=>{calls++;throw Error('External calls forbidden')};
 try{const html=render(order({mailDelivery:[delivery()]}));assert.match(html,/>Preview update<\/button>/);assert.match(html,/>View send history<\/a>/);assert.equal(calls,0);}finally{globalThis.fetch=previous;}
});

test('payload projection rejects ambiguous, inherited and invalid facts without leaking them',async()=>{
 const {mailDeliveryDetail}=await import('../admin/mail-delivery.mjs');
 for(const row of [delivery({state:'delivered',reason:'__proto__'}),delivery({state:'toString'}),delivery({acceptedAt:now+1}),delivery({acceptedAt:0}),delivery({complaint:'yes'}),delivery({reason:'delivery-complaint',complaint:false}),delivery({expiresAt:acceptedAt}),delivery({attempt:null})])assert.equal(mailDeliveryDetail([row],'owner-notification',null,now),null);
 assert.equal(mailDeliveryDetail([delivery(),delivery()],'owner-notification',null,now),null);
 const safe=mailDeliveryDetail([delivery({providerMessageId:'PRIVATE',reference:'PRIVATE',recipientDigest:'PRIVATE'})],'owner-notification',null,now);
 assert.deepEqual(safe,{label:'Recipient server accepted',acceptedAt,complaint:false,source:null,checkedAt:null,occurredAt:null});
});
test('actual rendered provenance uses SAST and never substitutes check time for missing event time',()=>{
 const timed=activity(render(order({mailDelivery:[delivery({source:'webhook',checkedAt:acceptedAt+600,occurredAt:acceptedAt-60})]})));
 assert.match(timed,/Webhook checked 19 Oct 2026, 11:10/);assert.match(timed,/Event time 19 Oct 2026, 10:59/);assert.match(timed,/Provider accepted · 19 Oct 2026, 11:00/);
 const untimed=activity(render(order({mailDelivery:[delivery({source:'manual-check',checkedAt:acceptedAt+600,occurredAt:null})]})));
 assert.match(untimed,/Owner dashboard checked 19 Oct 2026, 11:10/);assert.doesNotMatch(untimed,/Event time/);
 const absent=activity(render(order({mailDelivery:[delivery({source:null,checkedAt:acceptedAt+600,occurredAt:acceptedAt-60})]})));
 assert.doesNotMatch(absent,/Webhook checked|Owner dashboard checked|Event time/);
});
test('review, complaint and unobserved receipts never receive an invented event timestamp',async()=>{
 const {mailDeliveryDetail}=await import('../admin/mail-delivery.mjs');
 for(const extra of [{state:'needs-review',reason:'conflicting-outcomes'},{reason:'delivery-complaint',complaint:true}]){const result=mailDeliveryDetail([delivery({source:'webhook',checkedAt:acceptedAt+60,occurredAt:acceptedAt,...extra})],'owner-notification',null,now);assert.equal(result.occurredAt,null);}
 const result=mailDeliveryDetail([delivery({state:'unconfirmed',reason:'no-delivery-evidence',source:'webhook',checkedAt:acceptedAt+60,occurredAt:acceptedAt})],'owner-notification',null,now);assert.equal(result.source,null);assert.equal(result.checkedAt,null);assert.equal(result.occurredAt,null);
});
