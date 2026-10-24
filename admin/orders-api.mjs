import {orderPrivacyAPI} from './order-privacy-api.mjs';
import {adminProofAPI} from './proof-api.mjs';
import {previewOrderUpdate,previewProofUpdate,previewRetryUpdate} from './order-mail.mjs';
import {sendOrderUpdate} from './order-mail.mjs';
import {boundedBody,sameOrigin,constantEqual} from '../server/auth.mjs';
export const orderCall=(env,path,body)=>env.AUTH.fetch('https://auth.internal/orders/'+path,{method:'POST',body:JSON.stringify(body)});
export async function ordersAPI(request,env,session){
 const url=new URL(request.url),privacyMatch=url.pathname.match(/^\/api\/orders\/([a-f0-9-]{36})\/privacy\/(preview-correction|correct|preview-erasure|erase|status)$/);if(privacyMatch)return orderPrivacyAPI(request,env,session,privacyMatch[1],privacyMatch[2]);const proofMatch=url.pathname.match(/^\/api\/orders\/([a-f0-9-]{36})\/proof\/(seed|prepare|upload|publish|revoke)$/);if(proofMatch)return adminProofAPI(request,env,session,proofMatch[1],proofMatch[2]);const match=url.pathname.match(/^\/api\/orders(?:\/([a-f0-9-]{36})(?:\/(status|preview|preview-retry|send))?)?$/);
 if(!match)return Response.json({error:'Not found.'},{status:404});
 if(request.method==='GET'&&match[2]==='preview'){const r=await orderCall(env,'detail',{id:match[1]});if(!r.ok)return r;try{return Response.json(await previewOrderUpdate(env,match[1],await r.json()));}catch{return Response.json({error:'Order or attempt changed. Preview again.'},{status:409});}}
 if(request.method==='GET'&&!match[2])return orderCall(env,match[1]?'detail':'list',match[1]?{id:match[1]}:Object.fromEntries(['before','q','stage','fulfilledBefore'].filter(key=>url.searchParams.has(key)).map(key=>[key,url.searchParams.get(key)])));
 if(request.method!=='POST'||!['status','send','preview','preview-retry'].includes(match[2]))return new Response(null,{status:405});
 if(!sameOrigin(request)||!await constantEqual(request.headers.get('X-CSRF-Token')||'',session.csrf))return new Response('Forbidden',{status:403});
 if(!request.headers.get('content-type')?.startsWith('application/json'))return new Response(null,{status:415});
 let b;try{b=JSON.parse(await boundedBody(request,2048))}catch{return Response.json({error:'Invalid input.'},{status:400})}
 if(match[2]==='preview-retry')return previewRetryUpdate(env,match[1],b?.version);
 if(match[2]==='preview')return previewProofUpdate(env,match[1],b?.version);
 if(match[2]==='send'){if(url.hostname!=='admin.customvibe.co.za')return new Response('Sending disabled',{status:403});return sendOrderUpdate(env,match[1],b?.version,fetch,b?.proofToken,{retryAttempt:b?.retryAttempt,retryToken:b?.retryToken,contactRevision:b?.contactRevision});}
 return orderCall(env,'status',{id:match[1],status:b?.status,version:b?.version});
}
