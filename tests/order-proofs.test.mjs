import test from 'node:test';import assert from 'node:assert/strict';import security from '../security/index.mjs';import {artworkEnv,manifest} from './helpers/artwork.mjs';
const call=(env,path,b)=>security.fetch(new Request('https://internal/'+path,{method:'POST',body:JSON.stringify(b)}),env);
export async function setupProof(){const env=artworkEnv(),m=await manifest(),time=Math.floor(Date.now()/1000);env.sql.prepare('INSERT INTO artwork_requests(id,owner,manifest,bytes,created,expires,finalized,reservation) VALUES (?,?,?,?,?,?,1,?)').run(m.id,m.owner,JSON.stringify(m.files),m.files[0].size,time,time+500,'seed');const snapshot={approvalRequired:true,contact:{name:'Test',email:'test@example.com',phone:'0123456789'},locker:{name:'Locker',area:'Durban'},items:[{id:'item-1',kind:'photo',name:'Photo',qty:2,files:[{...m.files[0],index:0}]}],magnetQty:2,subtotalCents:10000,paymentStatus:'unpaid'};assert.equal((await call(env,'orders/create',{id:m.id,fingerprint:'a'.repeat(64),snapshot,privateArtwork:true})).status,200);return {env,id:m.id};}
test('submitted artwork can enter production without a separate revision',async()=>{const {env,id}=await setupProof();assert.equal((await call(env,'orders/status',{id,version:0,status:'in_progress'})).status,200);assert.equal((await call(env,'proofs/detail',{id})).status,200);assert.equal(env.sql.prepare('SELECT count(*) n FROM proof_revisions').get().n,0);});
test('replacement invalidates historical tokens without requiring new customer approval',async()=>{const {env,id}=await setupProof();await call(env,'proofs/seed',{id,version:0});env.sql.prepare("UPDATE proof_state SET token_hash=?,status='approved',approved_at=? WHERE order_id=?").run('b'.repeat(64),Math.floor(Date.now()/1000),id);assert.equal((await call(env,'proofs/publish',{id,version:1,requestId:id})).status,200);assert.equal(env.sql.prepare('SELECT token_hash FROM proof_state').get().token_hash,null);assert.equal((await call(env,'proofs/approve',{sessionId:'c'.repeat(64)})).status,410);assert.equal((await call(env,'orders/status',{id,version:2,status:'shipped'})).status,200);assert.equal((await call(env,'proofs/publish',{id,version:1,requestId:id})).status,409);});
test('historical change requests remain recorded without blocking production',async()=>{const {env,id}=await setupProof();await call(env,'proofs/seed',{id,version:0});env.sql.prepare("UPDATE proof_state SET status='changes_requested' WHERE order_id=?").run(id);assert.equal((await call(env,'orders/status',{id,version:1,status:'shipped'})).status,200);assert.equal(env.sql.prepare('SELECT status FROM proof_state').get().status,'changes_requested');env.sql.prepare('UPDATE orders SET expires=0 WHERE id=?').run(id);assert.equal((await call(env,'proofs/read',{sessionId:'c'.repeat(64)})).status,410);});
test('revisions inherit original expiry, aggregate quotas and clean all proof records',async()=>{const {env,id}=await setupProof();await call(env,'proofs/seed',{id,version:0});const m=await manifest(),prepare=await call(env,'proofs/prepare',{id,version:1,requestId:m.id,owner:m.owner,files:m.files});assert.equal(prepare.status,200);assert.equal(env.sql.prepare('SELECT expires FROM artwork_requests WHERE id=?').get(m.id).expires,env.sql.prepare('SELECT artwork_expires FROM orders WHERE id=?').get(id).artwork_expires);env.sql.prepare('UPDATE artwork_requests SET bytes=32000000 WHERE id=?').run(id);const next=await manifest();assert.equal((await call(env,'proofs/prepare',{id,version:1,requestId:next.id,owner:next.owner,files:next.files})).status,429);await call(env,'proofs/issue',{id,version:1,tokenHash:'b'.repeat(64)});await call(env,'proofs/exchange',{tokenHash:'b'.repeat(64),sessionId:'c'.repeat(64)});env.sql.prepare('UPDATE orders SET expires=0 WHERE id=?').run(id);const {cleanOrders}=await import('../security/orders.mjs');await cleanOrders(env);for(const table of ['proof_state','proof_revisions','proof_events','proof_sessions'])assert.equal(env.sql.prepare('SELECT COUNT(*) n FROM '+table).get().n,0);});
test('retired customer responses cannot race a replacement or claim email',async()=>{const {env,id}=await setupProof();await call(env,'proofs/seed',{id,version:0});const results=await Promise.all([call(env,'proofs/approve',{sessionId:'c'.repeat(64)}),call(env,'proofs/publish',{id,version:1,requestId:id})]);assert.deepEqual(results.map(r=>r.status),[410,200]);const state=await(await call(env,'proofs/detail',{id})).json();assert.equal(state.revision,2);assert.equal(state.status,'prepared');assert.equal(env.sql.prepare('SELECT COUNT(*) n FROM order_updates').get().n,0);});

