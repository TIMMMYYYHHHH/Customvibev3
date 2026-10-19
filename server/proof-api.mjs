import {random,signToken,verifyToken,cookie,sameOrigin,constantEqual,boundedBody} from './auth.mjs';
export const proofCall=(env,path,body)=>env.AUTH.fetch('https://auth.internal/proofs/'+path,{method:'POST',body:JSON.stringify(body)});
export const proofHash=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');
const fail=(status,error)=>Response.json({error},{status});
export async function proofAPI(request,env){
 const url=new URL(request.url);
 // Preview bindings may point at production storage; only the live public host can use customer proofs.
 if(url.hostname!=='customvibe.co.za')return fail(403,'Private proof review is only available on the live website.');
 const path=url.pathname,secret=env.SESSION_SECRET;
 if(!/^[a-f0-9]{64}$/i.test(secret||''))return fail(503,'Review is temporarily unavailable.');
 if(request.method==='POST'&&path==='/api/proof/session'){
  if(!sameOrigin(request))return fail(403,'Open your review link on this website.');
  let b;try{b=JSON.parse(await boundedBody(request,1024))}catch{return fail(400,'Invalid review link.')}
  if(!/^[a-f0-9]{64}$/.test(b.token||''))return fail(403,'Invalid review link.');
  const jti=random(),r=await proofCall(env,'exchange',{tokenHash:await proofHash(b.token),sessionId:await proofHash(jti)});if(!r.ok)return r;
  const proof=await r.json(),csrf=random(),token=await signToken({scope:'proof',jti,csrf,exp:proof.expires},secret);
  return Response.json({csrf},{headers:{'Set-Cookie':`__Host-cv-proof=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${Math.max(0,proof.expires-Math.floor(Date.now()/1000))}`}});
 }
 const session=await verifyToken(cookie(request,'__Host-cv-proof'),secret,'proof');if(!session)return fail(403,'Reopen the latest private review link from your email.');
 const sessionId=await proofHash(session.jti);
 if(request.method==='GET'&&path==='/api/proof'){const r=await proofCall(env,'read',{sessionId});return r.ok?Response.json({...await r.json(),csrf:session.csrf}):r;}
 const file=path.match(/^\/api\/proof\/files\/(\d{1,2})$/);if(request.method==='GET'&&file)return proofCall(env,'download',{sessionId,slot:Number(file[1])});
 if(request.method!=='POST'||!['/api/proof/approve','/api/proof/changes'].includes(path))return fail(404,'Not found.');
 if(!sameOrigin(request)||!await constantEqual(request.headers.get('X-CSRF-Token')||'',session.csrf))return fail(403,'Refresh your review before responding.');
 let b;try{b=JSON.parse(await boundedBody(request,6000))}catch{return fail(400,'Check your response.')}
 if(path.endsWith('/approve')&&b.confirmed!==true)return fail(400,'Confirm you have checked every design and quantity.');
 return proofCall(env,path.endsWith('/approve')?'approve':'changes',{sessionId,revision:b.revision,digest:b.digest,message:b.message});
}
