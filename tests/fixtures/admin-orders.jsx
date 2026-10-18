import {saveAdminContent} from '../../admin/save.mjs';import React from 'react';import Artwork from '../../admin/Artwork';import {defaultContent} from '../../src/content/model.mjs';import {createRoot} from 'react-dom/client';import AdminShell from '../../admin/AdminShell';import Orders from '../../admin/Orders';import Admin from '../../src/content/Admin';import {ContentProvider} from '../../src/content/ContentProvider';import '../../src/fonts.css';import {orderUpdateEmail} from '../../server/order-update-email.mjs';
const unifiedReview=['/orders','/content'].includes(location.pathname);
const time=Math.floor(Date.now()/1000);const orders=Array.from({length:6},(_,n)=>({id:`11111111-1111-4111-8111-${String(n+1).padStart(12,'0')}`,reference:'CV-'+String(n+1).padStart(6,'0'),previousReference:n===3?'CV-QZYB-R3BT-QC56-ZQZC':undefined,status:['new','new','in_progress','ready_to_ship','shipped','new'][n],version:0,created:time-n*10000,expires:time+1209600,ownerSent:true,receiptSent:true,history:[],updates:n===2?[{version:0,status:'in_progress',state:'accepted',updated:time-600}]:[],snapshot:{contact:{name:['Sample mixed request','Coast puzzle test','Three-photo test','Garden magnets','Print check','Family puzzle test'][n],email:'sample@example.com',phone:'000 000 0000'},locker:{name:'Sample locker',area:'Durban'},magnetQty:[11,25,3,2,1,9][n],subtotalCents:25000,paymentStatus:'unpaid',items:[{name:'Photo magnets',kind:'photo',qty:2,files:[{index:0,name:'design-01-photo.jpg',size:23129,proof:false}]},{name:'Picture puzzle',kind:'puzzle',qty:1,gridSize:3,files:Array.from({length:10},(_,i)=>({index:i+1,name:i===0?'design-02-proof.jpg':`design-02-row-${Math.floor((i-1)/3)+1}-col-${(i-1)%3+1}.jpg`,size:23129,proof:i===0}))}]}}));
const realFetch=window.fetch.bind(window),scenario=new URLSearchParams(location.search).get('scenario');let attempted=false;
if(scenario==='light-board'){
 const examples=[['CV-000006','Sample order',60,'new','2026-10-17'],['CV-000005','Patrick',3,'new','2026-10-17'],['CV-000001','Timmy',11,'in_progress','2026-10-16'],['CV-000004','Joe',3,'shipped','2026-10-17']];
 orders.splice(4);orders.forEach((order,i)=>{const [reference,name,quantity,status,date]=examples[i];order.reference=reference;order.snapshot.contact.name=name;order.snapshot.magnetQty=quantity;order.status=status;order.created=Date.parse(date+'T08:00:00+02:00')/1000;});
}
if(scenario==='replacement-proof'){
 const o=orders[0];o.snapshot.approvalRequired=true;o.snapshot.contact.name='Replacement proof review';
 o.proof={revision:2,status:'approved',digest:'local-sample',events:[],items:o.snapshot.items.map((item,n)=>({...item,files:item.files.map((file,j)=>({...file,requestId:n===0?'22222222-2222-4222-8222-222222222222':o.id,index:n===0?7:file.index,copies:item.qty*(item.designQuantities?.[j]??1)}))}))};
}
window.fetch=async(path,opts={})=>{
 const url=new URL(path,location.origin);
 if(url.pathname.startsWith('/api/'))console.info('Fixture request:',opts.method||'GET',url.pathname);
 if(url.pathname==='/content.json')return unifiedReview?realFetch(path,opts):Response.json(defaultContent);
 if(url.pathname==='/api/session')return unifiedReview?realFetch(path,opts):Response.json({csrf:'sample'});
 if(url.pathname==='/api/orders')return Response.json({orders,next:null});
 if(/^\/api\/artwork\/[a-f0-9-]{36}$/.test(url.pathname))return Response.json({id:orders[0].id,expires:orders[0].expires,files:orders[0].snapshot.items.flatMap(item=>item.files)});
 if(url.pathname.startsWith('/api/artwork/'))return realFetch('/tests/fixtures/print-tile.jpg');
 if(url.pathname.startsWith('/api/orders/')){
  if(unifiedReview){const session=await realFetch('/api/session');if(!session.ok)return session;}

  const id=url.pathname.split('/')[3],order=orders.find(o=>o.id===id);
  if(!order)return Response.json({error:'Request not found.'},{status:404});
  if(url.pathname.includes('/proof/')){
   const body=JSON.parse(opts.body||'{}');if(body.version!==order.version)return Response.json({error:'Order changed. Review current version.'},{status:409});
   const action=url.pathname.split('/').at(-1);
   if(action==='prepare')return Response.json({ok:true});
   if(action==='publish'||action==='seed'){order.proof={...order.proof,revision:(order.proof?.revision||0)+1,status:'awaiting_approval',items:order.proof?.items||order.snapshot.items};order.status='new';order.version++;return Response.json({ok:true});}
   if(action==='revoke'){order.version++;return Response.json({ok:true});}
   return Response.json({error:'Unsupported local proof operation'},{status:400});
  }
  if(url.pathname.endsWith('/preview'))return Response.json(orderUpdateEmail(order));
  if(url.pathname.endsWith('/send'))return Response.json({error:'Local preview: sending is disabled.'},{status:503});
  if(url.pathname.endsWith('/status')){
   await new Promise(resolve=>setTimeout(resolve,700));
   const body=JSON.parse(opts.body),first=!attempted;attempted=true;
   if(first&&scenario==='failure')return Response.json({error:'Synthetic connection failure. Please retry.'},{status:503});
   if(first&&scenario==='conflict'){order.status='ready_to_ship';order.version++;order.history.unshift({status:order.status,version:order.version,created:time});}
   if(body.version!==order.version)return Response.json({error:'Order changed. Refresh before updating.'},{status:409});
   order.status=body.status;order.version++;order.history.unshift({status:order.status,version:order.version,created:time});
   if(first&&scenario==='lost-response')throw Error('Synthetic lost response. The server saved the stage.');
   return Response.json({ok:true,version:order.version});
  }
  return Response.json(order);
 }
 if(url.origin!==location.origin)throw Error('External network disabled in local fixture');
 return realFetch(path,opts);
};
// Keep navigation within this synthetic fixture; no production mutation or email.
const fixture='/tests/fixtures/admin-orders.html';document.addEventListener('click',e=>{if(unifiedReview)return;const a=e.target.closest('a');if(!a)return;const u=new URL(a.href);if(u.origin===location.origin&&['/orders','/content'].includes(u.pathname)){e.preventDefault();location.href=fixture+(u.pathname==='/content'?'?view=content':u.search+u.hash)}});
const view=new URLSearchParams(location.search).get('view'),content=location.pathname==='/content'||view==='content',artwork=view==='artwork';
createRoot(document.getElementById('root')).render(<>{!unifiedReview&&<p style={{margin:0,padding:'6px 20px',background:'#35233f',color:'white',font:'12px system-ui'}}>LOCAL PREVIEW · Synthetic orders · No email sending</p>}<AdminShell section={content?'content':artwork?'artwork':'orders'} logout={()=>alert('Local preview only. There is no live session to sign out of.')}>{content?<ContentProvider onSave={unifiedReview?saveAdminContent:async d=>d}><Admin/></ContentProvider>:artwork?<Artwork/>:<Orders/>}</AdminShell></>);
