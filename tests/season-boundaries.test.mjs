// A wrong timezone, exclusive start, inclusive end or Feb29 rollover must fail these actual-service checks.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createConcurrencyHarness,actorRequest} from './fixtures/concurrent-state-harness.mjs';
const publicOrigin='https://storefront.local',id='synthetic-clock-christmas';
const ranges={year:['2027-12-31T23:59','2028-01-01T00:01'],leap:['2028-02-29T12:30','2028-03-01T00:00']};
const cases=[
 ['year','2027-12-31T21:58:00Z',null],
 ['year','2027-12-31T21:59:00Z',id+':2027'],
 ['year','2027-12-31T22:00:00Z',id+':2027'],
 ['year','2027-12-31T22:01:00Z',null],
 ['leap','2028-02-29T10:29:00Z',null],
 ['leap','2028-02-29T10:30:00Z',id+':2028'],
 ['leap','2028-02-29T22:00:00Z',null],
 ['leap','2029-02-28T10:30:00Z',null],
 ['leap','2032-02-29T10:30:00Z',id+':2032'],
];
const rows=h=>JSON.stringify({rows:['content','seasonal_settings'].map(table=>[table,h.sql.prepare('SELECT * FROM '+table+' ORDER BY id').all()]),changes:h.sql.prepare('SELECT total_changes() AS n').get().n});
for(const [range,utc,key]of cases)test(`real Catalogue Worker ${range} at ${utc} returns ${key||'original'} without writing`,async t=>{
 t.mock.method(Date,'now',()=>Date.parse(utc));
 const h=await createConcurrencyHarness({storefront:true});try{
  assert.equal(typeof h.dispatchStorefront,'function','Opt-in bridge must expose the real Catalogue Worker');
  const state=await(await actorRequest(h,'A','/api/seasons')).json(),c=state.campaigns.find(c=>c.occasion==='christmas');
  Object.assign(c,{id,start:ranges[range][0],end:ranges[range][1],repeat:'annual',enabled:true,published:true,decorations:false,motion:false});state.themeProgress.christmas='ready';state.mode='schedule';
  const saved=await actorRequest(h,'A','/api/seasons',{method:'PUT',body:{state,action:'Synthetic boundary setup'}});assert.equal(saved.status,200);
  const before=rows(h),updates=h.sqlUpdates.length,writes=h.operations.filter(o=>o.method!=='GET').length;
  const response=await h.dispatchStorefront(new Request(publicOrigin+'/season.json'));assert.equal(response.status,200);assert.equal(response.headers.get('Cache-Control'),'no-store');
  const body=await response.json();assert.equal(body.campaign?.id??null,key?id:null);assert.equal(body.campaign?.key??null,key);assert.equal(body.definition?.id??null,key?'christmas':null);
  assert.equal(rows(h),before);assert.equal(h.sqlUpdates.length,updates);assert.equal(h.operations.filter(o=>o.method!=='GET').length,writes);assert.deepEqual(h.forbidden,[]);
  t.diagnostic(JSON.stringify({utc,key:body.campaign?.key??null,revision:JSON.parse(h.sql.prepare('SELECT body FROM seasonal_settings').get().body).revision,unchanged:true}));
 }finally{h.close()}
});
for(const variant of ['off','not-ready'])test(`saved ${variant} remains authoritative at an eligible selected instant`,async t=>{
 t.mock.method(Date,'now',()=>Date.parse('2028-02-29T10:30:00Z'));
 const h=await createConcurrencyHarness({storefront:true});try{
  assert.equal(typeof h.dispatchStorefront,'function');
  const state=await(await actorRequest(h,'A','/api/seasons')).json(),c=state.campaigns.find(c=>c.occasion==='christmas');
  Object.assign(c,{id,start:ranges.leap[0],end:ranges.leap[1],repeat:'annual',enabled:true,published:true});state.themeProgress.christmas=variant==='not-ready'?'review':'ready';state.mode=variant==='off'?'off':'schedule';
  assert.equal((await actorRequest(h,'A','/api/seasons',{method:'PUT',body:{state,action:'Synthetic authority setup'}})).status,200);
  const before=rows(h),updates=h.sqlUpdates.length;
  const body=await(await h.dispatchStorefront(new Request(publicOrigin+'/season.json'))).json();assert.equal(body.campaign,null);assert.equal(rows(h),before);assert.equal(h.sqlUpdates.length,updates);assert.deepEqual(h.forbidden,[]);
 }finally{h.close()}
});
test('storefront bridge is opt-in and rejects writes, unknown APIs and external origins',async()=>{
 const disabled=await createConcurrencyHarness(),enabled=await createConcurrencyHarness({storefront:true});try{
  assert.equal(typeof disabled.dispatchStorefront,'function');
  assert.equal((await disabled.dispatchStorefront(new Request(publicOrigin+'/season.json'))).status,403);
  for(const request of [new Request(publicOrigin+'/season.json',{method:'POST'}),new Request(publicOrigin+'/api/orders'),new Request('https://external.invalid/season.json')])assert.equal((await enabled.dispatchStorefront(request)).status,403);
  assert.equal(enabled.forbidden.length,3);assert.equal(disabled.forbidden.length,1);
 }finally{disabled.close();enabled.close()}
});
