import {readSelect} from './read.mjs';
import {ARTWORK_LIMITS as limits,artworkId,artworkHash} from '../src/artwork-policy.mjs';
import {validateJpeg} from '../server/jpeg.mjs';
const fail=(status,error)=>Response.json({error},{status});
const epoch=()=>Math.floor(Date.now()/1000);
const objectKey=(id,index)=>`${id}/${index}.jpg`;
export async function boundedBytes(request,max){
 const reader=request.body?.getReader();if(!reader)throw Error('Missing image');const parts=[];let size=0;
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>max){await reader.cancel();throw Error('Image too large')}parts.push(value)}
 const bytes=new Uint8Array(size);let at=0;for(const part of parts){bytes.set(part,at);at+=part.length}return bytes;
}
export async function artworkDigest(bytes){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');}
function manifest(files){
 if(!Array.isArray(files)||files.length>limits.files)throw Error('Invalid manifest');let bytes=0;
 const clean=files.map(f=>{if(!f||!Number.isSafeInteger(f.size)||f.size<20||f.size>limits.fileBytes||!artworkHash(f.sha256)||typeof f.proof!=='boolean'||!/^design-\d{2,}-(?:photo|proof|row-[1-5]-col-[1-5])\.jpg$/.test(f.name))throw Error('Invalid file');bytes+=f.size;return {size:f.size,sha256:f.sha256,proof:f.proof,name:f.name}});
 if(bytes>limits.requestBytes)throw Error('Too much artwork');return {json:JSON.stringify(clean),bytes,files:clean};
}
async function operation(env){
 const id='ops:'+new Date().toISOString().slice(0,7);
 return !!await env.DB.prepare('INSERT INTO artwork_usage(id,amount) VALUES (?,1) ON CONFLICT(id) DO UPDATE SET amount=amount+1 WHERE amount<? RETURNING amount').bind(id,limits.monthlyOperations).first();
}
async function init(body,env){
 if(!artworkId(body.id)||!artworkHash(body.owner)||!artworkHash(body.key))return fail(400,'Invalid artwork request.');
 let m;try{m=manifest(body.files)}catch{return fail(400,'Check artwork sizes and formats.')}
 const now=epoch(),day=Math.floor(now/86400),month=new Date().toISOString().slice(0,7),slot=Math.floor(now/900);
 const existing=await env.DB.prepare('SELECT * FROM artwork_requests WHERE id=?').bind(body.id).first();
 const response=row=>row.owner!==body.owner?fail(403,'This artwork belongs to another session.'):row.manifest!==m.json?fail(409,'Artwork changed. Start a new request.'):row.expires<=now?fail(410,'Artwork expired.'):Response.json({ok:true,expires:row.expires});
 if(existing)return response(existing);
 const budget=[['retained',m.bytes,limits.retainedBytes],['bytes:day:'+day,m.bytes,limits.dailyBytes],['bytes:month:'+month,m.bytes,limits.monthlyBytes],['requests:day:'+day,1,limits.dailyRequests],['requests:month:'+month,1,limits.monthlyRequests],['ip:'+slot+':'+body.key,1,5]];
 const reservation=crypto.randomUUID(),available=budget.map(()=>'(COALESCE((SELECT amount FROM artwork_usage WHERE id=?),0)+?<=?)').join(' AND ');
 const insert=env.DB.prepare(`INSERT INTO artwork_requests(id,owner,manifest,bytes,created,expires,reservation) SELECT ?,?,?,?,?,?,? WHERE ${available} ON CONFLICT(id) DO NOTHING`).bind(body.id,body.owner,m.json,m.bytes,now,now+limits.retentionSeconds,reservation,...budget.flat());
 await env.DB.batch([insert,...budget.map(([id,cost])=>env.DB.prepare('INSERT INTO artwork_usage(id,amount) SELECT ?,? WHERE EXISTS(SELECT 1 FROM artwork_requests WHERE id=? AND reservation=?) ON CONFLICT(id) DO UPDATE SET amount=amount+excluded.amount').bind(id,cost,body.id,reservation)),...m.files.map((_,i)=>env.DB.prepare('INSERT INTO artwork_files(request_id,slot) SELECT ?,? WHERE EXISTS(SELECT 1 FROM artwork_requests WHERE id=? AND reservation=?) ON CONFLICT DO NOTHING').bind(body.id,i,body.id,reservation))]);
 const row=await env.DB.prepare('SELECT * FROM artwork_requests WHERE id=?').bind(body.id).first();return row?response(row):fail(429,'The artwork allowance is full. Keep your draft and try later.');
}
async function upload(request,env){
 const id=request.headers.get('X-Artwork-Id'),owner=request.headers.get('X-Artwork-Owner'),raw=request.headers.get('X-Artwork-Index');
 if(!artworkId(id)||!artworkHash(owner)||!/^\d{1,2}$/.test(raw||'')||request.headers.get('content-type')!=='image/jpeg')return fail(400,'Invalid upload.');
 const index=Number(raw);
 // Return only this immutable manifest entry, not every file in the order.
 const row=await env.DB.prepare('SELECT r.owner,r.expires,json_extract(r.manifest,?) AS file,f.ready FROM artwork_requests r LEFT JOIN artwork_files f ON f.request_id=r.id AND f.slot=? WHERE r.id=?').bind('$['+index+']',index,id).first();
 if(!row||row.owner!==owner)return fail(403,'Artwork session not found.');if(row.expires<=epoch())return fail(410,'Artwork expired.');
 const file=row.file&&JSON.parse(row.file);if(!file)return fail(400,'Unknown artwork file.');
 if(row.ready)return Response.json({ok:true});
 let bytes;try{bytes=await boundedBytes(request,file.size);if(bytes.length!==file.size||await artworkDigest(bytes)!==file.sha256)throw Error('Mismatch');validateJpeg(bytes,file.proof,limits.fileBytes)}catch{return fail(400,'The artwork file could not be verified.')}
 const lease=crypto.randomUUID(),now=epoch();
 // The operation belongs only to the lease acquired by this atomic batch.
 // A competing/repeated upload cannot spend quota without winning that lease.
 const claims=await env.DB.batch([
  env.DB.prepare('UPDATE artwork_files SET tries=tries+1,lease=?,lease_until=? WHERE request_id=? AND slot=? AND ready=0 AND tries<3 AND lease_until<=? RETURNING slot').bind(lease,now+120,id,index,now),
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
 const row=await (['/artwork/detail','/artwork/download'].includes(path)?readSelect(env.DB,'SELECT * FROM artwork_requests WHERE id=?',[body.id]):env.DB.prepare('SELECT * FROM artwork_requests WHERE id=?').bind(body.id).first());
 if(!row)return fail(404,'Artwork not found or removed.');if(row.expires<=epoch())return fail(410,'This artwork has expired.');
 if(path==='/artwork/complete'){
  if(row.owner!==body.owner)return fail(403,'Artwork belongs to another session.');
  if(body.files&&JSON.stringify(body.files)!==row.manifest)return fail(409,'Artwork manifest changed.');
  const pending=await env.DB.prepare('SELECT count(*) AS n FROM artwork_files WHERE request_id=? AND ready=0').bind(body.id).first();
  if(pending.n)return fail(409,'Some artwork has not finished uploading.');
  await env.DB.prepare('UPDATE artwork_requests SET finalized=1 WHERE id=?').bind(body.id).run();return Response.json({ok:true,expires:row.expires});
 }
 if(!row.finalized)return fail(404,'These designs have not been submitted.');
 const files=JSON.parse(row.manifest);
 if(path==='/artwork/detail')return Response.json({id:row.id,created:row.created,expires:row.expires,files:files.map(({name,size},index)=>({index,name,size}))});
 if(path==='/artwork/download'){
  if(!Number.isInteger(body.index)||!files[body.index])return fail(404,'File not found.');
  if(!await operation(env))return fail(429,'The download allowance is full.');
  const object=await env.ARTWORK.get(objectKey(body.id,body.index));if(!object)return fail(404,'File no longer available.');
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
