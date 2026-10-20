import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {gate,signToken} from '../server/auth.mjs';
import worker from '../admin/worker.mjs';
import catalogue from '../catalogue/index.mjs';
import fallback from '../data/site-content.json' with {type:'json'};
import {seedState} from '../src/seasons/model.mjs';

// Let Node emit SQLite's experimental warning before tests capture diagnostic output.
await new Promise(resolve=>setImmediate(resolve));

const secret='a'.repeat(64);
const env={ADMIN_PASSWORD_HASH:secret,ADMIN_PASSWORD_SALT:secret,ADMIN_SESSION_SECRET:secret};
async function request(){
 const token=await signToken({scope:'admin',jti:'b'.repeat(64),csrf:'c'.repeat(64),exp:Math.floor(Date.now()/1000)+60},secret);
 return new Request('https://admin.customvibe.co.za/orders?order=private-record',{headers:{cookie:'__Host-cv-admin='+token}});
}

test('auth service failures remain closed and diagnostics exclude request and exception secrets',async t=>{
 const events=[];t.mock.method(console,'error',(...args)=>events.push(args));
 const error=new Error('Network connection lost: private-password private-token private-customer@example.invalid');
 const result=await gate(await request(),{...env,AUTH:{fetch:async()=>{throw error}}},'admin');
 assert.equal(result.response.status,503);
 assert.deepEqual(events,[[{event:'customvibe_unavailable',step:'auth_status',reason:'network_connection_lost'}]]);
});

test('auth service HTTP failure identifies its boundary without logging the response body',async t=>{
 const events=[];t.mock.method(console,'error',(...args)=>events.push(args));
 const result=await gate(await request(),{...env,AUTH:{fetch:async()=>new Response('private database details',{status:503})}},'admin');
 assert.equal(result.response.status,503);
 assert.deepEqual(events,[[{event:'customvibe_unavailable',step:'auth_status',reason:'upstream_http',status:503}]]);
});

test('asset failure is distinguished from successful authentication without exposing its URL',async t=>{
 const events=[];t.mock.method(console,'error',(...args)=>events.push(args));
 const result=await worker.fetch(await request(),{...env,AUTH:{fetch:async()=>Response.json({revoked:false})},ASSETS:{fetch:async()=>{throw new Error('private asset details')}}});
 assert.equal(result.status,503);
 assert.deepEqual(events,[[{event:'customvibe_unavailable',step:'admin_assets',reason:'unknown'}]]);
});

test('security database failures are attributed without logging session IDs or query details',async t=>{
 t.mock.method(console,'warn',()=>{});
 const {default:security}=await import('../security/index.mjs');
 const events=[];t.mock.method(console,'error',(...args)=>events.push(args));
 const error=new Error('D1_ERROR: Network connection lost. private-query private-session');
 const DB={prepare:()=>({bind:()=>({first:async()=>{throw error}})})};
 const result=await security.fetch(new Request('https://auth.internal/status',{method:'POST',body:JSON.stringify({scope:'admin',jti:'b'.repeat(64)})}),{DB,ADMIN_LOCKOUT:{}});
 assert.equal(result.status,503);
 assert.deepEqual(events,[[{event:'customvibe_unavailable',step:'security_status',reason:'network_connection_lost'}]]);
});

test('database diagnostic categories distinguish transient resets from schema failures without private text',async t=>{
 const {reportUnavailable}=await import('../server/availability.mjs');
 const events=[];t.mock.method(console,'error',(...args)=>events.push(args));
 for(const [message,reason] of [
  ['D1_ERROR: Cannot resolve D1 DB due to transient issue on remote node. private-id','database_transient'],
  ['D1_ERROR: Internal error in D1 DB storage caused object to be reset. private-id','database_reset'],
  ['D1_ERROR: internal error private-id','database_internal'],
  ['D1_ERROR: no such table: private_table','database_schema']
 ]){
  reportUnavailable('security_status',new Error(message));
  assert.deepEqual(events.pop(),[{event:'customvibe_unavailable',step:'security_status',reason}]);
 }
});

