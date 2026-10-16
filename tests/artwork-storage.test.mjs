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
 const env=artworkEnv(),base=await manifest();env.sql.exec("INSERT INTO artwork_usage (id,amount) VALUES ('retained',490000000)");
 const files=Array.from({length:3},(_,i)=>({...base.files[0],size:2000000,name:`design-0${i+1}-photo.jpg`}));
 const results=await Promise.all(Array.from({length:4},()=>call(env,'init',{...base,id:crypto.randomUUID(),files})));
 assert.equal(results.filter(r=>r.status===200).length,1);assert.equal(results.filter(r=>r.status===429).length,3);
});
test('R2 operation quota fails closed before upload or download',async()=>{
 const env=artworkEnv(),m=await manifest();await call(env,'init',m);
 const month=new Date().toISOString().slice(0,7);env.sql.prepare('INSERT INTO artwork_usage (id,amount) VALUES (?,10000)').run('ops:'+month);
 assert.equal((await upload(env,m)).status,429);assert.equal(env.objects.size,0);
});
test('an upload finishing during expiry cleanup cannot leave late artwork behind',async()=>{
 const env=artworkEnv(),m=await manifest(),request=(path,body)=>new Request('https://auth.internal/artwork/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 await artworkService(request('init',m),env);const original=env.ARTWORK.put;env.ARTWORK.put=async(...args)=>{env.sql.prepare('UPDATE artwork_requests SET expires=0').run();await cleanArtwork(env);return original(...args)};
 const r=await artworkService(new Request('https://auth.internal/artwork/upload',{method:'POST',headers:{'Content-Type':'image/jpeg','X-Artwork-Id':m.id,'X-Artwork-Owner':m.owner,'X-Artwork-Index':'0'},body:tile}),env);
 assert.equal(r.status,410);assert.equal(env.objects.size,0);
});
