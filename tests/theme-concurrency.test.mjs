import test from 'node:test';
import assert from 'node:assert/strict';
import {createConcurrencyHarness,actorRequest,origin} from './fixtures/concurrent-state-harness.mjs';

for(const kind of ['catalogue','themes'])for(const actors of [['A','B'],['B','A']])test(`${kind} ${actors.join('/')}: two independently authenticated writers reach SQL CAS with one winner`,async t=>{
 const h=await createConcurrencyHarness();try{
  const readPath=kind==='themes'?'/api/seasons':'/content.json',writePath=kind==='themes'?'/api/seasons':'/api/content';
  const snapshots=await Promise.all(actors.map(async actor=>{const r=await actorRequest(h,actor,readPath);assert.equal(r.status,200);return r.json()}));assert.equal(snapshots[0].revision,snapshots[1].revision);
  assert.notEqual(h.actors.A.jti,h.actors.B.jti);assert.notEqual(h.actors.A.csrf,h.actors.B.csrf);
  const requests=snapshots.map((snapshot,i)=>{if(kind==='themes')snapshot.occasionSettings.christmas={name:`Actor ${actors[i]} Christmas`};else snapshot.products.find(p=>p.id==='alphabet').name=`Actor ${actors[i]} alphabet`;return kind==='themes'?{state:snapshot,action:`Synthetic actor ${actors[i]} save`}:snapshot});
  h.sqlUpdates.length=0;const barrier=kind==='themes'?h.armSeasonReadBarrier():null;
  const results=await Promise.all(actors.map((actor,i)=>actorRequest(h,actor,writePath,{method:'PUT',body:requests[i]})));assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
  assert.deepEqual(h.sqlUpdates.filter(x=>x.table===(kind==='themes'?'seasonal_settings':'content')).map(x=>x.changes).sort(),[0,1],'Both writers must reach actual conditional SQL UPDATE');
  t.diagnostic(JSON.stringify({kind,order:actors,updates:h.sqlUpdates,statuses:results.map(r=>r.status)}));
  if(barrier)assert.deepEqual(barrier,{reads:2,released:true,timedOut:false});
  const winner=results.findIndex(r=>r.status===200),loser=1-winner,conflict=await results[loser].json();assert.match(conflict.error,/another (admin|session)/i);
  const saved=await(await actorRequest(h,'B',readPath)).json();assert.equal(saved.revision,snapshots[0].revision+1);assert.equal(kind==='themes'?saved.occasionSettings.christmas.name:saved.products.find(p=>p.id==='alphabet').name,kind==='themes'?requests[winner].state.occasionSettings.christmas.name:requests[winner].products.find(p=>p.id==='alphabet').name);
  assert.equal((kind==='themes'?requests[loser].state:requests[loser]).revision,snapshots[loser].revision,'Conflict must not mutate the losing client snapshot');
  if(kind==='themes'){assert.equal(saved.history.length,snapshots[0].history.length+1);assert.equal(saved.mode,'off');assert.ok(saved.campaigns.every(c=>!c.enabled&&!c.published));assert.deepEqual(saved.drafts,snapshots[0].drafts);assert.equal(h.sql.prepare('SELECT revision FROM seasonal_settings').get().revision,saved.revision);}else assert.equal(h.sql.prepare('SELECT revision FROM content').get().revision,saved.revision);
  assert.deepEqual(h.forbidden,[]);
 }finally{h.close()}
});

test('actor CSRF isolation and stale writes cannot change the other resource or silently replay',async()=>{
 const h=await createConcurrencyHarness();try{
  const content=await(await actorRequest(h,'A','/content.json')).json(),themes=await(await actorRequest(h,'B','/api/seasons')).json();content.products.find(p=>p.id==='alphabet').name='Synthetic winner';
  assert.equal((await actorRequest(h,'A','/api/content',{method:'PUT',body:content,csrf:h.actors.B.csrf})).status,403);
  assert.equal((await h.dispatch(new Request(origin+'/api/seasons'))).status,401);
  assert.equal((await actorRequest(h,'A','/api/content',{method:'PUT',body:content})).status,200);
  const writes=h.operations.filter(o=>o.method==='PUT').length;
  assert.equal((await actorRequest(h,'B','/api/content',{method:'PUT',body:content})).status,409);
  assert.deepEqual(await(await actorRequest(h,'A','/api/seasons')).json(),themes);await actorRequest(h,'B','/content.json');assert.equal(h.operations.filter(o=>o.method==='PUT').length,writes+1,'Reads must not replay a rejected save');assert.deepEqual(h.forbidden,[]);
 }finally{h.close()}
});


test('season read alignment is one-shot and fails within its bound when the second reader is absent',async t=>{
 const h=await createConcurrencyHarness();try{
  const barrier=h.armSeasonReadBarrier({timeoutMs:50});
  t.mock.method(console,'error',()=>{});
  assert.equal((await actorRequest(h,'A','/api/seasons')).status,503);
  assert.deepEqual(barrier,{reads:1,released:false,timedOut:true});assert.equal(h.sqlUpdates.filter(x=>x.table==='seasonal_settings').length,1,'Only initial seeding wrote SQL');
  assert.equal((await actorRequest(h,'B','/api/seasons')).status,200,'Timed-out barrier must not affect later reads');
 }finally{h.close()}
});
