import test from 'node:test';
import assert from 'node:assert/strict';
import {createPrintJob,getPrintCalibration,PRINT_LIMITS} from '../admin/print-layout.mjs';
import {artworkManifest} from '../server/submission-model.mjs';
import {proofRows} from '../src/proof-manifest.mjs';
const now=Date.parse('2026-10-21T10:00:00Z');
const id='12345678-1234-1234-1234-123456789abc';
const file=(name,index=0,extra={})=>({index,name,size:123,proof:false,...extra});
const photo=(qty=7)=>({id:'one',kind:'photo',qty,faceCount:1,files:[file('design-01-photo.jpg')]});
const order=(items=[photo()],extra={})=>({id,reference:'CV-000001',version:0,artworkExpires:now/1000+3600,snapshot:{magnetQty:items.reduce((n,i)=>n+i.qty*(i.kind==='puzzle'?i.gridSize**2:i.designQuantities?.reduce((a,b)=>a+b,0)||i.faceCount||i.files.length),0),items},...extra});
const placements=job=>job.pages.flatMap(p=>p.placements);
const job=(o,options={})=>createPrintJob(o,{now,...options});

test('seven copies fill six positions then one, with centred full 63.5 mm faces',()=>{
 const j=job(order());assert.equal(j.totalCopies,7);assert.equal(j.pages.length,2);assert.deepEqual(j.pages.map(p=>p.placements.length),[6,1]);assert.equal(j.files.length,1);assert.equal(j.files[0].requestId,id);assert.equal(j.files[0].copies,7);
 const first=j.pages[0].placements[0];assert.equal(first.imageMm,63.5);assert.equal(first.xMm,7.93+(87.2-63.5)/2);assert.equal(first.yMm,5.52+(86.19-63.5)/2);assert.equal(first.outer.polygon.length,8);assert.equal(first.outer.widthMm,87.2);assert.equal(first.outer.heightMm,86.19);assert.deepEqual(first.branding.map(b=>b.rotation),[180,270,0,90]);assert.ok(first.branding.every(b=>b.text==='@customvibe'));
 assert.deepEqual(j.pages[0].placements.map(p=>[p.outer.xMm,p.outer.yMm]),[[7.93,5.52],[114.87,5.52],[7.93,105.41],[114.87,105.41],[7.93,205.29],[114.87,205.29]]);
});

test('eighteen puzzle tiles use three pages, twenty-five use five, assembled proof excluded',()=>{
 for(const [gridSize,qty,count,pages] of [[3,2,18,3],[5,1,25,5]]){
 const puzzle={kind:'puzzle',qty,gridSize,files:[file('design-01-proof.jpg',0,{proof:true}),...Array.from({length:gridSize**2},(_,n)=>file(`design-01-row-${Math.floor(n/gridSize)+1}-col-${n%gridSize+1}.jpg`,n+1))]};const j=job(order([puzzle]));assert.equal(j.totalCopies,count);assert.equal(j.pages.length,pages);assert.equal(j.files.length,gridSize**2);assert.ok(placements(j).every(p=>!p.file.proof));
 }
});

test('multiple selected designs multiply per-design quantities, while current revision copies take precedence',()=>{
 const alphabet={id:'one',kind:'alphabet',qty:2,faceCount:2,designIds:['a','b'],designQuantities:[2,1],files:[file('design-01-alphabet-1.jpg',0),file('design-01-alphabet-2.jpg',1)]};const o=order([alphabet]);assert.deepEqual(job(o).files.map(f=>f.copies),[4,2]);
 o.proof={revision:3,status:'changes-requested',items:[{id:'one',kind:'alphabet',qty:2,files:alphabet.files.map((f,i)=>({...f,requestId:'22345678-1234-1234-1234-123456789abc',copies:i===0?4:2}))}]};const j=job(o);assert.equal(j.revision,3);assert.deepEqual(j.files.map(f=>f.copies),[4,2]);assert.ok(j.files.every(f=>f.requestId!==id));assert.equal(j.version,0);
});

