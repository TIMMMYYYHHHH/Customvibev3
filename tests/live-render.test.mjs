import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {renderDocument,sitemap} from '../server/render.mjs';import {defaultContent} from '../src/content/model.mjs';
const template=await readFile('dist/client/index.html','utf8');
test('live content creates new product routes and updates HTML metadata without rebuild',()=>{const content=structuredClone(defaultContent);content.products.push({...content.products[0],id:'new-collection',name:'New collection',description:'New description',status:'available',priceCents:5000});const r=renderDocument(template,'/products/new-collection',content,'testnonce');assert.equal(r.status,200);assert.match(r.html,/<title>New collection \| CustomVibe<\/title>/);assert.match(sitemap(content),/products\/new-collection/);content.products.at(-1).status='hidden';assert.equal(renderDocument(template,'/products/new-collection',content,'testnonce').status,404);assert.doesNotMatch(sitemap(content),/products\/new-collection/)});
test('server JSON cannot escape script element and valid pages return 200',()=>{const content=structuredClone(defaultContent);content.products[0].description='</script><script>alert(1)</script>';const r=renderDocument(template,'/collections',content,'abc');assert.equal(r.status,200);assert.equal(r.html.includes('</script><script>alert(1)'),false);assert.match(r.html,/nonce="abc"/)});
test('practical collections are inspiration and retired designer links lead to the studio',()=>{
 const content=structuredClone(defaultContent);content.products.forEach(p=>p.status='available');
 for(const kind of ['business','qr','wifi','information']){
  const idea=renderDocument(template,'/products/'+kind,content,'testnonce');assert.equal(idea.status,200);assert.match(idea.html,/Inspiration/);assert.match(idea.html,/Open the studio/);assert.doesNotMatch(idea.html,/Choose your design option|Design it for me/);
  const retired=renderDocument(template,'/design/'+kind,content,'testnonce');assert.equal(retired.status,200);assert.match(retired.html,/Notes or instructions for us/);assert.doesNotMatch(retired.html,/Design it for me|Business and contact details/);
 }
});