function statusRequest(){return new Request('https://auth.internal/status',{method:'POST',body:JSON.stringify({scope:'admin',jti:'b'.repeat(64)})})}

test('a transient D1 session-check failure is retried once and still honours revocation',async t=>{
 const {default:security}=await import('../security/index.mjs');
 t.mock.method(console,'warn',()=>{});
 for(const revoked of [false,true]){
  let reads=0;
  const DB={prepare:sql=>{assert.match(sql,/^SELECT exp FROM revoked /);return {bind:(id,now)=>{assert.equal(id,'admin:'+'b'.repeat(64));assert.ok(Number.isInteger(now));return {first:async()=>{if(++reads===1)throw new Error('D1_ERROR: transient remote failure');return revoked?{exp:now+60}:null}}}}}};
  const response=await security.fetch(statusRequest(),{DB,ADMIN_LOCKOUT:{}});
  assert.equal(response.status,200);assert.deepEqual(await response.json(),{revoked});assert.equal(reads,2);
 }
});

test('a persistent session database failure stays closed with a bounded retry',async t=>{
 const {default:security}=await import('../security/index.mjs');
 t.mock.method(console,'error',()=>{});t.mock.method(console,'warn',()=>{});
 let reads=0;
 const DB={prepare:()=>({bind:()=>({first:async()=>{reads++;throw new Error('D1_ERROR: transient remote failure')}})})};
 const response=await security.fetch(statusRequest(),{DB,ADMIN_LOCKOUT:{}});
 assert.equal(response.status,503);assert.equal(reads,2);
});

test('database schema and quota errors are not retried, and login reservations are never replayed',async t=>{
 const {default:security}=await import('../security/index.mjs');
 t.mock.method(console,'error',()=>{});t.mock.method(console,'warn',()=>{});
 for(const message of ['D1_ERROR: no such table: revoked',"D1_ERROR: Your account has exceeded D1's free tier daily row read limit."]){
  let reads=0;const DB={prepare:()=>({bind:()=>({first:async()=>{reads++;throw new Error(message)}})})};
  assert.equal((await security.fetch(statusRequest(),{DB,ADMIN_LOCKOUT:{}})).status,503);assert.equal(reads,1);
 }
 let writes=0;const DB={prepare:()=>({bind:()=>({})}),batch:async()=>{writes++;throw new Error('D1_ERROR: transient remote failure')}};
 const response=await security.fetch(new Request('https://auth.internal/reserve',{method:'POST',body:JSON.stringify({scope:'admin',key:'b'.repeat(64)})}),{DB,ADMIN_LOCKOUT:{get:async()=>null}});
 assert.equal(response.status,503);assert.equal(writes,1);
});

test('order and artwork SELECT recovery preserves records and does not replay quota writes',async t=>{
 const {default:security}=await import('../security/index.mjs');
 const {artworkEnv}=await import('./helpers/artwork.mjs');
 t.mock.method(console,'warn',()=>{});t.mock.method(console,'error',()=>{});
 for(const route of ['orders/detail','artwork/detail']){
  const env=artworkEnv(),id=crypto.randomUUID(),expiry=Math.floor(Date.now()/1000)+3600;
  env.sql.prepare('INSERT INTO orders(id,fingerprint,snapshot,created,expires) VALUES (?,?,?,?,?)').run(id,'a'.repeat(64),JSON.stringify({contact:{name:'Fixture'},magnetQty:1}),1,expiry);
  env.sql.prepare('INSERT INTO artwork_requests(id,owner,manifest,bytes,created,expires,finalized,reservation) VALUES (?,?,?,?,?,?,1,?)').run(id,'b'.repeat(64),'[]',0,1,expiry,'fixture');
  const original=env.DB.prepare;let failures=0;const attempts=new Map();
  env.DB.prepare=(sql)=>{const stmt=original(sql);return {bind(...params){const bound=stmt.bind(...params);return {...bound,first:async()=>{attempts.set(sql,(attempts.get(sql)||0)+1);if(/^SELECT/.test(sql)&&attempts.get(sql)===1){failures++;throw Error('D1_ERROR: transient failure')}return bound.first()},all:async()=>{attempts.set(sql,(attempts.get(sql)||0)+1);if(/^SELECT/.test(sql)&&attempts.get(sql)===1){failures++;throw Error('D1_ERROR: transient failure')}return bound.all()}}}}};
  const response=await security.fetch(new Request('https://auth.internal/'+route,{method:'POST',body:JSON.stringify({id})}),env);
  assert.equal(response.status,200);assert.ok(failures>0);assert.equal(env.sql.prepare('SELECT count(*) AS n FROM orders').get().n,1);assert.equal(env.sql.prepare('SELECT count(*) AS n FROM artwork_usage').get().n,0);
 }
});

