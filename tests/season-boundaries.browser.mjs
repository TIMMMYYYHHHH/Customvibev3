// Actual built UI + Workers + SQLite. Clocks and data exist only in this disposable process/contexts.
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {createConcurrencyHarness,actorRequest,origin,storefrontOrigin} from './fixtures/concurrent-state-harness.mjs';
const require=createRequire(process.env.PLAYWRIGHT_MODULE||'/Users/timothymorton/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium}=require('playwright'),out=resolve(process.env.TECH28_BOUNDARY_EVIDENCE||'../../audit/fix-plan/tech28-boundary-evidence');await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL||'chrome',headless:true});
const results=[],errors=[],blocked=[],bridgeErrors=[],originalNow=Date.now,id='synthetic-clock-christmas';let now;
Date.now=()=>now;
const snapshot=h=>JSON.stringify({rows:['content','seasonal_settings'].map(table=>[table,h.sql.prepare('SELECT * FROM '+table+' ORDER BY id').all()]),changes:h.sql.prepare('SELECT total_changes() AS n').get().n});
const digest=text=>createHash('sha256').update(text).digest('hex');
async function scenario(name,{utc='2028-02-28T10:00:00Z',start='2028-02-29T12:30',end='2028-03-01T00:00',mode='schedule'}={},fn){
 now=Date.parse(utc);const h=await createConcurrencyHarness({storefront:true}),contexts=[],trace=[],observed=[];let before;
 try{
  const state=await(await actorRequest(h,'A','/api/seasons')).json(),c=state.campaigns.find(c=>c.occasion==='christmas');
  Object.assign(c,{id,start,end,repeat:'annual',enabled:true,published:true,decorations:false,motion:false});state.themeProgress.christmas='ready';state.mode=mode;
  assert.equal((await actorRequest(h,'A','/api/seasons',{method:'PUT',body:{state,action:'Synthetic browser clock setup'}})).status,200);
  before=snapshot(h);const setupWrites=h.operations.filter(o=>o.method!=='GET').length;
  async function client({timezoneId='UTC',publicPage=false,polling=false}={}){
   const context=await browser.newContext({timezoneId,viewport:{width:1280,height:1000},reducedMotion:'reduce',serviceWorkers:'block'});contexts.push(context);
   if(!publicPage)await context.addCookies([{name:'__Host-cv-admin',value:h.actors.A.token,url:origin,httpOnly:true,secure:true,sameSite:'Lax'}]);
   // Init scripts cover every document, including a noopener popup's first script. Public polling uses Playwright's timer clock instead.
   if(!polling)await context.addInitScript(fixed=>{const RealDate=Date;class FixtureDate extends RealDate{constructor(...args){super(...(args.length?args:[fixed]))}static now(){return fixed}}globalThis.Date=FixtureDate;},now);
   // Context interception is registered before creating any page, so popup navigation has no network fallback.
   await context.route('**/*',async route=>{
    const request=route.request(),url=new URL(request.url());
    if(request.method()!=='GET'||![origin,storefrontOrigin].includes(url.origin)){blocked.push({method:request.method(),origin:url.origin,path:url.pathname});return route.abort()}
    try{
     const response=await (url.origin===storefrontOrigin?h.dispatchStorefront:h.dispatch)(new Request(request.url(),{headers:await request.allHeaders()}));
     const entry={method:'GET',origin:url.origin,path:url.pathname,status:response.status,...(url.searchParams.has('at')?{at:url.searchParams.get('at')}:{}),...(url.searchParams.has('page')?{page:url.searchParams.get('page')}:{})};
     if(url.pathname==='/season.json'){const body=await response.clone().json();entry.campaign=body.campaign?.id??null;entry.key=body.campaign?.key??null;entry.serverUTC=new Date(now).toISOString()}
     trace.push(entry);return route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:Buffer.from(await response.arrayBuffer())});
    }catch(error){bridgeErrors.push(error.message);return route.abort()}
   });
   await context.routeWebSocket('**/*',socket=>{blocked.push({method:'WEBSOCKET'});socket.close()});
   context.on('page',page=>page.on('pageerror',error=>errors.push(error.message)));
   const page=await context.newPage();page.setDefaultTimeout(10000);
   if(polling){
    // install starts running immediately: begin earlier, then pause at the literal boundary before navigation.
    await page.clock.install({time:new Date('2027-12-31T20:58:00Z')});await page.clock.pauseAt(new Date('2027-12-31T21:58:00Z'));
    const initialBrowserUTC=await page.evaluate(()=>new Date().toISOString());assert.equal(initialBrowserUTC,'2027-12-31T21:58:00.000Z');assert.equal(now,Date.parse('2027-12-31T21:58:00Z'));observed.push({initialBrowserUTC});
   }
   return {context,page,base:publicPage?storefrontOrigin:origin};
  }
  await fn({h,client,trace,observed});
  assert.equal(snapshot(h),before,'Read-only browser/time actions must preserve every saved row and SQLite change count');
  assert.equal(h.operations.filter(o=>o.method!=='GET').length,setupWrites,'No browser write/send');assert.deepEqual(h.forbidden,[]);assert.ok(trace.every(entry=>entry.status===200),'Every requested local resource/API must succeed');
  results.push({name,pass:true,setupUTC:utc,mode,snapshotBefore:digest(before),snapshotAfter:digest(snapshot(h)),observed,trace});console.log('PASS '+name);
 }catch(error){results.push({name,pass:false,error:error.message,setupUTC:utc,snapshotBefore:before&&digest(before),snapshotAfter:digest(snapshot(h)),observed,trace});throw error}
 finally{for(const context of contexts)await context.close();h.close()}
}
async function appearance(page,active,{polling=false}={}){
 if(polling)await page.clock.runFor(40);else await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 await page.waitForFunction(want=>(document.documentElement.dataset.season||null)===want,active?'christmas':null);
 const control=page.getByRole('switch',{name:'Christmas theme',exact:true});assert.equal(await control.count(),active?1:0);if(active)assert.equal(await control.getAttribute('aria-checked'),'true');
 return {browserUTC:await page.evaluate(()=>new Date().toISOString()),season:await page.evaluate(()=>document.documentElement.dataset.season||null),switchCount:await control.count()};
}
async function preview(page,{at,active,observed}){
 const params=new URLSearchParams({page:'/collections',...(at?{at}:{})});
 const loaded=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/seasons');await page.goto(origin+'/preview?'+params);await(await loaded).finished();
 await page.getByRole('heading',{level:1,name:/Find your kind.*fridge joy/s}).waitFor();
 const url=new URL(page.url());assert.equal(url.searchParams.get('page'),'/collections');assert.equal(url.searchParams.get('at'),at||null);
 observed.push({at:at||null,page:'/collections',...await appearance(page,active)});
}
let failure;
try{
 await scenario('public polling crosses SAST New Year with start inclusive and end exclusive',{utc:'2027-12-31T21:58:00Z',start:'2027-12-31T23:59',end:'2028-01-01T00:01'},async({client,trace,observed})=>{
  const {page,base}=await client({publicPage:true,polling:true});
  // Under a paused timer clock, readiness is actual service/render output, not the global load event.
  const loaded=page.waitForResponse(r=>new URL(r.url()).pathname==='/season.json');await page.goto(base+'/collections',{waitUntil:'domcontentloaded'});await(await loaded).finished();await page.getByRole('heading',{level:1,name:/Find your kind.*fridge joy/s}).waitFor();
  observed.push({serverUTC:'2027-12-31T21:58:00Z',...await appearance(page,false,{polling:true})});assert.equal(trace.filter(x=>x.path==='/season.json').at(-1).key,null);
  for(const [utc,key]of [['2027-12-31T21:59:00Z',id+':2027'],['2027-12-31T22:00:00Z',id+':2027'],['2027-12-31T22:01:00Z',null]]){
   now=Date.parse(utc);const refreshed=page.waitForResponse(r=>new URL(r.url()).pathname==='/season.json');await page.clock.runFor(60000);await(await refreshed).finished();
   assert.equal(trace.filter(x=>x.path==='/season.json').at(-1).key,key);observed.push({serverUTC:utc,key,...await appearance(page,!!key,{polling:true})});
  }
 });
 for(const timezoneId of ['UTC','America/Los_Angeles'])await scenario('standalone selected-clock counterfactual in '+timezoneId,{},async({client,observed})=>{
  const selected=await client({timezoneId});await preview(selected.page,{at:'2028-02-29T12:30',active:true,observed});
  const current=await client({timezoneId});await preview(current.page,{active:false,observed});
  observed.push({timezoneId,browserCurrentUTC:await selected.page.evaluate(()=>new Date().toISOString())});
 });
 await scenario('selected preview cannot override saved schedule-off authority',{mode:'off'},async({h,client,observed})=>{
  const {page}=await client();await preview(page,{at:'2028-02-29T12:30',active:false,observed});assert.equal((await(await actorRequest(h,'A','/api/seasons')).json()).mode,'off');
 });
 await scenario('annual leap preview recurs in2032 without rolling into non-leap2029',{},async({client,observed})=>{
  const leap=await client();await preview(leap.page,{at:'2032-02-29T12:30',active:true,observed});
  const nonLeap=await client();await preview(nonLeap.page,{at:'2029-02-28T12:30',active:false,observed});
 });
 await scenario('calendar noon preview and first popup navigation are read-only',{start:'2028-02-29T11:59',end:'2028-02-29T12:01'},async({client,observed})=>{
  const {context,page}=await client({timezoneId:'America/Los_Angeles'});await page.goto(origin+'/themes');await page.getByLabel('Calendar year',{exact:true}).waitFor();
  await page.getByLabel('Calendar year',{exact:true}).fill('2028');await page.getByRole('button',{name:'Show',exact:true}).click();
  await page.getByRole('button',{name:/^Preview 2028-02-29/}).click();await page.locator('.simulation-banner').filter({hasText:'Calendar preview:'}).waitFor();
  assert.match(await page.locator('.status-strip').innerText(),/SHOWING ON THE PREVIEW DATE[\s\S]*Christmas[\s\S]*Active in preview/);
  const popupEvent=context.waitForEvent('page');await page.getByRole('button',{name:'View this date as visitor',exact:true}).click();const popup=await popupEvent;popup.setDefaultTimeout(10000);
  await popup.getByRole('heading',{level:1,name:/Find your tribe.*CustomVibe/s}).waitFor();assert.equal(new URL(popup.url()).searchParams.get('at'),'2028-02-29T12:00');observed.push({at:'2028-02-29T12:00',popup:true,...await appearance(popup,true)});
  await page.getByLabel('Calendar year',{exact:true}).fill('2029');await page.getByRole('button',{name:'Show',exact:true}).click();assert.equal(await page.getByRole('button',{name:/^Preview 2029-02-29/}).count(),0);assert.equal(await page.getByRole('button',{name:/^Preview 2029-02-28/}).count(),1);
  await page.getByRole('button',{name:'Return to today',exact:true}).click();assert.equal(await page.locator('.simulation-banner').count(),0);assert.match(await page.locator('.status-strip').innerText(),/SHOWING NOW ON YOUR WEBSITE[\s\S]*Original CustomVibe/);
  observed.push({year:2029,feb29:false,returnedToCurrent:true});await page.screenshot({path:resolve(out,'calendar-returned-to-current.png'),fullPage:true});
 });
 assert.deepEqual(errors,[],'No uncaught page errors');assert.deepEqual(blocked,[],'No external/write/WebSocket requests');assert.deepEqual(bridgeErrors,[],'No bridge failures');
 console.log('PASS: six actual-runtime boundary/counterfactual/calendar journeys; zero browser writes or network fallback');
}catch(error){failure=error;console.error(error)}finally{
 Date.now=originalNow;await writeFile(resolve(out,'browser-results.json'),JSON.stringify({results,errors,blocked,bridgeErrors},null,2)+'\n');await browser.close();
}
if(failure)throw failure;
