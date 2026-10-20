import {readSelect} from './read.mjs';
import {validProviderMessageId} from '../server/mail-receipt.mjs';
import {reconcileMailDelivery} from '../server/mail-delivery.mjs';
const hex=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
const second=n=>Number.isSafeInteger(n)&&n>0;
const types=new Set(['email.sent','email.delivery_delayed','email.delivered','email.bounced','email.failed','email.suppressed','email.complained']);
export const validRecipientBinding=b=>b&&b.recipientCount===1&&hex(b.recipientDigest)&&Object.keys(b).every(k=>['recipientCount','recipientDigest'].includes(k));
const stateId=r=>r.purpose+':'+r.reference+':'+r.attempt;
const receipt=r=>({state:'accepted',providerMessageId:r.provider_id,purpose:r.purpose,reference:r.reference,attempt:r.attempt,acceptedAt:r.accepted_at,expiresAt:r.expires_at});
// All authoritative source columns, global cardinality and SQL-time expiry are rechecked.
const matchingSource=`EXISTS(SELECT 1 FROM mail_delivery_sources s WHERE s.purpose=mail_delivery_state.purpose AND s.reference=mail_delivery_state.reference AND s.attempt=mail_delivery_state.attempt AND s.provider_id=mail_delivery_state.provider_id AND s.accepted_at=mail_delivery_state.accepted_at AND s.expires_at=mail_delivery_state.expires_at AND s.order_id IS mail_delivery_state.order_id AND s.expires_at>unixepoch())`;
const live=matchingSource+' AND (SELECT count(*) FROM mail_delivery_sources s WHERE s.provider_id=mail_delivery_state.provider_id)=1';
export function sourceBindingInsert(db,{purpose,reference,providerMessageId,binding,attempt=null}){
 return db.prepare(`INSERT INTO mail_delivery_state(id,purpose,reference,attempt,provider_id,accepted_at,expires_at,order_id,recipient_count,recipient_digest) SELECT purpose||':'||reference||':'||attempt,purpose,reference,attempt,provider_id,accepted_at,expires_at,order_id,1,? FROM mail_delivery_sources WHERE purpose=? AND reference=? AND provider_id=? AND (? IS NULL OR attempt=?) AND changes()>0`).bind(binding.recipientDigest,purpose,reference,providerMessageId,attempt,attempt);
}
export function acceptanceBindingGuard(db,{purpose,reference,providerMessageId}){return db.prepare(`INSERT INTO mail_delivery_assert(ok) SELECT CASE WHEN changes()=0 OR EXISTS(SELECT 1 FROM mail_delivery_state WHERE purpose=? AND reference=? AND provider_id=? AND ${matchingSource}) THEN 1 ELSE 0 END`).bind(purpose,reference,providerMessageId)}
const response=(disposition,reason)=>Response.json({ok:true,disposition,reason});
export async function observeMailDelivery(request,env){
 let b;try{const raw=await request.text();if(raw.length>2048)return new Response(null,{status:413});b=JSON.parse(raw)}catch{return new Response(null,{status:400})}
 const now=Math.floor(Date.now()/1000),keys=['providerMessageId','source','type','eventId','occurredAt','checkedAt','recipientCount','recipientDigest'];
 if(!b||Object.keys(b).length!==keys.length||Object.keys(b).some(k=>!keys.includes(k))||!validProviderMessageId(b.providerMessageId)||b.source!=='webhook'||!types.has(b.type)||!validProviderMessageId(b.eventId)||!second(b.occurredAt)||!second(b.checkedAt)||b.occurredAt>b.checkedAt||b.checkedAt>now||b.recipientCount!==1||!hex(b.recipientDigest))return new Response(null,{status:400});
 const db=env.DB.withSession?env.DB.withSession('first-primary'):env.DB;
 for(let retry=0;retry<3;retry++){
  const matches=(await db.prepare('SELECT * FROM mail_delivery_sources WHERE provider_id=? LIMIT 2').bind(b.providerMessageId).all()).results;
  if(matches.length!==1)return response('ignored','receipt-unavailable');
  const source=matches[0],id=stateId(source),current=await db.prepare('SELECT * FROM mail_delivery_state WHERE id=?').bind(id).first();
  if(!current||current.recipient_digest!==b.recipientDigest||current.recipient_count!==1||current.expires_at<=now||current.provider_id!==source.provider_id||current.accepted_at!==source.accepted_at||current.expires_at!==source.expires_at||current.order_id!==source.order_id)return response('ignored','binding-unavailable');
  const claim=await db.prepare('SELECT * FROM mail_delivery_events WHERE event_id=?').bind(b.eventId).first();
  if(claim&&claim.state_id!==id)return response('ignored','event-conflict');
  let prior;try{prior=current.snapshot?JSON.parse(current.snapshot):null}catch{return response('ignored','snapshot-unavailable')}
  const reduced=reconcileMailDelivery({receipt:receipt(source),prior,observation:{...b,purpose:source.purpose,reference:source.reference,attempt:source.attempt},now});
  if(!reduced.delivery||['ignored','expired','unmatched'].includes(reduced.disposition))return response('ignored','observation-unavailable');
  const snapshot=JSON.stringify(reduced.delivery),token=crypto.randomUUID();
  const guarded=db.prepare(`UPDATE mail_delivery_state SET snapshot=?,revision=revision+1,write_token=? WHERE id=? AND revision=? AND recipient_digest=? AND expires_at>? AND ${live} AND NOT EXISTS(SELECT 1 FROM mail_delivery_events e WHERE e.event_id=? AND e.state_id<>mail_delivery_state.id) RETURNING revision`).bind(snapshot,token,id,current.revision,b.recipientDigest,now,b.eventId);
  const retained=reduced.delivery.observations.find(o=>o.eventId===b.eventId);
  const statements=[guarded];
  if(!claim&&retained)statements.push(db.prepare('INSERT INTO mail_delivery_events(event_id,state_id,type,occurred_at,expires_at) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM mail_delivery_state WHERE id=? AND write_token=?)').bind(b.eventId,id,retained.type,retained.occurredAt,source.expires_at,id,token));
  // Final assertion aborts the entire batch if time/source/claim changed after CAS.
  statements.push(db.prepare(`INSERT INTO mail_delivery_assert(ok) SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM mail_delivery_state WHERE id=? AND write_token=?) OR EXISTS(SELECT 1 FROM mail_delivery_state WHERE id=? AND write_token=? AND ${live} AND NOT EXISTS(SELECT 1 FROM json_each(snapshot,'$.observations') o WHERE json_extract(o.value,'$.source')='webhook' AND NOT EXISTS(SELECT 1 FROM mail_delivery_events e WHERE e.event_id=json_extract(o.value,'$.eventId') AND e.state_id=mail_delivery_state.id AND e.type=json_extract(o.value,'$.type') AND e.occurred_at=json_extract(o.value,'$.occurredAt') AND e.expires_at=mail_delivery_state.expires_at))) THEN 1 ELSE 0 END`).bind(id,token,id,token));
  const result=await db.batch(statements);
  if(!result[0].results?.length)continue;
  if(source.expires_at<=Math.floor(Date.now()/1000))return response('ignored','original-expiry');
  return response(reduced.disposition==='unchanged'?'duplicate':'applied',reduced.disposition==='unchanged'?'duplicate-event':'observation-recorded');
 }
 return Response.json({error:'Delivery evidence temporarily unavailable.'},{status:503});
}
export async function deliveryForOrder(env,orderId){
 const db=env.DB.withSession?env.DB.withSession('first-primary'):env.DB;
 const rows=(await readSelect(db,`SELECT * FROM mail_delivery_state WHERE order_id=? AND expires_at>unixepoch() AND ${live} ORDER BY purpose,attempt LIMIT 100`,[orderId],'all','customvibe_delivery_read_retry')).results;
 return rows.flatMap(row=>{let prior;try{prior=row.snapshot?JSON.parse(row.snapshot):null}catch{return []}const reduced=reconcileMailDelivery({receipt:receipt(row),prior,now:Math.floor(Date.now()/1000)});if(!reduced.delivery)return [];const d=reduced.delivery;return [{purpose:d.purpose,attempt:d.attempt,acceptedAt:d.acceptedAt,expiresAt:d.expiresAt,state:d.state,reason:d.reason,complaint:d.complaint,...deliveryEvidence(d)}]});
}
// This is derived only from the reducer-validated stored observations. A check
// time is not an acceptance or delivery time. Ambiguous outcome times stay null.
function deliveryEvidence(delivery){
 const observations=delivery.observations,sources=new Set(observations.map(o=>o.source));
 const source=sources.size===1&&['webhook','manual-check'].includes(observations[0]?.source)?observations[0].source:null;
 const checkedAt=source?Math.max(...observations.map(o=>o.checkedAt)):null;
 const eventType={
  'unconfirmed:provider-accepted':'email.sent','delayed:delivery-delayed':'email.delivery_delayed',
  'delivered:server-accepted':'email.delivered','failed:delivery-bounced':'email.bounced',
  'failed:delivery-failed':'email.failed','failed:delivery-suppressed':'email.suppressed',
 }[delivery.state+':'+delivery.reason];
 const matches=source&&!delivery.complaint&&eventType?observations.filter(o=>o.type===eventType):[];
 const times=new Set(matches.map(o=>o.occurredAt));
 const occurredAt=matches.length&&times.size===1&&second(matches[0].occurredAt)?matches[0].occurredAt:null;
 return {source,checkedAt,occurredAt};
}
export async function cleanMailDelivery(env){await env.DB.prepare(`DELETE FROM mail_delivery_state WHERE expires_at<=unixepoch() OR NOT (${live})`).run();await env.DB.prepare('DELETE FROM mail_delivery_events WHERE expires_at<=unixepoch() OR NOT EXISTS(SELECT 1 FROM mail_delivery_state WHERE id=state_id)').run()}
