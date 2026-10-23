import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer,request as httpRequest} from 'node:http';
import {stockService} from '../security/stock.mjs';
import {artworkEnv} from './helpers/artwork.mjs';
const entry=(extra={})=>({id:crypto.randomUUID(),name:'Sheets',category:'materials',unit:'sheet',packCents:1000,packQuantity:10,basis:'per_sheet',usageMilli:1000,magnetsPerSheet:9,active:true,...extra});
const call=(e,p,b={})=>stockService(new Request('https://internal/stock/'+p,{method:'POST',body:JSON.stringify(b)}),e);
async function ok(e,p,b){const r=await call(e,p,b);assert.equal(r.status,200,await r.clone().text());return r.json()}
async function fixture(fn){const e=artworkEnv(),f=globalThis.fetch;globalThis.fetch=async()=>{throw Error('No network')};try{await fn(e)}finally{globalThis.fetch=f;e.sql.close()}}
async function setup(e,count=1){const entries=Array.from({length:count},()=>entry());e.sql.prepare('INSERT INTO finance_settings VALUES(1,1,?,1)').run(JSON.stringify(entries));for(const v of entries){await ok(e,'items',{operationId:crypto.randomUUID(),id:v.id,version:0,unit:v.unit,wholeUnits:true,lowMilli:1000});await ok(e,'stocktake',{operationId:crypto.randomUUID(),itemId:v.id,version:1,countedMilli:10000,reason:'Opening count'});}return entries}
function order(e,entries,expires=Math.floor(Date.now()/1000)+1000){const id=crypto.randomUUID();e.sql.prepare('INSERT INTO orders(id,fingerprint,snapshot,created,expires,artwork_expires) VALUES(?,?,?,?,?,?)').run(id,'a'.repeat(64),JSON.stringify({contact:{name:'Secret',email:'private@example.invalid'}}),1,expires,expires);e.sql.prepare('INSERT INTO order_costs VALUES(?,1,0,?,?,1)').run(id,'estimated',JSON.stringify({lines:entries.map(x=>({...x,usageMilli:2000,excluded:false}))}));return id}
const useBody=(view)=>({operationId:crypto.randomUUID(),orderVersion:view.orderVersion,costVersion:view.costVersion,usageVersion:view.usageVersion,lines:view.lines.map(x=>({itemId:x.id,version:x.version,stocktakeGeneration:x.stocktakeGeneration,quantityMilli:x.suggestedMilli??1000}))});
const state=e=>({items:e.sql.prepare('SELECT * FROM stock_items').all(),journal:e.sql.prepare('SELECT * FROM stock_movements').all(),links:e.sql.prepare('SELECT * FROM order_stock_use').all()});
test('lost committed success reconciles the original ID without a second deduction, mismatch conflicts and journal has no order/customer identity',()=>fixture(async e=>{
 const entries=await setup(e),id=order(e,entries),b=useBody(await ok(e,'order-read',{id}));
 // A real loopback HTTP connection is destroyed after commit, before any response bytes.
 const server=createServer(async(req,res)=>{try{const chunks=[];for await(const chunk of req)chunks.push(chunk);const response=await call(e,req.url.slice(1),JSON.parse(Buffer.concat(chunks).toString()));if(req.headers['x-drop-response']==='yes'){assert.equal(response.status,200);req.socket.destroy();return}res.writeHead(response.status,{'content-type':'application/json'});res.end(await response.text())}catch(error){res.destroy(error)}});
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
 const transport=(path,body,drop=false)=>new Promise((resolve,reject)=>{const req=httpRequest({host:'127.0.0.1',port:server.address().port,path:'/'+path,method:'POST',headers:{'Content-Type':'application/json','Connection':'close',...(drop?{'X-Drop-Response':'yes'}:{})}},res=>{let text='';res.on('data',c=>{text+=c});res.on('end',()=>resolve({status:res.statusCode,body:JSON.parse(text)}))});req.on('error',reject);req.end(JSON.stringify(body))});
 try{
 await assert.rejects(transport('order-use',{id,...b},true),error=>error.code==='ECONNRESET');
 const reconciled=await transport('order-read',{id});assert.equal(reconciled.body.usage.operationId,b.operationId);assert.equal(reconciled.body.lines[0].balanceMilli,8000);
 const retry=await transport('order-use',{id,...b});assert.equal(retry.status,200);assert.equal(retry.body.operationId,b.operationId);assert.equal(retry.body.items[0].balanceMilli,8000);assert.equal(state(e).journal.length,3);
 assert.equal((await call(e,'order-use',{id,...b,lines:b.lines.map(x=>({...x,quantityMilli:1000}))})).status,409);
 }finally{await new Promise(resolve=>server.close(resolve))}
 for(const secret of [id,'Secret','private@example.invalid'])assert.ok(!JSON.stringify(state(e).journal).includes(secret));
}));
test('multi-material shortage and injected transaction failure leave all balances, links and journal unchanged',()=>fixture(async e=>{
 const entries=await setup(e,2),id=order(e,entries),b=useBody(await ok(e,'order-read',{id})),before=state(e);b.lines[1].quantityMilli=11000;
 const r=await call(e,'order-use',{id,...b});assert.equal((await r.json()).code,'SHORTAGE');assert.deepEqual(state(e),before);
 b.lines[1].quantityMilli=2000;e.sql.exec("CREATE TRIGGER fail_link BEFORE INSERT ON order_stock_use BEGIN SELECT RAISE(ABORT,'injected'); END");assert.equal((await call(e,'order-use',{id,...b})).status,503);assert.deepEqual(state(e),before);
}));
test('stocktake increments even at unchanged balance and blocks whole exact reversal, while clean reversal is once-only and reconfirmation works',()=>fixture(async e=>{
 const entries=await setup(e,2),id=order(e,entries);await ok(e,'order-use',{id,...useBody(await ok(e,'order-read',{id}))});
 let view=await ok(e,'order-read',{id});const reverse={id,operationId:crypto.randomUUID(),orderVersion:0,usageVersion:view.usageVersion,lines:view.usage.lines.map(({itemId,version,stocktakeGeneration})=>({itemId,version,stocktakeGeneration})),reason:'Correction'};
 await ok(e,'order-reverse',reverse);assert.equal((await ok(e,'order-reverse',reverse)).usage.status,'reversed');assert.equal(state(e).items[0].balance_milli,10000);
 await ok(e,'order-use',{id,...useBody(await ok(e,'order-read',{id}))});view=await ok(e,'order-read',{id});
 await ok(e,'stocktake',{operationId:crypto.randomUUID(),itemId:entries[0].id,version:view.lines[0].version,countedMilli:8000,reason:'Physical count'});
 const before=state(e);const response=await call(e,'order-reverse',{...reverse,operationId:crypto.randomUUID(),usageVersion:view.usageVersion,lines:(await ok(e,'order-read',{id})).usage.lines.map(({itemId,version,stocktakeGeneration})=>({itemId,version,stocktakeGeneration}))});assert.equal((await response.json()).code,'STOCKTAKE_AFTER_USE');assert.deepEqual(state(e),before);assert.equal((await ok(e,'order-read',{id})).usage.canReverse,false);
}));
test('concurrent uses and receipts serialize versions with exactly one success',()=>fixture(async e=>{
 const entries=await setup(e),a=order(e,entries),b=order(e,entries),av=useBody(await ok(e,'order-read',{id:a})),bv=useBody(await ok(e,'order-read',{id:b}));
 assert.deepEqual((await Promise.all([call(e,'order-use',{id:a,...av}),call(e,'order-use',{id:b,...bv})])).map(x=>x.status).sort(),[200,409]);
 const item=(await ok(e,'items-read')).items[0],receipt={itemId:item.id,version:item.version,quantityMilli:1000,packCents:null,packQuantity:1,updateDefault:false,settingsVersion:null};assert.deepEqual((await Promise.all([call(e,'receipts',{operationId:crypto.randomUUID(),...receipt}),call(e,'receipts',{operationId:crypto.randomUUID(),...receipt})])).map(x=>x.status).sort(),[200,409]);
}));
test('finance unit edits require explicit quantities without conversion and receipts guard price defaults and atomic audit',()=>fixture(async e=>{
 const entries=await setup(e),id=order(e,entries);e.sql.prepare('UPDATE order_costs SET payload=? WHERE order_id=?').run(JSON.stringify({lines:entries.map(x=>({...x,unit:'pack',usageMilli:1500,excluded:false}))}),id);
 const preview=await ok(e,'order-read',{id});assert.equal(preview.lines[0].suggestedMilli,null);assert.equal(preview.lines[0].requiresQuantity,true);
 const item=(await ok(e,'items-read')).items[0],b={operationId:crypto.randomUUID(),itemId:item.id,version:item.version,quantityMilli:1000,packCents:2000,packQuantity:20,updateDefault:true,settingsVersion:1};
 e.sql.prepare('UPDATE finance_settings SET version=2').run();assert.equal((await call(e,'receipts',b)).status,409);b.settingsVersion=2;
 const before=state(e);e.sql.exec("CREATE TRIGGER fail_audit BEFORE INSERT ON finance_changes BEGIN SELECT RAISE(ABORT,'audit'); END");assert.equal((await call(e,'receipts',b)).status,503);assert.deepEqual(state(e),before);assert.equal(e.sql.prepare('SELECT version FROM finance_settings').get().version,2);e.sql.exec('DROP TRIGGER fail_audit');await ok(e,'receipts',b);assert.equal(JSON.parse(e.sql.prepare('SELECT payload FROM finance_settings').get().payload)[0].packCents,2000);assert.equal(JSON.parse(e.sql.prepare('SELECT payload FROM order_costs').get().payload).lines[0].packCents,1000);
}));
test('unchanged natural expiry inside execution gate rejects every write and expired retries; deletion removes link without restoring stock',()=>fixture(async e=>{
 const real=Date.now;let clock=1792670400;Date.now=()=>clock*1000;try{const entries=await setup(e),id=order(e,entries,clock+1),b=useBody(await ok(e,'order-read',{id})),before=state(e),batch=e.DB.batch.bind(e.DB);e.DB.batch=ss=>batch(ss.map((s,i)=>i? s:{async all(){clock++;return s.all()}}));
 assert.equal((await call(e,'order-use',{id,...b})).status,410);assert.deepEqual(state(e),before);e.DB.batch=batch;clock--;await ok(e,'order-use',{id,...b});clock++;assert.equal((await call(e,'order-use',{id,...b})).status,410);assert.equal((await call(e,'order-read',{id})).status,410);const balance=state(e).items[0].balance_milli;e.sql.prepare('DELETE FROM orders WHERE id=?').run(id);assert.equal(state(e).links.length,0);assert.equal(state(e).items[0].balance_milli,balance);assert.equal(state(e).journal.length,3);
 }finally{Date.now=real}
}));
test('input bounds, fixed whole sheets, overflow and original-use-only reversal',()=>fixture(async e=>{
 const entries=await setup(e),item=(await ok(e,'items-read')).items[0];for(const quantityMilli of [-1,1001,Number.MAX_SAFE_INTEGER]){const r=await call(e,'receipts',{operationId:crypto.randomUUID(),itemId:item.id,version:item.version,quantityMilli,packCents:null,packQuantity:1,updateDefault:false,settingsVersion:null});assert.equal(r.status,400)}
 assert.equal((await call(e,'items',{operationId:crypto.randomUUID(),id:item.id,version:item.version,unit:'pack',wholeUnits:true,lowMilli:0})).status,409);
 const id=order(e,entries),b=useBody(await ok(e,'order-read',{id}));await ok(e,'order-use',{id,...b});const view=await ok(e,'order-read',{id});assert.equal((await call(e,'order-reverse',{id,operationId:crypto.randomUUID(),orderVersion:0,usageVersion:view.usageVersion,lines:[],reason:'Wrong set'})).status,409);
}));
test('history pagination is stable, revision pinned including item events, immutable and read-only',()=>fixture(async e=>{
 await setup(e);const item=(await ok(e,'items-read')).items[0];for(let n=0;n<50;n++)await ok(e,'items',{operationId:crypto.randomUUID(),id:item.id,version:item.version+n,unit:item.unit,wholeUnits:true,lowMilli:n*1000});
 const page=await ok(e,'history');assert.equal(page.rows.length,50);assert.ok(page.next);const next=await ok(e,'history',{before:page.next,revision:page.revision});assert.equal(next.rows.length,2);assert.equal(next.next,null);assert.equal(new Set([...page.rows,...next.rows].map(x=>x.seq)).size,52);
 assert.throws(()=>e.sql.exec('DELETE FROM stock_movements'));const current=(await ok(e,'items-read')).items[0];await ok(e,'items',{operationId:crypto.randomUUID(),id:current.id,version:current.version,unit:current.unit,wholeUnits:true,lowMilli:0});assert.equal((await call(e,'history',{revision:page.revision})).status,409);
}));
test('first receipt preserves unknown starting balance until explicit zero stocktake and subsequent purchase',()=>fixture(async e=>{
 const v=entry();e.sql.prepare('INSERT INTO finance_settings VALUES(1,1,?,1)').run(JSON.stringify([v]));let result=await ok(e,'items',{operationId:crypto.randomUUID(),id:v.id,version:0,unit:'sheet',wholeUnits:true,lowMilli:0});
 result=await ok(e,'receipts',{operationId:crypto.randomUUID(),itemId:v.id,version:1,quantityMilli:1000,packCents:0,packQuantity:1,updateDefault:false,settingsVersion:null});assert.equal(result.items[0].initialized,false);
 const id=order(e,[v]);assert.equal((await call(e,'order-use',{id,...useBody(await ok(e,'order-read',{id}))})).status,409);await ok(e,'stocktake',{operationId:crypto.randomUUID(),itemId:v.id,version:2,countedMilli:0,reason:'Counted empty'});result=await ok(e,'receipts',{operationId:crypto.randomUUID(),itemId:v.id,version:3,quantityMilli:3000,packCents:0,packQuantity:1,updateDefault:false,settingsVersion:null});assert.equal(result.items[0].initialized,true);await ok(e,'order-use',{id,...useBody(await ok(e,'order-read',{id}))});
}));
test('same-operation concurrent retries apply once while a changed request conflicts',()=>fixture(async e=>{
 await setup(e);const i=(await ok(e,'items-read')).items[0],b={operationId:crypto.randomUUID(),itemId:i.id,version:i.version,quantityMilli:1000,packCents:null,packQuantity:1,updateDefault:false,settingsVersion:null};
 const responses=await Promise.all([call(e,'receipts',b),call(e,'receipts',b)]);assert.deepEqual(responses.map(r=>r.status),[200,200]);assert.deepEqual(await responses[0].json(),await responses[1].json());assert.equal(state(e).items[0].balance_milli,11000);assert.equal(state(e).journal.length,3);assert.equal((await (await call(e,'receipts',{...b,quantityMilli:2000})).json()).code,'OPERATION_MISMATCH');
}));
test('execution-time settings and order-version guards leave no partial journal or stock mutation',()=>fixture(async e=>{
 const entries=await setup(e),i=(await ok(e,'items-read')).items[0],before=state(e),batch=e.DB.batch.bind(e.DB);let first=true;
 e.DB.batch=ss=>batch(ss.map((s,n)=>n? s:{async all(){if(first){first=false;e.sql.prepare('UPDATE finance_settings SET version=2').run()}return s.all()}}));
 const r=await call(e,'receipts',{operationId:crypto.randomUUID(),itemId:i.id,version:i.version,quantityMilli:1000,packCents:2000,packQuantity:1,updateDefault:true,settingsVersion:1});assert.equal(r.status,409);assert.deepEqual(state(e),before);assert.equal(e.sql.prepare('SELECT count(*) n FROM finance_changes').get().n,0);
 e.DB.batch=batch;const id=order(e,entries),b=useBody(await ok(e,'order-read',{id}));e.DB.batch=ss=>batch(ss.map((s,n)=>n?s:{async all(){e.sql.prepare('UPDATE orders SET version=version+1 WHERE id=?').run(id);return s.all()}}));assert.equal((await call(e,'order-use',{id,...b})).status,409);assert.deepEqual(state(e),before);
}));
test('history rejects mutations during reads, and expired order detail never exposes its usage',()=>fixture(async e=>{
 const real=Date.now;let clock=1792670400;Date.now=()=>clock*1000;try{
 const entries=await setup(e),id=order(e,entries,clock+1);const prepare=e.DB.prepare;e.DB.prepare=(sql,...args)=>{const s=prepare(sql,...args);if(!sql.startsWith('SELECT * FROM order_stock_use'))return s;return {...s,bind(...v){const bound=s.bind(...v);return {...bound,async first(){const r=await bound.first();clock++;return r}}}}};const r=await call(e,'order-read',{id});assert.equal(r.status,410);assert.equal((await r.json()).usage,undefined);
 e.DB.prepare=(sql,...args)=>{const s=prepare(sql,...args);if(!sql.startsWith('SELECT * FROM stock_movements WHERE'))return s;return {...s,bind(...v){const bound=s.bind(...v);return {...bound,async all(){const r=await bound.all();e.sql.prepare("INSERT INTO stock_movements(operation_id,request_digest,kind,created,reason,lines,result) VALUES(?,?,'item',1,'','[]','{}')").run(crypto.randomUUID(),'a'.repeat(64));return r}}}}};assert.equal((await call(e,'history')).status,409);
 }finally{Date.now=real}
}));
test('order suggestions use only included tracked saved costs; no costs means no suggestions and reads do not write',()=>fixture(async e=>{
 const entries=await setup(e,2),id=order(e,entries);e.sql.prepare('DELETE FROM order_costs WHERE order_id=?').run(id);const before=state(e);assert.equal((await ok(e,'order-read',{id})).lines.length,0);assert.deepEqual(state(e),before);
 e.sql.prepare('INSERT INTO order_costs VALUES(?,1,0,?,?,1)').run(id,'estimated',JSON.stringify({lines:[{...entries[0],excluded:false},{...entries[1],excluded:true},{...entry(),excluded:false}]}));const view=await ok(e,'order-read',{id});assert.equal(view.lines.length,1);assert.equal(view.lines[0].itemId,entries[0].id);assert.equal((await call(e,'order-use',{id,...useBody(view),lines:[...useBody(view).lines,...useBody(view).lines]})).status,400);assert.deepEqual(state(e),before);
}));
test('courier saved cost lines never become physical stock suggestions after a finance category edit',()=>fixture(async e=>{
 const entries=await setup(e),id=order(e,entries);e.sql.prepare('UPDATE order_costs SET payload=? WHERE order_id=?').run(JSON.stringify({lines:[{...entries[0],category:'courier',excluded:false}]}),id);assert.equal((await ok(e,'order-read',{id})).lines.length,0);
}));
