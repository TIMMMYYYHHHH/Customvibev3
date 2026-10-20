import {Webhook} from 'svix';
import {recipientBinding} from './mail-recipient.mjs';
import {validProviderMessageId} from './mail-receipt.mjs';

const MAX_BODY=32768;
const TYPES=new Set(['email.sent','email.delivery_delayed','email.delivered','email.bounced','email.failed','email.suppressed','email.complained']);
const DISPOSITIONS=new Set(['applied','duplicate','ignored']);
const REASONS=new Set(['receipt-unavailable','binding-unavailable','event-conflict','snapshot-unavailable','observation-unavailable','original-expiry','duplicate-event','observation-recorded']);
const reply=status=>status===204?new Response(null,{status,headers:{'Cache-Control':'no-store'}}):Response.json(status===200?{ok:true}:{error:status===503?'Unavailable':'Invalid request'},{status,headers:{'Cache-Control':'no-store'}});
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);

// A fatal UTF-8 decode with BOM preservation gives the verifier the original
// valid UTF-8 bytes when it re-encodes the string. Never parse/re-serialize first.
async function boundedText(body,max){
 const reader=body?.getReader();if(!reader)return '';
 const chunks=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>max){await reader.cancel();return null}chunks.push(value)}}finally{reader.releaseLock()}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength}
 return new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes);
}

function eventTime(value,checkedAt){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/.test(value))return null;
 const ms=Date.parse(value);if(!Number.isFinite(ms))return null;
 // Date.parse normalizes impossible calendar dates, so compare every component.
 if(new Date(ms).toISOString().slice(0,19)!==value.slice(0,19))return null;
 const seconds=Math.floor(ms/1000);return Number.isSafeInteger(seconds)&&seconds>0&&seconds<=checkedAt?seconds:null;
}

async function projection(envelope,headers){
 const checkedAt=Math.floor(Date.now()/1000);
 if(!object(envelope)||!TYPES.has(envelope.type)||!object(envelope.data)||!validProviderMessageId(envelope.data.email_id))return null;
 const occurredAt=eventTime(envelope.created_at,checkedAt);if(occurredAt===null)return null;
 const binding=await recipientBinding(envelope.data.email_id,envelope.data);if(!binding)return null;
 // Only this closed projection survives the signature/validation boundary.
 return {providerMessageId:envelope.data.email_id,source:'webhook',type:envelope.type,eventId:headers['svix-id'],occurredAt,checkedAt,...binding};
}

export async function mailWebhook(request,env){
 const url=new URL(request.url);
 if(url.origin!=='https://customvibe.co.za')return reply(403);
 if(request.method!=='POST')return reply(405);
 // Deliberately no local/preview fallback. Enabling requires a later reviewed
 // production configuration and endpoint-specific server secret.
 if(env.MAIL_EVENTS_ENABLED!=='true'||env.MAIL_EVENTS_ENVIRONMENT!=='production'||env.CF_PAGES!=='1'||env.CF_PAGES_BRANCH!=='main'||typeof env.AUTH?.fetch!=='function')return reply(503);
 const secret=env.RESEND_WEBHOOK_SECRET;
 if(typeof secret!=='string'||!/^whsec_[A-Za-z0-9+/]{22,172}={0,2}$/.test(secret))return reply(503);
 let verifier;try{verifier=new Webhook(secret)}catch{return reply(503)}
 const contentType=request.headers.get('Content-Type')||'';
 if(!/^application\/json(?:\s*;\s*charset\s*=\s*(?:utf-8|"utf-8"))?\s*$/i.test(contentType))return reply(415);
 const length=request.headers.get('Content-Length');
 if(length!==null){if(!/^\d{1,10}$/.test(length))return reply(400);if(Number(length)>MAX_BODY)return reply(413)}
 const headers=Object.fromEntries(['svix-id','svix-timestamp','svix-signature'].map(name=>[name,request.headers.get(name)||'']));
 if(!validProviderMessageId(headers['svix-id'])||!(/^[1-9]\d{0,15}$/).test(headers['svix-timestamp'])||!Number.isSafeInteger(Number(headers['svix-timestamp']))||headers['svix-signature'].length>2048||!headers['svix-signature']||/[^\x20-\x7e]/.test(headers['svix-signature']))return reply(400);
 let raw;
 try{
  raw=await boundedText(request.body,MAX_BODY);if(raw===null)return reply(413);
  // Svix 2.8.0 verifies with jsonParse:false. Only a successful return proves
  // signature and freshness authentication, including for malformed JSON.
  verifier.verify(raw,headers);
 }catch{return reply(400)}
 let envelope;try{envelope=JSON.parse(raw)}catch{return reply(204)}
 let minimized;try{minimized=await projection(envelope,headers)}catch{return reply(503)}
 if(!minimized)return reply(204);
 try{
  // Service binding only. Do not fall back to global fetch or acknowledge work
  // in the background: an unconfirmed commit must remain retryable by provider.
  // Workers Fetcher rejects redirect:'error'. Return redirects without following
  // them; the exact 200 check below keeps every redirect retryable and private.
  const response=await env.AUTH.fetch('https://auth.internal/mail-delivery/observe',{method:'POST',redirect:'manual',headers:{'Content-Type':'application/json'},body:JSON.stringify(minimized)});
  if(response.status!==200)return reply(503);
  const text=await boundedText(response.body,1024);if(text===null)return reply(503);
  const result=JSON.parse(text);
  if(!object(result)||Object.keys(result).length!==3||result.ok!==true||!DISPOSITIONS.has(result.disposition)||!REASONS.has(result.reason))return reply(503);
  return reply(result.disposition==='ignored'?204:200);
 }catch{return reply(503)}
}
