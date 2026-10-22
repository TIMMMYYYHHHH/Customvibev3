import test from 'node:test';
import assert from 'node:assert/strict';
import security from '../security/index.mjs';
import {refreshLockerSnapshot} from '../security/maps.mjs';
import {inspectLockerSnapshot} from '../security/locker-health.mjs';
import {artworkEnv} from './helpers/artwork.mjs';

const now=1800000000000,key='system/lockers/directory-v1.json',fiveMinute={cron:'*/5 * * * *'};
const locations=[{code:'SYNTHETIC-1',name:'Synthetic locker',type:{id:2},status:'online',address:'1 Synthetic Road',place:{town:'Durban'},latitude:-29.8,longitude:31}];
const signal=(state,reason)=>({event:'customvibe_snapshot_unhealthy',state,reason,runbook:'docs/availability-runbook.md#locker-directory-health'});
function fixture(t){
 const env=artworkEnv(),warnings=[];
 t.after(()=>env.sql.close());
 env.LOCKER_REFRESH_ENABLED='true';env.TCG_LOCKER_API_KEY='local-synthetic-credential';
 t.mock.method(Date,'now',()=>now);
 t.mock.method(console,'warn',value=>warnings.push(value));
 t.mock.method(globalThis,'fetch',async()=>assert.fail('Real network forbidden'));
 return {env,warnings,async seed(at){assert.equal(await refreshLockerSnapshot(env,{now:at,network:async()=>Response.json(locations)}),true)}};
}

// Removing the scheduled probe must miss stale data after the real refresh swallows failure.
test('five-minute runtime reports stale snapshot after failed refresh preserves its lease',async t=>{
 const f=fixture(t);await f.seed(now-400*60000);
 t.mock.method(globalThis,'fetch',async()=>new Response(null,{status:503}));
 await security.scheduled(fiveMinute,f.env);
 assert.deepEqual(f.warnings,[{event:'locker_refresh_unavailable'},signal('critical','snapshot_stale')]);
 const row=f.env.sql.prepare('SELECT * FROM locker_refresh WHERE id=1').get();
 assert.equal(row.updated_at,now-400*60000);assert.equal(row.next_attempt,now+6*3600000);
});

// Fresh metadata alone must not conceal a disappeared private directory object.
test('five-minute runtime reports missing object even with fresh producer metadata',async t=>{
 const f=fixture(t);await f.seed(now-60000);f.env.objects.delete(key);
 await security.scheduled(fiveMinute,f.env);
 assert.deepEqual(f.warnings,[signal('critical','snapshot_missing')]);
});

test('real successful producer and fresh stored object remain quiet in five-minute runtime',async t=>{
 const f=fixture(t);await f.seed(now-60000);
 await security.scheduled(fiveMinute,f.env);
 assert.deepEqual(f.warnings,[]);
});

// Reading a lease as success or moving an age boundary must fail these actual stored-marker cases.
for(const [age,want] of [
 [365*60000-1,{state:'healthy',reason:'available'}],
 [365*60000,{state:'warning',reason:'snapshot_stale'}],
 [375*60000-1,{state:'warning',reason:'snapshot_stale'}],
 [375*60000,{state:'critical',reason:'snapshot_stale'}]
])test('snapshot age '+age+' uses the successful timestamp, not its future lease',async t=>{
 const f=fixture(t);await f.seed(now-age);
 f.env.sql.prepare('UPDATE locker_refresh SET next_attempt=?').run(now+36000000);
 assert.deepEqual(await inspectLockerSnapshot(f.env),want);
});

for(const [name,value,want] of [
 ['missing',null,{state:'unknown',reason:'missing_summary'}],
 ['zero',0,{state:'unknown',reason:'missing_summary'}],
 ['negative',-1,{state:'unknown',reason:'missing_summary'}],
 ['fractional',now-0.5,{state:'unknown',reason:'missing_summary'}],
 ['malformed','PRIVATE_SENTINEL',{state:'unknown',reason:'missing_summary'}],
 ['future',now+1,{state:'unknown',reason:'future_timestamp'}]
])test(name+' producer timestamp cannot claim healthy or download an object',async t=>{
 const f=fixture(t);await f.seed(now-60000);
 if(value===null)f.env.sql.prepare('DELETE FROM locker_refresh').run();else f.env.sql.prepare('UPDATE locker_refresh SET updated_at=?').run(value);
 f.env.ARTWORK.head=async()=>assert.fail('Invalid timestamp must stop before R2');
 assert.deepEqual(await inspectLockerSnapshot(f.env),want);
});

