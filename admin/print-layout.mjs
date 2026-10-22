import {MAGNET_FACE_MM,DEFAULT_PRINT_IMAGE_MM} from '../src/print-dimensions.mjs';
import {ARTWORK_LIMITS,artworkId,artworkHash} from '../src/artwork-policy.mjs';
import {proofRows} from '../src/proof-manifest.mjs';

// All coordinates are millimetres from the top-left. Rotation is clockwise in
// degrees, also used by the SVG preview. Calibration lives only in the caller.
// createPrintJob(order,{calibration,now}) uses now in milliseconds. expiresAt is
// the original artwork deadline in Unix seconds. files excludes proof/reference
// images; placements reuse those same immutable file objects for every copy.
export const PRINT_LIMITS=Object.freeze({pages:500,copies:3000,files:ARTWORK_LIMITS.files,fileBytes:ARTWORK_LIMITS.fileBytes,requestBytes:ARTWORK_LIMITS.requestBytes});
export const PRINT_PAGE=Object.freeze({widthMm:210,heightMm:297,slots:6});
export const PRINT_OUTER=Object.freeze({widthMm:87.2,heightMm:86.19});
// Live folded-back handle, shared by SVG and PDF. No branding is on the face.
export const PRINT_BRANDING_SEGMENTS=freeze([{text:'@Custom',color:'#291438'},{text:'Vibe',color:'#ae2e5b'}]);
const lefts=[7.93,114.87],tops=[5.52,105.41,205.29];
const generated=new WeakSet();
const fail=message=>{throw new Error(message);};
const positive=value=>Number.isSafeInteger(value)&&value>0;
function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
function numeric(value,label){if(typeof value!=='number'||!Number.isFinite(value)||Math.abs(value)>30)fail(`Enter a finite ${label} between -30 and 30 mm.`);return value;}
function outerFor(slot,c){const row=Math.floor(slot/2),col=slot%2;return {xMm:lefts[col]+c.sheetXMm+col*c.columnSpacingMm+c.slotOffsets[slot].xMm,yMm:tops[row]+c.sheetYMm+row*c.rowSpacingMm+c.slotOffsets[slot].yMm,...PRINT_OUTER};}
export function getPrintCalibration(options={}){
 if(!options||typeof options!=='object'||Array.isArray(options))fail('Invalid print calibration.');
 const c={sheetXMm:numeric(options.sheetXMm??0,'sheet X offset'),sheetYMm:numeric(options.sheetYMm??0,'sheet Y offset'),columnSpacingMm:numeric(options.columnSpacingMm??0,'column spacing'),rowSpacingMm:numeric(options.rowSpacingMm??0,'row spacing'),imageMm:options.imageMm??DEFAULT_PRINT_IMAGE_MM,showGuides:options.showGuides??true};
 if(typeof c.imageMm!=='number'||!Number.isFinite(c.imageMm)||c.imageMm<MAGNET_FACE_MM||c.imageMm>70)fail(`Image size must be between ${MAGNET_FACE_MM} and 70 mm.`);
 if(typeof c.showGuides!=='boolean')fail('Choose whether to show the fold outlines.');
 if(options.slotOffsets!==undefined&&(!Array.isArray(options.slotOffsets)||options.slotOffsets.length>6))fail('Choose offsets for up to six slots.');
 c.slotOffsets=Array.from({length:6},(_,n)=>{const s=options.slotOffsets?.[n]??{};if(typeof s!=='object'||Array.isArray(s))fail('Invalid slot offset.');return {xMm:numeric(s.xMm??0,'slot X offset'),yMm:numeric(s.yMm??0,'slot Y offset')};});
 const bounds=Array.from({length:6},(_,n)=>outerFor(n,c));
 for(let n=0;n<bounds.length;n++){
  const a=bounds[n];if(a.xMm<.1||a.yMm<.1||a.xMm+a.widthMm>PRINT_PAGE.widthMm-.1||a.yMm+a.heightMm>PRINT_PAGE.heightMm-.1)fail(`Slot ${n+1} extends beyond the printable page. Reduce the offsets or spacing.`);
  for(let m=0;m<n;m++){const b=bounds[m];if(a.xMm<b.xMm+b.widthMm+.2&&a.xMm+a.widthMm+.2>b.xMm&&a.yMm<b.yMm+b.heightMm+.2&&a.yMm+a.heightMm+.2>b.yMm)fail(`Slots ${m+1} and ${n+1} overlap. Reduce the offsets or spacing.`);}
 }
 return freeze(c);
}
function geometry(slot,c,file){
 const outer=outerFor(slot,c),{xMm:x,yMm:y,widthMm:w,heightMm:h}=outer;
 // Measured template corner cuts: approximately 20.1 x 19.9 mm. The
 // centre image is deliberately consistent across all six old template slots.
 outer.polygon=[[20.1,0],[w-20.1,0],[w,19.9],[w,h-19.9],[w-20.1,h],[20.1,h],[0,h-19.9],[0,19.9]].map(([dx,dy])=>({xMm:x+dx,yMm:y+dy}));
 const branding=[[w/2,4.1,180],[w-4.1,h/2,270],[w/2,h-4.1,0],[4.1,h/2,90]].map(([dx,dy,rotation])=>({xMm:x+dx,yMm:y+dy,rotation,text:PRINT_BRANDING_SEGMENTS.map(segment=>segment.text).join(''),segments:PRINT_BRANDING_SEGMENTS,fontSizePt:6,logoMm:4,logoXMm:-10,logoYMm:-4/3,logoHeightMm:8/3,textXMm:-4.5,textYMm:.75}));
 return {file,slotIndex:slot,xMm:x+(w-c.imageMm)/2,yMm:y+(h-c.imageMm)/2,imageMm:c.imageMm,face:{xMm:x+(w-MAGNET_FACE_MM)/2,yMm:y+(h-MAGNET_FACE_MM)/2,sizeMm:MAGNET_FACE_MM},outer,branding};
}
const filename=/^design-\d{2,}-(?:photo|proof|row-[1-5]-col-[1-5]|(?:alphabet|counting|words|colours|reminders|thanks|business|qr|wifi|information|noughts-crosses|face)-[1-9][0-9]?)\.jpg$/;
export function createPrintJob(order,options={}){
 const now=options.now??Date.now();
 if(!order||!artworkId(order.id)||typeof order.reference!=='string'||!order.reference||order.reference.length>80||!Number.isSafeInteger(order.version)||order.version<0)fail('Invalid order identity or version. Refresh the order before preparing artwork.');
 const expiresAt=order.artworkExpires;
 if(!Number.isFinite(now)||!positive(expiresAt)||expiresAt*1000<=now)fail('Artwork has expired or its deadline is unavailable. No print sheet was created.');
 const snapshot=order.snapshot;
 if(!snapshot||!Array.isArray(snapshot.items)||!snapshot.items.length||!positive(snapshot.magnetQty))fail('The order artwork manifest or magnet quantity is incomplete.');
 const revision=order.proof?.revision??0;
 if(!Number.isSafeInteger(revision)||revision<0)fail('Invalid current artwork revision.');
 const items=revision?order.proof.items:snapshot.items;
 if(!Array.isArray(items)||items.length!==snapshot.items.length)fail('Current artwork is incomplete. Finish every design before printing.');
 if(snapshot.items.some(item=>!item||!Array.isArray(item.files)||item.files.length>ARTWORK_LIMITS.files||item.kind==='puzzle'&&![3,5].includes(item.gridSize)||item.faceCount!==undefined&&(!positive(item.faceCount)||item.faceCount>ARTWORK_LIMITS.files)))fail('Invalid original artwork manifest or face count.');
 const positions=proofRows(snapshot);
 const files=[],names=new Set(),identities=new Set();let bytes=0,manifestCount=0,totalCopies=0;
 for(let itemIndex=0;itemIndex<items.length;itemIndex++){
  const item=items[itemIndex],original=snapshot.items[itemIndex];
  if(!item||!original||!positive(item.qty)||!Array.isArray(item.files)||!item.files.length||(!revision&&item.designMode==='assisted'))fail('Final artwork is still needed for one or more designs.');
  if(item.kind!==original.kind||item.qty!==original.qty||item.id&&original.id&&item.id!==original.id)fail('Current artwork does not match the order design.');
  const puzzle=item.kind==='puzzle',grid=item.gridSize;
  if(puzzle&&(![3,5].includes(grid)||grid!==original.gridSize))fail('Invalid puzzle artwork layout.');
  const printable=item.files.filter(f=>f&&!f.proof&&!f.reference);
  const expectedRows=positions.filter(row=>row.key.startsWith(`${itemIndex}-`));
  const expected=expectedRows.filter(row=>!row.proof).length;
  if(!positive(expected)||printable.length!==expected||item.files.some(f=>f?.reference))fail('The artwork manifest is incomplete. Finish every design before printing.');
  const quantities=item.designQuantities??(!revision?original.designQuantities:undefined);
  if(quantities!==undefined&&(!Array.isArray(quantities)||quantities.length!==printable.length||quantities.some(q=>!positive(q))))fail('Invalid per-design artwork quantities.');
  const puzzleSlots=new Set();
  if(item.files.filter(f=>f?.proof).length>(puzzle?1:0))fail('Invalid assembled proof manifest.');
  for(let n=0,designIndex=0;n<item.files.length;n++){
   const f=item.files[n],requestId=f?.requestId??order.id;
   const position=expectedRows[n];
   // The trusted proof helper names completed historical positions face-N
   // when no source manifest existed, including a puzzle's preview row.
   const fallbackPosition=revision&&!original.files[n]&&f?.name===position?.name;
   if(!position||typeof f?.name!=='string'||f.name!==position.name||!!f.proof!==position.proof)fail('Artwork filename does not match its design position.');
   manifestCount++;
   if(!f||!filename.test(f.name)||names.has(f.name)||!artworkId(requestId)||!Number.isSafeInteger(f.index)||f.index<0||f.index>=ARTWORK_LIMITS.files||!positive(f.size)||f.size>ARTWORK_LIMITS.fileBytes||f.sha256!==undefined&&!artworkHash(f.sha256)||f.proof!==undefined&&typeof f.proof!=='boolean')fail('Invalid artwork manifest, identity, size or hash. Refresh the current artwork.');
   const identity=`${requestId}/${f.index}`;if(identities.has(identity))fail('Duplicate artwork identity in the manifest.');
   names.add(f.name);identities.add(identity);bytes+=f.size;
   if(f.proof){if(!puzzle||!/-proof\.jpg$/.test(f.name)&&!fallbackPosition)fail('Invalid artwork proof position.');continue;}
   if(/-proof\.jpg$/.test(f.name))fail('Assembled proof cannot be printed as a magnet tile.');
   if(puzzle){const match=f.name.match(/-row-([1-5])-col-([1-5])\.jpg$/),key=match?`${match[1]}-${match[2]}`:fallbackPosition?`face-${n}`:null;if(!key||match&&(+match[1]>grid||+match[2]>grid)||puzzleSlots.has(key))fail('Puzzle artwork is incomplete or has duplicate tiles.');puzzleSlots.add(key);}
   const copies=f.copies??item.qty*(quantities?.[designIndex]??1);designIndex++;
   if(!positive(copies))fail('Invalid print quantity. Choose a positive whole number for each design.');
   totalCopies+=copies;if(!Number.isSafeInteger(totalCopies))fail('The print quantity is too large.');
   files.push({name:f.name,index:f.index,requestId,size:f.size,...(f.sha256!==undefined?{sha256:f.sha256}:{}),copies,proof:false});
  }
 }
 if(manifestCount>ARTWORK_LIMITS.files||bytes>ARTWORK_LIMITS.requestBytes)fail('Artwork exceeds the existing download limit: 60 files and 32 MB.');
 if(totalCopies!==snapshot.magnetQty)fail('The print quantity does not match the order magnet count. Refresh the current artwork.');
 if(totalCopies>PRINT_LIMITS.copies)fail(`This PDF would exceed ${PRINT_LIMITS.pages} pages. Prepare separate print batches for this order.`);
 const calibration=getPrintCalibration(options.calibration),pages=[];let at=0;
 for(const file of files)for(let copy=0;copy<file.copies;copy++,at++){const pageIndex=Math.floor(at/6);if(!pages[pageIndex])pages.push({pageIndex,widthMm:210,heightMm:297,placements:[]});pages[pageIndex].placements.push(geometry(at%6,calibration,file));}
 const job=freeze({orderId:order.id,reference:order.reference,revision,digest:order.proof?.digest??null,version:order.version,expiresAt,files,pages,totalCopies,calibration});generated.add(job);return job;
}
// The PDF renderer accepts only an intact job from this model, never arbitrary
// geometry. The caller separately rechecks the latest server revision and bytes.
export function assertPrintJob(job,now=Date.now()){
 if(!generated.has(job))fail('Prepare a valid print job before exporting.');
 if(job.expiresAt*1000<=now)fail('Artwork has expired. No PDF was created.');
 return job;
}
