// Run against a local Vite server. This is separate from the dependency-free Node suite.
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.PREVIEW_ORIGIN||'http://127.0.0.1:5195';
assert.ok(['localhost','127.0.0.1','[::1]'].includes(new URL(origin).hostname),'Only local fixtures are allowed');
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
const pages=[];
async function open(query='',script=false){
 const page=await browser.newPage();pages.push(page);page.setDefaultTimeout(6000);
 await page.addInitScript(()=>{window.storageWrites=[];Storage.prototype.setItem=function(...args){window.storageWrites.push(args);throw Error('Draft persistence is forbidden');};});
 let scripts=0;
 await page.route('**/*',route=>{
  const url=new URL(route.request().url());
  if(url.origin===origin){if(url.pathname==='/auth/login')return route.fulfill({body:'Synthetic sign-in page'});return route.continue();}
  if(script&&url.hostname==='challenges.cloudflare.com'){scripts++;if(scripts>1)return route.fulfill({contentType:'application/javascript',body:'window.turnstile=window.recoveryFixture.makeTurnstile();'});}
  return route.abort();
 });
 await page.goto(origin+'/tests/fixtures/form-recovery.html'+query,{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForFunction(()=>window.recoveryFixture?.photo,{},{timeout:30000});
 return page;
}
const finish=async page=>{assert.deepEqual(await page.evaluate(()=>window.storageWrites),[],'No customer draft persistence');await page.close();};
const warn=page=>page.evaluate(()=>!window.dispatchEvent(new Event('beforeunload',{cancelable:true})));
const state=page=>page.evaluate(()=>window.recoveryFixture.snapshot);
const ready=async(page,order=false)=>{await page.waitForFunction(order=>{const button=[...document.querySelectorAll('button')].find(b=>b.textContent===(order?'Place unpaid order':'Send message'));return button&&!button.disabled;},order);};
const retry=async page=>{await page.getByRole('button',{name:'Retry security check',exact:true}).click();};
const fill=async page=>{await page.getByLabel('Your name',{exact:true}).fill('Recovery customer');await page.getByLabel('Email address',{exact:true}).fill('fixture@example.com');await page.getByLabel('Your message',{exact:true}).fill('Keep this unsent message.');};
const expire=page=>page.evaluate(()=>window.recoveryFixture.widgets.at(-1)['expired-callback']());
try{
 if(!process.env.RECOVERY_APP_ONLY){
 const contact=await open();
 assert.equal(await warn(contact),false,'Blank contact is not dirty');await fill(contact);assert.equal(await warn(contact),true,'Unsent contact warns');
 await contact.evaluate(()=>{window.recoveryFixture.configMode='ready';});await retry(contact);await ready(contact);
 assert.equal(await contact.getByLabel('Your message',{exact:true}).inputValue(),'Keep this unsent message.');
 assert.equal(await contact.evaluate(()=>window.recoveryFixture.sends.length),0);
 console.log('PASS: failed config recovers without clearing or sending the contact draft');
 await expire(contact);assert.equal(await contact.getByRole('button',{name:'Send message',exact:true}).isDisabled(),true);
 await retry(contact);await ready(contact);
 await contact.evaluate(()=>{window.recoveryFixture.widgets.at(-1)['error-callback']();});
 await contact.getByRole('button',{name:'Retry security check',exact:true}).waitFor();
 await contact.evaluate(()=>{const button=[...document.querySelectorAll('button')].find(b=>b.textContent==='Retry security check');button.click();button.click();button.click();});await ready(contact);
 await expire(contact);
 await contact.evaluate(()=>window.recoveryFixture.widgets[0].callback('stale-token'));
 assert.equal(await contact.getByRole('button',{name:'Send message',exact:true}).isDisabled(),true,'Removed widget callback cannot restore a token');
 await retry(contact);await ready(contact);
 assert.equal(await contact.evaluate(()=>window.recoveryFixture.widgets.length-window.recoveryFixture.removed.length),1,'Exactly one live widget');
 console.log('PASS: expiry, widget failure, repeated retry and stale callbacks preserve one active check');
 await contact.getByRole('button',{name:'Send message',exact:true}).click();await contact.getByText('Synthetic uncertain outcome. Keep the same request.',{exact:true}).waitFor();
 const pending=await state(contact);assert.equal(pending.uncertain,true);assert.equal(pending.pending,true);
 await expire(contact);await retry(contact);await contact.waitForFunction(()=>window.recoveryFixture.widgets.length>1);
 assert.equal((await state(contact)).attempt.id,pending.attempt.id);assert.equal((await state(contact)).error,pending.error);assert.equal(await contact.evaluate(()=>window.recoveryFixture.sends.length),1);
 await contact.getByRole('button',{name:'Check or retry message',exact:true}).click();
 await contact.waitForFunction(()=>window.recoveryFixture.sends.length===2);
 assert.equal(await contact.evaluate(()=>window.recoveryFixture.sends[0].payload.id===window.recoveryFixture.sends[1].payload.id),true);
 console.log('PASS: uncertain outcome stays visible and only explicit submission retries the original ID');await finish(contact);
 const manual=await open('?config=ready');await fill(manual);await ready(manual);await manual.evaluate(()=>{window.recoveryFixture.sendMode='manual';});await manual.getByRole('button',{name:'Send message',exact:true}).click();await manual.getByRole('button',{name:'Message needs checking',exact:true}).waitFor();
 const locked=await state(manual);await expire(manual);await retry(manual);await manual.waitForFunction(()=>window.recoveryFixture.widgets.length>=3);
 assert.equal((await state(manual)).manualReview,true);assert.equal((await state(manual)).attempt.id,locked.attempt.id);assert.equal((await state(manual)).error,locked.error);assert.equal(await manual.getByRole('button',{name:'Message needs checking',exact:true}).isDisabled(),true);assert.equal(await manual.evaluate(()=>window.recoveryFixture.sends.length),1);
 console.log('PASS: manual-review lock survives security recovery');await finish(manual);
 for(const config of ['signin','html']){
  const page=await open('?config='+config);await fill(page);const link=page.getByRole('link',{name:'Sign in in a new tab'});assert.equal(await link.getAttribute('target'),'_blank');
  const popupPromise=page.waitForEvent('popup');await link.click();const popup=await popupPromise;await popup.close();
  await page.evaluate(()=>{window.recoveryFixture.configMode='ready';});await retry(page);await ready(page);assert.equal(await page.getByLabel('Your name',{exact:true}).inputValue(),'Recovery customer');assert.equal(await page.evaluate(()=>window.recoveryFixture.sends.length),0);await finish(page);
 }
 console.log('PASS: 401 and login HTML recover via a separate sign-in tab without automatic submission');
 const script=await open('?config=ready&script',true);await fill(script);await retry(script);await ready(script);assert.equal(await script.getByLabel('Your message',{exact:true}).inputValue(),'Keep this unsent message.');
 console.log('PASS: failed challenge script can load again in place');await finish(script);
 const stale=await open('?config=held');await stale.getByRole('button',{name:'Toggle form',exact:true}).click();await stale.evaluate(()=>{window.recoveryFixture.configMode='ready';});await stale.getByRole('button',{name:'Toggle form',exact:true}).click();await ready(stale);await stale.evaluate(()=>window.recoveryFixture.releases.forEach(release=>release()));await ready(stale);
 console.log('PASS: responses from unmounted StrictMode config loads cannot replace fresh config');await finish(stale);
 const unavailable=await open('?config=unavailable');await unavailable.getByText('This form is getting ready.',{exact:false}).waitFor();assert.equal(await unavailable.getByRole('link',{name:'Sign in in a new tab'}).count(),0);await unavailable.evaluate(()=>{window.recoveryFixture.configMode='ready';});await retry(unavailable);await ready(unavailable);
 const completed=await open('?config=ready');await fill(completed);await ready(completed);await completed.evaluate(()=>{window.recoveryFixture.sendMode='success';});await completed.getByRole('button',{name:'Send message',exact:true}).click();await completed.getByRole('dialog').waitFor();assert.equal(await warn(completed),false);await completed.getByRole('button',{name:'Close confirmation'}).click();assert.equal(await warn(completed),false);await completed.getByLabel('Your name',{exact:true}).fill('Temporary');assert.equal(await warn(completed),true);await completed.getByLabel('Your name',{exact:true}).fill('');assert.equal(await warn(completed),false);
 console.log('PASS: unavailable config differs from sign-in, and cleared/completed contact drafts stop unload warnings');
 const order=await open('?order&private');const original=await order.evaluate(()=>({photo:JSON.stringify(window.recoveryFixture.photo),draft:JSON.stringify(window.recoveryFixture.draft)}));
 await order.evaluate(()=>{window.recoveryFixture.configMode='ready';});await retry(order);await ready(order,true);assert.deepEqual(await order.evaluate(()=>({photo:JSON.stringify(window.recoveryFixture.photo),draft:JSON.stringify(window.recoveryFixture.draft)})),original);
 await order.getByRole('checkbox').check();await order.getByRole('button',{name:'Place unpaid order',exact:true}).click();await order.getByText('Synthetic uncertain outcome. Keep the same request.',{exact:true}).waitFor();
 const orderPending=await state(order);assert.equal(orderPending.uncertain,true);assert.equal(orderPending.resume,'synthetic-resume');assert.ok(orderPending.uploads.length>0);
 await order.evaluate(()=>{window.recoveryFixture.savedUploads=window.recoveryFixture.snapshot.uploads;});await expire(order);await retry(order);await order.getByRole('button',{name:'Retry same order',exact:true}).waitFor();
 assert.equal((await state(order)).attempt.id,orderPending.attempt.id);assert.equal((await state(order)).resume,orderPending.resume);assert.equal((await state(order)).error,orderPending.error);assert.equal(await order.evaluate(()=>window.recoveryFixture.savedUploads===window.recoveryFixture.snapshot.uploads),true);assert.equal(await order.evaluate(()=>window.recoveryFixture.sends.length),1);
 console.log('PASS: order crop, rotation, quantity and fields survive; uncertain artwork identity/uploads/resume remain locked');await finish(order);
 const preview=await open('?preview&config=ready');await preview.getByText('Website preview. Sending is unavailable here.',{exact:true}).waitFor();assert.equal(await preview.evaluate(()=>window.recoveryFixture.reads),0);assert.equal(await preview.evaluate(()=>window.recoveryFixture.widgets.length),0);assert.equal(await preview.getByRole('button',{name:'Retry security check',exact:true}).count(),0);
 console.log('PASS: admin preview never requests real form config or renders a challenge');await finish(preview);
 }
 const studio=await open('?app=studio');assert.equal(await warn(studio),false);
 await studio.getByLabel('Upload photos',{exact:true}).setInputFiles('public/assets/brand-icon.png');await studio.getByRole('button',{name:'Rotate right',exact:true}).click();await studio.getByRole('button',{name:'Zoom in',exact:true}).click();await studio.getByRole('button',{name:'More copies',exact:true}).click();
 const photoSource=await studio.getByRole('button',{name:'Edit brand-icon.png',exact:true}).locator('img').getAttribute('src');assert.ok(photoSource.startsWith('blob:'));assert.equal(await warn(studio),true);
 await studio.getByRole('navigation',{name:'Design progress'}).getByRole('button',{name:/Checkout/}).click();await studio.getByLabel('Name',{exact:true}).fill('Photo customer');await studio.getByLabel('Email',{exact:true}).fill('photo@example.com');await studio.evaluate(()=>{window.recoveryFixture.configMode='ready';});await retry(studio.locator('#delivery-form'));await ready(studio,true);
 assert.equal(await studio.getByLabel('Name',{exact:true}).inputValue(),'Photo customer');await studio.getByLabel('Locker name',{exact:true}).fill('Temporary locker');await studio.getByLabel('Locker name',{exact:true}).fill('');await studio.getByLabel('Name',{exact:true}).fill('');await studio.getByLabel('Email',{exact:true}).fill('');await studio.getByRole('button',{name:'Back to the designer',exact:true}).click();assert.equal(await studio.getByLabel('Zoom',{exact:true}).inputValue(),'1.1');assert.equal(await studio.getByRole('button',{name:'Edit brand-icon.png',exact:true}).locator('img').getAttribute('src'),photoSource);assert.equal(await warn(studio),true);
 await studio.getByRole('button',{name:'Remove selected',exact:true}).click();assert.equal(await warn(studio),false,'Fully cleared order, including manual locker object, is not dirty');
 console.log('PASS: real App photo work and checkout values remain in memory through security recovery');await finish(studio);
 const clearedPhoto=await open('?app=studio');await clearedPhoto.getByLabel('Upload photos',{exact:true}).setInputFiles('public/assets/brand-icon.png');await clearedPhoto.getByRole('button',{name:'Remove selected',exact:true}).click();assert.equal(await warn(clearedPhoto),false);
 const business=await open('?app=studio/business');assert.equal(await warn(business),false);await business.getByRole('button',{name:'Guest Wi-Fi: add your details',exact:true}).click();assert.equal(await warn(business),false,'Untouched template selection is not dirty');await business.getByLabel('Wi-Fi network name',{exact:true}).fill('Local guest network');assert.equal(await warn(business),true);await business.getByLabel('Wi-Fi network name',{exact:true}).fill('');assert.equal(await warn(business),false);
 const handy=await open('?app=studio/handy');await handy.getByRole('button',{name:'Emergency contacts: add your details',exact:true}).click();assert.equal(await warn(handy),false);await handy.getByLabel('Family',{exact:true}).fill('Local contact');assert.equal(await warn(handy),true);await handy.getByLabel('Family',{exact:true}).fill('');assert.equal(await warn(handy),false);
 console.log('PASS: cleared photos and template fields stop warnings; default design selection does not warn');
 for(const page of pages.filter(page=>!page.isClosed()))assert.deepEqual(await page.evaluate(()=>window.storageWrites),[],'No customer draft persistence');
 console.log('PASS: no localStorage/sessionStorage writes in recovery journeys');
}finally{await browser.close();}
