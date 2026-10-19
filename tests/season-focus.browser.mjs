// Run with Node 22 and PLAYWRIGHT_MODULE pointing to an installed Playwright module.
// Source-only loopback fixture: all API replies are synthetic and all writes/external requests fail.
import http from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {seedState} from '../src/seasons/model.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const types={'.html':'text/html','.mjs':'application/javascript','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2'};
const server=http.createServer(async(req,res)=>{try{const pathname=new URL(req.url,'http://localhost').pathname;const file=resolve(root,pathname.startsWith('/coming-soon/')?'public'+pathname:'.'+pathname);assert.ok(file.startsWith(root+'/'));assert.equal(req.method,'GET');res.setHeader('Content-Type',types[extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.statusCode=404;res.end('Not found')}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL||'chrome',headless:true});
const errors=[],forbidden=[],results=[];
let remote,hold=false,pending=null,reads=0;
try{
 const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage();
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url());
  if(url.origin!==origin||request.method()!=='GET'){forbidden.push([request.method(),url.href]);return route.abort()}
  if(url.pathname==='/api/seasons'){reads++;const snapshot=structuredClone(remote);if(hold){hold=false;await new Promise(r=>pending=r)}return route.fulfill({json:snapshot})}
  if(url.pathname==='/preview')return route.fulfill({contentType:'text/html',body:'<!doctype html><title>Local blank preview</title>'});
  if(url.pathname.startsWith('/api/')){forbidden.push([request.method(),url.pathname]);return route.abort()}
  return route.continue();
 });
 async function reset(view='calendar'){
  remote=seedState();remote.revision=1;remote.mode='off';pending=null;hold=false;
  await page.goto(`${origin}/tests/fixtures/season-focus.html${view==='library'?'?view=occasions':''}`);
  await page.waitForFunction(()=>document.querySelector('#connection-status').textContent==='Saved');
 }
 async function refresh(){await page.evaluate(()=>window.runSeasonRefresh())}
 async function startHeld(){hold=true;await page.evaluate(()=>{window.refreshDone=false;window.runSeasonRefresh().finally(()=>window.refreshDone=true)});await poll(()=>pending!==null)}
 async function release(){const resolvePending=pending;pending=null;resolvePending();await page.waitForFunction(()=>window.refreshDone)}
 async function poll(check){for(let i=0;i<100;i++){if(check())return;await new Promise(r=>setTimeout(r,10))}assert.fail('Refresh never requested synthetic data')}
 async function focused(selector){assert.equal(await page.locator(selector).evaluate(el=>el===document.activeElement),true,`Focus lost from ${selector}`)}
 async function check(name,fn){await fn();results.push(name);console.log('PASS '+name)}
 await check('ordinary button retains focus while newer server settings reconcile',async()=>{
  await reset('library');await page.locator('#outside-control').focus();for(let i=0;i<30;i++){await page.keyboard.press('Tab');if(await page.locator('[data-action="add-occasion"]').evaluate(el=>el===document.activeElement))break}await focused('[data-action="add-occasion"]');remote.revision=2;remote.occasionSettings.christmas={name:'Christmas revised'};
  await refresh();await focused('[data-action="add-occasion"]');assert.equal(await page.locator('[data-action="add-occasion"]').evaluate(el=>el.matches(':focus-visible')),true);assert.equal(await page.getByRole('heading',{name:'Christmas revised',exact:true}).count(),1);
 });
 await check('calendar date, preview selection and scroll survive a scheduled refresh',async()=>{
  await reset();const date=await page.locator('[data-action="day"]').nth(200).getAttribute('data-date'),selector=`[data-action="day"][data-date="${date}"]`;
  await page.locator(selector).click();await page.locator(selector).focus();const scroll=await page.evaluate(()=>scrollY);await refresh();await focused(selector);
  assert.equal(await page.locator(selector).getAttribute('aria-pressed'),'true');assert.equal(await page.evaluate(()=>scrollY),scroll);assert.match(await page.locator('.simulation-banner').innerText(),/Calendar preview/);
 });
 await check('navigation tab retains exact identity during refresh',async()=>{
  await reset();const selector='[data-action="view"][data-view="history"]';await page.locator(selector).focus();await refresh();await focused(selector);
 });
 await check('closed combobox follows its occasion even when its label changes',async()=>{
  await reset('library');await page.getByRole('combobox',{name:'Update Christmas theme progress',exact:true}).focus();remote.revision=2;remote.occasionSettings.christmas={name:'Christmas revised'};
  await refresh();await focused('[data-progress="christmas"] + .demo-select [role="combobox"]');assert.equal(await page.locator('[data-progress="christmas"]').inputValue(),'not-started');
 });
 await check('repeated calendar occasion buttons retain their specific date',async()=>{
  await reset();const year=await page.locator('#calendar-year').inputValue();remote.revision=2;const christmas=remote.campaigns.find(c=>c.occasion==='christmas');christmas.start=year+'-01-01T00:00';christmas.end=year+'-01-10T00:00';
  await page.locator('#show-drafts').check();await refresh();const selector=`.date-icon[data-date="${year}-01-05"]`;await page.locator(selector).focus();await refresh();await focused(selector);
 });
 await check('uncommitted calendar year survives refresh without changing the shown year',async()=>{
  await reset();const title=await page.locator('.year-toolbar h2').innerText();await page.locator('#calendar-year').fill('2031');await refresh();await focused('#calendar-year');assert.equal(await page.locator('#calendar-year').inputValue(),'2031');assert.equal(await page.locator('.year-toolbar h2').innerText(),title);
 });
 await check('focus moved during the network wait survives at the current control',async()=>{
  await reset();await page.locator('[data-action="visitor"]').focus();await startHeld();await page.locator('[data-action="next-year"]').focus();await release();await focused('[data-action="next-year"]');
 });
 await check('focus outside Themes is never pulled back into the panel',async()=>{
  await reset();await startHeld();await page.locator('#outside-control').focus();await release();await focused('#outside-control');
 });
 await check('an editor opened during a request retains its draft and tab focus',async()=>{
  await reset('library');await startHeld();await page.locator('[data-action="edit"][aria-label="Edit Christmas"]').click();await focused('h1');const input=page.locator('[data-copy]').first();await input.fill('Unsent local wording');await release();assert.equal(await input.inputValue(),'Unsent local wording');
  await page.locator('#schedule-tab').click();await focused('#schedule-tab');const before=reads;await refresh();assert.equal(reads,before);await focused('#schedule-tab');await page.locator('#wording-tab').click();assert.equal(await input.inputValue(),'Unsent local wording');
 });
 await check('dialog opened during refresh keeps its text and selection',async()=>{
  await reset('library');await startHeld();await page.locator('[data-action="add-occasion"]').click();await page.locator('#occasion-name').fill('Local name');await page.locator('#occasion-name').evaluate(el=>el.setSelectionRange(2,6));await release();await focused('#occasion-name');
  assert.equal(await page.locator('#occasion-dialog').evaluate(el=>el.open),true);assert.deepEqual(await page.locator('#occasion-name').evaluate(el=>[el.value,el.selectionStart,el.selectionEnd]),['Local name',2,6]);
 });
 await check('open combobox and details block destructive refresh, including late opening',async()=>{
  await reset('library');await startHeld();const combo=page.getByRole('combobox',{name:'Update Christmas theme progress',exact:true});await combo.click();await release();assert.equal(await combo.getAttribute('aria-expanded'),'true');await focused('[data-progress="christmas"] + .demo-select [role="combobox"]');
  const before=reads;await refresh();assert.equal(reads,before);await page.keyboard.press('Escape');await startHeld();await page.locator('details summary').first().click();await release();assert.equal(await page.locator('details[open]').count(),1);
 });
 await check('manual refresh reconciles deferred newer settings without writes',async()=>{
  await reset('library');remote.revision=2;remote.occasionSettings.christmas={name:'Christmas revised'};await startHeld();await page.locator('[data-action="add-occasion"]').click();await release();await page.locator('[data-action="cancel-occasion"]').click();
  await page.getByRole('button',{name:'Refresh saved themes',exact:true}).click();await page.getByRole('heading',{name:'Christmas revised',exact:true}).waitFor();await focused('[data-action="refresh-themes"]');
  assert.match(await page.locator('.status-strip').innerText(),/Automatic starts are paused/);
 });
 await check('deliberate view change discards an older in-flight response and stale focus',async()=>{
  await reset('library');remote.revision=2;remote.occasionSettings.christmas={name:'Obsolete response'};await startHeld();await page.locator('[data-action="view"][data-view="calendar"]').click();await focused('[data-action="view"][data-view="calendar"]');await release();await focused('[data-action="view"][data-view="calendar"]');
  remote.revision=3;remote.occasionSettings.christmas={name:'Latest response'};await refresh();await page.locator('[data-action="view"][data-view="library"]').click();assert.equal(await page.getByRole('heading',{name:'Latest response',exact:true}).count(),1);assert.equal(await page.getByText('Obsolete response',{exact:true}).count(),0);
 });
 await check('refresh requests cannot overlap or regress the saved revision',async()=>{
  await reset('library');remote.revision=3;remote.occasionSettings.christmas={name:'Current revision'};await refresh();await startHeld();const before=reads;await refresh();assert.equal(reads,before);await release();
  remote.revision=2;remote.occasionSettings.christmas={name:'Older revision'};await refresh();assert.equal(await page.getByRole('heading',{name:'Current revision',exact:true}).count(),1);assert.equal(await page.getByText('Older revision',{exact:true}).count(),0);
 });
 await check('removing the focused occasion on the server gives focus a sensible fallback',async()=>{
  await reset('library');await page.locator('[data-action="rename-occasion"][data-occasion="christmas"]').focus();remote.revision=2;remote.occasionSettings.christmas={removed:true};await refresh();await focused('h1');assert.equal(await page.locator('[data-action="rename-occasion"][data-occasion="christmas"]').count(),0);
 });
 await check('manual refresh explains open-details protection then recovers',async()=>{
  await reset('library');await page.locator('details summary').first().click();const before=reads;await page.getByRole('button',{name:'Refresh saved themes',exact:true}).click();assert.equal(reads,before);assert.match(await page.locator('#toast').innerText(),/close/i);await page.locator('details[open] summary').click();await page.getByRole('button',{name:'Refresh saved themes',exact:true}).click();await poll(()=>reads>before);
 });
 await check('refresh control remains visible and keyboard usable at narrow width',async()=>{
  await page.setViewportSize({width:375,height:812});await reset('library');await page.locator('#outside-control').focus();await page.keyboard.press('Tab');await focused('[data-action="refresh-themes"]');
  const bounds=await page.locator('[data-action="refresh-themes"]').boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=375);await page.keyboard.press('Enter');await focused('[data-action="refresh-themes"]');
  if(process.env.SCREENSHOT_DIR){await mkdir(process.env.SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:resolve(process.env.SCREENSHOT_DIR,'TECH-09-themes-narrow.png')});await page.setViewportSize({width:1280,height:900});await page.screenshot({path:resolve(process.env.SCREENSHOT_DIR,'TECH-09-themes-desktop.png')})}
 });
 assert.deepEqual(errors,[]);assert.deepEqual(forbidden,[]);console.log(JSON.stringify({passed:results.length,results,pageErrors:errors,forbiddenRequests:forbidden},null,2));
}finally{await browser.close();await new Promise(r=>server.close(r))}
