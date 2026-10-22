import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {policies} from '../src/policies.mjs';
import {metadata} from '../src/seo.mjs';

const read=file=>readFile(new URL('../'+file,import.meta.url),'utf8');
const approvalPromises=/private link to approve|approve (?:it|your final magnet artwork|the exact final artwork revision) before printing|approve it for printing|print only after you approve|needs your approval again|after final artwork approval|send another private review link/i;

test('public order guidance describes customer self-preview without a later approval promise',async()=>{
 for(const file of ['src/HelpContent.jsx','src/Checkout.jsx','src/ProofReview.jsx'])assert.doesNotMatch(await read(file),approvalPromises,file);
 const faq=await read('src/HelpContent.jsx');
 assert.match(faq,/designer and checkout/i);
 assert.match(faq,/spelling.*quantit.*QR/i);
 assert.match(faq,/14 days/);
 assert.match(faq,/six months/);
 const checkout=await read('src/Checkout.jsx');
 assert.match(checkout,/Magnets in your basket/);
 assert.match(checkout,/I have permission to use these photos, logos and details/);
 assert.match(checkout,/Payment status: Unpaid/);
 assert.match(checkout,/No payment is taken through this website/);
 assert.match(checkout,/store my chosen designs privately for 14 days/);
});

test('policies preserve privacy, retention and unpaid truth without making approval a production premise',()=>{
 const text=JSON.stringify(policies);
 assert.doesNotMatch(text,approvalPromises);
 assert.doesNotMatch(text,/You must explicitly approve|so you can approve it or request changes/i);
 assert.match(text,/14 days after the original upload/);
 assert.match(text,/six calendar months from submission/);
 assert.match(text,/Original photos are not uploaded/);
 assert.match(text,/No payment is taken and no delivery booking is made/);
 assert.match(text,/must have permission to reproduce them/);
 assert.match(text,/Check spelling, numbers and any QR code before ordering/);
 assert.match(text,/never.*sends? an email automatically/i);
});

test('old review links are non-actionable and metadata makes no approval invitation',async()=>{
 const screen=await read('src/ProofReview.jsx');
 assert.doesNotMatch(screen,/fetch\(|\/api\/proof|<img|<form|<input|respond\(|Approve for printing|Request changes/);
 assert.match(screen,/separate artwork approval is not required after ordering/i);
 const meta=metadata('proof',{products:[]});
 assert.equal(meta.noindex,true);
 assert.doesNotMatch(meta.title+' '+meta.description,/approve|approval|privately review/i);
});

test('rendered public pages and FAQ structured data contain the corrected customer guidance',async()=>{
 for(const page of ['help','privacy','terms','shipping','proof']){
  const html=await read('dist/client/'+page+'.html');
  assert.doesNotMatch(html,approvalPromises,page);
 }
 const help=await read('dist/client/help.html');
 assert.match(help,/Can I preview my design before ordering\?/);
 const graph=JSON.parse(help.match(/<script id="structured-data" type="application\/ld\+json">(.*?)<\/script>/s)[1]);
 const faq=graph['@graph'].find(node=>node['@type']==='FAQPage');
 const preview=faq.mainEntity.find(item=>item.name==='Can I preview my design before ordering?');
 assert.match(preview.acceptedAnswer.text,/designer and checkout/);
 assert.match(preview.acceptedAnswer.text,/no separate proof email/i);
 const retired=await read('dist/client/proof.html');
 assert.match(retired,/old review link no longer needs a response/);
 assert.doesNotMatch(retired,/Approve for printing|Request changes|\/api\/proof/);
});
