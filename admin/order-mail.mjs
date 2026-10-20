import {recipientBinding} from '../server/mail-recipient.mjs';
import {validProviderMessageId} from '../server/mail-receipt.mjs';
import {random} from '../server/auth.mjs';
import {proofCall,proofHash} from '../server/proof-api.mjs';
import {proofUpdateEmail} from '../server/order-update-email.mjs';
import {orderUpdateEmail} from '../server/order-update-email.mjs';
const call=(env,path,b)=>env.AUTH.fetch('https://auth.internal/orders/'+path,{method:'POST',body:JSON.stringify(b)});
const fail=(status,error)=>Response.json({error},{status});
async function retryPreview(env,order,mail){
 const previous=(order.updates||[]).find(u=>u.version===order.version);
 if(order.status==='fulfilled'||!previous?.retryable)return mail;
 const retryToken=random();const issued=await call(env,'preview-retry',{id:order.id,version:order.version,attempt:previous.attempt,tokenHash:await proofHash(retryToken),...(mail.proofToken?{proofTokenHash:await proofHash(mail.proofToken)}:{})});
 if(!issued.ok)throw Error('This attempt changed. Review a fresh preview.');
 return {...mail,retryAttempt:previous.attempt,retryToken};
}
export async function previewOrderUpdate(env,id,order){if(!order){const r=await call(env,'detail',{id});if(!r.ok)throw Error('Order is unavailable.');order=await r.json();}return orderUpdateEmail(order,{googleReviewUrl:env.GOOGLE_REVIEW_URL});}
// This mutates retry capabilities and is exposed only through the CSRF-protected POST route.
export async function previewRetryUpdate(env,id,version){
 const detail=await call(env,'detail',{id});if(!detail.ok)return detail;const order=await detail.json();
 const previous=order.updates.find(u=>u.version===order.version);
 if(!Number.isSafeInteger(version)||version!==order.version||order.status==='fulfilled'||!previous?.retryable)return fail(409,'This attempt changed. Review its history before retrying.');
 if((order.artworkExpires??order.expires)*1000>Date.now()&&order.proof?.status==='awaiting_approval')return previewProofUpdate(env,id,version);
 try{return Response.json(await retryPreview(env,order,orderUpdateEmail(order,{googleReviewUrl:env.GOOGLE_REVIEW_URL})));}catch{return fail(409,'Order or attempt changed. Preview again.');}
}
// Only structured provider validation/authentication rejections prove non-acceptance.
// Conflicts (409), timeouts, throttling, unknown bodies and server errors remain uncertain.
const rejectionNames=new Set(['validation_error','invalid_idempotency_key','authentication_error','authorization_error','unprocessable_entity','missing_required_field','invalid_access','invalid_parameter','missing_api_key','invalid_api_key','invalid_api_Key','invalid_from_address','restricted_api_key']);
export async function sendOrderUpdate(env,id,version,network=fetch,proofToken,retry={}){
 if(env.ADMIN_SEND_ENABLED!=='true'||!env.RESEND_API_KEY)return fail(503,'Customer email is unavailable. Check the admin email settings.');
 const detail=await call(env,'detail',{id});if(!detail.ok)return detail;const order=await detail.json();
 if(!Number.isSafeInteger(version)||version!==order.version)return fail(409,'Order changed. Review a fresh email preview.');
 let preview;if(order.status!=='fulfilled'&&(order.artworkExpires??order.expires)*1000>Date.now()&&order.proof?.status==='awaiting_approval'){if(!/^[a-f0-9]{64}$/.test(proofToken||''))return fail(409,'Preview the current review invitation first.');const check=await proofCall(env,'check-link',{id,version,tokenHash:await proofHash(proofToken)});if(!check.ok)return check;preview=proofUpdateEmail(order,proofToken);}else preview=orderUpdateEmail(order,{googleReviewUrl:env.GOOGLE_REVIEW_URL});const claim=await call(env,'claim-update',{id,version,...(retry.retryAttempt!==undefined?{retryAttempt:retry.retryAttempt,retryTokenHash:/^[a-f0-9]{64}$/.test(retry.retryToken||'')?await proofHash(retry.retryToken):null}:{})});if(!claim.ok)return claim;
 const reservation=await claim.json();if(!reservation.claimed)return fail(409,'This update was already attempted. Check its history before doing anything else.');
 if(!/^[a-f0-9-]{36}$/.test(reservation.attempt||''))return fail(503,'The email reservation could not be confirmed. Do not resend; check its history.');
 let state='uncertain',providerMessageId,binding;
 try{const {version:unused,proofToken:unusedToken,to,...payload}=preview;const r=await network('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':`cv-update-${id}-${version}-${reservation.attempt}`},body:JSON.stringify({...payload,to:[to]}),signal:AbortSignal.timeout(20000)});const result=await r.json();if(r.ok&&validProviderMessageId(result?.id)){state='accepted';providerMessageId=result.id;binding=await recipientBinding(result.id,{...payload,to:[to]});}else if([400,401,403,422].includes(r.status)&&rejectionNames.has(result?.name)&&typeof result.message==='string'&&result.message.trim())state='failed';}catch{}
 try{const marked=await call(env,'mark-update',{id,version,state,attempt:reservation.attempt,rejected:state==='failed',...(providerMessageId?{providerMessageId}:{}),...(binding?{recipientBinding:binding}:{})});if(!marked.ok)throw Error('unavailable');}catch{return fail(503,'The email outcome could not be recorded. Do not resend; check the provider first.');}
 return state==='accepted'?Response.json({ok:true,state}):fail(503,state==='failed'?'The provider rejected this update. Check its settings before another attempt.':'Delivery is uncertain. Do not resend; check the provider first.');
}

export async function previewProofUpdate(env,id,version){
 const before=await call(env,'detail',{id});if(!before.ok)return before;const current=await before.json();
 if(current.version!==version)return fail(409,'Order changed. Preview again.');
 const previous=current.updates.find(u=>u.version===version),token=random();
 if(previous){
  if(current.status==='fulfilled'||!previous.retryable)return fail(409,'This update was already attempted. Check its history.');
  try{return Response.json(await retryPreview(env,current,{...proofUpdateEmail(current,token),proofToken:token}));}catch{return fail(409,'Order or attempt changed. Preview again.');}
 }
 const issued=await proofCall(env,'issue',{id,version,tokenHash:await proofHash(token)});if(!issued.ok)return issued;
 const detail=await call(env,'detail',{id});if(!detail.ok)return detail;const order=await detail.json();
 if(order.version!==(await issued.json()).version)return fail(409,'Order changed. Preview again.');
 return Response.json({...proofUpdateEmail(order,token),proofToken:token});
}
