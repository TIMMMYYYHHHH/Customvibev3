import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PDFDocument,PDFName,PDFRawStream,decodePDFRawStream} from 'pdf-lib';
import {createPrintJob} from '../admin/print-layout.mjs';
import {exportPrintPdf} from '../admin/print-pdf.mjs';
const jpeg=new Uint8Array(readFileSync('tests/fixtures/print-tile.jpg'));
const logo=new Uint8Array(readFileSync('public/coming-soon/puzzle-logo-v2.png'));
const sha=async bytes=>Buffer.from(await crypto.subtle.digest('SHA-256',bytes)).toString('hex');
const mm=n=>n*72/25.4;
async function setup(qty=7,calibration={}){
 const name='design-01-photo.jpg',o={id:'12345678-1234-1234-1234-123456789abc',reference:'CV-000001',version:2,artworkExpires:Math.floor(Date.now()/1000)+3600,snapshot:{contact:{email:'private@example.invalid',name:'Private customer'},notes:'Private notes',magnetQty:qty,items:[{kind:'photo',qty,faceCount:1,files:[{name,index:0,size:jpeg.length,sha256:await sha(jpeg),proof:false}]}]}};
 return {job:createPrintJob(o,{calibration}),artwork:new Map([[name,jpeg]]),order:o};
}
const streams=pdf=>pdf.context.enumerateIndirectObjects().map(([,v])=>v).filter(v=>v instanceof PDFRawStream);
const contents=pdf=>streams(pdf).filter(v=>!v.dict.has(PDFName.of('Subtype'))).map(v=>Buffer.from(decodePDFRawStream(v).decode()).toString('latin1')).join('\n');

test('PDF has measured A4 pages, exact 63.5 mm images and unchanged JPEG reused across seven copies',async()=>{
 const {job,artwork}=await setup();const bytes=await exportPrintPdf(job,artwork,{logoBytes:logo});assert.ok(bytes instanceof Uint8Array);
 const pdf=await PDFDocument.load(bytes);assert.equal(pdf.getPageCount(),2);
 for(const page of pdf.getPages()){const s=page.getSize();assert.ok(Math.abs(s.width-mm(210))<.00001);assert.ok(Math.abs(s.height-mm(297))<.00001);}
 const jpgs=streams(pdf).filter(v=>v.dict.get(PDFName.of('Filter'))?.toString()==='/DCTDecode');assert.equal(jpgs.length,1);assert.deepEqual(new Uint8Array(jpgs[0].contents),jpeg);
 const text=contents(pdf);assert.equal((text.match(/ Do\b/g)||[]).length,7*5);assert.equal((text.match(/<40637573746F6D76696265>/gi)||[]).length,7*4);assert.doesNotMatch(text,/mypicmag|Private customer|private@example|Private notes/);assert.match(text,new RegExp(String(mm(63.5))));
 const first=job.pages[0].placements[0];assert.match(text,new RegExp(String(mm(first.xMm))));assert.match(text,new RegExp(String(mm(297-first.yMm-63.5))));
});

test('hiding outlines retains four live back labels and logos per magnet; advanced size is explicit',async()=>{
 const {job,artwork}=await setup(1,{showGuides:false,imageMm:70});const pdf=await PDFDocument.load(await exportPrintPdf(job,artwork,{logoBytes:logo}));const text=contents(pdf);
 assert.equal((text.match(/<40637573746F6D76696265>/gi)||[]).length,4);assert.equal((text.match(/ Do\b/g)||[]).length,5);assert.equal((text.match(/^S$/gm)||[]).length,0);assert.match(text,new RegExp(String(mm(70))));
 const guides=await setup(1);const withGuides=contents(await PDFDocument.load(await exportPrintPdf(guides.job,guides.artwork,{logoBytes:logo})));assert.equal((withGuides.match(/^S$/gm)||[]).length,8);
});

test('PDF rejects missing, changed, tampered, nonsquare artwork and invalid jobs without partial output',async()=>{
 const {job,artwork}=await setup();await assert.rejects(exportPrintPdf(job,new Map(),{logoBytes:logo}),/missing|unavailable/i);
 const altered=jpeg.slice();altered[altered.length-3]^=1;await assert.rejects(exportPrintPdf(job,new Map([[job.files[0].name,altered]]),{logoBytes:logo}),/hash|changed|integrity/i);
 await assert.rejects(exportPrintPdf(job,new Map([[job.files[0].name,new Uint8Array(3)]]),{logoBytes:logo}),/size|changed|JPEG/i);
 await assert.rejects(exportPrintPdf({...job},artwork,{logoBytes:logo}),/valid print job/i);
 await assert.rejects(exportPrintPdf(job,artwork,{logoBytes:new Uint8Array(3)}),/logo|PNG/i);
});

test('nonsquare JPEG and expired jobs fail; every PDF requires the current logo',async()=>{
 const {job,artwork,order}=await setup(1);await assert.rejects(exportPrintPdf(job,artwork),/logo/i);
 const bytes=jpeg.slice();let patched=false;for(let i=0;i<bytes.length-9;i++)if(bytes[i]===255&&[192,193,194].includes(bytes[i+1])){bytes[i+8]^=1;patched=true;break;}assert.equal(patched,true);delete order.snapshot.items[0].files[0].sha256;
 await assert.rejects(exportPrintPdf(createPrintJob(order),new Map([[job.files[0].name,bytes]]),{logoBytes:logo}),/square/i);
 order.artworkExpires=Math.floor(Date.now()/1000)-1;const expired=createPrintJob(order,{now:(order.artworkExpires-1)*1000});await assert.rejects(exportPrintPdf(expired,artwork,{logoBytes:logo}),/expired/i);
});

test('legacy JPEG without a recorded hash still embeds its exact bytes',async()=>{
 const {order,artwork}=await setup(1);delete order.snapshot.items[0].files[0].sha256;
 const pdf=await PDFDocument.load(await exportPrintPdf(createPrintJob(order),artwork,{logoBytes:logo}));const jpgs=streams(pdf).filter(v=>v.dict.get(PDFName.of('Filter'))?.toString()==='/DCTDecode');assert.equal(jpgs.length,1);assert.deepEqual(new Uint8Array(jpgs[0].contents),jpeg);
});
