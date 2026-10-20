// Synthetic isolated test entry only. Never deploy this fixture or its seed route.
import {onRequest} from '../../functions/_middleware.js';
import {gate,secure} from '../../server/auth.mjs';
import {ordersAPI} from '../../admin/orders-api.mjs';
import {sendOrderUpdate} from '../../admin/order-mail.mjs';
import {recipientBinding} from '../../server/mail-recipient.mjs';
let networkAttempts=0,privateCalls=0,providerCalls=0,lastPrivateStatus=null;
globalThis.fetch=async()=>{networkAttempts++;throw Error('External network forbidden')};
const call=(env,path,body)=>env.AUTH.fetch('https://auth.internal/'+path,{method:'POST',body:JSON.stringify(body)});
export default {async fetch(request,bindings){
 const url=new URL(request.url),env={...bindings};
 // Failure injection wraps the real binding. It never supplies a fake writer.
 env.AUTH={async fetch(url,options){privateCalls++;if(request.headers.get('X-Synthetic-Private-Redirect')==='yes')options={...options,headers:{...options.headers,'X-Synthetic-Redirect':'yes'}};const response=await bindings.AUTH.fetch(url,options);lastPrivateStatus=response.status;if(request.headers.get('X-Synthetic-Lose-Reply')==='yes'&&url.endsWith('/mail-delivery/observe'))throw Error('Synthetic lost response');return response}};
 if(url.pathname==='/_fixture/stats')return Response.json({networkAttempts,privateCalls,providerCalls,lastPrivateStatus});
 if(url.pathname==='/_fixture/seed'){
  const {id,source,owner,customer}=await request.json(),createdAt=Math.floor(Date.now()/1000);
  const snapshot={contact:{name:'Synthetic only',email:customer,phone:'1234567'},locker:{name:'Synthetic',area:'Durban'},items:[{kind:'photo',name:'Photo',qty:1,files:[]}],magnetQty:1,subtotalCents:4000,paymentStatus:'unpaid'};
  for(const [path,body] of [['submissions/reserve',{id:source,key:'c'.repeat(64),fingerprint:'b'.repeat(64),kind:'order',createdAt}],['orders/create',{id,submissionId:source,fingerprint:'b'.repeat(64),snapshot}]]){const r=await call(env,path,body);if(!r.ok)return r}
  for(const [stage,messageId,to] of [['owner_sent','fixture-owner-'+id,owner],['receipt_sent','fixture-customer-'+id,customer]]){
   const r=await call(env,'submissions/mark',{id:source,stage,providerMessageId:messageId,recipientBinding:await recipientBinding(messageId,{to:[to]})});if(!r.ok)return r;
  }
  const manual='fixture-manual-'+id;
  const sent=await sendOrderUpdate(env,id,0,async()=>{providerCalls++;return Response.json({id:manual})});if(!sent.ok)return sent;
  return Response.json({id,owner:'fixture-owner-'+id,customer:'fixture-customer-'+id,manual});
 }
 if(url.hostname==='admin.customvibe.co.za'){
  const auth=await gate(request,env,'admin');return secure(auth.response||await ordersAPI(request,env,auth.session),{admin:true});
 }
 if(request.headers.get('X-Synthetic-Gate-Off')==='yes')env.SITE_GATE_ENABLED='false';
 if(request.headers.get('X-Synthetic-Preview')==='yes')env.CF_PAGES_BRANCH='preview';
 if(request.headers.get('X-Synthetic-Inactive')==='yes')delete env.MAIL_EVENTS_ENABLED;
 return onRequest({request,env,next:()=>new Response('Not found',{status:404})});
}};
