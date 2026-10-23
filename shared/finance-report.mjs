const max=BigInt(Number.MAX_SAFE_INTEGER);
const sastOffsetSeconds=7200;

function safeNumber(value){
 if(value>max||value< -max)throw new RangeError('Finance total exceeds safe integer range');
 return Number(value);
}

function integer(value,name,minimum=0){
 if(!Number.isSafeInteger(value)||value<minimum)throw new TypeError(`Invalid ${name}`);
 return value;
}

function nullableMoney(value,name){
 return value===null?null:integer(value,name);
}

function validateRow(row){
 if(!row||typeof row!=='object'||Array.isArray(row))throw new TypeError('Invalid finance row');
 integer(row.magnetQty,'magnet quantity',1);
 for(const name of ['subtotalCents','deliveryCents','totalCents','costCents'])nullableMoney(row[name],name);
 integer(row.knownCostCents,'known costs');
 if(row.costVersion!==null)integer(row.costVersion,'cost version',1);
 if(![null,'estimated','confirmed'].includes(row.costStatus)||typeof row.costComplete!=='boolean')throw new TypeError('Invalid cost status');
 if(row.paymentStatus!=='unpaid')throw new TypeError('Invalid payment status');
}

function savedCosts(row){
 return row.costVersion!==null&&['estimated','confirmed'].includes(row.costStatus);
}

function projectedMargin(row){
 return savedCosts(row)&&row.costComplete&&row.costCents!==null&&row.totalCents!==null&&row.deliveryCents!==null
  ?safeNumber(BigInt(row.totalCents)-BigInt(row.costCents)):null;
}

export function monthRange(month){
 if(typeof month!=='string'||month.length!==7||!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw new TypeError('Invalid month');
 const year=Number(month.slice(0,4)),monthIndex=Number(month.slice(5))-1;
 // setUTCFullYear avoids Date.UTC's special treatment of years 00 through 99.
 const date=new Date(0);
 date.setUTCFullYear(year,monthIndex,1);
 date.setUTCHours(0,0,0,0);
 const start=date.getTime()/1000-sastOffsetSeconds;
 date.setUTCMonth(monthIndex+1);
 const end=date.getTime()/1000-sastOffsetSeconds;
 if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end))throw new RangeError('Invalid month range');
 return [start,end];
}

export function summarizeFinanceRows(rows){
 if(!Array.isArray(rows))throw new TypeError('Invalid finance rows');
 let magnets=0n,value=0n,cost=0n,margin=0n;
 const summary={orderCount:rows.length,magnetQty:0,knownOrderValueCents:0,recordedCostCents:0,missingTotalCount:0,missingCostCount:0,estimatedCostCount:0,confirmedCostCount:0,marginOrderCount:0,projectedMarginCents:null};
 for(const row of rows){
  validateRow(row);
  magnets+=BigInt(row.magnetQty);
  if(row.totalCents===null)summary.missingTotalCount++;
  else value+=BigInt(row.totalCents);
  cost+=BigInt(row.knownCostCents);
  const saved=savedCosts(row);
  if(!saved||!row.costComplete||row.costCents===null)summary.missingCostCount++;
  if(saved&&row.costStatus==='estimated')summary.estimatedCostCount++;
  if(saved&&row.costStatus==='confirmed')summary.confirmedCostCount++;
  const projected=projectedMargin(row);
  if(projected!==null){summary.marginOrderCount++;margin+=BigInt(projected);}
 }
 summary.magnetQty=safeNumber(magnets);
 summary.knownOrderValueCents=safeNumber(value);
 summary.recordedCostCents=safeNumber(cost);
 summary.projectedMarginCents=summary.marginOrderCount?safeNumber(margin):null;
 return summary;
}

function decimal(value,scale,places){
 if(value===null)return '';
 if(!Number.isSafeInteger(value))throw new TypeError('Invalid CSV number');
 const amount=BigInt(value),absolute=amount<0n?-amount:amount;
 return `${amount<0n?'-':''}${absolute/scale}.${String(absolute%scale).padStart(places,'0')}`;
}

