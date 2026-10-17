// Run from repository root. Uses only disposable local workerd/D1/R2 instances.
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
import {build} from 'esbuild';
import {readFile,readdir,writeFile} from 'node:fs/promises';
import {performance} from 'node:perf_hooks';
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {validateJpeg} from '../server/jpeg.mjs';

const output=process.argv[2];
const bundled=await build({entryPoints:['tests/fixtures/artwork-runtime-worker.mjs'],bundle:true,write:false,format:'esm',platform:'browser'});
const base=new Uint8Array(await readFile('tests/fixtures/print-tile.jpg'));
// Synthetic entropy padding exercises byte handling, not image decoding/print quality.
function bytesOf(size){const out=new Uint8Array(size);out.set(base.subarray(0,base.length-2));out.set([255,217],size-2);validateJpeg(out,false,4000000);return out;}
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const results=[];
{
 for(const scenario of [{name:'60 files at 32 MB',files:60,bytes:32000000},{name:'eight 4 MB files',files:8,bytes:32000000}]){
  const mf=new Miniflare(convertV4MiniflareOptions({modules:true,script:bundled.outputFiles[0].text,compatibilityDate:'2026-06-16',host:'127.0.0.1',port:0,cf:false,d1Databases:['DB'],r2Buckets:['ARTWORK'],outboundService:()=>{throw Error('External network is forbidden in this fixture');}}));
  try{
   const {DB}=await mf.getBindings();
   for(const filename of (await readdir('migrations/security')).filter(f=>f.endsWith('.sql')).sort()){
    const sql=await readFile('migrations/security/'+filename,'utf8');
    for(const statement of sql.split(';').map(s=>s.trim()).filter(Boolean))await DB.prepare(statement).run();
   }
   const id=randomUUID(),owner='a'.repeat(64),key='b'.repeat(64),sizes=Array.from({length:scenario.files},(_,i)=>Math.floor(scenario.bytes/scenario.files)+(i<scenario.bytes%scenario.files?1:0));
   const cache=new Map(sizes.map(size=>[size,bytesOf(size)]));
   const files=sizes.map((size,i)=>({size,sha256:hash(cache.get(size)),proof:false,name:`design-${String(i+1).padStart(2,'0')}-photo.jpg`}));
   const phases=[];
   async function call(path,body,headers={}){
    const start=performance.now();const response=await mf.dispatchFetch('http://localhost/artwork/'+path,{method:'POST',body:body instanceof Uint8Array?body:JSON.stringify(body),headers:{'Content-Type':'application/json',...headers}});
    const data=new Uint8Array(await response.arrayBuffer());const elapsedMs=performance.now()-start;
    const metrics=JSON.parse(response.headers.get('X-Local-Measurement'));
    phases.push({phase:path,status:response.status,elapsedMs,...metrics});return {response,data};
   }
   assert.equal((await call('init',{id,owner,key,files})).response.status,200);
   const init=phases.at(-1);
   // Exercise the actual workerd reader, not only manifest admission checks.
   for(const delta of [-1,1]){
    const invalid=new Uint8Array(sizes[0]+delta);
    assert.equal((await call('upload',invalid,{'Content-Type':'image/jpeg','X-Artwork-Id':id,'X-Artwork-Owner':owner,'X-Artwork-Index':'0'})).response.status,400);
    assert.equal(phases.at(-1).writes,0);
   }

   for(let i=0;i<files.length;i++)assert.equal((await call('upload',cache.get(sizes[i]),{'Content-Type':'image/jpeg','X-Artwork-Id':id,'X-Artwork-Owner':owner,'X-Artwork-Index':String(i)})).response.status,200);
   assert.equal((await call('complete',{id,owner,files})).response.status,200);
   const complete=phases.at(-1);
   const downloaded=await call('download',{id,index:0});assert.equal(downloaded.response.status,200);assert.equal(hash(downloaded.data),files[0].sha256);
   assert.equal((await call('upload',cache.get(sizes[0]),{'Content-Type':'image/jpeg','X-Artwork-Id':id,'X-Artwork-Owner':owner,'X-Artwork-Index':'0'})).response.status,200);
   const retry=phases.at(-1);assert.equal(retry.writes,0);
   const overFiles=[...files,...Array.from({length:61-files.length},()=>files[0])];
   assert.equal((await call('init',{id:randomUUID(),owner,key,files:overFiles})).response.status,400);
   assert.equal(phases.at(-1).statements,0);
   assert.equal((await call('init',{id:randomUUID(),owner,key,files:[{...files[0],size:4000001}]})).response.status,400);
   assert.equal(phases.at(-1).statements,0);
   // Exhaust only the disposable local budget, then verify admission fails closed.
   await DB.prepare("UPDATE artwork_usage SET amount=500000000 WHERE id='retained'").run();
   assert.equal((await call('init',{id:randomUUID(),owner,key,files})).response.status,429);
   assert.equal(phases.at(-1).writes,0);
   assert.equal((await call('init',{id:randomUUID(),owner,key,files:[...files.slice(0,-1),{...files.at(-1),size:files.at(-1).size+1}]})).response.status,400);
   assert.equal(phases.at(-1).statements,0);
   const upload=phases.filter(p=>p.phase==='upload'&&p.status===200).slice(0,scenario.files),times=upload.map(p=>p.elapsedMs).sort((a,b)=>a-b);
   results.push({...scenario,init,complete,upload:{count:times.length,totalMs:times.reduce((a,b)=>a+b,0),medianMs:times[Math.floor(times.length/2)],p95Ms:times[Math.ceil(times.length*.95)-1],maxMs:times.at(-1),maxD1Statements:Math.max(...upload.map(p=>p.statements)),maxD1Calls:Math.max(...upload.map(p=>p.calls))},retry,totals:phases.reduce((a,p)=>({statements:a.statements+p.statements,calls:a.calls+p.calls,r2Writes:a.r2Writes+p.writes,r2Reads:a.r2Reads+p.reads}),{statements:0,calls:0,r2Writes:0,r2Reads:0}),boundaryChecks:'61 files, 32 MB + 1 byte and 4 MB + 1 byte rejected before DB; exhausted retained-storage quota rejects without R2 writes',phases});
  }finally{await mf.dispose();}
 }
 const report={environment:'local workerd with local D1/R2, not hosted Cloudflare timing',runtime:process.version,measuredAt:new Date().toISOString(),hostedCpuMeasured:false,hostedMemoryMeasured:false,results};
 if(output)await writeFile(output,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({...report,results:results.map(({phases,...r})=>r)},null,2));
}
