// Built production UI, real Admin Worker and disposable SQLite; every browser request is intercepted.
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {createConcurrencyHarness,actorRequest,origin} from './fixtures/concurrent-state-harness.mjs';
const require=createRequire(process.env.PLAYWRIGHT_MODULE||'/Users/timothymorton/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium}=require('playwright'),out=resolve(process.env.TECH28_EVIDENCE||'../../audit/fix-plan/tech28-concurrency-evidence');await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL||'chrome',headless:true});
const results=[],errors=[],external=[],unexpected=[];
async function clients(h,path){const list=[];for(const actor of ['A','B']){
 const context=await browser.newContext({viewport:{width:1280,height:1000},reducedMotion:'reduce'});await context.addCookies([{name:'__Host-cv-admin',value:h.actors[actor].token,url:origin,httpOnly:true,secure:true,sameSite:'Lax'}]);
 await context.route('**/*',async route=>{const request=route.request(),url=new URL(request.url());if(url.origin!==origin){external.push(request.method()+' '+url.origin+url.pathname);return route.abort()}
  try{const response=await h.dispatch(new Request(request.url(),{method:request.method(),headers:await request.allHeaders(),...(!['GET','HEAD'].includes(request.method())?{body:request.postDataBuffer()}:{} )}));return route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:Buffer.from(await response.arrayBuffer())});}catch(error){unexpected.push(error.message);return route.abort()}});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(origin+path);await page.evaluate(()=>document.fonts.ready);list.push({actor,context,page});
 }return list;}
