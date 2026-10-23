import test from 'node:test';
import assert from 'node:assert/strict';
import {monthRange,summarizeFinanceRows,financeCsv} from '../shared/finance-report.mjs';

const row=(changes={})=>({id:'11111111-1111-4111-8111-111111111111',reference:'CV-000001',created:1793484000,status:'new',magnetQty:8,subtotalCents:24000,deliveryCents:0,totalCents:24000,paymentStatus:'unpaid',costVersion:1,costStatus:'estimated',costComplete:true,costCents:9000,knownCostCents:9000,...changes});
const line=(changes={})=>({id:'22222222-2222-4222-8222-222222222222',name:'Courier',category:'courier',unit:'parcel',packCents:8000,packQuantity:1,basis:'per_order',usageMilli:1000,magnetsPerSheet:null,active:true,excluded:false,amountCents:8000,...changes});
// A small reader checks real exported cells including embedded CRLF and quotes.
const cells=(text)=>{
 const rows=[];let current=[],cell='',quoted=false;
 for(let i=1;i<text.length;i++){
  const char=text[i];
  if(char==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}
  else if(!quoted&&char===','){current.push(cell);cell='';}
  else if(!quoted&&char==='\r'&&text[i+1]==='\n'){current.push(cell);rows.push(current);current=[];cell='';i++;}
  else cell+=char;
 }
 return rows;
};
const csvRecord=(value)=>{const [head,data]=cells(value);return Object.fromEntries(head.map((name,index)=>[name,data[index]]));};

test('Johannesburg month bounds are exact exclusive UTC seconds',()=>{
 const october=monthRange('2026-10'),november=monthRange('2026-11'),december=monthRange('2026-12');
 assert.equal(new Date(november[0]*1000).toISOString(),'2026-10-31T22:00:00.000Z');
 assert.equal(new Date(november[1]*1000).toISOString(),'2026-11-30T22:00:00.000Z');
 assert.equal(october[1],november[0]);
 assert.equal(november[1],december[0]);
 const orders=[
  {id:'before-start',created:Date.parse('2026-10-31T21:59:59Z')/1000},
  {id:'at-start',created:Date.parse('2026-10-31T22:00:00Z')/1000},
  {id:'before-end',created:Date.parse('2026-11-30T21:59:59Z')/1000},
  {id:'at-end',created:Date.parse('2026-11-30T22:00:00Z')/1000}
 ];
 const members=([start,end])=>orders.filter(order=>order.created>=start&&order.created<end).map(order=>order.id);
 assert.deepEqual(members(october),['before-start']);
 assert.deepEqual(members(november),['at-start','before-end']);
 assert.deepEqual(members(december),['at-end']);
 assert.equal(new Date(monthRange('2028-02')[1]*1000).toISOString(),'2028-02-29T22:00:00.000Z');
 assert.equal(new Date(monthRange('0099-01')[0]*1000).toISOString(),'0098-12-31T22:00:00.000Z');
});

test('malformed and impossible months are rejected',()=>{
 for(const month of ['2026-1','2026-00','2026-13',' 2026-11','2026-11 ','2026-11-01','2026-11\n','foo',null,202611])assert.throws(()=>monthRange(month));
});

test('summaries use saved amounts including partial costs and only eligible margins',()=>{
 const summary=summarizeFinanceRows([
  row(),
  row({id:'two',magnetQty:2,subtotalCents:10000,deliveryCents:null,totalCents:null,costVersion:null,costStatus:null,costComplete:false,costCents:null,knownCostCents:0}),
  row({id:'three',magnetQty:1,subtotalCents:5000,deliveryCents:1000,totalCents:6000,costComplete:false,costCents:null,knownCostCents:2000}),
  row({id:'four',magnetQty:3,subtotalCents:7000,totalCents:7000,costStatus:'confirmed',costCents:8000,knownCostCents:8000})
 ]);
 assert.deepEqual(summary,{orderCount:4,magnetQty:14,knownOrderValueCents:37000,recordedCostCents:19000,missingTotalCount:1,missingCostCount:2,estimatedCostCount:2,confirmedCostCount:1,marginOrderCount:2,projectedMarginCents:14000});
});

test('unknown delivery and unsaved costs each suppress margin',()=>{
 const missing=summarizeFinanceRows([row({deliveryCents:null}),row({costVersion:null,costStatus:null,costComplete:false,costCents:null,knownCostCents:0})]);
 assert.equal(missing.marginOrderCount,0);
 assert.equal(missing.projectedMarginCents,null);
 assert.equal(summarizeFinanceRows([]).projectedMarginCents,null);
 const zero=summarizeFinanceRows([row({totalCents:9000})]);
 assert.equal(zero.projectedMarginCents,0);
});

test('free customer shipping keeps positive courier expense and projected unpaid margin',()=>{
 const result=summarizeFinanceRows([row({deliveryCents:0,costCents:8000,knownCostCents:8000})]);
 assert.equal(result.recordedCostCents,8000);
 assert.equal(result.projectedMarginCents,16000);
 assert.equal(result.knownOrderValueCents,24000);
});

