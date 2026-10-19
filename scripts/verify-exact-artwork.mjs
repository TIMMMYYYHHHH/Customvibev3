// Usage: NODE22 scripts/verify-exact-artwork.mjs /absolute/path/playwright/index.mjs [evidence-directory]
import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {exactArtworkService} from '../tests/fixtures/exact-artwork-service.mjs';
const {chromium}=await import(process.argv[2]),out=resolve(process.argv[3]||'local-evidence/exact-artwork');await mkdir(out,{recursive:true});
const backend=exactArtworkService(),blocked=[],errors=[],requests=[];
// Fail closed even if a service accidentally introduces an outbound fetch.
const originalFetch=globalThis.fetch;globalThis.fetch=async()=>{throw Error('External fetch forbidden in disconnected fixture')};
const fixturePlugin={name:'disconnected-acceptance',configureServer(server){server.middlewares.use(async(req,res,next)=>{
 const path=new URL(req.url,'http://127.0.0.1').pathname;
 if(path==='/proof')req.url='/tests/fixtures/proof-review.html';
 if(path.startsWith('/assets/')){try{assert.ok(!path.includes('..'));const data=await readFile(resolve('public'+path));res.writeHead(200,{'Content-Type':path.endsWith('.webp')?'image/webp':path.endsWith('.png')?'image/png':path.endsWith('.svg')?'image/svg+xml':'application/octet-stream'});res.end(data)}catch{res.writeHead(404);res.end()}return;}
 if(!path.startsWith('/__acceptance/')&&!path.startsWith('/api/'))return next();
 try{let raw='',size=0;for await(const chunk of req){size+=chunk.length;if(size>32000000)throw Error('Fixture request too large');raw+=chunk}const response=await backend.handle(path,req.method,raw?JSON.parse(raw):{});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()))}catch(e){errors.push(e.stack);res.writeHead(500,{'Content-Type':'application/json'});res.end(JSON.stringify({error:e.message}))}
 })}};
const server=await createServer({configFile:false,publicDir:false,plugins:[fixturePlugin,react()],server:{host:'127.0.0.1',port:0},cacheDir:resolve('node_modules/.vite-exact-artwork')});let browser;
try{await server.listen();const address=server.httpServer.address(),origin='http://127.0.0.1:'+address.port;
 browser=await chromium.launch({channel:'chrome',headless:true});const context=await browser.newContext({acceptDownloads:true});
 await context.route('**/*',route=>{const u=new URL(route.request().url());if(u.origin!==origin){blocked.push(u.origin);return route.abort()}requests.push({method:route.request().method(),path:u.pathname});return route.continue()});
 context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
 const page=await context.newPage();page.setDefaultTimeout(60000);await page.goto(origin+'/tests/fixtures/artwork-controlled-order.html');await page.getByRole('button',{name:'Prepare mixed order'}).click();await page.waitForFunction(()=>window.acceptance||window.acceptanceError);assert.equal(await page.evaluate(()=>window.acceptanceError),undefined);
 const initial=await page.evaluate(()=>({exports:window.acceptance.exports,result:window.acceptance.result,orientation:window.acceptance.orientation,rowMajorTiles:window.acceptance.rowMajorTiles,stalePreviewRegenerated:window.acceptance.stalePreviewRegenerated}));
 await page.screenshot({path:resolve(out,'mixed-exports.png'),fullPage:true});
 async function approve(){const review=await context.newPage();await review.goto(origin+'/tests/fixtures/proof-review.html');await review.getByRole('heading',{name:'Ready for your review'}).waitFor();assert.equal(await review.locator('figure').count(),17);await review.getByRole('checkbox').check();await review.getByRole('button',{name:'Approve for printing',exact:true}).click();await review.getByRole('heading',{name:'Approved for printing'}).waitFor();await review.screenshot({path:resolve(out,'approved-revision-'+(await review.locator('main').innerText()).match(/Revision (\d+)/)[1]+'.png'),fullPage:true});await review.close()}
 await approve();const replacement=await page.evaluate(()=>window.acceptance.replace());await approve();
 const result=await page.evaluate(async()=>{const r=await fetch('/__acceptance/finish',{method:'POST'});if(!r.ok)throw Error(await r.text());return r.json()});
 // Optional destructive control touches only this fixture's in-memory object.
 if(process.argv.includes('--corrupt-local-download')){const file=result.order.proof.items[0].files[0],object=backend.env.objects.get(file.requestId+'/'+file.index+'.jpg');object[100]^=1;}
 const pending=page.waitForEvent('download');await page.getByRole('link',{name:'Download current archive'}).click();const downloaded=await pending;const zipPath=resolve(out,'synthetic-order.zip');await downloaded.saveAs(zipPath);
 const archive=JSON.parse(execFileSync('python3',['-c','import zipfile,json,hashlib,sys;z=zipfile.ZipFile(sys.argv[1]);print(json.dumps({"bad":z.testzip(),"hashes":{n:hashlib.sha256(z.read(n)).hexdigest() for n in z.namelist() if n.endswith(".jpg")},"instructions":z.read("print-instructions.txt").decode()}))',zipPath],{encoding:'utf8'}));
 assert.equal(archive.bad,null);const current=result.order.proof.items.flatMap(i=>i.files);assert.equal(Object.keys(archive.hashes).length,17);
 for(const f of current)assert.equal(archive.hashes[f.name],f.sha256,f.name);assert.notEqual(current[0].sha256,initial.exports[0]);for(let i=1;i<17;i++)assert.equal(current[i].sha256,initial.exports[i]);
 for(const wording of ['Revision 2: Approved for printing','36 magnets. Payment status: Unpaid.','2 sets, 9 pieces per set','design-03-alphabet-1.jpg - Print 4 copies','design-03-alphabet-2.jpg - Print 2 copies','design-04-counting-1.jpg - Print 3 copies','design-04-counting-2.jpg - Print 2 copies','SYNTHETIC','https://example.invalid/synthetic-review','Swimming','Family time','CUSTOMER NOTES (not printed on magnets):'])assert.ok(archive.instructions.includes(wording),wording);
 assert.equal((archive.instructions.match(/Preview only/g)||[]).length,1);assert.deepEqual(blocked,[]);assert.deepEqual(errors,[]);
 await writeFile(resolve(out,'results.json'),JSON.stringify({source:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),node:process.version,browser:browser.version(),initial,replacement,result,archive,blockedExternalRequests:blocked,errors,requestCount:requests.length},null,2));console.log('PASS: 17 exact files, 36 magnets, two approved revisions, stored/current/downloaded hashes, orientation/row-major tiles, stale preview regeneration, old capability rejection, unpaid/manual-email safeguards.');
}finally{if(browser)await browser.close();await server.close();globalThis.fetch=originalFetch;backend.env.sql.close()}