test('preview uses one order snapshot and preserves upstream failure without retrying sends',async()=>{
 const {ordersAPI}=await import('../admin/orders-api.mjs');
 const id=crypto.randomUUID(),url='https://admin.customvibe.co.za/api/orders/'+id+'/preview';let calls=0;
 const order={reference:'CV-FIXTURE',status:'new',version:0,snapshot:{contact:{name:'Fixture',email:'fixture@example.invalid'},magnetQty:1}};
 const env={AUTH:{fetch:async()=>{calls++;return Response.json(order)}}};
 const response=await ordersAPI(new Request(url),env,{});
 assert.equal(response.status,200);assert.equal((await response.json()).to,'fixture@example.invalid');assert.equal(calls,1);
 env.AUTH.fetch=async()=>new Response('Unavailable',{status:503});assert.equal((await ordersAPI(new Request(url),env,{})).status,503);
});

test('read helper refuses writes and artwork download quota failures are never replayed',async t=>{
 const {readSelect}=await import('../security/read.mjs');
 await assert.rejects(readSelect({},'INSERT INTO attempts VALUES (?)',[1]),/Read-only/);
 const {default:security}=await import('../security/index.mjs');
 t.mock.method(console,'error',()=>{});let quotaWrites=0,objectReads=0;
 const DB={prepare:sql=>({bind:()=>({first:async()=>{if(sql.startsWith('SELECT'))return {finalized:1,expires:Math.floor(Date.now()/1000)+60,manifest:'[{"name":"design-01-photo.jpg"}]'};quotaWrites++;throw Error('D1_ERROR: transient failure')}})})};
 const result=await security.fetch(new Request('https://auth.internal/artwork/download',{method:'POST',body:JSON.stringify({id:crypto.randomUUID(),index:0})}),{DB,ARTWORK:{get:async()=>{objectReads++}}});
 assert.equal(result.status,503);assert.equal(quotaWrites,1);assert.equal(objectReads,0);
});