test('report aggregation rejects unsafe totals and invalid amounts',()=>{
 assert.throws(()=>summarizeFinanceRows([row({totalCents:Number.MAX_SAFE_INTEGER}),row()]));
 assert.throws(()=>summarizeFinanceRows([row({knownCostCents:Number.MAX_SAFE_INTEGER}),row()]));
 assert.throws(()=>summarizeFinanceRows([row({magnetQty:Number.MAX_SAFE_INTEGER}),row()]));
 for(const value of [-1,1.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1,'10'])assert.throws(()=>summarizeFinanceRows([row({totalCents:value})]));
});

test('summary CSV preserves null money cells and exports no customer fields',()=>{
 const csv=financeCsv([row({reference:'A "quote"\r\nsecond line',deliveryCents:null,totalCents:null,costVersion:null,costStatus:null,costComplete:false,costCents:null,knownCostCents:0,email:'secret@example.com',contact:{name:'Private name'},notes:'Private notes',locker:'Private locker',artwork:'private.png'})]);
 assert.ok(csv.startsWith('\uFEFF'));
 assert.ok(csv.endsWith('\r\n'));
 const record=csvRecord(csv);
 assert.equal(record.reference,'A "quote"\r\nsecond line');
 assert.equal(record.subtotalRand,'240.00');
 assert.equal(record.deliveryRand,'');
 assert.equal(record.totalRand,'');
 assert.equal(record.costTotalRand,'');
 assert.equal(record.projectedMarginRand,'');
 assert.equal(record.paymentStatus,'unpaid');
 assert.doesNotMatch(csv,/secret@example|Private name|Private notes|Private locker|private.png|email|contact|artwork|locker/);
});

test('CSV neutralizes formula and control-leading text but retains numeric negative margins',()=>{
 for(const reference of ['=2+2','+SUM(A1:A2)','-2+1','@SUM(A1:A2)','\t=1','\r=1','\n=1','\u0000=1',' =1','\uFEFF=1'])assert.equal(csvRecord(financeCsv([row({reference})])).reference,"'"+reference);
 const csv=financeCsv([row({totalCents:7000,costCents:9000,knownCostCents:9000})]);
 assert.equal(csvRecord(csv).projectedMarginRand,'-20.00');
 assert.ok(csv.includes(',-20.00\r\n'));
 assert.ok(!csv.includes("'-20.00"));
});

test('CSV uses exact decimal money at the safe integer boundary',()=>{
 const csv=financeCsv([row({subtotalCents:Number.MAX_SAFE_INTEGER,totalCents:Number.MAX_SAFE_INTEGER,costCents:0,knownCostCents:0})]);
 assert.equal(csvRecord(csv).subtotalRand,'90071992547409.91');
 assert.equal(csvRecord(csv).projectedMarginRand,'90071992547409.91');
});

test('CSV dates keep the Johannesburg calendar date at the month boundary',()=>{
 const csv=financeCsv([row({created:1793484000})]);
 assert.equal(csvRecord(csv).createdSAST,'2026-11-01T00:00:00+02:00');
});

test('detail CSV emits saved lines with overrides and explicit exclusions only',()=>{
 const csv=financeCsv([row({lines:[line({name:'=Courier "special"\nbox',usageMilli:2000,amountCents:16000}),line({id:'three',excluded:true,amountCents:0,packCents:null})],contact:{email:'private@example.com'}}),row({costVersion:null,costStatus:null,costComplete:false,costCents:null,knownCostCents:0,lines:[]})],{detail:true});
 const [headers,...records]=cells(csv);
 assert.equal(records.length,2);
 const first=Object.fromEntries(headers.map((key,index)=>[key,records[0][index]]));
 const second=Object.fromEntries(headers.map((key,index)=>[key,records[1][index]]));
 assert.equal(first.lineName,"'=Courier \"special\"\nbox");
 assert.equal(first.usage,'2.000');
 assert.equal(first.amountRand,'160.00');
 assert.equal(second.excluded,'true');
 assert.equal(second.packPriceRand,'');
 assert.equal(second.amountRand,'0.00');
 assert.doesNotMatch(csv,/private@example|email|contact/);
 assert.equal(cells(financeCsv([row({costVersion:null,costStatus:null,lines:[line()]})],{detail:true})).length,1);
});

test('CSV protects C1 and formatting control characters at the start of text',()=>{
 for(const reference of ['\u0085=1','\u200e=1'])assert.equal(csvRecord(financeCsv([row({reference})])).reference,"'"+reference);
});

test('detail CSV rejects invalid financial values rather than exporting negative expenses',()=>{
 for(const changes of [{amountCents:-1},{packCents:-1},{usageMilli:-1},{packQuantity:0},{magnetsPerSheet:0}])assert.throws(()=>financeCsv([row({lines:[line(changes)]})],{detail:true}));
});
