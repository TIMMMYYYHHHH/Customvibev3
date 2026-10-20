import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
const api=await import('../shared/route-styles.mjs').catch(()=>({}));
const sample=()=>({'index.html':{file:'assets/main.js',css:['assets/common.css'],imports:['_base.js']},'_base.js':{file:'assets/base.js',css:['assets/fonts.css']},'src/Checkout.jsx':{file:'assets/Checkout.js',css:['assets/locker.css'],imports:['_leaflet.js','_base.js'],dynamicImports:['_unrelated.js']},'_leaflet.js':{file:'assets/leaflet.js',css:['assets/leaflet.css']},'_unrelated.js':{file:'assets/later.js',css:['assets/later.css']}});
const catalogue={version:1,editor:[],handy:[],business:[],basket:[],checkout:['/assets/leaflet.css','/assets/locker.css']};
test('manifest static dependency order excludes eager and unrelated deferred CSS',()=>{
 assert.equal(typeof api.routeStyleCatalogue,'function','manifest-derived styles are not implemented');
 assert.deepEqual(api.routeStyleCatalogue(sample(),'index.html'),catalogue);
});
test('missing, empty and unsafe manifest dependencies fail instead of producing unstyled checkout',()=>{
 assert.equal(typeof api.routeStyleCatalogue,'function');
 for(const mutate of [m=>delete m['src/Checkout.jsx'],m=>delete m['_leaflet.js'],m=>{m['src/Checkout.jsx'].css=[];m['_leaflet.js'].css=[]},m=>m['_leaflet.js'].css=['https://evil.invalid/x.css'],m=>m['_leaflet.js'].css=['assets/../x.css'],m=>m['_leaflet.js'].css=['assets/x.css?q=1']]){const m=sample();mutate(m);assert.throws(()=>api.routeStyleCatalogue(m,'index.html'))}
});
test('composition is idempotent and selected links precede common overrides without poisoning another route',()=>{
 assert.equal(typeof api.composeRouteStyles,'function');const template='<html><head><link rel="stylesheet" href="/assets/common.css"></head><body>real SSR</body></html>';
 const checkout=api.composeRouteStyles(template,catalogue,'/checkout');assert.ok(checkout.indexOf('/assets/leaflet.css"')<checkout.indexOf('/assets/locker.css"'));assert.ok(checkout.indexOf('/assets/locker.css"')<checkout.indexOf('/assets/common.css"'));
 assert.equal(api.composeRouteStyles(checkout,catalogue,'/checkout'),checkout);
 const home=api.composeRouteStyles(checkout,catalogue,'/');assert.doesNotMatch(home,/data-cv-route-style=/);assert.match(home,/real SSR/);assert.equal((home.match(/name="cv-route-styles"/g)||[]).length,1);
 assert.throws(()=>api.composeRouteStyles(template,{...catalogue,checkout:['/assets/x.css"><script>']},'/checkout'));
});
test('matching builds emit separate host manifests with real checkout CSS outside initial home',async()=>{
 const manifest=await readFile('dist/client/.vite/manifest.json','utf8').then(JSON.parse).catch(()=>null);assert.ok(manifest,'client build does not emit its route manifest');
 const admin=JSON.parse(await readFile('dist/admin/.vite/manifest.json','utf8'));for(const [m,entry,dir]of [[manifest,'index.html','client'],[admin,'admin/preview.html','admin']]){
  const c=api.routeStyleCatalogue(m,entry);assert.ok(c.checkout.length);for(const href of c.checkout)assert.match(await readFile('dist/'+dir+href,'utf8'),/leaflet-pane|locker-picker/);
 }
});

