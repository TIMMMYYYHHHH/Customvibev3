import test from 'node:test';
import assert from 'node:assert/strict';
import {mapLinks,searchLockers,LOCKER_FINDER_URL} from '../src/locker-map.mjs';
test('manual preference cannot become a false map pin or external URL',()=>{
 for(const location of [undefined,{name:'A real locker',area:'Durban'},{lat:'-29',lon:'31'},{lat:Infinity,lon:31},{lat:0,lon:0},{lat:-29,lon:181},{lat:-29,lon:31,embed:'https://bad.example/'}]){
  const links=mapLinks(location);assert.equal(new URL(links.embed).origin,'https://www.openstreetmap.org');
  assert.equal(links.hasPin,typeof location?.lat==='number'&&location.lat===-29&&location.lon===31);
  assert.equal(new URL(links.embed).searchParams.has('marker'),links.hasPin);
 }
 assert.equal(LOCKER_FINDER_URL,'https://locations.thecourierguy.co.za/');
});
test('valid location yields the same point in embedded and full maps',()=>{
 const links=mapLinks({lat:-29.8,lon:31.04});assert.equal(links.hasPin,true);
 assert.equal(new URL(links.embed).searchParams.get('marker'),'-29.8,31.04');
 assert.equal(new URL(links.full).searchParams.get('mlat'),'-29.8');
 assert.equal(new URL(links.full).searchParams.get('mlon'),'31.04');
});
test('locker search matches all words across name, area and code without changing source records',()=>{
 const list=[{id:'SAMPLE-01',name:'Garden Square',area:'Durban North'},{id:'SAMPLE-02',name:'City Corner',area:'Durban Central'}];
 assert.deepEqual(searchLockers(list,'  NORTH garden '),[list[0]]);assert.deepEqual(searchLockers(list,'sample-02'),[list[1]]);
 assert.deepEqual(searchLockers(list,'Durban'),list);assert.deepEqual(searchLockers(list,''),list);assert.deepEqual(searchLockers(list,'missing'),[]);assert.equal(list.length,2);
});
