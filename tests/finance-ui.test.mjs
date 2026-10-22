import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const client=()=>import('../admin/finance-client.mjs');
const id='11111111-1111-4111-8111-111111111111';
const entry={id,name:'Paper',category:'materials',unit:'sheet',packCents:1000,packQuantity:20,basis:'per_order',usageMilli:1250,magnetsPerSheet:null,active:true};
const settings={version:1,entries:[entry],updatedAt:1};
const cost={orderId:id,version:2,orderVersion:3,status:'confirmed',lines:[{...entry,excluded:false,amountCents:63}],complete:true,totalCents:63,knownCostCents:63,updatedAt:1};
const wrapper={orderId:id,orderVersion:3,cost};
const row={id,reference:'CV-000001',created:1791000000,status:'new',magnetQty:2,subtotalCents:2000,deliveryCents:0,totalCents:2000,paymentStatus:'unpaid',costVersion:2,costStatus:'confirmed',costComplete:true,costCents:63,knownCostCents:63};
const report={month:'2026-10',rows:[row],next:null,summary:{orderCount:1,magnetQty:2,knownOrderValueCents:2000,recordedCostCents:63,missingTotalCount:0,missingCostCount:0,estimatedCostCount:0,confirmedCostCount:1,marginOrderCount:1,projectedMarginCents:1937},availableFrom:1791000000,reportRevision:7,validUntil:9999999999};
async function component(file,name='default'){const out=await build({entryPoints:[file],bundle:true,write:false,format:'cjs',platform:'node',external:['react'],loader:{'.css':'empty'},logLevel:'silent'});const m={exports:{}};new Function('require','module','exports',out.outputFiles[0].text)(createRequire(import.meta.url),m,m.exports);return m.exports[name];}
test('draft conversion preserves missing versus explicit zero and validates fractional usage',async()=>{
 const {entryDraft,parseEntries}=await client();const draft=entryDraft({...entry,packCents:null});assert.equal(draft.packPrice,'');
 assert.equal(parseEntries([draft])[0].packCents,null);draft.packPrice='0';draft.usage='1.125';assert.equal(parseEntries([draft])[0].usageMilli,1125);assert.equal(parseEntries([draft])[0].packCents,0);
 for(const [field,value] of [['packPrice','-1'],['packPrice','1.001'],['packQuantity','0'],['usage','1.0001']])assert.throws(()=>parseEntries([{...draft,[field]:value}]),e=>e.field===field);
 assert.throws(()=>parseEntries([{...draft,basis:'per_sheet',magnetsPerSheet:'9',usage:'1.5'}]),e=>e.field==='usage');
});
test('saved snapshot loads without reading new defaults and editing confirmed costs becomes Estimated',async()=>{
 const {createCostEditor,costStatus}=await client();const calls=[];const editor=createCostEditor({path:'/api/finance/orders/'+id,magnetQty:2,request:async path=>{calls.push(path);return structuredClone(wrapper)}});await editor.load();
 assert.equal(calls.length,1);assert.equal(editor.getSnapshot().draft[0].packPrice,'10.00');assert.equal(costStatus(editor.getSnapshot()),'Confirmed costs');
 editor.edit(0,{packPrice:'0'});assert.equal(costStatus(editor.getSnapshot()),'Estimated');assert.equal(editor.getSnapshot().saved.totalCents,63);
});
test('old order is only an Unsaved estimate until explicit Save costs',async()=>{
 const {createCostEditor,costStatus}=await client();let writes=0;const editor=createCostEditor({path:'/api/finance/orders/'+id,magnetQty:2,request:async(path,body)=>{if(body)writes++;return path.endsWith('/settings')?settings:{...wrapper,cost:null}}});await editor.load();assert.equal(writes,0);assert.equal(costStatus(editor.getSnapshot()),'Unsaved estimate');assert.equal(editor.getSnapshot().draft[0].usage,'1.25');
});
test('lost save response blocks replay and read reconciliation preserves both versions',async()=>{
 const {createCostEditor}=await client();let writes=0;let remote=structuredClone(wrapper);const editor=createCostEditor({path:'/api/finance/orders/'+id,magnetQty:2,request:async(path,body)=>{if(body){writes++;remote={...wrapper,cost:{...cost,version:3,status:'estimated'}};throw new TypeError('lost response')}return structuredClone(remote)}});await editor.load();editor.edit(0,{packPrice:'12'});await editor.save();assert.equal(editor.getSnapshot().needsRead,true);await editor.save();assert.equal(writes,1);await editor.readCurrent();assert.equal(editor.getSnapshot().draft[0].packPrice,'12');assert.equal(editor.getSnapshot().remote.cost.version,3);assert.equal(editor.getSnapshot().saved.version,2);editor.keepDraft();assert.equal(editor.getSnapshot().dirty,true);assert.equal(editor.getSnapshot().saved.version,3);
});
test('409 and expired session keep drafts until explicit reconciliation and save',async()=>{
 const {createCostEditor}=await client();for(const status of [409,401]){let writes=0;const editor=createCostEditor({path:'/api/finance/settings',settings:true,request:async(path,body)=>{if(body){writes++;throw Object.assign(Error('failure'),{status})}return structuredClone(settings)}});await editor.load();editor.edit(0,{name:'My draft'});await editor.save();assert.equal(editor.getSnapshot().draft[0].name,'My draft');await editor.save();assert.equal(writes,1);await editor.readCurrent();assert.equal(editor.getSnapshot().draft[0].name,'My draft');await editor.useSaved();assert.equal(editor.getSnapshot().draft[0].name,'Paper');}
});
test('confirmation uses current stage version and edits never confirm without a save',async()=>{
 const {createCostEditor}=await client();let body;const editor=createCostEditor({path:'/api/finance/orders/'+id,magnetQty:2,request:async(path,input)=>{body=input;return structuredClone(wrapper)}});await editor.load();await editor.confirm(5);assert.deepEqual(body,{version:2,orderVersion:5});editor.edit(0,{usage:'2'});body=null;await editor.confirm(5);assert.equal(body,null);
});
test('monthly export reads all pages sequentially and final revision pin, never customer routes',async()=>{
 const {exportFinanceMonth}=await client();const paths=[];const csv=await exportFinanceMonth({month:'2026-10',request:async path=>{paths.push(path);if(paths.length===1)return {...report,next:5};if(paths.length===2)return {...report,rows:[{...row,id:'22222222-2222-4222-8222-222222222222',reference:'CV-000002'}]};return report;}});assert.equal(csv.split('\r\n').length,4);assert.equal(paths.length,3);assert.ok(paths[1].includes('before=5'));assert.ok(paths[1].includes('revision=7'));assert.ok(paths[2].includes('validUntil=9999999999'));assert.ok(paths.every(p=>p.startsWith('/api/finance/month?')));
});
test('detail export reads saved lines one order at a time and omits unsaved estimates',async()=>{
 const {exportFinanceMonth}=await client();const paths=[];const csv=await exportFinanceMonth({month:'2026-10',detail:true,request:async path=>{paths.push(path);return path.includes('/orders/')?wrapper:{...report,rows:[row,{...row,id:'22222222-2222-4222-8222-222222222222',costVersion:null,costStatus:null,costComplete:false,costCents:null,knownCostCents:0}]};}});assert.equal(paths.filter(p=>p.includes('/orders/')).length,1);assert.ok(csv.includes('Paper'));assert.equal(csv.split('\r\n').length,3);
});
test('changed revision, expiry or navigation discards export rather than releasing partial file',async()=>{
 const {exportFinanceMonth}=await client();for(const kind of ['revision','expiry','cancel']){let calls=0;const abort=new AbortController();await assert.rejects(exportFinanceMonth({month:'2026-10',signal:abort.signal,now:()=>100,request:async()=>{calls++;if(calls===1)return {...report,next:5,validUntil:200};if(kind==='cancel')abort.abort();return {...report,reportRevision:kind==='revision'?8:7,validUntil:kind==='expiry'?99:200};}}));}
});
test('actual editor and report markup presents truthful labels and missing values',async()=>{
 const {createCostEditor}=await client();const Editor=await component('admin/CostSettings.jsx');const editor=createCostEditor({path:'/api/finance/settings',settings:true,request:async()=>({...settings,entries:[{...entry,packCents:null}]})});await editor.load();const html=renderToStaticMarkup(React.createElement(Editor,{editor}));assert.ok(html.includes('Pack price (R)'));assert.ok(html.includes('Not entered'));assert.ok(html.includes('value=""'));assert.ok(!html.includes('Mark paid'));
 const View=await component('admin/Finances.jsx','FinanceReport');const reportHtml=renderToStaticMarkup(React.createElement(View,{report:{...report,rows:[{...row,deliveryCents:null,totalCents:null,costVersion:null,costStatus:null,costComplete:false,costCents:null}]}}));for(const label of ['Projected margin','Order value is not money received','To confirm','Not entered'])assert.ok(reportHtml.includes(label),label);
});

