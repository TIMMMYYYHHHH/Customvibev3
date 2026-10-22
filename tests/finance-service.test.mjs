import test from 'node:test';
import assert from 'node:assert/strict';
import security from '../security/index.mjs';
import {artworkEnv} from './helpers/artwork.mjs';

const call=(env,path,body={})=>security.fetch(new Request('https://internal/finance/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),env);
const entry=(extra={})=>({id:'11111111-1111-4111-8111-111111111111',name:'Blanks',category:'materials',unit:'piece',packCents:1000,packQuantity:10,basis:'per_magnet',usageMilli:1000,magnetsPerSheet:null,active:true,...extra});
const line=(extra={})=>({...entry(),excluded:false,usageMilli:2000,...extra});
async function fixture(run){const env=artworkEnv(),realFetch=globalThis.fetch;globalThis.fetch=async()=>{throw Error('Network forbidden')};try{await run(env)}finally{globalThis.fetch=realFetch;env.sql.close()}}
function order(env,{created=Math.floor(Date.now()/1000),expires=created+20000,snapshot={},...extra}={}){const id=crypto.randomUUID();env.sql.prepare('INSERT INTO orders(id,fingerprint,snapshot,created,expires,artwork_expires,status,version) VALUES(?,?,?,?,?,?,?,?)').run(id,'a'.repeat(64),JSON.stringify({contact:{name:'Private customer',email:'private@example.invalid'},notes:'Private notes',items:[],magnetQty:2,subtotalCents:10000,paymentStatus:'unpaid',...snapshot}),created,expires,created+1209600,extra.status||'new',extra.version||0);return id}
async function ok(env,path,body){const r=await call(env,path,body);assert.equal(r.status,200,await r.clone().text());return r.json()}

test('empty private settings and unsaved order reads never fabricate saved costs or write records',()=>fixture(async env=>{
 const id=order(env);assert.deepEqual(await ok(env,'settings-read'),{version:0,entries:[],updatedAt:null});
 assert.deepEqual(await ok(env,'order-read',{id}),{orderId:id,orderVersion:0,cost:null});
 assert.equal(env.sql.prepare('SELECT count(*) n FROM order_costs').get().n,0);assert.equal(env.sql.prepare('SELECT count(*) n FROM finance_changes').get().n,0);
}));

test('settings edits and deactivation preserve private order snapshots and unrelated overrides',()=>fixture(async env=>{
 const a=order(env),b=order(env),before=env.sql.prepare('SELECT * FROM orders WHERE id=?').get(a);
 const settings=await ok(env,'settings-save',{version:0,entries:[entry()]});assert.equal(settings.version,1);
 const {estimateOrderCosts}=await import('../shared/finance-costs.mjs');const draft=estimateOrderCosts(settings,2);assert.equal(draft.lines[0].usageMilli,2000);
 const saved=await ok(env,'order-save',{id:a,version:0,orderVersion:0,lines:draft.lines.map(value=>({...value,amountCents:999999}))});
 assert.equal(saved.cost.totalCents,200);assert.equal(saved.cost.status,'estimated');assert.equal(saved.cost.lines[0].amountCents,200);
 await ok(env,'settings-save',{version:1,entries:[entry({packCents:9000,active:false})]});
 await ok(env,'order-save',{id:b,version:0,orderVersion:0,lines:[line({packCents:2000})]});
 assert.equal((await ok(env,'order-read',{id:a})).cost.totalCents,200);assert.equal((await ok(env,'order-read',{id:b})).cost.totalCents,400);
 assert.deepEqual(env.sql.prepare('SELECT * FROM orders WHERE id=?').get(a),before);
 assert.equal(env.sql.prepare("SELECT count(*) n FROM finance_changes WHERE actor<>'authenticated-admin'").get().n,0);
 assert.equal(env.sql.prepare('SELECT count(*) n FROM finance_changes').get().n,4);
 const changes=env.sql.prepare('SELECT * FROM finance_changes ORDER BY seq').all();assert.equal(changes[1].before_payload,null);assert.equal(JSON.parse(changes[1].after_payload).totalCents,200);assert.equal(JSON.parse(changes[2].before_payload).entries[0].packCents,1000);assert.equal(JSON.parse(changes[2].after_payload).entries[0].active,false);assert.ok(!JSON.stringify(changes).includes('Private customer'));
}));

test('cost and settings writes reject stale tabs and confirmation requires complete current versions',()=>fixture(async env=>{
 const id=order(env);const writes=await Promise.all([call(env,'order-save',{id,version:0,orderVersion:0,lines:[line()]}),call(env,'order-save',{id,version:0,orderVersion:0,lines:[line({packCents:2000})]})]);assert.deepEqual(writes.map(r=>r.status).sort(),[200,409]);
 let r=await ok(env,'order-confirm',{id,version:1,orderVersion:0});assert.equal(r.cost.status,'confirmed');assert.equal(r.cost.version,2);
 assert.equal((await call(env,'order-confirm',{id,version:1,orderVersion:0})).status,409);
 r=await ok(env,'order-save',{id,version:2,orderVersion:0,lines:[line({packCents:null})]});assert.equal(r.cost.status,'estimated');assert.equal(r.cost.complete,false);assert.equal(r.cost.totalCents,null);
 assert.equal((await call(env,'order-confirm',{id,version:3,orderVersion:0})).status,409);
 env.sql.prepare('UPDATE orders SET version=version+1 WHERE id=?').run(id);
 assert.equal((await call(env,'order-save',{id,version:3,orderVersion:0,lines:[line()]})).status,409);
 const settings=await Promise.all([call(env,'settings-save',{version:0,entries:[entry()]}),call(env,'settings-save',{version:0,entries:[]})]);assert.deepEqual(settings.map(r=>r.status).sort(),[200,409]);
 assert.equal(env.sql.prepare('SELECT count(*) n FROM finance_changes').get().n,4);
}));

test('missing and exactly expired orders reject finance reads and writes without inserts',()=>fixture(async env=>{
 const expired=order(env,{expires:Math.floor(Date.now()/1000)}),missing=crypto.randomUUID();
 for(const [id,status] of [[expired,410],[missing,404]])for(const path of ['order-read','order-save','order-confirm'])assert.equal((await call(env,path,{id,...(path==='order-read'?{}:{version:0,orderVersion:0}),...(path==='order-save'?{lines:[line()]}:{})})).status,status);
 assert.equal(env.sql.prepare('SELECT count(*) n FROM order_costs').get().n,0);assert.equal(env.sql.prepare('SELECT count(*) n FROM finance_changes').get().n,0);
}));

test('audit insertion failure rolls back settings and cost mutations with their revision',t=>fixture(async env=>{
 const errors=[];t.mock.method(console,'error',value=>errors.push(value));
 const id=order(env),revision=env.sql.prepare('SELECT revision FROM finance_report_state').get().revision;
 env.sql.exec("CREATE TRIGGER reject_finance_audit BEFORE INSERT ON finance_changes BEGIN SELECT RAISE(ABORT,'synthetic audit failure'); END");
 assert.equal((await call(env,'settings-save',{version:0,entries:[entry()]})).status,503);assert.equal((await ok(env,'settings-read')).version,0);
 assert.equal((await call(env,'order-save',{id,version:0,orderVersion:0,lines:[line()]})).status,503);assert.equal((await ok(env,'order-read',{id})).cost,null);
 assert.equal(env.sql.prepare('SELECT revision FROM finance_report_state').get().revision,revision);
 assert.deepEqual(errors,[{event:'customvibe_unavailable',step:'security_finance',reason:'unknown'},{event:'customvibe_unavailable',step:'security_finance',reason:'unknown'}]);
}));

test('monthly scalar pages reconcile full-month totals, private omissions and Johannesburg bounds',()=>fixture(async env=>{
 const base=Date.parse('2026-10-31T22:00:00Z')/1000,realNow=Date.now;Date.now=()=>base*1000;
 try{
  order(env,{created:base-1});const first=order(env,{created:base,snapshot:{deliveryCents:0,totalCents:10000}});
  await ok(env,'order-save',{id:first,version:0,orderVersion:0,lines:[line()]});await ok(env,'order-confirm',{id:first,version:1,orderVersion:0});
  const second=order(env,{created:base+1});await ok(env,'order-save',{id:second,version:0,orderVersion:0,lines:[line(),line({id:'22222222-2222-4222-8222-222222222222',packCents:null})]});
  for(let n=0;n<50;n++)order(env,{created:base+2+n,snapshot:{deliveryCents:0,totalCents:10000}});
  order(env,{created:Date.parse('2026-11-30T22:00:00Z')/1000});
  const report=await ok(env,'month',{month:'2026-11'});assert.equal(report.rows.length,50);assert.ok(report.next);assert.equal(report.summary.orderCount,52);assert.equal(report.summary.recordedCostCents,400);assert.equal(report.summary.projectedMarginCents,9800);assert.equal(report.summary.missingCostCount,51);assert.equal(report.summary.missingTotalCount,1);assert.equal(report.summary.confirmedCostCount,1);
  const page=await ok(env,'month',{month:'2026-11',before:report.next,revision:report.reportRevision,validUntil:report.validUntil});assert.equal(page.rows.length,2);assert.equal(page.next,null);assert.deepEqual(page.summary,report.summary);
  const {summarizeFinanceRows}=await import('../shared/finance-report.mjs');assert.deepEqual(report.summary,summarizeFinanceRows([...report.rows,...page.rows]));
  const text=JSON.stringify(report);for(const secret of ['Private customer','private@example.invalid','Private notes','lines','snapshot','locker'])assert.ok(!text.includes(secret),secret);
  assert.equal(report.availableFrom,base-1);assert.ok(report.rows.every(r=>r.paymentStatus==='unpaid'));
  env.sql.prepare("UPDATE orders SET status='shipped' WHERE id=?").run(first);assert.equal((await call(env,'month',{month:'2026-11',revision:report.reportRevision})).status,409);
 }finally{Date.now=realNow}
}));

test('report pin rejects included expiry between pages before hourly cleanup and changed reads',()=>fixture(async env=>{
 const base=Date.parse('2026-11-01T00:00:00Z')/1000,realNow=Date.now;let time=base;Date.now=()=>time*1000;
 try{
  order(env,{created:base,expires:base+10});const report=await ok(env,'month',{month:'2026-11'});time=base+10;
  assert.equal((await call(env,'month',{month:'2026-11',revision:report.reportRevision,validUntil:report.validUntil})).status,409);
  const fresh=await ok(env,'month',{month:'2026-11'});assert.equal(fresh.rows.length,0);assert.equal(fresh.summary.projectedMarginCents,null);
  time=base;const batch=env.DB.batch.bind(env.DB);env.DB.batch=async statements=>{const result=await batch(statements);env.sql.prepare("UPDATE orders SET status='shipped'").run();return result};
  assert.equal((await call(env,'month',{month:'2026-11'})).status,409);
 }finally{Date.now=realNow}
}));

test('internal service rejects malformed fields, unsafe versions and bounded arrays and UTF-8 bodies',()=>fixture(async env=>{
 const id=order(env);
 for(const [path,body] of [['settings-save',{version:0,entries:[entry()],actor:'Tim'}],['settings-save',{version:0,entries:Array(101).fill(entry())}],['settings-save',{version:-1,entries:[]}],['order-read',{id:'x'.repeat(36)}],['order-save',{id,version:0,orderVersion:0,lines:[line({unexpected:true})]}],['order-save',{id,version:0,orderVersion:0,lines:[line(),line()]}],['month',{month:'2026-13'}],['month',{month:'2026-11',before:0}],['month',{month:'2026-11',revision:1.2}],['month',{month:'2026-11',validUntil:-1}],['settings-save',{version:0,entries:[entry({name:'日'.repeat(30000)})]}]])assert.equal((await call(env,path,body)).status,400,path);
 assert.equal((await call(env,'unknown',{})).status,404);
}));

test('stage moves preserve cost snapshots and confirmation uses current request versions without a forced resave',()=>fixture(async env=>{
 const id=order(env);await ok(env,'order-save',{id,version:0,orderVersion:0,lines:[line()]});
 env.sql.prepare("UPDATE orders SET version=1,status='in_progress' WHERE id=?").run(id);
 assert.equal((await call(env,'order-confirm',{id,version:1,orderVersion:0})).status,409);
 const confirmed=await ok(env,'order-confirm',{id,version:1,orderVersion:1});assert.equal(confirmed.cost.status,'confirmed');assert.equal(confirmed.cost.orderVersion,1);assert.equal(confirmed.cost.totalCents,200);
 env.sql.prepare("UPDATE orders SET version=2,status='shipped' WHERE id=?").run(id);
 const read=await ok(env,'order-read',{id});assert.equal(read.orderVersion,2);assert.equal(read.cost.status,'confirmed');assert.deepEqual(read.cost.lines,confirmed.cost.lines);
}));

test('write transaction rechecks order expiry/version after preflight and never leaves an unaudited mutation',()=>fixture(async env=>{
 const id=order(env),batch=env.DB.batch.bind(env.DB);let changed=false;
 env.DB.batch=async statements=>{if(!changed){changed=true;env.sql.prepare('UPDATE orders SET version=version+1 WHERE id=?').run(id);}return batch(statements)};
 assert.equal((await call(env,'order-save',{id,version:0,orderVersion:0,lines:[line()]})).status,409);
 assert.equal(env.sql.prepare('SELECT count(*) n FROM order_costs').get().n,0);assert.equal(env.sql.prepare('SELECT count(*) n FROM finance_changes').get().n,0);
 env.DB.batch=async statements=>{env.sql.prepare('UPDATE orders SET expires=0 WHERE id=?').run(id);return batch(statements)};
 assert.equal((await call(env,'order-save',{id,version:0,orderVersion:1,lines:[line()]})).status,409);
 assert.equal(env.sql.prepare('SELECT count(*) n FROM order_costs').get().n,0);
}));

test('all order and cost insert/update/delete changes advance report revision without editing order data',()=>fixture(async env=>{
 const revision=()=>env.sql.prepare('SELECT revision FROM finance_report_state').get().revision;
 assert.equal(revision(),0);const id=order(env);assert.equal(revision(),1);
 await ok(env,'order-save',{id,version:0,orderVersion:0,lines:[line()]});assert.equal(revision(),2);
 await ok(env,'order-confirm',{id,version:1,orderVersion:0});assert.equal(revision(),3);
 env.sql.prepare('DELETE FROM order_costs WHERE order_id=?').run(id);assert.equal(revision(),4);
 env.sql.prepare("UPDATE orders SET status='shipped' WHERE id=?").run(id);assert.equal(revision(),5);
 env.sql.prepare('DELETE FROM orders WHERE id=?').run(id);assert.equal(revision(),6);
}));

test('monthly margins exclude unknown historical delivery even if a legacy total exists',()=>fixture(async env=>{
 const created=Date.parse('2026-11-01T00:00:00Z')/1000,realNow=Date.now;Date.now=()=>created*1000;
 try{
  const id=order(env,{created,snapshot:{totalCents:10000}});await ok(env,'order-save',{id,version:0,orderVersion:0,lines:[line()]});
  const report=await ok(env,'month',{month:'2026-11'});assert.equal(report.rows[0].deliveryCents,null);assert.equal(report.summary.knownOrderValueCents,10000);assert.equal(report.summary.marginOrderCount,0);assert.equal(report.summary.projectedMarginCents,null);
  const {summarizeFinanceRows}=await import('../shared/finance-report.mjs');assert.deepEqual(report.summary,summarizeFinanceRows(report.rows));
 }finally{Date.now=realNow}
}));

test('settings audit records the exact prior version even when another write arrives after preflight',()=>fixture(async env=>{
 const batch=env.DB.batch.bind(env.DB);let concurrent=false;
 env.DB.batch=async statements=>{if(!concurrent){concurrent=true;env.sql.prepare('INSERT INTO finance_settings(id,version,payload,updated_at) VALUES(1,1,?,1)').run(JSON.stringify([entry({packCents:500})]));}return batch(statements)};
 assert.equal((await call(env,'settings-save',{version:1,entries:[entry({packCents:2000})]})).status,409);
 assert.equal(env.sql.prepare('SELECT count(*) n FROM finance_changes').get().n,0);
}));

test('SQLite fixture current-time overload follows the request clock without changing dated unixepoch calls',()=>fixture(async env=>{
 const realNow=Date.now;let clock=1792670400;Date.now=()=>clock*1000;
 try{
  const statement=env.sql.prepare("SELECT unixepoch() current,unixepoch('2026-10-22T00:00:00Z') dated");
  assert.deepEqual({...statement.get()},{current:1792670400,dated:1792627200});
  clock++;assert.deepEqual({...statement.get()},{current:1792670401,dated:1792627200});
 }finally{Date.now=realNow}
}));

test('order finance detail denies saved costs when its unchanged deadline arrives during the cost lookup',()=>fixture(async env=>{
 const realNow=Date.now;let clock=1792670400;Date.now=()=>clock*1000;
 try{
  const id=order(env,{expires:clock+1});await ok(env,'order-save',{id,version:0,orderVersion:0,lines:[line()]});
  const prepare=env.DB.prepare;env.DB.prepare=(sql,...args)=>{const statement=prepare(sql,...args);if(!sql.startsWith('SELECT * FROM order_costs'))return statement;return {...statement,bind(...values){const bound=statement.bind(...values);return {...bound,async first(){const row=await bound.first();clock++;return row}}}}};
  const response=await call(env,'order-read',{id});assert.equal(response.status,410);assert.equal((await response.json()).cost,undefined);
  assert.equal(env.sql.prepare('SELECT expires FROM orders WHERE id=?').get(id).expires,1792670401);
 }finally{Date.now=realNow}
}));

for(const action of ['first-save','edit-save','confirm'])test(`${action} rejects natural unchanged expiry inside the batch before the SQL mutation`,()=>fixture(async env=>{
 const realNow=Date.now;let clock=1792670400;Date.now=()=>clock*1000;
 try{
  const id=order(env,{expires:clock+1});if(action!=='first-save')await ok(env,'order-save',{id,version:0,orderVersion:0,lines:[line()]});
  const before={cost:env.sql.prepare('SELECT * FROM order_costs').all(),audit:env.sql.prepare('SELECT * FROM finance_changes').all(),revision:env.sql.prepare('SELECT revision FROM finance_report_state').get().revision};
  const batch=env.DB.batch.bind(env.DB);env.DB.batch=statements=>batch(statements.map((statement,index)=>index===0?{async all(){clock++;return statement.all()}}:statement));
  const response=await call(env,action==='confirm'?'order-confirm':'order-save',{id,version:action==='first-save'?0:1,orderVersion:0,...(action==='confirm'?{}:{lines:[line({packCents:2000})]})});
  assert.equal(response.status,410);assert.equal((await response.json()).cost,undefined);
  assert.deepEqual(env.sql.prepare('SELECT * FROM order_costs').all(),before.cost);assert.deepEqual(env.sql.prepare('SELECT * FROM finance_changes').all(),before.audit);assert.equal(env.sql.prepare('SELECT revision FROM finance_report_state').get().revision,before.revision);
  assert.equal(env.sql.prepare('SELECT expires FROM orders WHERE id=?').get(id).expires,1792670401);
 }finally{Date.now=realNow}
}));

for(const action of ['first-save','confirm'])test(`${action} with a live SQL mutation withholds its response if the unchanged deadline arrives before the batch resolves`,()=>fixture(async env=>{
 const realNow=Date.now;let clock=1792670400;Date.now=()=>clock*1000;
 try{
  const id=order(env,{expires:clock+1});if(action==='confirm')await ok(env,'order-save',{id,version:0,orderVersion:0,lines:[line()]});
  const batch=env.DB.batch.bind(env.DB);env.DB.batch=async statements=>{const result=await batch(statements);clock++;return result};
  const response=await call(env,action==='confirm'?'order-confirm':'order-save',{id,version:action==='confirm'?1:0,orderVersion:0,...(action==='confirm'?{}:{lines:[line()]})});
  assert.equal(response.status,410);assert.equal((await response.json()).cost,undefined);
  // The mutation was authorized at its live SQL boundary. Its matching audit remains atomic.
  assert.equal(env.sql.prepare('SELECT version FROM order_costs WHERE order_id=?').get(id).version,action==='confirm'?2:1);
  assert.equal(env.sql.prepare('SELECT count(*) n FROM finance_changes WHERE order_id=?').get(id).n,action==='confirm'?2:1);
  assert.equal(env.sql.prepare('SELECT expires FROM orders WHERE id=?').get(id).expires,1792670401);
 }finally{Date.now=realNow}
}));
