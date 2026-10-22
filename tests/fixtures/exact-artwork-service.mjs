// Disconnected adapter: real validation, security services, SQLite and in-memory
// object storage. No Wrangler configuration, credentials or provider bindings.
import assert from 'node:assert/strict';
import {artworkEnv,sha} from '../helpers/artwork.mjs';
import security from '../../security/index.mjs';
import {validateOrder,artworkManifest} from '../../server/submission-model.mjs';
import {orderRecord} from '../../server/order-record.mjs';
import {defaultContent} from '../../src/content/model.mjs';
import {downloadOrderArchive} from '../../admin/order-archive.mjs';
export function exactArtworkService(){
 const env=artworkEnv(),id=crypto.randomUUID(),owner='a'.repeat(64),sessions=['c'.repeat(64),'e'.repeat(64)],tokens=['b'.repeat(64),'d'.repeat(64)];
 let revision=1;const uploaded=new Map(),checks={};
 const content=structuredClone(defaultContent);content.products.forEach(p=>p.status='available');
 const raw=(path,body)=>security.fetch(new Request('https://disconnected.invalid/'+path,{method:'POST',body:JSON.stringify(body)}),env);
 const json=async(path,body)=>{const r=await raw(path,body);assert.equal(r.status,200,path+': '+await r.clone().text());return r.json()};
 const detail=()=>json('orders/detail',{id});
 async function upload(requestId,slot,data){const r=await security.fetch(new Request('https://disconnected.invalid/artwork/upload',{method:'POST',headers:{'Content-Type':'image/jpeg','X-Artwork-Id':requestId,'X-Artwork-Owner':owner,'X-Artwork-Index':String(slot)},body:data}),env);assert.equal(r.status,200,await r.text());const hash=await sha(env.objects.get(requestId+'/'+slot+'.jpg'));assert.equal(hash,await sha(data));uploaded.set(requestId+'/'+slot,hash)}
 async function create(body){
  const order=validateOrder({id,createdAt:Math.floor(Date.now()/1000),referenceVersion:2,contact:{name:'Synthetic fixture',email:'synthetic@example.invalid',phone:'0000000000'},locker:{name:'Synthetic locker',area:'Synthetic area'},notes:'SYNTHETIC: check selected quantities. Do not print these notes.',consent:true,items:body.items},content,true),files=artworkManifest(order);
  assert.equal(files.length,17);assert.equal(order.magnetQty,36);
  await json('artwork/init',{id,owner,key:owner,files});
  for(let i=0;i<body.uploads.length;i++){const bytes=Buffer.from(body.uploads[i],'base64');assert.equal(await sha(bytes),files[i].sha256);await upload(id,i,bytes)}
  await json('artwork/complete',{id,owner,files});await json('orders/create',{id,fingerprint:'f'.repeat(64),snapshot:orderRecord(order,true),privateArtwork:true});
  assert.equal((await raw('orders/status',{id,version:0,status:'in_progress'})).status,200);
  await json('proofs/seed',{id,version:1});
  const d=await detail();assert.equal(d.snapshot.paymentStatus,'unpaid');
  assert.deepEqual(d.proof.items[2].files.map(f=>f.copies),[4,2]);assert.deepEqual(d.proof.items[3].files.map(f=>f.copies),[3,2]);
  assert.deepEqual(d.proof.items[4].values,order.items[4].values);assert.deepEqual(d.proof.items[5].values,order.items[5].values);
  return {id,magnetQty:order.magnetQty,files,proof:d.proof,artworkExpires:d.artworkExpires};
 }
 async function replace(body){
  const old=await detail();assert.equal(old.proof.status,'prepared');const expires=old.artworkExpires,requestId=crypto.randomUUID(),first=old.proof.items.flatMap(i=>i.files)[0];
  const file={size:body.size,sha256:body.sha256,proof:false,name:first.name},selection=old.proof.items.flatMap(i=>i.files).map((f,i)=>i?{requestId:f.requestId,index:f.index}:{upload:0}),args={id,version:old.version,requestId,owner,files:[file],selection};
  await json('proofs/prepare',args);await upload(requestId,0,Buffer.from(body.upload,'base64'));await json('artwork/complete',{id:requestId,owner,files:[file]});await json('proofs/publish',args);
  const d=await detail();assert.equal(d.proof.revision,2);assert.equal(d.proof.status,'prepared');assert.equal(d.status,old.status);assert.equal(d.artworkExpires,expires);assert.equal(env.sql.prepare('SELECT expires FROM artwork_requests WHERE id=?').get(requestId).expires,expires);
  checks.oldLinkRejected=(await raw('proofs/exchange',{tokenHash:tokens[0],sessionId:'1'.repeat(64)})).status===410;
  checks.oldApprovalRejected=(await raw('proofs/approve',{sessionId:sessions[0],revision:1,digest:old.proof.digest})).status===410;
  checks.oldDownloadRejected=(await raw('proofs/download',{sessionId:sessions[0],slot:0})).status===410;
  checks.savedStagePreserved=d.status==='in_progress';
  checks.currentArchiveHasNoApprovalGate=true;const zip=await downloadOrderArchive(d,(_index,f)=>raw('artwork/download',{id:f.requestId,index:f.index}));assert.ok(!Buffer.from(zip).includes(Buffer.from('DO NOT PRINT')));
  assert.ok(Object.values(checks).every(Boolean));revision=2;return {checks,revision:2,sha256:body.sha256,proof:(await detail()).proof};
 }
 async function finish(){const d=await detail();assert.equal(d.proof.status,'prepared');assert.equal(d.proof.revision,2);const digest=await sha(new TextEncoder().encode(JSON.stringify(d.proof.items)));assert.equal(digest,d.proof.digest);await json('orders/status',{id,version:d.version,status:'ready_to_ship'});const current=await detail();assert.equal(current.snapshot.paymentStatus,'unpaid');assert.equal(current.updates.length,0);assert.equal(current.ownerSent,false);assert.equal(current.receiptSent,false);for(const f of current.proof.items.flatMap(i=>i.files))assert.equal(f.sha256,uploaded.get(f.requestId+'/'+f.index));return {checks,order:current,uploaded:Object.fromEntries(uploaded),providerWrites:0}}
 async function handle(path,method,body){
  if(path==='/__acceptance/create')return Response.json(await create(body));
  if(path==='/__acceptance/replace')return Response.json(await replace(body));
  if(path==='/__acceptance/finish')return Response.json(await finish());
  if(path==='/__acceptance/archive'){const d=await detail(),zip=await downloadOrderArchive(d,(_index,f)=>raw('artwork/download',{id:f.requestId,index:f.index}));return new Response(zip,{headers:{'Content-Type':'application/zip','Content-Disposition':'attachment; filename="synthetic-order.zip"'}})}
  if(path.startsWith('/api/proof'))return Response.json({error:'Separate customer artwork approval is no longer required.'},{status:410});
  return Response.json({error:'No connected API in acceptance fixture'},{status:403});
 }
 return {handle,env};
}
