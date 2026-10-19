// Disconnected fixture: real gate rendering, synthetic credentials, localhost assets only.
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {gate,hashPassword} from '../../server/auth.mjs';
const require=createRequire('/Users/timothymorton/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium}=require('playwright');
const mode=process.argv[2]||'contract',out=resolve(process.env.TECH15_EVIDENCE||'../../audit/fix-plan/tech15-evidence');
await mkdir(out,{recursive:true});
const salt='a'.repeat(64),secret='b'.repeat(64),password='synthetic-local-fixture';
const hash=await hashPassword(password,salt);
const env={SITE_PASSWORD_HASH:hash,SITE_PASSWORD_SALT:salt,SESSION_SECRET:secret,ADMIN_PASSWORD_HASH:hash,ADMIN_PASSWORD_SALT:salt,ADMIN_SESSION_SECRET:secret,AUTH:{fetch:async()=>Response.json({allowed:true,revoked:false})}};
const server=createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://localhost'),scope=req.headers['x-fixture-scope']||'site';
 let body,type='text/html; charset=utf-8';
 if(url.pathname.startsWith('/coming-soon/')){body=await readFile(resolve('public','.'+url.pathname));type=({'.css':'text/css','.js':'application/javascript','.woff2':'font/woff2','.webp':'image/webp','.png':'image/png'})[extname(url.pathname)]||'application/octet-stream';}
 else if(url.pathname.startsWith('/admin-brand/')){const file=url.pathname.split('/').pop();body=file==='fonts.css'?"@font-face{font-family:'Fredoka Variable';font-weight:300 700;src:url('/admin-brand/fredoka.woff2')}@font-face{font-family:'DM Sans Variable';font-weight:100 1000;src:url('/admin-brand/dm-sans.woff2')}":await readFile(file==='puzzle-logo-v2.png'?'public/coming-soon/'+file:'src/assets/fonts/'+(file==='fredoka.woff2'?'fredoka':'dm-sans')+'-latin-wght-normal.woff2');type=file==='fonts.css'?'text/css':file.endsWith('.woff2')?'font/woff2':'image/png';}
 else if(url.pathname==='/proof-signin.js'){body=await (await gate(new Request('https://customvibe.co.za/proof-signin.js'),{},'site')).response.text();type='application/javascript';}
 else if(url.pathname==='/favicon.png'||url.pathname==='/icon-180.png'){body=await readFile('public'+url.pathname);type='image/png';}
 else {
  const realScope=scope==='admin'?'admin':'site',origin=realScope==='admin'?'https://admin.customvibe.co.za':'https://customvibe.co.za';
  let response=(await gate(new Request(origin+(scope==='proof'?'/proof':'/')),env,realScope)).response;
  if(url.searchParams.has('invalid')){const html=await response.clone().text(),csrf=html.match(/name="csrf" value="([^"]+)"/)[1],cookie=response.headers.get('set-cookie').split(';')[0];response=(await gate(new Request(origin+'/auth/login',{method:'POST',headers:{origin,cookie,'CF-Connecting-IP':'192.0.2.15'},body:new URLSearchParams({csrf,password:'wrong',next:scope==='proof'?'/proof':'/'})}),env,realScope)).response;}
  body=await response.text();
 }
 res.setHeader('Content-Type',type);res.end(body);
}catch(e){res.writeHead(500).end(e.message)}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin=`http://127.0.0.1:${server.address().port}`,browser=await chromium.launch({headless:true,channel:'chrome'}),errors=[],data={};
const props=['backgroundColor','color','borderRadius','minHeight','height','fontFamily','fontWeight','outlineWidth','outlineStyle','outlineColor','outlineOffset','boxShadow','backgroundImage'];
try{
 for(const scope of ['site','admin','proof'])for(const width of [1440,768,375]){
  const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce',extraHTTPHeaders:{'x-fixture-scope':scope}});
  await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin);await page.evaluate(()=>document.fonts.ready);
  if(scope==='site'){
   assert.equal(await page.locator('dialog').evaluate(n=>n.open),false);
   await page.locator('.login-link').click();assert.equal(await page.locator('dialog').evaluate(n=>n.matches(':modal')),true);assert.equal(await page.locator('#password').evaluate(n=>n===document.activeElement),true);
   await page.keyboard.press('Escape');assert.equal(await page.locator('dialog').evaluate(n=>n.open),false);assert.equal(await page.locator('.login-link').evaluate(n=>n===document.activeElement),true);
   await page.locator('.login-link').click();await page.locator('.close-login').click();assert.equal(await page.locator('.login-link').evaluate(n=>n===document.activeElement),true);await page.locator('.login-link').click();
  }
  const button=page.locator('button'),key=`${scope}-${width}`;data[key]={};
  async function sample(){return button.evaluate((n,props)=>{document.getAnimations().forEach(a=>{try{a.finish()}catch{}});const s=getComputedStyle(n);return Object.fromEntries(props.map(p=>[p,s[p]]));},props)}
  data[key].normal=await sample();await page.screenshot({path:resolve(out,`${mode}-${key}.png`),fullPage:true});
  await button.hover();data[key].hover=await sample();await page.mouse.move(0,0);await page.locator('#password').focus();await page.keyboard.press('Tab');data[key].focus=await sample();await page.screenshot({path:resolve(out,`${mode}-${key}-focus.png`),fullPage:true});
  const normal=data[key].normal,hover=data[key].hover,focus=data[key].focus;
  const check=(ok,message)=>{if(!ok)errors.push(`${key}: ${message}`)};
  check(normal.backgroundColor==='rgb(174, 46, 91)','primary berry');check(hover.backgroundColor==='rgb(146, 35, 75)','primary hover');check(normal.borderRadius==='14px','14px radius');check(parseFloat(normal.height)>=48,'48px touch target');check(normal.fontFamily.includes('Fredoka')&&normal.fontWeight==='650','Fredoka 650');check(await page.evaluate(()=>[...document.fonts].some(f=>f.family.includes('Fredoka')&&f.status==='loaded')),'Fredoka font asset loaded');check(focus.outlineStyle==='solid'&&parseFloat(focus.outlineWidth)>=3,'visible keyboard focus');check(normal.boxShadow==='none'&&normal.backgroundImage==='none','flat control');check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow');
  await page.goto(origin+'/?invalid=1');await page.evaluate(()=>document.fonts.ready);assert.equal(await page.locator('[role=alert]').textContent(),'The password was not accepted.');assert.equal(await page.locator('button').isEnabled(),true);if(scope==='site')assert.equal(await page.locator('dialog').evaluate(n=>n.matches(':modal')),true);
  await page.screenshot({path:resolve(out,`${mode}-${key}-invalid.png`),fullPage:true});
  await context.close();
 }
 await writeFile(resolve(out,`${mode}-computed.json`),JSON.stringify(data,null,2)+'\n');
 assert.deepEqual(errors,[],'Gate primary styles and browser contracts');console.log('PASS: 3 real gate surfaces x 3 widths, open/close/Escape/focus-return, invalid password, primary/hover/focus, local assets only');
}finally{await browser.close();await new Promise(r=>server.close(r))}
