import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {onRequest} from '../functions/_middleware.js';

// These keys and recipients are deliberately fictional. No provider is contacted.
const secret='whsec_'+Buffer.from('synthetic-only-webhook-secret-32-bytes').toString('base64');
const oldSecret='whsec_'+Buffer.from('synthetic-retired-webhook-secret-value').toString('base64');
const origin='https://customvibe.co.za';
const path='/api/mail-events/resend';
const eventId='msg_synthetic-event-1';
const now=()=>Math.floor(Date.now()/1000);
const iso=time=>new Date(time*1000).toISOString();
const payload=(overrides={})=>JSON.stringify({type:'email.delivered',created_at:iso(now()-30),data:{email_id:'synthetic-email-1',to:['Example@EXAMPLE.test'],created_at:'2020-01-01T00:00:00.000Z',from:'private-from-sentinel',subject:'private-subject-sentinel',body:'private-body-sentinel',tags:{private:'private-tags-sentinel'},diagnostics:'private-diagnostic-sentinel'},...overrides});
function signature(body,time=now(),id=eventId,key=secret){return 'v1,'+createHmac('sha256',Buffer.from(key.slice(6),'base64')).update(`${id}.${time}.${body}`).digest('base64')}
function request(body=payload(),options={}){const time=options.time??now(),id=options.id??eventId;return new Request(options.url??origin+path,{method:options.method??'POST',headers:{'Content-Type':'application/json','svix-id':id,'svix-timestamp':String(time),'svix-signature':signature(body,time,id),...options.headers},body:['GET','HEAD'].includes(options.method)?undefined:body})}
function boundary(response={ok:true,disposition:'applied',reason:'observation-recorded'}){const calls=[];return {calls,AUTH:{async fetch(url,options){calls.push({url,options,body:JSON.parse(options.body)});return Response.json(response)}}}}
const envFor=b=>({MAIL_EVENTS_ENABLED:'true',MAIL_EVENTS_ENVIRONMENT:'production',CF_PAGES:'1',CF_PAGES_BRANCH:'main',RESEND_WEBHOOK_SECRET:secret,AUTH:b.AUTH});
const run=async(r,env)=>{const restore=noNetwork();try{return await onRequest({request:r,env,next:()=>new Response('next')})}finally{restore()}};
const noNetwork=()=>{const previous=globalThis.fetch;let attempts=0;globalThis.fetch=()=>{attempts++;throw Error('External network forbidden')};return ()=>{globalThis.fetch=previous;assert.equal(attempts,0)}};

test('signed production ingress bypasses the site gate and forwards only the frozen projection',async()=>{
 const restore=noNetwork();try{const b=boundary(),body=payload(),response=await run(request(body),envFor(b));assert.equal(response.status,200);assert.deepEqual(await response.json(),{ok:true});assert.equal(b.calls.length,1);assert.equal(b.calls[0].url,'https://auth.internal/mail-delivery/observe');assert.equal(b.calls[0].options.method,'POST');assert.equal(b.calls[0].options.redirect,'manual');assert.equal(b.calls[0].options.headers['Content-Type'],'application/json');const p=b.calls[0].body;assert.deepEqual(Object.keys(p).sort(),['providerMessageId','source','type','eventId','occurredAt','checkedAt','recipientCount','recipientDigest'].sort());assert.equal(p.eventId,eventId);assert.equal(p.providerMessageId,'synthetic-email-1');assert.equal(p.source,'webhook');assert.equal(p.type,'email.delivered');assert.equal(p.recipientCount,1);assert.match(p.recipientDigest,/^[a-f0-9]{64}$/);assert.equal(p.occurredAt,Math.floor(Date.parse(JSON.parse(body).created_at)/1000));assert.ok(p.checkedAt>=p.occurredAt&&p.checkedAt<=now());assert.doesNotMatch(JSON.stringify(p),/private-|Example@|EXAMPLE.test|2020-01-01/);assert.equal(response.headers.get('x-frame-options'),'DENY');assert.match(response.headers.get('cache-control'),/no-store/);}finally{restore()}
});

