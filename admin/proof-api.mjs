import {boundedBody,sameOrigin,constantEqual} from '../server/auth.mjs';
import {proofCall} from '../server/proof-api.mjs';
export async function adminProofAPI(request,env,session,id,action){
 const fail=(status,error)=>Response.json({error},{status});
 if(request.method!=='POST')return fail(405,'Use a protected action.');
 if(!sameOrigin(request)||!await constantEqual(request.headers.get('X-CSRF-Token')||'',session.csrf))return fail(403,'Forbidden.');
 if(action==='upload')return env.AUTH.fetch('https://auth.internal/artwork/upload',{method:'POST',headers:{'Content-Type':'image/jpeg','X-Artwork-Id':request.headers.get('X-Artwork-Id')||'','X-Artwork-Owner':request.headers.get('X-Artwork-Owner')||'','X-Artwork-Index':request.headers.get('X-Artwork-Index')||''},body:request.body,duplex:'half'});
 let b;try{b=JSON.parse(await boundedBody(request,40000))}catch{return fail(400,'Invalid proof details.');}
 if(action==='publish'&&b.requestId!==id){const complete=await env.AUTH.fetch('https://auth.internal/artwork/complete',{method:'POST',body:JSON.stringify({id:b.requestId,owner:b.owner})});if(!complete.ok)return complete;}
 if(!['seed','prepare','publish','revoke'].includes(action))return fail(404,'Not found.');
 return proofCall(env,action,{...b,id});
}
