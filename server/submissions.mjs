import {boundedBody,cookie,sameOrigin,constantEqual,random,signToken,verifyToken} from './auth.mjs';
import {MAX_BODY,validateContact,validateOrder,contactEmail,orderEmails} from './submission-model.mjs';
const enc=new TextEncoder();
const fail=(status,message)=>Response.json({error:message},{status});
const ready=env=>env.SUBMISSIONS_ENABLED==='true'&&env.RESEND_API_KEY&&env.TURNSTILE_SECRET_KEY&&env.TURNSTILE_SITE_KEY&&/^[a-f0-9]{64}$/.test(env.SESSION_SECRET||'')&&env.AUTH&&env.CATALOGUE;
async function digest(value,secret){const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,enc.encode(value))),b=>b.toString(16).padStart(2,'0')).join('');}
async function state(env,path,body){const r=await env.AUTH.fetch('https://auth.internal/submissions/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!r.ok)throw new Error('Unavailable');return r.json();}
async function mail(payload,id,env,network){const r=await network('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':id},body:JSON.stringify(payload),signal:AbortSignal.timeout(20000)});if(!r.ok)throw new Error('Email unavailable');const result=await r.json();if(typeof result.id!=='string')throw new Error('Email unavailable');}
export async function submissions(request,env,network=fetch){
 const url=new URL(request.url),name='__Host-cv-form';
 if(!['/api/forms','/api/contact','/api/order-request'].includes(url.pathname))return fail(404,'Not found');
 if(url.hostname!=='customvibe.co.za')return fail(403,'Forbidden');
 if(url.pathname==='/api/forms'){
  if(request.method!=='GET')return fail(405,'Method not allowed');
  if(!ready(env))return Response.json({available:false,paymentStatus:'coming-soon'});
  let token=cookie(request,name),session=await verifyToken(token,env.SESSION_SECRET,'form');
  if(!session){session={scope:'form',jti:random(),csrf:random(),exp:Math.floor(Date.now()/1000)+3600};token=await signToken(session,env.SESSION_SECRET);}
  const r=Response.json({available:true,csrf:session.csrf,siteKey:env.TURNSTILE_SITE_KEY,paymentStatus:'coming-soon',maxEncodedArtwork:2000000});
  r.headers.set('Set-Cookie',`${name}=${token}; Path=/; Max-Age=${Math.max(0,session.exp-Math.floor(Date.now()/1000))}; HttpOnly; Secure; SameSite=Lax`);return r;
 }
 if(request.method!=='POST')return fail(405,'Method not allowed');
 if(!sameOrigin(request)||!request.headers.get('content-type')?.startsWith('application/json'))return fail(403,'Forbidden');
 if(!ready(env))return fail(503,'Sending is not ready yet. Your draft has not been sent.');
 try{
  const session=await verifyToken(cookie(request,name),env.SESSION_SECRET,'form');
  if(!session||!await constantEqual(request.headers.get('X-CSRF-Token')||'',session.csrf))return fail(403,'Refresh the page before sending. Your security check has expired.');
  let body;try{body=JSON.parse(await boundedBody(request,url.pathname==='/api/contact'?15000:MAX_BODY))}catch{return fail(400,'The request is invalid or too large. Keep the artwork below 1.5 MB.');}
  if(!body||typeof body!=='object'||body.website||typeof body.turnstile!=='string'||body.turnstile.length>2048)return fail(400,'Please complete the security check.');
  const kind=url.pathname==='/api/contact'?'contact':'order';
  const ip=request.headers.get('CF-Connecting-IP');if(!ip)return fail(503,'Sending is temporarily unavailable. Please keep your draft.');
  const verification=await network('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({secret:env.TURNSTILE_SECRET_KEY,response:body.turnstile,remoteip:ip}),signal:AbortSignal.timeout(10000)});
  if(!verification.ok)return fail(503,'The security check is unavailable. Please try again.');const challenge=await verification.json();
  if(!challenge.success||challenge.hostname!==url.hostname||challenge.action!==kind)return fail(403,'Please complete a fresh security check and try again.');
  let submission;try{
   if(kind==='contact')submission=validateContact(body.payload);
   else{const r=await env.CATALOGUE.fetch('https://catalogue.internal/content.json');if(!r.ok)throw new Error('Unavailable');submission=validateOrder(body.payload,await r.json());}
  }catch{return fail(400,'Check your details, products and artwork. Requests allow up to 100 magnets and 1.5 MB of JPEG designs.');}
  const id=await digest(kind+':'+submission.id,env.SESSION_SECRET),fingerprint=await digest('payload:'+JSON.stringify(submission),env.SESSION_SECRET),key=await digest('forms-ip:'+ip,env.SESSION_SECRET);
  const permit=await state(env,'reserve',{id,fingerprint,key,kind,createdAt:submission.createdAt});
  if(permit.expired)return fail(410,'This draft is too old to send as a new request. Contact CustomVibe with its reference before starting again.');
  if(permit.conflict)return fail(409,'This request changed. Contact us with your reference before sending it again.');
  if(!permit.allowed)return fail(429,'The sending limit has been reached. Keep your draft and try again later.');
  const emails=kind==='order'?orderEmails(submission):{owner:contactEmail(submission)};
  if(!permit.ownerSent){await mail(emails.owner,`cv-${kind}-${submission.id}-owner`,env,network);await state(env,'mark',{id,stage:'owner_sent'});}
  let receiptSent=permit.receiptSent;
  if(kind==='order'&&!receiptSent){try{await mail(emails.customer,`cv-${kind}-${submission.id}-customer`,env,network);await state(env,'mark',{id,stage:'receipt_sent'});receiptSent=true;}catch{receiptSent=false;}}
  return Response.json({ok:true,reference:kind==='order'?'CV-'+submission.id:submission.id,status:kind==='order'?'unpaid-request':'message-sent',receiptSent:kind==='order'?receiptSent:null});
 }catch{return fail(503,'We could not confirm sending. Retry this same request to avoid duplicates. Keep this tab open.');}
}
