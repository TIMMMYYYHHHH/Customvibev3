// Run against a local Vite server. The fixture blocks submissions and uses synthetic basket data.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
const origin=process.env.PREVIEW_ORIGIN||'http://127.0.0.1:5196';
const screenshots=process.env.SCREENSHOT_DIR;
if(screenshots)await mkdir(screenshots,{recursive:true});
try{
 for(const width of [375,768,1440])for(const dialog of [false,true]){
  const page=await browser.newPage({viewport:{width,height:1000}});
  await page.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
  const open=async query=>{
   await page.goto(`${origin}/tests/fixtures/collections-responsive.html?${dialog?'dialog&':''}${query||''}`);
   await page.locator('.collection-picker').waitFor();
   await page.evaluate(()=>document.fonts.ready);
  };
  await open();
  const geometry=await page.locator('.collection-picker').evaluate(el=>{
   const rect=selector=>{const {left,right,top,bottom}=el.querySelector(selector).getBoundingClientRect();return {left,right,top,bottom}};
   const summary=el.querySelector('.collection-picker-summary'),gallery=el.querySelector('.collection-picker-art');
   return {styles:rect('.artwork-styles'),summary:rect('.collection-picker-summary'),gallery:rect('.collection-picker-art'),action:rect('.button.action'),total:rect('.collection-total'),summaryBeforeGallery:!!(summary.compareDocumentPosition(gallery)&Node.DOCUMENT_POSITION_FOLLOWING),overflow:document.documentElement.scrollWidth>innerWidth||[el,summary,gallery].some(node=>node.scrollWidth>node.clientWidth+1)};
  });
  assert.equal(geometry.overflow,false,`${width}px overflow`);
  if(width<=768){
   assert.ok(geometry.action.bottom<=geometry.gallery.top,`${width}px Add must precede the long gallery`);
   assert.ok(geometry.total.bottom<=geometry.gallery.top,`${width}px total must precede the long gallery`);
   assert.equal(geometry.summaryBeforeGallery,true,'DOM order must match narrow visual order');
   await page.locator('.artwork-style-options input:checked').focus();
   await page.keyboard.press('Tab');
   assert.match(await page.locator(':focus').innerText(),/^Full set/);
   await page.keyboard.press('Tab');
   assert.match(await page.locator(':focus').innerText(),/^Choose your own/);
   await page.keyboard.press('Tab');
   assert.equal(await page.locator(':focus').innerText(),'Add full set to basket');
   await page.keyboard.press('Tab');
   assert.equal(await page.locator(':focus').innerText(),'View basket');
   await page.keyboard.press('Tab');
   assert.equal(await page.locator(':focus').getAttribute('aria-label'),'Browse all magnets');
  }else{
   assert.ok(geometry.styles.right<geometry.gallery.left&&geometry.gallery.right<geometry.summary.left,'Desktop rail/gallery/summary columns');
   assert.ok(Math.abs(geometry.styles.top-geometry.gallery.top)<2&&Math.abs(geometry.summary.top-geometry.gallery.top)<2,'Desktop columns aligned');
  }
  assert.equal(await page.locator('.collection-picker .button.action').count(),1);
  assert.equal(await page.locator('.collection-picked-count').innerText(),'26 magnets');
  assert.equal((await page.locator('.collection-picked-price').innerText()).replace(/\s/g,''),'R1040');
  for(const [style,label] of [['watercolour','Watercolour storybook'],['gouache','Bold painted gouache'],['paper','Layered paper'],['clay','Handmade clay'],['pencil','Pencil & ink']]){
   await page.locator(`.artwork-style-options label:has(input[value="${style}"])`).click();
   assert.equal(await page.locator('.collection-style-name').innerText(),label);
   await page.getByRole('button',{name:'Add full set to basket',exact:true}).click();
   assert.deepEqual(JSON.parse(await page.getByLabel('Saved selection').textContent()),{kind:'alphabet',style});
  }
  await page.getByRole('button',{name:'Choose your own',exact:false}).click();
  assert.equal(await page.getByRole('button',{name:'Add selection to basket',exact:true}).isDisabled(),true);
  assert.match(await page.locator('.collection-picked-labels').innerText(),/Choose at least one letter/);
  await page.getByRole('button',{name:'Select A',exact:true}).click();
  await page.getByRole('spinbutton',{name:'Quantity of A',exact:true}).fill('2');
  await page.getByRole('button',{name:'Select Z',exact:true}).click();
  assert.equal(await page.locator('.collection-picked-count').innerText(),'3 magnets');
  assert.equal((await page.locator('.collection-picked-price').innerText()).replace(/\s/g,''),'R150');
  await page.getByRole('button',{name:'Add selection to basket',exact:true}).click();
  assert.deepEqual(JSON.parse(await page.getByLabel('Saved selection').textContent()),{kind:'alphabet',designIds:['alphabet-1','alphabet-26'],designQuantities:[2,1],style:'pencil'});
  if(screenshots){await page.evaluate(()=>{window.scrollTo(0,0);document.querySelector('dialog')?.scrollTo(0,0);document.querySelectorAll('.collection-picker>*').forEach(el=>el.scrollTo(0,0))});await page.screenshot({path:`${screenshots}/TECH-06-${width}-${dialog?'dialog':'page'}.png`,fullPage:true});}
  await open('edit');
  assert.equal(await page.locator('.collection-style-name').innerText(),'Handmade clay');
  assert.equal(await page.locator('.collection-picked-count').innerText(),'3 magnets per set · 3 sets in your basket');
  assert.equal((await page.locator('.collection-picked-price').innerText()).replace(/\s/g,''),'R150');
  await page.getByRole('spinbutton',{name:'Quantity of Z',exact:true}).fill('2');
  assert.equal((await page.locator('.collection-picked-price').innerText()).replace(/\s/g,''),'R200');
  await page.getByRole('button',{name:'Save selection',exact:true}).click();
  assert.deepEqual(JSON.parse(await page.getByLabel('Saved selection').textContent()),{kind:'alphabet',designIds:['alphabet-1','alphabet-26'],designQuantities:[2,2],style:'clay'});
  console.log(`PASS ${width}px ${dialog?'dialog':'page'}: layout, keyboard, full set, five styles, empty selection, quantities and saved copies`);
  await page.close();
 }
}finally{await browser.close()}
