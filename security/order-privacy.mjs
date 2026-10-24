import {readSelect} from './read.mjs';
import {boundedBody} from '../server/auth.mjs';
import {artworkId,artworkHash} from '../src/artwork-policy.mjs';
const now=()=>Math.floor(Date.now()/1000),fail=(status,error)=>Response.json({error},{status});
const conflict=()=>fail(409,'Order or privacy preview changed. Read the current order and preview again.');
const reference=row=>'CV-'+String(row.seq).padStart(6,'0');
const fields=(value,keys)=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).every(key=>keys.includes(key))&&keys.every(key=>Object.hasOwn(value,key));
const hash=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value)))),b=>b.toString(16).padStart(2,'0')).join('');
const active="EXISTS(SELECT 1 FROM order_privacy_operations p WHERE p.order_id=orders.id AND p.state='erasing')";
// This same SQL gate is evaluated when the write executes, after any D1 queueing.
const available=`owner_sent=1 AND receipt_sent=1 AND NOT ${active}
 AND NOT EXISTS(SELECT 1 FROM initial_order_dispatches d WHERE d.order_id=orders.id OR d.fingerprint=orders.fingerprint)
 AND NOT EXISTS(SELECT 1 FROM order_updates u WHERE u.order_id=orders.id AND u.state IN ('pending','uncertain'))
 AND NOT EXISTS(SELECT 1 FROM order_update_attempts a WHERE a.order_id=orders.id AND a.state IN ('pending','uncertain'))
 AND NOT EXISTS(SELECT 1 FROM submissions s WHERE s.kind='order' AND ((s.order_id=orders.id AND (s.owner_sent=0 OR s.receipt_sent=0)) OR (s.order_id IS NULL AND s.fingerprint=orders.fingerprint)))
 AND NOT EXISTS(SELECT 1 FROM artwork_files f JOIN artwork_requests r ON r.id=f.request_id WHERE (r.id=orders.id OR r.parent_order=orders.id) AND (f.ready=0 OR f.lease_until>unixepoch()))`;
