import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,symlink,rm,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createHash} from 'node:crypto';
const api=await import('../scripts/dependency-inventory.mjs').catch(error=>{if(error.code==='ERR_MODULE_NOT_FOUND')return {};throw error;});
const build=(...args)=>{assert.equal(typeof api.buildInventory,'function','Reusable offline inventory must exist');return api.buildInventory(...args)};
const fixture=()=>{
 const manifest={dependencies:{app:'^1'},devDependencies:{tool:'^1'},optionalDependencies:{opt:'^1'},peerDependencies:{peer:'^2'}};
 const lock={lockfileVersion:3,packages:{'':structuredClone(manifest),'node_modules/app':{version:'1.0.0',license:'MIT',dependencies:{shared:'^1'},optionalDependencies:{missing:'^1'},peerDependencies:{peer:'^2',optionalPeer:'*'},peerDependenciesMeta:{optionalPeer:{optional:true}}},'node_modules/app/node_modules/shared':{version:'1.1.0',license:'ISC',dependencies:{app:'^1'}},'node_modules/tool':{version:'1.0.0',license:'MIT',dev:true,dependencies:{shared:'^2'}},'node_modules/shared':{version:'2.0.0',license:'Apache-2.0'},'node_modules/opt':{version:'1.0.0',license:'MIT',optional:true,os:['darwin'],cpu:['arm64']},'node_modules/peer':{version:'2.0.0',license:'MIT',peer:true},'node_modules/orphan':{version:'1.0.0'}}};
 return {manifest,lock};
};
const entry=(result,path)=>result.entries.find(e=>e.path===path);
async function directory(t){const path=await mkdtemp(join(tmpdir(),'cv-inventory-'));t.after(()=>rm(path,{recursive:true,force:true}));return path;}
async function writeInputs(path,manifest,lock){await writeFile(join(path,'package.json'),JSON.stringify(manifest));await writeFile(join(path,'package-lock.json'),JSON.stringify(lock));}

