// Synthetic isolated test entry only. All application routes use the actual
// dispatcher; this private fixture path calls only the actual cleanup function.
import security from '../../security/index.mjs';
import {cleanMailDelivery} from '../../security/mail-delivery.mjs';
let networkAttempts=0;
globalThis.fetch=async()=>{networkAttempts++;throw Error('External network forbidden in isolated security Worker')};
export default {async fetch(request,env){
 if(new URL(request.url).pathname==='/_fixture/cleanup'){await cleanMailDelivery(env);return new Response(null,{status:204})}
 if(new URL(request.url).pathname==='/_fixture/stats')return Response.json({networkAttempts});
 if(request.headers.get('X-Synthetic-Redirect')==='yes')return Response.redirect('https://external.invalid/private-sentinel',302);
 return security.fetch(request,env);
}};
