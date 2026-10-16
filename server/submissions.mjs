import {requestReference} from '../src/request-reference.mjs';
import {orderRecord} from './order-record.mjs';
import {boundedBody,cookie,sameOrigin,constantEqual,random,signToken,verifyToken} from './auth.mjs';
import {MAX_BODY,validateContact,validateOrder,orderEmails,artworkManifest,fingerprintPayload} from './submission-model.mjs';
import {privateUpload,initArtwork,verifyArtworkGrant,completeArtwork} from './artwork-api.mjs';
const enc=new TextEncoder();
const fail=(status,message)=>Response.json({error:message},{status});
const ready=(env,kind)=>env.SUBMISSIONS_ENABLED==='true'&&(kind==='contact'?env.W3FORMS_ACCESS_KEY:env.RESEND_API_KEY&&env.CATALOGUE)&&env.TURNSTILE_SECRET_KEY&&env.TURNSTILE_SITE_KEY&&/^[a-f0-9]{64}$/.test(env.SESSION_SECRET||'')&&env.AUTH;
async function digest(value,secret){const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,enc.encode(value))),b=>b.toString(16).padStart(2,'0')).join('');}
async function state(env,path,body){const r=await env.AUTH.fetch('https://auth.internal/submissions/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!r.ok)throw new Error('Unavailable');return r.json();}
async function mail(payload,id,env,network){const r=await network('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':id},body:JSON.stringify(payload),signal:AbortSignal.timeout(20000)});if(!r.ok)throw new Error('Email unavailable');const result=await r.json();if(typeof result.id!=='string')throw new Error('Email unavailable');}
export async function submissions(request,env,network=fetch){
 const url=new URL(request.url),name='__Host-cv-form',kind=url.pathname==='/api/contact'||url.pathname==='/api/forms'&&url.searchParams.get('kind')==='contact'?'contact':'order';
 if(!['/api/forms','/api/contact','/api/order-request','/api/artwork/init','/api/artwork/upload'].includes(url.pathname))return fail(404,'Not found');
 if(url.hostname!=='customvibe.co.za')return fail(403,'Forbidden');
 if(url.pathname==='/api/forms'){
  if(request.method!=='GET')return fail(405,'Method not allowed');
  if(!ready(env,kind))return Response.json({available:false,paymentStatus:'coming-soon'});
  let token=cookie(request,name),session=await verifyToken(token,env.SESSION_SECRET,'form');
  if(!session){session={scope:'form',jti:random(),csrf:random(),exp:Math.floor(Date.now()/1000)+3600};token=await signToken(session,env.SESSION_SECRET);}
  const r=Response.json({available:true,csrf:session.csrf,siteKey:env.TURNSTILE_SITE_KEY,paymentStatus:'coming-soon',maxEncodedArtwork:2000000,orderRecords:kind==='order'&&env.ORDER_RECORDS_ENABLED==='true',artworkStorage:kind==='order'&&env.ARTWORK_STORAGE_ENABLED==='true'});
  r.headers.set('Set-Cookie',`${name}=${token}; Path=/; Max-Age=${Math.max(0,session.exp-Math.floor(Date.now()/1000))}; HttpOnly; Secure; SameSite=Lax`);return r;
 }
 if(request.method!=='POST')return fail(405,'Method not allowed');
 if(!sameOrigin(request)||(url.pathname!=='/api/artwork/upload'&&!request.headers.get('content-type')?.startsWith('application/json')))return fail(403,'Forbidden');
 if(!ready(env,kind))return fail(503,'Sending is not ready yet. Your draft has not been sent.');
 try{
  const session=await verifyToken(cookie(request,name),env.SESSION_SECRET,'form');
  if(!session||!await constantEqual(request.headers.get('X-CSRF-Token')||'',session.csrf))return fail(403,'Refresh the page before sending. Your security check has expired.');
  const privateArtwork=kind==='order'&&env.ARTWORK_STORAGE_ENABLED==='true';
  if(url.pathname==='/api/artwork/upload')return privateArtwork?privateUpload(request,env,session):fail(503,'Private uploads are not enabled.');
  if(url.pathname==='/api/artwork/init'&&!privateArtwork)return fail(503,'Private uploads are not enabled.');
  let body;try{body=JSON.parse(await boundedBody(request,url.pathname==='/api/contact'?15000:privateArtwork?150000:MAX_BODY))}catch{return fail(400,'The request is invalid or too large. Check the artwork limits and try again.');}
  const finishing=privateArtwork&&url.pathname==='/api/order-request';
  if(!body||typeof body!=='object'||body.website||(!finishing&&(typeof body.turnstile!=='string'||body.turnstile.length>2048)))return fail(400,'Please complete the security check.');
  const ip=request.headers.get('CF-Connecting-IP');if(!ip)return fail(503,'Sending is temporarily unavailable. Please keep your draft.');
  if(!finishing){
  const verification=await network('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({secret:env.TURNSTILE_SECRET_KEY,response:body.turnstile,remoteip:ip}),signal:AbortSignal.timeout(10000)});
  if(!verification.ok)return fail(503,'The security check is unavailable. Please try again.');const challenge=await verification.json();
  if(!challenge.success||challenge.hostname!==url.hostname||challenge.action!==kind)return fail(403,'Please complete a fresh security check and try again.');
  }
  let submission;try{
   if(kind==='contact')submission=validateContact(body.payload);
   else{const r=await env.CATALOGUE.fetch('https://catalogue.internal/content.json');if(!r.ok)throw new Error('Unavailable');submission=validateOrder(body.payload,await r.json(),privateArtwork);}
  }catch{return fail(400,'Check your details, products and artwork. Requests allow up to 100 magnets. Check the artwork file limits.');}
  if(privateArtwork){
   if(url.pathname==='/api/artwork/init')return initArtwork(env,session,submission,ip,body.resume);
   const grant=await verifyArtworkGrant(body.grant,env,session,submission);if(!grant)return fail(403,'Refresh the security check and retry this same request.');
   const completed=await completeArtwork(env,grant,submission);if(!completed.ok)return completed;
  }
  const id=await digest(kind+':'+submission.id,env.SESSION_SECRET),fingerprint=await digest('payload:'+fingerprintPayload(submission),env.SESSION_SECRET),key=await digest('forms-ip:'+ip,env.SESSION_SECRET);
  const permit=await state(env,'reserve',{id,fingerprint,key,kind,createdAt:submission.createdAt});
  if(permit.expired)return fail(410,kind==='contact'?'This message is too old to send. Email hello@customvibe.co.za with the address you used and approximate submission time before trying again.':'This draft is too old to send as a new request. Contact CustomVibe with its reference before starting again.');
  if(permit.conflict)return fail(409,kind==='contact'?'This message changed. Email hello@customvibe.co.za with the address you used and approximate submission time before trying again.':'This request changed. Contact us with your reference before sending it again.');
  if(!permit.allowed)return fail(429,'The sending limit has been reached. Keep your draft and try again later.');
  if(kind==='contact'){
   const uncertain=()=>Response.json({error:'We could not confirm your message. Email hello@customvibe.co.za with the address you used and approximate submission time so we can check before you send it again.',manualReview:true,reference:submission.id},{status:503});
   if(!permit.ownerSent){
    // W3Forms has no documented durable idempotency contract. Claim once before
    // calling it; ambiguous outcomes require an inbox/dashboard check, not resend.
    try{
     const claim=await state(env,'claim-contact',{id});
     if(!claim.claimed&&!claim.ownerSent)return uncertain();
     if(claim.claimed){
      const response=await network('https://api.w3forms.com/submit',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json',Origin:'https://customvibe.co.za'},body:JSON.stringify({access_key:env.W3FORMS_ACCESS_KEY,name:submission.name,email:submission.email,message:submission.message,reference:submission.id,subject:'CustomVibe contact message',from_name:'CustomVibe website',company_website:''}),signal:AbortSignal.timeout(20000)});
      if(!response.ok||(await response.json()).success!==true)return uncertain();
      await state(env,'mark',{id,stage:'owner_sent'});
     }
    }catch{return uncertain();}
   }
   return Response.json({ok:true,reference:submission.id,status:'message-sent',receiptSent:null});
  }
  const recordEnabled=env.ORDER_RECORDS_ENABLED==='true';
  const recordCall=async(path,body)=>{const r=await env.AUTH.fetch('https://auth.internal/orders/'+path,{method:'POST',body:JSON.stringify({id:submission.id,...body})});if(!r.ok)throw Object.assign(Error('Order record unavailable'),{status:r.status});return r.json()};
  if(recordEnabled){try{await recordCall('create',{fingerprint,snapshot:orderRecord(submission,privateArtwork),privateArtwork});}catch(error){if(error.status===409)return fail(409,'This request reference needs review. Keep this draft and contact CustomVibe with its reference before sending again.');throw error;}}
  const emails=orderEmails(submission,privateArtwork);
  if(recordEnabled&&privateArtwork){for(const field of ['text','html'])emails.owner[field]=emails.owner[field].replace('/artwork?request=','/orders?order=');}

  if(!permit.ownerSent){await mail(emails.owner,`cv-${kind}-${submission.id}-owner`,env,network);await state(env,'mark',{id,stage:'owner_sent'});}
  let receiptSent=permit.receiptSent;
  if(kind==='order'&&!receiptSent){try{await mail(emails.customer,`cv-${kind}-${submission.id}-customer`,env,network);await state(env,'mark',{id,stage:'receipt_sent'});receiptSent=true;}catch{receiptSent=false;}}
  if(recordEnabled){await recordCall('delivery',{stage:'owner_sent'});if(receiptSent)await recordCall('delivery',{stage:'receipt_sent'});}
  return Response.json({ok:true,reference:requestReference(submission),status:kind==='order'?'unpaid-request':'message-sent',receiptSent:kind==='order'?receiptSent:null});
 }catch{return fail(503,'We could not confirm sending. Retry this same request to avoid duplicates. Keep this tab open.');}
}
