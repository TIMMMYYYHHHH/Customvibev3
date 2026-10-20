// Matching built assets, real authenticated Worker/SQLite, synthetic browser-only data.
import assert from 'node:assert/strict';import {readFile,mkdir,writeFile} from 'node:fs/promises';import {resolve} from 'node:path';import {createRequire} from 'node:module';
import {createConcurrencyHarness,actorRequest,origin,storefrontOrigin} from './fixtures/concurrent-state-harness.mjs';
import {secure} from '../server/auth.mjs';
const require=createRequire(process.env.PLAYWRIGHT_MODULE||'/Users/timothymorton/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');const {chromium}=require('playwright');
const out=resolve(process.env.CSS_EVIDENCE||'../../audit/fix-plan/tech11b1-evidence/browser'),baseline=process.env.CSS_BASELINE==='1';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),results=[],errors=[],blocked=[],csp=[];
const image=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR4nGP4z8Dwn4GBgYGJAQoAHwQCAe1aEJ8AAAAASUVORK5CYII=','base64');
const go=(page,path)=>page.evaluate(path=>{history.pushState(null,'',path);dispatchEvent(new PopStateEvent('popstate'))},path);
const snapshot=h=>JSON.stringify({rows:['content','seasonal_settings'].map(t=>[t,h.sql.prepare('SELECT * FROM '+t+' ORDER BY id').all()]),changes:h.sql.prepare('SELECT total_changes() n').get().n});
async function scenario(name,{admin=false,active=false,mobile=false}={},fn){
 const h=await createConcurrencyHarness({storefront:true});let context,before,closing=false;const requests=[],observed=[];
 try{
  if(active){const state=await(await actorRequest(h,'A','/api/seasons')).json(),c=state.campaigns.find(c=>c.occasion==='christmas');Object.assign(c,{start:'2028-02-29T12:30',end:'2028-03-01T00:00',enabled:true,published:true,decorations:false,motion:false});state.themeProgress.christmas='ready';state.mode='schedule';assert.equal((await actorRequest(h,'A','/api/seasons',{method:'PUT',body:{state,action:'Synthetic CSS fixture'}})).status,200)}
  before=snapshot(h);context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1280,height:1000},reducedMotion:'reduce',serviceWorkers:'block'});
  if(admin)await context.addCookies([{name:'__Host-cv-admin',value:h.actors.A.token,url:origin,httpOnly:true,secure:true,sameSite:'Lax'}]);
  const control={hold:false,status:0,release:null,cssRequests:0,delayJS:false};
  await context.addInitScript(()=>{const D=Date;class Fixed extends D{constructor(...a){super(...(a.length?a:['2028-02-28T10:00:00Z']))}static now(){return Date.parse('2028-02-28T10:00:00Z')}}globalThis.Date=Fixed;window.turnstile={render(_node,options){queueMicrotask(()=>options.callback('synthetic'));return 'fixture'},remove(){},reset(){}};window.cssViolations=[];addEventListener('securitypolicyviolation',e=>window.cssViolations.push(e.violatedDirective));window.cssStorage=[];Storage.prototype.setItem=function(...a){window.cssStorage.push(a);throw Error('No draft persistence')};window.cssRevoked=[];const revoke=URL.revokeObjectURL.bind(URL);URL.revokeObjectURL=u=>{window.cssRevoked.push(u);revoke(u)}});
  await context.route('**/*',async route=>{try{const req=route.request(),url=new URL(req.url());if(req.method()!=='GET'||![origin,storefrontOrigin].includes(url.origin)){blocked.push({method:req.method(),path:url.pathname});return route.abort()}
   requests.push({path:url.pathname,origin:url.origin});
   if(/\/assets\/Checkout-[^/]+\.css$/.test(url.pathname)){control.cssRequests++;if(control.hold)await new Promise(r=>control.release=r);if(control.status)return route.fulfill({status:control.status,body:'Synthetic CSS failure',contentType:'text/css'})}
   if(control.delayJS&&url.pathname.endsWith('.js'))await new Promise(r=>setTimeout(r,200));
   let response;
   if(url.origin===storefrontOrigin&&url.pathname==='/api/forms')response=Response.json({available:true,siteKey:'synthetic',csrf:'synthetic',lockerSearch:true});
   else if(url.origin===storefrontOrigin&&url.pathname==='/api/lockers')response=Response.json({locations:[{id:'local1',name:'Local locker',area:'Durban',lat:-29.8,lon:31}]});
   else if(url.origin===storefrontOrigin&&url.pathname.startsWith('/api/map/tiles/'))response=new Response(image,{headers:{'Content-Type':'image/png'}});
   else response=await (url.origin===origin?h.dispatch:h.dispatchStorefront)(new Request(req.url(),{headers:await req.allHeaders()}));
   if(url.origin===storefrontOrigin)response=secure(response,{forms:true});
   await route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:Buffer.from(await response.arrayBuffer())});
   }catch(error){if(!closing)throw error}
  });
  await context.routeWebSocket('**/*',s=>{blocked.push({method:'WEBSOCKET'});s.close()});context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
  const page=await context.newPage();page.setDefaultTimeout(15000);
  const base=admin?origin:storefrontOrigin;await page.goto(base+(admin?'/preview'+(active?'?at=2028-02-29T12%3A30':''):'/'));await page.locator('.unified-header').waitFor();
  if(!baseline)assert.equal(control.cssRequests,0,'home cannot fetch checkout CSS');
  await fn({page,control,requests,observed,base});
  assert.equal(snapshot(h),before);assert.deepEqual(h.forbidden,[]);assert.deepEqual(await page.evaluate(()=>window.cssStorage),[]);csp.push(...await page.evaluate(()=>window.cssViolations));
  results.push({name,pass:true,requests,observed,immutableRows:true});console.log('PASS '+name);
 }catch(e){results.push({name,pass:false,error:e.message,requests,observed});throw e}finally{closing=true;await context?.close();h.close()}
}
async function photo(page){await go(page,'/studio');await page.getByLabel('Upload photos',{exact:true}).setInputFiles({name:'local.png',mimeType:'image/png',buffer:image});await page.locator('.studio-thumbnails img').waitFor();return page.locator('.studio-thumbnails img').getAttribute('src')}
async function checkout(page){await go(page,'/checkout');await page.getByRole('heading',{name:'Your magnet order.',exact:true}).waitFor()}
async function order(page){await page.waitForFunction(()=>[...document.querySelectorAll('link[data-cv-route-style]')].every(l=>l.sheet));return page.locator('head link[rel=stylesheet]').evaluateAll(ls=>ls.map(l=>({href:new URL(l.href).pathname,route:l.hasAttribute('data-cv-route-style')})))}
async function capture(page,key){await page.evaluate(()=>document.fonts.ready);const style=await page.evaluate(()=>{
 const selectors=['.unified-header','.checkout-page h1','.delivery-summary','.locker-picker','.locker-step','.locker-map','.locker-location-input input','.locker-map-cover .button','.locker-manual-fields input','.order-consent','.button','.nearby-map','.leaflet-control-zoom-in','.cv-map-marker','.unified-footer'];
 const props=['display','position','boxSizing','color','backgroundColor','fontFamily','fontSize','fontWeight','lineHeight','padding','margin','border','borderRadius','outline','outlineOffset','width','height','gap'];return Object.fromEntries(selectors.map(s=>[s,[...document.querySelectorAll(s)].map(e=>Object.fromEntries(props.map(p=>[p,getComputedStyle(e)[p]])))]))});
 await page.screenshot({path:resolve(out,key+'.png'),fullPage:true});await writeFile(resolve(out,key+'.json'),JSON.stringify(style,null,2)+'\n');if(!baseline)assert.deepEqual(style,JSON.parse(await readFile(resolve(process.env.CSS_BASELINE_DIR,key+'.json'),'utf8')),key+' cascade parity');
}
let failure;
try{
 for(const mobile of [false,true])for(const active of [false,true])await scenario('cascade '+(mobile?'mobile':'desktop')+(active?' selected Christmas preview':' public'),{admin:active,active,mobile},async({page,control,observed})=>{
  await photo(page);await checkout(page);await page.getByLabel('Name',{exact:true}).fill('Local customer');await page.getByLabel('Locker name',{exact:true}).fill('Local locker');await page.getByLabel('Town or suburb',{exact:true}).fill('Durban');
  if(!active){await page.getByRole('button',{name:'Show locker map',exact:true}).click();await page.locator('.leaflet-control-zoom-in').waitFor()}
  if(active){await page.waitForFunction(()=>document.documentElement.dataset.season==='christmas');assert.equal(await page.getByRole('switch',{name:'Christmas theme',exact:true}).getAttribute('aria-checked'),'true')}
  await capture(page,(mobile?'mobile':'desktop')+(active?'-christmas':'-public'));
  observed.push({resourceTiming:await page.evaluate(()=>performance.getEntriesByType('resource').filter(e=>e.name.endsWith('.css')).map(e=>({path:new URL(e.name).pathname,encodedBodySize:e.encodedBodySize,transferSize:e.transferSize}))),environment:'Chrome intercepted local synthetic responses; cold browser context, no network throttling'});
  if(!baseline){const links=await order(page);assert.ok(links[0].route);assert.ok(links.slice(1).every(l=>!l.route));observed.push({links,cssRequests:control.cssRequests});assert.equal(control.cssRequests,1);await go(page,'/');await checkout(page);assert.equal(control.cssRequests,1);assert.equal(await page.getByLabel('Name',{exact:true}).inputValue(),'Local customer');assert.equal(await page.getByLabel('Locker name',{exact:true}).inputValue(),'Local locker');assert.equal(await page.getByLabel('Town or suburb',{exact:true}).inputValue(),'Durban');await go(page,'/basket');await page.getByRole('heading',{name:'Your basket.',exact:true}).waitFor();await go(page,'/studio');await page.locator('.studio-thumbnails img').waitFor();await checkout(page);assert.equal(control.cssRequests,1)}
 });
 if(!baseline){
  for(const status of [404,503])await scenario('CSS '+status+' retry keeps photo, Undo and focus without submit',{},async({page,control,observed})=>{
   const src=await photo(page);await go(page,'/basket');await page.locator('[data-basket-item]').waitFor();await page.getByRole('button',{name:/^Delete /}).click();control.hold=true;control.status=status;await go(page,'/checkout');await page.getByText('Opening this page…',{exact:true}).waitFor();assert.equal(await page.getByLabel('Name',{exact:true}).count(),0);await page.getByRole('button',{name:'Undo',exact:true}).click();await page.waitForFunction(()=>document.querySelector('link[data-cv-route-style]'));control.release();await page.getByRole('button',{name:'Try loading again',exact:true}).waitFor();control.hold=false;
   await page.getByRole('button',{name:'Try loading again',exact:true}).click();await page.getByRole('button',{name:'Try loading again',exact:true}).waitFor();control.status=0;await page.getByRole('button',{name:'Try loading again',exact:true}).click();await page.getByRole('heading',{name:'Your magnet order.',exact:true}).waitFor();await page.waitForFunction(()=>document.activeElement?.textContent==='Your magnet order.');await go(page,'/studio');assert.equal(await page.locator('.studio-thumbnails img').getAttribute('src'),src);assert.equal(await page.evaluate(src=>window.cssRevoked.includes(src),src),false);observed.push({samePhoto:true,requests:control.cssRequests});
  });
  await scenario('abandoned slow CSS cannot steal focus or mount checkout',{},async({page,control})=>{await photo(page);control.hold=true;await go(page,'/checkout');await page.getByText('Opening this page…',{exact:true}).waitFor();await go(page,'/help');const button=page.getByRole('button',{name:'Delivery',exact:true});await button.focus();await page.waitForFunction(()=>document.querySelector('link[data-cv-route-style]'));control.release();await page.waitForTimeout(150);assert.equal(await button.evaluate(e=>e===document.activeElement),true);assert.equal(await page.getByLabel('Name',{exact:true}).count(),0)});
  await scenario('selected date survives lazy CSS failure retry history and reload; current-clock reset remains authoritative',{admin:true,active:true},async({page,control})=>{
   await photo(page);control.status=503;await go(page,'/checkout');await page.getByRole('button',{name:'Try loading again',exact:true}).waitFor();assert.equal(new URL(page.url()).searchParams.get('at'),'2028-02-29T12:30');control.status=0;await page.getByRole('button',{name:'Try loading again',exact:true}).click();await page.getByRole('heading',{name:'Your magnet order.',exact:true}).waitFor();await go(page,'/studio/handy');await page.getByRole('button',{name:'Family week: add your details',exact:true}).click();await page.getByLabel('Monday',{exact:true}).fill('Local memory');await page.goBack();await page.getByRole('heading',{name:'Your magnet order.',exact:true}).waitFor();await page.reload();await page.getByText('Your basket is empty.',{exact:true}).waitFor();assert.equal(new URL(page.url()).searchParams.get('at'),'2028-02-29T12:30');await page.waitForFunction(()=>document.documentElement.dataset.season==='christmas');assert.equal(await page.getByRole('switch',{name:'Christmas theme',exact:true}).getAttribute('aria-checked'),'true');
   await page.goto(origin+'/preview');await page.waitForFunction(()=>!document.documentElement.dataset.season);assert.equal(await page.getByRole('switch',{name:'Christmas theme',exact:true}).count(),0);
  });
  await scenario('cold direct document links CSS and keeps real SSR until client readiness',{},async({page,control,base})=>{control.delayJS=true;control.hold=true;await page.goto(base+'/checkout',{waitUntil:'commit'});await page.getByText('Your basket is empty.',{exact:true}).waitFor({state:'attached'});assert.equal(await page.locator('form#delivery-form').count(),0);await page.waitForFunction(()=>document.querySelector('link[data-cv-route-style]'));assert.equal(typeof control.release,'function');control.release();await page.getByText('Your basket is empty.',{exact:true}).waitFor();const links=await order(page);assert.ok(links[0].route);assert.equal(await page.locator('link[data-cv-route-style]').count(),1)});
 }
 assert.deepEqual(errors,[]);assert.deepEqual(blocked,[]);assert.deepEqual(csp,[]);
}catch(e){failure=e;console.error(e)}finally{await writeFile(resolve(out,'results.json'),JSON.stringify({baseline,results,errors,blocked,csp},null,2)+'\n');await browser.close()}
if(failure)throw failure;