test('36-face order replaces one face, reuses immutable originals and resumes uploads without new reservations',async()=>{
 const {env,id}=await setupProof(),m=await manifest();const originals=Array.from({length:36},(_,i)=>({...m.files[0],name:`design-01-face-${i+1}.jpg`}));
 env.sql.prepare('UPDATE artwork_requests SET manifest=?,bytes=? WHERE id=?').run(JSON.stringify(originals),originals.length*m.files[0].size,id);
 const snapshot=JSON.parse(env.sql.prepare('SELECT snapshot FROM orders WHERE id=?').get(id).snapshot);snapshot.items[0].files=originals.map((f,index)=>({...f,index}));env.sql.prepare('UPDATE orders SET snapshot=? WHERE id=?').run(JSON.stringify(snapshot),id);
 assert.equal((await call(env,'proofs/seed',{id,version:0})).status,200);
 const files=[{...m.files[0],name:originals[0].name}],selection=originals.map((_,index)=>index?{requestId:id,index}:{upload:0});const args={id,version:1,requestId:m.id,owner:m.owner,files,selection};
 assert.equal((await call(env,'proofs/prepare',args)).status,200);assert.equal((await call(env,'proofs/prepare',args)).status,200);
 assert.equal(env.sql.prepare('SELECT SUM(json_array_length(manifest)) n FROM artwork_requests').get().n,37);
 env.sql.prepare('UPDATE artwork_requests SET finalized=1 WHERE id=?').run(m.id);
 assert.equal((await call(env,'proofs/publish',args)).status,200);assert.equal((await call(env,'proofs/publish',args)).status,200);
 const d=await(await call(env,'proofs/detail',{id})).json();assert.equal(d.revision,2);assert.equal(d.items[0].files[1].requestId,id);assert.equal(d.items[0].files[0].requestId,m.id);
 const bad=await manifest();assert.equal((await call(env,'proofs/prepare',{...args,version:2,requestId:bad.id,selection:selection.map((s,i)=>i===2?{requestId:bad.id,index:2}:s)})).status,400);
});
test('file-free custom fixed pack can receive all final faces for internal preparation',async()=>{
 const {env,id}=await setupProof();const snapshot=JSON.parse(env.sql.prepare('SELECT snapshot FROM orders WHERE id=?').get(id).snapshot);snapshot.items=[{id:'item-1',kind:'custom-pack',name:'Custom',qty:1,faceCount:4,files:[]}];env.sql.prepare('UPDATE orders SET snapshot=? WHERE id=?').run(JSON.stringify(snapshot),id);
 const m=await manifest(),files=Array.from({length:4},(_,i)=>({...m.files[0],name:`design-01-face-${i+1}.jpg`})),args={id,version:0,requestId:m.id,owner:m.owner,files};assert.equal((await call(env,'proofs/prepare',args)).status,200);env.sql.prepare('UPDATE artwork_requests SET finalized=1 WHERE id=?').run(m.id);assert.equal((await call(env,'proofs/publish',args)).status,200);assert.equal((await(await call(env,'proofs/detail',{id})).json()).items[0].files.length,4);
});

