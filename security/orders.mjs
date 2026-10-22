import {sourceBindingInsert,acceptanceBindingGuard,validRecipientBinding,deliveryForOrder} from './mail-delivery.mjs';
import {DAILY_SEND_LIMIT,MONTHLY_SEND_LIMIT} from '../shared/business-constants.mjs';
import {validProviderMessageId} from '../server/mail-receipt.mjs';
import {sixMonthsAfter,artworkExpiry,retainedSnapshot} from '../server/order-retention.mjs';
import {proofDetail,cleanProofs} from './proofs.mjs';
import {readSelect} from './read.mjs';
import {requestReference} from '../src/request-reference.mjs';
import {artworkId,artworkHash,ARTWORK_LIMITS,ORDER_LIMITS} from '../src/artwork-policy.mjs';
export const ORDER_STATUSES=['new','in_progress','ready_to_ship','shipped','fulfilled'];
const now=()=>Math.floor(Date.now()/1000);
const fail=(status,error)=>Response.json({error},{status});
const reference=row=>'CV-'+String(row.seq).padStart(6,'0');
const previousReference=row=>{const snapshot=JSON.parse(row.snapshot);return snapshot.referenceVersion===2?undefined:snapshot.reference||'CV-'+row.id;};
const view=row=>({id:row.id,reference:reference(row),...(previousReference(row)?{previousReference:previousReference(row)}:{}),status:row.status,version:row.version,created:row.created,expires:row.expires,artworkExpires:artworkExpiry(row),fulfilledAt:row.fulfilled_at??null,ownerSent:!!row.owner_sent,receiptSent:!!row.receipt_sent,snapshot:artworkExpiry(row)<=now()?retainedSnapshot(JSON.parse(row.snapshot)):JSON.parse(row.snapshot)});
function validShipping(s){
 if(s.shippingPolicyVersion!==undefined&&s.shippingPolicyVersion!==1)return false;
 if(s.deliveryCents==null)return s.shippingPolicyVersion===undefined&&s.totalCents==null;
 return Number.isSafeInteger(s.deliveryCents)&&s.deliveryCents>=0&&Number.isSafeInteger(s.totalCents)&&s.totalCents===s.subtotalCents+s.deliveryCents;
}
function validSnapshot(s){return s&&typeof s.contact?.name==='string'&&s.contact.name.length<=100&&typeof s.contact.email==='string'&&/^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(s.contact.email)&&s.contact.email.length<=254&&typeof s.contact.phone==='string'&&s.contact.phone.length<=30&&typeof s.locker?.name==='string'&&s.locker.name.length<=140&&typeof s.locker.area==='string'&&s.locker.area.length<=140&&s.paymentStatus==='unpaid'&&Number.isSafeInteger(s.magnetQty)&&s.magnetQty>0&&Number.isSafeInteger(s.subtotalCents)&&s.subtotalCents>0&&validShipping(s)&&Array.isArray(s.items)&&s.items.length>0&&s.items.every(i=>typeof i.kind==='string'&&typeof i.name==='string'&&i.name.length<=(i.kind==='alphabet'||i.kind==='counting'?800:200)&&Number.isSafeInteger(i.qty)&&i.qty>0&&Array.isArray(i.files)&&i.files.length<=26);}
export async function orderService(request,env){
 const b=await request.json(),path=new URL(request.url).pathname.slice('/orders/'.length),time=now();
 if(!env.DB||!b||typeof b!=='object')return fail(400,'Invalid request.');
 if(path==='list'){
  const before=b.before===undefined?Number.MAX_SAFE_INTEGER:Number(b.before);if(!Number.isSafeInteger(before)||before<1)return fail(400,'Invalid page.');
  if(b.q!==undefined&&(typeof b.q!=='string'||b.q.length>160)||b.stage!==undefined&&b.stage!=='all'&&!ORDER_STATUSES.includes(b.stage))return fail(400,'Invalid search.');
  const q=(b.q||'').trim(),where=['expires>?','seq<?'],args=[time,before];
  if(q){where.push("instr(lower('CV-' || printf('%06d',seq) || ' ' || CASE WHEN json_extract(snapshot,'$.referenceVersion')=2 THEN '' ELSE coalesce(json_extract(snapshot,'$.reference'),'CV-' || id) END || ' ' || json_extract(snapshot,'$.contact.name')),lower(?))>0");args.push(q)}
  if(b.stage&&b.stage!=='all'){where.push('status=?');args.push(b.stage)}
  const grouped=!q&&(!b.stage||['all','fulfilled'].includes(b.stage));
  if(b.fulfilledBefore!==undefined&&(!grouped||b.stage!=='fulfilled'||!/^\d+:\d+$/.test(b.fulfilledBefore)))return fail(400,'Invalid fulfilled page.');
  const summary=r=>{const v=view(r);return {...v,snapshot:{contact:{name:v.snapshot.contact.name},magnetQty:v.snapshot.magnetQty,subtotalCents:v.snapshot.subtotalCents,...Object.fromEntries(['shippingPolicyVersion','deliveryCents','totalCents'].filter(k=>Object.hasOwn(v.snapshot,k)).map(k=>[k,v.snapshot[k]])),paymentStatus:'unpaid'}}};
  let rows=[],completed=[],fulfilledCount=0,fulfilledNext=null;
  if(grouped){
   fulfilledCount=(await readSelect(env.DB,"SELECT count(*) n FROM orders WHERE expires>? AND status='fulfilled'",[time])).n;
   const cursor=b.fulfilledBefore?.split(':').map(Number),limit=cursor?50:3;
   if(cursor&&cursor.some(n=>!Number.isSafeInteger(n)||n<0))return fail(400,'Invalid fulfilled page.');
   const clauses=cursor?' AND (fulfilled_at<? OR (fulfilled_at=? AND seq<?))':'';
   completed=(await readSelect(env.DB,"SELECT * FROM orders WHERE expires>? AND status='fulfilled'"+clauses+' ORDER BY fulfilled_at DESC,seq DESC LIMIT ?',[time,...(cursor?[cursor[0],cursor[0],cursor[1]]:[]),limit+1],'all')).results;
   if(completed.length>limit){const last=completed[limit-1];fulfilledNext=last.fulfilled_at+':'+last.seq}completed=completed.slice(0,limit);
   if(b.stage!=='fulfilled'){where.push("status<>'fulfilled'");rows=(await readSelect(env.DB,'SELECT * FROM orders WHERE '+where.join(' AND ')+' ORDER BY seq DESC LIMIT 51',args,'all')).results;}
  }else rows=(await readSelect(env.DB,'SELECT * FROM orders WHERE '+where.join(' AND ')+' ORDER BY seq DESC LIMIT 51',args,'all')).results;
  return Response.json({orders:[...rows.slice(0,50),...completed].map(summary),next:rows.length>50?rows[49].seq:null,fulfilledCount,fulfilledNext});
 }
 if(!artworkId(b.id))return fail(400,'Invalid reference.');
 let row=await (path==='detail'?readSelect(env.DB,'SELECT * FROM orders WHERE id=?',[b.id]):env.DB.prepare('SELECT * FROM orders WHERE id=?').bind(b.id).first());
 if(path==='create'){
  if(!artworkHash(b.fingerprint)||!validSnapshot(b.snapshot)||(b.snapshot.referenceVersion!==undefined&&(b.snapshot.referenceVersion!==2||b.snapshot.reference!==undefined))||JSON.stringify(b.snapshot).length>ORDER_LIMITS.recordCharacters||(b.snapshot.reference!==undefined&&b.snapshot.reference!==requestReference({id:b.id,referenceVersion:1})))return fail(400,'Invalid order.');
  if(b.submissionId!==undefined&&!artworkHash(b.submissionId))return fail(400,'Invalid association.');
  if(row){if(row.expires<=time)return fail(410,'Order expired.');if(row.fingerprint!==b.fingerprint||row.snapshot!==JSON.stringify(b.snapshot))return fail(409,'Order changed.');if(b.submissionId){try{await linkOrder(env.DB,b,time,[],true)}catch{return fail(409,'Order association changed.')}}return Response.json({ok:true,reference:reference(row)});}
  let expires=time+ARTWORK_LIMITS.retentionSeconds;
  if(b.privateArtwork){const a=await env.DB.prepare('SELECT * FROM artwork_requests WHERE id=?').bind(b.id).first();if(!a?.finalized||a.expires<=time)return fail(409,'Complete artwork first.');const files=b.snapshot.items.flatMap(i=>i.files),manifest=JSON.parse(a.manifest);if(files.length!==manifest.length||files.some((f,n)=>f.index!==n||f.name!==manifest[n].name||f.size!==manifest[n].size||f.proof!==manifest[n].proof||((f.sha256!==undefined||manifest[n].sha256!==undefined)&&(!artworkHash(f.sha256)||f.sha256!==manifest[n].sha256))))return fail(409,'Artwork does not match order.');expires=Math.min(expires,a.expires);}
  // This single insert checks the display label atomically. No migration or legacy rewrite.
  const insert=env.DB.prepare("INSERT INTO orders(id,fingerprint,snapshot,created,expires,artwork_expires) SELECT ?,?,?,?,?,? WHERE ? IS NULL OR NOT EXISTS (SELECT 1 FROM orders WHERE json_extract(snapshot,'$.reference')=?) ON CONFLICT(id) DO NOTHING").bind(b.id,b.fingerprint,JSON.stringify(b.snapshot),time,sixMonthsAfter(time),expires,b.snapshot.reference??null,b.snapshot.reference??null);if(b.submissionId){try{await linkOrder(env.DB,b,time,[insert])}catch{return fail(409,'Order association changed.')}}else await insert.run();
  row=await env.DB.prepare('SELECT * FROM orders WHERE id=?').bind(b.id).first();if(!row)return fail(409,'Order reference needs review. Keep this draft and contact CustomVibe.');return row.fingerprint===b.fingerprint&&row.snapshot===JSON.stringify(b.snapshot)?Response.json({ok:true,reference:reference(row)}):fail(409,'Order changed.');
 }
 if(!row)return fail(404,'Order not found. Older orders may only have artwork.');
 if(row.expires<=time)return fail(410,'This order has expired.');
 if(path==='detail')return Response.json({...view(row),mailDelivery:await deliveryForOrder(env,b.id),proof:await proofDetail(env,b.id),history:(await readSelect(env.DB,'SELECT version,status,created FROM order_history WHERE order_id=? ORDER BY version DESC',[b.id],'all')).results,updates:(await readSelect(env.DB,"SELECT attempt,version,status,state,created,updated,rejected,CASE WHEN ? THEN provider_message_id ELSE NULL END AS providerMessageId,CASE WHEN ? THEN accepted_at ELSE NULL END AS acceptedAt,'manual-update' AS purpose,(state='failed' AND rejected=1 AND status<>'fulfilled') AS retryable FROM order_update_attempts WHERE order_id=? ORDER BY version DESC,rowid DESC",[artworkExpiry(row)>time?1:0,artworkExpiry(row)>time?1:0,b.id],'all')).results});
 if(path==='preview-retry'){
  if(!Number.isSafeInteger(b.version)||b.version!==row.version||!artworkHash(b.tokenHash))return fail(409,'Order changed. Preview again.');
  const statement=env.DB.prepare("UPDATE order_update_attempts SET preview_hash=?,preview_until=? WHERE order_id=? AND version=? AND attempt=? AND state='failed' AND rejected=1 AND status<>'fulfilled' AND EXISTS(SELECT 1 FROM order_updates u JOIN orders o ON o.id=u.order_id WHERE u.order_id=? AND u.version=? AND u.reservation=order_update_attempts.attempt AND u.state='failed' AND o.version=u.version AND o.status<>'fulfilled' AND o.expires>?) RETURNING attempt").bind(b.tokenHash,time+600,b.id,b.version,b.attempt,b.id,b.version,time);
  const changed=await statement.all();
  return changed.results.length?Response.json({ok:true}):fail(409,'The previous attempt changed. Review a fresh preview.');
 }
 if(path==='claim-update'){
  if(!Number.isSafeInteger(b.version)||b.version!==row.version)return fail(409,'Order changed.');
  const retry=typeof b.retryAttempt==='string'&&artworkHash(b.retryTokenHash);
  const existing=await env.DB.prepare("SELECT reservation,state FROM order_updates WHERE order_id=? AND (version=? OR (?='fulfilled' AND status='fulfilled'))").bind(b.id,b.version,row.status).first();
  if(existing&&(!retry||row.status==='fulfilled'))return Response.json({claimed:false,state:existing.state});
  if(!existing&&b.retryAttempt!==undefined)return fail(409,'The previous attempt changed.');
  const day=Math.floor(time/86400),date=new Date(time*1000),month=date.toISOString().slice(0,7),reservation=crypto.randomUUID();
  const counters=[['forms:day:'+day,(day+1)*86400,DAILY_SEND_LIMIT],['forms:month:'+month,Math.floor(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,1)/1000),MONTHLY_SEND_LIMIT]];
  const available=counters.map(()=>'(NOT EXISTS(SELECT 1 FROM attempts WHERE id=? AND until>? AND count+1>?))').join(' AND ');
  // The summary swap, attempt trigger and allowance charges share one transaction.
  const insert=env.DB.prepare(`INSERT INTO order_updates(order_id,version,status,created,updated,reservation)
   SELECT id,version,status,?,?,? FROM orders WHERE id=? AND version=? AND expires>?
   AND (status<>'fulfilled' OR NOT EXISTS(SELECT 1 FROM order_updates WHERE order_id=? AND status='fulfilled')) AND ${available}
   ON CONFLICT(order_id,version) DO UPDATE SET state='pending',created=excluded.created,updated=excluded.updated,reservation=excluded.reservation
   WHERE order_updates.status<>'fulfilled' AND order_updates.state='failed' AND order_updates.reservation=?
   AND EXISTS(SELECT 1 FROM order_update_attempts a WHERE a.attempt=order_updates.reservation AND a.state='failed' AND a.rejected=1 AND a.preview_hash=? AND a.preview_until>?)`).bind(time,time,reservation,b.id,b.version,time,b.id,...counters.flatMap(([id,,limit])=>[id,time,limit]),retry?b.retryAttempt:null,retry?b.retryTokenHash:null,time);
  await env.DB.batch([insert,...counters.map(([id,until])=>env.DB.prepare('INSERT INTO attempts(id,count,until) SELECT ?,1,? WHERE EXISTS(SELECT 1 FROM order_updates WHERE order_id=? AND version=? AND reservation=?) ON CONFLICT(id) DO UPDATE SET count=CASE WHEN until<=? THEN 1 ELSE count+1 END,until=CASE WHEN until<=? THEN excluded.until ELSE until END').bind(id,until,b.id,b.version,reservation,time,time))]);
  const result=await env.DB.prepare('SELECT reservation,state FROM order_updates WHERE order_id=? AND version=?').bind(b.id,b.version).first();
  if(!result||retry&&result.reservation!==reservation){
   const latest=await env.DB.prepare('SELECT version FROM orders WHERE id=? AND expires>?').bind(b.id,time).first();
   if(latest?.version!==b.version)return fail(409,'Order changed.');
   for(const [id,,limit] of counters){const cap=await env.DB.prepare('SELECT count FROM attempts WHERE id=? AND until>?').bind(id,time).first();if(cap?.count>=limit)return fail(429,'The shared email allowance is full.');}
   return fail(409,'This attempt changed. Review its history and preview again.');
  }
  return Response.json({claimed:result.reservation===reservation,state:result.state,attempt:result.reservation});
 }
 if(path==='mark-update'){
  if(!Number.isSafeInteger(b.version)||!['accepted','failed','uncertain'].includes(b.state)||b.attempt!==undefined&&!artworkId(b.attempt))return fail(400,'Invalid update.');
  if(b.providerMessageId!==undefined&&(b.state!=='accepted'||!validProviderMessageId(b.providerMessageId)||!Number.isSafeInteger(time)||time<1))return fail(400,'Invalid receipt.');
  if(b.recipientBinding!==undefined&&!validRecipientBinding(b.recipientBinding))return fail(400,'Invalid recipient binding.');
  // Legacy workers may finish their first reservation, but cannot mark a retry by version alone.
  const attempt=b.attempt??(await env.DB.prepare('SELECT attempt FROM order_update_attempts WHERE order_id=? AND version=? GROUP BY order_id,version HAVING count(*)=1').bind(b.id,b.version).first())?.attempt;
  if(!attempt)return fail(409,'Attempt identity is required.');
  const receipt=b.providerMessageId&&artworkExpiry(row)>time?b.providerMessageId:null;
  await env.DB.batch([
   env.DB.prepare("UPDATE order_updates SET state=?,updated=? WHERE order_id=? AND version=? AND reservation=? AND state='pending'").bind(b.state,time,b.id,b.version,attempt),
   env.DB.prepare("UPDATE order_update_attempts SET provider_message_id=?,accepted_at=?,rejected=?,preview_hash=NULL,preview_until=NULL WHERE order_id=? AND version=? AND attempt=? AND state=? AND EXISTS(SELECT 1 FROM order_updates WHERE order_id=? AND version=? AND reservation=? AND updated=? AND state=?) AND changes()>0").bind(receipt,receipt?time:null,b.state==='failed'&&b.rejected===true&&b.attempt!==undefined?1:0,b.id,b.version,attempt,b.state,b.id,b.version,attempt,time,b.state),
   ...(receipt&&b.recipientBinding?[sourceBindingInsert(env.DB,{purpose:'manual-update',reference:b.id,providerMessageId:receipt,binding:b.recipientBinding,attempt}),acceptanceBindingGuard(env.DB,{purpose:'manual-update',reference:b.id,providerMessageId:receipt})]:[])
  ]);return Response.json({ok:true});
 }
 if(path==='delivery'){
  if(!['owner_sent','receipt_sent'].includes(b.stage))return fail(400,'Invalid delivery stage.');
  await env.DB.prepare(`UPDATE orders SET ${b.stage}=1 WHERE id=? AND expires>?`).bind(b.id,time).run();return Response.json({ok:true});
 }
 if(path==='status'){
  if(!ORDER_STATUSES.includes(b.status)||!Number.isSafeInteger(b.version)||b.version<0)return fail(400,'Invalid status.');
  // D1 batch is one transaction. A concurrent tab cannot claim the same version.
  const changed=await env.DB.batch([env.DB.prepare("UPDATE orders SET status=?,version=version+1,fulfilled_at=?,expires=CASE WHEN ?='fulfilled' THEN ? ELSE expires END WHERE id=? AND version=? AND expires>? AND status<>? RETURNING version").bind(b.status,b.status==='fulfilled'?time:null,b.status,sixMonthsAfter(time),b.id,b.version,time,b.status),env.DB.prepare('INSERT INTO order_history(order_id,version,status,created) SELECT id,version,status,? FROM orders WHERE id=? AND version=? AND status=? AND changes()>0 ON CONFLICT DO NOTHING').bind(time,b.id,b.version+1,b.status)]);
  return changed[0].results.length?Response.json({ok:true,version:b.version+1}):fail(409,'Order changed. Refresh before updating.');
 }
 return fail(404,'Not found.');
}
export async function cleanOrders(env){const time=now();await cleanProofs(env);
 const expired=(await env.DB.prepare("SELECT id,snapshot FROM orders WHERE artwork_expires<=? AND expires>? AND json_extract(snapshot,'$.artworkRemoved') IS NULL LIMIT 50").bind(time,time).all()).results;
 for(const row of expired)await env.DB.prepare('UPDATE orders SET snapshot=? WHERE id=?').bind(JSON.stringify({...retainedSnapshot(JSON.parse(row.snapshot)),artworkRemoved:true}),row.id).run();
 // Receipt metadata ends at the original artwork deadline; attempt history keeps its existing lifetime.
 await env.DB.batch([env.DB.prepare('UPDATE order_update_attempts SET provider_message_id=NULL,accepted_at=NULL WHERE (provider_message_id IS NOT NULL OR accepted_at IS NOT NULL) AND order_id IN (SELECT id FROM orders WHERE artwork_expires<=?)').bind(time),env.DB.prepare('DELETE FROM order_update_attempts WHERE order_id IN (SELECT id FROM orders WHERE expires<=?)').bind(time),env.DB.prepare('DELETE FROM order_updates WHERE order_id IN (SELECT id FROM orders WHERE expires<=?)').bind(time),env.DB.prepare('DELETE FROM order_history WHERE order_id IN (SELECT id FROM orders WHERE expires<=?)').bind(time),env.DB.prepare('DELETE FROM orders WHERE expires<=?').bind(time)]);}

