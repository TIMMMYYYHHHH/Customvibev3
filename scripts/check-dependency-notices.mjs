// Explicit release check. Does not install packages, change notices or publish anything.
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';

for(const argument of process.argv.slice(2))assert.ok(['--outputs','--bundles'].includes(argument),`Unknown check option: ${argument}`);
const root=new URL('../',import.meta.url);
const read=path=>readFile(new URL(path,root),'utf8');
const inventory=JSON.parse(await read('docs/third-party-notices.json'));
const notices=await read('public/third-party-notices.txt');
const lock=JSON.parse(await read('package-lock.json'));
for(const entry of inventory.notices){
 const source=await read(entry.source);
 assert.equal(createHash('sha256').update(source).digest('hex'),entry.sourceSha256,`${entry.id}: review changed licence source`);
 if(entry.distribution){
  assert.equal(lock.packages['node_modules/'+entry.distribution]?.version,entry.version,`${entry.id}: lockfile changed`);
  assert.equal(JSON.parse(await read('node_modules/'+entry.distribution+'/package.json')).version,entry.version,`${entry.id}: installed package differs`);
 }
 let excerpt=source;
 if(entry.extract?.before){assert.ok(excerpt.includes(entry.extract.before));excerpt=excerpt.split(entry.extract.before)[0];}
 if(entry.extract?.start){const start=excerpt.indexOf(entry.extract.start);assert.ok(start>=0);excerpt=excerpt.slice(start);const end=excerpt.indexOf(entry.extract.end);assert.ok(end>=0);excerpt=excerpt.slice(0,end);}
 assert.ok(notices.includes(excerpt.trim()),`${entry.id}: missing or altered notice`);
}
for(const font of inventory.fonts){
 const bytes=await readFile(new URL(font.path,root));
 assert.equal(createHash('sha256').update(bytes).digest('hex'),font.sha256,`${font.path}: review changed font`);
 if(font.matches)assert.deepEqual(bytes,await readFile(new URL(font.matches,root)),`${font.path}: distribution mismatch`);
}
if(process.argv.includes('--outputs')){
 for(const app of ['client','admin'])assert.equal(await read(`dist/${app}/third-party-notices.txt`),notices,`${app}: missing or changed output notice`);
 console.log('Both prepared output notice files match the source exactly.');
}
if(process.argv.includes('--bundles')){
 const {build}=await import('vite');
 const packageNotices=new Set(inventory.notices.filter(x=>x.distribution).map(x=>x.distribution));
 const helperNotices=new Set(inventory.notices.flatMap(x=>x.virtualModules||[]));
 for(const [app,config] of [['public','vite.config.mjs'],['admin','vite.admin.config.mjs']]){
  const packages=new Set(),helpers=new Set();
  await build({root:fileURLToPath(root),configFile:fileURLToPath(new URL(config,root)),build:{write:false},plugins:[{name:'check-shipped-notices',generateBundle(_,bundle){
   for(const chunk of Object.values(bundle))if(chunk.type==='chunk')for(const [id,module] of Object.entries(chunk.modules)){
    if(module.renderedLength<=0)continue;
    if(id.includes('/node_modules/')){const parts=id.split('/node_modules/').at(-1).split('/');packages.add(parts[0].startsWith('@')?parts.slice(0,2).join('/'):parts[0]);}
    else if(id.startsWith('\0'))helpers.add(id);
   }
  }}]});
  for(const name of packages)assert.ok(packageNotices.has(name),`${app}: ${name} ships without a recorded notice`);
  for(const name of helpers)assert.ok(helperNotices.has(name),`${app}: generated module ${JSON.stringify(name)} has no notice classification`);
  assert.deepEqual([...packages].sort(),Object.keys(inventory.applications[app].renderedPackageModules).sort(),`${app}: update the measured package inventory`);
  console.log(`${app}: ${packages.size} shipped packages and ${helpers.size} generated helpers covered.`);
 }
}
console.log('Pinned notice sources, versions and font provenance match.');
