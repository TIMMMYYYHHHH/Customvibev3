// Loopback-only verification server. In-memory database and synthetic auth, never production bindings.
import http from 'node:http';import {createServer} from 'vite';import {readFile,writeFile} from 'node:fs/promises';import {resolve,extname} from 'node:path';import {DatabaseSync} from 'node:sqlite';import admin from '../admin/worker.mjs';import {random,signToken} from '../server/auth.mjs';
import {artworkEnv} from './helpers/artwork.mjs';import {orderService} from '../security/orders.mjs';
const searchEnv=artworkEnv(),searchTime=Math.floor(Date.now()/1000);
for(let n=1;n<=113;n++)searchEnv.sql.prepare('INSERT INTO orders(id,fingerprint,snapshot,status,created,expires) VALUES (?,?,?,?,?,?)').run(`11111111-1111-4111-8111-${String(n).padStart(12,'0')}`,'a'.repeat(64),JSON.stringify({contact:{name:n===1?'Older target':n===113?'Older target expired':n%2?'Matching customer':'Other customer'},magnetQty:1,referenceVersion:n===1?1:2,...(n===1?{reference:'CV-OLD-REFERENCE'}:{})}),n===1||n===113?'shipped':'new',searchTime,n===113?searchTime-1:searchTime+7200);
const port=Number(process.env.CV_ADMIN_REVIEW_PORT||5201);
const sql=new DatabaseSync(':memory:');sql.exec('CREATE TABLE content (id INTEGER PRIMARY KEY, revision INTEGER, body TEXT)');const db={prepare(q){let args=[];return {bind(...v){args=v;return this},async first(){return sql.prepare(q).get(...args)||null},async run(){return {meta:sql.prepare(q).run(...args)}}}},async batch(rows){sql.exec('BEGIN');try{const out=[];for(const r of rows)out.push(await r.run());sql.exec('COMMIT');return out}catch(e){sql.exec('ROLLBACK');throw e}}};
// Optional UI-observed owner choices are copied only into this disposable local database.
// This is not a production backup, migration or replacement seed.
const planningPath=process.argv.find(a=>a.startsWith('--date-rules-review='))?.slice('--date-rules-review='.length);
const reviewPath=process.argv.find(a=>a.startsWith('--occasion-review='))?.slice('--occasion-review='.length);
if(reviewPath&&!planningPath){
 const review=JSON.parse(await readFile(resolve(reviewPath),'utf8'));
 const {seedState,OCCASIONS}=await import('../src/seasons/model.mjs');
 const {saveSeasons}=await import('../server/seasons.mjs');
 const state=seedState();
 for(const o of OCCASIONS){
  const observed=review.occasions.find(x=>x.name===o.name);
  if(review.removed.includes(o.name))state.occasionSettings[o.id]={removed:true};
  else if(observed?.image)state.occasionSettings[o.id]={customIcon:{image:observed.image}};
 }
 const christmas=state.campaigns.find(c=>c.occasion==='christmas');
 if(review.christmasDraftCopy)state.drafts[christmas.id]={...structuredClone(christmas),copy:review.christmasDraftCopy};
 await saveSeasons(db,state,'Local review: copied observed occasion icons, removals and Christmas draft wording.');
}
if(planningPath){
 const {prepareLocalDatePlanning}=await import('./fixtures/occasion-date-planning.mjs');
 const {nowSAST}=await import('../src/seasons/model.mjs');
 const {saveSeasons}=await import('../server/seasons.mjs');
 const state=prepareLocalDatePlanning(JSON.parse(await readFile(resolve(planningPath),'utf8')),nowSAST());
 state.revision=0;
 await saveSeasons(db,state,'Local review: populated empty occasion dates. All schedules off; other settings preserved.');
}
const secret=random(),csrf=random(),token=await signToken({scope:'admin',csrf,jti:random(),exp:Math.floor(Date.now()/1000)+7200},secret);
const root=resolve('dist/admin'),types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml','.woff2':'font/woff2'};
const env={CONTENT_DB:db,ADMIN_PASSWORD_HASH:random(),ADMIN_PASSWORD_SALT:random(),ADMIN_SESSION_SECRET:secret,AUTH:{fetch:async()=>Response.json({revoked:false})},ASSETS:{async fetch(r){const path=new URL(r.url).pathname;const file=resolve(root,'.'+(path==='/'?'/index.html':['/preview','/themes'].includes(path)?path+'.html':path));if(!file.startsWith(root+'/'))return new Response('',{status:404});try{return new Response(await readFile(file),{headers:{'Content-Type':types[extname(file)]||'application/octet-stream'}})}catch{return new Response('Not found',{status:404})}}}};

