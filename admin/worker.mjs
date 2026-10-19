import manifest from '../dist/admin/.vite/manifest.json' with {type:'json'};
import {routeStyleCatalogue,composeRouteStyles} from '../shared/route-styles.mjs';
import {previewPath} from '../src/seasons/preview-routing.mjs';
const routeStyles=routeStyleCatalogue(manifest,'admin/preview.html');
import {seasonsAPI} from '../server/seasons.mjs';
import {reportUnavailable} from '../server/availability.mjs';
import {ordersAPI} from './orders-api.mjs';
import {gate,secure,sameOrigin,constantEqual,boundedBody,unavailable} from '../server/auth.mjs';
import {readContent,saveContent,publicContent} from '../server/content.mjs';
import fallback from '../data/site-content.json' with {type:'json'};
export default {async fetch(request,env){let phase='admin_request';try{const url=new URL(request.url);if(url.protocol!=='https:')return secure(Response.redirect('https://'+url.host+url.pathname+url.search,308),{admin:true});// Only public brand files are available before sign-in, never application assets or data.
 if(['/favicon.png','/icon-180.png','/admin-brand/puzzle-logo-v2.png','/admin-brand/fonts.css','/admin-brand/fredoka.woff2','/admin-brand/dm-sans.woff2'].includes(url.pathname))return secure(['GET','HEAD'].includes(request.method)?await env.ASSETS.fetch(request):new Response('Method not allowed',{status:405}),{admin:true});
 const auth=await gate(request,env,'admin');if(auth.response)return secure(auth.response,{admin:true});const reply=r=>{const response=secure(r,{admin:true});
 // Only authenticated preview documents may be framed, and only by this same admin origin.
 if(['/themes','/themes.html'].includes(url.pathname))response.headers.set('Content-Security-Policy',response.headers.get('Content-Security-Policy').replace('frame-src https://www.openstreetmap.org',"frame-src 'self' https://www.openstreetmap.org"));
 if(['/preview','/preview.html'].includes(url.pathname)){response.headers.set('X-Frame-Options','SAMEORIGIN');response.headers.set('Content-Security-Policy',response.headers.get('Content-Security-Policy').replace("frame-ancestors 'none'","frame-ancestors 'self'").replace("form-action 'self'","form-action 'none'"));}
 return response};
 if(url.pathname==='/api/seasons')return reply(await seasonsAPI(request,env,auth.session));
 if(url.pathname==='/preview-content.json'&&request.method==='GET')return reply(Response.json(publicContent(await readContent(env.CONTENT_DB,fallback))));
 if(url.pathname==='/api/forms'&&request.method==='GET')return reply(Response.json({available:false,preview:true}));

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
 phase='admin_assets';
 if(['/preview','/preview.html'].includes(url.pathname)){
  const asset=await env.ASSETS.fetch(new Request(request,{method:'GET'}));
  if(!asset.ok||!asset.headers.get('content-type')?.includes('text/html'))return reply(request.method==='HEAD'?new Response(null,{status:asset.status,headers:asset.headers}):asset);
  const html=composeRouteStyles(await asset.text(),routeStyles,previewPath(url));
  const headers=new Headers(asset.headers);headers.delete('Content-Length');headers.delete('ETag');
  return reply(new Response(request.method==='HEAD'?null:html,{status:asset.status,headers}));
 }
 const target={'/artwork':'/','/orders':'/','/content':'/'}[url.pathname];return reply(await env.ASSETS.fetch(target?new Request(url.origin+target,request):request));
 }catch(error){reportUnavailable(phase,error);return secure(unavailable(),{admin:true})}}};
