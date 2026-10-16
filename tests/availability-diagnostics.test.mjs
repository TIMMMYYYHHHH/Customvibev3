import test from 'node:test';
import assert from 'node:assert/strict';
import {gate,signToken} from '../server/auth.mjs';
import worker from '../admin/worker.mjs';

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
