// Disposable local review server. Never connect this fixture to production bindings.
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {createServer as createViteServer} from 'vite';
import {ordersAPI} from '../admin/orders-api.mjs';
import security from '../security/index.mjs';
import {artworkEnv,manifest,tile} from './helpers/artwork.mjs';
const port=Number(process.env.PRIVACY_REVIEW_PORT||5197),id='11111111-1111-4111-8111-111111111111';
const session={scope:'admin',jti:'a'.repeat(64),csrf:'b'.repeat(64),exp:Math.floor(Date.now()/1000)+86400};
let env,mode='normal',detailFails=false,sendRequests=0,providerCalls=0,audit=[];
const call=(path,body)=>security.fetch(new Request('https://internal/'+path,{method:'POST',body:JSON.stringify(body)}),env);
async function reset(){env={...artworkEnv(),ADMIN_SESSION_SECRET:'c'.repeat(64)};env.AUTH={fetch:(url,opts)=>security.fetch(new Request(url,opts),env)};const m=await manifest(id),snapshot={referenceVersion:2,contact:{name:'Synthetic Person',email:'synthetic@example.invalid',phone:'0821234567'},locker:{name:'Synthetic locker',area:'Fixture'},items:[{kind:'photo',name:'Synthetic artwork',qty:1,files:[{index:0,...m.files[0]}]}],magnetQty:1,subtotalCents:5000,paymentStatus:'unpaid'};await call('artwork/init',m);await env.ARTWORK.put(id+'/0.jpg',tile,{sha256:m.files[0].sha256});env.sql.prepare('UPDATE artwork_files SET ready=1 WHERE request_id=?').run(id);env.sql.prepare('UPDATE artwork_requests SET finalized=1 WHERE id=?').run(id);const created=await call('orders/create',{id,fingerprint:'f'.repeat(64),snapshot,privateArtwork:true});if(!created.ok)throw Error('Synthetic seed failed');env.sql.prepare('UPDATE orders SET owner_sent=1,receipt_sent=1 WHERE id=?').run(id);mode='normal';detailFails=false;sendRequests=0;providerCalls=0;audit=[];}
async function otherTabErasure(){
 const row=env.sql.prepare('SELECT version FROM orders WHERE id=?').get(id),scope=await(await call('privacy/preview-erasure',{id,version:row.version})).json();
 env.ARTWORK.delete=async()=>{throw Error('Synthetic other-tab R2 failure')};
 const result=await call('privacy/erase',{id,version:scope.version,expectedDigest:scope.digest,operationId:crypto.randomUUID(),confirmation:scope.reference,acknowledged:true});
 audit.push({method:'FIXTURE',path:'/privacy/erase (synthetic other tab)',status:result.status});
 if(result.status!==503)throw Error('Synthetic redaction transition did not become incomplete');
 // Leave explicit status/resume usable. Nothing resumes until the product UI asks.
 env.ARTWORK.delete=async keys=>{for(const key of Array.isArray(keys)?keys:[keys])env.objects.delete(key)};
 mode='normal';
}
await reset();
const vite=await createViteServer({server:{middlewareMode:true,hmr:false},appType:'custom'});
createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://127.0.0.1'),path=url.pathname;
 const reply=async r=>{res.writeHead(r.status,{'Content-Type':r.headers.get('content-type')||'application/json','Cache-Control':'no-store'});res.end(Buffer.from(await r.arrayBuffer()));};
 if(path==='/__privacy/state'){await reply(Response.json({mode,detailFails,sendRequests,providerCalls,audit}));return;}
 if(path==='/__privacy/control'&&req.method==='POST'){let chunks=[];for await(const c of req)chunks.push(c);const input=JSON.parse(Buffer.concat(chunks).toString());if(input.mode==='reset')await reset();else if(input.mode==='other-tab-erasure')await otherTabErasure();else{mode=input.mode;detailFails=false;}await reply(Response.json({ok:true,mode}));return;}
 if(path==='/api/session'){await reply(Response.json({csrf:session.csrf}));return;}
 if(path.startsWith('/api/')){
  const action=path.split('/').at(-1),privacy=path.includes('/privacy/');let r;
  if(action==='send'){sendRequests++;r=Response.json({error:'Fixture blocks all email sends.'},{status:403});}
  else if(mode==='auth-expired')r=Response.json({error:'Your session expired. Sign in again.'},{status:401});
  else if(detailFails&&(!privacy||action==='status'))r=Response.json({error:'Synthetic reconciliation read failure.'},{status:503});
  else if(path.startsWith('/api/artwork/')){r=new Response(tile,{headers:{'Content-Type':'image/jpeg'}});}
  else{
   let chunks=[];for await(const c of req)chunks.push(c);const body=Buffer.concat(chunks),headers={'Origin':'https://admin.customvibe.co.za','Content-Type':'application/json','X-CSRF-Token':req.headers['x-csrf-token']||''};
   if(privacy&&action==='correct'&&mode==='conflict-correction'){await call('orders/status',{id,version:0,status:'in_progress'});mode='normal';}
   if(privacy&&action==='erase'&&mode==='incomplete-erasure')env.ARTWORK.delete=async()=>{throw Error('Synthetic R2 failure')};
   if(mode==='normal')env.ARTWORK.delete=async keys=>{for(const key of Array.isArray(keys)?keys:[keys])env.objects.delete(key)};
   r=await ordersAPI(new Request('https://admin.customvibe.co.za'+req.url,{method:req.method,headers,body:['GET','HEAD'].includes(req.method)?undefined:body}),env,session);
   // Reproduce another Admin tab claiming erasure after the mail read, before
   // the real mounted detail's authoritative follow-up read. No automatic resume.
   if(!privacy&&action==='preview'&&mode==='authoritative-redaction'&&r.ok){
    const mail=await r.clone().json(),scope=await(await call('privacy/preview-erasure',{id,version:mail.version})).json();
    env.ARTWORK.delete=async()=>{throw Error('Synthetic other-tab R2 failure')};
    const result=await call('privacy/erase',{id,version:scope.version,expectedDigest:scope.digest,operationId:crypto.randomUUID(),confirmation:scope.reference,acknowledged:true});
    audit.push({method:'FIXTURE',path:'/privacy/erase (synthetic other tab)',status:result.status});
    if(result.status!==503)throw Error('Synthetic redaction transition did not become incomplete');
    mode='normal';
   }
   if(privacy&&action==='correct'&&['lost-correction','correction-read-failure'].includes(mode)&&r.ok){detailFails=mode==='correction-read-failure';mode='normal';r=Response.json({error:'Synthetic lost correction response.'},{status:503});}
   if(privacy&&action==='erase'&&['lost-erasure','erasure-read-failure'].includes(mode)&&r.ok){detailFails=mode==='erasure-read-failure';mode='normal';r=Response.json({error:'Synthetic lost erasure response.'},{status:503});}
  }
  audit.push({method:req.method,path,status:r.status});await reply(r);return;
 }
 const pages={'/':'tests/fixtures/order-privacy-admin.html','/orders':'tests/fixtures/order-privacy-admin.html','/narrow':'tests/fixtures/order-privacy-narrow.html'};
 if(pages[path]){const html=await vite.transformIndexHtml(req.url,await readFile(pages[path],'utf8'));res.writeHead(200,{'Content-Type':'text/html','Cache-Control':'no-store'});res.end(html);return;}
 vite.middlewares(req,res,()=>{res.writeHead(404);res.end('Not found')});
 }catch{res.writeHead(500,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Synthetic fixture request failed.'}));}
}).listen(port,'127.0.0.1',()=>console.log(`Synthetic privacy fixture: http://127.0.0.1:${port}/orders?order=${id}\nNarrow 375px iframe: http://127.0.0.1:${port}/narrow`));
