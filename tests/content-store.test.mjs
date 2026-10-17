import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {contentStore} from '../scripts/content-store.mjs';
test('saved content survives a new store instance and stale saves cannot overwrite it',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'cv-content-'));
 try{const path=join(dir,'content.json'),store=contentStore(path);const first=await store.read();first.products[0].name='Alphabet test';const saved=await store.save(first);assert.equal(saved.revision,1);assert.equal((await contentStore(path).read()).products[0].name,'Alphabet test');await assert.rejects(store.save(first),/another tab/);
 const valid=structuredClone(saved),invalid=structuredClone(saved);invalid.products[0].pricingMode='fixed';invalid.products[0].status='available';await assert.rejects(store.save(invalid),/price/i);assert.deepEqual(await store.read(),valid);
 }finally{await rm(dir,{recursive:true,force:true})}
});

test('temporary admin refuses remote and cross-origin writes',async()=>{
 const {contentPlugin}=await import('../scripts/content-store.mjs');let handle;
 contentPlugin(import.meta.url).configureServer({middlewares:{use:fn=>{handle=fn}}});
 for(const [remoteAddress,origin] of [['192.0.2.1','http://localhost:4173'],['127.0.0.1','https://unrelated.example'],['127.0.0.1',undefined]]){
  let body='';const res={setHeader(){},end(v){body=v},statusCode:200};
  await handle({url:'/api/content',method:'PUT',socket:{remoteAddress},headers:{host:'localhost:4173',origin,'x-customvibe-admin':'1'}},res,()=>assert.fail('Unexpected fallthrough'));
  assert.equal(res.statusCode,403);assert.match(body,/local prototype/);
 }
});
