import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';

test('auth body reader works without loading the installed seasonal theme registry',()=>{
 const script=`
  import {registerHooks} from 'node:module';
  let registryLoaded=false;
  registerHooks({load(url,context,nextLoad){
   if(url.endsWith('/src/seasons/registry.mjs'))registryLoaded=true;
   return nextLoad(url,context);
  }});
  const {boundedBody}=await import(${JSON.stringify(new URL('../server/auth.mjs',import.meta.url).href)});
  const body=await boundedBody(new Request('https://fixture.invalid',{method:'POST',body:'fixture'}),7);
  console.log(JSON.stringify({body,registryLoaded}));
 `;
 const result=spawnSync(process.execPath,['--input-type=module','-e',script],{encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);
 assert.deepEqual(JSON.parse(result.stdout),{body:'fixture',registryLoaded:false});
});
