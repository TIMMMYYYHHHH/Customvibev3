// Synthetic-only Worker fixture. Never deploy or bind this to production.
import {onRequest} from '../../functions/_middleware.js';
export default {async fetch(input){
 let networkAttempts=0,observations=[],logs=0;
 globalThis.fetch=async()=>{networkAttempts++;throw Error('External network disabled')};
 const prior={log:console.log,error:console.error,warn:console.warn};
 for(const name of Object.keys(prior))console[name]=()=>{logs++};
 try{
  const fixture=await input.json();
  const env={MAIL_EVENTS_ENABLED:'true',MAIL_EVENTS_ENVIRONMENT:'production',CF_PAGES:'1',CF_PAGES_BRANCH:'main',RESEND_WEBHOOK_SECRET:fixture.secret,...fixture.env,AUTH:{async fetch(url,options){
   if(url!=='https://auth.internal/mail-delivery/observe'||options.method!=='POST')throw Error('Unexpected service route');
   observations.push(JSON.parse(options.body));
   return Response.json({ok:true,disposition:'applied',reason:'observation-recorded'});
  }}};
  const request=new Request(fixture.url||'https://customvibe.co.za/api/mail-events/resend',{method:'POST',headers:fixture.headers,body:fixture.body});
  const response=await onRequest({request,env,next:()=>{throw Error('Unexpected next route')}});
  return Response.json({status:response.status,body:await response.text(),observations,networkAttempts,logs,cryptoAvailable:typeof crypto.subtle.digest==='function'});
 }finally{Object.assign(console,prior)}
}};
