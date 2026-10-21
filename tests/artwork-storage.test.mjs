import {artworkService,cleanArtwork} from '../security/artwork.mjs';
import test from 'node:test';import assert from 'node:assert/strict';
import security from '../security/index.mjs';
import {artworkEnv,manifest,tile} from './helpers/artwork.mjs';
const call=(env,path,data)=>security.fetch(new Request('https://auth.internal/artwork/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}),env);
const upload=(env,m,bytes=tile)=>security.fetch(new Request('https://auth.internal/artwork/upload',{method:'POST',headers:{'X-Artwork-Id':m.id,'X-Artwork-Owner':m.owner,'X-Artwork-Index':'0','Content-Type':'image/jpeg'},body:bytes}),env);
test('private artwork is immutable, session-owned, finalized only after complete upload, and expires after fourteen days',async()=>{
 const env=artworkEnv(),m=await manifest();const init=await call(env,'init',m);assert.equal(init.status,200);const start=await init.json();assert.ok(start.expires>=Math.floor(Date.now()/1000)+1209599);
 assert.equal((await call(env,'complete',m)).status,409);
 assert.equal((await upload(env,{...m,owner:'c'.repeat(64)})).status,403);
 assert.equal((await upload(env,m)).status,200);assert.equal(env.objects.size,1);
 assert.equal((await upload(env,m)).status,200);assert.equal(env.objects.size,1);
 assert.equal((await call(env,'init',{...m,files:[{...m.files[0],sha256:'d'.repeat(64)}]})).status,409);
 assert.equal((await call(env,'complete',m)).status,200);
 const detail=await (await call(env,'detail',{id:m.id})).json();assert.equal(detail.files[0].name,'design-01-photo.jpg');
 assert.equal((await call(env,'download',{id:m.id,index:0})).status,200);
 env.sql.prepare('UPDATE artwork_requests SET expires=? WHERE id=?').run(Math.floor(Date.now()/1000)-1,m.id);
 assert.equal((await call(env,'download',{id:m.id,index:0})).status,410);
 await security.scheduled({},env);assert.equal(env.objects.size,0);assert.equal(env.sql.prepare('SELECT count(*) AS n FROM artwork_requests').get().n,0);
});
test('corrupt or mismatched artwork never reaches the bucket',async()=>{
 const env=artworkEnv(),m=await manifest();assert.equal((await call(env,'init',m)).status,200);
 assert.equal((await upload(env,m,Buffer.from('not a photograph'))).status,400);assert.equal(env.objects.size,0);
 assert.equal((await call(env,'init',{...await manifest(),files:[{...m.files[0],size:4000001}]})).status,400);
});
test('concurrent request admission enforces shared storage budget atomically',async()=>{
 const env=artworkEnv(),base=await manifest();env.sql.exec("INSERT INTO artwork_usage (id,amount) VALUES ('retained',1990000000)");
 const files=Array.from({length:3},(_,i)=>({...base.files[0],size:2000000,name:`design-0${i+1}-photo.jpg`}));
 const results=await Promise.all(Array.from({length:4},()=>call(env,'init',{...base,id:crypto.randomUUID(),files})));
 assert.equal(results.filter(r=>r.status===200).length,1);assert.equal(results.filter(r=>r.status===429).length,3);
});
test('R2 operation quota fails closed before upload or download',async()=>{
 const env=artworkEnv(),m=await manifest();await call(env,'init',m);
 const month=new Date().toISOString().slice(0,7);env.sql.prepare('INSERT INTO artwork_usage (id,amount) VALUES (?,100000)').run('ops:'+month);
 assert.equal((await upload(env,m)).status,429);assert.equal(env.objects.size,0);
});
test('an upload finishing during expiry cleanup cannot leave late artwork behind',async()=>{
 const env=artworkEnv(),m=await manifest(),request=(path,body)=>new Request('https://auth.internal/artwork/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 await artworkService(request('init',m),env);const original=env.ARTWORK.put;env.ARTWORK.put=async(...args)=>{env.sql.prepare('UPDATE artwork_requests SET expires=0').run();await cleanArtwork(env);return original(...args)};
 const r=await artworkService(new Request('https://auth.internal/artwork/upload',{method:'POST',headers:{'Content-Type':'image/jpeg','X-Artwork-Id':m.id,'X-Artwork-Owner':m.owner,'X-Artwork-Index':'0'},body:tile}),env);
 assert.equal(r.status,410);assert.equal(env.objects.size,0);
});

test('a maximum-file order uploads one file with bounded database payload and call overhead',async()=>{
 const env=artworkEnv(),m=await manifest();m.files=Array.from({length:60},(_,i)=>({...m.files[0],name:`design-${String(i+1).padStart(2,'0')}-photo.jpg`}));
 assert.equal((await call(env,'init',m)).status,200);
 const original=env.DB;let calls=0,responseBytes=0;const originals=new WeakMap();
 const track=result=>{responseBytes+=JSON.stringify(result).length;return result};
 function wrap(s){const w={bind:(...args)=>wrap(s.bind(...args)),first:async()=>{calls++;return track(await s.first())},all:async()=>{calls++;return track(await s.all())},run:async()=>{calls++;return track(await s.run())}};originals.set(w,s);return w;}
 env.DB={prepare:sql=>wrap(original.prepare(sql)),batch:async statements=>{calls++;return track(await original.batch(statements.map(s=>originals.get(s))))}};
 assert.equal((await upload(env,m)).status,200);assert.equal(env.objects.size,1);
 assert.ok(responseBytes<2048,`One file should not transfer the whole order manifest (${responseBytes} bytes)`);
 assert.ok(calls<=3,`Fresh upload must fit three D1 round trips (${calls})`);
});

test('concurrent file uploads cannot overspend the last storage operation',async()=>{
 const env=artworkEnv(),m=await manifest();m.files=[m.files[0],{...m.files[0],name:'design-02-photo.jpg'}];await call(env,'init',m);
 env.sql.prepare('INSERT INTO artwork_usage(id,amount) VALUES (?,99999)').run('ops:'+new Date().toISOString().slice(0,7));
 const send=index=>security.fetch(new Request('https://auth.internal/artwork/upload',{method:'POST',headers:{'Content-Type':'image/jpeg','X-Artwork-Id':m.id,'X-Artwork-Owner':m.owner,'X-Artwork-Index':String(index)},body:tile}),env);
 const results=await Promise.all([send(0),send(1)]);assert.deepEqual(results.map(r=>r.status).sort(),[200,429]);assert.equal(env.objects.size,1);
 assert.equal(env.sql.prepare('SELECT amount FROM artwork_usage WHERE id=?').get('ops:'+new Date().toISOString().slice(0,7)).amount,100000);
 assert.equal(env.sql.prepare('SELECT count(*) AS n FROM artwork_files WHERE ready=0 AND lease_until=0').get().n,1);
});

test('an upload that lost its lease cannot report success or delete retained artwork',async()=>{
 const env=artworkEnv(),m=await manifest();await call(env,'init',m);const put=env.ARTWORK.put;
 env.ARTWORK.put=async(...args)=>{env.sql.prepare('UPDATE artwork_files SET lease=? WHERE request_id=?').run('newer-upload',m.id);return put(...args)};
 assert.equal((await upload(env,m)).status,503);assert.equal(env.objects.size,1);
 assert.equal(env.sql.prepare('SELECT ready FROM artwork_files WHERE request_id=?').get(m.id).ready,0);
});

test('temporary artwork database failures return safe JSON for the retained checkout draft',async()=>{
 const env=artworkEnv(),m=await manifest();await call(env,'init',m);
 env.DB={prepare:()=>{throw Error('D1_ERROR: internal error private-reference')}};
 const response=await upload(env,m);assert.equal(response.status,503);
 assert.match(response.headers.get('Content-Type'),/application\/json/);
 const body=await response.json();assert.match(body.error,/retry/i);assert.doesNotMatch(body.error,/private-reference|D1_ERROR|SQL/i);assert.equal(env.objects.size,0);
});

// Ready flags are not evidence that the retained object still exists intact.
const state=(env,m)=>env.sql.prepare('SELECT expires,finalized FROM artwork_requests WHERE id=?').get(m.id);
const usage=env=>env.sql.prepare('SELECT amount FROM artwork_usage WHERE id=?').get('ops:'+new Date().toISOString().slice(0,7))?.amount||0;
async function ready(){const env=artworkEnv(),m=await manifest();assert.equal((await call(env,'init',m)).status,200);assert.equal((await upload(env,m)).status,200);return {env,m,key:m.id+'/0.jpg'}}

test('a ready retry repairs an absent object from the validated retained bytes without extending expiry',async()=>{
 const {env,m,key}=await ready(),before=state(env,m);env.objects.delete(key);
 assert.equal((await upload(env,m)).status,200);assert.deepEqual(Buffer.from(env.objects.get(key)||[]),tile);
 assert.equal(env.sql.prepare('SELECT tries FROM artwork_files WHERE request_id=?').get(m.id).tries,2);
 assert.equal((await call(env,'complete',m)).status,200);assert.equal(state(env,m).expires,before.expires);
 assert.deepEqual(Buffer.from(await(await call(env,'download',{id:m.id,index:0})).arrayBuffer()),tile);
});
for(const finalized of [0,1])test(`completion rejects absent ready objects when finalized was ${finalized}`,async()=>{
 const {env,m,key}=await ready();env.sql.prepare('UPDATE artwork_requests SET finalized=? WHERE id=?').run(finalized,m.id);env.objects.delete(key);
 assert.equal((await call(env,'complete',m)).status,409);assert.equal(state(env,m).finalized,finalized);
});
test('missing-object repair rejects inconsistent bodies before changing readiness or writing storage',async()=>{
 const {env,m,key}=await ready();env.objects.delete(key);const before=usage(env);
 const wrongHash=Buffer.from(tile);wrongHash[100]^=1;
 for(const bytes of [tile.subarray(1),wrongHash,Buffer.concat([tile,Buffer.from([0])])])assert.equal((await upload(env,m,bytes)).status,400);assert.equal(env.objects.size,0);
 assert.equal(env.sql.prepare('SELECT ready,tries FROM artwork_files WHERE request_id=?').get(m.id).tries,1);assert.equal(usage(env),before+3);
});
test('healthy ready retries and repeated completion use bounded checksummed metadata without rewriting or reading bytes',async()=>{
 const {env,m}=await ready(),before=usage(env);let heads=0;
 const head=env.ARTWORK.head;env.ARTWORK.head=async key=>{heads++;return head(key)};
 env.ARTWORK.get=env.ARTWORK.put=async()=>{throw Error('Metadata check must not read or replace bytes')};
 assert.equal((await upload(env,m)).status,200);for(let i=0;i<2;i++)assert.equal((await call(env,'complete',m)).status,200);
 assert.equal(heads,3);assert.equal(usage(env),before+3);assert.equal(env.sql.prepare('SELECT tries FROM artwork_files').get().tries,1);
});
for(const invalid of ['wrong size','wrong checksum','untrusted metadata'])test(`ready retry and completion reject ${invalid} without replacing the object`,async()=>{
 const {env,m,key}=await ready();
 if(invalid==='wrong size')await env.ARTWORK.put(key,tile.subarray(1));
 if(invalid==='wrong checksum'){const corrupted=Buffer.from(tile);corrupted[100]^=1;await env.ARTWORK.put(key,corrupted)}
 if(invalid==='untrusted metadata'){const head=env.ARTWORK.head;env.ARTWORK.head=async key=>({...await head(key),checksums:{},etag:m.files[0].sha256})}
 const preserved=Buffer.from(env.objects.get(key));env.ARTWORK.put=async()=>{throw Error('Invalid existing object must not be replaced')};
 assert.equal((await upload(env,m)).status,409);assert.equal((await call(env,'complete',m)).status,409);
 assert.equal(state(env,m).finalized,0);assert.deepEqual(Buffer.from(env.objects.get(key)),preserved);
});
test('expired and foreign ready requests cannot read or repair stored objects',async()=>{
 const {env,m,key}=await ready();env.objects.delete(key);const before=usage(env);
 env.ARTWORK.head=env.ARTWORK.put=async()=>{throw Error('Unauthorized storage access')};
 assert.equal((await upload(env,{...m,owner:'c'.repeat(64)})).status,403);assert.equal((await call(env,'complete',{...m,owner:'c'.repeat(64)})).status,403);
 env.sql.prepare('UPDATE artwork_requests SET expires=0 WHERE id=?').run(m.id);
 assert.equal((await upload(env,m)).status,410);assert.equal((await call(env,'complete',m)).status,410);assert.equal(usage(env),before);
});
test('ready retry and completion fail closed at the metadata operation quota without storage access',async()=>{
 const {env,m}=await ready();env.sql.prepare('UPDATE artwork_usage SET amount=100000 WHERE id=?').run('ops:'+new Date().toISOString().slice(0,7));
 env.ARTWORK.head=env.ARTWORK.put=async()=>{throw Error('Unreserved storage access')};
 assert.equal((await upload(env,m)).status,429);assert.equal((await call(env,'complete',m)).status,429);assert.equal(usage(env),100000);assert.equal(state(env,m).finalized,0);
});
test('completion reserves all required metadata operations atomically before checking a maximum-file request',async()=>{
 const env=artworkEnv(),m=await manifest();m.files=Array.from({length:60},(_,i)=>({...m.files[0],name:`design-${String(i+1).padStart(2,'0')}-photo.jpg`}));await call(env,'init',m);
 env.sql.prepare('UPDATE artwork_files SET ready=1 WHERE request_id=?').run(m.id);for(let i=0;i<60;i++)await env.ARTWORK.put(m.id+'/'+i+'.jpg',tile,{sha256:m.files[i].sha256});
 env.sql.prepare('INSERT INTO artwork_usage(id,amount) VALUES (?,99941)').run('ops:'+new Date().toISOString().slice(0,7));
 let heads=0;const head=env.ARTWORK.head;env.ARTWORK.head=async key=>{heads++;return head(key)};
 assert.equal((await call(env,'complete',m)).status,429);assert.equal(heads,0);assert.equal(usage(env),99941);assert.equal(state(env,m).finalized,0);
 env.sql.prepare('UPDATE artwork_usage SET amount=99940 WHERE id=?').run('ops:'+new Date().toISOString().slice(0,7));
 assert.equal((await call(env,'complete',m)).status,200);assert.equal(heads,60);assert.equal(usage(env),100000);
});
test('ambiguous metadata failures never trigger a repair or finalize artwork',async()=>{
 const {env,m,key}=await ready();env.objects.delete(key);env.ARTWORK.head=async()=>{throw Error('private provider detail')};
 env.ARTWORK.put=async()=>{throw Error('Must not repair ambiguous absence')};
 for(const response of [await upload(env,m),await call(env,'complete',m)]){assert.equal(response.status,503);assert.doesNotMatch(await response.text(),/private provider detail/)}
 assert.equal(state(env,m).finalized,0);assert.equal(env.objects.size,0);assert.equal(env.sql.prepare('SELECT tries FROM artwork_files').get().tries,1);
});
test('a missing-object repair preserves retry limits and cannot spend a write after metadata consumed the last operation',async()=>{
 for(const exhausted of ['tries','quota']){
  const {env,m,key}=await ready();env.objects.delete(key);
  if(exhausted==='tries')env.sql.prepare('UPDATE artwork_files SET tries=3').run();
  else env.sql.prepare('UPDATE artwork_usage SET amount=99999 WHERE id=?').run('ops:'+new Date().toISOString().slice(0,7));
  assert.equal((await upload(env,m)).status,exhausted==='tries'?409:429);assert.equal(env.objects.size,0);
  assert.equal(env.sql.prepare('SELECT lease_until FROM artwork_files').get().lease_until,0);
 }
});
test('a stale absent-object observation cannot overwrite a newer completed repair',async()=>{
 const {env,m,key}=await ready();env.objects.delete(key);const head=env.ARTWORK.head;let first=true,resolveHead,observed;
 const waiting=new Promise(resolve=>{observed=resolve});env.ARTWORK.head=async key=>{if(first){first=false;observed();return new Promise(resolve=>{resolveHead=resolve})}return head(key)};
 const stale=upload(env,m);await new Promise(setImmediate);assert.equal(first,false);await waiting;assert.equal((await upload(env,m)).status,200);const newerLease=env.sql.prepare('SELECT lease FROM artwork_files').get().lease;
 resolveHead(null);assert.equal((await stale).status,409);assert.deepEqual(Buffer.from(env.objects.get(key)),tile);
 assert.equal(env.sql.prepare('SELECT lease,tries FROM artwork_files').get().lease,newerLease);assert.equal(env.sql.prepare('SELECT tries FROM artwork_files').get().tries,2);
});
test('a repair with an ambiguous write acknowledgement remains retryable under its original deadline',async()=>{
 const {env,m,key}=await ready(),before=state(env,m),put=env.ARTWORK.put;env.objects.delete(key);
 env.ARTWORK.put=async(...args)=>{await put(...args);throw Error('Acknowledgement lost')};
 assert.equal((await upload(env,m)).status,503);assert.equal((await call(env,'complete',m)).status,409);assert.equal(state(env,m).finalized,0);
 env.sql.prepare('UPDATE artwork_files SET lease_until=0').run();env.ARTWORK.put=put;
 assert.equal((await upload(env,m)).status,200);assert.equal((await call(env,'complete',m)).status,200);assert.equal(state(env,m).expires,before.expires);
});
test('expiry during metadata verification cannot publish completion or idempotent upload success',async()=>{
 for(const action of ['retry','complete']){const {env,m}=await ready(),head=env.ARTWORK.head;
  env.ARTWORK.head=async key=>{const object=await head(key);env.sql.prepare('UPDATE artwork_requests SET expires=0').run();return object};
  assert.equal((await(action==='retry'?upload(env,m):call(env,'complete',m))).status,410);assert.equal(state(env,m).finalized,0);
 }
});

test('completion cannot finalize while a repair becomes pending during metadata verification',async()=>{
 const {env,m}=await ready(),head=env.ARTWORK.head;
 env.ARTWORK.head=async key=>{const object=await head(key);env.sql.prepare('UPDATE artwork_files SET ready=0 WHERE request_id=?').run(m.id);return object};
 assert.equal((await call(env,'complete',m)).status,409);assert.equal(state(env,m).finalized,0);
});
test('concurrent completions cannot overspend the final metadata operation',async()=>{
 const {env,m}=await ready();env.sql.prepare('UPDATE artwork_usage SET amount=99999 WHERE id=?').run('ops:'+new Date().toISOString().slice(0,7));
 const responses=await Promise.all([call(env,'complete',m),call(env,'complete',m)]);
 assert.deepEqual(responses.map(r=>r.status).sort(),[200,429]);assert.equal(usage(env),100000);
});
