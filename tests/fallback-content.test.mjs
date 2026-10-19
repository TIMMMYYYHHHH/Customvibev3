import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {defaultContent,validateContent} from '../src/content/model.mjs';
import {readContent,validateStoredContent} from '../server/content.mjs';
const api=await import('../scripts/check-fallback-content.mjs').catch(error=>{if(error.code==='ERR_MODULE_NOT_FOUND')return {};throw error});
const inspect=input=>{assert.equal(typeof api.inspectFallbackContent,'function','Read-only fallback checker must exist');return api.inspectFallbackContent(input)};
const root=fileURLToPath(new URL('../',import.meta.url));
const bytes=await readFile(new URL('../data/site-content.json',import.meta.url));
const fallback=JSON.parse(bytes),copy=()=>structuredClone(fallback);

test('committed fallback satisfies both existing validators without requiring equality to model defaults',()=>{
 const input=copy(),before=structuredClone(input),defaults=structuredClone(defaultContent);
 assert.equal(validateContent(input),input);assert.ok(validateStoredContent(input));
 const report=inspect(input);assert.equal(report.valid,true);assert.deepEqual(report.errors,[]);assert.deepEqual(report.structuralDrift,[]);
 assert.ok(report.defaultDifferences.includes('/revision'));assert.ok(report.defaultDifferences.includes('/products/alphabet/details'));
 assert.deepEqual(input,before);assert.deepEqual(defaultContent,defaults);
});

for(const [name,change] of [
 ['server-inadmissible image',c=>{c.images.logo='https://example.invalid/logo.png'}],
 ['duplicate product ID',c=>{c.products.push(structuredClone(c.products[0]))}],
 ['missing photos',c=>{c.products=c.products.filter(p=>p.id!=='photos')}],
 ['missing puzzle',c=>{c.products=c.products.filter(p=>p.id!=='puzzle')}],
 ['wrong built-in count',c=>{c.products[0].count=25}],
 ['wrong print version',c=>{c.products[0].printVersion=2}]
])test(`raw fallback rejects ${name} before any collection upgrade can conceal it`,()=>{
 const input=copy();change(input);const before=structuredClone(input),r=inspect(input);
 assert.equal(r.valid,false);assert.ok(r.errors.length>0);assert.deepEqual(input,before);
});

test('valid legacy metadata reports required structural drift using the existing upgrade contract',()=>{
 const input=copy(),p=input.products[0];Object.assign(p,{pricingMode:'fixed',count:25,printVersion:2,artworkEdition:0,priceCents:5000});
 assert.equal(validateContent(input),input);const before=structuredClone(input),r=inspect(input);
 assert.deepEqual(r.errors,[]);assert.equal(r.valid,false);
 for(const field of ['count','pricingMode','printVersion','artworkEdition'])assert.ok(r.structuralDrift.some(d=>d.id==='alphabet'&&d.field===field),field);
 assert.deepEqual(input,before);
});

test('a missing non-core built-in is reported without silently appending it to the fallback',()=>{
 const input=copy();input.products=input.products.filter(p=>p.id!=='noughts-crosses');assert.equal(validateContent(input),input);
 const r=inspect(input);assert.equal(r.valid,false);assert.deepEqual(r.errors,[]);
 assert.ok(r.structuralDrift.some(d=>d.id==='noughts-crosses'&&d.field==='id'));assert.equal(input.products.some(p=>p.id==='noughts-crosses'),false);
});

test('legal owner copy, status, prices, revision and custom products remain informational and immutable',()=>{
 const input=copy();input.revision=73;input.pricing={single:6000,six:30000,ten:48000};
 Object.assign(input.products[0],{name:'Synthetic owner alphabet',status:'hidden',contents:'Synthetic owner contents'});
 input.products.push({id:'synthetic-extra',name:'Synthetic custom collection',group:'Gifts & occasions',image:input.images.hero0,status:'available',priceCents:9000,count:2,contents:'Synthetic contents'});
 const before=structuredClone(input),defaults=structuredClone(defaultContent),r=inspect(input);
 assert.equal(r.valid,true);assert.deepEqual(r.errors,[]);assert.deepEqual(r.structuralDrift,[]);
 for(const path of ['/revision','/pricing/single','/products/alphabet/name','/products/alphabet/status','/products/synthetic-extra'])assert.ok(r.defaultDifferences.includes(path),path);
 assert.deepEqual(input,before);assert.deepEqual(defaultContent,defaults);
 assert.equal(inspect(null).valid,false);
});

