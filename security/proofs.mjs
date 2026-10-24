import {privacyState,privacyConflict} from './order-privacy.mjs';
import {readSelect} from './read.mjs';
import {artworkExpiry} from '../server/order-retention.mjs';
import {proofRows,reusableProofFiles} from '../src/proof-manifest.mjs';
import {artworkId,artworkHash,ARTWORK_LIMITS} from '../src/artwork-policy.mjs';
import {artworkDigest,artworkService} from './artwork.mjs';
const now=()=>Math.floor(Date.now()/1000),fail=(status,error)=>Response.json({error},{status});
const callArtwork=(env,path,b)=>artworkService(new Request('https://internal/artwork/'+path,{method:'POST',body:JSON.stringify(b)}),env);
export async function proofDetail(env,id){const s=await readSelect(env.DB,'SELECT * FROM proof_state WHERE order_id=?',[id]);if(!s)return {status:'awaiting_design',revision:0};const r=await readSelect(env.DB,'SELECT manifest FROM proof_revisions WHERE order_id=? AND revision=?',[id,s.revision]);return {status:s.status,revision:s.revision,digest:s.digest,approvedAt:s.approved_at,items:r?JSON.parse(r.manifest):[],events:(await readSelect(env.DB,'SELECT revision,kind,created,message FROM proof_events WHERE order_id=? ORDER BY id DESC',[id],'all')).results};}
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
 let at=0;return snapshot.items.map((item,n)=>({id:item.id||`item-${n+1}`,name:item.name,kind:item.kind,qty:item.qty,...((item.values?.handyTemplate||item.values?.businessTemplate)?{values:item.values}:{}),...(item.gridSize?{gridSize:item.gridSize}:{}),files:expected.filter(e=>e.itemId===(item.id||`item-${n+1}`)).map(row=>({...resolved[at++],copies:row.copies}))}));
}
export async function proofService(request,env){
 const b=await request.json(),action=new URL(request.url).pathname.slice('/proofs/'.length),time=now();
 if(['issue','check-link','exchange','read','download','approve','changes'].includes(action))return fail(410,'Separate customer artwork approval is no longer required.');
 if(!artworkId(b.id))return fail(400,'Invalid order.');
 if(await privacyState(env,b.id))return privacyConflict();
 const order=await env.DB.prepare('SELECT * FROM orders WHERE id=? AND expires>?').bind(b.id,time).first();if(!order)return fail(410,'Order unavailable or expired.');const snapshot=JSON.parse(order.snapshot);
 if(action==='detail'){const detail=await proofDetail(env,b.id);return await privacyState(env,b.id)?privacyConflict():Response.json(detail);}
 if(artworkExpiry(order)<=time)return fail(410,'Artwork has expired.');
 // An immutable publish identity makes a lost success response safe to retry.
 if(action==='publish'&&artworkId(b.requestId)&&b.requestId!==b.id){const prior=await env.DB.prepare('SELECT revision,digest FROM proof_revisions WHERE order_id=? AND publish_id=?').bind(b.id,b.requestId).first();if(prior)return Response.json({ok:true,...prior});}
 if(!Number.isSafeInteger(b.version)||b.version!==order.version)return fail(409,'Order changed. Reload it first.');
 if(action==='prepare'){
  if(!artworkId(b.requestId)||b.requestId===b.id||!artworkHash(b.owner))return fail(400,'Invalid upload.');
  let mapped;try{mapped=mapFiles(snapshot,b.requestId,b.files,b.selection,reusableProofFiles({id:b.id,snapshot,proof:await proofDetail(env,b.id)}))}catch(e){return fail(400,e.message)}
  return callArtwork(env,'init',{id:b.requestId,owner:b.owner,key:b.owner,files:b.files,parentOrder:b.id});
 }
 if(action==='seed'||action==='publish'){
  if((action==='seed'||b.requestId===b.id)&&snapshot.items.some(i=>i.designMode==='assisted'||!i.files.length))return fail(409,'Finish every design before publishing artwork.');
  const requestId=action==='seed'?b.id:b.requestId;if(!artworkId(requestId))return fail(400,'Invalid artwork.');
  const a=await env.DB.prepare('SELECT * FROM artwork_requests WHERE id=? AND finalized=1 AND expires>?').bind(requestId,time).first();if(!a||(requestId!==b.id&&a.parent_order!==b.id)||a.expires>artworkExpiry(order))return fail(409,'Complete this order’s artwork upload first.');
  let items;try{items=mapFiles(snapshot,requestId,JSON.parse(a.manifest),action==='seed'?undefined:b.selection,reusableProofFiles({id:b.id,snapshot,proof:await proofDetail(env,b.id)}))}catch(e){return fail(400,e.message)}
  const manifest=JSON.stringify(items),digest=await artworkDigest(new TextEncoder().encode(manifest)),current=await proofDetail(env,b.id),revision=current.revision+1;
  if(action==='seed'&&current.revision)return fail(409,'An artwork revision already exists.');
  const updated=await env.DB.batch([
   env.DB.prepare("UPDATE orders SET version=version+1 WHERE id=? AND version=? AND expires>? AND status NOT IN ('shipped','fulfilled') RETURNING version").bind(b.id,b.version,time),
   env.DB.prepare('INSERT INTO proof_revisions(order_id,revision,digest,manifest,created,publish_id) SELECT ?,?,?,?,?,? WHERE changes()>0').bind(b.id,revision,digest,manifest,time,action==='publish'&&requestId!==b.id?requestId:null),
   env.DB.prepare("INSERT INTO proof_state(order_id,revision,digest,status) SELECT ?,?,?,'prepared' WHERE changes()>0 ON CONFLICT(order_id) DO UPDATE SET revision=excluded.revision,digest=excluded.digest,status=excluded.status,token_hash=NULL,approved_at=NULL").bind(b.id,revision,digest),
   env.DB.prepare("INSERT INTO proof_events(order_id,revision,kind,created) SELECT ?,?,'published',? WHERE changes()>0").bind(b.id,revision,time)
  ]);return updated[0].results.length?Response.json({ok:true,revision,digest,version:b.version+1}):fail(409,'Order changed or has shipped.');
 }
 if(action==='revoke'){
  const p=await proofDetail(env,b.id);if(!p.revision)return fail(409,'No artwork revision exists.');
  const changed=await env.DB.batch([env.DB.prepare('UPDATE orders SET version=version+1 WHERE id=? AND version=? AND expires>? RETURNING version').bind(b.id,b.version,time),env.DB.prepare('UPDATE proof_state SET token_hash=? WHERE order_id=? AND changes()>0').bind(null,b.id)]);return changed[0].results.length?Response.json({ok:true,revision:p.revision,version:b.version+1}):fail(409,'Order changed.');
 }
 return fail(404,'Not found.');
}
export async function cleanProofs(env){const time=now();
 await env.DB.batch(['proof_sessions','proof_events','proof_revisions'].map(t=>env.DB.prepare(`DELETE FROM ${t} WHERE order_id IN(SELECT id FROM orders WHERE COALESCE(artwork_expires,expires)<=?)`).bind(time)));
 await env.DB.prepare('UPDATE proof_state SET token_hash=NULL WHERE order_id IN(SELECT id FROM orders WHERE COALESCE(artwork_expires,expires)<=?)').bind(time).run();await env.DB.batch(['proof_sessions','proof_events','proof_state','proof_revisions'].map(t=>env.DB.prepare(`DELETE FROM ${t} WHERE order_id IN(SELECT id FROM orders WHERE expires<=?)`).bind(time)));await env.DB.prepare('DELETE FROM proof_sessions WHERE expires<=?').bind(time).run();}
