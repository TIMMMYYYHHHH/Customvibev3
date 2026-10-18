import {artworkExpiry} from '../server/order-retention.mjs';
import {proofRows,reusableProofFiles} from '../src/proof-manifest.mjs';
import {artworkId,artworkHash,ARTWORK_LIMITS} from '../src/artwork-policy.mjs';
import {artworkDigest,artworkService} from './artwork.mjs';
const now=()=>Math.floor(Date.now()/1000),fail=(status,error)=>Response.json({error},{status});
const callArtwork=(env,path,b)=>artworkService(new Request('https://internal/artwork/'+path,{method:'POST',body:JSON.stringify(b)}),env);
export async function proofDetail(env,id){const s=await env.DB.prepare('SELECT * FROM proof_state WHERE order_id=?').bind(id).first();if(!s)return {status:'awaiting_design',revision:0};const r=await env.DB.prepare('SELECT manifest FROM proof_revisions WHERE order_id=? AND revision=?').bind(id,s.revision).first();return {status:s.status,revision:s.revision,digest:s.digest,approvedAt:s.approved_at,items:r?JSON.parse(r.manifest):[],events:(await env.DB.prepare('SELECT revision,kind,created,message FROM proof_events WHERE order_id=? ORDER BY id DESC').bind(id).all()).results};}
function mapFiles(snapshot,requestId,files,selection,reusable=[]){
 const expected=proofRows(snapshot),choices=selection||files.map((_,upload)=>({upload})),used=new Set();
 if(choices.length!==expected.length)throw Error('Provide every final magnet and puzzle preview.');
 const resolved=choices.map((choice,n)=>{
  if(Number.isSafeInteger(choice?.upload)){
   const i=choice.upload,f=files[i];if(!f||used.has(i)||f.proof!==expected[n].proof||f.name!==expected[n].name)throw Error('Check the replacement artwork positions.');used.add(i);return {requestId,index:i,name:f.name,size:f.size,sha256:f.sha256,proof:f.proof};
  }
  const f=reusable[n];if(!f||choice?.requestId!==f.requestId||choice?.index!==f.index)throw Error('Only unchanged artwork from this design position can be reused.');return f;
 });
 if(used.size!==files.length)throw Error('Every uploaded file must belong to the final design.');
 let at=0;return snapshot.items.map((item,n)=>({id:item.id||`item-${n+1}`,name:item.name,kind:item.kind,qty:item.qty,...(item.values?.handyTemplate?{values:item.values}:{}),...(item.gridSize?{gridSize:item.gridSize}:{}),files:expected.filter(e=>e.itemId===(item.id||`item-${n+1}`)).map(row=>({...resolved[at++],copies:row.copies}))}));
}
async function session(env,id){if(!artworkHash(id))return null;return env.DB.prepare('SELECT s.*,p.digest,p.status,COALESCE(o.artwork_expires,o.expires) AS order_expires FROM proof_sessions s JOIN proof_state p ON p.order_id=s.order_id AND p.revision=s.revision AND p.token_hash=s.token_hash JOIN orders o ON o.id=s.order_id WHERE s.id=? AND s.expires>? AND MIN(o.expires,COALESCE(o.artwork_expires,o.expires))>?').bind(id,now(),now()).first();}
export async function proofService(request,env){
 const b=await request.json(),action=new URL(request.url).pathname.slice('/proofs/'.length),time=now();
 if(action==='exchange'){
  if(!artworkHash(b.tokenHash)||!artworkHash(b.sessionId))return fail(403,'This review link is invalid or expired.');
  const p=await env.DB.prepare('SELECT p.*,COALESCE(o.artwork_expires,o.expires) AS expires FROM proof_state p JOIN orders o ON o.id=p.order_id WHERE p.token_hash=? AND MIN(o.expires,COALESCE(o.artwork_expires,o.expires))>?').bind(b.tokenHash,time).first();if(!p)return fail(403,'This review link is invalid or expired.');
  const allowance=await env.DB.prepare('INSERT INTO attempts(id,count,until) VALUES (?,1,?) ON CONFLICT(id) DO UPDATE SET count=CASE WHEN until<=? THEN 1 ELSE count+1 END,until=CASE WHEN until<=? THEN excluded.until ELSE until END RETURNING count').bind('proof-session:'+b.tokenHash,time+900,time,time).first();if(allowance.count>20)return fail(429,'Please wait 15 minutes before opening another review session.');
  const expires=Math.min(p.expires,time+1800);await env.DB.prepare('INSERT INTO proof_sessions(id,order_id,revision,token_hash,expires) SELECT ?,order_id,revision,token_hash,? FROM proof_state WHERE order_id=? AND token_hash=? ON CONFLICT DO NOTHING').bind(b.sessionId,expires,p.order_id,b.tokenHash).run();return Response.json({id:p.order_id,revision:p.revision,expires});
 }
 if(['read','download','approve','changes'].includes(action)){
  const s=await session(env,b.sessionId);if(!s)return fail(403,'This review session is invalid or expired. Reopen your latest review link.');
  const revision=await env.DB.prepare('SELECT manifest FROM proof_revisions WHERE order_id=? AND revision=?').bind(s.order_id,s.revision).first();const items=JSON.parse(revision.manifest);
  if(action==='read'){await env.DB.prepare('UPDATE proof_sessions SET viewed_digest=? WHERE id=?').bind(s.digest,b.sessionId).run();return Response.json({revision:s.revision,digest:s.digest,status:s.status,expires:s.order_expires,items:items.map(i=>({name:i.name,qty:i.qty,kind:i.kind,gridSize:i.gridSize,files:i.files.map(f=>({slot:items.flatMap(i=>i.files).findIndex(x=>x===f),proof:f.proof,name:f.name,copies:f.copies??i.qty}))}))});}
  if(action==='download'){const files=items.flatMap(i=>i.files),f=Number.isSafeInteger(b.slot)&&files[b.slot];if(!f)return fail(404,'Image not found.');return callArtwork(env,'download',{id:f.requestId,index:f.index});}
  if(b.revision!==s.revision||b.digest!==s.digest||s.viewed_digest!==s.digest)return fail(409,'Open and review the current design before responding.');
  if(action==='approve'&&s.status==='approved')return Response.json({ok:true});
  if(s.status!=='awaiting_approval')return fail(409,'A new proof is needed before you can approve.');
  if(action==='changes'&&(typeof b.message!=='string'||!b.message.trim()||b.message.length>2000||/[\x00-\x08\x0b-\x1f\x7f]/.test(b.message)))return fail(400,'Describe the changes in up to 2,000 characters.');
  const status=action==='approve'?'approved':'changes_requested';
  // The session, digest and current revision are checked again in the transaction.
  const changed=await env.DB.batch([env.DB.prepare("UPDATE proof_state SET status=?,approved_at=? WHERE order_id=? AND revision=? AND digest=? AND status='awaiting_approval' AND token_hash=? AND EXISTS(SELECT 1 FROM orders WHERE id=? AND COALESCE(artwork_expires,expires)>?) RETURNING revision").bind(status,action==='approve'?time:null,s.order_id,s.revision,s.digest,s.token_hash,s.order_id,time),env.DB.prepare("INSERT INTO proof_events(order_id,revision,kind,created,message) SELECT order_id,revision,?,?,? FROM proof_state WHERE order_id=? AND status=? AND approved_at IS ? AND changes()>0").bind(action,time,action==='changes'?b.message.trim():'',s.order_id,status,action==='approve'?time:null),env.DB.prepare('UPDATE orders SET version=version+1 WHERE id=? AND changes()>0').bind(s.order_id)]);
  return changed[0].results.length?Response.json({ok:true}):fail(409,'The design changed. Reopen your latest review link.');
 }
 if(!artworkId(b.id))return fail(400,'Invalid order.');
 const order=await env.DB.prepare('SELECT * FROM orders WHERE id=? AND expires>?').bind(b.id,time).first();if(!order)return fail(410,'Order unavailable or expired.');const snapshot=JSON.parse(order.snapshot);
 if(action==='detail')return Response.json(await proofDetail(env,b.id));
 if(artworkExpiry(order)<=time)return fail(410,'Artwork has expired.');
 if(!snapshot.approvalRequired)return fail(409,'This historical order uses the original workflow.');
 // An immutable publish identity makes a lost success response safe to retry.
 if(action==='publish'&&artworkId(b.requestId)&&b.requestId!==b.id){const prior=await env.DB.prepare('SELECT revision,digest FROM proof_revisions WHERE order_id=? AND publish_id=?').bind(b.id,b.requestId).first();if(prior)return Response.json({ok:true,...prior});}
 if(!Number.isSafeInteger(b.version)||b.version!==order.version)return fail(409,'Order changed. Reload it first.');
 if(action==='check-link'){const p=await env.DB.prepare('SELECT token_hash,status FROM proof_state WHERE order_id=?').bind(b.id).first();return p?.status==='awaiting_approval'&&p.token_hash===b.tokenHash?Response.json({ok:true}):fail(409,'The review link changed. Preview again.');}
 if(action==='prepare'){
  if(!artworkId(b.requestId)||b.requestId===b.id||!artworkHash(b.owner))return fail(400,'Invalid upload.');
  let mapped;try{mapped=mapFiles(snapshot,b.requestId,b.files,b.selection,reusableProofFiles({id:b.id,snapshot,proof:await proofDetail(env,b.id)}))}catch(e){return fail(400,e.message)}
  return callArtwork(env,'init',{id:b.requestId,owner:b.owner,key:b.owner,files:b.files,parentOrder:b.id});
 }
 if(action==='seed'||action==='publish'){
  if((action==='seed'||b.requestId===b.id)&&snapshot.items.some(i=>i.designMode==='assisted'||!i.files.length))return fail(409,'Finish every design before publishing a proof.');
  const requestId=action==='seed'?b.id:b.requestId;if(!artworkId(requestId))return fail(400,'Invalid artwork.');
  const a=await env.DB.prepare('SELECT * FROM artwork_requests WHERE id=? AND finalized=1 AND expires>?').bind(requestId,time).first();if(!a||(requestId!==b.id&&a.parent_order!==b.id)||a.expires>artworkExpiry(order))return fail(409,'Complete this order’s artwork upload first.');
  let items;try{items=mapFiles(snapshot,requestId,JSON.parse(a.manifest),action==='seed'?undefined:b.selection,reusableProofFiles({id:b.id,snapshot,proof:await proofDetail(env,b.id)}))}catch(e){return fail(400,e.message)}
  const manifest=JSON.stringify(items),digest=await artworkDigest(new TextEncoder().encode(manifest)),current=await proofDetail(env,b.id),revision=current.revision+1;
  if(action==='seed'&&current.revision)return fail(409,'A proof already exists.');
  const updated=await env.DB.batch([
   env.DB.prepare("UPDATE orders SET version=version+1,status='new' WHERE id=? AND version=? AND expires>? AND status NOT IN ('shipped','fulfilled') RETURNING version").bind(b.id,b.version,time),
   env.DB.prepare('INSERT INTO proof_revisions(order_id,revision,digest,manifest,created,publish_id) SELECT ?,?,?,?,?,? WHERE changes()>0').bind(b.id,revision,digest,manifest,time,action==='publish'&&requestId!==b.id?requestId:null),
   env.DB.prepare("INSERT INTO proof_state(order_id,revision,digest,status) SELECT ?,?,?,'awaiting_approval' WHERE changes()>0 ON CONFLICT(order_id) DO UPDATE SET revision=excluded.revision,digest=excluded.digest,status=excluded.status,token_hash=NULL,approved_at=NULL").bind(b.id,revision,digest),
   env.DB.prepare("INSERT INTO proof_events(order_id,revision,kind,created) SELECT ?,?,'published',? WHERE changes()>0").bind(b.id,revision,time)
  ]);return updated[0].results.length?Response.json({ok:true,revision,digest,version:b.version+1}):fail(409,'Order changed or has shipped.');
 }
 if(action==='issue'||action==='revoke'){
  const p=await proofDetail(env,b.id);if(!p.revision||action==='issue'&&p.status!=='awaiting_approval')return fail(409,'Publish a complete proof ready for review first.');if(action==='issue'&&!artworkHash(b.tokenHash))return fail(400,'Invalid review link.');
  const changed=await env.DB.batch([env.DB.prepare('UPDATE orders SET version=version+1 WHERE id=? AND version=? AND expires>? RETURNING version').bind(b.id,b.version,time),env.DB.prepare('UPDATE proof_state SET token_hash=? WHERE order_id=? AND changes()>0').bind(action==='issue'?b.tokenHash:null,b.id)]);return changed[0].results.length?Response.json({ok:true,revision:p.revision,version:b.version+1}):fail(409,'Order changed.');
 }
 return fail(404,'Not found.');
}
export async function cleanProofs(env){const time=now();
 await env.DB.batch(['proof_sessions','proof_events','proof_revisions'].map(t=>env.DB.prepare(`DELETE FROM ${t} WHERE order_id IN(SELECT id FROM orders WHERE COALESCE(artwork_expires,expires)<=?)`).bind(time)));
 await env.DB.prepare('UPDATE proof_state SET token_hash=NULL WHERE order_id IN(SELECT id FROM orders WHERE COALESCE(artwork_expires,expires)<=?)').bind(time).run();await env.DB.batch(['proof_sessions','proof_events','proof_state','proof_revisions'].map(t=>env.DB.prepare(`DELETE FROM ${t} WHERE order_id IN(SELECT id FROM orders WHERE expires<=?)`).bind(time)));await env.DB.prepare('DELETE FROM proof_sessions WHERE expires<=?').bind(time).run();}
