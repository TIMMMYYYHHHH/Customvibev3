import {ordersAPI} from './orders-api.mjs';
import {gate,secure,sameOrigin,constantEqual,boundedBody,unavailable} from '../server/auth.mjs';
import {readContent,saveContent} from '../server/content.mjs';
import fallback from '../data/site-content.json' with {type:'json'};
export default {async fetch(request,env){try{const url=new URL(request.url);if(url.protocol!=='https:')return secure(Response.redirect('https://'+url.host+url.pathname+url.search,308),{admin:true});const auth=await gate(request,env,'admin');if(auth.response)return secure(auth.response,{admin:true});const reply=r=>secure(r,{admin:true});
 if(url.pathname==='/api/orders'||url.pathname.startsWith('/api/orders/'))return reply(await ordersAPI(request,env,auth.session));
 const artwork=url.pathname.match(/^\/api\/artwork\/([a-f0-9-]{36})(?:\/(\d{1,2}))?$/);
 if(artwork){if(request.method!=='GET')return reply(new Response('Method not allowed',{status:405}));return reply(await env.AUTH.fetch('https://auth.internal/artwork/'+(artwork[2]===undefined?'detail':'download'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:artwork[1],...(artwork[2]===undefined?{}:{index:Number(artwork[2])})})}));}
 if(url.pathname==='/api/session'&&request.method==='GET')return reply(Response.json({csrf:auth.session.csrf,expiresAt:auth.session.exp}));
 if(url.pathname==='/content.json'&&request.method==='GET')return reply(Response.json(await readContent(env.CONTENT_DB,fallback)));
 if(url.pathname==='/api/content'){
  if(request.method!=='PUT')return reply(new Response('Method not allowed',{status:405}));
  if(!sameOrigin(request)||!await constantEqual(request.headers.get('X-CSRF-Token')||'',auth.session.csrf))return reply(new Response('Forbidden',{status:403}));
  if(!request.headers.get('content-type')?.startsWith('application/json'))return reply(new Response('Unsupported media type',{status:415}));
  let input;try{input=JSON.parse(await boundedBody(request,1500000))}catch{return reply(Response.json({error:'Invalid or oversized content.'},{status:400}))}
  let result;try{result=await saveContent(env.CONTENT_DB,input,fallback)}catch{return reply(Response.json({error:'Could not save. Check image types, sizes and product fields.'},{status:400}))}
  return reply(result?Response.json(result):Response.json({error:'Content changed in another session. Reload before saving.'},{status:409}));
 }
 if(url.pathname.startsWith('/api/')||url.pathname.startsWith('/internal/')||url.pathname.includes('..')||/\.(?:map|sql|log|bak)$/.test(url.pathname))return reply(new Response('Not found',{status:404}));
 if(!['GET','HEAD'].includes(request.method))return reply(new Response('Method not allowed',{status:405}));
 return reply(await env.ASSETS.fetch(['/artwork','/orders','/content'].includes(url.pathname)?new Request(url.origin+'/',request):request));
 }catch{return secure(unavailable(),{admin:true})}}};
