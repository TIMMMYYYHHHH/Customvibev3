import test from 'node:test';
import assert from 'node:assert/strict';
import security from '../security/index.mjs';
import {cleanArtwork} from '../security/artwork.mjs';
import {cleanOrders} from '../security/orders.mjs';
import {artworkEnv,manifest,tile} from './helpers/artwork.mjs';

const fourteenDays=1209600;
const call=(env,path,body)=>security.fetch(new Request('https://disconnected.invalid/'+path,{method:'POST',body:JSON.stringify(body)}),env);
async function json(env,path,body){const response=await call(env,path,body);assert.equal(response.status,200,path+': '+await response.clone().text());return response.json()}
async function controlled(run){
 const realNow=Date.now,realFetch=globalThis.fetch,env=artworkEnv(),clock={seconds:Date.parse('2026-08-31T11:15:00Z')/1000};
 Date.now=()=>clock.seconds*1000;globalThis.fetch=async()=>{throw Error('Network forbidden in retention acceptance')};
 try{await run(env,clock)}finally{Date.now=realNow;globalThis.fetch=realFetch;env.sql.close()}
}
const snapshot=(files=[])=>({contact:{name:'Synthetic retention',email:'synthetic@example.invalid',phone:'0000000000'},locker:{name:'Synthetic locker',area:'Synthetic'},notes:'Keep these whole-order instructions until the order-detail deadline.',items:[{id:'item-1',kind:'photo',name:'Synthetic photo',qty:1,files,values:{privateEntry:'Artwork-only details'},brief:'Artwork-only brief',hasReference:true}],magnetQty:1,subtotalCents:5000,paymentStatus:'unpaid'});
async function create(env,id,files=[]){return json(env,'orders/create',{id,fingerprint:'a'.repeat(64),snapshot:snapshot(files),privateArtwork:files.length>0})}
async function upload(env,m){
 const response=await security.fetch(new Request('https://disconnected.invalid/artwork/upload',{method:'POST',headers:{'Content-Type':'image/jpeg','X-Artwork-Id':m.id,'X-Artwork-Owner':m.owner,'X-Artwork-Index':'0'},body:tile}),env);
 assert.equal(response.status,200);await json(env,'artwork/complete',m);
}

test('original fourteen-day boundary denies both artwork generations before cleanup and removes their requests and proof access',()=>controlled(async(env,clock)=>{
 const base=clock.seconds,original=await manifest();await json(env,'artwork/init',original);await upload(env,original);
 await create(env,original.id,original.files.map((file,index)=>({...file,index})));await json(env,'proofs/seed',{id:original.id,version:0});
 clock.seconds=base+13*86400;const replacement=await manifest(),args={id:original.id,version:1,requestId:replacement.id,owner:replacement.owner,files:replacement.files};
 await json(env,'proofs/prepare',args);await upload(env,replacement);await json(env,'proofs/publish',args);
 const deadline=base+fourteenDays;
 assert.deepEqual(env.sql.prepare('SELECT expires FROM artwork_requests').all().map(row=>row.expires),[deadline,deadline]);
 assert.equal(env.sql.prepare('SELECT artwork_expires FROM orders').get().artwork_expires,deadline);
 env.sql.prepare('UPDATE proof_state SET token_hash=? WHERE order_id=?').run('b'.repeat(64),original.id);
 env.sql.prepare('INSERT INTO proof_sessions(id,order_id,revision,token_hash,expires) VALUES(?,?,2,?,?)').run('c'.repeat(64),original.id,'b'.repeat(64),deadline+100);
 clock.seconds=deadline-1;
 for(const id of [original.id,replacement.id])assert.equal((await call(env,'artwork/download',{id,index:0})).status,200);
 await cleanOrders(env);await cleanArtwork(env);assert.equal(env.objects.size,2);
 clock.seconds=deadline;
 for(const id of [original.id,replacement.id])assert.equal((await call(env,'artwork/download',{id,index:0})).status,410);
 assert.equal((await call(env,'artwork/init',original)).status,410);
 assert.equal((await call(env,'proofs/prepare',{...args,version:2})).status,410);
 for(const action of ['exchange','read','download'])assert.equal((await call(env,'proofs/'+action,{tokenHash:'b'.repeat(64),sessionId:'c'.repeat(64)})).status,410);
 const reduced=await json(env,'orders/detail',{id:original.id});assert.deepEqual(reduced.snapshot.items[0].files,[]);assert.equal(reduced.snapshot.items[0].values,undefined);
 await cleanOrders(env);await cleanArtwork(env);
 for(const table of ['artwork_requests','artwork_files','proof_revisions','proof_events','proof_sessions'])assert.equal(env.sql.prepare('SELECT COUNT(*) n FROM '+table).get().n,0,table);
 assert.equal(env.objects.size,0);assert.equal(env.sql.prepare("SELECT amount FROM artwork_usage WHERE id='retained'").get().amount,0);
 assert.equal(env.sql.prepare('SELECT token_hash FROM proof_state').get().token_hash,null);
 assert.equal((await json(env,'orders/detail',{id:original.id})).snapshot.paymentStatus,'unpaid');
}));