test('resolves nested shadowing, peers and cycles from each direct declaration without treating flags as runtime reachability',()=>{
 const {manifest,lock}=fixture(),result=build(manifest,lock);
 assert.equal(result.packageEntriesExcludingRoot,7);
 assert.deepEqual(result.direct.map(d=>[d.name,d.kind]),[['app','dependencies'],['tool','devDependencies'],['opt','optionalDependencies'],['peer','peerDependencies']]);
 assert.deepEqual(entry(result,'node_modules/app/node_modules/shared').viaDirectDependencyRoots,['app']);
 assert.deepEqual(entry(result,'node_modules/shared').viaDirectDependencyRoots,['tool']);
 assert.deepEqual(entry(result,'node_modules/peer').viaDirectDependencyRoots,['app','peer']);
 assert.deepEqual(entry(result,'node_modules/orphan').viaDirectDependencyRoots,[]);
 assert.equal(entry(result,'node_modules/tool').devFlag,true);assert.equal(entry(result,'node_modules/opt').optionalFlag,true);assert.deepEqual(entry(result,'node_modules/opt').os,['darwin']);
 assert.match(result.limits,/not executable reachability/i);assert.match(result.limits,/not.*vulnerability/i);assert.match(result.limits,/not.*legal/i);
});
test('reports absent required, optional and optional peer edges with their distinct authority',()=>{
 const {manifest,lock}=fixture();lock.packages['node_modules/tool'].dependencies.required='^9';
 const r=build(manifest,lock);assert.deepEqual(r.unresolvedDependencies.map(e=>[e.from,e.name,e.kind,e.optional]),[['node_modules/app','missing','optionalDependencies',true],['node_modules/app','optionalPeer','peerDependencies',true],['node_modules/tool','required','dependencies',false]]);
});
test('optional declarations override duplicate regular edges while preserving both manifest declarations',()=>{
 const manifest={dependencies:{x:'^1'},optionalDependencies:{x:'^2'}},lock={lockfileVersion:3,packages:{'':{...manifest},'node_modules/x':{version:'2.0.0',license:'MIT'}}};
 const r=build(manifest,lock);assert.equal(r.direct.length,2);assert.equal(r.dependencies.filter(e=>e.from===''&&e.name==='x').length,1);assert.equal(r.dependencies[0].kind,'optionalDependencies');assert.equal(r.dependencies[0].requested,'^2');
});
test('licence metadata is reported as uninterpreted declarations, missing, unknown, reference or unlicensed without inference',()=>{
 const {manifest,lock}=fixture();lock.packages['node_modules/app'].license='MIT OR Apache-2.0';lock.packages['node_modules/tool'].license={type:'MIT'};lock.packages['node_modules/shared'].license='SEE LICENSE IN LICENSE.txt';lock.packages['node_modules/opt'].license='UNLICENSED';lock.packages['node_modules/peer'].license='   ';lock.packages['node_modules/orphan'].license='x\nprivate';
 const r=build(manifest,lock);assert.equal(entry(r,'node_modules/app').licenseStatus,'declared');assert.equal(entry(r,'node_modules/app').licenseDeclared,'MIT OR Apache-2.0');assert.equal(entry(r,'node_modules/tool').licenseStatus,'unknown');assert.equal(entry(r,'node_modules/tool').licenseDeclared,null);assert.equal(entry(r,'node_modules/shared').licenseStatus,'reference');assert.equal(entry(r,'node_modules/opt').licenseStatus,'unlicensed');assert.equal(entry(r,'node_modules/peer').licenseStatus,'missing');assert.equal(entry(r,'node_modules/orphan').licenseStatus,'unknown');assert.equal(entry(r,'node_modules/orphan').licenseDeclared,null);assert.ok(r.licenseReviewRequired.length>=5);
});
test('missing metadata and unsupported lock links are visible, never followed or conflated with installed code',()=>{
 const {manifest,lock}=fixture();lock.packages['node_modules/app']={link:true,resolved:'../../private.env'};
 const r=build(manifest,lock);assert.equal(entry(r,'node_modules/app').supported,false);assert.equal(entry(r,'node_modules/app').version,null);assert.equal(entry(r,'node_modules/orphan').licenseStatus,'missing');assert.deepEqual(r.unsupportedEntries,[{path:'node_modules/app',reason:'link-not-followed'}]);assert.doesNotMatch(JSON.stringify(r),/private\.env/);
});
test('manifest versus lock root drift is explicit, and non-range source declarations are omitted',()=>{
 const {manifest,lock}=fixture();manifest.dependencies.app='git+https://private:secret@example.invalid/repo';
 const r=build(manifest,lock);assert.equal(r.manifestLockMismatch,true);assert.equal(r.direct[0].requested,null);assert.equal(r.direct[0].declarationType,'other-omitted');assert.doesNotMatch(JSON.stringify(r),/private:secret/);
});
test('rejects malformed locks, unsafe paths and dependency maps instead of guessing a package-manager result',()=>{
 const {manifest,lock}=fixture();for(const bad of [{lockfileVersion:1,dependencies:{}},{lockfileVersion:3,packages:{}},{...lock,packages:{...lock.packages,'../private':{}}},{...lock,packages:{...lock.packages,'node_modules/a/../../private':{}}}])assert.throws(()=>build(manifest,bad),/Unsupported|Invalid/);
 assert.throws(()=>build({...manifest,dependencies:[]},lock),/Invalid/);lock.packages['node_modules/app'].dependencies={'../private':'*'};assert.throws(()=>build(manifest,lock),/Invalid/);
});
test('fixed-input reader hashes actual bytes and neither reads nor executes declared package hooks',async t=>{
 assert.equal(typeof api.readInventory,'function');const path=await directory(t),{manifest,lock}=fixture();manifest.scripts={preinstall:'DO_NOT_EXECUTE_PRIVATE_SENTINEL'};await writeInputs(path,manifest,lock);await writeFile(join(path,'.env'),'PRIVATE_ENV_SENTINEL');
 const before=await readFile(join(path,'package-lock.json')),r=await api.readInventory(path);assert.equal(r.source.lockSha256,createHash('sha256').update(before).digest('hex'));assert.equal(r.source.manifestSha256,createHash('sha256').update(await readFile(join(path,'package.json'))).digest('hex'));assert.ok(Number.isFinite(Date.parse(r.generatedAt)));assert.doesNotMatch(JSON.stringify(r),/PRIVATE_ENV|DO_NOT_EXECUTE/);assert.deepEqual(await readFile(join(path,'package-lock.json')),before);
});
test('rejects symlinked, directory, oversized and invalid JSON input with bounded non-content errors',async t=>{
 assert.equal(typeof api.readInventory,'function');const path=await directory(t),outside=await directory(t),{manifest,lock}=fixture();await writeInputs(path,manifest,lock);await writeFile(join(outside,'private'),'PRIVATE_SYMLINK_SENTINEL');
 await rm(join(path,'package.json'));await symlink(join(outside,'private'),join(path,'package.json'));await assert.rejects(api.readInventory(path),/Cannot read package.json/);
 await rm(join(path,'package.json'));await symlink(outside,join(path,'package.json'));await assert.rejects(api.readInventory(path),/Cannot read package.json/);
 await rm(join(path,'package.json'));await mkdir(join(path,'package.json'));await assert.rejects(api.readInventory(path),/Cannot read package.json/);await rm(join(path,'package.json'),{recursive:true});await writeFile(join(path,'package.json'),'x'.repeat(256*1024+1));await assert.rejects(api.readInventory(path),/Cannot read package.json/);
 await writeFile(join(path,'package.json'),'PRIVATE_JSON_SENTINEL invalid');await assert.rejects(api.readInventory(path),/Invalid package.json/);
 await writeFile(join(path,'package.json'),JSON.stringify(manifest));await writeFile(join(path,'package-lock.json'),'x'.repeat(10*1024*1024+1));await assert.rejects(api.readInventory(path),/Cannot read package-lock.json/);
});
test('CLI works with only the script and two input files readable and network/child execution blocked',async t=>{
 const path=await directory(t),{manifest,lock}=fixture();await writeInputs(path,manifest,lock);await writeFile(join(path,'.env'),'PRIVATE_UNREADABLE_ENV');
 const script=resolve('scripts/dependency-inventory.mjs');await stat(script);
 const guard="import http from 'node:http';import https from 'node:https';import net from 'node:net';const fail=()=>{throw Error('Network forbidden')};http.request=http.get=https.request=https.get=net.connect=net.createConnection=globalThis.fetch=fail;";
 const {stdout}=await promisify(execFile)(process.execPath,['--permission','--allow-fs-read='+script,'--allow-fs-read='+join(path,'package.json'),'--allow-fs-read='+join(path,'package-lock.json'),'--import','data:text/javascript,'+encodeURIComponent(guard),script,path],{env:{PATH:'/usr/bin:/bin',PRIVATE_ENV:'PRIVATE_PROCESS_ENV'},maxBuffer:2*1024*1024});
 const r=JSON.parse(stdout);assert.equal(r.packageEntriesExcludingRoot,7);assert.doesNotMatch(stdout,/PRIVATE_PROCESS|PRIVATE_UNREADABLE/);assert.equal(r.source.lockfileVersion,3);
});
