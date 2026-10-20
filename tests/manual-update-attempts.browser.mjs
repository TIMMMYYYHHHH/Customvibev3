// Synthetic local UI flow. Every API response is intercepted; no provider or live site is used.
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
try{
 const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 const id='11111111-1111-4111-8111-111111111111',attempt='22222222-2222-4222-8222-222222222222',retryToken='a'.repeat(64),t=Math.floor(Date.now()/1000);
 const order={id,reference:'CV-000001',version:0,status:'new',expires:t+1000,history:[],updates:[{attempt,version:0,status:'new',state:'failed',retryable:1,updated:t}],snapshot:{contact:{name:'Synthetic test',email:'synthetic@example.com',phone:'0000000'},locker:{name:'Synthetic',area:'Test'},magnetQty:1,subtotalCents:100,items:[]}};
 let sends=0,previews=0,release;const pending=new Promise(resolve=>release=resolve);
 await page.route('**/api/**',async route=>{const request=route.request(),path=new URL(request.url()).pathname;let result=order;
  if(path==='/api/session')result={csrf:'synthetic'};
  else if(path.endsWith('/preview-retry')){assert.equal(request.method(),'POST');assert.equal(request.headers()['x-csrf-token'],'synthetic');assert.deepEqual(request.postDataJSON(),{version:0});previews++;result={version:0,to:'synthetic@example.com',subject:'Synthetic retry preview',text:'Synthetic only',html:'<p>Synthetic only</p>',retryAttempt:attempt,retryToken};}
  else if(path.endsWith('/send')){sends++;assert.deepEqual(request.postDataJSON(),{version:0,retryAttempt:attempt,retryToken});await pending;order.updates.unshift({attempt:'33333333-3333-4333-8333-333333333333',version:0,status:'new',state:'accepted',retryable:0,updated:t+1});result={ok:true,state:'accepted'};}
  await route.fulfill({json:result});
 });
 await page.goto(`${process.env.PREVIEW_ORIGIN||'http://127.0.0.1:5193'}/tests/fixtures/manual-update-attempts.html`);
 await page.getByRole('button',{name:'Preview retry',exact:true}).click();await page.getByRole('dialog').waitFor();assert.equal(sends,0);assert.equal(previews,1);
 await page.getByRole('button',{name:'Close preview',exact:true}).click();assert.equal(sends,0);
 await page.getByRole('button',{name:'Preview retry',exact:true}).click();await page.getByRole('dialog').waitFor();assert.equal(previews,2);await page.getByRole('button',{name:'Send update',exact:true}).click();
 await page.getByRole('button',{name:'Sending…',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Sending…',exact:true}).isDisabled(),true);assert.equal(await page.getByRole('button',{name:'Close preview',exact:true}).isDisabled(),true);release();
 await page.getByRole('dialog').waitFor({state:'hidden'});assert.equal(sends,1);assert.equal(await page.getByRole('button',{name:'Preview update',exact:true}).isDisabled(),true);
 assert.equal(await page.locator('.cv-history li').count(),2);assert.match(await page.locator('.cv-history').innerText(),/Provider accepted/);assert.match(await page.locator('.cv-history').innerText(),/Provider rejected; not accepted/);assert.deepEqual(errors,[]);
 if(process.env.PROOF_SCREENSHOT)await page.locator('.cv-order-sidebar').screenshot({path:process.env.PROOF_SCREENSHOT});
 console.log('PASS: fresh explicit preview, zero preview sends, pending controls locked, one send, accepted and rejected history retained, no browser errors.');
}finally{await browser.close()}