const catalogueSentinel='PRIVATE_CATALOGUE_TOKEN_customer@example.invalid_query';
const catalogueRequest=path=>new Request('https://catalogue.internal'+path+'?private='+catalogueSentinel,{headers:{Authorization:'Bearer '+catalogueSentinel,'X-Private':catalogueSentinel}});
const catalogueRoutes=[['/content.json','catalogue_content'],['/season.json','catalogue_season']];
for(const [path,step] of catalogueRoutes)test(`${path}: caught database failures emit one safe category without retrying or changing the 503`,async t=>{
 const events=[];t.mock.method(console,'error',(...args)=>events.push(args));
 for(const [message,reason] of [
  ['D1_ERROR: Network connection lost.','network_connection_lost'],
  ['D1_ERROR: Cannot resolve D1 DB due to transient issue on remote node.','database_transient'],
  ['D1_ERROR: Internal error in D1 DB storage caused object to be reset.','database_reset'],
  ['D1_ERROR: internal error','database_internal'],
  ['D1_ERROR: no such column: private_column','database_schema'],
  ["D1_ERROR: Your account has exceeded D1's free tier daily row read limit.",'service_limit'],
  ['D1_ERROR: SQLITE_BUSY','database'],
  ['Operation timed out.','timeout'],
  ['Unrecognized failure.','unknown']
 ]){
  let reads=0;const error=Object.assign(Error(message+' '+catalogueSentinel),{cause:{token:catalogueSentinel},query:catalogueSentinel});
  const CONTENT_DB={prepare:query=>{assert.match(query,/^SELECT /);return {first:async()=>{reads++;throw error}}}};
  const response=await catalogue.fetch(catalogueRequest(path),{CONTENT_DB});
  assert.equal(response.status,503);assert.equal(await response.text(),'Temporarily unavailable');
  assert.equal(response.headers.get('Cache-Control'),null);assert.equal(reads,1);
  assert.deepEqual(events.splice(0),[[{event:'customvibe_unavailable',step,reason}]]);
 }
});

function catalogueStorage(sql,queries=[]){return {prepare(query){assert.match(query,/^SELECT /,'Catalogue requests must remain read-only');queries.push(query);return {first:async()=>sql.prepare(query).get()||null}}}}

test('real catalogue schema failures name only the failed route and never reveal SQLite details',async t=>{
 const events=[];t.mock.method(console,'error',(...args)=>events.push(args));
 for(const [path,step] of catalogueRoutes){
  const sql=new DatabaseSync(':memory:');t.after(()=>sql.close());
  if(path==='/season.json')sql.exec('CREATE TABLE seasonal_settings (id INTEGER PRIMARY KEY)');
  sql.exec('PRAGMA query_only=ON');
  const response=await catalogue.fetch(catalogueRequest(path),{CONTENT_DB:catalogueStorage(sql)});
  assert.equal(response.status,503);assert.equal(await response.text(),'Temporarily unavailable');
  assert.deepEqual(events.splice(0),[[{event:'customvibe_unavailable',step,reason:'database_schema'}]]);
 }
});

test('corrupted saved catalogue and seasonal records stay unavailable instead of hiding failure behind defaults',async t=>{
 const events=[];t.mock.method(console,'error',(...args)=>events.push(args));
 for(const [path,step] of catalogueRoutes){
  const sql=new DatabaseSync(':memory:');t.after(()=>sql.close());
  const table=path==='/content.json'?'content':'seasonal_settings';
  sql.exec(`CREATE TABLE ${table} (id INTEGER PRIMARY KEY, body TEXT)`);
  sql.prepare(`INSERT INTO ${table} VALUES (1,?)`).run(catalogueSentinel);
  sql.exec('PRAGMA query_only=ON');
  const response=await catalogue.fetch(catalogueRequest(path),{CONTENT_DB:catalogueStorage(sql)});
  assert.equal(response.status,503);assert.equal(await response.text(),'Temporarily unavailable');
  assert.deepEqual(events.splice(0),[[{event:'customvibe_unavailable',step,reason:'unknown'}]]);
  assert.equal(sql.prepare(`SELECT body FROM ${table} WHERE id=1`).get().body,catalogueSentinel);
 }
});

