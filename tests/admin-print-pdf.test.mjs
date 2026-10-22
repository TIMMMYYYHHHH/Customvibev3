import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PDFDocument,PDFName,PDFRawStream,decodePDFRawStream,StandardFonts} from 'pdf-lib';
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

test('PDF has measured A4 pages, default 68 mm images on unchanged 63.5 mm faces and unchanged JPEG reused across seven copies',async()=>{
 const {job,artwork}=await setup();const bytes=await exportPrintPdf(job,artwork,{logoBytes:logo});assert.ok(bytes instanceof Uint8Array);
 const pdf=await PDFDocument.load(bytes);assert.equal(pdf.getPageCount(),2);
 for(const page of pdf.getPages()){const s=page.getSize();assert.ok(Math.abs(s.width-mm(210))<.00001);assert.ok(Math.abs(s.height-mm(297))<.00001);}
 const jpgs=streams(pdf).filter(v=>v.dict.get(PDFName.of('Filter'))?.toString()==='/DCTDecode');assert.equal(jpgs.length,1);assert.deepEqual(new Uint8Array(jpgs[0].contents),jpeg);
 const text=contents(pdf);assert.equal((text.match(/ Do\b/g)||[]).length,7*5);assert.equal((text.match(/<40437573746F6D>/gi)||[]).length,7*4);assert.equal((text.match(/<56696265>/gi)||[]).length,7*4);assert.doesNotMatch(text,/mypicmag|Private customer|private@example|Private notes/);assert.match(text,new RegExp(String(mm(68))));
 const first=job.pages[0].placements[0];assert.match(text,new RegExp(String(mm(first.xMm))));assert.match(text,new RegExp(String(mm(297-first.yMm-68))));
});

test('hiding outlines retains four live back labels and logos per magnet; advanced size is explicit',async()=>{
 const {job,artwork}=await setup(1,{showGuides:false,imageMm:70});const pdf=await PDFDocument.load(await exportPrintPdf(job,artwork,{logoBytes:logo}));const text=contents(pdf);
 assert.equal((text.match(/<40437573746F6D>/gi)||[]).length,4);assert.equal((text.match(/<56696265>/gi)||[]).length,4);assert.equal((text.match(/ Do\b/g)||[]).length,5);assert.equal((text.match(/^S$/gm)||[]).length,0);assert.match(text,new RegExp(String(mm(70))));
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


test('two live handle runs use exact plum and berry and meet at measured offsets in all four rotations',async()=>{
 const {job,artwork}=await setup(1,{showGuides:false});const pdf=await PDFDocument.load(await exportPrintPdf(job,artwork,{logoBytes:logo}));
 const blocks=[...contents(pdf).matchAll(/BT\n([\s\S]*?)\nET/g)].map(m=>m[1]);assert.equal(blocks.length,8);
 const font=await pdf.embedFont(StandardFonts.Helvetica),advance=font.widthOfTextAtSize('@Custom',6);
 for(const [n,brand] of job.pages[0].placements[0].branding.entries()){
  const first=blocks[n*2],second=blocks[n*2+1];assert.match(first,/<40437573746F6D>/i);assert.match(second,/<56696265>/i);
  const rgb=b=>b.split('\n').find(l=>l.endsWith(' rg')).split(' ').slice(0,3).map(Number);
  for(const [actual,expected] of [[rgb(first),[41/255,20/255,56/255]],[rgb(second),[174/255,46/255,91/255]]])actual.forEach((v,i)=>assert.ok(Math.abs(v-expected[i])<1e-10));
  const matrix=b=>b.split('\n').find(l=>l.endsWith(' Tm')).split(' ').slice(0,6).map(Number),a=matrix(first),b=matrix(second),r=brand.rotation*Math.PI/180;
  assert.ok(Math.abs(b[4]-a[4]-advance*Math.cos(r))<1e-8);assert.ok(Math.abs(b[5]-a[5]+advance*Math.sin(r))<1e-8);
  a.slice(0,4).forEach((v,i)=>assert.ok(Math.abs(v-b[i])<1e-10));assert.match(first,/6 Tf/);assert.match(second,/6 Tf/);
 }
});


test('default 68 mm image leaves the four rotated labels and logos clear while 63.5 mm remains selectable',async()=>{
 const {job,artwork}=await setup(1);assert.equal(job.calibration.imageMm,68);const p=job.pages[0].placements[0];assert.equal(p.face.sizeMm,63.5);
 const pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.Helvetica);
 const rotate=(b,x,y)=>{const r=b.rotation*Math.PI/180;return {x:b.xMm+x*Math.cos(r)-y*Math.sin(r),y:b.yMm+x*Math.sin(r)+y*Math.cos(r)};};
 for(const b of p.branding){
  const width=font.widthOfTextAtSize('@CustomVibe',b.fontSizePt)*25.4/72,height=font.heightAtSize(b.fontSizePt)*25.4/72;
  for(const [x,y,w,h] of [[b.logoXMm,b.logoYMm,b.logoMm,b.logoHeightMm],[b.textXMm,b.textYMm-height,width,height+1]]){
   const points=[[x,y],[x+w,y],[x+w,y+h],[x,y+h]].map(([cx,cy])=>rotate(b,cx,cy));
   const minX=Math.min(...points.map(p=>p.x)),maxX=Math.max(...points.map(p=>p.x)),minY=Math.min(...points.map(p=>p.y)),maxY=Math.max(...points.map(p=>p.y));
   assert.ok(maxX<p.xMm||minX>p.xMm+p.imageMm||maxY<p.yMm||minY>p.yMm+p.imageMm,'Fold branding must remain outside image extent');
  }
 }
 const faceOnly=await setup(1,{imageMm:63.5}),bytes=await exportPrintPdf(faceOnly.job,artwork,{logoBytes:logo});assert.match(contents(await PDFDocument.load(bytes)),new RegExp(String(mm(63.5))));
});