test('inactive, missing-secret, local and preview requests never reach production bindings',async()=>{
 for(const change of [{MAIL_EVENTS_ENABLED:undefined},{MAIL_EVENTS_ENABLED:'false'},{RESEND_WEBHOOK_SECRET:undefined},{RESEND_WEBHOOK_SECRET:'bad'},{MAIL_EVENTS_ENVIRONMENT:undefined},{MAIL_EVENTS_ENVIRONMENT:'preview'},{CF_PAGES:undefined},{CF_PAGES_BRANCH:'preview'},{CF_PAGES_BRANCH:undefined},{AUTH:undefined}]){const b=boundary();const response=await run(request(),{...envFor(b),...change});assert.equal(response.status,503,JSON.stringify(change));assert.equal(b.calls.length,0)}
});

test('wrong scheme, host, port and method reject before redirect, gate or AUTH',async()=>{
 for(const url of ['http://customvibe.co.za'+path,'https://www.customvibe.co.za'+path,'https://customvibe.co.za.evil.test'+path,'https://preview.pages.dev'+path,'https://customvibe.co.za:444'+path]){const b=boundary(),response=await run(request(payload(),{url}),envFor(b));assert.equal(response.status,403,url);assert.equal(response.headers.get('location'),null);assert.equal(b.calls.length,0)}
 for(const method of ['GET','PUT','OPTIONS']){const b=boundary(),response=await run(request(payload(),{method}),envFor(b));assert.equal(response.status,405);assert.equal(b.calls.length,0)}
});

test('nearby API paths retain the existing gate and HTTP canonical redirect',async()=>{
 const b=boundary(),env={...envFor(b),SITE_GATE_ENABLED:'true'};const response=await run(new Request('http://www.customvibe.co.za/api/mail-events/resend/'),env);assert.equal(response.status,308);assert.equal(response.headers.get('location'),'https://customvibe.co.za/api/mail-events/resend/');assert.equal(b.calls.length,0);const gated=await run(new Request(origin+'/api/mail-events/resend/'),env);assert.equal(gated.status,503);assert.equal(b.calls.length,0)
});

test('raw-body and header tampering, malformed and stale/future signatures are rejected',async()=>{
 const body=payload();for(const options of [{headers:{'svix-signature':signature(body+' ')}},{headers:{'svix-id':'different-event'}},{headers:{'svix-timestamp':String(now()-10)}},{headers:{'svix-signature':'v1,invalid'}},{headers:{'svix-signature':''}},{headers:{'svix-id':'x'.repeat(129)}},{headers:{'svix-id':'bad,id'}},{headers:{'svix-timestamp':'1e9'}},{headers:{'svix-signature':'x'.repeat(2049)}},{time:now()-301},{time:now()+301}]){const b=boundary(),response=await run(request(body,options),envFor(b));assert.equal(response.status,400,JSON.stringify(options));assert.equal(b.calls.length,0)}
});

test('a current delivery attempt accepts an older event and rotated signature list',async()=>{
 const body=payload({created_at:'2020-01-01T00:00:00.000Z'}),time=now(),b=boundary();const response=await run(request(body,{time,headers:{'svix-signature':signature(body,time,eventId,oldSecret)+' '+signature(body,time)}}),envFor(b));assert.equal(response.status,200);assert.equal(b.calls[0].body.occurredAt,1577836800)
});

test('body bound is streamed and enforced despite a false Content-Length',async()=>{
 const body=payload({padding:'a'.repeat(32768)});let cancelled=false;const stream=new ReadableStream({start(c){c.enqueue(new TextEncoder().encode(body));},cancel(){cancelled=true}});const b=boundary();const r=new Request(origin+path,{method:'POST',headers:{...Object.fromEntries(request(body).headers),'Content-Length':'1'},body:stream,duplex:'half'});const response=await run(r,envFor(b));assert.equal(response.status,413);assert.equal(cancelled,true);assert.equal(b.calls.length,0)
});

test('JSON media type, declared size and UTF-8 encoding are bounded before observation',async()=>{
 for(const headers of [{'Content-Type':'text/plain'},{'Content-Type':'application/json; charset=iso-8859-1'},{'Content-Length':'32769'},{'Content-Length':'-1'},{'Content-Length':'1e2'}]){const b=boundary(),r=await run(request(payload(),{headers}),envFor(b));assert.ok([400,413,415].includes(r.status));assert.equal(b.calls.length,0)}
 const b=boundary(),r=await run(new Request(origin+path,{method:'POST',headers:Object.fromEntries(request().headers),body:new Uint8Array([0xff])}),envFor(b));assert.equal(r.status,400);assert.equal(b.calls.length,0)
});

