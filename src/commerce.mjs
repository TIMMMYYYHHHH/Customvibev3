import {productMagnetCount,printManifest,isTemplateProduct} from './designs/products.mjs';
import {defaultPricing,canPurchase} from './content/model.mjs';
import {ARTWORK_LIMITS} from './artwork-policy.mjs';
export const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
export function photoPrice(qty,pricing=defaultPricing){
  if(!Number.isInteger(qty)||qty<0) throw new Error('Choose a whole number of magnets.');
  if(qty<6)return qty*pricing.single;
  if(qty===6)return pricing.six;
  if(qty<10)return Math.round(qty*pricing.six/6/100)*100;
  return qty*pricing.ten/10;
}
export const money=cents=>new Intl.NumberFormat('en-ZA',{style:'currency',currency:'ZAR',minimumFractionDigits:0,maximumFractionDigits:2}).format(cents/100);
export function summarize(items,content){
 const photoQty=items.filter(i=>i.kind==='photo').reduce((s,i)=>s+i.qty,0);
 const puzzleQty=items.filter(i=>i.kind==='puzzle').reduce((s,i)=>s+i.qty*(i.gridSize||3)**2,0);
 const shared=items.filter(i=>content?.products.find(p=>p.id===i.kind)?.pricingMode==='per-magnet');
 const collectionQty=shared.reduce((n,i)=>n+i.qty*productMagnetCount(content.products.find(p=>p.id===i.kind)),0);
 const pricedQty=photoQty+puzzleQty+collectionQty;
 const packs=items.filter(i=>!['photo','puzzle'].includes(i.kind)&&!shared.includes(i));
 const product=i=>content?.products.find(p=>p.id===i.kind);
 const packCents=packs.reduce((s,i)=>s+(canPurchase(product(i))?product(i).priceCents*i.qty:0),0);
 return {photoQty,puzzleQty,pricedQty,knownCents:photoPrice(pricedQty,content?.pricing)+packCents,unpriced:[...packs,...shared].some(i=>!canPurchase(product(i))),magnetQty:pricedQty+packs.reduce((s,i)=>s+i.qty*(product(i)?.count||i.count||({alphabet:26,counting:10}[i.kind]||1)),0)};
}
export function cropRect(w,h,ow,oh,zoom=1,x=.5,y=.5){
 if(![w,h,ow,oh].every(n=>Number.isFinite(n)&&n>0))throw new Error('Invalid image dimensions');
 const scale=Math.max(ow/w,oh/h)*Math.max(1,zoom),sw=ow/scale,sh=oh/scale;
 return {sx:(w-sw)*clamp(x,0,1),sy:(h-sh)*clamp(y,0,1),sw,sh};
}
export function puzzleRects(r,gridSize=3){
 if(![3,5].includes(gridSize))throw new Error('Choose a 3 × 3 or 5 × 5 grid.');
 if(Math.abs(r.sw-r.sh)>0.001)throw new Error('Puzzle crops must be square.');
 return Array.from({length:gridSize*gridSize},(_,i)=>({sx:r.sx+(i%gridSize)*r.sw/gridSize,sy:r.sy+Math.floor(i/gridSize)*r.sh/gridSize,sw:r.sw/gridSize,sh:r.sh/gridSize}));
}

// Assess original pixels before canvas resampling. Every tile prints at 7.5 cm.
export function cropQuality(photo){
 if(!photo||![photo.w,photo.h].every(n=>Number.isFinite(n)&&n>0))return {level:'unknown',pixels:null,ppi:null};
 const rotated=(photo.rotation||0)%180!==0;
 const crop=cropRect(rotated?photo.h:photo.w,rotated?photo.w:photo.h,1,1,photo.zoom,photo.x,photo.y);
 const grid=photo.format==='puzzle'?(photo.gridSize||3):1;
 const pixels=Math.min(crop.sw,crop.sh)/grid,ppi=pixels/(7.5/2.54);
 return {level:ppi<150?'low':ppi<300?'soft':'good',pixels:Math.floor(pixels),ppi:Math.floor(ppi)};
}

export function orderCapacity(items,content){
 const magnets=summarize(items,content).magnetQty;
 const files=items.reduce((n,item)=>n+(item.kind==='photo'?1:item.kind==='puzzle'?(item.gridSize||3)**2+1:item.designMode==='assisted'?(item.reference?1:0):isTemplateProduct(content?.products.find(p=>p.id===item.kind))?1:printManifest(content?.products.find(p=>p.id===item.kind))?.designs.length||0),0);
 const issues=[];
 if(files>ARTWORK_LIMITS.files)issues.push(`These designs need ${files} artwork files. Keep up to ${ARTWORK_LIMITS.files}; use fewer puzzle designs or a smaller puzzle grid.`);
 return {magnets,files,entries:items.length,issues,allowed:issues.length===0};
}

// Personalised magnets share bundle pricing, including every square puzzle piece.
export function nextPhotoTier(qty,pricing=defaultPricing){
 const current=photoPrice(qty,pricing);
 if(qty===0||qty>=10)return null;
 const target=qty<6?6:10;
 const total=photoPrice(target,pricing);
 return {target,remaining:target-qty,total,extra:total-current,saving:target*pricing.single-total};
}
