import test from 'node:test';
import assert from 'node:assert/strict';
import security from '../security/index.mjs';
import {artworkEnv} from './helpers/artwork.mjs';

const hourly={cron:'0 * * * *'},fiveMinute={cron:'*/5 * * * *'};
const orderWork=['orders_proofs','orders_proof_state','orders_proof_records','orders_proof_sessions','orders_select','orders_records'];
const allWork=['maps',...orderWork,'artwork_select','artwork_records','artwork_usage','mail_state','mail_events','auth'];

function fixture(t,failAt){
 const env=artworkEnv(),time=Math.floor(Date.now()/1000),events=[],operations=[];
 t.after(()=>env.sql.close());
 env.LOCKER_REFRESH_ENABLED='false';
 let networkCalls=0,senderCalls=0;
 t.mock.method(globalThis,'fetch',async()=>{networkCalls++;throw Error('External network forbidden')});
 env.EMAIL={send:async()=>{senderCalls++;throw Error('Sender forbidden')}};
 t.mock.method(console,'error',(...args)=>events.push(args));
 const error=new Error('D1_ERROR: private-sql private-customer@example.invalid private-token');
 error.cause={headers:{authorization:'private-header'},body:{nested:'private-body'},url:'https://private.invalid/?id=private-id'};
 error.code='private-code';error.context={customer:'private-customer',token:'private-context-token'};
 Object.defineProperty(error,'details',{value:'private-hidden-details'});
 error[Symbol('private-property')]='private-symbol-value';
 env.sql.prepare('INSERT INTO map_usage(id,amount,expires) VALUES(?,?,?)').run('fixture-map',1,1);
 env.sql.prepare('INSERT INTO orders(id,fingerprint,snapshot,created,expires) VALUES(?,?,?,?,?)').run('fixture-order','a'.repeat(64),'{}',1,1);
 env.sql.prepare('INSERT INTO artwork_requests(id,owner,manifest,bytes,created,expires,finalized,reservation) VALUES(?,?,?,?,?,?,?,?)').run('fixture-artwork','b'.repeat(64),'[{}]',4,1,1,1,'fixture');
 env.sql.prepare("INSERT INTO artwork_usage(id,amount) VALUES('retained',4)").run();
 env.objects.set('fixture-artwork/0.jpg',new Uint8Array([1,2,3,4]));
 env.sql.prepare('INSERT INTO attempts(id,count,until) VALUES(?,?,?)').run('fixture-attempt',1,1);
 env.sql.prepare('INSERT INTO revoked(id,exp) VALUES(?,?)').run('fixture-revoked',1);
 env.sql.prepare('INSERT INTO submissions(id,fingerprint,reservation,kind,expires) VALUES(?,?,?,?,?)').run('fixture-submission','c'.repeat(64),'fixture','order',1);
 env.sql.prepare('INSERT INTO mail_delivery_state(id,purpose,reference,attempt,provider_id,accepted_at,expires_at,recipient_count,recipient_digest) VALUES(?,?,?,?,?,?,?,?,?)').run('fixture-mail','customer-receipt','fixture-orphan','fixture','fixture-provider',time,time+100,1,'d'.repeat(64));
 env.sql.prepare('INSERT INTO mail_delivery_events(event_id,state_id,type,occurred_at,expires_at) VALUES(?,?,?,?,?)').run('fixture-event','fixture-mail','delivered',time,time+100);
 const original=env.DB,statementInfo=new WeakMap();
 function operation(label,run){operations.push(label);if(label===failAt)throw error;return run()}
 function single(sql){
  if(sql.startsWith('DELETE FROM map_usage'))return 'maps';
  if(sql.startsWith('UPDATE proof_state'))return 'orders_proof_state';
  if(sql.startsWith('DELETE FROM proof_sessions'))return 'orders_proof_sessions';
  if(sql.startsWith('SELECT id,snapshot FROM orders'))return 'orders_select';
  if(sql.startsWith('SELECT id,manifest,bytes FROM artwork_requests'))return 'artwork_select';
  if(sql.startsWith('DELETE FROM artwork_usage'))return 'artwork_usage';
  if(sql.startsWith('DELETE FROM mail_delivery_state'))return 'mail_state';
  if(sql.startsWith('DELETE FROM mail_delivery_events'))return 'mail_events';
  throw Error('Unexpected scheduled single statement: '+sql);
 }
 function wrap(sql,statement){
  const wrapped={bind(...args){return wrap(sql,statement.bind(...args))}};
  for(const method of ['run','first','all'])wrapped[method]=async()=>operation(single(sql),()=>statement[method]());
  statementInfo.set(wrapped,{sql,statement});return wrapped;
 }
 env.DB={prepare:sql=>wrap(sql,original.prepare(sql)),batch:async statements=>{
  const info=statements.map(s=>statementInfo.get(s)),sql=info[0].sql;
  const label=sql.startsWith('DELETE FROM attempts')?'auth':sql.startsWith('UPDATE artwork_usage')?'artwork_records':sql.startsWith('UPDATE order_update_attempts')?'orders_records':statements.length===3?'orders_proofs':'orders_proof_records';
  return operation(label,()=>original.batch(info.map(s=>s.statement)));
 }};
 const count=table=>env.sql.prepare('SELECT count(*) AS n FROM '+table).get().n;
 return {env,error,events,operations,count,assertOffline(){assert.equal(networkCalls,0);assert.equal(senderCalls,0)}};
}

