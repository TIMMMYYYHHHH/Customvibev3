import test from 'node:test';
import assert from 'node:assert/strict';
import {validateCostEntry,calculateCostLine,estimateOrderCosts} from '../shared/finance-costs.mjs';

const entry=(changes={})=>({id:'11111111-1111-4111-8111-111111111111',name:'Magnet blanks',category:'materials',unit:'blank',packCents:1000,packQuantity:3,basis:'per_magnet',usageMilli:1000,magnetsPerSheet:null,active:true,...changes});
const settings=(entries)=>({version:1,entries,updatedAt:1792600000});

test('pack division rounds the complete line instead of each unit',()=>{
 assert.equal(calculateCostLine(entry(),2000),667);
 assert.equal(calculateCostLine(entry(),1000),333);
 assert.equal(calculateCostLine(entry({packCents:1,packQuantity:2}),1000),1);
 assert.equal(calculateCostLine(entry({packCents:1,packQuantity:8}),1000),0);
});

test('fractional usage and actual order overrides retain the pack ratio',()=>{
 const source=entry({packCents:999,packQuantity:2});
 assert.equal(calculateCostLine(source,500),250);
 assert.equal(calculateCostLine(source,3000),1499);
 assert.equal(source.usageMilli,1000);
 assert.equal(calculateCostLine({...source,excluded:true,amountCents:999999},500),250);
});

test('eight magnets at six per sheet consume two whole sheets',()=>{
 const result=estimateOrderCosts(settings([entry({basis:'per_sheet',unit:'sheet',packCents:1200,packQuantity:12,magnetsPerSheet:6})]),8);
 assert.equal(result.lines[0].usageMilli,2000);
 assert.equal(result.lines[0].amountCents,200);
 assert.deepEqual({complete:result.complete,totalCents:result.totalCents,knownCostCents:result.knownCostCents},{complete:true,totalCents:200,knownCostCents:200});
});

test('estimates multiply per magnet and per sheet usage but per order only once',()=>{
 const result=estimateOrderCosts(settings([
  entry({packCents:100,packQuantity:1,usageMilli:500}),
  entry({id:'22222222-2222-4222-8222-222222222222',basis:'per_order',category:'courier',packCents:8000,packQuantity:1}),
  entry({id:'33333333-3333-4333-8333-333333333333',basis:'per_sheet',magnetsPerSheet:6,usageMilli:2000,packCents:100,packQuantity:1}),
  entry({id:'44444444-4444-4444-8444-444444444444',active:false})
 ]),8);
 assert.deepEqual(result.lines.map(line=>[line.usageMilli,line.amountCents,line.excluded]),[[4000,400,false],[1000,8000,false],[4000,400,false]]);
 assert.equal(result.totalCents,8800);
});

test('missing prices remain incomplete while explicit zero prices are complete',()=>{
 assert.equal(calculateCostLine(entry({packCents:null}),1000),null);
 assert.equal(calculateCostLine(entry({packCents:0}),1000),0);
 const partial=estimateOrderCosts(settings([entry({packCents:null}),entry({id:'22222222-2222-4222-8222-222222222222',packCents:500,packQuantity:1})]),2);
 assert.equal(partial.complete,false);
 assert.equal(partial.totalCents,null);
 assert.equal(partial.knownCostCents,1000);
 assert.equal(estimateOrderCosts(settings([entry({packCents:0})]),2).complete,true);
 assert.equal(estimateOrderCosts(settings([entry({packCents:0})]),2).totalCents,0);
 assert.deepEqual(estimateOrderCosts(settings([]),2),{lines:[],complete:false,totalCents:null,knownCostCents:0});
});

test('estimates copy defaults and never mutate or recalculate earlier drafts',()=>{
 const source=settings([entry()]),draft=estimateOrderCosts(source,2);
 source.entries[0].packCents=9000;
 source.entries[0].active=false;
 assert.equal(draft.lines[0].packCents,1000);
 assert.equal(draft.lines[0].amountCents,667);
 assert.deepEqual(estimateOrderCosts(source,2).lines,[]);
});