test('authenticated unsupported events and invalid envelopes acknowledge ignored without delivery evidence',async()=>{
 const base=JSON.parse(payload());for(const change of [{type:'email.opened'},{type:'email.clicked'},{created_at:undefined},{created_at:'2026-02-30T00:00:00Z'},{created_at:iso(now()+100)},{created_at:'2020-01-01'},{created_at:0},{data:null},{data:{...base.data,email_id:'bad id'}},{data:{...base.data,to:[]}},{data:{...base.data,to:['a@example.test','b@example.test']}},{data:{...base.data,to:['Example <a@example.test>']}},{data:{...base.data,to:['ü@example.test']}},{data:{...base.data,to:['a@example.test'],cc:['b@example.test']}},{data:{...base.data,to:['a@example.test'],bcc:['b@example.test']}},{data:{...base.data,to:'a@example.test'}}]){const b=boundary(),r=await run(request(payload(change)),envFor(b));assert.equal(r.status,204,JSON.stringify(change));assert.equal(await r.text(),'');assert.match(r.headers.get('cache-control'),/no-store/);assert.equal(b.calls.length,0)}
 for(const text of ['null','[]','{','',JSON.stringify('private-envelope-sentinel')]){const b=boundary(),r=await run(request(text),envFor(b));assert.equal(r.status,204);assert.equal(await r.text(),'');assert.equal(b.calls.length,0)}
});

test('malformed JSON receives ignored only after signature and freshness authentication',async()=>{
 const body='{private-malformed-sentinel';
 for(const [options,status] of [[{},204],[{headers:{'svix-signature':signature(body+' ')}},400],[{headers:{'svix-signature':''}},400],[{time:now()-600},400],[{time:now()+600},400]]){const b=boundary(),r=await run(request(body,options),envFor(b));assert.equal(r.status,status);const text=await r.text();assert.doesNotMatch(text,/private-malformed-sentinel|applied/);if(status===204)assert.equal(text,'');assert.equal(b.calls.length,0)}
});

test('authenticated projection service failures stay retryable without exposing private errors',async()=>{
 const descriptor=Object.getOwnPropertyDescriptor(globalThis,'crypto');
 Object.defineProperty(globalThis,'crypto',{configurable:true,value:{subtle:{async digest(){throw Error('private-crypto-sentinel')}}}});
 try{const b=boundary(),r=await run(request(),envFor(b));assert.equal(r.status,503);assert.deepEqual(await r.json(),{error:'Unavailable'});assert.equal(b.calls.length,0)}finally{Object.defineProperty(globalThis,'crypto',descriptor)}
});

test('private acknowledgement remains awaited and temporary private failures remain retryable',async()=>{
 let release,entered;const waiting=new Promise(resolve=>{release=resolve}),started=new Promise(resolve=>{entered=resolve});let completed=false;
 const pending=run(request(),{...envFor(boundary()),AUTH:{async fetch(){entered();return waiting}}}).then(r=>{completed=true;return r});
 await started;await Promise.resolve();assert.equal(completed,false);
 release(Response.json({ok:true,disposition:'applied',reason:'observation-recorded'},{status:503}));const r=await pending;assert.equal(r.status,503);assert.deepEqual(await r.json(),{error:'Unavailable'});
});

test('all seven fixed event types forward unchanged and recipient domain normalization matches the frozen binding',async()=>{
 let digest;for(const type of ['email.sent','email.delivery_delayed','email.delivered','email.bounced','email.failed','email.suppressed','email.complained']){const b=boundary(),r=await run(request(payload({type})),envFor(b));assert.equal(r.status,200);assert.equal(b.calls[0].body.type,type);digest=b.calls[0].body.recipientDigest}
 const base=JSON.parse(payload()),b=boundary();await run(request(payload({data:{...base.data,to:['Example@example.test']}})),envFor(b));assert.equal(b.calls[0].body.recipientDigest,digest)
});

