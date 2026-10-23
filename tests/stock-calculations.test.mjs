import test from 'node:test';
import assert from 'node:assert/strict';
import {stockCsv,stockQuantity} from '../shared/stock.mjs';
test('quantities reject negatives, overflow and fractional sheets',()=>{
 for(const n of [-1,0.1,Number.MAX_SAFE_INTEGER+1])assert.throws(()=>stockQuantity(n));
 assert.throws(()=>stockQuantity(1001,true));assert.equal(stockQuantity(2000,true),2000);
});
test('stock CSV uses exact integer decimals and protects formula/control text',()=>{
 const csv=stockCsv([{seq:1,operationId:'id',kind:'receipt',created:1792670400,reason:'=cmd',price:{packCents:123,packQuantity:5},lines:[{itemId:'item',name:'\t=evil',unit:'sheet',deltaMilli:1000,balanceMilli:9007199254740991,stocktakeGeneration:1}]}]);
 assert.ok(csv.startsWith('\uFEFF'));assert.ok(csv.endsWith('\r\n'));assert.ok(csv.includes('"\'=cmd"'));assert.ok(csv.includes('"\'\t=evil"'));assert.ok(csv.includes('9007199254740.991'));assert.ok(csv.includes('1.23'));assert.throws(()=>stockCsv(Array(10001).fill({})));
});
test('stock export rejects output above 4 MiB and preserves negative movements as numeric decimals',()=>{
 const row={seq:1,operationId:'11111111-1111-4111-8111-111111111111',kind:'use',created:1792670400,reason:'r'.repeat(200),price:null,lines:[{itemId:'22222222-2222-4222-8222-222222222222',name:'n'.repeat(80),unit:'millilitre',deltaMilli:-1234,balanceMilli:0,stocktakeGeneration:1}]};
 assert.ok(stockCsv([row]).includes(',-1.234,0.000,'));assert.throws(()=>stockCsv(Array(10000).fill(row)),/4 MiB/);
});
