import {stockQuantity,stockSum} from '../shared/stock.mjs';
const now=()=>Math.floor(Date.now()/1000),MAX=Number.MAX_SAFE_INTEGER;
const fail=(status,code,error)=>Response.json({error,code},{status});
class StockError extends Error{constructor(status,code,message){super(message);this.status=status;this.code=code}}
const invalid=message=>{throw new StockError(400,'INVALID',message)};
const conflict=(code='CONFLICT',message='Stock changed. Read the current values before retrying.')=>{throw new StockError(409,code,message)};
const uuid=v=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(v);
const integer=(v,min=0)=>Number.isSafeInteger(v)&&v>=min;
const fields=(v,keys)=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).every(k=>keys.includes(k))&&keys.every(k=>Object.hasOwn(v,k));
const label=(v,max)=>typeof v==='string'&&v.trim().length>0&&v.trim().length<=max;
const unitMatch=(a,b)=>a.trim().toLowerCase()===b.trim().toLowerCase();
const itemView=r=>({id:r.id,name:r.name,unit:r.unit,wholeUnits:!!r.whole_units,balanceMilli:r.balance_milli,initialized:!!r.initialized,lowMilli:r.low_milli,version:r.version,stocktakeGeneration:r.stocktake_generation});
const itemSelect='SELECT * FROM stock_items';
const movementView=r=>({seq:r.seq,operationId:r.operation_id,kind:r.kind,created:r.created,reason:r.reason,lines:JSON.parse(r.lines),price:r.price===null?null:JSON.parse(r.price)});
const canonical=v=>Array.isArray(v)?v.map(canonical):v!==null&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
async function digest(v){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(canonical(v))));return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('')}
const schema={
 'items-read':[],history:[], 'order-read':['id'],
 items:['operationId','id','version','unit','wholeUnits','lowMilli'],
 receipts:['operationId','itemId','version','quantityMilli','packCents','packQuantity','updateDefault','settingsVersion'],
 stocktake:['operationId','itemId','version','countedMilli','reason'],
 'order-use':['id','operationId','orderVersion','costVersion','usageVersion','lines'],
 'order-reverse':['id','operationId','orderVersion','usageVersion','lines','reason']
};
async function orderRecord(db,id){
 if(!uuid(id))invalid('Invalid order reference.');const row=await db.prepare('SELECT id,version,expires FROM orders WHERE id=?').bind(id).first();
 if(!row)throw new StockError(404,'NOT_FOUND','Order not found.');if(row.expires<=now())throw new StockError(410,'EXPIRED','This order has expired.');return row;
}
function usageView(row,items){
 if(!row)return null;const original=JSON.parse(row.lines),byId=new Map(items.map(i=>[i.id,i])),blocked=original.some(l=>byId.get(l.itemId)?.stocktakeGeneration!==l.stocktakeGeneration);
 return {operationId:row.operation_id,status:row.status,lines:original.map(l=>({...l,version:byId.get(l.itemId)?.version??l.version,stocktakeGeneration:byId.get(l.itemId)?.stocktakeGeneration??l.stocktakeGeneration})),canReverse:row.status==='active'&&!blocked,reverseBlockedByStocktake:row.status==='active'&&blocked};
}
function preview(cost,items){
 const byId=new Map(items.map(i=>[i.id,i]));return (cost?JSON.parse(cost.payload).lines:[]).filter(l=>!l.excluded&&l.category!=='courier'&&byId.has(l.id)).map(l=>{const item=byId.get(l.id),suggested=unitMatch(l.unit,item.unit)&&integer(l.usageMilli)&&(!item.wholeUnits||l.usageMilli%1000===0)?l.usageMilli:null;return {...item,itemId:item.id,suggestedMilli:suggested,requiresQuantity:suggested===null}});
}
async function history(db,b){
 if(Object.keys(b).some(k=>!['before','revision'].includes(k))||b.before!==undefined&&!integer(b.before,1)||b.revision!==undefined&&!integer(b.revision))invalid('Invalid history page.');
 const revision=(await db.prepare('SELECT coalesce(max(seq),0) revision FROM stock_movements').first()).revision;
 if(b.revision!==undefined&&b.revision!==revision)conflict();
 const rows=(await db.prepare('SELECT * FROM stock_movements WHERE seq<? ORDER BY seq DESC LIMIT 51').bind(b.before??MAX).all()).results;
 const final=(await db.prepare('SELECT coalesce(max(seq),0) revision FROM stock_movements').first()).revision;if(final!==revision)conflict();
 return Response.json({revision,rows:rows.slice(0,50).map(movementView),next:rows.length>50?rows[49].seq:null});
}
function validateLines(values,quantity){
 if(!Array.isArray(values)||values.length>100)invalid('Invalid material lines.');const ids=new Set();for(const l of values){if(!fields(l,['itemId','version','stocktakeGeneration',...(quantity?['quantityMilli']:[])])||!uuid(l.itemId)||!integer(l.version,1)||l.version===MAX||!integer(l.stocktakeGeneration)||ids.has(l.itemId))invalid('Invalid material line or duplicate material.');ids.add(l.itemId);if(quantity)stockQuantity(l.quantityMilli)}return ids;
}
export async function stockService(request,env){
 try{
 if(request.method!=='POST')return fail(405,'INVALID','Method not allowed.');
 const path=new URL(request.url).pathname.slice('/stock/'.length);if(!Object.hasOwn(schema,path))return fail(404,'NOT_FOUND','Not found.');
 const bytes=new Uint8Array(await request.arrayBuffer());if(bytes.byteLength>65536)return fail(413,'TOO_LARGE','Stock request is too large.');let b;try{b=JSON.parse(new TextDecoder().decode(bytes))}catch{invalid('Invalid stock input.')}
 if(path==='history'){if(b===null||typeof b!=='object'||Array.isArray(b))invalid('Invalid history page.')}else if(!fields(b,schema[path]))invalid('Invalid stock fields.');
 if(!env.DB)return fail(503,'UNAVAILABLE','Stock is temporarily unavailable.');const db=env.DB;
 if(path==='history')return await history(db,b);
 const isOrder=path.startsWith('order-');let order=isOrder?await orderRecord(db,b.id):null;
 const isWrite=!['items-read','order-read'].includes(path);let requestDigest;
 if(isWrite){if(!uuid(b.operationId))invalid('Invalid operation identity.');requestDigest=await digest({path,...b});const saved=await db.prepare('SELECT request_digest,result FROM stock_movements WHERE operation_id=?').bind(b.operationId).first();if(saved){if(order)await orderRecord(db,b.id);if(saved.request_digest!==requestDigest)conflict('OPERATION_MISMATCH','This operation identity belongs to a different request.');if(!saved.result)return fail(503,'UNAVAILABLE','Stock reconciliation is temporarily unavailable.');return Response.json(JSON.parse(saved.result))}}
 const rawItems=(await db.prepare(itemSelect+' ORDER BY name,id').all()).results,items=rawItems.map(itemView),byId=new Map(items.map(i=>[i.id,i]));
 const settings=await db.prepare('SELECT * FROM finance_settings WHERE id=1').first(),settingsVersion=settings?.version??0,costEntries=settings?JSON.parse(settings.payload):[];
 if(path==='items-read')return Response.json({revision:(await db.prepare('SELECT coalesce(max(seq),0) revision FROM stock_movements').first()).revision,settingsVersion,items,costEntries});
 const cost=order?await db.prepare('SELECT * FROM order_costs WHERE order_id=?').bind(b.id).first():null;
 const link=order?await db.prepare('SELECT * FROM order_stock_use WHERE order_id=?').bind(b.id).first():null;
 if(order)await orderRecord(db,b.id);
 if(path==='order-read')return Response.json({orderId:b.id,orderVersion:order.version,costVersion:cost?.version??0,usageVersion:link?.version??0,usage:usageView(link,items),lines:preview(cost,items)});
 const conditions=[],params=[],add=(condition,...args)=>{conditions.push(condition);params.push(...args)},updates=[],time=now();let affected=[],kind,reason='',price=null,reverses=null,usage=null;
 const gate='EXISTS(SELECT 1 FROM stock_movements WHERE operation_id=? AND result IS NULL)',gateArgs=[b.operationId];
 const versionGuard=item=>add('EXISTS(SELECT 1 FROM stock_items WHERE id=? AND version=? AND stocktake_generation=?)',item.id,item.version,item.stocktakeGeneration);
 const checkVersion=(id,version)=>{if(!uuid(id)||!integer(version)||version===MAX)invalid('Invalid material or version.');const item=byId.get(id);if(!item)throw new StockError(404,'NOT_FOUND','Stock material not found.');if(item.version!==version)conflict();versionGuard(item);return item};
 const updateItem=item=>updates.push(db.prepare('UPDATE stock_items SET name=?,unit=?,whole_units=?,balance_milli=?,initialized=?,low_milli=?,version=?,stocktake_generation=? WHERE id=? AND '+gate).bind(item.name,item.unit,Number(item.wholeUnits),item.balanceMilli,Number(item.initialized),item.lowMilli,item.version,item.stocktakeGeneration,item.id,...gateArgs));
 if(path==='items'){
  if(!uuid(b.id)||!integer(b.version)||b.version===MAX||!label(b.unit,24)||typeof b.wholeUnits!=='boolean')invalid('Invalid stock material.');
  const entry=costEntries.find(e=>e.id===b.id);if(!entry||entry.category==='courier'||!label(entry.name,80))invalid('Choose a current physical cost entry.');
  if((entry.basis==='per_sheet'||unitMatch(b.unit,'sheet')||unitMatch(b.unit,'sheets'))&&!b.wholeUnits)invalid('Sheets must use whole quantities.');stockQuantity(b.lowMilli,b.wholeUnits);
  add('coalesce((SELECT version FROM finance_settings WHERE id=1),0)=?',settingsVersion);
  const existing=byId.get(b.id);kind='item';
  if(b.version===0){if(existing)conflict();if(items.length>=100)invalid('At most 100 stock materials are supported.');add('NOT EXISTS(SELECT 1 FROM stock_items WHERE id=?) AND (SELECT count(*) FROM stock_items)<100',b.id);
   const item={id:b.id,name:entry.name.trim(),unit:b.unit.trim(),wholeUnits:b.wholeUnits,balanceMilli:0,initialized:false,lowMilli:b.lowMilli,version:1,stocktakeGeneration:0};affected=[item];updates.push(db.prepare('INSERT INTO stock_items(id,name,unit,whole_units,balance_milli,initialized,low_milli,version,stocktake_generation) SELECT ?,?,?,?,?,?,?,?,? WHERE '+gate).bind(item.id,item.name,item.unit,Number(item.wholeUnits),0,0,item.lowMilli,1,0,...gateArgs));
  }else{const item=checkVersion(b.id,b.version);if(item.unit!==b.unit.trim()||item.wholeUnits!==b.wholeUnits){const moved=await db.prepare("SELECT 1 FROM stock_movements m,json_each(m.lines) l WHERE m.kind<>'item' AND json_extract(l.value,'$.itemId')=? LIMIT 1").bind(item.id).first();if(moved)conflict('CONFLICT','Physical units are fixed after stock movements.');}
   const after={...item,name:entry.name.trim(),unit:b.unit.trim(),wholeUnits:b.wholeUnits,lowMilli:b.lowMilli,version:item.version+1};stockQuantity(after.balanceMilli,after.wholeUnits);affected=[after];updateItem(after);
  }
 }else if(path==='receipts'||path==='stocktake'){
  const item=checkVersion(b.itemId,b.version);let delta,after;
  if(path==='receipts'){
   kind='receipt';stockQuantity(b.quantityMilli,item.wholeUnits);if(b.quantityMilli===0||!integer(b.packQuantity,1)||b.packCents!==null&&!integer(b.packCents)||typeof b.updateDefault!=='boolean'||!b.updateDefault&&b.settingsVersion!==null||b.updateDefault&&!integer(b.settingsVersion))invalid('Invalid purchase quantity or price.');
   delta=b.quantityMilli;after={...item,balanceMilli:stockSum(item.balanceMilli,delta),version:item.version+1};price=b.packCents===null?null:{packCents:b.packCents,packQuantity:b.packQuantity};
   if(b.updateDefault){const entry=costEntries.find(e=>e.id===item.id);if(!entry||entry.category==='courier'||!unitMatch(entry.unit,item.unit)||b.packCents===null)invalid('A known price and matching default unit are required.');if(settingsVersion!==b.settingsVersion||settingsVersion===MAX)conflict();add('EXISTS(SELECT 1 FROM finance_settings WHERE id=1 AND version=?)',b.settingsVersion);
    const next=costEntries.map(e=>e.id===item.id?{...e,packCents:b.packCents,packQuantity:b.packQuantity}:e),before={version:settingsVersion,entries:costEntries,updatedAt:settings.updated_at},afterSettings={version:settingsVersion+1,entries:next,updatedAt:time};
    updates.push(db.prepare('UPDATE finance_settings SET version=version+1,payload=?,updated_at=? WHERE id=1 AND '+gate).bind(JSON.stringify(next),time,...gateArgs));
    updates.push(db.prepare("INSERT INTO finance_changes(order_id,kind,before_payload,after_payload,actor,created) SELECT NULL,'settings',?,?,'authenticated-admin',? WHERE "+gate).bind(JSON.stringify(before),JSON.stringify(afterSettings),time,...gateArgs));
   }
  }else{kind='stocktake';stockQuantity(b.countedMilli,item.wholeUnits);if(!label(b.reason,200)||item.stocktakeGeneration===MAX)invalid('A short stocktake reason is required.');reason=b.reason.trim();delta=b.countedMilli-item.balanceMilli;after={...item,balanceMilli:b.countedMilli,initialized:true,version:item.version+1,stocktakeGeneration:item.stocktakeGeneration+1};}
  affected=[after];updateItem(after);
 }else{
  if(!integer(b.orderVersion)||!integer(b.usageVersion)||b.usageVersion===MAX||order.version!==b.orderVersion||(link?.version??0)!==b.usageVersion)conflict();
  add('EXISTS(SELECT 1 FROM orders WHERE id=? AND version=? AND expires>unixepoch())',b.id,b.orderVersion);
  if(link)add('EXISTS(SELECT 1 FROM order_stock_use WHERE order_id=? AND version=? AND operation_id=? AND status=?)',b.id,link.version,link.operation_id,link.status);else add('NOT EXISTS(SELECT 1 FROM order_stock_use WHERE order_id=?)',b.id);
  const isUse=path==='order-use';validateLines(b.lines,isUse);
  if(isUse){
   kind='use';if(!integer(b.costVersion)||!cost||cost.version!==b.costVersion)conflict();if(link?.status==='active')conflict('ALREADY_USED','Materials were already used for this order.');add('EXISTS(SELECT 1 FROM order_costs WHERE order_id=? AND version=?)',b.id,b.costVersion);
   const expected=preview(cost,items);if(!expected.length||b.lines.length!==expected.length||expected.some(l=>!b.lines.some(v=>v.itemId===l.id)))conflict('CONFLICT','Save costs first, then confirm the exact included materials.');if(!b.lines.some(l=>l.quantityMilli>0))invalid('At least one material quantity must be positive.');
   affected=b.lines.map(l=>{const item=checkVersion(l.itemId,l.version);if(l.stocktakeGeneration!==item.stocktakeGeneration)conflict();if(!item.initialized)conflict('CONFLICT','Record starting stock before using '+item.name+'.');stockQuantity(l.quantityMilli,item.wholeUnits);if(l.quantityMilli>item.balanceMilli)conflict('SHORTAGE','Not enough '+item.name+' in stock.');return {...item,balanceMilli:stockSum(item.balanceMilli,-l.quantityMilli),version:item.version+1}});
   const original=b.lines.map(l=>({...l,version:l.version+1}));usage={operationId:b.operationId,status:'active',lines:original,canReverse:true,reverseBlockedByStocktake:false};
   updates.push(db.prepare("INSERT INTO order_stock_use(order_id,operation_id,version,status,lines,reverse_operation_id,updated_at) SELECT ?,?,?,'active',?,NULL,? WHERE "+gate+" ON CONFLICT(order_id) DO UPDATE SET operation_id=excluded.operation_id,version=excluded.version,status='active',lines=excluded.lines,reverse_operation_id=NULL,updated_at=excluded.updated_at").bind(b.id,b.operationId,b.usageVersion+1,JSON.stringify(original),time,...gateArgs));
  }else{
   kind='reverse';if(!label(b.reason,200))invalid('A short reversal reason is required.');reason=b.reason.trim();if(!link||link.status!=='active')conflict('ALREADY_USED','There is no active materials use to reverse.');const original=JSON.parse(link.lines);if(original.length!==b.lines.length||original.some(l=>!b.lines.some(v=>v.itemId===l.itemId)))conflict('CONFLICT','Reverse the complete original material set.');
   affected=b.lines.map(l=>{const item=checkVersion(l.itemId,l.version),prior=original.find(v=>v.itemId===l.itemId);if(prior.stocktakeGeneration!==item.stocktakeGeneration)conflict('STOCKTAKE_AFTER_USE','A later stocktake prevents reversal. Check physical stock and record a stocktake correction.');if(l.stocktakeGeneration!==item.stocktakeGeneration)conflict();return {...item,balanceMilli:stockSum(item.balanceMilli,prior.quantityMilli),version:item.version+1}});
   reverses=link.operation_id;add('NOT EXISTS(SELECT 1 FROM stock_movements WHERE reverses=?)',reverses);usage={operationId:link.operation_id,status:'reversed',lines:original.map(l=>({...l,version:affected.find(i=>i.id===l.itemId).version})),canReverse:false,reverseBlockedByStocktake:false};
   updates.push(db.prepare("UPDATE order_stock_use SET version=version+1,status='reversed',reverse_operation_id=?,updated_at=? WHERE order_id=? AND "+gate).bind(b.operationId,time,b.id,...gateArgs));
  }
  affected.forEach(updateItem);
 }
 const lines=affected.map(item=>({itemId:item.id,name:item.name,unit:item.unit,deltaMilli:item.balanceMilli-(byId.get(item.id)?.balanceMilli??0),balanceMilli:item.balanceMilli,stocktakeGeneration:item.stocktakeGeneration}));
 // Only this conditional insert authorizes the entire batch. Its guards execute after D1 queuing.
 // Every mutation depends on the pending header, finalized before commit. A completed retry cannot re-enter.
 const header=db.prepare('INSERT INTO stock_movements(operation_id,request_digest,kind,created,reason,lines,price,reverses,result) SELECT ?,?,?,?,?,?,?,?,NULL WHERE '+(conditions.join(' AND ')||'1')+' ON CONFLICT(operation_id) DO NOTHING RETURNING seq').bind(b.operationId,requestDigest,kind,time,reason,JSON.stringify(lines),price===null?null:JSON.stringify(price),reverses,...params);
 const result={operationId:b.operationId,revision:0,items:affected,usage};
 await db.batch([header,...updates,db.prepare("UPDATE stock_movements SET result=json_set(?,'$.revision',seq) WHERE operation_id=? AND result IS NULL").bind(JSON.stringify(result),b.operationId)]);
 if(order)await orderRecord(db,b.id);
 const saved=await db.prepare('SELECT request_digest,result FROM stock_movements WHERE operation_id=?').bind(b.operationId).first();if(!saved)conflict();if(saved.request_digest!==requestDigest)conflict('OPERATION_MISMATCH','This operation identity belongs to a different request.');if(!saved.result)throw Error('Incomplete operation');return Response.json(JSON.parse(saved.result));
 }catch(error){if(error instanceof StockError)return fail(error.status,error.code,error.message);if(error instanceof TypeError||error instanceof RangeError)return fail(400,'INVALID','Invalid or overflowing stock quantity.');return fail(503,'UNAVAILABLE','Stock is temporarily unavailable. Keep this tab open and reconcile before retrying.');}
}
