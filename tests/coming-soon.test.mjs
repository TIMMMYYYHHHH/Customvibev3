import test from 'node:test';
import assert from 'node:assert/strict';
import {onRequest} from '../functions/_middleware.js';
import {gate} from '../server/auth.mjs';

test('only explicit coming soon presentation assets can be served without a site session',async()=>{
 for(const path of ['/coming-soon/styles.css','/coming-soon/login.js','/coming-soon/fridge.webp','/coming-soon/logo.png','/coming-soon/fredoka.woff2','/coming-soon/dm-sans.woff2','/coming-soon/sunglasses.webp','/coming-soon/together.webp','/coming-soon/beach.webp']){
  let served=0;
  const response=await onRequest({request:new Request('https://customvibe.co.za'+path),env:{},next:async()=>{served++;return new Response('public presentation asset')}});
  assert.equal(response.status,200,path);assert.equal(served,1);assert.equal(response.headers.has('set-cookie'),false);
  assert.equal(response.headers.get('x-content-type-options'),'nosniff');
  assert.equal((await gate(new Request('https://admin.customvibe.co.za'+path),{},'admin')).response.status,503);
 }
});

test('presentation exceptions never expose unknown assets, storefront data or writes',async()=>{
 for(const path of ['/coming-soon/unknown.js','/coming-soon/../content.json','/coming-soon/secret.json','/content.json','/assets/app.js','/api/forms','/api/order-request','/api/proof','/studio']){
  const response=await onRequest({request:new Request('https://customvibe.co.za'+path),env:{},next:()=>{throw Error('Private content must remain gated')}});
  assert.equal(response.status,503,path);
 }
 const post=await onRequest({request:new Request('https://customvibe.co.za/coming-soon/styles.css',{method:'POST'}),env:{},next:()=>{throw Error('Writes must never be forwarded')}});
 assert.equal(post.status,405);
});