function contact(value){
 if(!fields(value,['name','email','phone']))throw Error('Invalid contact');
 const line=(value,max)=>{if(typeof value!=='string'||!value.trim()||value.length>max||/[\x00-\x1f\x7f]/.test(value))throw Error('Invalid contact');return value.trim()};
 const result={name:line(value.name,100),email:line(value.email,254),phone:line(value.phone,30)};
 if(!/^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(result.email)||!/^\+?[\d ()-]{7,30}$/.test(result.phone)||result.phone.replace(/\D/g,'').length<7||result.phone.replace(/\D/g,'').length>15)throw Error('Invalid contact');return result;
}
export function currentContact(row){return row.current_contact?JSON.parse(row.current_contact):JSON.parse(row.snapshot).contact;}
export async function privacyState(env,id,kind='order'){
 const time=now();
 const tomb=await readSelect(env.DB,"SELECT p.operation_id,p.state FROM order_privacy_tombstones t JOIN order_privacy_operations p USING(operation_id) WHERE t.kind=? AND t.id=? AND (t.expires>? OR p.state='erasing')",[kind,id,time]);
 if(tomb)return {state:tomb.state,operationId:tomb.operation_id};
 if(kind==='artwork'){
  const row=await readSelect(env.DB,"SELECT p.operation_id,p.state FROM artwork_requests r JOIN order_privacy_operations p ON p.order_id=r.id OR p.order_id=r.parent_order WHERE r.id=? AND (p.state='erasing' OR p.expires>?)",[id,time]);if(row)return {state:row.state,operationId:row.operation_id};
 }
 if(kind==='submission'){
  const row=await readSelect(env.DB,"SELECT p.operation_id,p.state FROM submissions s JOIN order_privacy_operations p ON p.order_id=s.order_id WHERE s.id=? AND (p.state='erasing' OR p.expires>?)",[id,time]);if(row)return {state:row.state,operationId:row.operation_id};
 }
 return null;
}
export const privacyConflict=()=>fail(409,'This order is being erased or has been erased. Read its privacy status before continuing.');
export const redactedOrder=(row,state)=>({id:row.id,reference:reference(row),version:row.version,privacy:{state:'erasing',operationId:state.operationId}});
async function operation(db,id){return db.prepare('SELECT * FROM order_privacy_operations WHERE order_id=?').bind(id).first();}
async function graph(env,id){
 const db=env.DB;
 const result=await db.batch([
  db.prepare('SELECT orders.*,coalesce((SELECT revision FROM order_privacy_generations WHERE order_id=orders.id),0) privacy_graph_revision FROM orders WHERE id=?').bind(id),
  db.prepare('SELECT id,bytes,expires,manifest FROM artwork_requests WHERE id=? OR parent_order=? ORDER BY id').bind(id,id),
  db.prepare("SELECT id,expires,owner_sent,receipt_sent,owner_provider_id,receipt_provider_id FROM submissions WHERE order_id=? AND kind='order' ORDER BY id").bind(id),
  db.prepare(`SELECT
   (SELECT count(*) FROM order_history WHERE order_id=?) history,
   (SELECT count(*) FROM order_updates WHERE order_id=?)+(SELECT count(*) FROM order_update_attempts WHERE order_id=?) updates,
   (SELECT count(*) FROM proof_revisions WHERE order_id=?)+(SELECT count(*) FROM proof_state WHERE order_id=?)+(SELECT count(*) FROM proof_events WHERE order_id=?)+(SELECT count(*) FROM proof_sessions WHERE order_id=?) proofs,
   (SELECT count(*) FROM order_costs WHERE order_id=?)+(SELECT count(*) FROM finance_changes WHERE order_id=?) costs,
   (SELECT count(*) FROM order_stock_use WHERE order_id=?) stockLinks,
   (SELECT count(*) FROM order_update_attempts WHERE order_id=? AND provider_message_id IS NOT NULL)+(SELECT count(*) FROM mail_delivery_state WHERE order_id=? OR reference IN(SELECT id FROM submissions WHERE order_id=?))+(SELECT count(*) FROM mail_delivery_events WHERE state_id IN(SELECT id FROM mail_delivery_state WHERE order_id=? OR reference IN(SELECT id FROM submissions WHERE order_id=?))) receipts,
   (SELECT count(*) FROM artwork_files f JOIN artwork_requests r ON r.id=f.request_id WHERE (r.id=? OR r.parent_order=?) AND (f.ready=0 OR f.lease_until>unixepoch())) uploads,
   (SELECT count(*) FROM order_updates WHERE order_id=? AND state IN('pending','uncertain'))+(SELECT count(*) FROM order_update_attempts WHERE order_id=? AND state IN('pending','uncertain')) unresolved,
   (SELECT count(*) FROM submissions s JOIN orders o ON o.fingerprint=s.fingerprint WHERE o.id=? AND s.kind='order' AND s.order_id IS NULL) ambiguous,
   (SELECT count(*) FROM initial_order_dispatches d JOIN orders o ON (o.id=d.order_id OR o.fingerprint=d.fingerprint) WHERE o.id=?) initialDispatches`).bind(...Array(21).fill(id))
 ]);
 const row=result[0].results[0];if(!row)return null;
 const requests=result[1].results,submissions=result[2].results,s=result[3].results[0],blockers=[];
 if(!row.owner_sent||!row.receipt_sent||submissions.some(s=>!s.owner_sent||!s.receipt_sent))blockers.push('Initial customer or owner email is unfinished. Resolve it before a privacy action.');
 if(s.initialDispatches)blockers.push('An initial email request is still processing or unresolved. Resolve it before a privacy action.');
 if(s.unresolved)blockers.push('A customer update is pending or uncertain. Resolve it before a privacy action.');
 if(s.uploads)blockers.push('Artwork uploads are unfinished. Resolve them before a privacy action.');
 if(s.ambiguous)blockers.push('A legacy submission association needs review. Its ownership cannot be inferred.');
 const counts={orders:1,history:s.history,updates:s.updates,receipts:s.receipts+submissions.reduce((n,r)=>n+Number(!!r.owner_provider_id)+Number(!!r.receipt_provider_id),0),submissions:submissions.length,proofs:s.proofs,artworkRequests:requests.length,artworkFiles:requests.reduce((n,r)=>n+JSON.parse(r.manifest).length,0),artworkBytes:requests.reduce((n,r)=>n+r.bytes,0),costs:s.costs,stockLinks:s.stockLinks};
 const digest=await hash({row,requests,submissions,counts,blockers});return {row,requests,submissions,counts,blockers,digest};
}
const erasurePreview=g=>({id:g.row.id,reference:reference(g.row),version:g.row.version,digest:g.digest,counts:g.counts,artworkExpires:g.row.artwork_expires??g.row.expires,expires:g.row.expires,blockers:g.blockers});
const resumePreview=op=>({id:op.order_id,reference:op.reference,version:op.version,digest:op.digest,operationId:op.operation_id,counts:JSON.parse(op.counts),artworkExpires:op.artwork_expires,expires:op.expires,state:'erasing',blockers:[]});
const outcome=op=>Response.json({ok:true,state:'complete',operationId:op.operation_id});
async function finish(env,op){
 try{
  const manifest=JSON.parse(op.manifest),keys=manifest.keys;
  // R2 must confirm the exact immutable manifest first. A rejection preserves the job.
  if(keys.length){if(!env.ARTWORK)throw Error('Unavailable');await env.ARTWORK.delete(keys);}
  const db=env.DB,requestIds=JSON.stringify(manifest.requests.map(r=>r.id)),submissionIds=JSON.stringify(manifest.submissions.map(r=>r.id));
  await db.batch([
   db.prepare("UPDATE artwork_usage SET amount=MAX(0,amount-(SELECT coalesce(sum(bytes),0) FROM artwork_requests WHERE id IN(SELECT value FROM json_each(?)))) WHERE id='retained'").bind(requestIds),
   db.prepare('DELETE FROM artwork_files WHERE request_id IN(SELECT value FROM json_each(?))').bind(requestIds),
   db.prepare('DELETE FROM artwork_requests WHERE id IN(SELECT value FROM json_each(?))').bind(requestIds),
   db.prepare('DELETE FROM mail_delivery_events WHERE state_id IN(SELECT id FROM mail_delivery_state WHERE order_id=? OR reference IN(SELECT value FROM json_each(?)))').bind(op.order_id,submissionIds),
   db.prepare('DELETE FROM mail_delivery_state WHERE order_id=? OR reference IN(SELECT value FROM json_each(?))').bind(op.order_id,submissionIds),
   db.prepare('DELETE FROM submissions WHERE id IN(SELECT value FROM json_each(?))').bind(submissionIds),
   ...['order_update_attempts','order_updates','order_history','proof_sessions','proof_events','proof_state','proof_revisions','order_costs','finance_changes','order_stock_use'].map(table=>db.prepare(`DELETE FROM ${table} WHERE order_id=?`).bind(op.order_id)),
   db.prepare('DELETE FROM orders WHERE id=?').bind(op.order_id),
   db.prepare("UPDATE order_privacy_operations SET state='complete',manifest=NULL,counts=NULL,reference=NULL WHERE operation_id=? AND state='erasing'").bind(op.operation_id)
  ]);
  return outcome(op);
 }catch{
  const current=await operation(env.DB,op.order_id);if(current?.state==='complete')return outcome(current);
  return Response.json({ok:false,state:'incomplete',operationId:op.operation_id,error:'Erasure is incomplete. Read its status and resume this same operation.'},{status:503});
 }
}
export async function orderPrivacyService(request,env){
 if(request.method!=='POST')return fail(405,'Method not allowed.');if(!env.DB)return fail(503,'Privacy controls are temporarily unavailable.');
 const action=new URL(request.url).pathname.slice('/privacy/'.length),schema={
  'preview-correction':['id','version','contact'],correct:['id','version','contact','expectedDigest','operationId'],
  'preview-erasure':['id','version'],erase:['id','version','expectedDigest','operationId','confirmation','acknowledged'],status:['id','operationId']
 };
 if(!Object.hasOwn(schema,action))return fail(404,'Not found.');
 let b,proposed;try{b=JSON.parse(await boundedBody(request,8192));if(!fields(b,schema[action])||!artworkId(b.id)||action!=='status'&&(!Number.isSafeInteger(b.version)||b.version<0)||['correct','erase','status'].includes(action)&&!artworkId(b.operationId)||['correct','erase'].includes(action)&&!artworkHash(b.expectedDigest))throw Error('Invalid input');if(action.includes('correction')||action==='correct')proposed=contact(b.contact);}catch{return fail(400,'Invalid privacy input.');}
 const op=await operation(env.DB,b.id);
 if(action==='status')return Response.json({state:op?.operation_id===b.operationId&&(op.state==='erasing'||op.expires>now())?op.state:'not-found',operationId:b.operationId});
 if(op){
  if(action==='preview-erasure'&&op.state==='erasing')return Response.json(resumePreview(op));
  if(action==='erase'&&op.operation_id===b.operationId&&op.version===b.version&&op.digest===b.expectedDigest&&b.acknowledged===true&&typeof b.confirmation==='string'&&await hash(b.confirmation)===op.confirmation_hash)return op.state==='complete'?outcome(op):finish(env,op);
  return conflict();
 }
 const g=await graph(env,b.id);if(!g)return fail(404,'Order not found.');if(g.row.expires<=now())return fail(410,'This order has expired.');if(g.row.version!==b.version)return conflict();
 if(action==='preview-erasure')return Response.json(erasurePreview(g));
 if(g.blockers.length)return fail(409,g.blockers[0]);
 if(action==='preview-correction')return Response.json({id:b.id,reference:reference(g.row),version:g.row.version,digest:await hash({graph:g.digest,contact:proposed}),contactRevision:g.row.contact_revision,contact:{before:currentContact(g.row),after:proposed}});
 if(action==='correct'){
  if(b.expectedDigest!==await hash({graph:g.digest,contact:proposed}))return conflict();
  const changed=await env.DB.batch([
   env.DB.prepare(`UPDATE orders SET current_contact=?,contact_revision=contact_revision+1 WHERE id=? AND version=? AND contact_revision=? AND coalesce((SELECT revision FROM order_privacy_generations WHERE order_id=orders.id),0)=? AND expires>unixepoch() AND ${available} RETURNING version,contact_revision`).bind(JSON.stringify(proposed),b.id,b.version,g.row.contact_revision,g.row.privacy_graph_revision),
   env.DB.prepare('UPDATE order_update_attempts SET preview_hash=NULL,preview_until=NULL WHERE order_id=? AND changes()>0').bind(b.id)
  ]);
  const row=changed[0].results[0];return row?Response.json({ok:true,version:row.version,contactRevision:row.contact_revision}):conflict();
 }
 if(b.expectedDigest!==g.digest||b.confirmation!==reference(g.row)||b.acknowledged!==true)return conflict();
 const manifest={requests:g.requests.map(({id,bytes,expires})=>({id,bytes,expires})),submissions:g.submissions.map(({id,expires})=>({id,expires})),keys:g.requests.flatMap(r=>JSON.parse(r.manifest).map((_,i)=>r.id+'/'+i+'.jpg'))},db=env.DB;
 const claim=await db.batch([
  db.prepare(`INSERT INTO order_privacy_operations(operation_id,order_id,version,digest,confirmation_hash,reference,state,manifest,counts,expires,artwork_expires) SELECT ?,id,version,?,?,?,'erasing',?,?,expires,coalesce(artwork_expires,expires) FROM orders WHERE id=? AND version=? AND contact_revision=? AND coalesce((SELECT revision FROM order_privacy_generations WHERE order_id=orders.id),0)=? AND expires>unixepoch() AND ${available} ON CONFLICT DO NOTHING RETURNING operation_id`).bind(b.operationId,g.digest,await hash(b.confirmation),reference(g.row),JSON.stringify(manifest),JSON.stringify(g.counts),b.id,b.version,g.row.contact_revision,g.row.privacy_graph_revision),
  ...[{kind:'order',id:b.id,expires:g.row.expires},...manifest.requests.map(r=>({...r,kind:'artwork'})),...manifest.submissions.map(r=>({...r,kind:'submission'}))].map(r=>db.prepare("INSERT INTO order_privacy_tombstones(kind,id,operation_id,expires) SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM order_privacy_operations WHERE operation_id=? AND order_id=? AND state='erasing') ON CONFLICT DO NOTHING").bind(r.kind,r.id,b.operationId,r.expires,b.operationId,b.id))
 ]);
 const saved=await operation(db,b.id);if(!claim[0].results.length||!saved||saved.operation_id!==b.operationId)return conflict();return finish(env,saved);
}
export async function cleanOrderPrivacy(env){
 const time=now();await env.DB.batch([
  env.DB.prepare("DELETE FROM order_privacy_tombstones WHERE expires<=? AND operation_id IN(SELECT operation_id FROM order_privacy_operations WHERE state='complete')").bind(time),
  env.DB.prepare("DELETE FROM order_privacy_operations WHERE state='complete' AND expires<=? AND NOT EXISTS(SELECT 1 FROM order_privacy_tombstones t WHERE t.operation_id=order_privacy_operations.operation_id)").bind(time)
 ]);
}