test('inspector is one indexed read and one fixed HEAD with no body, list or storage mutation',async t=>{
 const f=fixture(t);await f.seed(now-60000);
 const original=f.env.DB,head=f.env.ARTWORK.head,reads=[],heads=[];
 const before=f.env.sql.prepare('SELECT * FROM locker_refresh').get();
 f.env.sql.exec('PRAGMA query_only=ON');
 f.env.DB={prepare(sql){reads.push(sql);assert.equal(sql,'SELECT updated_at FROM locker_refresh WHERE id=1');return original.prepare(sql)}};
 f.env.ARTWORK={head:async objectKey=>{heads.push(objectKey);return head(objectKey)},get:()=>assert.fail('No object body'),list:()=>assert.fail('No listing'),put:()=>assert.fail('No write'),delete:()=>assert.fail('No deletion')};
 assert.deepEqual(await inspectLockerSnapshot(f.env),{state:'healthy',reason:'available'});
 assert.equal(reads.length,1);assert.deepEqual(heads,[key]);
 assert.deepEqual(f.env.sql.prepare('SELECT * FROM locker_refresh').get(),before);
 const plan=f.env.sql.prepare('EXPLAIN QUERY PLAN SELECT updated_at FROM locker_refresh WHERE id=1').all();
 assert.ok(plan.some(row=>/SEARCH locker_refresh USING INTEGER PRIMARY KEY/.test(row.detail)));
});

for(const [name,object] of [['empty',{size:0}],['oversized',{size:3000001}],['malformed',{size:'PRIVATE_SENTINEL'}],['absent result',undefined]])test(name+' HEAD metadata remains unknown instead of healthy or falsely missing',async t=>{
 const f=fixture(t);await f.seed(now-60000);f.env.ARTWORK.head=async()=>object;
 assert.deepEqual(await inspectLockerSnapshot(f.env),{state:'unknown',reason:'missing_summary'});
});

for(const failed of ['D1','R2'])test(failed+' probe failure reports only fixed unknown diagnostic in actual scheduler',async t=>{
 const f=fixture(t);await f.seed(now-60000);
 const error=new Error('D1_ERROR PRIVATE_SENTINEL customer@example.invalid https://private.invalid/?secret=private');
 error.cause={headers:{authorization:'PRIVATE_SENTINEL'},body:'PRIVATE_SENTINEL'};
 if(failed==='D1'){const prepare=f.env.DB.prepare;f.env.DB.prepare=sql=>sql==='SELECT updated_at FROM locker_refresh WHERE id=1'?{first:async()=>{throw error}}:prepare(sql);}
 else f.env.ARTWORK.head=async()=>{throw error};
 await security.scheduled(fiveMinute,f.env);
 assert.deepEqual(f.warnings,[signal('unknown','missing_summary')]);
 assert.ok(JSON.stringify(f.warnings).length<200);
});

test('D1 deadline stops before a late HEAD and never rejects after returning unknown',async t=>{
 const f=fixture(t);await f.seed(now-60000);t.mock.timers.enable({apis:['setTimeout']});
 let resolveRead,heads=0;
 f.env.DB={prepare:()=>({first:()=>new Promise(resolve=>{resolveRead=resolve})})};
 f.env.ARTWORK.head=async()=>{heads++;return {size:1}};
 const pending=inspectLockerSnapshot(f.env);t.mock.timers.tick(2000);
 assert.deepEqual(await pending,{state:'unknown',reason:'missing_summary'});
 resolveRead({updated_at:now-60000});await new Promise(resolve=>setImmediate(resolve));
 assert.equal(heads,0);
});

test('actual five-minute runtime returns one unknown at deadline and consumes late HEAD rejection',async t=>{
 const f=fixture(t);await f.seed(now-60000);t.mock.timers.enable({apis:['setTimeout']});
 let rejectHead;
 f.env.ARTWORK.head=()=>new Promise((_resolve,reject)=>{rejectHead=reject});
 const pending=security.scheduled(fiveMinute,f.env);
 await new Promise(resolve=>setImmediate(resolve));assert.equal(typeof rejectHead,'function');
 t.mock.timers.tick(2000);await pending;
 assert.deepEqual(f.warnings,[signal('unknown','missing_summary')]);
 rejectHead(Error('PRIVATE_SENTINEL'));await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(f.warnings,[signal('unknown','missing_summary')]);
});

test('missing bindings are unknown without attempting partial reads',async t=>{
 for(const env of [{},{DB:{prepare:()=>assert.fail('No R2 binding')}},{ARTWORK:{head:()=>assert.fail('No DB binding')}}])assert.deepEqual(await inspectLockerSnapshot(env),{state:'unknown',reason:'missing_summary'});
});
