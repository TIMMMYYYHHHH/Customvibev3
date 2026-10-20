import test from 'node:test';
import assert from 'node:assert/strict';
import {reconcileMailDelivery as reduceDelivery} from '../server/mail-delivery.mjs';

// Every model call proves that workflow inputs stay untouched. The network guard
// turns any accidental real fetch into a failing test before it can leave here.
let fetchCalls=0;const originalFetch=globalThis.fetch;
test.before(()=>{globalThis.fetch=()=>{fetchCalls++;throw Error('Offline model must not fetch')}});
test.after(()=>{globalThis.fetch=originalFetch;assert.equal(fetchCalls,0)});
const reconcileMailDelivery=input=>{
 const selected=()=>({receipt:input.receipt,observation:input.observation,prior:input.prior,now:input.now});
 const before=structuredClone(selected());const result=reduceDelivery(input);
 assert.deepEqual(selected(),before);return result;
};

const acceptedAt=1792400000, now=acceptedAt+120;
// Released receipt row shapes from mail-receipts.test.mjs, with synthetic IDs.
const initialRow={id:'a'.repeat(64),reservation:'initial-reservation',kind:'order',expires:acceptedAt+172800,owner_sent:1,receipt_sent:1,owner_provider_id:'owner-accepted_1',owner_accepted_at:acceptedAt,receipt_provider_id:'customer-accepted_2',receipt_accepted_at:acceptedAt};
const manualRow={order_id:'synthetic-order',version:0,attempt:'manual-reservation',state:'accepted',provider_message_id:'manual-accepted_1',accepted_at:acceptedAt};
const initial=(prefix,purpose)=>({state:'accepted',providerMessageId:initialRow[prefix+'_provider_id'],acceptedAt:initialRow[prefix+'_accepted_at'],purpose,reference:initialRow.id,attempt:initialRow.reservation,expiresAt:initialRow.expires});
const owner=initial('owner','owner-notification'), customer=initial('receipt','customer-receipt');
const manual={state:manualRow.state,providerMessageId:manualRow.provider_message_id,acceptedAt:manualRow.accepted_at,purpose:'manual-update',reference:manualRow.order_id,attempt:manualRow.attempt,expiresAt:acceptedAt+14*86400};
const observation=(receipt=manual,extra={})=>({providerMessageId:receipt.providerMessageId,purpose:receipt.purpose,reference:receipt.reference,attempt:receipt.attempt,source:'webhook',type:'email.delivered',eventId:'evt-delivered',occurredAt:acceptedAt+10,checkedAt:now,...extra});
const apply=(extra={})=>reconcileMailDelivery({receipt:manual,observation:observation(),now,...extra});
const chain=(events,receipt=manual)=>events.reduce((prior,event)=>reconcileMailDelivery({receipt,observation:observation(receipt,event),prior,now}).delivery,null);

