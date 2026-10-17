import {proofDetail,cleanProofs} from './proofs.mjs';
import {readSelect} from './read.mjs';
import {requestReference} from '../src/request-reference.mjs';
import {artworkId,artworkHash,ARTWORK_LIMITS,ORDER_LIMITS} from '../src/artwork-policy.mjs';
export const ORDER_STATUSES=['new','in_progress','ready_to_ship','shipped'];
const now=()=>Math.floor(Date.now()/1000);
const fail=(status,error)=>Response.json({error},{status});
const reference=row=>'CV-'+String(row.seq).padStart(6,'0');
const previousReference=row=>{const snapshot=JSON.parse(row.snapshot);return snapshot.referenceVersion===2?undefined:snapshot.reference||'CV-'+row.id;};
const view=row=>({id:row.id,reference:reference(row),...(previousReference(row)?{previousReference:previousReference(row)}:{}),status:row.status,version:row.version,created:row.created,expires:row.expires,ownerSent:!!row.owner_sent,receiptSent:!!row.receipt_sent,snapshot:JSON.parse(row.snapshot)});
function validSnapshot(s){return s&&typeof s.contact?.name==='string'&&s.contact.name.length<=100&&typeof s.contact.email==='string'&&/^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(s.contact.email)&&s.contact.email.length<=254&&typeof s.contact.phone==='string'&&s.contact.phone.length<=30&&typeof s.locker?.name==='string'&&s.locker.name.length<=140&&typeof s.locker.area==='string'&&s.locker.area.length<=140&&s.paymentStatus==='unpaid'&&Number.isSafeInteger(s.magnetQty)&&s.magnetQty>0&&Number.isSafeInteger(s.subtotalCents)&&s.subtotalCents>0&&Array.isArray(s.items)&&s.items.length>0&&s.items.every(i=>typeof i.kind==='string'&&typeof i.name==='string'&&i.name.length<=200&&Number.isSafeInteger(i.qty)&&i.qty>0&&Array.isArray(i.files)&&i.files.length<=26);}
export async function orderService(request,env){
 const b=await request.json(),path=new URL(request.url).pathname.slice('/orders/'.length),time=now();
 if(!env.DB||!b||typeof b!=='object')return fail(400,'Invalid request.');
 if(path==='list'){
  const before=b.before===undefined?Number.MAX_SAFE_INTEGER:Number(b.before);if(!Number.isSafeInteger(before)||before<1)return fail(400,'Invalid page.');
  const rows=(await readSelect(env.DB,'SELECT * FROM orders WHERE expires>? AND seq<? ORDER BY seq DESC LIMIT 51',[time,before],'all')).results;
  return Response.json({orders:rows.slice(0,50).map(r=>{const v=view(r);return {...v,snapshot:{contact:{name:v.snapshot.contact.name},magnetQty:v.snapshot.magnetQty,paymentStatus:'unpaid'}}}),next:rows.length>50?rows[49].seq:null});
 }
 if(!artworkId(b.id))return fail(400,'Invalid reference.');
 let row=await (path==='detail'?readSelect(env.DB,'SELECT * FROM orders WHERE id=?',[b.id]):env.DB.prepare('SELECT * FROM orders WHERE id=?').bind(b.id).first());
 if(path==='create'){
  if(!artworkHash(b.fingerprint)||!validSnapshot(b.snapshot)||(b.snapshot.referenceVersion!==undefined&&(b.snapshot.referenceVersion!==2||b.snapshot.reference!==undefined))||JSON.stringify(b.snapshot).length>ORDER_LIMITS.recordCharacters||(b.snapshot.reference!==undefined&&b.snapshot.reference!==requestReference({id:b.id,referenceVersion:1})))return fail(400,'Invalid order.');
  if(row)return row.expires<=time?fail(410,'Order expired.'):row.fingerprint!==b.fingerprint||row.snapshot!==JSON.stringify(b.snapshot)?fail(409,'Order changed.'):Response.json({ok:true,reference:reference(row)});
  let expires=time+ARTWORK_LIMITS.retentionSeconds;
  if(b.privateArtwork){const a=await env.DB.prepare('SELECT * FROM artwork_requests WHERE id=?').bind(b.id).first();if(!a?.finalized||a.expires<=time)return fail(409,'Complete artwork first.');const files=b.snapshot.items.flatMap(i=>i.files),manifest=JSON.parse(a.manifest);if(files.length!==manifest.length||files.some((f,n)=>f.index!==n||f.name!==manifest[n].name||f.size!==manifest[n].size||f.proof!==manifest[n].proof||(b.snapshot.approvalRequired&&f.sha256!==manifest[n].sha256)))return fail(409,'Artwork does not match order.');expires=Math.min(expires,a.expires);}
  // This single insert checks the display label atomically. No migration or legacy rewrite.
  await env.DB.prepare("INSERT INTO orders(id,fingerprint,snapshot,created,expires) SELECT ?,?,?,?,? WHERE ? IS NULL OR NOT EXISTS (SELECT 1 FROM orders WHERE json_extract(snapshot,'$.reference')=?) ON CONFLICT(id) DO NOTHING").bind(b.id,b.fingerprint,JSON.stringify(b.snapshot),time,expires,b.snapshot.reference??null,b.snapshot.reference??null).run();
  row=await env.DB.prepare('SELECT * FROM orders WHERE id=?').bind(b.id).first();if(!row)return fail(409,'Order reference needs review. Keep this draft and contact CustomVibe.');return row.fingerprint===b.fingerprint&&row.snapshot===JSON.stringify(b.snapshot)?Response.json({ok:true,reference:reference(row)}):fail(409,'Order changed.');
 }
 if(!row)return fail(404,'Order not found. Older orders may only have artwork.');
 if(row.expires<=time)return fail(410,'This order has expired.');
 if(path==='detail')return Response.json({...view(row),...(JSON.parse(row.snapshot).approvalRequired?{proof:await proofDetail(env,b.id)}:{}),history:(await readSelect(env.DB,'SELECT version,status,created FROM order_history WHERE order_id=? ORDER BY version DESC',[b.id],'all')).results,updates:(await readSelect(env.DB,'SELECT version,status,state,created,updated FROM order_updates WHERE order_id=? ORDER BY version DESC',[b.id],'all')).results});
 if(path==='claim-update'){
  if(!Number.isSafeInteger(b.version)||b.version!==row.version)return fail(409,'Order changed.');
  const existing=await env.DB.prepare('SELECT state FROM order_updates WHERE order_id=? AND version=?').bind(b.id,b.version).first();if(existing)return Response.json({claimed:false,state:existing.state});
  const day=Math.floor(time/86400),date=new Date(time*1000),month=date.toISOString().slice(0,7),reservation=crypto.randomUUID();
  const counters=[['forms:day:'+day,(day+1)*86400,80],['forms:month:'+month,Math.floor(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,1)/1000),2400]];
  const available=counters.map(()=>'(NOT EXISTS(SELECT 1 FROM attempts WHERE id=? AND until>? AND count+1>?))').join(' AND ');
  const insert=env.DB.prepare(`INSERT INTO order_updates(order_id,version,status,created,updated,reservation) SELECT id,version,status,?,?,? FROM orders WHERE id=? AND version=? AND expires>? AND ${available} ON CONFLICT DO NOTHING`).bind(time,time,reservation,b.id,b.version,time,...counters.flatMap(([id,,limit])=>[id,time,limit]));
  await env.DB.batch([insert,...counters.map(([id,until])=>env.DB.prepare('INSERT INTO attempts(id,count,until) SELECT ?,1,? WHERE EXISTS(SELECT 1 FROM order_updates WHERE order_id=? AND version=? AND reservation=?) ON CONFLICT(id) DO UPDATE SET count=CASE WHEN until<=? THEN 1 ELSE count+1 END,until=CASE WHEN until<=? THEN excluded.until ELSE until END').bind(id,until,b.id,b.version,reservation,time,time))]);
  const result=await env.DB.prepare('SELECT reservation,state FROM order_updates WHERE order_id=? AND version=?').bind(b.id,b.version).first();
  if(!result){const latest=await env.DB.prepare('SELECT version FROM orders WHERE id=? AND expires>?').bind(b.id,time).first();return latest?.version!==b.version?fail(409,'Order changed.'):fail(429,'The shared email allowance is full.');}
  return Response.json({claimed:result.reservation===reservation,state:result.state});
 }
 if(path==='mark-update'){
  if(!Number.isSafeInteger(b.version)||!['accepted','failed','uncertain'].includes(b.state))return fail(400,'Invalid update.');
  await env.DB.prepare("UPDATE order_updates SET state=?,updated=? WHERE order_id=? AND version=? AND state='pending'").bind(b.state,time,b.id,b.version).run();return Response.json({ok:true});
 }
 if(path==='delivery'){
  if(!['owner_sent','receipt_sent'].includes(b.stage))return fail(400,'Invalid delivery stage.');
  await env.DB.prepare(`UPDATE orders SET ${b.stage}=1 WHERE id=? AND expires>?`).bind(b.id,time).run();return Response.json({ok:true});
 }
 if(path==='status'){
  if(!ORDER_STATUSES.includes(b.status)||!Number.isSafeInteger(b.version)||b.version<0)return fail(400,'Invalid status.');
  if(b.status!=='new'&&JSON.parse(row.snapshot).approvalRequired&&(await proofDetail(env,b.id)).status!=='approved')return fail(409,'The customer must approve the current design before production.');
  // D1 batch is one transaction. A concurrent tab cannot claim the same version.
  const changed=await env.DB.batch([env.DB.prepare("UPDATE orders SET status=?,version=version+1 WHERE id=? AND version=? AND expires>? AND status<>? AND (?='new' OR COALESCE(json_extract(snapshot,'$.approvalRequired'),0)=0 OR EXISTS(SELECT 1 FROM proof_state p JOIN proof_revisions r ON r.order_id=p.order_id AND r.revision=p.revision AND r.digest=p.digest WHERE p.order_id=orders.id AND p.status='approved')) RETURNING version").bind(b.status,b.id,b.version,time,b.status,b.status),env.DB.prepare('INSERT INTO order_history(order_id,version,status,created) SELECT id,version,status,? FROM orders WHERE id=? AND version=? AND status=? AND changes()>0 ON CONFLICT DO NOTHING').bind(time,b.id,b.version+1,b.status)]);
  return changed[0].results.length?Response.json({ok:true,version:b.version+1}):fail(409,'Order changed. Refresh before updating.');
 }
 return fail(404,'Not found.');
}
export async function cleanOrders(env){const time=now();await cleanProofs(env);await env.DB.batch([env.DB.prepare('DELETE FROM order_updates WHERE order_id IN (SELECT id FROM orders WHERE expires<=?)').bind(time),env.DB.prepare('DELETE FROM order_history WHERE order_id IN (SELECT id FROM orders WHERE expires<=?)').bind(time),env.DB.prepare('DELETE FROM orders WHERE expires<=?').bind(time)]);}
