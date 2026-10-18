import {random} from '../server/auth.mjs';
import {proofCall,proofHash} from '../server/proof-api.mjs';
import {proofUpdateEmail} from '../server/order-update-email.mjs';
import {orderUpdateEmail} from '../server/order-update-email.mjs';
const call=(env,path,b)=>env.AUTH.fetch('https://auth.internal/orders/'+path,{method:'POST',body:JSON.stringify(b)});
const fail=(status,error)=>Response.json({error},{status});
export async function previewOrderUpdate(env,id){const r=await call(env,'detail',{id});if(!r.ok)throw Error('Order is unavailable.');return orderUpdateEmail(await r.json(),{googleReviewUrl:env.GOOGLE_REVIEW_URL});}
export async function sendOrderUpdate(env,id,version,network=fetch,proofToken){
 if(env.ADMIN_SEND_ENABLED!=='true'||!env.RESEND_API_KEY)return fail(503,'Customer email is unavailable. Check the admin email settings.');
 const detail=await call(env,'detail',{id});if(!detail.ok)return detail;const order=await detail.json();
 if(!Number.isSafeInteger(version)||version!==order.version)return fail(409,'Order changed. Review a fresh email preview.');
 let preview;if(order.status!=='fulfilled'&&(order.artworkExpires??order.expires)*1000>Date.now()&&order.proof?.status==='awaiting_approval'){if(!/^[a-f0-9]{64}$/.test(proofToken||''))return fail(409,'Preview the current review invitation first.');const check=await proofCall(env,'check-link',{id,version,tokenHash:await proofHash(proofToken)});if(!check.ok)return check;preview=proofUpdateEmail(order,proofToken);}else preview=orderUpdateEmail(order,{googleReviewUrl:env.GOOGLE_REVIEW_URL});const claim=await call(env,'claim-update',{id,version});if(!claim.ok)return claim;
 if(!(await claim.json()).claimed)return fail(409,'This update was already attempted. Check its history before doing anything else.');
 let state='uncertain';
 try{const {version:unused,proofToken:unusedToken,to,...payload}=preview;const r=await network('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':`cv-update-${id}-${version}`},body:JSON.stringify({...payload,to:[to]}),signal:AbortSignal.timeout(20000)});if(r.ok&&typeof(await r.json()).id==='string')state='accepted';else if(r.status>=400&&r.status<500&&r.status!==408)state='failed';}catch{}
 try{const marked=await call(env,'mark-update',{id,version,state});if(!marked.ok)throw Error('unavailable');}catch{return fail(503,'The email outcome could not be recorded. Do not resend; check the provider first.');}
 return state==='accepted'?Response.json({ok:true,state}):fail(503,state==='failed'?'The provider rejected this update. Check its settings before another attempt.':'Delivery is uncertain. Do not resend; check the provider first.');
}

export async function previewProofUpdate(env,id,version){const token=random(),issued=await proofCall(env,'issue',{id,version,tokenHash:await proofHash(token)});if(!issued.ok)return issued;const detail=await call(env,'detail',{id});if(!detail.ok)return detail;const order=await detail.json();if(order.version!==(await issued.json()).version)return fail(409,'Order changed. Preview again.');return Response.json({...proofUpdateEmail(order,token),proofToken:token});}