test('owner/customer/manual released receipt identities preserve acceptance independently',()=>{
 for(const receipt of [owner,customer,manual]){
  const result=apply({receipt,observation:observation(receipt)});
  assert.equal(result.disposition,'updated');assert.equal(result.delivery.state,'delivered');
  assert.equal(result.delivery.acceptedAt,acceptedAt);assert.equal(result.delivery.expiresAt,receipt.expiresAt);
  assert.equal(result.delivery.providerMessageId,receipt.providerMessageId);
 }
});
test('each message, purpose, reference and attempt must match exactly',()=>{
 for(const field of ['providerMessageId','purpose','reference','attempt']){
  const result=apply({observation:observation(manual,{[field]:'other'})});
  assert.deepEqual(result,{disposition:'unmatched',reason:'identity-mismatch',delivery:null});
 }
 for(const receipt of [owner,customer])assert.equal(apply({receipt}).disposition,'unmatched');
});
test('missing, legacy, uncertain, rejected and malformed receipts cannot gain acceptance',()=>{
 for(const receipt of [null,{}, {...manual,state:'uncertain'},{...manual,state:'failed'},...['providerMessageId','acceptedAt','attempt'].map(field=>({...manual,[field]:null})),{...manual,providerMessageId:'x'.repeat(129)},{...manual,providerMessageId:'person@example.invalid'},{...manual,acceptedAt:now+1},{...manual,expiresAt:acceptedAt}]){
  assert.deepEqual(apply({receipt}),{disposition:'unmatched',reason:'receipt-unavailable',delivery:null});
 }
});
test('valid boundary provider IDs are accepted, never trimmed or widened',()=>{
 for(const id of ['x','x'.repeat(128),'A_0-z']){
  const receipt={...manual,providerMessageId:id};assert.equal(apply({receipt,observation:observation(receipt)}).delivery.state,'delivered');
 }
 for(const id of ['',42,' has-space','line\nbreak','x'.repeat(129)])assert.equal(apply({receipt:{...manual,providerMessageId:id}}).delivery,null);
});
test('fixed delivery states do not claim inbox receipt or convert failures into send rejection',()=>{
 const cases=[['email.sent','unconfirmed','provider-accepted'],['email.delivery_delayed','delayed','delivery-delayed'],['email.delivered','delivered','server-accepted'],['email.bounced','failed','delivery-bounced'],['email.failed','failed','delivery-failed'],['email.suppressed','failed','delivery-suppressed'],['email.complained','needs-review','delivery-complaint']];
 for(const [type,state,reason] of cases){const result=apply({observation:observation(manual,{type})});assert.equal(result.delivery.state,state);assert.equal(result.delivery.reason,reason);assert.equal(result.delivery.acceptedAt,acceptedAt);}
 const unknown=apply({observation:null});assert.equal(unknown.delivery.state,'unconfirmed');assert.equal(unknown.delivery.reason,'no-delivery-evidence');
});
test('unknown sources, enums, opened/clicked and malformed times are rejected without reflecting raw data',()=>{
 const prior=apply().delivery;
 const invalid=[{type:'email.opened'},{type:'email.clicked'},{type:'raw_failure person@example.invalid'},{source:'provider-webhook-success'},{checkedAt:now+1},{checkedAt:0},{checkedAt:'today'},{occurredAt:now+1},{occurredAt:0},{occurredAt:1.5},{occurredAt:null},{eventId:'bad@example.invalid'},{eventId:'x'.repeat(129)},{eventId:null},{occurredAt:undefined},{source:'manual-check',eventId:'unexpected'}];
 for(const extra of invalid){const result=apply({prior,observation:observation(manual,extra)});assert.equal(result.disposition,'ignored');assert.equal(result.reason,'invalid-observation');assert.deepEqual(result.delivery,prior);}
});
test('sent/delayed evidence cannot regress established delivery or failure in either arrival order',()=>{
 for(const terminal of ['email.delivered','email.bounced','email.failed','email.suppressed'])for(const weak of ['email.sent','email.delivery_delayed']){
  const a={type:terminal,eventId:'terminal',occurredAt:acceptedAt+20};
  const b={type:weak,eventId:'weak',occurredAt:acceptedAt+30};
  assert.equal(chain([a,b]).state,terminal==='email.delivered'?'delivered':'failed');
  assert.deepEqual(chain([a,b]),chain([b,a]));
 }
 assert.equal(chain([{type:'email.delivery_delayed',eventId:'delay'},{type:'email.delivered',eventId:'delivery',occurredAt:acceptedAt+30}]).state,'delivered');
});
test('contradictory terminal outcomes stay reviewable regardless of arrival order or event time',()=>{
 for(const occurredAt of [acceptedAt+10,acceptedAt+30]){
  const a={type:'email.delivered',eventId:'delivery'}, b={type:'email.bounced',eventId:'bounce',occurredAt};
  const forward=chain([a,b]),backward=chain([b,a]);assert.deepEqual(forward,backward);assert.equal(forward.state,'needs-review');assert.equal(forward.reason,'conflicting-outcomes');
  assert.equal(chain([a,b,{type:'email.delivered',eventId:'delivery-later',occurredAt:acceptedAt+40}]).state,'needs-review');
 }
 const failures=chain([{type:'email.failed',eventId:'failure'},{type:'email.suppressed',eventId:'suppressed'}]);assert.equal(failures.reason,'conflicting-outcomes');
});
test('a complaint preserves established delivery while requiring owner review',()=>{
 const delivered={eventId:'delivery'},complaint={type:'email.complained',eventId:'complaint',occurredAt:acceptedAt+30};
 const state=chain([delivered,complaint]);assert.equal(state.state,'delivered');assert.equal(state.complaint,true);assert.equal(state.reason,'delivery-complaint');assert.deepEqual(state,chain([complaint,delivered]));
});
test('exact event replays are no-ops and conflicting reuse is reviewable without storing the new payload',()=>{
 const prior=apply().delivery;
 const replay=apply({prior,observation:observation(manual,{checkedAt:now+1}),now:now+1});assert.equal(replay.disposition,'unchanged');assert.equal(replay.reason,'duplicate-event');assert.deepEqual(replay.delivery,prior);
 const collision=apply({prior,observation:observation(manual,{type:'email.bounced'})});assert.equal(collision.delivery.state,'needs-review');assert.equal(collision.delivery.reason,'event-id-conflict');assert.equal(collision.delivery.observations.length,1);
 assert.equal(apply({prior:collision.delivery,observation:observation(manual,{eventId:'later'})}).delivery.reason,'event-id-conflict');
});
test('status-only manual checks retain checked time without inventing event or delivery time',()=>{
 const manualCheck={source:'manual-check',eventId:undefined,occurredAt:undefined,checkedAt:now};
 const checked=apply({observation:observation(manual,manualCheck)}).delivery;
 assert.equal(checked.state,'delivered');assert.equal(checked.observations[0].occurredAt,null);assert.equal(checked.observations[0].checkedAt,now);
 const timed={eventId:'timed-failure',type:'email.bounced',occurredAt:acceptedAt+20};
 const untimed={...manualCheck,type:'email.delivered'};
 assert.equal(chain([timed,untimed]).reason,'delivery-bounced');assert.deepEqual(chain([timed,untimed]),chain([untimed,timed]));
 const replay=apply({prior:checked,observation:observation(manual,manualCheck)});assert.equal(replay.reason,'duplicate-observation');assert.deepEqual(replay.delivery,checked);
});
test('two-day initial and original fourteen-day manual expiry hide all metadata immediately',()=>{
 for(const receipt of [owner,customer,manual]){
  const before=receipt.expiresAt-1;const prior=apply({receipt,observation:observation(receipt,{checkedAt:before}),now:before}).delivery;
  for(const time of [receipt.expiresAt,receipt.expiresAt+1])assert.deepEqual(apply({receipt,prior,observation:observation(receipt,{checkedAt:time}),now:time}),{disposition:'expired',reason:'original-expiry',delivery:null});
  assert.equal(reconcileMailDelivery({receipt,prior,observation:null,now:receipt.expiresAt}).delivery,null);
 }
});
test('cleanup races cannot recreate deleted receipts or extend an original deadline',()=>{
 const prior=apply().delivery;
 assert.equal(apply({receipt:null,prior}).delivery,null);
 assert.equal(apply({receipt:{...manual,expiresAt:now},prior}).delivery,null);
 assert.equal(apply({prior,now:now+30,observation:observation(manual,{eventId:'late',checkedAt:now+30,occurredAt:now+20})}).delivery.expiresAt,manual.expiresAt);
});
test('prior metadata must belong to the same exact receipt and cannot supply trusted outcomes or extra fields',()=>{
 const prior=apply().delivery;
 for(const changed of [{attempt:'another'},{acceptedAt:acceptedAt+1},{expiresAt:manual.expiresAt+1},{providerMessageId:'another'},{observations:[{type:'email.delivered',source:'webhook'}]},{observations:Array(65).fill(prior.observations[0])}]){
  const result=apply({prior:{...prior,...changed}});assert.equal(result.disposition,'needs-review');assert.equal(result.reason,'invalid-prior');assert.equal(result.delivery,null);
 }
 const sanitized=apply({prior:{...prior,state:'failed',reason:'raw diagnostic',recipient:'person@example.invalid'}}).delivery;assert.equal(sanitized.state,'delivered');assert.equal(sanitized.recipient,undefined);
});
test('bounded evidence stops at capacity, remains reviewable, and still deduplicates stored events',()=>{
 const observations=Array.from({length:64},(_,i)=>({type:'email.sent',eventId:'evt-'+i,occurredAt:acceptedAt+1+i}));
 const prior=chain(observations);assert.equal(prior.observations.length,64);
 const full=apply({prior,observation:observation(manual,{eventId:'overflow'})});assert.equal(full.delivery.observations.length,64);assert.equal(full.delivery.reason,'evidence-capacity');assert.equal(full.delivery.state,'needs-review');
 const replay=apply({prior:full.delivery,observation:observation(manual,observations[0])});assert.equal(replay.reason,'duplicate-event');assert.deepEqual(replay.delivery,full.delivery);
});
test('allowlisted output drops sentinel recipient/body/URLs/raw failure fields without mutating frozen inputs',()=>{
 const sentinel='sentinel-person@example.invalid secret-body https://invalid.example/private raw-provider-failure';
 const receipt=Object.freeze({...manual,recipient:sentinel,retryable:false,stage:'new',quota:7,orderVersion:4});
 const obs=Object.freeze({...observation(),recipient:sentinel,subject:sentinel,body:sentinel,url:sentinel,failureText:sentinel,recipientCount:1});
 const before=JSON.stringify({receipt,obs});let sends=0;
 const result=reconcileMailDelivery({receipt,observation:obs,now,send:()=>{sends++;throw Error('unexpected send')}});
 assert.equal(result.delivery.state,'delivered');assert.equal(sends,0);assert.equal(JSON.stringify({receipt,obs}),before);assert.ok(!JSON.stringify(result).includes(sentinel));
 for(const key of ['retryable','rejected','quota','stage','orderVersion','proof'])assert.equal(result.delivery[key],undefined);
 const ambiguous=apply({observation:{...obs,recipientCount:2}});assert.equal(ambiguous.reason,'invalid-observation');
});
test('invalid now cannot expose receipt metadata and valid equal-second events are allowed',()=>{
 for(const time of [undefined,null,0,-1,1.5,'now',Number.MAX_SAFE_INTEGER+1])assert.equal(apply({now:time}).delivery,null);
 assert.equal(apply({observation:observation(manual,{occurredAt:acceptedAt,checkedAt:acceptedAt}),now:acceptedAt}).delivery.state,'delivered');
});

test('provider event time may precede the later server receipt recording time',()=>{
 const result=apply({observation:observation(manual,{occurredAt:acceptedAt-1})});
 assert.equal(result.delivery.state,'delivered');assert.equal(result.delivery.acceptedAt,acceptedAt);
 assert.equal(result.delivery.observations[0].occurredAt,acceptedAt-1);
});

test('equal-time evidence order uses the same ASCII token order on every host',()=>{
 const result=chain([{eventId:'a'},{eventId:'A'}]);
 assert.deepEqual(result.observations.map(item=>item.eventId),['A','a']);
});

test('weak timed sent/delayed evidence cannot erase a status-only established outcome',()=>{
 for(const terminal of ['email.delivered','email.bounced'])for(const weak of ['email.sent','email.delivery_delayed']){
  const status={source:'manual-check',type:terminal,eventId:undefined,occurredAt:undefined};
  const event={type:weak,eventId:'weak-event',occurredAt:acceptedAt+1};
  assert.equal(chain([status,event]).state,terminal==='email.delivered'?'delivered':'failed');
  assert.deepEqual(chain([status,event]),chain([event,status]));
 }
});