test('only confirmed backend dispositions acknowledge; uncertainty never reports success or private errors',async()=>{
 const restore=noNetwork();try{for(const disposition of ['applied','duplicate','ignored']){const b=boundary({ok:true,disposition,reason:disposition==='duplicate'?'duplicate-event':disposition==='ignored'?'original-expiry':'observation-recorded'});const r=await run(request(),envFor(b));assert.equal(r.status,disposition==='ignored'?204:200);if(disposition==='ignored')assert.equal(await r.text(),'')}
 for(const value of [{ok:false},{ok:true,disposition:'applied'},{ok:true,disposition:'unknown',reason:'observation-recorded'},{ok:true,disposition:'applied',reason:'private-sentinel'},{ok:true,disposition:'applied',reason:'observation-recorded',payload:'private-sentinel'}]){const b=boundary(value),r=await run(request(),envFor(b));assert.equal(r.status,503);assert.doesNotMatch(await r.text(),/private-sentinel/)}
 for(const fetch of [async()=>{throw Error('private-sentinel')},async()=>Response.json({ok:true,disposition:'applied',reason:'observation-recorded'},{status:503}),async()=>new Response('private-sentinel'),async()=>new Response('x'.repeat(4096))]){const r=await run(request(),{...envFor(boundary()),AUTH:{fetch}});assert.equal(r.status,503);assert.doesNotMatch(await r.text(),/private-sentinel/)}
 }finally{restore()}
});

test('signed bytes and recipient hashing execute in the actual isolated Worker runtime without network or logs',async()=>{
 const {build}=await import('esbuild'),{Miniflare,convertV4MiniflareOptions}=await import('miniflare');
 const bundle=await build({entryPoints:['tests/fixtures/mail-webhook-worker.mjs'],bundle:true,format:'esm',platform:'browser',write:false});
 const runtime=new Miniflare(convertV4MiniflareOptions({modules:true,script:bundle.outputFiles[0].text,compatibilityDate:'2026-06-16'}));
 try{
  const body=payload({subject:'Unicode bytes: café 🧩',padding:' \\n '});
  const malformed='{private-malformed-sentinel',unsupported=payload({type:'email.received'}),invalid=payload({data:null});
  for(const variant of [{status:200,observed:true},{body:body+' ',signedBody:body,status:400},{body:body.replace('café','cafe'),signedBody:body,status:400},{url:'https://preview.pages.dev/api/mail-events/resend',status:403},{env:{CF_PAGES_BRANCH:'preview'},status:503},{time:now()-600,status:400},{time:now()+600,status:400},{body:unsupported,status:204},{body:invalid,status:204},{body:malformed,status:204},{body:malformed,signedBody:malformed+' ',status:400}]){
   const signed=request(variant.signedBody??variant.body??body,{time:variant.time}),fixture={body,secret,headers:Object.fromEntries(signed.headers),...variant};
   const response=await runtime.dispatchFetch(origin+'/_synthetic',{method:'POST',body:JSON.stringify(fixture)}),result=await response.json();
   assert.equal(result.cryptoAvailable,true);assert.equal(result.networkAttempts,0);assert.equal(result.logs,0);
   const accepted=variant.observed===true;assert.equal(result.status,variant.status,JSON.stringify(variant));assert.equal(result.observations.length,accepted?1:0);
   if(variant.status===204)assert.equal(result.body,'');assert.doesNotMatch(result.body,/private-|applied/);
   if(accepted){assert.deepEqual(Object.keys(result.observations[0]).sort(),['providerMessageId','source','type','eventId','occurredAt','checkedAt','recipientCount','recipientDigest'].sort());assert.match(result.observations[0].recipientDigest,/^[a-f0-9]{64}$/);assert.doesNotMatch(JSON.stringify(result.observations),/café|🧩|private-|Example@/)}
  }
 }finally{await runtime.dispose()}
});


test('the pinned verifier enforces the exact five-minute past and future tolerance',async()=>{
 const original=Date.now,clock=1761000000;Date.now=()=>clock*1000;
 try{for(const [offset,status] of [[-301,400],[-300,200],[300,200],[301,400]]){const b=boundary(),body=payload({created_at:iso(clock-30)}),r=await run(request(body,{time:clock+offset}),envFor(b));assert.equal(r.status,status,String(offset));assert.equal(b.calls.length,status===200?1:0)}}finally{Date.now=original}
});

test('the exact streamed byte limit accepts the final valid byte and rejects the next',async()=>{
 const base=payload({padding:''}),body=payload({padding:'a'.repeat(32768-Buffer.byteLength(base))});assert.equal(Buffer.byteLength(body),32768);
 for(const [text,status] of [[body,200],[body+' ',413]]){const b=boundary(),r=await run(request(text,{headers:{'Content-Length':'1'}}),envFor(b));assert.equal(r.status,status);assert.equal(b.calls.length,status===200?1:0)}
});