test('whole-order notes survive artwork reduction until exact six-calendar-month deadlines including fulfilment and reopening',()=>controlled(async(env,clock)=>{
 const base=clock.seconds,submitted=crypto.randomUUID(),fulfilled=crypto.randomUUID();await create(env,submitted);await create(env,fulfilled);
 const submissionDeadline=Date.parse('2027-02-28T11:15:00Z')/1000;assert.equal((await json(env,'orders/detail',{id:submitted})).expires,submissionDeadline);
 clock.seconds=base+86400;await json(env,'orders/status',{id:fulfilled,version:0,status:'fulfilled'});
 const completionDeadline=Date.parse('2027-03-01T11:15:00Z')/1000;assert.equal((await json(env,'orders/detail',{id:fulfilled})).expires,completionDeadline);
 clock.seconds=base+2*86400;await json(env,'orders/status',{id:fulfilled,version:1,status:'shipped'});
 const reopened=await json(env,'orders/detail',{id:fulfilled});assert.equal(reopened.expires,completionDeadline);assert.equal(reopened.artworkExpires,base+fourteenDays);
 clock.seconds=base+fourteenDays;await cleanOrders(env);
 for(const id of [submitted,fulfilled]){
  const stored=JSON.parse(env.sql.prepare('SELECT snapshot FROM orders WHERE id=?').get(id).snapshot);
  assert.equal(stored.notes,snapshot().notes);assert.equal(stored.artworkRemoved,true);assert.deepEqual(stored.items[0].files,[]);
  for(const key of ['values','brief','hasReference'])assert.equal(Object.hasOwn(stored.items[0],key),false);
 }
 clock.seconds=submissionDeadline-1;await cleanOrders(env);assert.equal((await json(env,'orders/detail',{id:submitted})).snapshot.notes,snapshot().notes);
 clock.seconds=submissionDeadline;assert.equal((await call(env,'orders/detail',{id:submitted})).status,410);await cleanOrders(env);
 assert.equal(env.sql.prepare('SELECT id FROM orders WHERE id=?').get(submitted),undefined);assert.equal((await json(env,'orders/detail',{id:fulfilled})).snapshot.notes,snapshot().notes);
 clock.seconds=completionDeadline-1;await cleanOrders(env);assert.equal((await json(env,'orders/detail',{id:fulfilled})).snapshot.notes,snapshot().notes);
 clock.seconds=completionDeadline;assert.equal((await call(env,'orders/detail',{id:fulfilled})).status,410);await cleanOrders(env);
 for(const table of ['orders','order_history','order_updates','order_update_attempts'])assert.equal(env.sql.prepare('SELECT COUNT(*) n FROM '+table).get().n,0,table);
}));

test('cleanup drains bounded expired batches, preserves a live request and releases quota only after storage deletion succeeds',()=>controlled(async(env,clock)=>{
 const live=await manifest();await json(env,'artwork/init',live);await upload(env,live);
 const size=live.files[0].size,deadline=clock.seconds;
 for(let index=0;index<21;index++){
  const id=crypto.randomUUID();env.sql.prepare('INSERT INTO artwork_requests(id,owner,manifest,bytes,created,expires,finalized,reservation) VALUES(?,?,?,?,?,?,1,?)').run(id,live.owner,JSON.stringify(live.files),size,deadline-fourteenDays,deadline,id);
  env.sql.prepare('INSERT INTO artwork_files(request_id,slot,ready) VALUES(?,0,1)').run(id);await env.ARTWORK.put(id+'/0.jpg',tile,{sha256:live.files[0].sha256});
 }
 env.sql.prepare("UPDATE artwork_usage SET amount=amount+? WHERE id='retained'").run(21*size);
 const remove=env.ARTWORK.delete;env.ARTWORK.delete=async()=>{throw Error('Synthetic object deletion failure')};await assert.rejects(cleanArtwork(env),/Synthetic object deletion failure/);
 assert.equal(env.sql.prepare('SELECT COUNT(*) n FROM artwork_requests').get().n,22);assert.equal(env.objects.size,22);assert.equal(env.sql.prepare("SELECT amount FROM artwork_usage WHERE id='retained'").get().amount,22*size);
 env.ARTWORK.delete=remove;await cleanArtwork(env);assert.equal(env.sql.prepare('SELECT COUNT(*) n FROM artwork_requests WHERE expires<=?').get(deadline).n,1);assert.equal(env.objects.size,2);
 await cleanArtwork(env);await cleanArtwork(env);assert.equal(env.sql.prepare('SELECT COUNT(*) n FROM artwork_requests').get().n,1);assert.equal(env.sql.prepare('SELECT COUNT(*) n FROM artwork_files').get().n,1);assert.equal(env.objects.size,1);
 assert.deepEqual(Buffer.from(env.objects.get(live.id+'/0.jpg')),tile);assert.equal(env.sql.prepare("SELECT amount FROM artwork_usage WHERE id='retained'").get().amount,size);assert.equal((await call(env,'artwork/download',{id:live.id,index:0})).status,200);
}));
