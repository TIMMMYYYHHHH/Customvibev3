// Local-only CPU profile of the real storage handler. No email or remote bindings.
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
import {build} from 'esbuild';
import {readFile,readdir,writeFile} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
const bundle=await build({entryPoints:['tests/fixtures/artwork-runtime-worker.mjs'],bundle:true,write:false,format:'esm',platform:'browser',sourcemap:'inline'});
const mf=new Miniflare(convertV4MiniflareOptions({name:'artwork-profile',modules:true,script:bundle.outputFiles[0].text,compatibilityDate:'2026-06-16',host:'127.0.0.1',port:0,inspectorPort:0,cf:false,d1Databases:['DB'],r2Buckets:['ARTWORK'],outboundService:()=>{throw Error('External network forbidden');}}));
let ws;
try{
 const {DB}=await mf.getBindings();
 for(const f of (await readdir('migrations/security')).filter(f=>f.endsWith('.sql')).sort())for(const statement of (await readFile('migrations/security/'+f,'utf8')).split(';').map(s=>s.trim()).filter(Boolean))await DB.prepare(statement).run();
 const url=await mf.getInspectorURL();url.protocol='http:'; const targets=await (await fetch(new URL('/json/list',url))).json();const target=targets.find(t=>t.title.includes('artwork-profile'))||targets[0];
 ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.addEventListener('open',r,{once:true});ws.addEventListener('error',j,{once:true})});
 let nextId=0;const pending=new Map();ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result)}});
 const call=(method,params={})=>new Promise((resolve,reject)=>{const id=++nextId;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))});
 const bytes=new Uint8Array(await readFile(process.argv[2]||'tests/fixtures/print-tile.jpg'));
 assert(bytes.length>0&&bytes.length<=4_000_000,'Fixture must fit the existing per-file limit');
 const count=Math.min(60,Math.floor(32_000_000/bytes.length));
 const id=randomUUID(),owner='a'.repeat(64),key='b'.repeat(64),sha256=createHash('sha256').update(bytes).digest('hex');
 const files=Array.from({length:count},(_,i)=>({size:bytes.length,sha256,proof:false,name:`design-${String(i+1).padStart(2,'0')}-photo.jpg`}));
 const init=await mf.dispatchFetch('http://localhost/artwork/init',{method:'POST',body:JSON.stringify({id,owner,key,files})});assert.equal(init.status,200);await init.arrayBuffer();
 await call('Profiler.enable');await call('Profiler.setSamplingInterval',{interval:100});await call('Profiler.start');
 for(let i=0;i<count;i++){const r=await mf.dispatchFetch('http://localhost/artwork/upload',{method:'POST',headers:{'Content-Type':'image/jpeg','X-Artwork-Id':id,'X-Artwork-Owner':owner,'X-Artwork-Index':String(i)},body:bytes});assert.equal(r.status,200);await r.arrayBuffer();}
 const {profile}=await call('Profiler.stop');await writeFile(process.argv[3]||'/private/tmp/artwork-runtime.cpuprofile',JSON.stringify(profile));
 const nodes=new Map(profile.nodes.map(n=>[n.id,n]));const totals=new Map();for(let i=0;i<(profile.samples||[]).length;i++){const n=nodes.get(profile.samples[i]),f=n.callFrame;const label=`${f.functionName||'(anonymous)'} ${f.url}:${f.lineNumber+1}`;totals.set(label,(totals.get(label)||0)+(profile.timeDeltas?.[i]||0));}
 console.log(JSON.stringify({target:target.title,fileBytes:bytes.length,files:count,note:'Sample weights include waiting and scheduling; not hosted CPU measurements',samples:profile.samples.length,top:[...totals].sort((a,b)=>b[1]-a[1]).slice(0,35)},null,2));
}finally{ws?.close();await mf.dispose();}
