import {artworkHash} from '../src/artwork-policy.mjs';
import {signToken,verifyToken} from './auth.mjs';
import {artworkManifest} from './submission-model.mjs';
const encoder=new TextEncoder();
const hex=bytes=>Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
async function hash(value,secret){const key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return hex(await crypto.subtle.sign('HMAC',key,encoder.encode(value)))}
const fail=(status,error)=>Response.json({error},{status});
const call=(env,path,body)=>env.AUTH.fetch('https://auth.internal/artwork/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
const owner=(env,session)=>hash('artwork-owner:'+session.jti,env.SESSION_SECRET);
export async function initArtwork(env,session,submission,ip,resumeToken){
 const fingerprint=await hash(JSON.stringify(submission),env.SESSION_SECRET);let artworkOwner=await owner(env,session);
 if(resumeToken){const recovery=await verifyToken(resumeToken,env.SESSION_SECRET,'artwork-resume');if(!recovery||recovery.id!==submission.id||recovery.hash!==fingerprint||!artworkHash(recovery.owner))return fail(403,'This request recovery token is invalid or expired. Contact us with the reference before starting again.');artworkOwner=recovery.owner;}
 const response=await call(env,'init',{id:submission.id,owner:artworkOwner,key:await hash('artwork-ip:'+ip,env.SESSION_SECRET),files:artworkManifest(submission)});
 if(!response.ok)return response;
 const {expires}=await response.json();
 const grant=await signToken({scope:'artwork',jti:session.jti,csrf:session.csrf,id:submission.id,owner:artworkOwner,hash:fingerprint,exp:session.exp},env.SESSION_SECRET);
 const resume=resumeToken||await signToken({scope:'artwork-resume',jti:session.jti,csrf:session.csrf,id:submission.id,owner:artworkOwner,hash:fingerprint,exp:expires},env.SESSION_SECRET);
 return Response.json({ok:true,grant,resume,expires});
}
export async function verifyArtworkGrant(token,env,session,submission){
 const grant=await verifyToken(token,env.SESSION_SECRET,'artwork');
 if(!grant||grant.jti!==session.jti||grant.csrf!==session.csrf||!artworkHash(grant.owner))return null;
 if(submission&&(grant.id!==submission.id||grant.hash!==await hash(JSON.stringify(submission),env.SESSION_SECRET)))return null;
 return grant;
}
export async function privateUpload(request,env,session){
 const grant=await verifyArtworkGrant(request.headers.get('X-Artwork-Grant'),env,session);
 if(!grant)return fail(403,'Refresh the security check and retry this same request.');
 // The trusted service chooses the object key. Never pass through caller owner or ID headers.
 return env.AUTH.fetch('https://auth.internal/artwork/upload',{method:'POST',headers:{'Content-Type':request.headers.get('content-type')||'','X-Artwork-Id':grant.id,'X-Artwork-Owner':grant.owner,'X-Artwork-Index':request.headers.get('X-Artwork-Index')||''},body:request.body,duplex:'half'});
}
export function completeArtwork(env,grant,submission){return call(env,'complete',{id:submission.id,owner:grant.owner,files:artworkManifest(submission)})}
