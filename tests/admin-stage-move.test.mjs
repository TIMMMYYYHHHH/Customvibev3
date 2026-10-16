import test from 'node:test';
import assert from 'node:assert/strict';
import {createStageMover} from '../admin/stage-move.mjs';
const order={id:'test-order',status:'new',version:3};
test('stage move uses the displayed version, blocks rapid competing moves and never sends mail',async()=>{
 let release;const calls=[],states=[],saved=[];
 const move=createStageMover(async(path,body)=>{calls.push([path,body]);if(body)await new Promise(resolve=>release=resolve);return body?{ok:true,version:4}:{...order,status:'in_progress',version:4,history:[{version:4,status:'in_progress'}]};},s=>states.push(s),o=>saved.push(o));
 const first=move.move(order,'in_progress');await move.move(order,'shipped');
 assert.equal(calls.length,1);assert.deepEqual(calls[0],['/api/orders/test-order/status',{status:'in_progress',version:3}]);assert.equal(states.at(-1).state,'saving');assert.equal(saved.length,0);
 release();await first;assert.equal(saved[0].status,'in_progress');assert.equal(saved[0].history.length,1);assert.equal(states.at(-1).state,'saved');assert.equal(calls.length,2);assert.deepEqual(calls[1],['/api/orders/test-order',undefined]);
});
test('failed save retains displayed order and retry reuses its original version',async()=>{
 let fail=true,server={...order};const saved=[],writes=[];
 const move=createStageMover(async(path,body)=>{if(body){writes.push(body);if(fail)throw Error('Offline');server={...server,status:body.status,version:4};return {ok:true,version:4}}return server;},()=>{},o=>saved.push(o));
 await move.move(order,'ready_to_ship');assert.equal(saved.length,0);
 await move.move(order,'shipped');assert.equal(writes.length,1);
 fail=false;await move.retry();
 assert.deepEqual(writes,[{status:'ready_to_ship',version:3},{status:'ready_to_ship',version:3}]);assert.equal(saved.at(-1).version,4);
});
test('lost response is reconciled on retry without a second mutation',async()=>{
 let writes=0;const saved=[],states=[];
 const move=createStageMover(async(path,body)=>{if(body){writes++;throw Error('Connection lost')}return {...order,status:'shipped',version:4,history:[{version:4,status:'shipped'}]};},s=>states.push(s),o=>saved.push(o));
 await move.move(order,'shipped');assert.equal(states.at(-1).state,'error');await move.retry();assert.equal(writes,1);assert.equal(saved[0].version,4);assert.equal(states.at(-1).state,'saved');
});
test('stale version requires reload and never overwrites another change',async()=>{
 let writes=0;const states=[],saved=[];
 const move=createStageMover(async(path,body)=>{if(body){writes++;throw Object.assign(Error('Order changed.'),{status:409})}return {...order,status:'ready_to_ship',version:5};},s=>states.push(s),o=>saved.push(o));
 await move.move(order,'shipped');assert.equal(states.at(-1).state,'conflict');await move.retry();assert.equal(writes,1);await move.reload();assert.equal(saved.at(-1).version,5);assert.equal(states.at(-1).state,'reloaded');
});
test('retry refuses a newer version even when its stage matches the failed intent',async()=>{
 let writes=0;const states=[];const move=createStageMover(async(path,body)=>{if(body){writes++;throw Error('Offline')}return {...order,status:'shipped',version:6};},s=>states.push(s),()=>{});
 await move.move(order,'shipped');await move.retry();assert.equal(writes,1);assert.equal(states.at(-1).state,'conflict');
});
test('a later change observed after save is shown as the latest state, not attributed to this move',async()=>{
 const states=[],saved=[];const move=createStageMover(async(path,body)=>body?{ok:true,version:4}:{...order,status:'shipped',version:5},s=>states.push(s),o=>saved.push(o));
 await move.move(order,'in_progress');assert.equal(saved[0].status,'shipped');assert.equal(states.at(-1).state,'reloaded');
});