function textCell(value){
 if(value===null||value===undefined)return '';
 let text=String(value);
 // Prefix all leading whitespace/control characters as well as formula starters.
 if(/^[\s=+\-@\p{Cc}\p{Cf}]/u.test(text))text="'"+text;
 return '"'+text.replaceAll('"','""')+'"';
}

function sastTimestamp(seconds){
 if(!Number.isSafeInteger(seconds))throw new TypeError('Invalid order creation time');
 return new Date((seconds+sastOffsetSeconds)*1000).toISOString().replace(/\.000Z$/,'+02:00');
}

const column=(name,type,get)=>({name,type,get});
const summaryColumns=[
 column('reference','text',row=>row.reference),
 column('createdSAST','text',row=>sastTimestamp(row.created)),
 column('status','text',row=>row.status),
 column('magnetQty','number',row=>row.magnetQty),
 column('subtotalRand','money',row=>row.subtotalCents),
 column('deliveryRand','money',row=>row.deliveryCents),
 column('totalRand','money',row=>row.totalCents),
 column('paymentStatus','text',row=>row.paymentStatus),
 column('costVersion','number',row=>row.costVersion),
 column('costStatus','text',row=>row.costStatus),
 column('costComplete','boolean',row=>row.costComplete),
 column('costTotalRand','money',row=>row.costCents),
 column('recordedCostRand','money',row=>row.knownCostCents),
 column('projectedMarginRand','money',projectedMargin)
];
const detailColumns=[
 ...summaryColumns.slice(0,3),
 column('costVersion','number',row=>row.costVersion),
 column('costStatus','text',row=>row.costStatus),
 column('costComplete','boolean',row=>row.costComplete),
 column('lineId','text',row=>row.line.id),
 column('lineName','text',row=>row.line.name),
 column('category','text',row=>row.line.category),
 column('unit','text',row=>row.line.unit),
 column('packPriceRand','money',row=>row.line.packCents),
 column('packQuantity','number',row=>row.line.packQuantity),
 column('basis','text',row=>row.line.basis),
 column('usage','usage',row=>row.line.usageMilli),
 column('magnetsPerSheet','number',row=>row.line.magnetsPerSheet),
 column('active','boolean',row=>row.line.active),
 column('excluded','boolean',row=>row.line.excluded),
 column('amountRand','money',row=>row.line.amountCents)
];

function valueCell(value,type){
 if(type==='text')return textCell(value);
 if(value===null)return '';
 if(type==='money')return decimal(value,100n,2);
 if(type==='usage')return decimal(value,1000n,3);
 if(type==='boolean'){
  if(typeof value!=='boolean')throw new TypeError('Invalid CSV flag');
  return String(value);
 }
 integer(value,'CSV number');
 return String(value);
}

export function financeCsv(rows,{detail=false}={}){
 if(!Array.isArray(rows)||typeof detail!=='boolean')throw new TypeError('Invalid CSV options');
 const columns=detail?detailColumns:summaryColumns;
 const output=[columns.map(({name})=>textCell(name)).join(',')];
 for(const row of rows){
  validateRow(row);
  const records=detail?(savedCosts(row)?(row.lines??[]).map(line=>({...row,line})):[]):[row];
  for(const record of records){
   if(detail){
    const line=record.line;
    nullableMoney(line.packCents,'pack price');
    nullableMoney(line.amountCents,'cost amount');
    integer(line.packQuantity,'pack quantity',1);
    integer(line.usageMilli,'usage');
    if(line.magnetsPerSheet!==null)integer(line.magnetsPerSheet,'magnets per sheet',1);
    if(line.basis==='per_sheet'&&line.usageMilli%1000!==0)throw new TypeError('Sheet usage must be whole sheets');
   }
   output.push(columns.map(({type,get})=>valueCell(get(record),type)).join(','));
  }
 }
 return '\uFEFF'+output.join('\r\n')+'\r\n';
}
