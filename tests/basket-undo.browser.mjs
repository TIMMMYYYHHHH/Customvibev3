// Local Vite fixture only. No provider, email or production data requests are allowed.
import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.PREVIEW_ORIGIN||'http://127.0.0.1:5297';
assert.ok(['localhost','127.0.0.1','[::1]'].includes(new URL(origin).hostname),'Local fixtures only');
const screenshotDir=process.env.SCREENSHOT_DIR||'/tmp/customvibe-undo-screenshots';await mkdir(screenshotDir,{recursive:true});
const image=await readFile('public/assets/brand-icon.png');
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
const pages=[];
async function open(viewport={width:1440,height:1000}){
 const page=await browser.newPage({viewport});pages.push(page);page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(30000);
 await page.addInitScript(()=>{window.storageWrites=[];Storage.prototype.setItem=function(...args){window.storageWrites.push(args);throw Error('Draft persistence is forbidden');};});
 await page.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
 await page.goto(origin+'/tests/fixtures/basket-undo.html',{waitUntil:'domcontentloaded'});
 await page.getByLabel('Upload photos',{exact:true}).waitFor({state:'attached'});await page.clock.install();return page;
}
const photos=async(page,count)=>{await page.getByLabel('Upload photos',{exact:true}).setInputFiles(Array.from({length:count},(_,index)=>({name:'local-'+index+'.png',mimeType:'image/png',buffer:image})));await page.getByRole('button',{name:'Edit local-0.png',exact:true}).waitFor();};
const route=async(page,path)=>{await page.evaluate(path=>{history.pushState(null,'',path);dispatchEvent(new PopStateEvent('popstate'));},path);};
const basket=async page=>{await route(page,'/basket');await page.waitForFunction(()=>!!document.querySelector('.collection-review-page')&&!document.querySelector('.flow-loading'));};
const remove=async(page,index=0)=>{await page.locator('[data-basket-item]').nth(index).getByRole('button',{name:/^Delete /}).focus();await page.keyboard.press('Enter');await page.getByRole('button',{name:'Undo',exact:true}).waitFor();};
const snapshot=page=>page.locator('[data-basket-item]').evaluateAll(cards=>cards.map(card=>({id:card.dataset.basketItem,text:card.innerText,images:[...card.querySelectorAll('img')].map(img=>img.getAttribute('src'))})));
const revoke=page=>page.evaluate(()=>window.undoFixture.revoked);
const warning=page=>page.evaluate(()=>!window.dispatchEvent(new Event('beforeunload',{cancelable:true})));
async function finish(page){assert.deepEqual(await page.evaluate(()=>window.storageWrites),[]);await page.close();}
async function checkout(page){
 await route(page,'/checkout');await page.getByLabel('Name',{exact:true}).fill('Local test customer');await page.getByLabel('Email',{exact:true}).fill('fixture@example.com');await page.getByLabel('Mobile number',{exact:true}).fill('0821234567');await page.getByLabel('Locker name',{exact:true}).fill('Local locker');await page.getByLabel('Town or suburb',{exact:true}).fill('Durban');await page.getByRole('checkbox').check();
}
try{
 if(!process.env.UNDO_LIFECYCLE_ONLY){
 const mixed=await open();await photos(mixed,2);
 await mixed.getByRole('button',{name:'Rotate right',exact:true}).click();await mixed.getByRole('button',{name:'Zoom in',exact:true}).click();await mixed.getByRole('button',{name:'More copies',exact:true}).click();
 await mixed.getByRole('button',{name:'Edit local-1.png',exact:true}).click();await mixed.getByRole('button',{name:/^Picture puzzle/}).click();await basket(mixed);
 await route(mixed,'/products/alphabet');await mixed.getByText('Handmade clay',{exact:true}).first().click();await mixed.getByRole('button',{name:/^Choose your own/}).click();await mixed.getByRole('spinbutton',{name:'Quantity of A',exact:true}).fill('3');await mixed.getByRole('spinbutton',{name:'Quantity of C',exact:true}).fill('2');await mixed.getByRole('button',{name:'Add selection to basket',exact:true}).click();await basket(mixed);
 const original=await snapshot(mixed);assert.equal(original.length,3);
 for(let index=0;index<3;index++){
  await remove(mixed,index);assert.equal(await mixed.getByRole('button',{name:'Undo',exact:true}).evaluate(button=>button===document.activeElement),true);
  if(index===0)await mixed.screenshot({path:resolve(screenshotDir,'undo-desktop.png')});
  await mixed.keyboard.press('Enter');await mixed.waitForFunction(()=>!document.querySelector('.flow-loading'));assert.deepEqual(await snapshot(mixed),original);
  assert.equal(await mixed.locator('[data-basket-item]').nth(index).getByRole('button',{name:/^Delete /}).evaluate(button=>button===document.activeElement),true);
 }
 assert.deepEqual(await revoke(mixed),[]);assert.equal(await mixed.evaluate(()=>window.undoFixture.sends.length),0);
 console.log('PASS: keyboard Undo restores photo, puzzle and styled selection at exact mixed positions with quantities and previews');await finish(mixed);
 const personal=await open();await route(personal,'/studio/business');await personal.getByRole('button',{name:'Guest Wi-Fi: add your details',exact:true}).click();await personal.getByLabel('Business name',{exact:true}).fill('Local cafe');await personal.getByLabel('Wi-Fi network name',{exact:true}).fill('Local guest');await personal.getByLabel('Guest Wi-Fi password',{exact:true}).fill('Synthetic123');await personal.getByRole('button',{name:'Add magnet to basket',exact:true}).click();await personal.locator('[data-basket-item]').waitFor();await basket(personal);await personal.getByRole('button',{name:/^Increase /}).click();const personalBefore=await snapshot(personal);await remove(personal);await personal.getByRole('button',{name:'Undo',exact:true}).click();assert.deepEqual(await snapshot(personal),personalBefore);await personal.getByRole('button',{name:/^Edit /}).click();assert.equal(await personal.getByLabel('Business name',{exact:true}).inputValue(),'Local cafe');assert.equal(await personal.getByLabel('Wi-Fi network name',{exact:true}).inputValue(),'Local guest');assert.equal(await personal.getByLabel('Guest Wi-Fi password',{exact:true}).inputValue(),'Synthetic123');
 console.log('PASS: personalised template, QR state and copies survive removal and Undo');await finish(personal);
 }
 const expiry=await open();await photos(expiry,3);await basket(expiry);const sources=await expiry.evaluate(()=>window.undoFixture.created);await remove(expiry);assert.deepEqual(await revoke(expiry),[]);await remove(expiry);assert.deepEqual(await revoke(expiry),[sources[0]]);await expiry.getByRole('button',{name:'Undo',exact:true}).click();assert.equal(await expiry.locator('[data-basket-item]').count(),2);assert.deepEqual(await revoke(expiry),[sources[0]]);await remove(expiry);await expiry.clock.fastForward(10010);assert.equal(await expiry.getByRole('button',{name:'Undo',exact:true}).count(),0);assert.deepEqual(await revoke(expiry),[sources[0],sources[1]]);assert.equal(await expiry.locator('[data-basket-item]').count(),1);
 await remove(expiry);assert.equal(await warning(expiry),true);await expiry.clock.fastForward(10010);await expiry.getByRole('button',{name:'Undo',exact:true}).waitFor({state:'detached'});await expiry.waitForFunction(()=>window.dispatchEvent(new Event('beforeunload',{cancelable:true})));assert.equal(await warning(expiry),false);assert.deepEqual(await revoke(expiry),sources);
 console.log('PASS: one-removal buffer replaces safely; 10-second expiry releases only unused originals and clears dirty state');await finish(expiry);
 const shared=await open();await shared.evaluate(()=>{window.undoFixture.shareOriginals=true;});await photos(shared,2);await basket(shared);const sharedSource=await shared.evaluate(()=>window.undoFixture.sharedSource);await remove(shared);await shared.clock.fastForward(10010);assert.deepEqual(await revoke(shared),[]);await route(shared,'/studio');assert.equal(await shared.locator('.studio-thumbnails img').getAttribute('src'),sharedSource);assert.equal(await shared.locator('.studio-thumbnails img').evaluate(img=>img.complete&&img.naturalWidth>0),true);await basket(shared);await remove(shared);await shared.clock.fastForward(10010);assert.deepEqual(await revoke(shared),[sharedSource]);
 console.log('PASS: shared original URL remains usable until the last retained photo is removed');await finish(shared);
 for(const mode of ['success','uncertain','manual']){
  const page=await open();await photos(page,2);await basket(page);const sources=await page.evaluate(()=>window.undoFixture.created);await remove(page);await page.evaluate(mode=>{window.undoFixture.sendMode=mode;},mode);await checkout(page);await page.getByRole('button',{name:'Place unpaid order',exact:true}).click();await page.waitForFunction(()=>window.undoFixture.sends.length===1);assert.equal(await page.getByRole('button',{name:'Undo',exact:true}).count(),0);assert.ok((await revoke(page)).includes(sources[0]));
  if(mode==='success'){
   await page.getByRole('heading',{name:'Your order is with us.',exact:true}).waitFor();await page.getByRole('button',{name:'Start another order',exact:true}).click();await page.clock.fastForward(10010);assert.equal(await page.getByRole('button',{name:'Undo',exact:true}).count(),0);assert.equal(await page.locator('.studio-thumbnails img').count(),0);assert.ok((await revoke(page)).includes(sources[1]));
  }else{
   await page.getByText('Synthetic uncertain order. Keep this tab open.',{exact:true}).waitFor();await route(page,'/basket');await page.getByRole('heading',{name:'Your magnet order.',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Undo',exact:true}).count(),0);assert.equal((await revoke(page)).includes(sources[1]),false);assert.equal(await warning(page),true);if(mode==='manual'){await page.getByRole('button',{name:'Retry same order',exact:true}).click();assert.equal(await page.evaluate(()=>window.undoFixture.sends.length),1);}
  }
  assert.equal(await page.evaluate(()=>window.undoFixture.sends.length),1);await finish(page);
 }
 console.log('PASS: submission, uncertain/manual-review and completed/new-order boundaries cannot resurrect removed work or send automatically');
 const mobile=await open({width:390,height:844});await photos(mobile,1);await basket(mobile);await remove(mobile);await mobile.screenshot({path:resolve(screenshotDir,'undo-mobile.png')});const bounds=await mobile.getByRole('button',{name:'Undo',exact:true}).boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=390);assert.equal(await mobile.getByRole('button',{name:'Undo',exact:true}).evaluate(button=>button===document.activeElement),true);await mobile.keyboard.press('Enter');assert.equal(await mobile.locator('[data-basket-item]').count(),1);await finish(mobile);
 console.log('PASS: mobile Undo stays visible, keyboard reachable and usable without persistent storage');
}finally{await browser.close();}
