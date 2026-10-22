import {validateCostEntry,calculateCostLine} from '../shared/finance-costs.mjs';
import {monthRange} from '../shared/finance-report.mjs';
import {boundedBody} from '../server/auth.mjs';
const now=()=>Math.floor(Date.now()/1000);
const fail=(status,error)=>Response.json({error},{status});
const uuid=value=>typeof value==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value);
const integer=(value,min=0)=>Number.isSafeInteger(value)&&value>=min;
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const fields=(value,allowed)=>object(value)&&Object.keys(value).every(key=>allowed.includes(key));
const safe=value=>{if(!integer(value))throw Error('Unsafe total');return value};
const settingsView=row=>row?{version:row.version,entries:JSON.parse(row.payload),updatedAt:row.updated_at}:{version:0,entries:[],updatedAt:null};
const costView=row=>row?{orderId:row.order_id,version:row.version,orderVersion:row.order_version,status:row.status,...JSON.parse(row.payload),updatedAt:row.updated_at}:null;
function entries(values,actual=false){
 if(!Array.isArray(values)||values.length>100)throw Error('Invalid entries');
 const ids=new Set();let known=0n,complete=values.length>0;
 const lines=values.map(value=>{
  if(!object(value))throw Error('Invalid entry');
  let entry=value,excluded=false;
  if(actual){const {excluded:omit,amountCents,...input}=value;if(typeof omit!=='boolean')throw Error('Invalid exclusion');entry=input;excluded=omit;}
  const normalized=validateCostEntry(entry);if(ids.has(normalized.id))throw Error('Duplicate entry');ids.add(normalized.id);
  if(!actual)return normalized;
  const amountCents=excluded?0:calculateCostLine(normalized,normalized.usageMilli);
  if(!excluded&&amountCents===null)complete=false;
  if(amountCents!==null)known+=BigInt(amountCents);
  return {...normalized,excluded,amountCents};
 });
 if(!actual)return lines;
 if(!lines.some(line=>!line.excluded))complete=false;
 const knownCostCents=safe(Number(known));return {lines,complete,totalCents:complete?knownCostCents:null,knownCostCents};
}
const audit=(db,orderId,kind,before,after,time)=>db.prepare('INSERT INTO finance_changes(order_id,kind,before_payload,after_payload,actor,created) SELECT ?,?,?,?,?,? WHERE changes()>0').bind(orderId,kind,before===null?null:JSON.stringify(before),JSON.stringify(after),'authenticated-admin',time);
const costResponse=(id,version,cost)=>Response.json({orderId:id,orderVersion:version,cost});

export async function financeService(request,env){
 if(request.method!=='POST')return fail(405,'Method not allowed.');
 const path=new URL(request.url).pathname.slice('/finance/'.length),allowed={
  'settings-read':[], 'settings-save':['version','entries'], 'order-read':['id'],
  'order-save':['id','version','orderVersion','lines'], 'order-confirm':['id','version','orderVersion'],
  month:['month','before','revision','validUntil']
 };
 if(!Object.hasOwn(allowed,path))return fail(404,'Not found.');
 let b;try{b=JSON.parse(await boundedBody(request,65536));if(!fields(b,allowed[path]))throw Error('Invalid fields');}catch{return fail(400,'Invalid or oversized finance input.');}
 if(!env.DB)return fail(503,'Finance is temporarily unavailable.');
 const db=env.DB,time=now();
 if(path==='settings-read')return Response.json(settingsView(await db.prepare('SELECT * FROM finance_settings WHERE id=1').first()));
 if(path==='settings-save'){
  let normalized;try{if(!integer(b.version)||!integer(b.version+1,1))throw Error('Invalid version');normalized=entries(b.entries);}catch{return fail(400,'Invalid cost settings.');}
  const before=settingsView(await db.prepare('SELECT * FROM finance_settings WHERE id=1').first()),after={version:b.version+1,entries:normalized,updatedAt:time};
  if(before.version!==b.version)return fail(409,'Cost settings changed. Reload before saving.');
  const statement=b.version===0?db.prepare('INSERT INTO finance_settings(id,version,payload,updated_at) VALUES(1,1,?,?) ON CONFLICT(id) DO NOTHING RETURNING *').bind(JSON.stringify(normalized),time):db.prepare('UPDATE finance_settings SET version=version+1,payload=?,updated_at=? WHERE id=1 AND version=? RETURNING *').bind(JSON.stringify(normalized),time,b.version);
  const result=await db.batch([statement,audit(db,null,'settings',before.version?before:null,after,time)]);
  return result[0].results.length?Response.json(settingsView(result[0].results[0])):fail(409,'Cost settings changed. Reload before saving.');
 }
 if(path==='month')return month(db,b,time);
 if(!uuid(b.id))return fail(400,'Invalid order reference.');
 const order=await db.prepare('SELECT id,version,expires FROM orders WHERE id=?').bind(b.id).first();
 if(!order)return fail(404,'Order not found.');if(order.expires<=now())return fail(410,'This order has expired.');
 const stored=await db.prepare('SELECT * FROM order_costs WHERE order_id=?').bind(b.id).first();
 if(order.expires<=now())return fail(410,'This order has expired.');
 if(path==='order-read')return costResponse(b.id,order.version,costView(stored));
 if(!integer(b.version)||!integer(b.version+1,1)||!integer(b.orderVersion))return fail(400,'Invalid finance version.');
 let payload;
 if(path==='order-save'){try{payload=entries(b.lines,true)}catch{return fail(400,'Invalid cost lines.');}}
 else{if(!stored||!JSON.parse(stored.payload).complete)return fail(409,'Save complete costs before confirming.');payload=JSON.parse(stored.payload);}
 if(order.version!==b.orderVersion||(stored?.version??0)!==b.version)return fail(409,'Order or costs changed. Reload before saving.');
 const status=path==='order-save'?'estimated':'confirmed',after={orderId:b.id,version:b.version+1,orderVersion:b.orderVersion,status,...payload,updatedAt:time};
 const statement=b.version===0?db.prepare('INSERT INTO order_costs(order_id,version,order_version,status,payload,updated_at) SELECT id,1,version,?,?,? FROM orders WHERE id=? AND version=? AND expires>unixepoch() ON CONFLICT(order_id) DO NOTHING RETURNING *').bind(status,JSON.stringify(payload),time,b.id,b.orderVersion):db.prepare('UPDATE order_costs SET version=version+1,order_version=?,status=?,payload=?,updated_at=? WHERE order_id=? AND version=? AND EXISTS(SELECT 1 FROM orders WHERE id=? AND version=? AND expires>unixepoch()) RETURNING *').bind(b.orderVersion,status,JSON.stringify(payload),time,b.id,b.version,b.id,b.orderVersion);
 // Database time authorizes the mutation when it executes, including time spent queued.
 const result=await db.batch([statement,audit(db,b.id,path==='order-save'?'save':'confirm',costView(stored),after,time)]);
 if(order.expires<=now())return fail(410,'This order has expired.');
 return result[0].results.length?costResponse(b.id,b.orderVersion,costView(result[0].results[0])):fail(409,'Order or costs changed. Reload before saving.');
}