test('admin finances document stays authenticated and login return remains a closed allowlist',async()=>{
 const {gate,random,signToken}=await import('../server/auth.mjs');const {default:worker}=await import('../admin/worker.mjs');const secret=random();let assets=[];
 const env={ADMIN_PASSWORD_HASH:random(),ADMIN_PASSWORD_SALT:random(),ADMIN_SESSION_SECRET:secret,AUTH:{fetch:async()=>Response.json({revoked:false})},ASSETS:{fetch:async request=>{assets.push(new URL(request.url).pathname);return new Response('synthetic admin document');}}};
 for(const [path,next] of [['/finances','/finances'],['/finances?next=https://evil.invalid','/'],['//evil.invalid','/']]){const response=(await gate(new Request('https://admin.customvibe.co.za'+path),env,'admin')).response;assert.equal(response.status,401);assert.ok((await response.text()).includes('name="next" value="'+next+'"'));}
 assert.equal((await worker.fetch(new Request('https://admin.customvibe.co.za/finances'),env)).status,401);assert.equal(assets.length,0);
 const token=await signToken({scope:'admin',csrf:random(),jti:random(),exp:Math.floor(Date.now()/1000)+600},secret);const response=await worker.fetch(new Request('https://admin.customvibe.co.za/finances',{headers:{cookie:'__Host-cv-admin='+token}}),env);assert.equal(response.status,200);assert.deepEqual(assets,['/']);
});
test('pack unit-cost guidance uses chosen unit without changing order line rounding',async()=>{
 const {createCostEditor,previewCosts}=await client();const Component=await component('admin/CostSettings.jsx');const editor=createCostEditor({settings:true,path:'/api/finance/settings',request:async()=>({...settings,entries:[{...entry,packCents:100,packQuantity:3,usageMilli:2000}]})});await editor.load();const html=renderToStaticMarkup(React.createElement(Component,{editor}));assert.ok(html.includes('Approx. cost per sheet: R 0.3333'));assert.equal(previewCosts(editor.getSnapshot().draft).totalCents,67);
});
test('editable decimal drafts preserve every safe cent and usage thousandth',async()=>{
 const {entryDraft,parseEntries,money,currentFinanceMonth}=await client();const draft=entryDraft({...entry,packCents:9007199254740991,usageMilli:9007199254740991});assert.equal(draft.packPrice,'90071992547409.91');assert.equal(draft.usage,'9007199254740.991');assert.equal(parseEntries([draft])[0].packCents,9007199254740991);assert.equal(money(-9007199254740991),'R -90071992547409.91');assert.equal(currentFinanceMonth(new Date('2026-09-30T22:01:00Z')),'2026-10');
});
