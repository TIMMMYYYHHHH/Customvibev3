import test from 'node:test';
import assert from 'node:assert/strict';
import {readPrintArtwork, assertCurrentPrintOrder} from '../admin/print-artwork.mjs';
const id='11111111-1111-4111-8111-111111111111';
const now=1800000000000;
const bytes=new Uint8Array([255,216,255,217]);
const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
const job={orderId:id,version:3,revision:2,digest:'manifest',expiresAt:now/1000+100,files:[{name:'design-01-photo.jpg',size:4,sha256:digest,index:0,requestId:id}]};
const response=()=>new Response(bytes,{headers:{'Content-Type':'image/jpeg'}});
test('print reads exact verified private bytes, once per unique file',async()=>{let calls=0;const out=await readPrintArtwork(job,async file=>{calls++;assert.equal(file.index,0);return response()},{now:()=>now});assert.equal(calls,1);assert.deepEqual(out.get('design-01-photo.jpg'),bytes);});
test('print refuses non-image, missing, truncated, oversized or altered bytes',async()=>{
 for(const make of [()=>new Response('expired',{status:410}),()=>new Response('<html>',{headers:{'Content-Type':'text/html'}}),()=>new Response(bytes.slice(1),{headers:{'Content-Type':'image/jpeg'}}),()=>new Response(new Uint8Array(5),{headers:{'Content-Type':'image/jpeg'}}),()=>new Response(new Uint8Array(4),{headers:{'Content-Type':'image/jpeg'}})])await assert.rejects(readPrintArtwork(job,async()=>make(),{now:()=>now}));
});
test('expiry and cancellation block reads and never produce partial artwork',async()=>{let calls=0;const fetcher=async()=>{calls++;return response()};await assert.rejects(readPrintArtwork({...job,expiresAt:now/1000},fetcher,{now:()=>now}),/expired/);const c=new AbortController();c.abort();await assert.rejects(readPrintArtwork(job,fetcher,{signal:c.signal,now:()=>now}),/cancel/i);assert.equal(calls,0);});
test('recheck rejects replaced artwork, another order, stale versions and expiry',()=>{
 const current={id,version:3,artworkExpires:job.expiresAt,proof:{revision:2,digest:'manifest'}};
 assert.doesNotThrow(()=>assertCurrentPrintOrder(job,current,now));
 for(const changed of [{...current,id:'22222222-2222-4222-8222-222222222222'},{...current,version:4},{...current,proof:{revision:3,digest:'manifest'}},{...current,proof:{revision:2,digest:'changed'}},{...current,artworkExpires:now/1000}])assert.throws(()=>assertCurrentPrintOrder(job,changed,now));
});
