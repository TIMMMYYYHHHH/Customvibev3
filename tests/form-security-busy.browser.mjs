// Uses the existing local recovery fixture, real Checkout/FormSecurity and synthetic APIs.
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.PREVIEW_ORIGIN||'http://127.0.0.1:5198';
assert.ok(['localhost','127.0.0.1','[::1]'].includes(new URL(origin).hostname),'Local fixture only');
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
let passed=0;
try{
 for(const callback of ['expired-callback','error-callback'])for(const outcome of ['success','failure','signin']){
  const page=await browser.newPage();page.setDefaultTimeout(10000);const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
  await page.goto(origin+'/tests/fixtures/form-recovery.html?order&private&config=ready');
  await page.waitForFunction(()=>window.recoveryFixture?.photo&&window.recoveryFixture.widgets.length);
  await page.evaluate(outcome=>{
   const fixture=window.recoveryFixture,original=window.fetch;
   fixture.sendMode=outcome==='success'?'success':'uncertain';
   window.fetch=async(input,options)=>{
    if(new URL(typeof input==='string'?input:input.url,location.origin).pathname==='/api/artwork/upload'){
     await new Promise(resolve=>{fixture.releaseUpload=resolve;});
     if(outcome==='signin'){fixture.configMode='signin';return Response.json({error:'Synthetic upload interruption. Keep this order.'},{status:403});}
     if(outcome==='failure')return Response.json({error:'Synthetic upload interruption. Keep this order.'},{status:503});
    }
    return original(input,options);
   };
  },outcome);
  await page.getByRole('checkbox').check();
  await page.getByRole('button',{name:'Place unpaid order',exact:true}).click();
  await page.waitForFunction(()=>typeof window.recoveryFixture.releaseUpload==='function');
  const originalId=await page.evaluate(()=>window.recoveryFixture.snapshot.attempt.id);
  await page.evaluate(callback=>window.recoveryFixture.widgets.at(-1)[callback](),callback);
  // The real callback has cleared the token. It must not falsely stop a valid upload.
  await page.waitForFunction(()=>window.recoveryFixture.snapshot.busy===true);
  assert.equal(await page.getByRole('button',{name:'Placing order…',exact:true}).isDisabled(),true);
  assert.equal(await page.locator('.form-security [role="alert"]').count(),0,callback+' must not display a stopped-security warning during upload');
  assert.equal(await page.getByRole('button',{name:'Retry security check',exact:true}).count(),0,'No unusable retry action while the current submission runs');
  assert.equal(await page.evaluate(()=>window.recoveryFixture.sends.length),0,'No order finalization while its upload is held');
  if(outcome!=='success')await page.evaluate(()=>{
   // Hold the external challenge's next callback so the failed request's recovery
   // UI can be observed before a fresh challenge succeeds.
   window.turnstile.render=(_element,options)=>{const fixture=window.recoveryFixture,id=fixture.widgets.length;fixture.widgets.push(options);return id;};
  });
  await page.evaluate(()=>window.recoveryFixture.releaseUpload());
  if(outcome==='success'){
   await page.waitForFunction(()=>!!window.recoveryFixture.snapshot.result);
   assert.equal(await page.evaluate(()=>window.recoveryFixture.sends.length),1,'Exactly one normal finalization');
   assert.equal(await page.evaluate(()=>window.recoveryFixture.sends[0].payload.id),originalId);
   assert.equal(await page.evaluate(()=>window.recoveryFixture.sends[0].grant),'synthetic-grant');
  }else{
   await page.getByText('Synthetic upload interruption. Keep this order.',{exact:true}).waitFor();
   await page.getByRole('button',{name:'Retry security check',exact:true}).waitFor();
   assert.equal(await page.getByRole('button',{name:'Retry security check',exact:true}).isEnabled(),true);
   assert.equal(await page.getByRole('button',{name:'Retry same order',exact:true}).isDisabled(),true,'Expired token remains unusable after failure');
   assert.equal(await page.evaluate(()=>window.recoveryFixture.snapshot.attempt.id),originalId);
   assert.equal(await page.evaluate(()=>window.recoveryFixture.sends.length),0);
   if(outcome==='signin'){
    await page.getByRole('link',{name:'Sign in in a new tab',exact:true}).waitFor();
    assert.equal(await page.getByRole('link',{name:'Sign in in a new tab',exact:true}).getAttribute('target'),'_blank');
    await page.evaluate(()=>{window.recoveryFixture.configMode='ready';});
   }
   const widgetCount=await page.evaluate(()=>window.recoveryFixture.widgets.length);
   await page.getByRole('button',{name:'Retry security check',exact:true}).click();
   await page.waitForFunction(count=>window.recoveryFixture.widgets.length>count,widgetCount);
   await page.evaluate(()=>window.recoveryFixture.widgets.at(-1).callback('fresh-synthetic-security'));
   await page.waitForFunction(()=>{const button=[...document.querySelectorAll('button')].find(b=>b.textContent==='Retry same order');return button&&!button.disabled;});
   assert.equal(await page.evaluate(()=>window.recoveryFixture.snapshot.attempt.id),originalId);
   assert.equal(await page.evaluate(()=>window.recoveryFixture.sends.length),0,'Security recovery never resubmits automatically');
  }
  assert.deepEqual(errors,[]);passed++;
  console.log('PASS: '+callback+' during held upload, then '+outcome);
  await page.close();
 }
 console.log('PASS: '+passed+' callback/upload outcomes; recovery remains explicit and no external APIs are used');
}finally{await browser.close();}