const resources=await import('../src/routes/route-styles.mjs').catch(()=>({}));
class Link extends EventTarget{constructor(){super();this.attrs={};this.isConnected=false;this.sheet=null}setAttribute(k,v){this.attrs[k]=v}getAttribute(k){return this.attrs[k]??null}hasAttribute(k){return Object.hasOwn(this.attrs,k)}remove(){this.isConnected=false;this.owner.links=this.owner.links.filter(l=>l!==this)}}
function documentFixture(){const doc={links:[],createElement(){const l=new Link();l.owner=doc;return l}};doc.head={querySelectorAll:()=>doc.links.filter(l=>l.hasAttribute('data-cv-route-style')),querySelector:()=>doc.links.find(l=>!l.hasAttribute('data-cv-route-style'))||null,insertBefore(link,before){link.isConnected=true;const i=doc.links.indexOf(before);doc.links.splice(i<0?doc.links.length:i,0,link)}};const common=doc.createElement();common.setAttribute('href','/assets/common.css');doc.head.insertBefore(common,null);return doc}
test('CSS resources wait for real load, share links, retain successful styles and evict failed resources for explicit retry',async()=>{
 assert.equal(typeof resources.createRouteStyles,'function','stylesheet readiness is not implemented');const doc=documentFixture(),r=resources.createRouteStyles({document:doc,catalogue});
 const first=r.load('checkout'),second=r.load('checkout');assert.equal(r.ready('checkout'),false);assert.equal(doc.links.length,3);assert.deepEqual(doc.links.map(l=>l.getAttribute('href')),['/assets/leaflet.css','/assets/locker.css','/assets/common.css']);
 const [a,b]=doc.links;a.sheet={};a.dispatchEvent(new Event('load'));b.dispatchEvent(new Event('error'));await assert.rejects(first,/stylesheet/i);await assert.rejects(second,/stylesheet/i);assert.equal(a.isConnected,true);assert.equal(b.isConnected,false);
 const retry=r.load('checkout');assert.equal(doc.links.length,3);const fixed=doc.links[1];fixed.sheet={};fixed.dispatchEvent(new Event('load'));await retry;assert.equal(r.ready('checkout'),true);await r.load('checkout');assert.equal(doc.links.length,3);
});
test('an SSR link that already failed cannot stay pending forever or become ready from presence alone',async()=>{
 assert.equal(typeof resources.createRouteStyles,'function');const doc=documentFixture(),link=doc.createElement();link.setAttribute('href','/assets/leaflet.css');link.setAttribute('data-cv-route-style','checkout');doc.head.insertBefore(link,doc.links[0]);
 let deadline;const timers={setTimeout(fn){deadline=fn;return 1},clearTimeout(){}};const r=resources.createRouteStyles({document:doc,catalogue:{...catalogue,checkout:['/assets/leaflet.css']},timers});const waiting=r.load('checkout');assert.equal(r.ready('checkout'),false);deadline();await assert.rejects(waiting,/stylesheet/i);assert.equal(link.isConnected,false);
});
test('bad/missing production catalogue rejects only checkout readiness instead of allowing unstyled code',async()=>{
 assert.equal(typeof resources.createRouteStyles,'function');for(const invalid of [null,{...catalogue,checkout:[]},{...catalogue,checkout:['//evil.invalid/x.css']}]){const r=resources.createRouteStyles({document:documentFixture(),catalogue:invalid});assert.equal(r.ready('editor'),true);assert.equal(r.ready('checkout'),false);await assert.rejects(r.load('checkout'))}
});

test('nested route entry accounting resolves root assets against the output root and includes selected CSS',async()=>{
 const {mkdtemp,writeFile,mkdir,rm}=await import('node:fs/promises'),{tmpdir}=await import('node:os'),{join}=await import('node:path');const {measureEntryAssets}=await import('../scripts/measure-entry-assets.mjs');
 const root=await mkdtemp(join(tmpdir(),'cv-nested-entry-'));try{
  await mkdir(join(root,'assets'));await mkdir(join(root,'products'));
  await writeFile(join(root,'assets','common.css'),'body{color:black}');await writeFile(join(root,'assets','checkout.css'),'.locker-picker{display:grid}');
  await writeFile(join(root,'products','local.html'),'<link rel="stylesheet" data-cv-route-style="checkout" href="/assets/checkout.css"><link rel="stylesheet" href="/assets/common.css">');
  const result=await measureEntryAssets(join(root,'products','local.html'),{root});assert.deepEqual(result.files.map(f=>f.path),['assets/checkout.css','assets/common.css']);assert.deepEqual(result.selectedRouteStyles,['assets/checkout.css']);
 }finally{await rm(root,{recursive:true,force:true})}
});
