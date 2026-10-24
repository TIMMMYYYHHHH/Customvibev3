import {privacyState,privacyConflict} from './order-privacy.mjs';
import {sourceBindingInsert,acceptanceBindingGuard,validRecipientBinding} from './mail-delivery.mjs';
import {DAILY_SEND_LIMIT,MONTHLY_SEND_LIMIT} from '../shared/business-constants.mjs';
import {validProviderMessageId} from '../server/mail-receipt.mjs';
const hex=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
export async function submissionState(request,env){
 const body=await request.json(),path=new URL(request.url).pathname,now=Math.floor(Date.now()/1000);
 if(!env.DB||!hex(body.id))return new Response(null,{status:400});
 if(await privacyState(env,body.id,'submission'))return privacyConflict();
 if(path==='/submissions/claim-contact'){
  const claimed=await env.DB.prepare("UPDATE submissions SET contact_started=1 WHERE id=? AND kind='contact' AND expires>? AND contact_started=0 AND owner_sent=0 RETURNING id").bind(body.id,now).first();
  const row=await env.DB.prepare("SELECT owner_sent FROM submissions WHERE id=? AND kind='contact' AND expires>?").bind(body.id,now).first();
  return Response.json({claimed:!!claimed,ownerSent:!!row?.owner_sent});
 }
 if(path==='/submissions/mark'){
  if(!['owner_sent','receipt_sent'].includes(body.stage))return new Response(null,{status:400});
  if(body.providerMessageId!==undefined){
   if(!validProviderMessageId(body.providerMessageId)||!Number.isSafeInteger(now)||now<1)return new Response(null,{status:400});
   const prefix=body.stage==='owner_sent'?'owner':'receipt';
   if(body.recipientBinding!==undefined&&!validRecipientBinding(body.recipientBinding))return new Response(null,{status:400});
   if(body.recipientBinding){const fresh=env.DB.prepare(`UPDATE submissions SET ${body.stage}=1,${prefix}_provider_id=?,${prefix}_accepted_at=? WHERE id=? AND expires>? AND kind='order' AND ${body.stage}=0 AND ${prefix}_provider_id IS NULL AND ${prefix}_accepted_at IS NULL RETURNING id`).bind(body.providerMessageId,now,body.id,now);const done=await env.DB.batch([fresh,sourceBindingInsert(env.DB,{purpose:prefix==='owner'?'owner-notification':'customer-receipt',reference:body.id,providerMessageId:body.providerMessageId,binding:body.recipientBinding}),acceptanceBindingGuard(env.DB,{purpose:prefix==='owner'?'owner-notification':'customer-receipt',reference:body.id,providerMessageId:body.providerMessageId})]);if(done[0].results.length)return Response.json({ok:true});}

   // Success and its first receipt share one write; retries cannot replace the receipt.
   const marked=await env.DB.prepare(`UPDATE submissions SET ${body.stage}=1,${prefix}_provider_id=COALESCE(${prefix}_provider_id,?),${prefix}_accepted_at=COALESCE(${prefix}_accepted_at,?) WHERE id=? AND expires>? AND kind='order' RETURNING id`).bind(body.providerMessageId,now,body.id,now).first();
   return Response.json({ok:!!marked},{status:marked?200:409});
  }
  await env.DB.prepare(`UPDATE submissions SET ${body.stage}=1 WHERE id=? AND expires>?`).bind(body.id,now).run();return Response.json({ok:true});
 }
 if(path!=='/submissions/reserve'||!hex(body.key)||!hex(body.fingerprint)||!['order','contact'].includes(body.kind))return new Response(null,{status:400});
 let row=await env.DB.prepare('SELECT * FROM submissions WHERE id=?').bind(body.id).first();
 if(row){
  if(row.fingerprint!==body.fingerprint||row.kind!==body.kind||row.expires<=now)return Response.json({conflict:true});
  const attempt=await env.DB.prepare('UPDATE submissions SET tries=tries+1 WHERE id=? RETURNING tries').bind(body.id).first();
  if(await privacyState(env,body.id,'submission'))return privacyConflict();
  return Response.json({allowed:attempt.tries<=12,ownerSent:!!row.owner_sent,receiptSent:!!row.receipt_sent});
 }
 if(!Number.isSafeInteger(body.createdAt)||body.createdAt<now-3600||body.createdAt>now+60)return Response.json({expired:true});
 const day=Math.floor(now/86400),month=new Date(now*1000).toISOString().slice(0,7),weight=body.kind==='order'?2:1;
 const counters=[['forms:ip:'+body.key,1,now+900,5],['forms:day:'+day,weight,(day+1)*86400,DAILY_SEND_LIMIT],['forms:month:'+month,weight,Math.floor(Date.UTC(new Date(now*1000).getUTCFullYear(),new Date(now*1000).getUTCMonth()+1,1)/1000),MONTHLY_SEND_LIMIT]];
 // The conditional insert and all counter updates run in one D1 transaction.
 // A rejected IP, an exhausted budget or a duplicate ID reserves no global quota.
 const reservation=crypto.randomUUID();
 const available=counters.map(()=>'(NOT EXISTS (SELECT 1 FROM attempts WHERE id=? AND until>? AND count+?>?))').join(' AND ');
 const insert=env.DB.prepare(`INSERT INTO submissions (id,fingerprint,kind,expires,reservation) SELECT ?,?,?,?,? WHERE ${available} ON CONFLICT(id) DO NOTHING`).bind(body.id,body.fingerprint,body.kind,now+172800,reservation,...counters.flatMap(([id,cost,,limit])=>[id,now,cost,limit]));
 await env.DB.batch([insert,...counters.map(([id,cost,until])=>env.DB.prepare('INSERT INTO attempts (id,count,until) SELECT ?,?,? WHERE EXISTS (SELECT 1 FROM submissions WHERE id=? AND reservation=?) ON CONFLICT(id) DO UPDATE SET count=CASE WHEN until<=? THEN excluded.count ELSE count+excluded.count END, until=CASE WHEN until<=? THEN excluded.until ELSE until END').bind(id,cost,until,body.id,reservation,now,now))]);
 row=await env.DB.prepare('SELECT * FROM submissions WHERE id=?').bind(body.id).first();
 if(!row)return Response.json({allowed:false});
 if(row.fingerprint!==body.fingerprint||row.kind!==body.kind)return Response.json({conflict:true});
 return Response.json({allowed:true,ownerSent:!!row.owner_sent,receiptSent:!!row.receipt_sent});
}
