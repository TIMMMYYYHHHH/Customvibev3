// Real built pages, loopback GETs only, synthetic unsent form values.
// A global print hide of Contact must fail while repeated footer contacts stay hidden.
import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {createServer} from 'node:http';
import {resolve,extname,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const client=resolve(root,process.env.CONTACT_PRINT_CLIENT||'dist/client');
const out=resolve(process.env.CONTACT_PRINT_EVIDENCE||'test-results/contact-print');
const require=createRequire(process.env.PLAYWRIGHT_MODULE||'/Users/timothymorton/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium}=require('playwright');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const checks=[],requests=[],blocked=[],errors=[];
const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.woff2':'font/woff2','.ttf':'font/ttf','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.ico':'image/x-icon'};
let origin,browser;
await mkdir(out,{recursive:true});
globalThis.fetch=async()=>{blocked.push({method:'NODE_FETCH'});throw Error('Disconnected fixture: external fetch denied');};
async function artifactHashes(){
 const files={};
 async function walk(dir){for(const e of await readdir(resolve(client,dir),{withFileTypes:true})){const p=dir?dir+'/'+e.name:e.name;if(e.isDirectory())await walk(p);else files[p]=sha(await readFile(resolve(client,p)));}}
 await walk('');return files;
}
const beforeArtifacts=await artifactHashes();
const server=createServer(async(req,res)=>{
 try{
  const path=new URL(req.url,origin).pathname;requests.push({method:req.method,path});
  if(req.method!=='GET'||path.startsWith('/auth/')){blocked.push({method:req.method,path});res.writeHead(405);return res.end('Denied');}
  if(path==='/api/forms'){res.writeHead(200,{'content-type':'application/json'});return res.end(JSON.stringify({available:true,siteKey:'synthetic',csrf:'synthetic',lockerSearch:false,artworkStorage:true,orderRecords:true}));}
  if(path==='/season.json'){res.writeHead(200,{'content-type':'application/json'});return res.end(JSON.stringify({campaign:null,definition:null,until:null}));}
  if(path.startsWith('/api/')){blocked.push({method:req.method,path});res.writeHead(403);return res.end('Denied API');}
  const rel=path==='/'?'index.html':extname(path)?path.slice(1):path.slice(1)+'.html';
  const file=resolve(client,rel);if(!file.startsWith(client+'/'))throw Error('Unsafe path');
  const body=await readFile(file);res.writeHead(200,{'content-type':types[extname(file)]||'application/octet-stream','cache-control':'no-store'});res.end(body);
 }catch(e){errors.push('SERVER '+e.message);res.writeHead(500);res.end('Fixture error');}
});
const check=(name,pass,observed)=>checks.push({name,pass,observed});
async function pageFor(path){
 const context=await browser.newContext({viewport:{width:1280,height:900},colorScheme:'light',reducedMotion:'reduce',serviceWorkers:'block'});
 await context.route('**/*',route=>{
  const req=route.request(),u=new URL(req.url());
  if(u.origin!==origin||req.method()!=='GET'||u.pathname.startsWith('/auth/')){blocked.push({method:req.method(),path:u.origin+u.pathname});return route.abort();}
  return route.continue();
 });
 await context.routeWebSocket('**/*',socket=>{blocked.push({method:'WEBSOCKET'});socket.close();});
 await context.addInitScript(()=>{window.turnstile={render(_node,options){queueMicrotask(()=>options.callback('synthetic'));return 'local';},remove(){},reset(){}};});
 const page=await context.newPage();page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push('PAGE '+e.message));
 await page.goto(origin+path,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
 return {context,page};
}
try{
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 origin='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({channel:'chrome',headless:true});
 {
  const {context,page}=await pageFor('/contact');
  try{
   await page.getByLabel('Your name',{exact:true}).fill('Synthetic print reviewer');
   await page.getByLabel('Email address',{exact:true}).fill('print-review@example.invalid');
   await page.getByLabel('Your message',{exact:true}).fill('Synthetic unsent print check. No message is submitted.');
   await page.getByRole('heading',{level:1}).click();
   await page.screenshot({path:resolve(out,'contact-screen.png'),fullPage:true});
   const ordinary=await page.locator('.contact-page,.contact-page h1,.contact-direct a,.contact-form,.contact-field input,.contact-field textarea,.contact-form .action,.unified-header,.unified-footer').evaluateAll(es=>es.map(e=>{
    const s=getComputedStyle(e),r=e.getBoundingClientRect();
    return {tag:e.tagName,class:e.className,rect:{x:r.x,y:r.y,width:r.width,height:r.height},style:Object.fromEntries(['display','position','fontFamily','fontSize','fontWeight','lineHeight','color','backgroundColor','border','padding','margin','gap','outline'].map(p=>[p,s[p]]))};
   }));
   await writeFile(resolve(out,'ordinary-contact.json'),JSON.stringify(ordinary,null,2)+'\n');
   if(process.env.CONTACT_PRINT_SCREEN_BASELINE){const prior=JSON.parse(await readFile(resolve(process.env.CONTACT_PRINT_SCREEN_BASELINE),'utf8'));check('ordinary Contact style and geometry unchanged',JSON.stringify(ordinary)===JSON.stringify(prior),{currentSHA256:sha(JSON.stringify(ordinary)),baselineSHA256:sha(JSON.stringify(prior))});}
   await page.emulateMedia({media:'print'});
   const heading=await page.getByRole('heading',{level:1}).isVisible();
   const direct=await page.locator('.contact-page .contact-direct a').isVisible();
   const fields=await page.locator('.contact-page .contact-form input,.contact-page .contact-form textarea').evaluateAll(es=>es.map(e=>({name:e.name,visible:!!e.getClientRects().length,value:e.value})));
   check('standalone Contact heading prints',heading,{visible:heading});
   check('standalone public contact address prints',direct,{visible:direct,href:await page.locator('.contact-page .contact-direct a').getAttribute('href')});
   check('standalone unsent contact fields print',fields.length===3&&fields.every(e=>e.visible),fields);
   const actions=await page.locator('.contact-page .contact-form button').evaluateAll(es=>es.filter(e=>e.getClientRects().length).map(e=>e.textContent));
   check('contact submit action stays print-hidden',actions.length===0,actions);
   const hidden=await page.locator('.unified-header,.global-skip,.unified-footer,.form-security').evaluateAll(es=>es.map(e=>({class:e.className,visible:!!e.getClientRects().length})));
   check('navigation footer and security actions stay print-hidden',hidden.length>=3&&hidden.every(e=>!e.visible),hidden);
   await page.screenshot({path:resolve(out,'contact-print.png'),fullPage:true});
   await page.pdf({path:resolve(out,'contact-print.pdf'),format:'A4',printBackground:true,displayHeaderFooter:false});
  }finally{await context.close();}
 }
 for(const path of ['/','/help']){
  const {context,page}=await pageFor(path);
  try{
   await page.emulateMedia({media:'print'});
   const contacts=await page.locator('.contact-section').evaluateAll(es=>es.map(e=>({visible:!!e.getClientRects().length,standalone:!!e.closest('.contact-page')})));
   check(path==='/'?'home repeated contact stays print-hidden':'secondary route repeated contact stays print-hidden',contacts.length===1&&contacts.every(e=>!e.visible&&!e.standalone),contacts);
   check(path==='/'?'home primary heading remains printable':'secondary route primary heading remains printable',await page.getByRole('heading',{level:1}).isVisible());
  }finally{await context.close();}
 }
}catch(e){errors.push(e.stack);}finally{
 await browser?.close();if(server.listening)await new Promise(resolve=>server.close(resolve));
 const afterArtifacts=await artifactHashes();check('built files unchanged by browser verification',JSON.stringify(beforeArtifacts)===JSON.stringify(afterArtifacts));
 check('no external write auth or service attempts',blocked.length===0,blocked);
 check('no browser or fixture errors',errors.length===0,errors);
 await writeFile(resolve(out,'results.json'),JSON.stringify({scope:'Actual built pages; disconnected synthetic unsent fields; no submission or provider calls',client,browser:browser?.version(),sourceCSSSha256:sha(await readFile(resolve(client,'../../src/consistency.css'))),builtArtifacts:beforeArtifacts,checks,requests,blocked,errors},null,2)+'\n');
 console.log(JSON.stringify({checks:checks.length,passed:checks.filter(c=>c.pass).length,failed:checks.filter(c=>!c.pass).map(c=>c.name),requests:requests.length,blocked:blocked.length,errors:errors.length}));
 process.exitCode=checks.some(c=>!c.pass)||errors.length?1:0;
}