// Only scalar amounts are projected. Contact, artwork and entire cost-line payloads stay private to detail reads.
const projection=`SELECT o.seq,o.id,'CV-' || printf('%06d',o.seq) reference,o.created,o.expires,o.status,
 json_extract(o.snapshot,'$.magnetQty') magnetQty,json_extract(o.snapshot,'$.subtotalCents') subtotalCents,
 json_extract(o.snapshot,'$.deliveryCents') deliveryCents,json_extract(o.snapshot,'$.totalCents') totalCents,
 'unpaid' paymentStatus,c.version costVersion,c.status costStatus,
 coalesce(json_extract(c.payload,'$.complete'),0) costComplete,json_extract(c.payload,'$.totalCents') costCents,
 coalesce(json_extract(c.payload,'$.knownCostCents'),0) knownCostCents
 FROM orders o LEFT JOIN order_costs c ON c.order_id=o.id WHERE o.expires>? AND o.created>=? AND o.created<?`;
async function month(db,b,time){
 let range;try{range=monthRange(b.month);if(b.before!==undefined&&!integer(b.before,1)||b.revision!==undefined&&!integer(b.revision)||b.validUntil!==undefined&&b.validUntil!==null&&!integer(b.validUntil,1))throw Error('Invalid page');}catch{return fail(400,'Invalid month or report page.');}
 if(b.validUntil!==undefined&&b.validUntil!==null&&b.validUntil<=time)return fail(409,'Report expired. Start a fresh export.');
 const state=await db.prepare('SELECT revision FROM finance_report_state WHERE id=1').first(),revision=state.revision;
 if(!integer(revision)||b.revision!==undefined&&b.revision!==revision)return fail(409,'Report changed. Start a fresh export.');
 const params=[time,...range],result=await db.batch([
  db.prepare(projection+' AND o.seq<? ORDER BY o.seq DESC LIMIT 51').bind(...params,b.before??Number.MAX_SAFE_INTEGER),
  db.prepare(`SELECT count(*) orderCount,coalesce(sum(magnetQty),0) magnetQty,coalesce(sum(totalCents),0) knownOrderValueCents,
   coalesce(sum(knownCostCents),0) recordedCostCents,sum(CASE WHEN totalCents IS NULL THEN 1 ELSE 0 END) missingTotalCount,
   sum(CASE WHEN costComplete=0 THEN 1 ELSE 0 END) missingCostCount,
   sum(CASE WHEN costStatus='estimated' THEN 1 ELSE 0 END) estimatedCostCount,
   sum(CASE WHEN costStatus='confirmed' THEN 1 ELSE 0 END) confirmedCostCount,
   sum(CASE WHEN totalCents IS NOT NULL AND deliveryCents IS NOT NULL AND costComplete=1 AND costCents IS NOT NULL THEN 1 ELSE 0 END) marginOrderCount,
   sum(CASE WHEN totalCents IS NOT NULL AND deliveryCents IS NOT NULL AND costComplete=1 AND costCents IS NOT NULL THEN totalCents-costCents ELSE NULL END) projectedMarginCents,
   min(expires) validUntil FROM (${projection})`).bind(...params),
  db.prepare('SELECT min(created) availableFrom FROM orders WHERE expires>?').bind(time)
 ]);
 const final=await db.prepare('SELECT revision FROM finance_report_state WHERE id=1').first(),aggregate=result[1].results[0],validUntil=aggregate.validUntil;
 if(final.revision!==revision||validUntil!==null&&validUntil<=now()||b.validUntil!=null&&b.validUntil<=now())return fail(409,'Report changed or expired. Start a fresh export.');
 const {validUntil:ignored,...summary}=aggregate;
 for(const key of Object.keys(summary)){if(key==='projectedMarginCents'){if(summary[key]!==null&&!Number.isSafeInteger(summary[key]))throw Error('Unsafe report total');}else summary[key]=safe(summary[key]??0);}
 const source=result[0].results,rows=source.slice(0,50).map(({seq,expires,...row})=>({...row,costComplete:!!row.costComplete}));
 return Response.json({month:b.month,rows,next:source.length>50?source[49].seq:null,summary,availableFrom:result[2].results[0].availableFrom,reportRevision:revision,validUntil});
}