function assertPrivateRejection(error,original){
 assert.ok(error instanceof Error);
 assert.notEqual(error,original);
 assert.equal(error.name,'Error');
 assert.equal(error.message,'Scheduled cleanup failed');
 assert.deepEqual(Reflect.ownKeys(error).sort(),['message','stack']);
 for(const key of Reflect.ownKeys(original))if(key!=='message'&&key!=='stack')assert.equal(Object.hasOwn(error,key),false);
 for(const key of Reflect.ownKeys(error))assert.doesNotMatch(JSON.stringify(error[key])??'',/private-/);
 assert.doesNotMatch(error.stack,/private-/);
 return true;
}

// Missing reporting, leaked original exceptions, retries or stage reordering must fail these actual-handler cases.
for(const [failed,step] of [
 ['orders_proofs','scheduled_orders'],['artwork_select','scheduled_artwork'],
 ['mail_state','scheduled_mail_delivery'],['auth','scheduled_auth']
])test('hourly '+step+' failure rejects privately, stops and reports only its safe category',async t=>{
 const f=fixture(t,failed);
 await assert.rejects(security.scheduled(hourly,f.env),error=>assertPrivateRejection(error,f.error));
 assert.deepEqual(f.operations,allWork.slice(0,allWork.indexOf(failed)+1));
 assert.equal(f.count('attempts'),1);
 if(failed!=='orders_proofs')assert.equal(f.count('orders'),0);
 if(failed==='mail_state'||failed==='auth'){assert.equal(f.count('artwork_requests'),0);assert.equal(f.env.objects.size,0)}
 if(failed==='auth'){assert.equal(f.count('mail_delivery_state'),0);assert.equal(f.count('mail_delivery_events'),0)}
 f.assertOffline();
 assert.deepEqual(f.events,[[{event:'customvibe_unavailable',step,reason:'database'}]]);
});

test('mail event cleanup failure rejects privately, preserves partial cleanup and skips auth without retry',async t=>{
 const f=fixture(t,'mail_events');
 await assert.rejects(security.scheduled(hourly,f.env),error=>assertPrivateRejection(error,f.error));
 assert.deepEqual(f.operations,allWork.slice(0,-1));
 assert.equal(f.count('mail_delivery_state'),0);assert.equal(f.count('mail_delivery_events'),0);
 assert.equal(f.count('attempts'),1);f.assertOffline();
 assert.deepEqual(f.events,[[{event:'customvibe_unavailable',step:'scheduled_mail_delivery',reason:'database'}]]);
});

test('successful hourly cleanup keeps existing order and emits no availability or completion event',async t=>{
 const f=fixture(t);
 assert.equal(await security.scheduled(hourly,f.env),undefined);
 assert.deepEqual(f.operations,allWork);
 for(const table of ['map_usage','orders','artwork_requests','mail_delivery_state','mail_delivery_events','attempts','revoked','submissions'])assert.equal(f.count(table),0,table);
 assert.equal(f.env.sql.prepare("SELECT amount FROM artwork_usage WHERE id='retained'").get().amount,0);
 assert.equal(f.env.objects.size,0);
 assert.deepEqual(f.events,[]);f.assertOffline();
});

test('five-minute invocation returns after map usage cleanup without hourly work',async t=>{
 const f=fixture(t);
 assert.equal(await security.scheduled(fiveMinute,f.env),undefined);
 assert.deepEqual(f.operations,['maps']);assert.equal(f.count('map_usage'),0);
 for(const table of ['orders','artwork_requests','mail_delivery_state','attempts'])assert.equal(f.count(table),1,table);
 assert.deepEqual(f.events,[]);f.assertOffline();
});

for(const [name,event,expected] of [['hourly',hourly,allWork],['five-minute',fiveMinute,['maps']]])test(name+' map usage failure retains caught scheduled_maps continuation',async t=>{
 const f=fixture(t,'maps');
 assert.equal(await security.scheduled(event,f.env),undefined);
 assert.deepEqual(f.operations,expected);assert.equal(f.count('map_usage'),1);
 assert.equal(f.count('attempts'),name==='hourly'?0:1);
 assert.deepEqual(f.events,[[{event:'customvibe_unavailable',step:'scheduled_maps',reason:'database'}]]);f.assertOffline();
});
