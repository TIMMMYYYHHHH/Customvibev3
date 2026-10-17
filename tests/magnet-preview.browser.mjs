// Run with a local Vite server and PLAYWRIGHT_MODULE set if Playwright is not installed locally.
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
try{
 for(const width of [360,390,768,1200,1440]){
  const page=await browser.newPage({viewport:{width,height:900}});
  for(const route of ['collections','home']){
   await page.goto(`${process.env.PREVIEW_ORIGIN||'http://127.0.0.1:5189'}/tests/fixtures/magnet-preview.html?page=${route}`);
   await page.locator('.puzzle-visual img').first().waitFor();
   for(const size of route==='home'?[3,5]:[3]){
    if(size===5)await page.getByRole('button',{name:'5 × 5',exact:true}).click();
    await page.waitForFunction(count=>document.querySelectorAll('.puzzle-visual img').length===count,size*size);
    const bounds=await page.locator('.puzzle-visual').evaluate(el=>{
     const art=el.closest('.catalog-art,.product-art');
     const rect=element=>{const {left,right,top,bottom}=element.getBoundingClientRect();return {left,right,top,bottom}};
     return {art:rect(art),tiles:[...el.querySelectorAll('.magnet-preview-piece')].map(rect)};
    });
    for(const tile of bounds.tiles){
     assert.ok(tile.left>=bounds.art.left-1&&tile.right<=bounds.art.right+1&&tile.top>=bounds.art.top-1&&tile.bottom<=bounds.art.bottom+1,`${route} ${width}px ${size}x${size}: puzzle tile escapes artwork area: ${JSON.stringify({tile,art:bounds.art})}`);
    }
    console.log(`PASS ${route} ${width}px ${size}x${size}: all puzzle tiles stay in artwork area`);
   }
  }
  await page.close();
 }
}finally{await browser.close()}
