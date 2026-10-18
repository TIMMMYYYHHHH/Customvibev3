import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';

test('locker read request is accepted by the Cloudflare runtime without following redirects',async()=>{
 const bundle=await build({stdin:{contents:`
 import {createLockerSource} from './server/lockers.mjs';
 const source=createLockerSource({network:async(url,options)=>{
  const request=new Request(url,options);
  if(request.redirect!=='manual')throw Error('Redirects must not be followed');
  return Response.json([{code:'TEST1',name:'Fictional locker',address:'Example Road',place:{town:'Durban'},latitude:-29.8,longitude:31.04,status:'online',type:{id:2}}]);
 }});
 export default {async fetch(){try{return Response.json(await source({LOCKER_LOOKUP_ENABLED:'true',TCG_LOCKER_API_KEY:'fictional-runtime-key-not-real'}))}catch{return new Response('Unavailable',{status:503})}}};
 `,resolveDir:process.cwd(),sourcefile:'locker-runtime-fixture.mjs'},bundle:true,format:'esm',platform:'browser',write:false});
 const runtime=new Miniflare(convertV4MiniflareOptions({modules:true,script:bundle.outputFiles[0].text,compatibilityDate:'2026-06-16'}));
 try{const response=await runtime.dispatchFetch('https://example.test/');assert.equal(response.status,200);assert.equal((await response.json()).locations[0].id,'TEST1');}finally{await runtime.dispose()}
});