test('per-face quantities survive seeded and replacement proofs without multiplying file slots',async()=>{
 const {env,id}=await setupProof(),m=await manifest();
 const originals=Array.from({length:2},(_,i)=>({...m.files[0],name:`design-01-alphabet-${i+1}.jpg`}));
 env.sql.prepare('UPDATE artwork_requests SET manifest=? WHERE id=?').run(JSON.stringify(originals),id);
 const snapshot=JSON.parse(env.sql.prepare('SELECT snapshot FROM orders WHERE id=?').get(id).snapshot);
 snapshot.items=[{id:'item-1',kind:'alphabet',name:'Alphabet · A × 2, B',qty:3,faceCount:2,designIds:['alphabet-1','alphabet-2'],designQuantities:[2,1],files:originals.map((f,index)=>({...f,index}))}];snapshot.magnetQty=9;
 env.sql.prepare('UPDATE orders SET snapshot=? WHERE id=?').run(JSON.stringify(snapshot),id);
 assert.equal((await call(env,'proofs/seed',{id,version:0})).status,200);
 let detail=await(await call(env,'proofs/detail',{id})).json();assert.deepEqual(detail.items[0].files.map(f=>f.copies),[6,3]);
 const files=[{...m.files[0],name:originals[0].name}],args={id,version:1,requestId:m.id,owner:m.owner,files,selection:[{upload:0},{requestId:id,index:1}]};
 assert.equal((await call(env,'proofs/prepare',args)).status,200);env.sql.prepare('UPDATE artwork_requests SET finalized=1 WHERE id=?').run(m.id);assert.equal((await call(env,'proofs/publish',args)).status,200);
 detail=await(await call(env,'proofs/detail',{id})).json();assert.deepEqual(detail.items[0].files.map(f=>f.copies),[6,3]);assert.equal(detail.items[0].files.length,2);
});

test('all alphabet quantities fit the saved-order name contract',async()=>{
 const {env}=await setupProof();
 const {defaultContent}=await import('../src/content/model.mjs'),{validateOrder}=await import('../server/submission-model.mjs'),{orderRecord}=await import('../server/order-record.mjs');
 const content=structuredClone(defaultContent);content.products.forEach(p=>p.status='available');
 const id=crypto.randomUUID(),item={id:crypto.randomUUID(),kind:'alphabet',qty:1,printVersion:1,designIds:Array.from({length:26},(_,i)=>`alphabet-${i+1}`),designQuantities:[10,...Array(25).fill(2)],files:Array(26).fill({size:2000,sha256:'a'.repeat(64)})};
 const order=validateOrder({id,createdAt:Math.floor(Date.now()/1000),contact:{name:'Test',email:'test@example.com',phone:'0123456789'},locker:{name:'Locker',area:'Durban'},consent:true,items:[item]},content,true),snapshot=orderRecord(order,false);
 assert.ok(snapshot.items[0].name.length>200);assert.equal((await call(env,'orders/create',{id,fingerprint:'b'.repeat(64),snapshot,privateArtwork:false})).status,200);
});

test('Handy template identity and submitted entries survive proof preparation and replacement',async()=>{
 const {env,id}=await setupProof();
 const snapshot=JSON.parse(env.sql.prepare('SELECT snapshot FROM orders WHERE id=?').get(id).snapshot);
 const values={handyTemplate:'07-family-week',edition:1,entries:['Swimming','Library','Soccer','Music','Family time']};
 snapshot.items[0]={...snapshot.items[0],kind:'information',designMode:'self',values};
 env.sql.prepare('UPDATE orders SET snapshot=? WHERE id=?').run(JSON.stringify(snapshot),id);
 assert.equal((await call(env,'proofs/seed',{id,version:0})).status,200);
 const proof=await(await call(env,'proofs/detail',{id})).json();
 assert.deepEqual(proof.items[0].values,values);
 const m=await manifest(),args={id,version:1,requestId:m.id,owner:m.owner,files:m.files};
 assert.equal((await call(env,'proofs/prepare',args)).status,200);
 env.sql.prepare('UPDATE artwork_requests SET finalized=1 WHERE id=?').run(m.id);
 assert.equal((await call(env,'proofs/publish',args)).status,200);
 assert.deepEqual((await(await call(env,'proofs/detail',{id})).json()).items[0].values,values);
});
