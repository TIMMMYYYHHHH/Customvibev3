import test from 'node:test';import assert from 'node:assert/strict';
import {orderGroups,readOrderView} from '../admin/order-groups.mjs';
test('grouping sorts completions with deterministic ties and only hides older rows outside search',()=>{
 const rows=[{id:'c',status:'fulfilled',fulfilledAt:3,reference:'CV-000003'},{id:'a',status:'fulfilled',fulfilledAt:1,reference:'CV-000001'},{id:'b',status:'fulfilled',fulfilledAt:3,reference:'CV-000002'},{id:'d',status:'fulfilled',fulfilledAt:2,reference:'CV-000004'},{id:'e',status:'new'}];
 const g=orderGroups(rows);assert.deepEqual(g.fulfilled.map(x=>x.id),['c','b','d','a']);assert.equal(g.new.length,1);assert.equal(g.ready_to_ship.length,0);
 assert.equal(readOrderView({getItem:()=> 'table'}),'table');assert.equal(readOrderView({getItem:()=> 'bad'}),'board');assert.equal(readOrderView({getItem:()=>{throw Error('blocked')}}),'board');
});
test('active pagination preserves expanded fulfilled cursor and replacement refresh resets disclosure',async()=>{
 const {mergeOrderPage}=await import('../admin/order-groups.mjs');
 const previous={orders:[{id:'a'},{id:'f1'},{id:'f2'}],next:10,fulfilledCount:60,fulfilledNext:'100:20',older:true};
 const page={orders:[{id:'b'},{id:'f1'}],next:5,fulfilledCount:60,fulfilledNext:'200:40'};
 const appended=mergeOrderPage(previous,page,true);assert.deepEqual(appended.orders.map(o=>o.id),['a','f1','f2','b']);assert.equal(appended.fulfilledNext,'100:20');assert.equal(appended.older,true);
 const replaced=mergeOrderPage(previous,page,false);assert.equal(replaced.fulfilledNext,'200:40');assert.equal(replaced.older,false);assert.deepEqual(replaced.orders,page.orders);
});
