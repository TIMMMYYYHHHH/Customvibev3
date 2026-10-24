import test from 'node:test';
import assert from 'node:assert/strict';
import security from '../security/index.mjs';
import {artworkEnv,manifest,tile} from './helpers/artwork.mjs';
const call=(env,path,body)=>security.fetch(new Request('https://internal/'+path,{method:'POST',body:JSON.stringify(body)}),env);
const json=async(env,path,body)=>{const response=await call(env,path,body);const text=await response.text();return {response,body:text?JSON.parse(text):{}}};
const contact={name:'Changed Person',email:'changed@example.com',phone:'+27 82 123 4567'};
async function order(env,{artwork=false}={}){
 const id=crypto.randomUUID(),m=await manifest(id),snapshot={referenceVersion:2,contact:{name:'Original Person',email:'original@example.com',phone:'0821234567'},locker:{name:'Locker',area:'Durban'},items:[{kind:'photo',name:'Photo',qty:1,files:[{index:0,...m.files[0]}]}],magnetQty:1,subtotalCents:5000,paymentStatus:'unpaid'};
 if(artwork){assert.equal((await call(env,'artwork/init',m)).status,200);await env.ARTWORK.put(id+'/0.jpg',tile,{sha256:m.files[0].sha256});env.sql.prepare('UPDATE artwork_files SET ready=1 WHERE request_id=?').run(id);env.sql.prepare('UPDATE artwork_requests SET finalized=1 WHERE id=?').run(id);}
 const request={id,fingerprint:'a'.repeat(64),snapshot,privateArtwork:artwork};assert.equal((await call(env,'orders/create',request)).status,200);env.sql.prepare('UPDATE orders SET owner_sent=1,receipt_sent=1 WHERE id=?').run(id);
 return {id,request,detail:(await json(env,'orders/detail',{id})).body,m};
}
async function preview(env,o,action='erasure',extra={}){const r=await json(env,'privacy/preview-'+action,{id:o.id,version:o.detail.version,...extra});assert.equal(r.response.status,200,JSON.stringify(r.body));return r.body;}
const erase=(env,o,p,operationId=crypto.randomUUID())=>json(env,'privacy/erase',{id:o.id,version:o.detail.version,expectedDigest:p.digest,operationId:p.operationId||operationId,confirmation:o.detail.reference,acknowledged:true});
test('correction projects contact and name search while preserving immutable source, clocks, version and accepted send identity',async()=>{
 const env=artworkEnv(),o=await order(env),before=env.sql.prepare('SELECT * FROM orders WHERE id=?').get(o.id);
 let p=await preview(env,o,'correction',{contact});assert.equal(p.contactRevision,0);assert.deepEqual(p.contact.before,o.request.snapshot.contact);assert.deepEqual(p.contact.after,contact);
 const saved=await json(env,'privacy/correct',{id:o.id,version:0,contact,expectedDigest:p.digest,operationId:crypto.randomUUID()});assert.equal(saved.response.status,200);assert.equal(saved.body.version,0);assert.equal(saved.body.contactRevision,1);
 const row=env.sql.prepare('SELECT * FROM orders WHERE id=?').get(o.id);for(const key of ['snapshot','fingerprint','version','created','expires','artwork_expires','owner_sent','receipt_sent'])assert.equal(row[key],before[key],key);
 const d=(await json(env,'orders/detail',{id:o.id})).body;assert.deepEqual(d.snapshot.contact,contact);assert.equal(d.contactRevision,1);
 assert.equal((await json(env,'orders/list',{q:'Changed Person'})).body.orders.length,1);assert.equal((await json(env,'orders/list',{q:'Original Person'})).body.orders.length,0);
 assert.equal((await call(env,'orders/claim-update',{id:o.id,version:0})).status,409);assert.equal((await call(env,'orders/claim-update',{id:o.id,version:0,contactRevision:null})).status,409);assert.equal((await call(env,'orders/claim-update',{id:o.id,version:0,contactRevision:0})).status,409);
 const claim=await json(env,'orders/claim-update',{id:o.id,version:0,contactRevision:1});assert.equal(claim.body.claimed,true);await call(env,'orders/mark-update',{id:o.id,version:0,attempt:claim.body.attempt,state:'accepted'});
 p=await preview(env,o,'correction',{contact:{...contact,name:'Another name'}});assert.equal((await call(env,'privacy/correct',{id:o.id,version:0,contact:{...contact,name:'Another name'},expectedDigest:p.digest,operationId:crypto.randomUUID()})).status,200);
 const again=await json(env,'orders/claim-update',{id:o.id,version:0,contactRevision:2});assert.equal(again.body.claimed,false);assert.equal(again.body.state,'accepted');assert.equal(env.sql.prepare('SELECT count(*) n FROM order_update_attempts').get().n,1);
});
test('stale correction digest and stage version conflict with zero mail attempts',async()=>{
 const env=artworkEnv(),o=await order(env),p=await preview(env,o,'correction',{contact});
 await call(env,'orders/status',{id:o.id,version:0,status:'in_progress'});
 assert.equal((await call(env,'privacy/correct',{id:o.id,version:0,contact,expectedDigest:p.digest,operationId:crypto.randomUUID()})).status,409);assert.equal(env.sql.prepare('SELECT count(*) n FROM order_updates').get().n,0);
});
test('erasure exact graph removes original and child objects, customer links and costs while preserving unrelated orders and business stock history',async()=>{
 const env=artworkEnv(),o=await order(env,{artwork:true}),other=await order(env,{artwork:true}),child=await manifest();assert.equal((await call(env,'artwork/init',{...child,parentOrder:o.id})).status,200);await env.ARTWORK.put(child.id+'/0.jpg',tile,{sha256:child.files[0].sha256});env.sql.prepare('UPDATE artwork_files SET ready=1 WHERE request_id=?').run(child.id);
 env.sql.prepare("INSERT INTO proof_revisions VALUES(?,1,?,'[]',?,?)").run(o.id,'b'.repeat(64),o.detail.created,child.id);env.sql.prepare("INSERT INTO proof_state(order_id,revision) VALUES(?,1)").run(o.id);env.sql.prepare("INSERT INTO proof_events(order_id,revision,kind,created,message) VALUES(?,1,'changes',?,'private note')").run(o.id,o.detail.created);
 env.sql.prepare("INSERT INTO order_costs VALUES(?,1,0,'estimated','{}',?)").run(o.id,o.detail.created);env.sql.prepare("INSERT INTO finance_changes(order_id,kind,after_payload,actor,created) VALUES(?,'save','{}','authenticated-admin',?)").run(o.id,o.detail.created);
 const stockItem=crypto.randomUUID();env.sql.prepare("INSERT INTO stock_items VALUES(?,'Paper','sheet',1,8000,1,1000,1,0)").run(stockItem);
 const manual=(await json(env,'orders/claim-update',{id:o.id,version:0})).body;await call(env,'orders/mark-update',{id:o.id,version:0,attempt:manual.attempt,state:'accepted',providerMessageId:'manual-receipt',recipientBinding:{recipientCount:1,recipientDigest:'a'.repeat(64)}});const mailState=env.sql.prepare('SELECT id FROM mail_delivery_state WHERE order_id=?').get(o.id);env.sql.prepare("INSERT INTO mail_delivery_events VALUES('manual-event',?,'email.delivered',?,?)").run(mailState.id,o.detail.created,o.detail.artworkExpires);env.sql.prepare("INSERT INTO proof_sessions VALUES(?,?,1,?,?,NULL)").run('session-hash',o.id,'token-hash',o.detail.artworkExpires);env.sql.prepare("INSERT INTO order_history VALUES(?,1,'new',?)").run(o.id,o.detail.created);
 const movement=crypto.randomUUID();env.sql.prepare("INSERT INTO stock_movements(operation_id,request_digest,kind,created,reason,lines,result) VALUES(?,?,'use',?,'','[]','{}')").run(movement,'c'.repeat(64),o.detail.created);env.sql.prepare("INSERT INTO order_stock_use VALUES(?,?,1,'active','[]',NULL,?)").run(o.id,movement,o.detail.created);
 const p=await preview(env,o);assert.equal(p.counts.artworkRequests,2);assert.equal(p.counts.artworkFiles,2);assert.equal(p.counts.artworkBytes,tile.length*2);assert.equal(p.counts.costs,2);assert.equal(p.counts.stockLinks,1);assert.equal(p.artworkExpires,o.detail.artworkExpires);assert.equal(p.expires,o.detail.expires);
 const result=await erase(env,o,p);assert.equal(result.response.status,200);assert.equal(result.body.state,'complete');assert.equal(env.objects.has(o.id+'/0.jpg'),false);assert.equal(env.objects.has(child.id+'/0.jpg'),false);assert.equal(env.objects.has(other.id+'/0.jpg'),true);
 for(const table of ['order_costs','finance_changes','order_stock_use','proof_state','proof_events','proof_revisions'])assert.equal(env.sql.prepare('SELECT count(*) n FROM '+table+' WHERE order_id=?').get(o.id).n,0,table);
 assert.equal(env.sql.prepare('SELECT count(*) n FROM stock_movements').get().n,1);assert.equal(env.sql.prepare('SELECT balance_milli FROM stock_items WHERE id=?').get(stockItem).balance_milli,8000);assert.equal(env.sql.prepare('SELECT count(*) n FROM mail_delivery_events').get().n,0);assert.equal(env.sql.prepare('SELECT count(*) n FROM mail_delivery_state').get().n,0);assert.equal(env.sql.prepare("SELECT amount FROM artwork_usage WHERE id='retained'").get().amount,tile.length);
 assert.equal((await call(env,'orders/create',o.request)).status,409);assert.equal((await call(env,'artwork/init',o.m)).status,409);assert.equal((await json(env,'orders/list',{})).body.orders.length,1);assert.equal((await call(env,'orders/detail',{id:o.id})).status,404);
 const status=await json(env,'privacy/status',{id:o.id,operationId:result.body.operationId});assert.equal(status.body.state,'complete');assert.equal(JSON.stringify(status.body).includes('Original'),false);
 const again=await erase(env,o,p,result.body.operationId);assert.equal(again.body.state,'complete');assert.equal(env.sql.prepare("SELECT amount FROM artwork_usage WHERE id='retained'").get().amount,tile.length);
});
test('partial R2 deletion has durable redacted resume, all mutation/read fences, and quota release once',async()=>{
 const env=artworkEnv(),o=await order(env,{artwork:true}),p=await preview(env,o),operationId=crypto.randomUUID(),realDelete=env.ARTWORK.delete;env.ARTWORK.delete=async()=>{throw Error('Synthetic object failure')};
 const failed=await erase(env,o,p,operationId);assert.equal(failed.body.state,'incomplete');assert.equal(failed.body.operationId,operationId);assert.equal(env.sql.prepare("SELECT amount FROM artwork_usage WHERE id='retained'").get().amount,tile.length);
 const detail=(await json(env,'orders/detail',{id:o.id})).body;assert.deepEqual(Object.keys(detail).sort(),['id','privacy','reference','version']);assert.equal(detail.privacy.state,'erasing');assert.equal((await json(env,'orders/list',{})).body.orders[0].snapshot,undefined);
 for(const [path,b] of [['orders/status',{id:o.id,version:0,status:'in_progress'}],['orders/claim-update',{id:o.id,version:0}],['artwork/detail',{id:o.id}],['artwork/download',{id:o.id,index:0}],['artwork/complete',{id:o.id,owner:o.m.owner}],['proofs/detail',{id:o.id}],['finance/order-read',{id:o.id}],['stock/order-read',{id:o.id}]])assert.equal((await call(env,path,b)).status,409,path);
 const resumed=await preview(env,o);assert.equal(resumed.operationId,operationId);assert.equal(resumed.digest,p.digest);env.ARTWORK.delete=realDelete;
 assert.equal((await erase(env,o,resumed)).body.state,'complete');assert.equal(env.sql.prepare("SELECT amount FROM artwork_usage WHERE id='retained'").get().amount,0);
});
test('pending or uncertain manual sends, unfinished initial mail and ready=0 uploads block correction and erasure even after upload lease expiry',async()=>{
 for(const blocker of ['pending','uncertain','initial','upload']){
  const env=artworkEnv(),o=await order(env,{artwork:true});
  if(blocker==='initial')env.sql.prepare('UPDATE orders SET receipt_sent=0 WHERE id=?').run(o.id);
  else if(blocker==='upload')env.sql.prepare('UPDATE artwork_files SET ready=0,lease_until=0 WHERE request_id=?').run(o.id);
  else{const c=(await json(env,'orders/claim-update',{id:o.id,version:0})).body;if(blocker==='uncertain')await call(env,'orders/mark-update',{id:o.id,version:0,attempt:c.attempt,state:'uncertain'});}
  const p=await preview(env,o);assert.ok(p.blockers.length,blocker);assert.equal((await erase(env,o,p)).response.status,409,blocker);assert.equal((await call(env,'privacy/preview-correction',{id:o.id,version:0,contact})).status,409,blocker);
 }
});
test('graph edits after preview conflict; legacy unlinked submission scope is blocked, never guessed',async()=>{
 const env=artworkEnv(),o=await order(env),p=await preview(env,o);env.sql.prepare("INSERT INTO order_history VALUES(?,9,'new',?)").run(o.id,o.detail.created);assert.equal((await erase(env,o,p)).response.status,409);
 env.sql.prepare("INSERT INTO submissions(id,fingerprint,reservation,kind,owner_sent,receipt_sent,expires) VALUES(?,?,'original','order',1,1,?)").run('d'.repeat(64),o.request.fingerprint,o.detail.created+172800);
 const blocked=await preview(env,o);assert.ok(blocked.blockers.some(s=>s.includes('association')));assert.equal((await erase(env,o,blocked)).response.status,409);assert.equal(env.sql.prepare('SELECT count(*) n FROM submissions').get().n,1);
});
test('linked initial receipts and submission retries are erased and cannot dispatch again under their original identity',async()=>{
 const env=artworkEnv(),o=await order(env),id='e'.repeat(64),expires=o.detail.created+172800;
 env.sql.prepare("INSERT INTO submissions(id,fingerprint,reservation,kind,owner_sent,receipt_sent,expires,order_id,owner_provider_id,owner_accepted_at,receipt_provider_id,receipt_accepted_at) VALUES(?,?,'old-key','order',1,1,?,?,'owner-receipt',?,'customer-receipt',?)").run(id,o.request.fingerprint,expires,o.id,o.detail.created,o.detail.created);
 const p=await preview(env,o);assert.equal(p.counts.submissions,1);assert.equal(p.counts.receipts,2);assert.equal((await erase(env,o,p)).body.state,'complete');
 assert.equal(env.sql.prepare('SELECT count(*) n FROM submissions WHERE id=?').get(id).n,0);assert.equal((await call(env,'submissions/reserve',{id,fingerprint:o.request.fingerprint,key:'f'.repeat(64),kind:'order',createdAt:o.detail.created})).status,409);
 assert.equal((await call(env,'submissions/mark',{id,stage:'owner_sent'})).status,409);
});
test('a queued upload lease or order-stage mutation wins before erasure and makes its claim conflict',async()=>{
 for(const mutation of ['upload','stage']){
  const env=artworkEnv(),o=await order(env,{artwork:true}),p=await preview(env,o),batch=env.DB.batch.bind(env.DB);let fired=false;
  env.DB.batch=async statements=>{if(!fired){fired=true;if(mutation==='upload')env.sql.prepare('UPDATE artwork_files SET ready=0,lease_until=? WHERE request_id=?').run(o.detail.created+120,o.id);else env.sql.prepare("UPDATE orders SET version=1,status='in_progress' WHERE id=?").run(o.id);}return batch(statements)};
  assert.equal((await erase(env,o,p)).response.status,409,mutation);assert.equal(env.objects.has(o.id+'/0.jpg'),true);assert.equal(env.sql.prepare('SELECT count(*) n FROM orders WHERE id=?').get(o.id).n,1);
 }
});
test('contact validation rejects unsafe values and unknown fields without storing drafts',async()=>{
 const env=artworkEnv(),o=await order(env);await preview(env,o,'correction',{contact});
 for(const value of [{...contact,name:'\nInjected'},{...contact,email:'person@example.com\r\nBcc:x@example.com'},{...contact,phone:'not a phone'},{...contact,phone:'123456'},{...contact,unknown:'no'}])assert.equal((await call(env,'privacy/preview-correction',{id:o.id,version:0,contact:value})).status,400);
 assert.equal((await json(env,'orders/detail',{id:o.id})).body.snapshot.contact.name,'Original Person');assert.equal(env.sql.prepare('SELECT count(*) n FROM order_updates').get().n,0);
});
test('an initial accepted receipt and its original recipient binding remain byte-identical through a contact correction',async()=>{
 const env=artworkEnv(),o=await order(env),id='b'.repeat(64);env.sql.prepare("INSERT INTO submissions(id,fingerprint,reservation,kind,owner_sent,receipt_sent,expires,order_id,owner_provider_id,owner_accepted_at,receipt_provider_id,receipt_accepted_at) VALUES(?,?,'initial-retry-key','order',1,1,?,?,'owner-original',?,'customer-original',?)").run(id,o.request.fingerprint,o.detail.created+172800,o.id,o.detail.created,o.detail.created);
 const before=env.sql.prepare('SELECT * FROM submissions WHERE id=?').get(id),p=await preview(env,o,'correction',{contact});assert.equal((await call(env,'privacy/correct',{id:o.id,version:0,contact,expectedDigest:p.digest,operationId:crypto.randomUUID()})).status,200);assert.deepEqual(env.sql.prepare('SELECT * FROM submissions WHERE id=?').get(id),before);
 const retry=(await json(env,'submissions/reserve',{id,fingerprint:o.request.fingerprint,key:'f'.repeat(64),kind:'order',createdAt:o.detail.created})).body;assert.equal(retry.ownerSent,true);assert.equal(retry.receiptSent,true);assert.equal(env.sql.prepare('SELECT count(*) n FROM order_update_attempts').get().n,0);
});
test('erasing contact cannot be discovered by name search, while reference search can find only the redacted resume view',async()=>{
 const env=artworkEnv(),o=await order(env,{artwork:true}),p=await preview(env,o);env.ARTWORK.delete=async()=>{throw Error('Synthetic failure')};await erase(env,o,p);
 assert.equal((await json(env,'orders/list',{q:'Original Person'})).body.orders.length,0);
 const rows=(await json(env,'orders/list',{q:o.detail.reference})).body.orders;assert.equal(rows.length,1);assert.equal(rows[0].snapshot,undefined);
});
test('a complete erasure racing an already-started detail read never returns its cached customer data',async()=>{
 const env=artworkEnv(),o=await order(env),p=await preview(env,o),prepare=env.DB.prepare.bind(env.DB);let intercepted=false;
 env.DB.prepare=(sql,...args)=>{const statement=prepare(sql,...args);if(sql!=='SELECT * FROM orders WHERE id=?')return statement;const wrap=s=>({...s,bind(...values){return wrap(s.bind(...values))},async first(){const row=await s.first();if(!intercepted){intercepted=true;assert.equal((await erase(env,o,p)).body.state,'complete');}return row}});return wrap(statement)};
 const response=await json(env,'orders/detail',{id:o.id});assert.equal(response.response.status,404);assert.equal(JSON.stringify(response.body).includes('Original Person'),false);
});
test('erasure atomically fences stage, manual email and finance writes that already passed their read checks',async()=>{
 for(const [path,body] of [['orders/status',{version:0,status:'in_progress'}],['orders/claim-update',{version:0}],['finance/order-save',{version:0,orderVersion:0,lines:[]}]]){
  const env=artworkEnv(),o=await order(env,{artwork:true}),p=await preview(env,o),batch=env.DB.batch.bind(env.DB);let intercepted=false;env.ARTWORK.delete=async()=>{throw Error('Synthetic failure')};
  env.DB.batch=async statements=>{if(!intercepted){intercepted=true;assert.equal((await erase(env,o,p)).body.state,'incomplete');}return batch(statements)};
  assert.equal((await call(env,path,{id:o.id,...body})).status,409,path);assert.equal(env.sql.prepare('SELECT version FROM orders WHERE id=?').get(o.id).version,0);assert.equal(env.sql.prepare('SELECT count(*) n FROM order_updates WHERE order_id=?').get(o.id).n,0);assert.equal(env.sql.prepare('SELECT count(*) n FROM order_costs WHERE order_id=?').get(o.id).n,0);
 }
});
test('D1 cleanup failure after confirmed R2 deletion rolls back quota and resumes the same exact operation',async()=>{
 const env=artworkEnv(),o=await order(env,{artwork:true}),p=await preview(env,o),operationId=crypto.randomUUID();env.sql.exec("CREATE TRIGGER synthetic_privacy_cleanup_failure BEFORE DELETE ON orders BEGIN SELECT RAISE(ABORT,'synthetic cleanup'); END");
 const first=await erase(env,o,p,operationId);assert.equal(first.body.state,'incomplete');assert.equal(env.objects.size,0);assert.equal(env.sql.prepare("SELECT amount FROM artwork_usage WHERE id='retained'").get().amount,tile.length);assert.equal(env.sql.prepare('SELECT count(*) n FROM artwork_requests WHERE id=?').get(o.id).n,1);
 env.sql.exec('DROP TRIGGER synthetic_privacy_cleanup_failure');assert.equal((await erase(env,o,p,operationId)).body.state,'complete');assert.equal(env.sql.prepare("SELECT amount FROM artwork_usage WHERE id='retained'").get().amount,0);
});
test('completed retry metadata expires at original clocks while unfinished cleanup keeps only its resumable opaque manifest',async()=>{
 const {cleanOrderPrivacy}=await import('../security/order-privacy.mjs');
 for(const complete of [true,false]){
  const env=artworkEnv(),o=await order(env,{artwork:true}),p=await preview(env,o);if(!complete)env.ARTWORK.delete=async()=>{throw Error('Synthetic failure')};const result=await erase(env,o,p);
  const op=env.sql.prepare('SELECT * FROM order_privacy_operations WHERE operation_id=?').get(result.body.operationId);assert.equal(op.expires,o.detail.expires);assert.equal(op.artwork_expires,o.detail.artworkExpires);assert.equal(!!op.manifest,!complete);if(complete){assert.equal(op.counts,null);assert.equal(op.reference,null);}
  env.sql.prepare('UPDATE order_privacy_tombstones SET expires=0').run();env.sql.prepare('UPDATE order_privacy_operations SET expires=0,artwork_expires=0').run();await cleanOrderPrivacy(env);
  assert.equal(env.sql.prepare('SELECT count(*) n FROM order_privacy_operations').get().n,complete?0:1);assert.equal(env.sql.prepare('SELECT count(*) n FROM order_privacy_tombstones').get().n,complete?0:2);
  if(!complete)assert.equal((await json(env,'privacy/status',{id:o.id,operationId:op.operation_id})).body.state,'erasing');
 }
});
test('unfinished erasure still permits original-deadline receipt and capability scrubbing by normal retention cleanup',async()=>{
 const {cleanOrders}=await import('../security/orders.mjs'),env=artworkEnv(),o=await order(env,{artwork:true});
 env.sql.prepare("INSERT INTO proof_state(order_id,revision,token_hash) VALUES(?,1,'historical-token')").run(o.id);const manual=(await json(env,'orders/claim-update',{id:o.id,version:0})).body;await call(env,'orders/mark-update',{id:o.id,version:0,attempt:manual.attempt,state:'accepted',providerMessageId:'accepted-original'});
 const p=await preview(env,o);env.ARTWORK.delete=async()=>{throw Error('Synthetic failure')};assert.equal((await erase(env,o,p)).body.state,'incomplete');
 const clock=Date.now;Date.now=()=>o.detail.artworkExpires*1000+1000;try{await cleanOrders(env);}finally{Date.now=clock;}
 assert.equal(env.sql.prepare('SELECT token_hash FROM proof_state WHERE order_id=?').get(o.id).token_hash,null);assert.equal(env.sql.prepare('SELECT provider_message_id FROM order_update_attempts WHERE order_id=?').get(o.id).provider_message_id,null);assert.equal(env.sql.prepare('SELECT state FROM order_privacy_operations WHERE order_id=?').get(o.id).state,'erasing');
});
test('contact correction cannot unlock another Fulfilled email after completion or reopen',async()=>{
 const env=artworkEnv(),o=await order(env);await call(env,'orders/status',{id:o.id,version:0,status:'fulfilled'});o.detail=(await json(env,'orders/detail',{id:o.id})).body;
 const first=(await json(env,'orders/claim-update',{id:o.id,version:1})).body;assert.equal(first.claimed,true);await call(env,'orders/mark-update',{id:o.id,version:1,attempt:first.attempt,state:'accepted'});
 const p=await preview(env,o,'correction',{contact});assert.equal((await call(env,'privacy/correct',{id:o.id,version:1,contact,expectedDigest:p.digest,operationId:crypto.randomUUID()})).status,200);
 assert.equal((await json(env,'orders/claim-update',{id:o.id,version:1,contactRevision:1})).body.claimed,false);await call(env,'orders/status',{id:o.id,version:1,status:'in_progress'});await call(env,'orders/status',{id:o.id,version:2,status:'fulfilled'});assert.equal((await json(env,'orders/claim-update',{id:o.id,version:3,contactRevision:1})).body.claimed,false);assert.equal(env.sql.prepare('SELECT count(*) n FROM order_update_attempts WHERE order_id=?').get(o.id).n,1);
});
test('incomplete erasure scrubs all embedded artwork fields at the original deadline and still runs later order expiry cleanup',async()=>{
 const {cleanOrders}=await import('../security/orders.mjs'),env=artworkEnv(),o=await order(env,{artwork:true}),other=await order(env),snapshot=structuredClone(o.request.snapshot);snapshot.notes='Retained order note';snapshot.items[0]={...snapshot.items[0],values:{customText:'PRIVATE_ARTWORK_VALUE'},brief:'PRIVATE_ARTWORK_BRIEF',hasReference:true};env.sql.prepare('UPDATE orders SET snapshot=? WHERE id=?').run(JSON.stringify(snapshot),o.id);
 const before=env.sql.prepare('SELECT * FROM orders WHERE id=?').get(o.id),p=await preview(env,o);env.ARTWORK.delete=async()=>{throw Error('Synthetic failure')};const incomplete=await erase(env,o,p);assert.equal(incomplete.body.state,'incomplete');const manifest=env.sql.prepare('SELECT manifest FROM order_privacy_operations WHERE order_id=?').get(o.id).manifest;env.sql.prepare('UPDATE orders SET expires=? WHERE id=?').run(o.detail.artworkExpires,other.id);
 const clock=Date.now;Date.now=()=>o.detail.artworkExpires*1000+1000;try{await cleanOrders(env);const after=env.sql.prepare('SELECT * FROM orders WHERE id=?').get(o.id),stored=JSON.parse(after.snapshot);assert.deepEqual(stored.items[0],{kind:'photo',name:'Photo',qty:1,files:[]});assert.equal(stored.artworkRemoved,true);assert.deepEqual(stored.contact,snapshot.contact);assert.equal(stored.notes,'Retained order note');for(const key of ['fingerprint','created','expires','artwork_expires','version','contact_revision','current_contact','owner_sent','receipt_sent'])assert.equal(after[key],before[key],key);assert.equal(env.sql.prepare('SELECT count(*) n FROM orders WHERE id=?').get(other.id).n,0);assert.throws(()=>env.sql.prepare('UPDATE orders SET snapshot=? WHERE id=?').run(JSON.stringify({...stored,notes:'Arbitrary edit'}),o.id),/order_privacy_guard/);}finally{Date.now=clock;}
 assert.equal(env.sql.prepare('SELECT manifest FROM order_privacy_operations WHERE order_id=?').get(o.id).manifest,manifest);
});
