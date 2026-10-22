import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import AdminShell from '../../admin/AdminShell';
import Finances from '../../admin/Finances';
import OrderCosts from '../../admin/OrderCosts';
import {calculateCostLine} from '../../shared/finance-costs.mjs';
import {summarizeFinanceRows,monthRange} from '../../shared/finance-report.mjs';
import {currentFinanceMonth} from '../../admin/finance-client.mjs';
import {sessionRecovery} from '../../admin/session-recovery.mjs';
import '../../src/fonts.css';
const params=new URLSearchParams(location.search),scenario=params.get('scenario')||'normal',orderView=params.get('view')==='order';
const now=Math.floor(Date.now()/1000),month=currentFinanceMonth(),[start]=monthRange(month),id=n=>`11111111-1111-4111-8111-${String(n).padStart(12,'0')}`;
const base=(n,name,category,price,qty,unit,basis,usage,yieldCount=null)=>({id:id(n),name,category,packCents:price,packQuantity:qty,unit,basis,usageMilli:usage,magnetsPerSheet:yieldCount,active:true});
let settings={version:1,updatedAt:now,entries:scenario==='empty-settings'?[]:[base(101,'Synthetic magnet blanks','materials',12345,100,'blank','per_magnet',1000),base(102,'Synthetic coating','materials',8000,1000,'ml','per_magnet',1250),base(103,'Synthetic paper','printing',5999,100,'sheet','per_sheet',1000,9),base(104,'Synthetic courier expense','courier',6000,1,'delivery','per_order',1000)]};
let revision=7,failed=false,authenticated=true,monthReads=0;
const orders=Array.from({length:scenario==='empty-month'?0:52},(_,n)=>({id:id(n+1),reference:'CV-LOCAL-'+String(n+1).padStart(3,'0'),created:start+3600*(n+1),status:'new',version:3,expires:now+86400,snapshot:{magnetQty:11,subtotalCents:22000,deliveryCents:n===1?null:0,totalCents:n===1?null:22000}}));
const costs=new Map(orders.filter((_,n)=>n!==1).map((order,n)=>[order.id,{orderId:order.id,version:2,orderVersion:3,status:n%2?'estimated':'confirmed',complete:true,totalCents:6750,knownCostCents:6750,updatedAt:now,lines:[{...base(201,'Synthetic order override','materials',7500,100,'blank','per_magnet',10000),excluded:false,amountCents:750},{...base(202,'Synthetic courier expense','courier',6000,1,'delivery','per_order',1000),excluded:false,amountCents:6000}]}]));
const scalar=order=>{const c=costs.get(order.id);return {id:order.id,reference:order.reference,created:order.created,status:order.status,magnetQty:order.snapshot.magnetQty,subtotalCents:order.snapshot.subtotalCents,deliveryCents:order.snapshot.deliveryCents,totalCents:order.snapshot.totalCents,paymentStatus:'unpaid',costVersion:c?.version??null,costStatus:c?.status??null,costComplete:c?.complete??false,costCents:c?.totalCents??null,knownCostCents:c?.knownCostCents??0};};
const respond=(data,status=200)=>Response.json(structuredClone(data),{status});
const failure=(status,message)=>respond({error:message},status);
// No production fallthrough: every runtime fetch is local synthetic data or blocked.
window.fetch=async(input,options={})=>{
 const url=new URL(typeof input==='string'?input:input.url,location.origin),post=options.method==='POST';
 if(url.origin!==location.origin)throw Error('External network is blocked in this local fixture.');
 if(url.pathname==='/api/session')return authenticated?respond({csrf:'synthetic-only',expiresAt:now+3600}):failure(401,'Synthetic session expired.');
 if(!url.pathname.startsWith('/api/finance/'))return failure(403,'All other requests and sends are blocked in this local fixture.');
 if(scenario==='loading')await new Promise(resolve=>setTimeout(resolve,900));
 if(scenario==='session-expired'&&post&&!failed){failed=true;authenticated=false;return failure(401,'Synthetic session expired.');}
 if(!authenticated)return failure(401,'Synthetic session expired.');
 const body=post?JSON.parse(options.body):null;
 if(url.pathname==='/api/finance/settings'){
  if(!post)return respond(settings);
  if(scenario==='conflict'&&!failed){failed=true;settings={...settings,version:settings.version+1,entries:settings.entries.map((e,i)=>i===0?{...e,name:'Saved by another synthetic tab'}:e)};return failure(409,'Settings changed.');}
  if(body.version!==settings.version)return failure(409,'Settings changed.');settings={version:settings.version+1,entries:body.entries,updatedAt:now};
  if(scenario==='lost-response'&&!failed){failed=true;throw new TypeError('Synthetic lost save response.');}return respond(settings);
 }
 if(url.pathname==='/api/finance/month'){
  monthReads++;if(scenario==='report-change'&&monthReads===3)revision++;
  if(url.searchParams.has('revision')&&Number(url.searchParams.get('revision'))!==revision)return failure(409,'Synthetic report changed. Start a fresh export.');
  const rows=url.searchParams.get('month')===month?orders.map(scalar):[],before=Number(url.searchParams.get('before')||0),offset=before||0,page=rows.slice(offset,offset+50);return respond({month:url.searchParams.get('month'),rows:page,next:offset+50<rows.length?offset+50:null,summary:summarizeFinanceRows(rows),availableFrom:orders[0]?.created??null,reportRevision:revision,validUntil:rows.length?now+86400:null});
 }
 const match=url.pathname.match(/^\/api\/finance\/orders\/([a-f0-9-]+)(\/confirm)?$/);if(!match)return failure(404,'Synthetic route not found.');
 const order=orders.find(o=>o.id===match[1]);if(!order)return failure(404,'Synthetic order not found.');const stored=costs.get(order.id)||null,wrap=()=>({orderId:order.id,orderVersion:order.version,cost:costs.get(order.id)||null});if(!post)return respond(wrap());
 if(scenario==='conflict'&&!failed){failed=true;if(stored)costs.set(order.id,{...stored,version:stored.version+1,totalCents:7000,knownCostCents:7000,lines:stored.lines.map((e,i)=>i===0?{...e,packCents:10000,amountCents:1000}:e)});else order.version++;revision++;return failure(409,'Synthetic costs changed in another tab.');}
 if(body.version!==(stored?.version??0)||body.orderVersion!==order.version)return failure(409,'Synthetic order or costs changed.');
 if(match[2]){if(!stored?.complete)return failure(400,'Complete saved costs first.');costs.set(order.id,{...stored,version:stored.version+1,orderVersion:order.version,status:'confirmed'});}
 else{const lines=body.lines.map(line=>({...line,amountCents:line.excluded?0:calculateCostLine(line,line.usageMilli)})),complete=lines.some(l=>!l.excluded)&&lines.every(l=>l.excluded||l.amountCents!==null),knownCostCents=lines.reduce((total,l)=>total+(l.amountCents??0),0);costs.set(order.id,{orderId:order.id,version:(stored?.version??0)+1,orderVersion:order.version,status:'estimated',lines,complete,totalCents:complete?knownCostCents:null,knownCostCents,updatedAt:now});}
 revision++;if(scenario==='lost-response'&&!failed){failed=true;throw new TypeError('Synthetic lost save response.');}return respond(wrap());
};
navigator.sendBeacon=()=>false;
const fixture='/tests/fixtures/admin-finance.html';document.addEventListener('click',event=>{const link=event.target.closest('a');if(!link)return;const url=new URL(link.href);event.preventDefault();if(url.pathname==='/auth/login'){authenticated=true;sessionRecovery.check();return;}if(url.pathname==='/orders'){const next=new URLSearchParams({view:'order',order:url.searchParams.get('order')||id(1),scenario});location.href=fixture+'?'+next;}else if(url.pathname==='/finances')location.href=fixture+'?scenario='+scenario;});
function Fixture(){const [tick,setTick]=useState(0),chosen=orders.find(o=>o.id===(params.get('order')||id(1)))||orders[0];return <><div style={{padding:'10px 20px',background:'#35233f',color:'white',font:'13px system-ui'}}>LOCAL SYNTHETIC PREVIEW · No external requests, email or production writes · Scenario: {scenario}{scenario==='session-expired'&&<button style={{marginLeft:12,minHeight:44}} onClick={()=>{authenticated=true;sessionRecovery.check();}}>Restore synthetic sign-in</button>}</div><AdminShell section="finances" logout={()=>{authenticated=false;sessionRecovery.expired();}}>{orderView&&chosen?<main className="cv-finances"><a href="/finances">Back to Finances</a><h1>{chosen.reference}</h1><p>Synthetic order · {chosen.snapshot.magnetQty} magnets · Unpaid</p><p>Artwork expired for this review. Order costs are still available.</p><button className="cv-btn secondary" onClick={()=>{chosen.version++;chosen.status='in_progress';revision++;setTick(tick+1);}}>Advance synthetic stage</button><p>Stage version {chosen.version}</p><OrderCosts order={{...chosen}}/></main>:<Finances/>}</AdminShell></>;}
createRoot(document.getElementById('root')).render(<Fixture/>);