const vite=await createServer({configFile:false,appType:'custom',server:{middlewareMode:true,host:"127.0.0.1",hmr:false},plugins:[(await import('@vitejs/plugin-react')).default()]});
const banner='<div style="padding:6px 20px;background:#35233f;color:white;font:12px/1.5 system-ui">Local review · Sample orders · Changes stay on this computer · No emails</div>';
let sessionExpired=false;
http.createServer(async(req,res)=>{
 try{
  const path=new URL(req.url,'http://127.0.0.1').pathname;
  if(path==='/__review/session'&&req.method==='POST'){const chunks=[];for await(const c of req)chunks.push(c);sessionExpired=Buffer.concat(chunks).toString()==='expire';res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({expired:sessionExpired}));return}
  if(sessionExpired&&(path.startsWith('/api/')||path==='/content.json')){res.writeHead(401,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Local review session expired'}));return}

  if(path==='/__review/search-orders'&&req.method==='GET'){const query=new URL(req.url,'http://127.0.0.1').searchParams;const result=sessionExpired?Response.json({error:'Local review session expired'},{status:401}):await orderService(new Request('https://local/orders/list',{method:'POST',body:JSON.stringify(Object.fromEntries(['q','stage','before'].filter(k=>query.has(k)).map(k=>[k,query.get(k)])))}),searchEnv);res.writeHead(result.status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(await result.text());return;}
  if(/^\/api\/artwork\/(?:11111111-1111-4111-8111-00000000000[1-6]|22222222-2222-4222-8222-222222222222)\/(?:[0-9]|[1-5][0-9])$/.test(path)&&req.method==='GET'){
   res.writeHead(200,{'Content-Type':'image/jpeg','Cache-Control':'no-store'});res.end(await readFile('tests/fixtures/print-tile.jpg'));return;
  }
  if(path==='/auth/logout'){res.writeHead(200,{'Content-Type':'text/html'});res.end('<p>Local review only. No live session was signed out.</p><a href="/orders">Return to admin preview</a>');return}
  if(path.startsWith('/api/')||['/content.json','/preview-content.json'].includes(path)){
   if(!['/api/session','/api/seasons','/api/content','/content.json','/preview-content.json'].includes(path)){res.writeHead(403);res.end('Unavailable in local review');return}
   const chunks=[];for await(const c of req)chunks.push(c);const headers={...req.headers,cookie:'__Host-cv-admin='+token};if(headers.origin)headers.origin='https://admin.local';
   const r=await admin.fetch(new Request('https://admin.local'+req.url,{method:req.method,headers,body:['GET','HEAD'].includes(req.method)?undefined:Buffer.concat(chunks)}),env);
   if(planningPath&&path==='/api/seasons'&&req.method==='PUT'&&r.ok){const saved=await r.clone().json();await writeFile(resolve(planningPath),JSON.stringify(saved,null,2))}
   res.writeHead(r.status,{'Content-Type':r.headers.get('Content-Type')||'application/json','Cache-Control':'no-store'});res.end(Buffer.from(await r.arrayBuffer()));return;
  }
  const pages={'/':'tests/fixtures/admin-orders.html','/orders':'tests/fixtures/admin-orders.html','/content':'tests/fixtures/admin-orders.html','/themes':'admin/themes.html','/preview':'admin/preview.html'};
  if(pages[path]){let html=await readFile(pages[path],'utf8');if(path!=='/preview')html=html.replace('<body>','<body>'+banner+'<div id="review-session-controls"><button id="expire-review-session">Expire local session</button><button id="restore-review-session">Restore local sign-in</button><span id="review-session-result"></span></div><script type="module" src="/tests/fixtures/session-controls.mjs"></script>');html=await vite.transformIndexHtml(req.url,html);res.writeHead(200,{'Content-Type':'text/html','Cache-Control':'no-store'});res.end(html);return}
  vite.middlewares(req,res,()=>{res.writeHead(404);res.end('Not found')});
 }catch(e){res.statusCode=500;res.end(e.message)}
}).listen(port,'127.0.0.1',()=>console.log(`Local admin review: http://127.0.0.1:${port}/orders`));
