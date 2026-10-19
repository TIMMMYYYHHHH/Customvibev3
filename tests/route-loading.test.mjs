import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {renderDocument} from '../server/render.mjs';
import {defaultContent} from '../src/content/model.mjs';
const api=await import('../src/routes/client-views.mjs').catch(()=>({}));
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no});return {promise,resolve,reject}};
test('concurrent route requests reuse an import and expose the same component on revisit',async()=>{
 assert.equal(typeof api.createClientRouteViews,'function','route registry is not implemented');
 const gate=deferred();let calls=0;const Component=()=>null;
 const views=api.createClientRouteViews({editor:()=>{calls++;return gate.promise}});
 assert.equal(views.peek('editor'),null);
 const first=views.load('editor'),second=views.load('editor');
 assert.equal(first,second);await Promise.resolve();assert.equal(calls,1);
 gate.resolve(Component);assert.equal(await first,Component);assert.equal(views.peek('editor'),Component);
 assert.equal(await views.load('editor'),Component);assert.equal(calls,1);
});
test('a failed or synchronously throwing import can be retried without poisoning other routes',async()=>{
 assert.equal(typeof api.createClientRouteViews,'function','route registry is not implemented');
 let attempts=0;const Component=()=>null;
 const views=api.createClientRouteViews({editor:()=>{if(++attempts===1)throw Error('synthetic chunk failure');return Promise.resolve(Component)},checkout:()=>Promise.resolve(Component)});
 await assert.rejects(views.load('editor'),/synthetic chunk failure/);assert.equal(views.peek('editor'),null);
 assert.equal(await views.load('checkout'),Component);assert.equal(await views.load('editor'),Component);assert.equal(attempts,2);
});
test('an unknown resource fails explicitly rather than importing an arbitrary path',async()=>{
 assert.equal(typeof api.createClientRouteViews,'function','route registry is not implemented');
 const views=api.createClientRouteViews({});assert.equal(views.peek('../admin'),null);
 await assert.rejects(views.load('../admin'),/Unknown page/);
});
const template=await readFile('dist/client/index.html','utf8');
test('synchronous route documents contain real studio and empty purchase content before client code',()=>{
 for(const [path,text] of [['/studio','Upload photos'],['/studio/handy','Nine Handy at home designs'],['/studio/business','Business magnets'],['/basket','Your basket'],['/checkout','Your basket is empty.']]){
  const {html,status}=renderDocument(template,path,defaultContent,'local-nonce');assert.equal(status,200);assert.ok(html.includes(text),path);assert.doesNotMatch(html,/Opening this page|This page could not load|The server did not finish this Suspense boundary/);
 }
});

test('entry accounting includes static dependencies and preloads but excludes demand imports',async()=>{
 const measure=await import('../scripts/measure-entry-assets.mjs').catch(()=>({}));assert.equal(typeof measure.measureEntryAssets,'function','entry measurement is not implemented');
 const {mkdtemp,writeFile,mkdir,rm}=await import('node:fs/promises');const {tmpdir}=await import('node:os');const {join}=await import('node:path');const {gzipSync}=await import('node:zlib');
 const root=await mkdtemp(join(tmpdir(),'cv-entry-test-'));
 try{await mkdir(join(root,'assets'));const files={'index.html':'<script type="module" src="/assets/main.js"></script><link rel="modulepreload" href="/assets/preload.js"><link rel="stylesheet" href="/assets/main.css">','assets/main.js':'import{value}from"./shared.js";import("./deferred.js");','assets/shared.js':'export const value=1;','assets/preload.js':'export const preloaded=1;','assets/deferred.js':'export const deferred=1;','assets/main.css':'body{color:black}'};
 for(const [path,text]of Object.entries(files))await writeFile(join(root,path),text);
 const result=await measure.measureEntryAssets(join(root,'index.html'));assert.deepEqual(result.files.map(f=>f.path).sort(),['assets/main.css','assets/main.js','assets/preload.js','assets/shared.js']);assert.equal(result.js.raw,files['assets/main.js'].length+files['assets/shared.js'].length+files['assets/preload.js'].length);assert.equal(result.css.gzip,gzipSync(files['assets/main.css']).length);
 }finally{await rm(root,{recursive:true,force:true})}
});