test('missing, unfinished reference or incomplete current artwork fails instead of partial sheets',()=>{
 const cases=[order([]),order([{...photo(),files:[]}]),order([{...photo(),designMode:'assisted',files:[file('design-01-photo.jpg',0,{reference:true})]}]),order([{...photo(),faceCount:2}]),order([{...photo(),files:[file('design-01-photo.jpg'),file('design-01-photo.jpg')]}]),order([photo()],{proof:{revision:2,items:[]}})];
 for(const o of cases)assert.throws(()=>job(o),/artwork|design|manifest|quantity/i);
 const o=order();o.proof={revision:2,items:[{kind:'photo',qty:7,files:[file('design-01-photo.jpg',0,{reference:true,copies:7})]}]};assert.throws(()=>job(o),/artwork|design/i);
});

test('invalid quantities, unsafe identities, size/hash/expiry and totals fail closed',()=>{
 for(const qty of [0,-1,1.5,'7',Infinity,Number.MAX_SAFE_INTEGER])assert.throws(()=>job(order([photo(qty)])));
 for(const change of [{size:0},{size:4000001},{index:-1},{index:60},{name:'../photo.jpg'},{requestId:'wrong'},{sha256:'x'}]){const o=order();Object.assign(o.snapshot.items[0].files[0],change);assert.throws(()=>job(o));}
 for(const extra of [{id:'wrong'},{version:-1},{artworkExpires:now/1000},{artworkExpires:undefined}])assert.throws(()=>job(order(undefined,extra)));
 const mismatch=order();mismatch.snapshot.magnetQty=8;assert.throws(()=>job(mismatch),/quantity|count/i);
 const tooLarge=order([photo(PRINT_LIMITS.pages*6+1)]);assert.throws(()=>job(tooLarge),/pages|batch/i);
 const missingPuzzle=order([{kind:'puzzle',qty:1,gridSize:3,files:[file('design-01-row-1-col-1.jpg')]}]);assert.throws(()=>job(missingPuzzle),/complete|artwork/i);
});

test('calibration validates six slots, finite values, bounds, overlap and explicit image extent',()=>{
 const base=getPrintCalibration();assert.equal(base.imageMm,63.5);assert.equal(base.showGuides,true);assert.equal(base.slotOffsets.length,6);
 const c=getPrintCalibration({sheetXMm:1,sheetYMm:1,columnSpacingMm:-1,rowSpacingMm:1,imageMm:70,showGuides:false,slotOffsets:[{xMm:.5,yMm:.25}]});const j=job(order(),{calibration:c});assert.equal(j.calibration.showGuides,false);assert.equal(j.pages[0].placements[0].imageMm,70);assert.equal(j.pages[0].placements[0].outer.xMm,9.43);assert.equal(j.pages[0].placements[0].branding.length,4);
 for(const opt of [{sheetXMm:NaN},{sheetXMm:Infinity},{sheetXMm:'1'},{sheetXMm:8},{sheetYMm:-6},{imageMm:63.4},{imageMm:70.1},{rowSpacingMm:3},{columnSpacingMm:-20},{slotOffsets:[{xMm:25}]},{slotOffsets:[{yMm:14}, {}, {yMm:-14}]},{showGuides:'false'},{slotOffsets:Array(7).fill({})}])assert.throws(()=>getPrintCalibration(opt));
 assert.deepEqual(getPrintCalibration(),base);
});

// These checks fail if the model accepts another design position or hides
// extra manifest rows behind a proof flag.
test('current revision retains design position names and cannot add extra assembled proofs',()=>{
 const o=order();o.proof={revision:2,items:[{kind:'photo',qty:7,files:[file('design-02-photo.jpg',0,{copies:7})]}]};assert.throws(()=>job(o),/position|manifest|match/i);
 const puzzle={kind:'puzzle',qty:1,gridSize:3,files:[file('design-01-proof.jpg',0,{proof:true}),...Array.from({length:9},(_,n)=>file(`design-01-row-${Math.floor(n/3)+1}-col-${n%3+1}.jpg`,n+1)),file('design-02-proof.jpg',10,{proof:true})]};assert.throws(()=>job(order([puzzle])),/proof|manifest|match/i);
});

