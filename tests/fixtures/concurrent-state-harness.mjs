// Disposable real Worker/SQLite boundary. No production binding or network client.
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import admin from '../../admin/worker.mjs';
import catalogue from '../../catalogue/index.mjs';
import {random,signToken} from '../../server/auth.mjs';
import {saveSeasons} from '../../server/seasons.mjs';
import {seedState} from '../../src/seasons/model.mjs';
export const origin='https://admin.local';
export const storefrontOrigin='https://storefront.local';
const root=fileURLToPath(new URL('../..',import.meta.url));
export async function createConcurrencyHarness({storefront=false}={}){
 const sql=new DatabaseSync(':memory:');sql.exec(readFileSync(resolve(root,'migrations/content/0001.sql'),'utf8'));
 const sqlUpdates=[];let seasonReadBarrier=null;
 function armSeasonReadBarrier({timeoutMs=2000}={}){
  if(seasonReadBarrier)throw Error('Season read barrier already armed');
  if(!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>5000)throw Error('Invalid fixture barrier timeout');
  const info={reads:0,released:false,timedOut:false};let release,reject;
  const ready=new Promise((resolve,fail)=>{release=resolve;reject=fail});ready.catch(()=>{});
  const barrier={info,ready,release,reject,timer:setTimeout(()=>{seasonReadBarrier=null;info.timedOut=true;reject(Error('Fixture seasonal read barrier timed out waiting for both writers'));},timeoutMs)};
  seasonReadBarrier=barrier;return info;
 }
 async function alignSeasonRead(query,row){
  const barrier=seasonReadBarrier;if(query!=='SELECT body FROM seasonal_settings WHERE id=1'||!barrier)return row;
  // Capture the real row before waiting, so neither writer observes the other's later batch.
  if(++barrier.info.reads===2){clearTimeout(barrier.timer);seasonReadBarrier=null;barrier.info.released=true;barrier.release()}
  await barrier.ready;return row;
 }
 const statement=(query,args=[])=>({bind(...values){return statement(query,values)},async first(){const row=sql.prepare(query).get(...args)||null;return alignSeasonRead(query,row)},async run(){const meta=sql.prepare(query).run(...args);if(/^UPDATE (content|seasonal_settings) SET /i.test(query))sqlUpdates.push({table:query.startsWith('UPDATE seasonal_settings')?'seasonal_settings':'content',changes:meta.changes});return {meta}},async all(){return {results:sql.prepare(query).all(...args)}}});
 let queue=Promise.resolve();
 const DB={prepare:statement,batch(statements){const operation=queue.then(async()=>{sql.exec('BEGIN');try{const results=[];for(const s of statements)results.push(await s.run());sql.exec('COMMIT');return results}catch(e){sql.exec('ROLLBACK');throw e}});queue=operation.catch(()=>{});return operation}};
 const initial=seedState();initial.mode='off';await saveSeasons(DB,initial,'Synthetic fixture baseline. Schedules remain off.');
 const secret=random(),actors={},operations=[],forbidden=[];
 for(const name of ['A','B']){const csrf=random(),jti=random(),token=await signToken({scope:'admin',csrf,jti,exp:Math.floor(Date.now()/1000)+1800},secret);actors[name]={csrf,jti,token};}
 const assetRoot=resolve(root,'dist/admin');
 const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.woff2':'font/woff2','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.json':'application/json'};
 const env={CONTENT_DB:DB,ADMIN_PASSWORD_HASH:random(),ADMIN_PASSWORD_SALT:random(),ADMIN_SESSION_SECRET:secret,AUTH:{async fetch(url,init){if(new URL(url).pathname!=='/status'){forbidden.push('Unexpected AUTH operation');throw Error('No send/write auth operation belongs in this fixture')}const body=JSON.parse(init.body);return Response.json({revoked:body.scope!=='admin'||!Object.values(actors).some(a=>a.jti===body.jti)});}},ASSETS:{async fetch(request){const path=new URL(request.url).pathname,mapped=path==='/'?'/index.html':['/themes','/preview'].includes(path)?path+'.html':path;const file=resolve(assetRoot,'.'+mapped);if(!file.startsWith(assetRoot+'/'))return new Response('Not found',{status:404});try{return new Response(await readFile(file),{headers:{'Content-Type':types[extname(file)]||'application/octet-stream'}})}catch{return new Response('Not found',{status:404})}}}};
 const allowed=new Set(['/api/session','/api/seasons','/api/content','/api/forms']);
 async function dispatch(request){const url=new URL(request.url);if(url.origin!==origin||url.pathname.startsWith('/api/')&&!allowed.has(url.pathname)||!['GET','PUT'].includes(request.method)){forbidden.push(request.method+' '+url.pathname);return new Response('Forbidden in disconnected fixture',{status:403})}
  const cookie=request.headers.get('cookie')||'',actor=Object.entries(actors).find(([,a])=>cookie.includes('__Host-cv-admin='+a.token))?.[0]||'anonymous';
  const response=await admin.fetch(request,env);if(url.pathname.startsWith('/api/')||url.pathname==='/content.json')operations.push({actor,method:request.method,path:url.pathname,status:response.status});return response;
 }
 async function dispatchStorefront(request){
  const url=new URL(request.url);
  if(!storefront||url.origin!==storefrontOrigin||request.method!=='GET'||url.pathname.startsWith('/api/')&&url.pathname!=='/api/forms'){forbidden.push(request.method+' '+url.origin+url.pathname);return new Response('Forbidden in disconnected fixture',{status:403})}
  let response;
  if(['/content.json','/season.json'].includes(url.pathname))response=await catalogue.fetch(request,{CONTENT_DB:DB});
  // Existing authenticated preview response disables forms. No sending service is configured.
  else if(url.pathname==='/api/forms')response=await dispatch(new Request(origin+'/api/forms',{headers:{cookie:'__Host-cv-admin='+actors.A.token}}));
  else{
   const clientRoot=resolve(root,'dist/client'),mapped=url.pathname==='/'?'/index.html':extname(url.pathname)?url.pathname:url.pathname+'.html',file=resolve(clientRoot,'.'+mapped);
   if(!file.startsWith(clientRoot+'/'))response=new Response('Not found',{status:404});
   else try{response=new Response(await readFile(file),{headers:{'Content-Type':types[extname(file)]||'application/octet-stream'}})}catch{response=new Response('Not found',{status:404})}
  }
  operations.push({actor:'visitor',method:request.method,path:url.pathname,status:response.status});return response;
 }
 return {actors,operations,forbidden,sql,sqlUpdates,armSeasonReadBarrier,dispatch,dispatchStorefront,close(){if(seasonReadBarrier){clearTimeout(seasonReadBarrier.timer);seasonReadBarrier.reject(Error('Fixture closed before both readers arrived'));seasonReadBarrier=null}sql.close()}};
}
export function actorRequest(harness,actor,path,{method='GET',body,csrf=harness.actors[actor].csrf}={}){
 return harness.dispatch(new Request(origin+path,{method,headers:{cookie:'__Host-cv-admin='+harness.actors[actor].token,...(method==='PUT'?{origin,'Content-Type':'application/json','X-CSRF-Token':csrf}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})}));
}