test('cost entry validation normalizes plain labels and preserves explicit null and zero',()=>{
 const normalized=validateCostEntry(entry({name:'  Blanks  ',unit:'  blank  ',packCents:0}));
 assert.equal(normalized.name,'Blanks');
 assert.equal(normalized.unit,'blank');
 assert.equal(normalized.packCents,0);
 assert.equal(validateCostEntry(entry({packCents:null})).packCents,null);
 const {magnetsPerSheet,...withoutYield}=entry();
 assert.equal(validateCostEntry(withoutYield).magnetsPerSheet,null);
});

test('validation rejects missing required values and unknown fields',()=>{
 for(const field of ['id','name','category','unit','packCents','packQuantity','basis','usageMilli','active']){
  const input=entry();delete input[field];assert.throws(()=>validateCostEntry(input),undefined,field);
 }
 for(const input of [null,[],entry({extra:true}),entry({excluded:false}),entry({amountCents:1}),entry({id:'AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA'}),entry({name:'  '}),entry({unit:''}),entry({name:'x'.repeat(81)}),entry({unit:'x'.repeat(25)}),entry({category:'other'}),entry({basis:'per_batch'}),entry({active:1}),entry({magnetsPerSheet:6})])assert.throws(()=>validateCostEntry(input));
});

test('validation rejects negative non-finite fractional and unsafe numeric inputs',()=>{
 for(const value of [-1,NaN,Infinity,-Infinity,1.5,Number.MAX_SAFE_INTEGER+1,'1']){
  assert.throws(()=>validateCostEntry(entry({packCents:value})));
  assert.throws(()=>validateCostEntry(entry({packQuantity:value})));
  assert.throws(()=>validateCostEntry(entry({usageMilli:value})));
  assert.throws(()=>calculateCostLine(entry(),value));
 }
 assert.throws(()=>validateCostEntry(entry({packQuantity:0})));
 for(const value of [null,0,-1,1.5,Infinity])assert.throws(()=>validateCostEntry(entry({basis:'per_sheet',magnetsPerSheet:value})));
 assert.throws(()=>validateCostEntry(entry({basis:'per_sheet',magnetsPerSheet:6,usageMilli:1500})));
 assert.throws(()=>calculateCostLine(entry({basis:'per_sheet',magnetsPerSheet:6}),1500));
});

test('rational intermediates remain exact and unsafe outputs are rejected',()=>{
 assert.equal(calculateCostLine(entry({packCents:Number.MAX_SAFE_INTEGER,packQuantity:Number.MAX_SAFE_INTEGER}),1000),1);
 assert.throws(()=>calculateCostLine(entry({packCents:Number.MAX_SAFE_INTEGER,packQuantity:1}),2000));
 assert.throws(()=>estimateOrderCosts(settings([entry({usageMilli:Number.MAX_SAFE_INTEGER})]),2));
 assert.throws(()=>estimateOrderCosts(settings([entry({packCents:Number.MAX_SAFE_INTEGER,packQuantity:1}),entry({id:'22222222-2222-4222-8222-222222222222',packCents:1,packQuantity:1})]),1));
 for(const qty of [0,-1,1.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1])assert.throws(()=>estimateOrderCosts(settings([entry()]),qty));
 assert.equal(estimateOrderCosts(settings([entry({packCents:0,usageMilli:0})]),100000).totalCents,0);
});

test('settings reject duplicate identities and more than one hundred entries',()=>{
 assert.throws(()=>estimateOrderCosts(settings([entry(),entry()]),1));
 assert.throws(()=>estimateOrderCosts(settings(Array.from({length:101},(_,i)=>entry({id:`${String(i).padStart(8,'0')}-1111-4111-8111-111111111111`})) ),1));
});

test('entry IDs reject otherwise canonical UUIDs with trailing line breaks',()=>{
 assert.throws(()=>validateCostEntry(entry({id:'11111111-1111-4111-8111-111111111111\n'})));
});