// Existing accepted unlinked requests may recover without creating historical associations.
// Only the already-existing exact order branch enables that no-association outcome.
async function linkOrder(db,b,time,statements=[],allowUnlinkedRecovery=false){
 await db.batch([...statements,
  db.prepare("UPDATE submissions SET order_id=? WHERE id=? AND fingerprint=? AND kind='order' AND expires>? AND (order_id=? OR (order_id IS NULL AND owner_sent=0 AND receipt_sent=0)) AND EXISTS(SELECT 1 FROM orders WHERE id=? AND fingerprint=? AND expires>?)").bind(b.id,b.submissionId,b.fingerprint,time,b.id,b.id,b.fingerprint,time),
  db.prepare(`INSERT INTO mail_delivery_assert(ok) SELECT CASE WHEN EXISTS(
   SELECT 1 FROM submissions s JOIN orders o ON o.id=?
   WHERE s.id=? AND s.kind='order' AND s.fingerprint=? AND o.fingerprint=s.fingerprint AND o.snapshot=?
   AND s.expires>unixepoch() AND o.expires>unixepoch()
   AND (s.order_id=o.id OR (?=1 AND s.order_id IS NULL AND (s.owner_sent=1 OR s.receipt_sent=1)
    AND NOT EXISTS(SELECT 1 FROM submissions competing WHERE competing.order_id=o.id AND competing.id<>s.id)))
  ) THEN 1 ELSE 0 END`).bind(b.id,b.submissionId,b.fingerprint,JSON.stringify(b.snapshot),allowUnlinkedRecovery?1:0)
 ]);
}