test('successful catalogue reads preserve saved authority, private filtering and no-store without diagnostic noise or writes',async t=>{
 const events=[],queries=[];t.mock.method(console,'error',(...args)=>events.push(args));
 const sql=new DatabaseSync(':memory:');t.after(()=>sql.close());
 sql.exec('CREATE TABLE content (id INTEGER PRIMARY KEY, body TEXT); CREATE TABLE seasonal_settings (id INTEGER PRIMARY KEY, body TEXT)');
 const content=structuredClone(fallback);content.revision=23;content.pricing={single:6000,six:30000,ten:48000};content.products[0].name='Saved catalogue wording';content.products[1].status='hidden';
 const seasons=seedState();seasons.history=[{action:catalogueSentinel}];
 const contentBytes=JSON.stringify(content),seasonBytes=JSON.stringify(seasons);
 sql.prepare('INSERT INTO content VALUES (1,?)').run(contentBytes);sql.prepare('INSERT INTO seasonal_settings VALUES (1,?)').run(seasonBytes);
 sql.exec('PRAGMA query_only=ON');
 const CONTENT_DB=catalogueStorage(sql,queries);
 const response=await catalogue.fetch(catalogueRequest('/content.json'),{CONTENT_DB});
 assert.equal(response.status,200);assert.equal(response.headers.get('Cache-Control'),'no-store');
 const value=await response.json();assert.equal(value.revision,23);assert.equal(value.products[0].name,'Saved catalogue wording');assert.equal(value.products.some(p=>p.id==='counting'),false);assert.deepEqual(value.pricing,{single:6000,six:30000,ten:48000});
 const season=await catalogue.fetch(catalogueRequest('/season.json'),{CONTENT_DB});
 assert.equal(season.status,200);assert.equal(season.headers.get('Cache-Control'),'no-store');assert.deepEqual(await season.json(),{campaign:null,definition:null,until:null});
 assert.equal(sql.prepare('SELECT body FROM content WHERE id=1').get().body,contentBytes);assert.equal(sql.prepare('SELECT body FROM seasonal_settings WHERE id=1').get().body,seasonBytes);
 assert.equal(queries.length,3);assert.deepEqual(events,[]);
});

test('normal absent catalogue rows and seasonal tables still use existing defaults without an incident',async t=>{
 const events=[];t.mock.method(console,'error',(...args)=>events.push(args));
 const sql=new DatabaseSync(':memory:');t.after(()=>sql.close());sql.exec('CREATE TABLE content (id INTEGER PRIMARY KEY, body TEXT); PRAGMA query_only=ON');
 const CONTENT_DB=catalogueStorage(sql);
 const content=await catalogue.fetch(catalogueRequest('/content.json'),{CONTENT_DB});assert.equal(content.status,200);assert.equal((await content.json()).revision,fallback.revision);
 const season=await catalogue.fetch(catalogueRequest('/season.json'),{CONTENT_DB});assert.equal(season.status,200);assert.deepEqual(await season.json(),{campaign:null,definition:null,until:null});assert.deepEqual(events,[]);
});

test('unsupported catalogue routes and methods remain empty 404s without database access or diagnostic noise',async t=>{
 const events=[];t.mock.method(console,'error',(...args)=>events.push(args));
 const env={get CONTENT_DB(){assert.fail('Unsupported request must not reach the database')}};
 for(const [method,path] of [['GET','/'],['GET','/debug'],['GET','/content.json/extra'],['POST','/content.json'],['HEAD','/season.json']]){
  const response=await catalogue.fetch(new Request('https://catalogue.internal'+path,{method}),env);
  assert.equal(response.status,404);assert.equal(await response.text(),'');assert.equal(response.headers.get('Cache-Control'),null);
 }
 assert.deepEqual(events,[]);
});

test('repeated failed catalogue requests produce at most one bounded record each without retry amplification',async t=>{
 const events=[];t.mock.method(console,'error',(...args)=>events.push(args));let reads=0;
 const CONTENT_DB={prepare:()=>({first:async()=>{reads++;throw Error('D1_ERROR: transient '+catalogueSentinel.repeat(1000))}})};
 for(let i=0;i<20;i++)assert.equal((await catalogue.fetch(catalogueRequest('/content.json'),{CONTENT_DB})).status,503);
 assert.equal(reads,20);assert.equal(events.length,20);
 for(const entry of events){assert.deepEqual(entry,[{event:'customvibe_unavailable',step:'catalogue_content',reason:'database_transient'}]);assert.ok(Buffer.byteLength(JSON.stringify(entry))<150);}
});
