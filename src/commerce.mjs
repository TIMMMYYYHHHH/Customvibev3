import {defaultPricing,canPurchase} from './content/model.mjs';
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
 const pricedQty=photoQty+puzzleQty;
 const packs=items.filter(i=>!['photo','puzzle'].includes(i.kind));
 const product=i=>content?.products.find(p=>p.id===i.kind);
 const packCents=packs.reduce((s,i)=>s+(canPurchase(product(i))?product(i).priceCents*i.qty:0),0);
 return {photoQty,puzzleQty,pricedQty,knownCents:photoPrice(pricedQty,content?.pricing)+packCents,unpriced:packs.some(i=>!canPurchase(product(i))),magnetQty:pricedQty+packs.reduce((s,i)=>s+i.qty*(product(i)?.count||i.count||({alphabet:26,counting:10}[i.kind]||1)),0)};
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

// Personalised magnets share bundle pricing, including every square puzzle piece.
export function nextPhotoTier(qty,pricing=defaultPricing){
 const current=photoPrice(qty,pricing);
 if(qty===0||qty>=10)return null;
 const target=qty<6?6:10;
 const total=photoPrice(target,pricing);
 return {target,remaining:target-qty,total,extra:total-current,saving:target*pricing.single-total};
}
