// Synthetic local OrderDetail exercise. All APIs are intercepted, external requests blocked.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.PREVIEW_ORIGIN||'http://127.0.0.1:5194';
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
const screenshots=process.env.PROOF_DIRECTORY||'/private/tmp/tech03-c-screenshots';await mkdir(screenshots,{recursive:true});
try{
 const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];let external=0,sends=0,previews=0,statusChanges=0,saved=null;
 page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url());
  if(url.origin!==origin){external++;await route.abort();return;}
  if(!url.pathname.startsWith('/api/')){await route.continue();return;}
  const order=saved||await page.evaluate(()=>window.syntheticOrder);
  if(url.pathname==='/api/session')return route.fulfill({json:{csrf:'synthetic'}});
  if(url.pathname.endsWith('/preview')){previews++;assert.equal(request.method(),'GET');return route.fulfill({json:{version:2,to:'synthetic@example.invalid',subject:'Synthetic preview only',text:'Synthetic fixture only.',html:'<p>Synthetic fixture only.</p>'}});}
  if(url.pathname.endsWith('/send')||url.pathname.includes('mail-delivery')){sends++;throw Error('Fixture must not send or observe');}
  if(url.pathname.endsWith('/status')){statusChanges++;assert.deepEqual(request.postDataJSON(),{status:'in_progress',version:2});saved={...order,status:'in_progress',version:3};return route.fulfill({json:{ok:true}});}
  assert.equal(request.method(),'GET');await route.fulfill({json:order});
 });
 const goto=async(name='')=>{saved=null;await page.goto(`${origin}/tests/fixtures/mail-delivery-admin.html${name?'?case='+name:''}`);await page.getByRole('heading',{name:'Activity & send history'}).waitFor();};
 await goto();
 const history=page.locator('#order-activity');assert.match(await history.innerText(),/Owner email\nProvider accepted[\s\S]*Recipient server accepted/);assert.match(await history.innerText(),/Customer order email[\s\S]*Delivery delayed/);assert.match(await history.innerText(),/Delivery failed[\s\S]*Complaint reported/);
 await page.getByRole('button',{name:'Preview update',exact:true}).click();await page.getByRole('dialog').waitFor();assert.equal(await page.getByRole('button',{name:'Send update',exact:true}).isEnabled(),true);assert.equal(sends,0);assert.equal(previews,1);await page.getByRole('button',{name:'Close preview',exact:true}).click();
 await page.getByRole('combobox',{name:'Order stage'}).click();await page.getByRole('option',{name:'In progress',exact:true}).click();await page.getByRole('button',{name:'Save stage',exact:true}).click();await page.getByText('Stage saved: In progress. No email was sent.',{exact:true}).waitFor();assert.equal(statusChanges,1);assert.equal(sends,0);
 await goto();await page.screenshot({path:screenshots+'/desktop.png',fullPage:true});await history.screenshot({path:screenshots+'/desktop-history.png'});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:screenshots+'/mobile.png',fullPage:true});await history.screenshot({path:screenshots+'/mobile-history.png'});
 for(const scenario of ['expired','legacy','unconfirmed','review','manual-untimed']){await goto(scenario);const text=await history.innerText();assert.match(text,/Provider accepted/);if(['expired','legacy'].includes(scenario))assert.doesNotMatch(text,/Delivery unconfirmed|Delivery delayed|Recipient server accepted|Delivery failed|Needs review|Webhook checked|Event time/);if(scenario==='unconfirmed'){assert.match(text,/Delivery unconfirmed/);assert.doesNotMatch(text,/Webhook checked|Event time/);}if(scenario==='review')assert.match(text,/Needs review/);if(scenario==='manual-untimed'){assert.match(text,/Owner dashboard checked/);assert.doesNotMatch(text,/Event time/);}assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);}
 await page.clock.install();await goto();await page.clock.fastForward('01:00:01');await page.getByText('Recipient server accepted',{exact:true}).waitFor({state:'hidden'});assert.doesNotMatch(await history.innerText(),/Recipient server accepted|Delivery delayed|Delivery failed|Webhook checked|Event time/);assert.match(await history.innerText(),/Provider accepted/);
 assert.equal(external,0);assert.equal(sends,0);assert.deepEqual(errors,[]);
 console.log('PASS: actual OrderDetail desktop/mobile, 6 scenarios, Preview and Send controls accessible, stage save and mounted expiry hiding, zero sends/observations/external requests, no overflow or browser errors.');
}finally{await browser.close()}
