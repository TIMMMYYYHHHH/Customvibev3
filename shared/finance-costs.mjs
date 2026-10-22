const fields=new Set(['id','name','category','unit','packCents','packQuantity','basis','usageMilli','magnetsPerSheet','active']);
const required=['id','name','category','unit','packCents','packQuantity','basis','usageMilli','active'];
const categories=new Set(['materials','printing','packaging','courier']);
const bases=new Set(['per_magnet','per_sheet','per_order']);
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const max=BigInt(Number.MAX_SAFE_INTEGER);

function integer(value,name,minimum=0){
 if(!Number.isSafeInteger(value)||value<minimum)throw new TypeError(`Invalid ${name}`);
 return value;
}

function safeNumber(value){
 if(value<0n||value>max)throw new RangeError('Cost calculation exceeds safe integer range');
 return Number(value);
}

function label(value,name,limit){
 if(typeof value!=='string'||!value.trim()||value.trim().length>limit)throw new TypeError(`Invalid ${name}`);
 return value.trim();
}

export function validateCostEntry(entry){
 if(!entry||typeof entry!=='object'||Array.isArray(entry))throw new TypeError('Invalid cost entry');
 if(Object.keys(entry).some(key=>!fields.has(key))||required.some(key=>!Object.hasOwn(entry,key)))throw new TypeError('Invalid cost entry fields');
 if(typeof entry.id!=='string'||!uuid.test(entry.id))throw new TypeError('Invalid cost entry ID');
 if(!categories.has(entry.category)||!bases.has(entry.basis))throw new TypeError('Invalid cost category or basis');
 if(typeof entry.active!=='boolean')throw new TypeError('Invalid active flag');
 const packCents=entry.packCents===null?null:integer(entry.packCents,'pack price');
 const packQuantity=integer(entry.packQuantity,'pack quantity',1);
 const usageMilli=integer(entry.usageMilli,'usage');
 let magnetsPerSheet=null;
 if(entry.basis==='per_sheet'){
  magnetsPerSheet=integer(entry.magnetsPerSheet,'magnets per sheet',1);
  if(usageMilli%1000!==0)throw new TypeError('Sheet usage must be whole sheets');
 }else if(entry.magnetsPerSheet!==undefined&&entry.magnetsPerSheet!==null)throw new TypeError('Sheet yield requires per sheet basis');
 return {id:entry.id,name:label(entry.name,'name',80),category:entry.category,unit:label(entry.unit,'unit',24),packCents,packQuantity,basis:entry.basis,usageMilli,magnetsPerSheet,active:entry.active};
}

export function calculateCostLine(entry,usageMilli){
 // Saved-line metadata is never a source for the calculation.
 if(!entry||typeof entry!=='object'||Array.isArray(entry))throw new TypeError('Invalid cost entry');
 const {excluded,amountCents,...pricing}=entry;
 const normalized=validateCostEntry(pricing);
 integer(usageMilli,'actual usage');
 if(normalized.basis==='per_sheet'&&usageMilli%1000!==0)throw new TypeError('Sheet usage must be whole sheets');
 if(normalized.packCents===null)return null;
 const numerator=BigInt(normalized.packCents)*BigInt(usageMilli);
 const denominator=BigInt(normalized.packQuantity)*1000n;
 // Keep the full ratio until this complete line is rounded half up.
 return safeNumber((numerator+denominator/2n)/denominator);
}

export function estimateOrderCosts(settings,magnetQty){
 integer(magnetQty,'magnet quantity',1);
 if(!settings||!Array.isArray(settings.entries)||settings.entries.length>100)throw new TypeError('Invalid cost settings');
 const entries=settings.entries.map(validateCostEntry),ids=new Set();
 for(const entry of entries){
  if(ids.has(entry.id))throw new TypeError('Duplicate cost entry ID');
  ids.add(entry.id);
 }
 let known=0n;
 const lines=entries.filter(entry=>entry.active).map(entry=>{
  let multiplier=1n;
  if(entry.basis==='per_magnet')multiplier=BigInt(magnetQty);
  if(entry.basis==='per_sheet')multiplier=(BigInt(magnetQty)+BigInt(entry.magnetsPerSheet)-1n)/BigInt(entry.magnetsPerSheet);
  const usageMilli=safeNumber(BigInt(entry.usageMilli)*multiplier);
  const amountCents=calculateCostLine(entry,usageMilli);
  if(amountCents!==null)known+=BigInt(amountCents);
  return {...entry,usageMilli,excluded:false,amountCents};
 });
 const knownCostCents=safeNumber(known),complete=lines.length>0&&lines.every(line=>line.amountCents!==null);
 return {lines,complete,totalCents:complete?knownCostCents:null,knownCostCents};
}
