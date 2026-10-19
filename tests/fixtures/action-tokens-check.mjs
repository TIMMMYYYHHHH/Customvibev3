// Private CSS harness. Only localhost requests are allowed.
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
const require=createRequire('/Users/timothymorton/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium}=require('playwright');
const root=process.cwd(),mode=process.argv[2]||'before',out=resolve(root,'../../audit/fix-plan/tech14-evidence');
await mkdir(out,{recursive:true});
let probe=false;
const baselineFiles=new Map(mode==='before'?['src/consistency.css','src/button-system.css','admin/workroom.css'].map(file=>['/'+file,execFileSync('git',['show','HEAD:'+file],{cwd:root})]):[]);
const server=createServer(async(req,res)=>{try{const name=new URL(req.url,'http://localhost').pathname;let file=resolve(root,'.'+name);if(!file.startsWith(root+'/'))throw Error('path');let body=baselineFiles.get(name)||await readFile(file);if(probe&&name==='/src/button-tokens.css')body=Buffer.from(body.toString().replace('--cv-action: #ae2e5b','--cv-action: #123456').replace('--cv-action-hover: #92234b','--cv-action-hover: #345678').replace('--cv-radius: 14px','--cv-radius: 19px'));res.setHeader('content-type',({'.html':'text/html','.css':'text/css','.woff2':'font/woff2'})[extname(file)]||'application/octet-stream');res.end(body)}catch{res.writeHead(404).end()}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,channel:'chrome'});
const context=await browser.newContext({reducedMotion:'reduce'});
await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
const page=await context.newPage(),failures=[];
page.on('pageerror',e=>failures.push(e.message));
const props=['backgroundColor','color','borderTopColor','borderTopWidth','borderRadius','boxShadow','backgroundImage','outlineColor','outlineStyle','outlineWidth','outlineOffset','fontFamily','fontWeight','fontSize','minHeight','filter','transform','opacity','cursor','padding','display','width','height'];
async function style(el){return el.evaluate((node,props)=>{document.getAnimations().forEach(a=>{try{a.finish()}catch{}});let s=getComputedStyle(node);return Object.fromEntries(props.map(k=>[k,s[k]]))},props)}
let data={};
async function checkRoles(){
 const errors=[];
 await page.goto(`${origin}/tests/fixtures/action-tokens-public.html`,{waitUntil:'networkidle'});
 const disabled=page.locator('[data-check="public-disabled-secondary"]');await disabled.hover({force:true});
 if((await style(disabled)).backgroundColor!=='rgb(231, 226, 221)')errors.push('Disabled secondary hover must stay neutral');
 await page.goto(`${origin}/tests/fixtures/action-tokens-seasons.html`,{waitUntil:'networkidle'});
 const primary=page.locator('[data-check="season-primary"]');
 if((await style(primary)).backgroundColor!=='rgb(174, 46, 91)')errors.push('Seasonal admin primary action must use shared berry');
 await primary.hover();if((await style(primary)).backgroundColor!=='rgb(146, 35, 75)')errors.push('Seasonal admin primary hover must use shared berry hover');
 for(const width of [375,768,1440]){
  await page.setViewportSize({width,height:1000});
  await page.goto(`${origin}/tests/fixtures/action-tokens-public.html`,{waitUntil:'networkidle'});
  const contact=page.locator('[data-check="store-disabled"]');
  for(const state of ['normal','hover']){
   await page.mouse.move(0,0);if(state==='hover')await contact.hover({force:true});
   const value=await style(contact);
   if(value.backgroundColor!=='rgb(231, 226, 221)'||value.color!=='rgb(119, 110, 122)')errors.push(`${width}: disabled Contact ${state} must use neutral fill and text`);
   if(await contact.isEnabled())errors.push(`${width}: Contact must retain native disabled semantics`);
  }
  await page.goto(`${origin}/tests/fixtures/action-tokens-seasons.html`,{waitUntil:'networkidle'});
  for(const [id,fill,text,hoverFill] of [
   ['season-icon','rgb(41, 20, 56)','rgb(255, 255, 255)','rgb(41, 20, 56)'],
   ['season-icon-unselected','rgb(157, 220, 196)','rgb(41, 20, 56)','rgb(131, 204, 177)'],
   ['season-icon-disabled-selected','rgb(231, 226, 221)','rgb(119, 110, 122)','rgb(231, 226, 221)'],
   ['season-icon-disabled','rgb(231, 226, 221)','rgb(119, 110, 122)','rgb(231, 226, 221)']]){
   const icon=page.locator(`[data-check="${id}"]`);
   for(const state of ['normal','hover','focus']){
    await page.mouse.move(0,0);await icon.evaluate(n=>n.blur());
    if(state==='hover')await icon.hover({force:true});
    if(state==='focus'){await page.keyboard.press('Tab');await icon.focus();}
    const value=await style(icon);
    if(value.backgroundColor!==(state==='hover'?hoverFill:fill)||value.color!==text)errors.push(`${width}: ${id} ${state} must retain its canonical role`);
    if(value.borderRadius!=='14px'||value.boxShadow!=='none'||value.backgroundImage!=='none')errors.push(`${width}: ${id} geometry/flat fill changed`);
    if(state==='focus'&&await icon.isEnabled()&&(value.outlineWidth!=='3px'||value.outlineStyle!=='solid'))errors.push(`${width}: ${id} requires visible keyboard focus`);
   }
  }
 }
 assert.deepEqual(errors,[],'Canonical role checks');
}
try{
 if(mode==='contract'){await checkRoles();console.log('canonical role checks passed');}else{
 for(const surface of ['public','admin','seasons'])for(const width of [375,768,1440]){
  await page.setViewportSize({width,height:1000});await page.goto(`${origin}/tests/fixtures/action-tokens-${surface}.html`,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
  await page.mouse.move(0,0);data[`${surface}-${width}`]={};
  const rows=await page.locator('[data-check]').all();
  for(const el of rows){const id=await el.getAttribute('data-check');data[`${surface}-${width}`][id]={normal:await style(el)};}
  await page.screenshot({path:resolve(out,`${mode}-${surface}-${width}-normal.png`),fullPage:true});
  await page.keyboard.press('Tab');
  for(const el of rows){const id=await el.getAttribute('data-check');if(await el.isEnabled()){await el.hover();data[`${surface}-${width}`][id].hover=await style(el);await page.mouse.move(0,0);await el.focus();data[`${surface}-${width}`][id].focus=await style(el);await el.evaluate(n=>n.blur());}else{await el.hover({force:true});data[`${surface}-${width}`][id].hover=await style(el);await page.mouse.move(0,0)}}
  const primary=page.locator(`[data-check="${surface==='public'?'public-primary':surface==='admin'?'admin-primary':'season-primary'}"]`);
  await primary.focus();await page.screenshot({path:resolve(out,`${mode}-${surface}-${width}-focus.png`),fullPage:true});await primary.evaluate(n=>n.blur());await primary.hover();await style(primary);await page.screenshot({path:resolve(out,`${mode}-${surface}-${width}-hover.png`),fullPage:true});
 }
 await writeFile(resolve(out,`${mode}-computed.json`),JSON.stringify(data,null,2)+'\n');
 if(mode==='after'){
  const baseline=JSON.parse(await readFile(resolve(out,'before-computed.json'),'utf8'));
  for(const width of [375,768,1440]){
   baseline[`public-${width}`]['public-disabled-secondary'].hover.backgroundColor='rgb(231, 226, 221)';
   for(const state of ['normal','focus','hover'])baseline[`seasons-${width}`]['season-primary'][state].backgroundColor=state==='hover'?'rgb(146, 35, 75)':'rgb(174, 46, 91)';
   for(const state of ['normal','hover']){
    baseline[`public-${width}`]['store-disabled'][state].backgroundColor='rgb(231, 226, 221)';
    baseline[`public-${width}`]['store-disabled'][state].color='rgb(119, 110, 122)';
    baseline[`public-${width}`]['store-disabled'][state].outlineColor='rgb(119, 110, 122)';
   }
   for(const state of ['normal','focus','hover']){
    baseline[`seasons-${width}`]['season-icon'][state].backgroundColor='rgb(41, 20, 56)';
    baseline[`seasons-${width}`]['season-icon'][state].color='rgb(255, 255, 255)';
    baseline[`seasons-${width}`]['season-icon'][state].borderTopColor='rgb(255, 255, 255)';
    if(state!=='focus')baseline[`seasons-${width}`]['season-icon'][state].outlineColor='rgb(255, 255, 255)';
   }
  }
  assert.deepEqual(data,baseline,'Only the documented disabled, generic seasonal primary and selected-icon role fills/text may change');
  await checkRoles();
 }
 probe=true;await page.goto(`${origin}/tests/fixtures/action-tokens-public.html`,{waitUntil:'networkidle'});
 let el=page.locator('[data-check="public-primary"]'),current=await style(el);
 assert.equal(current.backgroundColor,'rgb(18, 52, 86)','Primary must resolve from the sole shared token definition');assert.equal(current.borderRadius,'19px','Radius must resolve from the sole shared token definition');
 await el.hover();assert.equal((await style(el)).backgroundColor,'rgb(52, 86, 120)','Hover must resolve from the sole shared token definition');
 await page.goto(`${origin}/tests/fixtures/action-tokens-admin.html`,{waitUntil:'networkidle'});el=page.locator('[data-check="admin-primary"]');current=await style(el);assert.equal(current.backgroundColor,'rgb(18, 52, 86)');assert.equal(current.borderRadius,'19px');
 assert.deepEqual(failures,[],'No browser errors');
 console.log(`${mode}: three surfaces at 375/768/1440 captured; computed equality and authoritative-token probe passed`);
}}finally{await browser.close();await new Promise(r=>server.close(r))}
