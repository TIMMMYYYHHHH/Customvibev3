import {validateCostEntry,calculateCostLine,estimateOrderCosts} from '../shared/finance-costs.mjs';
import {financeCsv} from '../shared/finance-report.mjs';
import {api} from './api.mjs';
function scaledText(value,places){const amount=BigInt(value),absolute=amount<0n?-amount:amount,scale=10n**BigInt(places);return `${amount<0n?'-':''}${absolute/scale}.${String(absolute%scale).padStart(places,'0')}`;}
export const money=value=>value===null||value===undefined?'Not entered':`R ${scaledText(value,2)}`;
export const currentFinanceMonth=(now=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Johannesburg',year:'numeric',month:'2-digit'}).format(now).replace(/^(\d{2})\/(\d{4})$/,'$2-$1');
export function entryDraft(entry){return {...entry,packPrice:entry.packCents===null?'':scaledText(entry.packCents,2),packQuantity:String(entry.packQuantity),usage:scaledText(entry.usageMilli,3).replace(/\.?0+$/,''),magnetsPerSheet:entry.magnetsPerSheet===null?'':String(entry.magnetsPerSheet)};}
function decimal(value,places,field,index,{missing=false,positive=false}={}){
 const text=String(value).trim();if(missing&&text==='')return null;
 if(!new RegExp(`^\\d+(?:\\.\\d{1,${places}})?$`).test(text))throw Object.assign(Error(places===2?'Enter a price in rand with up to 2 decimal places.':'Enter usage with up to 3 decimal places.'),{field,index});
 const [whole,fraction='']=text.split('.'),number=BigInt(whole)*10n**BigInt(places)+BigInt(fraction.padEnd(places,'0'));
 if(number>BigInt(Number.MAX_SAFE_INTEGER)||positive&&number===0n)throw Object.assign(Error('Enter a smaller positive whole number.'),{field,index});return Number(number);
}
function whole(value,field,index){if(!/^\d+$/.test(String(value))||!Number.isSafeInteger(Number(value))||Number(value)<1)throw Object.assign(Error('Enter a positive whole number.'),{field,index});return Number(value);}
export function parseEntries(drafts,{lines=false}={}){
 if(drafts.length>100)throw Error('Use no more than 100 cost entries.');
 const ids=new Set();return drafts.map((draft,index)=>{
  for(const [field,limit] of [['name',80],['unit',24]])if(!draft[field]?.trim()||draft[field].trim().length>limit)throw Object.assign(Error(`Enter ${field==='name'?'a name':'a unit'} of up to ${limit} characters.`),{field,index});
  const entry={id:draft.id,name:draft.name,category:draft.category,unit:draft.unit,packCents:decimal(draft.packPrice,2,'packPrice',index,{missing:true}),packQuantity:whole(draft.packQuantity,'packQuantity',index),basis:draft.basis,usageMilli:decimal(draft.usage,3,'usage',index),magnetsPerSheet:draft.basis==='per_sheet'?whole(draft.magnetsPerSheet,'magnetsPerSheet',index):null,active:draft.active};
  if(entry.basis==='per_sheet'&&entry.usageMilli%1000)throw Object.assign(Error('Enter whole sheets for sheet usage.'),{field:'usage',index});
  if(ids.has(entry.id))throw Error('Each cost entry needs its own identity.');ids.add(entry.id);
  const normalized=validateCostEntry(entry);return lines?{...normalized,excluded:!!draft.excluded}:normalized;
 });
}
export function previewCosts(draft){try{const lines=parseEntries(draft,{lines:true});let known=0n;for(const line of lines){const amount=line.excluded?0:calculateCostLine(line,line.usageMilli);if(amount!==null)known+=BigInt(amount);}if(known>BigInt(Number.MAX_SAFE_INTEGER))throw Error('Costs are too large.');const complete=lines.some(l=>!l.excluded)&&lines.every(l=>l.excluded||l.packCents!==null);return {complete,totalCents:complete?Number(known):null,knownCostCents:Number(known)};}catch{return null;}}
export function costStatus(state){return !state.saved?'Unsaved estimate':state.dirty||state.saved.status!=='confirmed'?'Estimated':'Confirmed costs';}
// One memory-only editor for the same versioned cost entries on settings and orders.
export function createCostEditor({path,settings=false,magnetQty,request=api}){
 let state={loaded:false,busy:false,draft:[],saved:null,version:0,orderVersion:0,dirty:false,error:'',fieldError:null,needsRead:false,remote:null,message:''};const listeners=new Set();
 const set=patch=>{state={...state,...patch};for(const fn of listeners)fn();};
 const record=data=>settings?data:data.cost;
 async function drafts(data){const saved=record(data);if(saved)return (settings?saved.entries:saved.lines).map(entryDraft);const defaults=await request('/api/finance/settings');return estimateOrderCosts(defaults,magnetQty).lines.map(entryDraft);}
 function adopt(data,draft){const saved=record(data);set({saved:settings?null:saved,version:settings?data.version:saved?.version??0,orderVersion:data.orderVersion??0,draft,loaded:true,dirty:false,needsRead:false,remote:null,error:'',fieldError:null});}
 async function load(){if(state.busy||state.loaded)return;set({busy:true,error:''});try{const data=await request(path);adopt(data,await drafts(data));}catch(e){set({error:e.message});}finally{set({busy:false});}}
 async function readCurrent(){if(state.busy)return;set({busy:true,error:'',message:''});try{const data=await request(path);set({remote:data,message:'Current saved data loaded. Review it before choosing which version to keep.'});}catch(e){set({error:e.message});}finally{set({busy:false});}}
 async function write(confirmVersion,observedOrderVersion=state.orderVersion){if(state.busy||state.needsRead)return;const confirming=confirmVersion!==undefined;if(confirming&&(state.dirty||!state.saved?.complete))return;
  let body;try{body=confirming?{version:state.version,orderVersion:Math.max(state.orderVersion,confirmVersion)}:settings?{version:state.version,entries:parseEntries(state.draft)}:{version:state.version,orderVersion:Math.max(state.orderVersion,observedOrderVersion),lines:parseEntries(state.draft,{lines:true})};if(new TextEncoder().encode(JSON.stringify(body)).length>65536)throw Error('These costs are too large to save. Shorten the entries.');}catch(e){set({error:e.message,fieldError:e.field?{field:e.field,index:e.index,message:e.message}:null});return;}
  set({busy:true,error:'',fieldError:null,message:''});try{const data=await request(path+(confirming?'/confirm':''),body);adopt(data,await drafts(data));set({message:confirming?'Costs confirmed.':settings?'Cost settings saved.':'Costs saved as Estimated.'});}catch(e){const needsRead=[401,409].includes(e.status)||!e.status||e.status>=500;set({needsRead,error:e.status===409?'Saved data changed in another tab. Your draft is still here. Read the current saved data to compare.':needsRead?'The save outcome could not be confirmed. Your draft is still here. Sign in if needed, then read the current saved data before saving again.':e.message});}finally{set({busy:false});}}
 return {getSnapshot:()=>state,subscribe:fn=>{listeners.add(fn);return()=>listeners.delete(fn);},load,readCurrent,save:version=>write(undefined,version),confirm:version=>write(version),edit(index,patch){if(state.busy||state.remote)return;set({draft:state.draft.map((d,i)=>i===index?{...d,...patch}:d),dirty:true,message:'',fieldError:null});},add(){if(state.busy||state.remote||state.draft.length>=100)return;set({draft:[...state.draft,entryDraft({id:crypto.randomUUID(),name:'',category:'materials',unit:'',packCents:null,packQuantity:1,basis:'per_order',usageMilli:1000,magnetsPerSheet:null,active:true,...(!settings?{excluded:false}:{})})],dirty:true,message:''});},async useSaved(){if(!state.remote||state.busy)return;set({busy:true});try{adopt(state.remote,await drafts(state.remote));set({message:'Saved version loaded. The previous draft was discarded.'});}catch(e){set({error:e.message});}finally{set({busy:false});}},keepDraft(){if(!state.remote||state.busy)return;const draft=state.draft;adopt(state.remote,draft);set({dirty:true,message:'Your draft is kept against the current saved version. Review it, then explicitly save when ready.'});}};
}
export async function exportFinanceMonth({month,detail=false,request=api,signal,now=()=>Math.floor(Date.now()/1000),onProgress=()=>{}}){
 const check=()=>{if(signal?.aborted)throw new DOMException('Export cancelled.','AbortError');};
 const query=new URLSearchParams({month}),path=()=>'/api/finance/month?'+query;check();let page=await request(path());check();const revision=page.reportRevision,validUntil=page.validUntil;query.set('revision',String(revision));query.set('validUntil',String(validUntil));
 const verify=data=>{check();if(data.month!==month||data.reportRevision!==revision||validUntil!==null&&now()>=validUntil||data.validUntil!==null&&now()>=data.validUntil)throw Error('The report changed or expired. Start a fresh export.');};
 const rows=[],cursors=new Set();for(let pages=0;;pages++){
  verify(page);if(pages>=2000)throw Error('This month is too large for one export.');rows.push(...page.rows);onProgress(`${rows.length} orders read`);if(page.next===null)break;if(cursors.has(page.next))throw Error('Report pagination changed. Start a fresh export.');cursors.add(page.next);query.set('before',String(page.next));page=await request(path());
 }
 if(detail)for(const row of rows){check();if(row.costVersion===null)continue;const saved=await request('/api/finance/orders/'+row.id);check();if(saved.cost?.version!==row.costVersion)throw Error('Costs changed during export. Start a fresh export.');row.lines=saved.cost.lines;onProgress(`Saved costs read for ${row.reference}`);}
 query.delete('before');verify(await request(path()));check();const csv=financeCsv(rows,{detail});verify(page);return csv;
}
