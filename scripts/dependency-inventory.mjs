// Offline declared-metadata inventory. No package code, shell, network or node_modules reads.
import {open} from 'node:fs/promises';
import {constants} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const kinds=['dependencies','devDependencies','optionalDependencies','peerDependencies'];
const record=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const packageName=name=>typeof name==='string'&&/^(?:@[A-Za-z0-9_~.-]+\/)?[A-Za-z0-9_~.-]+$/.test(name)&&name.split('/').every(p=>!['.','..','@.','@..'].includes(p));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const limits='Declared metadata only: lock graph is not executable reachability or installed/bundled code evidence; not vulnerability clearance, SPDX validation or legal compatibility advice. Licence texts are not read.';
function declarations(value){
 if(value===undefined)return {};
 if(!record(value)||Object.entries(value).some(([name,range])=>!packageName(name)||typeof range!=='string'))throw Error('Invalid dependency declarations');
 return value;
}
function validateMaps(value){for(const kind of kinds)declarations(value[kind]);}
const requested=value=>/^[A-Za-z0-9~^<>=*.+| _-]{1,200}$/.test(value)?value:null;
function licence(value){
 if(value===undefined||value===null||typeof value==='string'&&!value.trim())return {licenseDeclared:null,licenseStatus:'missing'};
 if(typeof value!=='string'||value.length>512||/[\x00-\x1f\x7f]/.test(value))return {licenseDeclared:null,licenseStatus:'unknown'};
 return {licenseDeclared:value,licenseStatus:value==='UNLICENSED'?'unlicensed':/^SEE LICEN[CS]E IN /i.test(value)?'reference':'declared'};
}
function resolveDependency(packages,from,name){
 let at=from;
 while(true){
  const candidate=(at?at+'/':'')+'node_modules/'+name;
  if(Object.hasOwn(packages,candidate))return candidate;
  if(!at)return null;
  const index=at.lastIndexOf('/node_modules/');
  at=index>=0?at.slice(0,index):'';
 }
}
function edges(packages,from,value,root=false){
 const byName=new Map();
 // Optional dependencies override regular declarations; actual versions come only from lock paths.
 for(const kind of ['peerDependencies',...(root?['devDependencies']:[]),'dependencies','optionalDependencies']){
  for(const [name,range] of Object.entries(declarations(value[kind])))byName.set(name,{
   from,name,kind,requested:requested(range),
   optional:kind==='optionalDependencies'||kind==='peerDependencies'&&value.peerDependenciesMeta?.[name]?.optional===true,
   resolvedPath:resolveDependency(packages,from,name)
  });
 }
 return [...byName.values()].sort((a,b)=>a.name.localeCompare(b.name,'en'));
}
export function buildInventory(manifest,lock){
 if(!record(manifest)||!record(lock)||![2,3].includes(lock.lockfileVersion)||!record(lock.packages)||!record(lock.packages['']))throw Error('Unsupported lockfile: npm lockfileVersion 2 or 3 with root packages metadata required');
 validateMaps(manifest);const packages=lock.packages,paths=Object.keys(packages).filter(Boolean).sort();
 for(const path of paths){
  if(!path.startsWith('node_modules/')||path.slice(13).split('/node_modules/').some(name=>!packageName(name)))throw Error('Unsupported lock package path');
  if(!record(packages[path]))throw Error('Invalid lock package metadata');
  validateMaps(packages[path]);
 }
 validateMaps(packages['']);
 const direct=kinds.flatMap(kind=>Object.entries(declarations(manifest[kind]))
  .sort(([a],[b])=>a.localeCompare(b,'en')).map(([name,range])=>({
   name,kind,requested:requested(range),
   declarationType:requested(range)===null?'other-omitted':'range-or-tag',
   resolvedPath:resolveDependency(packages,'',name)
  })));
 const dependencies=[...edges(packages,'',manifest,true),...paths.flatMap(path=>packages[path].link?[]:edges(packages,path,packages[path]))];
 const adjacency=new Map();
 for(const edge of dependencies){
  if(!adjacency.has(edge.from))adjacency.set(edge.from,[]);
  if(edge.resolvedPath)adjacency.get(edge.from).push(edge.resolvedPath);
 }
 const reached=new Map();
 for(const root of direct){
  const queue=root.resolvedPath?[root.resolvedPath]:[],seen=new Set();
  while(queue.length){
   const path=queue.pop();if(seen.has(path))continue;seen.add(path);
   if(!reached.has(path))reached.set(path,new Set());
   reached.get(path).add(root.name);queue.push(...(adjacency.get(path)||[]));
  }
 }
 const entries=paths.map(path=>{
  const value=packages[path],info=licence(value.license);
  const directDeclarationKinds=direct.filter(d=>d.resolvedPath===path).map(d=>d.kind);
  return {
   path,name:path.split('/node_modules/').at(-1).replace(/^node_modules\//,''),
   version:typeof value.version==='string'&&/^[A-Za-z0-9.+_-]{1,128}$/.test(value.version)?value.version:null,
   ...info,supported:!value.link,directDeclarationKinds,transitive:directDeclarationKinds.length===0,
   devFlag:value.dev===true,optionalFlag:value.optional===true,
   devOptionalFlag:value.devOptional===true,peerFlag:value.peer===true,
   os:Array.isArray(value.os)?value.os.filter(x=>typeof x==='string'&&/^[A-Za-z0-9_!-]{1,40}$/.test(x)):null,
   cpu:Array.isArray(value.cpu)?value.cpu.filter(x=>typeof x==='string'&&/^[A-Za-z0-9_!-]{1,40}$/.test(x)):null,
   viaDirectDependencyRoots:[...(reached.get(path)||[])].sort()
  };
 });
 const counts=new Map();for(const entry of entries)counts.set(entry.licenseDeclared??'UNKNOWN',(counts.get(entry.licenseDeclared??'UNKNOWN')||0)+1);
 const normalized=value=>kinds.map(kind=>Object.entries(declarations(value[kind])).sort(([a],[b])=>a.localeCompare(b,'en')));
 return {
  schemaVersion:1,limits,packageEntriesExcludingRoot:entries.length,flagsOverlap:true,
  manifestLockMismatch:JSON.stringify(normalized(manifest))!==JSON.stringify(normalized(packages[''])),
  direct,entries,dependencies,
  unresolvedDependencies:dependencies.filter(edge=>edge.resolvedPath===null),
  unsupportedEntries:entries.filter(entry=>!entry.supported).map(entry=>({path:entry.path,reason:'link-not-followed'})),
  licenseReviewRequired:entries.filter(entry=>entry.licenseStatus!=='declared').map(({path,licenseStatus})=>({path,licenseStatus})),
  licenseCounts:Object.fromEntries([...counts].sort(([a],[b])=>a.localeCompare(b,'en')))
 };
}
async function readInput(root,name,limit){
 let handle,bytes;
 try{
  handle=await open(join(root,name),constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);
  const info=await handle.stat();if(!info.isFile()||info.size>limit)throw Error('Input bound');
  // Bound the actual read too, including a file that grows after stat.
  const buffer=Buffer.alloc(limit+1);let offset=0;
  while(offset<buffer.length){const {bytesRead}=await handle.read(buffer,offset,buffer.length-offset,null);if(!bytesRead)break;offset+=bytesRead;}
  if(offset>limit)throw Error('Input bound');bytes=buffer.subarray(0,offset);
 }catch{throw Error('Cannot read '+name+': a bounded regular non-symlink input is required');}finally{await handle?.close();}
 let value;try{value=JSON.parse(bytes.toString('utf8'));}catch{throw Error('Invalid '+name+': JSON object required');}
 return {bytes,value};
}
export async function readInventory(root){
 const directory=resolve(root),manifest=await readInput(directory,'package.json',256*1024),lock=await readInput(directory,'package-lock.json',10*1024*1024);
 return {...buildInventory(manifest.value,lock.value),generatedAt:new Date().toISOString(),source:{manifestSha256:hash(manifest.bytes),lockSha256:hash(lock.bytes),lockfileVersion:lock.value.lockfileVersion}};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{if(process.argv.length>3)throw Error('Usage: node scripts/dependency-inventory.mjs [repository-root]');process.stdout.write(JSON.stringify(await readInventory(process.argv[2]||'.'),null,2)+'\n');}
 catch(error){console.error(error.message);process.exitCode=1;}
}
