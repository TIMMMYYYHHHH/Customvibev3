import assert from 'node:assert/strict';import {mkdir,readFile} from 'node:fs/promises';import {resolve} from 'node:path';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.PREVIEW_ORIGIN||'http://127.0.0.1:5298';assert.ok(['localhost','127.0.0.1','[::1]'].includes(new URL(origin).hostname));
const screenshots=process.env.SCREENSHOT_DIR||'/tmp/customvibe-focus-screenshots';await mkdir(screenshots,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE});
const focused=async locator=>assert.equal(await locator.evaluate(node=>node===document.activeElement),true);
const route=async(page,path)=>page.evaluate(path=>{history.pushState(null,'',path);dispatchEvent(new PopStateEvent('popstate'));},path);
async function open(options={}){const page=await browser.newPage({viewport:options.mobile?{width:390,height:844}:{width:1440,height:1000},reducedMotion:'reduce'});page.setDefaultTimeout(15000);await page.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());await page.addInitScript(()=>{window.storageWrites=[];Storage.prototype.setItem=function(...args){window.storageWrites.push(args);throw Error('No draft persistence');};});await page.goto(origin+'/tests/fixtures/public-focus.html'+(options.preview?'?preview':''));await page.getByLabel('Upload photos',{exact:true}).waitFor({state:'attached'});return page;}
async function finish(page){assert.deepEqual(await page.evaluate(()=>window.storageWrites),[]);assert.equal(await page.evaluate(()=>window.focusFixture.requests.some(r=>r.method!=='GET'&&r.path!=='/api/order-request')),false);await page.close();}
try{
 const page=await open();assert.equal(await page.evaluate(()=>document.activeElement===document.body),true,'Initial hydration does not steal focus');
 await page.getByRole('link',{name:'Handy at home',exact:true}).focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>document.activeElement?.textContent==='Handy at home.');
 for(const [path,title] of [['/studio/handy','Handy at home.'],['/studio/business','Business magnets.']]){
  await route(page,path);const choices=page.locator('.handy-chooser button'),name=await choices.nth(2).getAttribute('aria-label');await choices.nth(2).focus();await page.keyboard.press('Enter');
  await page.waitForFunction(()=>document.activeElement?.matches('.handy-fields h2'));await focused(page.locator('.handy-fields h2'));
  const input=page.locator('.handy-fields input').first();await input.fill('Local details');await focused(input);await page.waitForTimeout(800);await focused(input);
  await page.getByRole('button',{name:'Choose another design',exact:true}).click();await focused(page.getByRole('button',{name,exact:true}));
  await page.keyboard.press('Enter');await page.waitForFunction(()=>document.activeElement?.matches('.handy-fields h2'));assert.equal(await input.inputValue(),'Local details');
  if(path.endsWith('business'))await page.getByLabel('Menu link',{exact:true}).fill('https://example.com/menu');
  await page.getByRole('button',{name:'Add magnet to basket',exact:true}).click();await page.waitForFunction(()=>document.activeElement?.textContent==='Your basket.');
  await page.locator('[data-basket-item]').last().getByRole('button',{name:/^Edit /}).click();await page.waitForFunction(()=>document.activeElement?.matches('.handy-fields h2'));
  await page.getByRole('button',{name:'Cancel editing',exact:true}).click();await focused(page.getByRole('heading',{name:title,exact:true}));
 }
 console.log('PASS: keyboard selection, exact gallery return, unchanged drafts, saved item edit/cancel in both studios');
 await route(page,'/basket');await page.waitForFunction(()=>document.activeElement?.textContent==='Your basket.');await page.locator('[data-basket-item]').first().getByRole('button',{name:/^Delete /}).click();await focused(page.getByRole('button',{name:'Undo',exact:true}));await page.keyboard.press('Enter');await page.waitForFunction(()=>document.activeElement?.hasAttribute('data-basket-remove'));
 await route(page,'/help');await page.waitForFunction(()=>document.activeElement?.tagName==='H1');await page.getByRole('button',{name:'Delivery',exact:true}).click();await focused(page.getByRole('button',{name:'Delivery',exact:true}));
 await page.getByRole('link',{name:'Our story',exact:true}).click();await page.waitForFunction(()=>document.activeElement?.closest('#the-story'));await page.screenshot({path:resolve(screenshots,'section-focus-desktop.png')});
 await page.goBack();await page.waitForFunction(()=>document.activeElement?.closest('#delivery')&&location.pathname==='/help');await page.goForward();await page.waitForFunction(()=>document.activeElement?.closest('#the-story'));
 console.log('PASS: populated basket, Undo focus, same-page filter, section navigation and browser back/forward');

 // Hold animation frames to exercise focus moved after navigation but before its focus request.
 const hold=async page=>page.evaluate(()=>{window.savedRAF=window.requestAnimationFrame;window.focusFrames=[];window.requestAnimationFrame=fn=>(window.focusFrames.push(fn),window.focusFrames.length);});
 const flush=async page=>page.evaluate(()=>{window.requestAnimationFrame=window.savedRAF;window.focusFrames.splice(0).forEach(fn=>fn(performance.now()));});
 await page.evaluate(()=>window.focusFixture.configError=true);
 await hold(page);await route(page,'/checkout');await page.getByRole('heading',{name:'Your magnet order.',exact:true}).waitFor();
 const retry=page.locator('#delivery-form').getByRole('button',{name:'Retry security check',exact:true});await retry.waitFor();await retry.focus();await flush(page);await focused(retry);
 await page.evaluate(()=>window.focusFixture.configError=false);await retry.click();
 await page.getByLabel('Name',{exact:true}).fill('Local customer');await page.getByLabel('Email',{exact:true}).fill('fixture@example.com');await page.getByLabel('Mobile number',{exact:true}).fill('0821234567');
 await page.getByLabel('Locker name',{exact:true}).fill('Local locker');await page.getByLabel('Town or suburb',{exact:true}).fill('Durban');await page.locator('.order-consent input').check();
 await page.getByRole('button',{name:'Place unpaid order',exact:true}).click();await page.getByRole('button',{name:'Retry same order',exact:true}).waitFor();
 const attempt=await page.evaluate(()=>window.focusFixture.sends[0].payload.id);assert.equal(await page.getByLabel('Name',{exact:true}).isDisabled(),true);
 await page.evaluate(()=>window.focusFixture.widgets.filter(widget=>widget.action==='order').at(-1)['expired-callback']());await retry.focus();await retry.click();
 assert.equal(await page.evaluate(()=>window.focusFixture.sends.length),1,'Security retry never retries uncertain submission');
 await route(page,'/studio/handy');await page.getByRole('heading',{name:'Your magnet order.',exact:true}).waitFor();assert.equal(await page.locator('.handy-chooser').count(),0,'Uncertain order remains locked');
 assert.equal(await page.evaluate(()=>window.focusFixture.sends[0].payload.id),attempt);
 console.log('PASS: late route focus preserves recovery control; uncertain submission and original attempt remain locked');
 await hold(page);await route(page,'/help');await page.getByRole('heading',{level:1}).waitFor();
 await page.evaluate(()=>{const dialog=document.createElement('dialog');dialog.innerHTML='<button>Dialog control</button>';document.body.append(dialog);dialog.showModal();dialog.querySelector('button').focus();});
 await flush(page);await focused(page.getByRole('button',{name:'Dialog control',exact:true}));await page.evaluate(()=>document.querySelector('dialog').remove());
 console.log('PASS: open dialog retains focus during route completion');
 await finish(page);
 const empty=await open();await empty.waitForFunction(()=>window.focusFixture.widgets.length>0);await empty.evaluate(()=>window.focusFixture.widgets.at(-1)['expired-callback']());const existingRetry=empty.getByRole('button',{name:'Retry security check',exact:true});await existingRetry.focus();await hold(empty);await route(empty,'/help');await empty.getByRole('heading',{level:1}).waitFor();await flush(empty);await focused(existingRetry);
 await empty.getByRole('button',{name:'Delivery',exact:true}).focus();await route(empty,'/basket');await empty.waitForFunction(()=>document.activeElement?.textContent==='Your basket.');await finish(empty);
 const mobile=await open({mobile:true});const menu=mobile.getByRole('button',{name:'Open navigation',exact:true});await menu.click();await focused(mobile.getByRole('navigation',{name:'Main navigation'}).getByRole('link').first());await mobile.keyboard.press('Escape');await focused(menu);
 await menu.click();await mobile.getByRole('link',{name:'Our story',exact:true}).click();await mobile.waitForFunction(()=>document.activeElement?.closest('#the-story'));assert.equal(await menu.getAttribute('aria-expanded'),'false');
 await mobile.screenshot({path:resolve(screenshots,'section-focus-mobile.png')});await finish(mobile);
 console.log('PASS: empty basket, mobile menu open/Escape return and section navigation');
 const preview=await open({preview:true});await preview.getByRole('link',{name:'Handy at home',exact:true}).click();await preview.waitForFunction(()=>document.activeElement?.textContent==='Handy at home.');
 await preview.locator('.handy-chooser button').first().click();await focused(preview.locator('[data-studio-workbench]'));await preview.getByRole('button',{name:'Choose another design',exact:true}).click();await focused(preview.locator('.handy-chooser button').first());
 assert.equal(await preview.evaluate(()=>location.pathname),'/preview');assert.equal(await preview.evaluate(()=>window.focusFixture.requests.some(request=>request.path==='/api/forms')),false);await finish(preview);
 console.log('PASS: embedded preview routing, workbench/gallery focus and no form configuration calls');
}finally{await browser.close();}
