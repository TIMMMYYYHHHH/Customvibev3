import test from 'node:test';import assert from 'node:assert/strict';
import {nearbyLockers,clusterLockers} from '../src/locker-map.mjs';
const list=[{id:'A',lat:-29.8,lon:31.04},{id:'B',lat:-29.81,lon:31.04},{id:'C',lat:-26.2,lon:28.04},{id:'bad',lat:NaN,lon:20}];
test('nearby lockers are ordered by actual distance and exclude distant/invalid points without mutating data',()=>{
 const found=nearbyLockers(list,{lat:-29.8,lon:31.04},25);assert.deepEqual(found.map(x=>x.id),['A','B']);assert.equal(found[0].distanceKm,0);assert.ok(found[1].distanceKm>1&&found[1].distanceKm<1.2);assert.equal(list[0].distanceKm,undefined);assert.deepEqual(nearbyLockers(list,{lat:NaN,lon:20}),[]);
});
test('zoomed-out map groups nearby points while preserving every selectable ID',()=>{
 const clusters=clusterLockers(list.slice(0,3),6);assert.equal(clusters.reduce((n,c)=>n+c.items.length,0),3);assert.ok(clusters.some(c=>c.items.length===2));assert.equal(clusterLockers(list.slice(0,3),16).length,3);
});
