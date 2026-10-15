import test from 'node:test';import assert from 'node:assert/strict';
import worker from '../admin/worker.mjs';
import {validateStoredContent} from '../server/content.mjs';
import {defaultContent} from '../src/content/model.mjs';
import {onRequest} from '../functions/_middleware.js';
test('admin assets and API fail closed without configuration',async()=>{for(const p of ['/','/assets/app.js','/content.json','/api/content','/api/session'])assert.equal((await worker.fetch(new Request('https://admin.customvibe.co.za'+p),{})).status,503)});
test('public never forwards admin routes or write APIs even with site gate off',async()=>{for(const p of ['/admin','/api/content','/internal/content','/server/auth.mjs','/.env','/backup.sql']){const r=await onRequest({request:new Request('https://customvibe.co.za'+p),env:{SITE_GATE_ENABLED:'false'},next:()=>{throw Error('Must not reach assets')}});assert.equal(r.status,404)}});
test('server rejects external images, traversal, spoofed image bytes and excessive payload',()=>{for(const image of ['https://attacker.invalid/a.png','/assets/../secret','data:image/png;base64,PGh0bWw+','data:image/svg+xml;base64,AAAA']){const c=structuredClone(defaultContent);c.images.logo=image;assert.throws(()=>validateStoredContent(c))}assert.doesNotThrow(()=>validateStoredContent(structuredClone(defaultContent)))});

test('legacy URLs redirect within middleware without exposing content or following an external target',async()=>{for(const [path,target] of [['/design','/studio'],['/quote.html','/checkout'],['/privacy.html','/privacy'],['/products/photos/index.html','/products/photos']]){const r=await onRequest({request:new Request('https://customvibe.co.za'+path+'?next=https://example.invalid'),env:{SITE_GATE_ENABLED:'false'}});assert.equal(r.status,301);assert.equal(new URL(r.headers.get('location')).pathname,target);assert.equal(new URL(r.headers.get('location')).hostname,'customvibe.co.za')}});
