import {validProviderMessageId} from './mail-receipt.mjs';

// Offline reducer only. Its caller must supply one authenticated receipt and
// minimized observation, and eventually transact deduplication with persistence.
const purposes=new Set(['owner-notification','customer-receipt','manual-update']);
const reasons=Object.freeze({
 'email.sent':['unconfirmed','provider-accepted'],
 'email.delivery_delayed':['delayed','delivery-delayed'],
 'email.delivered':['delivered','server-accepted'],
 'email.bounced':['failed','delivery-bounced'],
 'email.failed':['failed','delivery-failed'],
 'email.suppressed':['failed','delivery-suppressed'],
 'email.complained':['needs-review','delivery-complaint'],
});
const identityFields=['providerMessageId','purpose','reference','attempt'];
const second=value=>Number.isSafeInteger(value)&&value>0;
const matches=(a,b)=>identityFields.every(key=>a?.[key]===b?.[key]);
const result=(disposition,reason,delivery=null)=>({disposition,reason,delivery});
const terminal=type=>['email.delivered','email.bounced','email.failed','email.suppressed'].includes(type);
const lexical=(a,b)=>a===b?0:a<b?-1:1;
const compare=(a,b)=>a.occurredAt-b.occurredAt||a.checkedAt-b.checkedAt||lexical(a.type,b.type)||lexical(a.source,b.source)||lexical(a.eventId||'',b.eventId||'');
const sameEvent=(a,b)=>a.source===b.source&&a.type===b.type&&a.occurredAt===b.occurredAt;
const sameObservation=(a,b)=>sameEvent(a,b)&&a.eventId===b.eventId&&a.checkedAt===b.checkedAt;

function validReceipt(receipt,now){
 return receipt?.state==='accepted'&&validProviderMessageId(receipt.providerMessageId)&&
  purposes.has(receipt.purpose)&&validProviderMessageId(receipt.reference)&&validProviderMessageId(receipt.attempt)&&
  second(receipt.acceptedAt)&&receipt.acceptedAt<=now&&second(receipt.expiresAt)&&receipt.expiresAt>receipt.acceptedAt;
}

function minimize(observation,receipt,now){
 if(!observation||!Object.hasOwn(reasons,observation.type)||!['webhook','manual-check'].includes(observation.source)||
  !second(observation.checkedAt)||observation.checkedAt<receipt.acceptedAt||observation.checkedAt>now||
  (observation.recipientCount!==undefined&&observation.recipientCount!==1))return null;
 const {source,type,checkedAt}=observation;
 const eventId=observation.eventId===undefined?null:observation.eventId;
 const occurredAt=observation.occurredAt===undefined?null:observation.occurredAt;
 if(eventId!==null&&!validProviderMessageId(eventId))return null;
 // Explicit null in an incoming observation is malformed; omission means unknown.
 if(observation.eventId===null||observation.occurredAt===null)return null;
 if(source==='webhook'&&(!second(occurredAt)||!validProviderMessageId(eventId)))return null;
 if(source==='manual-check'&&eventId!==null)return null;
 if(occurredAt!==null&&(!second(occurredAt)||occurredAt>checkedAt))return null;
 return {source,type,eventId,occurredAt,checkedAt};
}

function previous(prior,receipt,now){
 if(prior===null||prior===undefined)return {observations:[],eventIdConflict:false,capacityReached:false};
 if(!matches(prior,receipt)||prior.acceptedAt!==receipt.acceptedAt||prior.expiresAt!==receipt.expiresAt||
  !Array.isArray(prior.observations)||prior.observations.length>64||
  typeof prior.eventIdConflict!=='boolean'||typeof prior.capacityReached!=='boolean')return null;
 const observations=[];
 for(const item of prior.observations){
  const entry=minimize({...item,eventId:item?.eventId===null?undefined:item?.eventId,occurredAt:item?.occurredAt===null?undefined:item?.occurredAt},receipt,now);
  if(!entry||observations.some(old=>entry.eventId?entry.eventId===old.eventId:sameObservation(entry,old)))return null;
  observations.push(entry);
 }
 return {observations,eventIdConflict:prior.eventIdConflict,capacityReached:prior.capacityReached};
}

function snapshot(receipt,evidence){
 const observations=[...evidence.observations].sort(compare);
 // A status-only check has observation time, never an invented event time. Timed
 // terminal evidence takes precedence over undated terminal checks. Weak timed
 // sent/delayed evidence cannot erase an established manual terminal outcome.
 const timed=observations.filter(item=>item.occurredAt!==null&&terminal(item.type));
 const effective=timed.length?timed:observations;
 const outcomes=new Set(effective.filter(item=>terminal(item.type)).map(item=>item.type));
 const complaint=observations.some(item=>item.type==='email.complained');
 let [state,reason]=['unconfirmed','no-delivery-evidence'];
 if(outcomes.size>1)[state,reason]=['needs-review','conflicting-outcomes'];
 else if(outcomes.size===1)[state,reason]=reasons[[...outcomes][0]];
 else if(effective.some(item=>item.type==='email.delivery_delayed'))[state,reason]=reasons['email.delivery_delayed'];
 else if(effective.some(item=>item.type==='email.sent'))[state,reason]=reasons['email.sent'];
 if(complaint&&state!=='needs-review'){
  if(state==='unconfirmed'||state==='delayed')state='needs-review';
  reason='delivery-complaint';
 }
 if(evidence.capacityReached)[state,reason]=['needs-review','evidence-capacity'];
 if(evidence.eventIdConflict)[state,reason]=['needs-review','event-id-conflict'];
 return {
  providerMessageId:receipt.providerMessageId,purpose:receipt.purpose,reference:receipt.reference,attempt:receipt.attempt,
  acceptedAt:receipt.acceptedAt,expiresAt:receipt.expiresAt,state,reason,complaint,
  eventIdConflict:evidence.eventIdConflict,capacityReached:evidence.capacityReached,observations,
 };
}

export function reconcileMailDelivery({receipt,observation,prior=null,now}={}){
 if(!second(now))return result('ignored','invalid-clock');
 if(!validReceipt(receipt,now))return result('unmatched','receipt-unavailable');
 // Both read hiding and late writes use the original deadline, before replay or
 // prior-state handling. A deleted/missing receipt cannot be recreated here.
 if(now>=receipt.expiresAt)return result('expired','original-expiry');
 const evidence=previous(prior,receipt,now);
 if(!evidence)return result('needs-review','invalid-prior');
 const current=snapshot(receipt,evidence);
 if(observation===null||observation===undefined)return result('unchanged','no-observation',current);
 if(!matches(receipt,observation))return result('unmatched','identity-mismatch');
 const next=minimize(observation,receipt,now);
 if(!next)return result('ignored','invalid-observation',current);
 const duplicate=next.eventId&&evidence.observations.find(item=>item.eventId===next.eventId);
 if(duplicate){
  if(sameEvent(duplicate,next))return result('unchanged','duplicate-event',current);
  evidence.eventIdConflict=true;
  return result('needs-review','event-id-conflict',snapshot(receipt,evidence));
 }
 if(evidence.observations.some(item=>sameObservation(item,next)))return result('unchanged','duplicate-observation',current);
 if(evidence.observations.length===64){
  evidence.capacityReached=true;
  return result('needs-review','evidence-capacity',snapshot(receipt,evidence));
 }
 evidence.observations.push(next);
 return result('updated','observation-recorded',snapshot(receipt,evidence));
}
