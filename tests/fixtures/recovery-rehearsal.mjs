// Disposable recovery procedure, never a production migration or provider restore.
import {DatabaseSync,backup} from 'node:sqlite';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {readdirSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {performance} from 'node:perf_hooks';
import assert from 'node:assert/strict';
import {artworkEnv,manifest,tile,sha} from '../helpers/artwork.mjs';
import security from '../../security/index.mjs';
import {cleanArtwork} from '../../security/artwork.mjs';
import {cleanOrders} from '../../security/orders.mjs';
import {sixMonthsAfter} from '../../server/order-retention.mjs';
import {signToken,verifyToken} from '../../server/auth.mjs';
import {downloadOrderArchive} from '../../admin/order-archive.mjs';
import {readContent} from '../../server/content.mjs';
import {defaultContent} from '../../src/content/model.mjs';
import {readSeasons,validateSeasonState} from '../../server/seasons.mjs';
import {seedState} from '../../src/seasons/model.mjs';

function database(sql){
 const prepare=(query,args=[])=>({bind(...values){return prepare(query,values)},run:async()=>({meta:sql.prepare(query).run(...args)}),first:async()=>sql.prepare(query).get(...args)||null,all:async()=>({results:sql.prepare(query).all(...args)})});
 return {prepare,async batch(statements){sql.exec('BEGIN');try{const result=[];for(const statement of statements)result.push(await statement.all());sql.exec('COMMIT');return result}catch(error){sql.exec('ROLLBACK');throw error}}};
}
const call=(env,path,body)=>security.fetch(new Request('https://disconnected.invalid/'+path,{method:'POST',body:JSON.stringify(body)}),env);
async function json(env,path,body){const r=await call(env,path,body);assert.equal(r.status,200,path+': '+await r.clone().text());return r.json()}
async function seed(env,now,label){
 const m=await manifest(),file=m.files[0];await json(env,'artwork/init',m);
 const upload=await security.fetch(new Request('https://disconnected.invalid/artwork/upload',{method:'POST',headers:{'Content-Type':'image/jpeg','X-Artwork-Id':m.id,'X-Artwork-Owner':m.owner,'X-Artwork-Index':'0'},body:tile}),env);assert.equal(upload.status,200);
 await json(env,'artwork/complete',m);
 const snapshot={approvalRequired:true,contact:{name:'Synthetic '+label,email:'synthetic@example.invalid',phone:'0000000000'},locker:{name:'Synthetic',area:'Synthetic'},notes:'Synthetic recovery instructions',items:[{id:'item-1',kind:'photo',name:'Synthetic '+label,qty:1,files:[{...file,index:0}]}],magnetQty:1,subtotalCents:5000,paymentStatus:'unpaid'};
 await json(env,'orders/create',{id:m.id,fingerprint:'f'.repeat(64),snapshot,privateArtwork:true});await json(env,'proofs/seed',{id:m.id,version:0});
 const tokenHash=await sha(new TextEncoder().encode(label)),sessionId=await sha(new TextEncoder().encode(label+'session'));
 // Seed historical records directly to model a snapshot taken before retirement.
 env.sql.prepare("UPDATE proof_state SET token_hash=?,status='approved',approved_at=? WHERE order_id=?").run(tokenHash,now,m.id);
 env.sql.prepare('INSERT INTO proof_sessions(id,order_id,revision,token_hash,expires) VALUES(?,?,1,?,?)').run(sessionId,m.id,tokenHash,now+1800);
 return {...m,tokenHash,sessionId,created:now,expires:now+1209600};
}

export async function rehearseRecovery({negativeControl=false}={}){
 const folder=await mkdtemp(join(tmpdir(),'customvibe-disposable-recovery-')),source=artworkEnv(),originalNow=Date.now,originalFetch=globalThis.fetch;
 const base=Math.floor(originalNow()/1000),clock={seconds:base},timings={},checks={};let restored,contentSource,contentRestored;
 Date.now=()=>clock.seconds*1000;globalThis.fetch=async()=>{throw Error('Network forbidden in local recovery rehearsal')};
 try{
  // Actual service writes establish six-month order details and fourteen-day files.
  const active=await seed(source,clock.seconds,'active'),missing=await seed(source,clock.seconds,'missing'),corrupt=await seed(source,clock.seconds,'corrupt'),fulfilled=await seed(source,clock.seconds,'fulfilled');
  await json(source,'orders/status',{id:fulfilled.id,version:1,status:'fulfilled'});const fulfilledBefore=source.sql.prepare('SELECT expires,fulfilled_at,artwork_expires FROM orders WHERE id=?').get(fulfilled.id);
  clock.seconds=base-1209500;const expiring=await seed(source,clock.seconds,'expires-during-outage');
  clock.seconds=base-200*86400;const old=await seed(source,clock.seconds,'expired-order');clock.seconds=base;
  const oldAdmin=await signToken({scope:'admin',jti:'a'.repeat(64),csrf:'b'.repeat(64),exp:base+600},'c'.repeat(64));assert.ok(await verifyToken(oldAdmin,'c'.repeat(64),'admin'));
  // SQLite backup is a real database snapshot. Only synthetic objects are copied.
  let start=performance.now();await backup(source.sql,join(folder,'security.sqlite'));const objectSnapshot=new Map([...source.objects].map(([key,value])=>[key,new Uint8Array(value)]));timings.snapshotMs=performance.now()-start;
  contentSource=new DatabaseSync(':memory:');for(const f of readdirSync('migrations/content').filter(f=>f.endsWith('.sql')).sort())contentSource.exec(readFileSync('migrations/content/'+f,'utf8'));
  const catalogue={...structuredClone(defaultContent),revision:7};contentSource.prepare('INSERT INTO content(id,revision,body) VALUES(1,?,?)').run(7,JSON.stringify(catalogue));const seasons={...seedState(),revision:9,mode:'off'};validateSeasonState(seasons);contentSource.exec('CREATE TABLE seasonal_settings(id INTEGER PRIMARY KEY CHECK(id=1),revision INTEGER NOT NULL,body TEXT NOT NULL)');contentSource.prepare('INSERT INTO seasonal_settings(id,revision,body) VALUES(1,?,?)').run(9,JSON.stringify(seasons));await backup(contentSource,join(folder,'content.sqlite'));const seasonHash=await sha(new TextEncoder().encode(JSON.stringify(seasons)));const contentHash=await sha(new TextEncoder().encode(contentSource.prepare('SELECT body FROM content').get().body));
  clock.seconds=base+20;await json(source,'proofs/revoke',{id:active.id,version:1});
  clock.seconds=base+60;const afterSnapshot=await seed(source,clock.seconds,'after-snapshot');
  // Simulate loss and corruption. An object with no request row is an orphan.
  objectSnapshot.delete(missing.id+'/0.jpg');objectSnapshot.get(corrupt.id+'/0.jpg')[100]^=1;const orphan=crypto.randomUUID()+'/0.jpg';objectSnapshot.set(orphan,new Uint8Array(tile));
  clock.seconds=base+120;start=performance.now();const restoreStarted=start;const restoredSQL=new DatabaseSync(join(folder,'security.sqlite'));restored={...source,sql:restoredSQL,DB:database(restoredSQL),objects:new Map(objectSnapshot)};
  restored.ARTWORK={async get(key){const bytes=restored.objects.get(key);return bytes?{body:new Blob([bytes]).stream(),size:bytes.length}:null},async delete(keys){for(const key of Array.isArray(keys)?keys:[keys])restored.objects.delete(key)},async put(key,bytes){restored.objects.set(key,new Uint8Array(bytes))}};
  contentRestored=new DatabaseSync(join(folder,'content.sqlite'));timings.openSnapshotMs=performance.now()-start;
  // This internal quarantine probe proves why restoring an old revocation table
  // alone is unsafe. Nothing is exposed to a browser before the fence below.
  checks.retiredEndpointDeniesRestoredSession=(await call(restored,'proofs/read',{sessionId:active.sessionId})).status===410;assert.ok(checks.retiredEndpointDeniesRestoredSession);
  start=performance.now();
  if(!negativeControl){
   // Fail closed when post-snapshot revocations or replacement decisions are lost.
   restored.sql.exec("DELETE FROM proof_sessions; UPDATE proof_state SET token_hash=NULL;");
  }
  checks.rotatedAdminSigningKeyRejectsOldSession=await verifyToken(oldAdmin,'d'.repeat(64),'admin')===null;
  await cleanOrders(restored);await cleanArtwork(restored);
  const invalid=[],expectedKeys=new Set();
  for(const request of restored.sql.prepare('SELECT * FROM artwork_requests').all()){
   for(const [index,file] of JSON.parse(request.manifest).entries()){
    const key=request.id+'/'+index+'.jpg';expectedKeys.add(key);const data=restored.objects.get(key);
    if(!data||data.length!==file.size||await sha(data)!==file.sha256){invalid.push({id:request.id,index,reason:data?'hash mismatch':'missing object'});await restored.ARTWORK.delete(key);restored.sql.prepare('UPDATE artwork_requests SET finalized=0 WHERE id=?').run(request.id);restored.sql.prepare("UPDATE proof_state SET status='awaiting_design',approved_at=NULL,token_hash=NULL WHERE order_id=?").run(request.parent_order||request.id);}
   }
  }
  const orphans=[];for(const key of restored.objects.keys())if(!expectedKeys.has(key)){orphans.push(key);await restored.ARTWORK.delete(key)}
  // Quarantine reconciliation also removes metadata detached from retained orders.
  for(const table of ['proof_sessions','proof_events','proof_revisions','proof_state'])restored.sql.exec(`DELETE FROM ${table} WHERE order_id NOT IN(SELECT id FROM orders)`);
  timings.quarantineCleanupAndReconcileMs=performance.now()-start;
  checks.expiredObjectsAndRequestsRemoved=!restored.objects.has(expiring.id+'/0.jpg')&&!restored.sql.prepare('SELECT id FROM artwork_requests WHERE id=?').get(expiring.id);
  checks.expiredProofRecordsRemoved=['proof_sessions','proof_events','proof_revisions'].every(table=>!restored.sql.prepare(`SELECT order_id FROM ${table} WHERE order_id=?`).get(expiring.id));
  checks.orderDetailsRetainedSixMonths=restored.sql.prepare('SELECT expires FROM orders WHERE id=?').get(active.id).expires===sixMonthsAfter(base);
  checks.fulfilledExpiryPreserved=restored.sql.prepare('SELECT expires FROM orders WHERE id=?').get(fulfilled.id).expires===fulfilledBefore.expires;
  checks.expiredOrderRemoved=!restored.sql.prepare('SELECT id FROM orders WHERE id=?').get(old.id);
  const retained=JSON.parse(restored.sql.prepare('SELECT snapshot FROM orders WHERE id=?').get(expiring.id).snapshot);checks.expiredOrderArtworkReferencesRemoved=retained.artworkRemoved===true&&retained.items.every(i=>i.files.length===0&&!i.values&&!i.brief);
  checks.originalDeadlineUnchanged=restored.sql.prepare('SELECT expires FROM artwork_requests WHERE id=?').get(active.id).expires===active.expires;
  checks.revokedLinkDenied=(await call(restored,'proofs/exchange',{tokenHash:active.tokenHash,sessionId:'9'.repeat(64)})).status===410;
  checks.revokedSessionDenied=(await call(restored,'proofs/read',{sessionId:active.sessionId})).status===410;
  checks.expiredSessionDenied=(await call(restored,'proofs/read',{sessionId:expiring.sessionId})).status===410;
  const current=await json(restored,'orders/detail',{id:active.id});checks.historyPreserved=current.proof.status==='approved';
  checks.legacyCapabilitiesCleared=!restored.sql.prepare('SELECT id FROM proof_sessions').get()&&!restored.sql.prepare('SELECT token_hash FROM proof_state WHERE token_hash IS NOT NULL').get();
  checks.productionDoesNotRequireApproval=(await call(restored,'orders/status',{id:active.id,version:current.version,status:'in_progress'})).status===200;
  const missingOrder=await json(restored,'orders/detail',{id:missing.id});let archiveFailed=false;try{await downloadOrderArchive(missingOrder,(_i,f)=>call(restored,'artwork/download',{id:f.requestId,index:f.index}))}catch{archiveFailed=true}checks.missingArtworkFailsArchive=archiveFailed;
  checks.twoUnrecoverableFilesDetected=invalid.length===2;checks.orphanObjectRemoved=orphans.includes(orphan)&&!restored.objects.has(orphan);
  checks.currentGoodHashMatches=await sha(restored.objects.get(active.id+'/0.jpg'))===active.files[0].sha256;
  checks.noEmailClaims=restored.sql.prepare('SELECT COUNT(*) n FROM order_updates').get().n===0;
  checks.paymentUnpaid=JSON.parse(restored.sql.prepare('SELECT snapshot FROM orders WHERE id=?').get(active.id).snapshot).paymentStatus==='unpaid';
  checks.snapshotDataLossMeasured=!restored.sql.prepare('SELECT id FROM orders WHERE id=?').get(afterSnapshot.id);
  checks.catalogueHashMatches=await sha(new TextEncoder().encode(contentRestored.prepare('SELECT body FROM content').get().body))===contentHash;
  checks.catalogueReadable=(await readContent(database(contentRestored),defaultContent)).revision===7;
  const restoredSeasons=await readSeasons(database(contentRestored));checks.seasonalSettingsPreserved=restoredSeasons.revision===9&&restoredSeasons.mode==='off'&&await sha(new TextEncoder().encode(contentRestored.prepare('SELECT body FROM seasonal_settings').get().body))===seasonHash;
  timings.restoreAndVerifyMs=performance.now()-restoreStarted;
  for(const [name,value] of Object.entries(checks))assert.equal(value,true,name);
  const migrations=await Promise.all(readdirSync('migrations/security').filter(f=>f.endsWith('.sql')).sort().map(async file=>({file,sha256:await sha(await readFile('migrations/security/'+file))})));
  const configuration=await Promise.all(['wrangler.jsonc','wrangler.security.jsonc','wrangler.catalogue.jsonc','wrangler.admin.jsonc','package-lock.json'].map(async file=>({file,sha256:await sha(await readFile(file))})));
  return {configuration,sourceBaseline:'2113ecdfd6c7c4a5e6992cd2c3561b184617bfa8',node:process.version,sqlite:restored.sql.prepare('SELECT sqlite_version() version').get().version,migrations,fixture:{snapshotEpoch:base,restoreEpoch:clock.seconds,engineeredSnapshotAgeSeconds:120,latestLostWriteSecondsAfterSnapshot:60,lostOrders:1,sourceOrders:source.sql.prepare('SELECT COUNT(*) n FROM orders').get().n,restoredRetainedOrders:restored.sql.prepare('SELECT COUNT(*) n FROM orders').get().n},timings,checks,invalidFiles:invalid.map(f=>({index:f.index,reason:f.reason})),matchedRetainedObjects:restored.objects.size,localOnly:true,providerRestorePerformed:false,providerRestoreTiming:null,dec04:'OPEN',targetsApproved:false};
 }finally{Date.now=originalNow;globalThis.fetch=originalFetch;restored?.sql.close();source.sql.close();contentSource?.close();contentRestored?.close();await rm(folder,{recursive:true,force:true})}
}
