import {boundedBody,sameOrigin,constantEqual,signToken,verifyToken} from '../server/auth.mjs';
const now=()=>Math.floor(Date.now()/1000),scope='admin-order-privacy';
const fail=(status,error)=>Response.json({error},{status});
const fields=(b,keys)=>b!==null&&typeof b==='object'&&!Array.isArray(b)&&Object.keys(b).length===keys.length&&keys.every(k=>Object.hasOwn(b,k));
const uuid=b=>typeof b==='string'&&/^[a-f0-9-]{36}$/.test(b);
const version=b=>Number.isSafeInteger(b)&&b>=0;
function contact(b){
 if(!fields(b,['name','email','phone']))throw Error('Invalid');
 const line=(v,max)=>{if(typeof v!=='string'||!v.trim()||v.length>max||/[\x00-\x1f\x7f]/.test(v))throw Error('Invalid');return v.trim()};
 const c={name:line(b.name,100),email:line(b.email,254),phone:line(b.phone,30)};
 if(!/^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(c.email)||!/^\+?[\d ()-]{7,30}$/.test(c.phone)||c.phone.replace(/\D/g,'').length<7||c.phone.replace(/\D/g,'').length>15)throw Error('Invalid');return c;
}
const call=(env,action,b)=>env.AUTH.fetch('https://auth.internal/privacy/'+action,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)});
export async function orderPrivacyAPI(request,env,session,id,action){
 if(!session||session.scope!=='admin'||!Number.isSafeInteger(session.exp)||session.exp<=now()||!/^[a-f0-9]{64}$/.test(session.jti||'')||!/^[a-f0-9]{64}$/.test(session.csrf||''))return fail(401,'Sign in to continue.');
 if(request.method!=='POST')return fail(405,'Use a protected action.');
 if(!sameOrigin(request)||!await constantEqual(request.headers.get('X-CSRF-Token')||'',session.csrf))return fail(403,'Forbidden.');
 if(['correct','erase'].includes(action)&&new URL(request.url).hostname!=='admin.customvibe.co.za')return fail(403,'Privacy changes are unavailable on this host.');
 if(!request.headers.get('content-type')?.startsWith('application/json'))return fail(415,'Use JSON details.');
 const schemas={'preview-correction':['version','contact'],'preview-erasure':['version'],correct:['previewToken'],erase:['previewToken','confirmation','acknowledged'],status:['operationId']};
 if(!Object.hasOwn(schemas,action))return fail(404,'Not found.');
 let b;try{b=JSON.parse(await boundedBody(request,8192));if(!fields(b,schemas[action]))throw Error('Invalid');}catch{return fail(400,'Invalid privacy details.');}
 if(action==='status'){if(!uuid(b.operationId))return fail(400,'Invalid privacy details.');return call(env,action,{id,operationId:b.operationId});}
 if(action.startsWith('preview-')){
  let proposed;try{if(!version(b.version))throw Error('Invalid');if(action==='preview-correction')proposed=contact(b.contact);}catch{return fail(400,'Check the name, email and phone details.');}
  const response=await call(env,action,{id,version:b.version,...(proposed?{contact:proposed}:{})});if(!response.ok)return response;
  const preview=await response.json(),correction=action==='preview-correction',operationId=preview.operationId||crypto.randomUUID();
  const claims={scope,jti:session.jti,csrf:session.csrf,exp:Math.min(now()+600,session.exp),action:correction?'correct':'erase',id,version:preview.version,digest:preview.digest,operationId,...(correction?{contact:contact(preview.contact.after)}:{})};
  return Response.json({...preview,operationId,previewToken:await signToken(claims,env.ADMIN_SESSION_SECRET)});
 }
 if(typeof b.previewToken!=='string'||b.previewToken.length>2048)return fail(400,'Invalid privacy preview.');
 const claims=await verifyToken(b.previewToken,env.ADMIN_SESSION_SECRET,scope),keys=['scope','jti','csrf','exp','action','id','version','digest','operationId',...(action==='correct'?['contact']:[])];
 if(!claims||!fields(claims,keys)||claims.action!==action||claims.id!==id||!version(claims.version)||!uuid(claims.operationId)||!/^[a-f0-9]{64}$/.test(claims.digest||'')||claims.exp>Math.min(now()+600,session.exp)||!await constantEqual(claims.jti,session.jti)||!await constantEqual(claims.csrf,session.csrf))return fail(403,'This preview expired or changed. Read the current order and preview again.');
 let proposed;try{if(action==='correct'){proposed=contact(claims.contact);if(JSON.stringify(proposed)!==JSON.stringify(claims.contact))throw Error('Invalid');}else if(typeof b.confirmation!=='string'||b.confirmation.length>100||b.acknowledged!==true)throw Error('Invalid');}catch{return fail(400,'Confirm the selected order and acknowledgement.');}
 return call(env,action,{id,version:claims.version,expectedDigest:claims.digest,operationId:claims.operationId,...(action==='correct'?{contact:proposed}:{confirmation:b.confirmation,acknowledged:true})});
}