test('existing unique-file and byte quotas remain, large quantities are only a local PDF batch limit',()=>{
 const tooMany=Array.from({length:61},(_,n)=>({...photo(1),id:`item-${n}`,files:[file(`design-${String(n+1).padStart(2,'0')}-photo.jpg`,n%60)]}));
 assert.throws(()=>job(order(tooMany)),/limit|Duplicate/);
 const heavy=Array.from({length:9},(_,n)=>({...photo(1),id:`item-${n}`,files:[file(`design-${String(n+1).padStart(2,'0')}-photo.jpg`,n,{size:4000000})]}));
 assert.throws(()=>job(order(heavy)),/download limit/);
 const maximum=job(order([photo(3000)]));assert.equal(maximum.pages.length,500);assert.equal(placements(maximum).length,3000);
});

test('fulfilled unpaid orders with current artwork remain printable without customer proof approval',()=>{
 const o=order(undefined,{status:'fulfilled'});o.snapshot.paymentStatus='unpaid';assert.equal(job(o).totalCopies,7);
 o.proof={revision:1,status:'awaiting-approval',items:[{kind:'photo',qty:7,files:[file('design-01-photo.jpg',0,{copies:7,requestId:id})]}]};assert.equal(job(o).totalCopies,7);
});

test('game masters emitted by artworkManifest prepare the complete ten-piece set',()=>{
 const game={id:'game',kind:'noughts-crosses',qty:2,faceCount:10,files:Array.from({length:10},()=>({size:123,sha256:'a'.repeat(64)}))};
 game.files=artworkManifest({items:[game]}).map((f,index)=>({...f,index}));
 assert.equal(game.files[0].name,'design-01-noughts-crosses-1.jpg');
 const j=job(order([game]));assert.equal(j.totalCopies,20);assert.equal(j.files.length,10);assert.equal(j.pages.length,4);assert.ok(j.files.every(f=>f.copies===2));
 const current=order([game]);current.proof={revision:2,items:[{...game,files:game.files.map(f=>({...f,requestId:id,copies:2}))}]};assert.equal(job(current).totalCopies,20);
});

test('completed assisted and missing-source historical revisions accept actual proofRows filenames',()=>{
 for(const original of [
  {id:'assisted',kind:'business',designMode:'assisted',qty:2,faceCount:1,files:[]},
  {id:'legacy',kind:'information',qty:2,files:[]},
  {id:'legacy-set',kind:'alphabet',qty:2,faceCount:3,files:[]},
  {id:'legacy-puzzle',kind:'puzzle',gridSize:3,qty:2,faceCount:9,files:[]}
 ]){
  const o=order([original]);const rows=proofRows(o.snapshot);assert.equal(rows[0].name,'design-01-face-1.jpg');o.snapshot.magnetQty=rows.filter(row=>!row.proof).reduce((n,row)=>n+row.copies,0);
  o.proof={revision:2,items:[{id:original.id,kind:original.kind,qty:original.qty,...(original.gridSize?{gridSize:original.gridSize}:{}),files:rows.map((row,index)=>file(row.name,index,{proof:row.proof,requestId:id,copies:row.copies}))}]};
  const j=job(o);assert.equal(j.files.length,rows.filter(row=>!row.proof).length);assert.equal(j.totalCopies,o.snapshot.magnetQty);
  const missing=structuredClone(o);missing.proof.items[0].files=[];assert.throws(()=>job(missing),/artwork|design/i);
  const reference=structuredClone(o);reference.proof.items[0].files[0].reference=true;assert.throws(()=>job(reference),/artwork|design/i);
  const wrong=structuredClone(o);wrong.proof.items[0].files[0].name='design-01-face-99.jpg';assert.throws(()=>job(wrong),/position|manifest|match/i);
 }
});
