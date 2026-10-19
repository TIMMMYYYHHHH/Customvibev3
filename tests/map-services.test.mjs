import test from 'node:test';import assert from 'node:assert/strict';
import {reserveMapUsage,refreshLockerSnapshot,lockerSnapshotService} from '../security/maps.mjs';
import {artworkEnv} from './helpers/artwork.mjs';
const raw=[{code:'CG1',status:'online',type:{id:2},name:'Example',address:'Example Road',place:{town:'Durban'},latitude:-29.8,longitude:31.04}];
const env=()=>({...artworkEnv(),TCG_LOCKER_API_KEY:'fictional-key-for-tests-only',LOCKER_REFRESH_ENABLED:'true'});
test('global map budget admits only four provider requests each second and 2500 per day across sessions',async()=>{
 const e=env(),now=Date.now();const result=await Promise.all(Array.from({length:8},()=>reserveMapUsage(e,'a'.repeat(64),now)));assert.equal(result.filter(Boolean).length,1);
 for(const delta of [250,500,750])assert.equal(await reserveMapUsage(e,'a'.repeat(64),now+delta),true);
 assert.equal(await reserveMapUsage(e,'a'.repeat(64),now+999),false);
 const id='map:day:'+new Date(now).toISOString().slice(0,10);e.sql.prepare('UPDATE map_usage SET amount=2500 WHERE id=?').run(id);assert.equal(await reserveMapUsage(e,'b'.repeat(64),now+2000),false);
});
test('shared refresh has one atomic owner and at most one courier call per six hours even after failures',async()=>{
 const e=env();let count=0;const network=async()=>{count++;return Response.json(raw)};const now=Date.now();
 await Promise.all(Array.from({length:6},()=>refreshLockerSnapshot(e,{network,now})));assert.equal(count,1);
 assert.equal((await lockerSnapshotService(e,now)).status,200);assert.equal((await (await lockerSnapshotService(e,now)).json()).locations[0].id,'CG1');
 await refreshLockerSnapshot(e,{now:now+3600000,network});assert.equal(count,1);
 await refreshLockerSnapshot(e,{now:now+6*3600000+1,network:async()=>{count++;throw Error('secret detail')}});assert.equal(count,2);
 assert.equal((await lockerSnapshotService(e,now+6*3600000+2)).status,503);
 await refreshLockerSnapshot(e,{now:now+6*3600000+3,network});assert.equal(count,2);
});
