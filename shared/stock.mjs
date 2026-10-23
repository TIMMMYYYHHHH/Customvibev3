const maximum=BigInt(Number.MAX_SAFE_INTEGER);
export function stockQuantity(value,wholeUnits=false){
 if(!Number.isSafeInteger(value)||value<0||wholeUnits&&value%1000!==0)throw new TypeError('Invalid stock quantity');return value;
}
export function stockSum(balance,delta){
 stockQuantity(balance);if(!Number.isSafeInteger(delta))throw new TypeError('Invalid movement');const result=BigInt(balance)+BigInt(delta);if(result<0n||result>maximum)throw new RangeError('Stock balance outside safe range');return Number(result);
}
const text=value=>{let s=String(value??'');if(/^[\s=+\-@\p{Cc}\p{Cf}]/u.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"'};
function decimal(value,scale,places){if(value===null)return '';if(!Number.isSafeInteger(value))throw new TypeError('Invalid CSV number');const n=BigInt(value),a=n<0n?-n:n;return `${n<0n?'-':''}${a/scale}.${String(a%scale).padStart(places,'0')}`}
export function stockCsv(rows){
 if(!Array.isArray(rows)||rows.length>10000)throw new TypeError('Invalid stock export');
 const encoder=new TextEncoder();let size=3;
 const output=[['seq','operationId','kind','createdSAST','reason','itemId','name','unit','quantity','balance','stocktakeGeneration','packPriceRand','packQuantity'].map(text).join(',')];size+=encoder.encode(output[0]).byteLength+2;
 for(const row of rows){if(!Number.isSafeInteger(row.seq)||!Number.isSafeInteger(row.created)||!Array.isArray(row.lines)||row.lines.length>100)throw new TypeError('Invalid movement');
 for(const line of row.lines){stockQuantity(line.balanceMilli);stockQuantity(line.stocktakeGeneration);if(!Number.isSafeInteger(line.deltaMilli))throw new TypeError('Invalid movement');if(row.price){stockQuantity(row.price.packCents);if(!Number.isSafeInteger(row.price.packQuantity)||row.price.packQuantity<1)throw new TypeError('Invalid price')}
 const record=[String(row.seq),text(row.operationId),text(row.kind),text(new Date((row.created+7200)*1000).toISOString().replace('.000Z','+02:00')),text(row.reason),text(line.itemId),text(line.name),text(line.unit),decimal(line.deltaMilli,1000n,3),decimal(line.balanceMilli,1000n,3),String(line.stocktakeGeneration),row.price?decimal(row.price.packCents,100n,2):'',row.price?String(row.price.packQuantity):''].join(',');size+=encoder.encode(record).byteLength+2;if(size>4*1024*1024)throw new RangeError('Stock export exceeds 4 MiB');output.push(record);}}
 return '\uFEFF'+output.join('\r\n')+'\r\n';
}
