import {privacyState,privacyConflict} from './order-privacy.mjs';
import {readSelect} from './read.mjs';
import {ARTWORK_LIMITS as limits,artworkId,artworkHash} from '../src/artwork-policy.mjs';
import {validateJpeg} from '../server/jpeg.mjs';
const fail=(status,error)=>Response.json({error},{status});
const epoch=()=>Math.floor(Date.now()/1000);
const objectKey=(id,index)=>`${id}/${index}.jpg`;
export async function boundedBytes(request,max){
 // workerd enforces the exact length natively, avoiding a JavaScript chunk copy.
 if(typeof FixedLengthStream!=='undefined'){
  if(!request.body)throw Error('Missing image');
  const {readable,writable}=new FixedLengthStream(max);
  const [,buffer]=await Promise.all([request.body.pipeTo(writable),new Response(readable).arrayBuffer()]);
  return new Uint8Array(buffer);
 }
 // Portable fallback for local Node tests; the caller also checks exact size.
 const reader=request.body?.getReader();if(!reader)throw Error('Missing image');const parts=[];let size=0;
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>max){await reader.cancel();throw Error('Image too large')}parts.push(value)}
 const bytes=new Uint8Array(size);let at=0;for(const part of parts){bytes.set(part,at);at+=part.length}return bytes;
}
export async function artworkDigest(bytes){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');}
function manifest(files){
 if(!Array.isArray(files)||files.length>limits.files)throw Error('Invalid manifest');let bytes=0;
 const clean=files.map(f=>{if(!f||!Number.isSafeInteger(f.size)||f.size<20||f.size>limits.fileBytes||!artworkHash(f.sha256)||typeof f.proof!=='boolean'||!/^design-\d{2,}-(?:photo|proof|row-[1-5]-col-[1-5]|(?:face|alphabet|counting|words|colours|reminders|thanks|business|qr|wifi|information)-[1-9][0-9]?)\.jpg$/.test(f.name))throw Error('Invalid file');bytes+=f.size;return {size:f.size,sha256:f.sha256,proof:f.proof,name:f.name}});
 if(bytes>limits.requestBytes)throw Error('Too much artwork');return {json:JSON.stringify(clean),bytes,files:clean};
}
async function operation(env,count=1){
 if(!count)return true;
 const id='ops:'+new Date().toISOString().slice(0,7);
 return !!await env.DB.prepare('INSERT INTO artwork_usage(id,amount) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET amount=amount+excluded.amount WHERE amount<=? RETURNING amount').bind(id,count,limits.monthlyOperations-count).first();
}
function verifiedObject(object,file){
 // R2 verifies the SHA-256 supplied by the existing upload writer. An ETag is
 // not that checksum, and absent checksum metadata cannot establish integrity.
 const checksum=object?.checksums?.sha256;
 return object?.size===file.size&&checksum?.byteLength===32&&Array.from(new Uint8Array(checksum),b=>b.toString(16).padStart(2,'0')).join('')===file.sha256;
}
async function unexpired(env,id){
 if(await privacyState(env,id,'artwork'))return false;
 const row=await env.DB.prepare('SELECT expires FROM artwork_requests WHERE id=?').bind(id).first();
 return row&&row.expires>epoch();
}
async function init(body,env){
 if(!artworkId(body.id)||!artworkHash(body.owner)||!artworkHash(body.key))return fail(400,'Invalid artwork request.');
 if(await privacyState(env,body.id,'artwork')||await privacyState(env,body.id)||body.parentOrder&&await privacyState(env,body.parentOrder))return privacyConflict();
 let m;try{m=manifest(body.files)}catch{return fail(400,'Check artwork sizes and formats.')}
 const now=epoch(),day=Math.floor(now/86400),month=new Date().toISOString().slice(0,7),slot=Math.floor(now/900);
 const existing=await env.DB.prepare('SELECT * FROM artwork_requests WHERE id=?').bind(body.id).first();
 const response=row=>row.owner!==body.owner?fail(403,'This artwork belongs to another session.'):row.manifest!==m.json?fail(409,'Artwork changed. Start a new request.'):row.expires<=now?fail(410,'Artwork expired.'):Response.json({ok:true,expires:row.expires});
 if(existing)return existing.parent_order!==(body.parentOrder||null)?fail(409,'Artwork order changed.'):response(existing);
 const parent=body.parentOrder?await env.DB.prepare('SELECT COALESCE(artwork_expires,expires) AS expires FROM orders WHERE id=? AND COALESCE(artwork_expires,expires)>?').bind(body.parentOrder,now).first():null;
 if(body.parentOrder&&!parent)return fail(410,'Order expired.');
 const expires=parent?Math.min(parent.expires,now+limits.retentionSeconds):now+limits.retentionSeconds;
 const budget=[['retained',m.bytes,limits.retainedBytes],['bytes:day:'+day,m.bytes,limits.dailyBytes],['bytes:month:'+month,m.bytes,limits.monthlyBytes],['requests:day:'+day,1,limits.dailyRequests],['requests:month:'+month,1,limits.monthlyRequests],['ip:'+slot+':'+body.key,1,5]];
 const reservation=crypto.randomUUID(),available=budget.map(()=>'(COALESCE((SELECT amount FROM artwork_usage WHERE id=?),0)+?<=?)').join(' AND ');
 const parentLimit=parent?' AND EXISTS(SELECT 1 FROM orders WHERE id=? AND COALESCE(artwork_expires,expires)>?) AND COALESCE((SELECT SUM(bytes) FROM artwork_requests WHERE id=? OR parent_order=?),0)+?<=? AND COALESCE((SELECT SUM(json_array_length(manifest)) FROM artwork_requests WHERE id=? OR parent_order=?),0)+?<=?':'';
 const insert=env.DB.prepare(`INSERT INTO artwork_requests(id,owner,manifest,bytes,created,expires,reservation,parent_order) SELECT ?,?,?,?,?,?,?,? WHERE ${available}${parentLimit} ON CONFLICT(id) DO NOTHING`).bind(body.id,body.owner,m.json,m.bytes,now,expires,reservation,body.parentOrder||null,...budget.flat(),...(parent?[body.parentOrder,now,body.parentOrder,body.parentOrder,m.bytes,limits.requestBytes,body.parentOrder,body.parentOrder,m.files.length,limits.files]:[]));
 await env.DB.batch([insert,...budget.map(([id,cost])=>env.DB.prepare('INSERT INTO artwork_usage(id,amount) SELECT ?,? WHERE EXISTS(SELECT 1 FROM artwork_requests WHERE id=? AND reservation=?) ON CONFLICT(id) DO UPDATE SET amount=amount+excluded.amount').bind(id,cost,body.id,reservation)),...m.files.map((_,i)=>env.DB.prepare('INSERT INTO artwork_files(request_id,slot) SELECT ?,? WHERE EXISTS(SELECT 1 FROM artwork_requests WHERE id=? AND reservation=?) ON CONFLICT DO NOTHING').bind(body.id,i,body.id,reservation))]);
 const row=await env.DB.prepare('SELECT * FROM artwork_requests WHERE id=?').bind(body.id).first();return row?response(row):fail(429,'The artwork allowance is full. Keep your draft and try later.');
}
async function upload(request,env){
 const id=request.headers.get('X-Artwork-Id'),owner=request.headers.get('X-Artwork-Owner'),raw=request.headers.get('X-Artwork-Index');
 if(!artworkId(id)||!artworkHash(owner)||!/^\d{1,2}$/.test(raw||'')||request.headers.get('content-type')!=='image/jpeg')return fail(400,'Invalid upload.');
 const index=Number(raw);
 // Return only this immutable manifest entry, not every file in the order.
 const row=await env.DB.prepare(`SELECT r.owner,r.expires,EXISTS(SELECT 1 FROM order_privacy_tombstones t JOIN order_privacy_operations p USING(operation_id) WHERE ((t.kind='artwork' AND t.id=r.id) OR (t.kind='order' AND (t.id=r.id OR t.id=r.parent_order))) AND (t.expires>unixepoch() OR p.state='erasing')) AS privacy_blocked,json_extract(r.manifest,?) AS file,f.ready,f.lease FROM artwork_requests r LEFT JOIN artwork_files f ON f.request_id=r.id AND f.slot=? WHERE r.id=?`).bind('$['+index+']',index,id).first();
 if(row?.privacy_blocked)return privacyConflict();
 if(!row||row.owner!==owner)return fail(403,'Artwork session not found.');if(row.expires<=epoch())return fail(410,'Artwork expired.');
 const file=row.file&&JSON.parse(row.file);if(!file)return fail(400,'Unknown artwork file.');
 if(row.ready){
  if(!await operation(env))return fail(429,'The storage operation allowance is full.');
  const object=await env.ARTWORK.head(objectKey(id,index));
  if(!await unexpired(env,id))return fail(410,'Artwork expired.');
  if(object)return verifiedObject(object,file)?Response.json({ok:true}):fail(409,'The artwork file could not be verified.');
  // Only confirmed absence may be repaired from the caller's validated bytes.
  // The observed lease below fences this check against a newer upload.
 }
 let bytes;try{bytes=await boundedBytes(request,file.size);if(bytes.length!==file.size||await artworkDigest(bytes)!==file.sha256)throw Error('Mismatch');validateJpeg(bytes,file.proof,limits.fileBytes)}catch{return fail(400,'The artwork file could not be verified.')}
 const lease=crypto.randomUUID(),now=epoch();
 // The operation belongs only to the lease acquired by this atomic batch.
 // A competing/repeated upload cannot spend quota without winning that lease.
 const claims=await env.DB.batch([
  env.DB.prepare('UPDATE artwork_files SET ready=0,tries=tries+1,lease=?,lease_until=? WHERE request_id=? AND slot=? AND ready=? AND lease IS ? AND tries<3 AND lease_until<=? AND EXISTS(SELECT 1 FROM artwork_requests WHERE id=? AND expires>?) RETURNING slot').bind(lease,now+120,id,index,row.ready,row.lease,now,id,now),
  env.DB.prepare('INSERT INTO artwork_usage(id,amount) SELECT ?,1 WHERE EXISTS(SELECT 1 FROM artwork_files WHERE request_id=? AND slot=? AND lease=?) ON CONFLICT(id) DO UPDATE SET amount=amount+1 WHERE amount<? RETURNING amount').bind('ops:'+new Date().toISOString().slice(0,7),id,index,lease,limits.monthlyOperations)
 ]);
 if(!claims[0].results.length)return fail(409,'An upload is still processing or its retry limit was reached.');
 if(!claims[1].results.length){await env.DB.prepare('UPDATE artwork_files SET lease_until=0 WHERE request_id=? AND slot=? AND lease=?').bind(id,index,lease).run();return fail(429,'The storage operation allowance is full.');}
 try{
  await env.ARTWORK.put(objectKey(id,index),bytes,{httpMetadata:{contentType:'image/jpeg'},sha256:file.sha256});
  // Publish only while this lease and its retained request are still valid.
  const published=await env.DB.prepare('UPDATE artwork_files SET ready=1,lease_until=0 WHERE request_id=? AND slot=? AND lease=? AND EXISTS(SELECT 1 FROM artwork_requests WHERE id=? AND expires>?) RETURNING slot').bind(id,index,lease,id,epoch()).first();
  if(published)return Response.json({ok:true});
  const retained=await env.DB.prepare('SELECT expires FROM artwork_requests WHERE id=?').bind(id).first();
  if(!retained||retained.expires<=epoch()){await env.ARTWORK.delete(objectKey(id,index));return fail(410,'Artwork expired while uploading.');}
  return fail(503,'Upload could not be confirmed. Keep this tab open and retry shortly.');
 }catch{return fail(503,'Upload could not be confirmed. Keep this tab open and retry shortly.');}
}
export async function artworkService(request,env){
 if(!env.ARTWORK||!env.DB)return fail(503,'Private artwork storage is unavailable.');
 const path=new URL(request.url).pathname;
 if(path==='/artwork/upload')return upload(request,env);
 const body=await request.json();
 if(path==='/artwork/init')return init(body,env);
 if(!artworkId(body.id))return fail(400,'Invalid reference.');
 if(await privacyState(env,body.id,'artwork'))return privacyConflict();
 const row=await (['/artwork/detail','/artwork/download'].includes(path)?readSelect(env.DB,'SELECT * FROM artwork_requests WHERE id=?',[body.id]):env.DB.prepare('SELECT * FROM artwork_requests WHERE id=?').bind(body.id).first());
 if(await privacyState(env,body.id,'artwork'))return privacyConflict();
 if(!row)return fail(404,'Artwork not found or removed.');if(row.expires<=epoch())return fail(410,'This artwork has expired.');
 if(path==='/artwork/complete'){
  if(row.owner!==body.owner)return fail(403,'Artwork belongs to another session.');
  if(body.files&&JSON.stringify(body.files)!==row.manifest)return fail(409,'Artwork manifest changed.');
  const pending=await env.DB.prepare('SELECT count(*) AS n FROM artwork_files WHERE request_id=? AND ready=0').bind(body.id).first();
  if(pending.n)return fail(409,'Some artwork has not finished uploading.');
  const files=JSON.parse(row.manifest);
  // Reserve the whole bounded manifest before any R2 calls. Partial quota
  // availability must not permit unaccounted reads or partial finalization.
  if(!await operation(env,files.length))return fail(429,'The storage operation allowance is full.');
  for(const [index,file] of files.entries()){
   if(!verifiedObject(await env.ARTWORK.head(objectKey(body.id,index)),file))return fail(409,'Some artwork has not finished uploading.');
  }
  const completed=await env.DB.prepare('UPDATE artwork_requests SET finalized=1 WHERE id=? AND expires>? AND NOT EXISTS(SELECT 1 FROM artwork_files WHERE request_id=? AND ready=0) RETURNING expires').bind(body.id,epoch(),body.id).first();
  if(completed)return Response.json({ok:true,expires:completed.expires});
  return await unexpired(env,body.id)?fail(409,'Some artwork has not finished uploading.'):fail(410,'Artwork expired.');
 }
 if(!row.finalized)return fail(404,'These designs have not been submitted.');
 const files=JSON.parse(row.manifest);
 if(path==='/artwork/detail')return Response.json({id:row.id,created:row.created,expires:row.expires,files:files.map(({name,size},index)=>({index,name,size}))});
 if(path==='/artwork/download'){
  if(!Number.isInteger(body.index)||!files[body.index])return fail(404,'File not found.');
  if(!await operation(env))return fail(429,'The download allowance is full.');
  const object=await env.ARTWORK.get(objectKey(body.id,body.index));if(await privacyState(env,body.id,'artwork'))return privacyConflict();if(!object)return fail(404,'File no longer available.');
  return new Response(object.body,{headers:{'Content-Type':'image/jpeg','Content-Disposition':`attachment; filename="${files[body.index].name}"`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
 }
 return fail(404,'Not found.');
}
export async function cleanArtwork(env){
 if(!env.ARTWORK)return;
 const rows=(await env.DB.prepare('SELECT id,manifest,bytes FROM artwork_requests WHERE expires<=? LIMIT 20').bind(epoch()).all()).results;
 for(const row of rows){
  // Never release retained-byte quota until the object deletions succeeded.
  const keys=JSON.parse(row.manifest).map((_,i)=>objectKey(row.id,i));if(keys.length)await env.ARTWORK.delete(keys);
  await env.DB.batch([env.DB.prepare("UPDATE artwork_usage SET amount=MAX(0,amount-?) WHERE id='retained' AND EXISTS(SELECT 1 FROM artwork_requests WHERE id=?)").bind(row.bytes,row.id),env.DB.prepare('DELETE FROM artwork_files WHERE request_id=?').bind(row.id),env.DB.prepare('DELETE FROM artwork_requests WHERE id=?').bind(row.id)]);
 }
 const day=Math.floor(epoch()/86400),slot=Math.floor(epoch()/900),month=new Date().toISOString().slice(0,7);
 await env.DB.prepare("DELETE FROM artwork_usage WHERE (id LIKE 'ip:%' AND CAST(substr(id,4,instr(substr(id,4),':')-1) AS INTEGER)<?) OR (id LIKE '%:day:%' AND CAST(substr(id,instr(id,':day:')+5) AS INTEGER)<?) OR (id LIKE '%:month:%' AND substr(id,length(id)-6)<?) OR (id LIKE 'ops:%' AND substr(id,5)<?)").bind(slot-2,day-1,month,month).run();
}
