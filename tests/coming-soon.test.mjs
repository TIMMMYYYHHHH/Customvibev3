import test from 'node:test';
import assert from 'node:assert/strict';
import {onRequest} from '../functions/_middleware.js';
import {gate} from '../server/auth.mjs';

test('only explicit coming soon presentation assets can be served without a site session',async()=>{
 for(const path of ['/coming-soon/original-sunglasses.webp','/coming-soon/original-together.webp','/coming-soon/original-beach.webp','/coming-soon/original-wedding.webp','/coming-soon/styles.css','/coming-soon/login.js','/coming-soon/scene-desktop-v3.webp','/coming-soon/scene-mobile-v3.webp','/coming-soon/logo.png','/coming-soon/fredoka.woff2','/coming-soon/dm-sans.woff2']){
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

// Protect the owner's photo identity from accidental regenerated replacements.
test('coming soon photos remain byte-identical to the original product files',async()=>{
 const {readFile}=await import('node:fs/promises');
 const {renderScene}=await import('../server/coming-soon-scenes.mjs');
 for(const [name,source] of [['sunglasses','05-sunglasses'],['together','04-pink-group'],['beach','03-beach'],['wedding','02-wedding']]){
  const original=await readFile(new URL('../public/assets/cutouts/'+source+'-square.webp',import.meta.url));
  const served=await readFile(new URL('../public/coming-soon/original-'+name+'.webp',import.meta.url));
  assert.deepEqual(served,original,name+' must never be regenerated or retouched');
  for(const size of ['desktop','mobile']) assert.ok(renderScene(size).includes('data-original-photo="'+name+'"'));
 }
});