const puts=h=>h.operations.filter(o=>o.method==='PUT');
async function closeClients(list){for(const client of list){client.page.on('dialog',d=>d.dismiss());await client.context.close();}}
async function scenario(name,path,fn){const h=await createConcurrencyHarness();let list;try{list=await clients(h,path);await fn(h,...list.map(c=>c.page));assert.deepEqual(h.forbidden,[]);results.push({name,operations:h.operations});console.log('PASS '+name);}finally{if(list)await closeClients(list);h.close()}}
try{
 await scenario('catalogue conflict preserves the stale local draft and reloads only by explicit action','/content',async(h,a,b)=>{
  for(const page of [a,b])await page.getByRole('button',{name:'Save changes',exact:true}).waitFor();
  const baseline=await(await actorRequest(h,'A','/content.json')).json();const field=page=>page.getByRole('textbox',{name:'Collection name',exact:true});
  await field(b).fill('Synthetic B unsaved alphabet');await field(a).fill('Synthetic A saved alphabet');await a.getByRole('button',{name:'Save changes',exact:true}).click();await a.getByRole('status').filter({hasText:'Saved. Your website'}).waitFor();
  await b.getByRole('button',{name:'Save changes',exact:true}).click();await b.getByRole('alert').filter({hasText:'Content changed in another session'}).waitFor();assert.equal(await field(b).inputValue(),'Synthetic B unsaved alphabet');
  const draft=await b.evaluate(()=>JSON.parse(sessionStorage.getItem('customvibe-admin-draft')));assert.equal(draft.products.find(p=>p.id==='alphabet').name,'Synthetic B unsaved alphabet');
  const saved=await(await actorRequest(h,'A','/content.json')).json();assert.equal(saved.products.find(p=>p.id==='alphabet').name,'Synthetic A saved alphabet');assert.equal(saved.revision,baseline.revision+1);assert.deepEqual(puts(h).map(o=>[o.actor,o.status]),[['A',200],['B',409]]);
  await b.screenshot({path:resolve(out,'catalogue-stale-conflict.png'),fullPage:true});
  await b.getByRole('button',{name:'Reload saved content',exact:true}).click();await b.waitForFunction(want=>[...document.querySelectorAll('input')].some(el=>el.value===want),'Synthetic A saved alphabet');assert.equal(await field(b).inputValue(),'Synthetic A saved alphabet');
  assert.equal(await b.getByRole('button',{name:'Save changes',exact:true}).isDisabled(),true);assert.equal(puts(h).length,2,'Reload must not replay rejected save');assert.equal(await b.evaluate(()=>sessionStorage.getItem('customvibe-admin-draft')),null);
 });
 await scenario('theme rename conflict retains dialog input and never overwrites the saved winner','/themes?view=occasions',async(h,a,b)=>{
  for(const page of [a,b])await page.getByRole('button',{name:'Rename Christmas',exact:true}).waitFor();
  await b.getByRole('button',{name:'Rename Christmas',exact:true}).click();await b.getByRole('textbox',{name:'Occasion name',exact:true}).fill('Synthetic B Christmas');
  await a.getByRole('button',{name:'Rename Christmas',exact:true}).click();await a.getByRole('textbox',{name:'Occasion name',exact:true}).fill('Synthetic A Christmas');await a.getByRole('button',{name:'Save occasion',exact:true}).click();await a.getByRole('heading',{name:'Synthetic A Christmas',exact:true}).waitFor();
  await b.getByRole('button',{name:'Save occasion',exact:true}).click();await b.locator('#occasion-error').filter({hasText:'Another admin saved changes'}).waitFor();assert.equal(await b.getByRole('textbox',{name:'Occasion name',exact:true}).inputValue(),'Synthetic B Christmas');assert.equal(await b.locator('#occasion-name').evaluate(el=>el===document.activeElement),true);
  let saved=await(await actorRequest(h,'B','/api/seasons')).json();assert.equal(saved.occasionSettings.christmas.name,'Synthetic A Christmas');assert.equal(saved.revision,2);assert.equal(saved.mode,'off');assert.ok(saved.campaigns.every(c=>!c.enabled&&!c.published));assert.deepEqual(puts(h).map(o=>[o.actor,o.status]),[['A',200],['B',409]]);
  await b.screenshot({path:resolve(out,'theme-rename-stale-conflict.png'),fullPage:true});await b.getByRole('button',{name:'Cancel',exact:true}).click();await b.getByRole('button',{name:'Refresh saved themes',exact:true}).click();await b.getByRole('heading',{name:'Synthetic A Christmas',exact:true}).waitFor();assert.equal(puts(h).length,2);saved=await(await actorRequest(h,'A','/api/seasons')).json();assert.equal(saved.revision,2);
 });
 await scenario('theme draft survives a real conflict and saves only after an explicit second action','/themes?view=occasions',async(h,a,b)=>{
  for(const page of [a,b])await page.getByRole('button',{name:'Edit Christmas',exact:true}).waitFor();
  await b.getByRole('button',{name:'Edit Christmas',exact:true}).click();const headline=b.locator('[data-copy="headline"]');await headline.fill('Synthetic B wording kept after conflict');
  await a.getByRole('button',{name:'Rename Christmas',exact:true}).click();await a.getByRole('textbox',{name:'Occasion name',exact:true}).fill('Synthetic A latest Christmas');await a.getByRole('button',{name:'Save occasion',exact:true}).click();await a.getByRole('heading',{name:'Synthetic A latest Christmas',exact:true}).waitFor();
  await b.getByRole('button',{name:'Save draft',exact:true}).click();await b.locator('#toast').filter({hasText:'Another admin saved changes'}).waitFor();assert.equal(await headline.inputValue(),'Synthetic B wording kept after conflict');
  let saved=await(await actorRequest(h,'A','/api/seasons')).json();assert.equal(saved.revision,2);assert.equal(saved.occasionSettings.christmas.name,'Synthetic A latest Christmas');assert.deepEqual(saved.drafts,{});assert.equal(puts(h).length,2);await b.screenshot({path:resolve(out,'theme-draft-stale-conflict.png'),fullPage:true});
  await b.getByRole('button',{name:'Save draft',exact:true}).click();await b.locator('#save-state').filter({hasText:'Draft saved'}).waitFor();saved=await(await actorRequest(h,'A','/api/seasons')).json();assert.equal(saved.revision,3);assert.equal(saved.occasionSettings.christmas.name,'Synthetic A latest Christmas');assert.equal(Object.values(saved.drafts)[0].copy.headline,'Synthetic B wording kept after conflict');assert.ok(saved.campaigns.every(c=>!c.enabled&&!c.published));assert.equal(saved.mode,'off');assert.deepEqual(puts(h).map(o=>[o.actor,o.status]),[['A',200],['B',409],['B',200]]);
 });
 assert.deepEqual(errors,[],'No uncaught page errors');assert.deepEqual(external,[],'No external requests');assert.deepEqual(unexpected,[],'No bridge failures');await writeFile(resolve(out,'browser-results.json'),JSON.stringify({results,errors,external,unexpected},null,2)+'\n');console.log('PASS: three two-context built-UI journeys; all writes used real Worker/SQLite; no external requests');
}finally{await browser.close()}