function sqliteCatalogue(t,body){
 const sql=new DatabaseSync(':memory:');sql.exec('CREATE TABLE content (id INTEGER PRIMARY KEY CHECK(id=1), revision INTEGER NOT NULL, body TEXT NOT NULL)');
 if(body!==undefined)sql.prepare('INSERT INTO content VALUES(1,73,?)').run(body);
 t.after(()=>sql.close());let writeAttempts=0;
 const db={prepare(query){return {async first(){return sql.prepare(query).get()||null},async run(){writeAttempts++;throw Error('No writes permitted during catalogue reads')}}},async batch(){writeAttempts++;throw Error('No writes permitted during catalogue reads')}};
 const snapshot=()=>({rows:sql.prepare('SELECT * FROM content').all(),changes:sql.prepare('SELECT total_changes() AS n').get().n,writeAttempts});
 return {db,snapshot};
}

test('empty actual SQLite storage reads fallback without initializing or writing a catalogue row',async t=>{
 const h=sqliteCatalogue(t),before=h.snapshot(),input=copy(),original=structuredClone(input);
 assert.deepEqual(await readContent(h.db,input),validateStoredContent(original));assert.deepEqual(h.snapshot(),before);assert.deepEqual(input,original);
 t.diagnostic('Real SQLite: empty content table stayed empty; total_changes and write attempts unchanged');
});

test('actual stored catalogue wins over divergent and invalid fallbacks without any SQL writes',async t=>{
 const stored=copy();stored.revision=73;Object.assign(stored.products[0],{name:'Synthetic stored owner copy',status:'hidden',contents:'Synthetic stored contents'});
 const h=sqliteCatalogue(t,JSON.stringify(stored)),before=h.snapshot(),divergent=copy();divergent.products[0].name='Synthetic fallback must not win';
 for(const input of [divergent,{version:999,products:[]}]){
  const original=structuredClone(input);assert.deepEqual(await readContent(h.db,input),validateStoredContent(stored));assert.deepEqual(input,original);assert.deepEqual(h.snapshot(),before);
 }
 t.diagnostic('Real SQLite: stored revision73, owner fields and raw row retained over both fallback inputs; zero read-path writes');
});

test('corrupt actual stored data preserves failure instead of falling back, repairing or writing',async t=>{
 for(const body of ['not JSON',JSON.stringify({version:999,products:[]})]){
  const h=sqliteCatalogue(t,body),before=h.snapshot(),input=copy(),original=structuredClone(input);
  await assert.rejects(readContent(h.db,input));assert.deepEqual(h.snapshot(),before);assert.deepEqual(input,original);
 }
 t.diagnostic('Real SQLite: malformed JSON and invalid stored schema both reject; original rows and total_changes retained');
});

test('actual CLI reports the fixed module-relative fallback with network, writes and child execution unavailable',async()=>{
 const files=['scripts/check-fallback-content.mjs','src/content/model.mjs','data/site-content.json'];
 const hashes=await Promise.all(files.map(async path=>createHash('sha256').update(await readFile(join(root,path))).digest('hex')));
 const guard="import http from 'node:http';import https from 'node:https';import net from 'node:net';const fail=()=>{throw Error('Network forbidden')};http.request=http.get=https.request=https.get=net.connect=net.createConnection=globalThis.fetch=fail;";
 const script=join(root,files[0]);
 const args=['--permission',...['scripts/check-fallback-content.mjs','src/','server/content.mjs','node_modules/','data/site-content.json'].map(path=>'--allow-fs-read='+join(root,path)),'--import','data:text/javascript,'+encodeURIComponent(guard),script];
 const {stdout}=await promisify(execFile)(process.execPath,args,{cwd:tmpdir(),env:{PATH:'/usr/bin:/bin'},maxBuffer:1024*1024});
 const report=JSON.parse(stdout);assert.equal(report.valid,true);assert.deepEqual(report.structuralDrift,[]);assert.ok(report.defaultDifferences.includes('/revision'));
 assert.deepEqual(await Promise.all(files.map(async path=>createHash('sha256').update(await readFile(join(root,path))).digest('hex'))),hashes);
});
