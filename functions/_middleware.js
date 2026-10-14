import {gate,secure,unavailable} from '../server/auth.mjs';
export async function onRequest(context){const {request,env}=context;try{const url=new URL(request.url);if(url.protocol!=='https:'||url.hostname==='www.customvibe.co.za'){url.protocol='https:';if(url.hostname==='www.customvibe.co.za')url.hostname='customvibe.co.za';return secure(Response.redirect(url.toString(),308))}
 const auth=await gate(request,env,'site');if(auth.response)return secure(auth.response,{privateResponse:url.pathname!=='/robots.txt'});
 if(/^\/(?:api|admin|internal)(?:\/|$)/.test(url.pathname)||/(?:^|\/)(?:\.git|\.env|\.dev.vars|node_modules|src|server|backup)(?:[/.]|$)/i.test(url.pathname)||/\.(?:map|bak|sql|log)$/.test(url.pathname))return secure(new Response('Not found',{status:404}));
 if(!['GET','HEAD'].includes(request.method))return secure(new Response('Method not allowed',{status:405}));
 if(url.pathname==='/content.json'&&env.CATALOGUE){const r=await env.CATALOGUE.fetch('https://catalogue.internal/content.json');if(!r.ok)return secure(unavailable());return secure(r,{privateResponse:env.SITE_GATE_ENABLED!=='false'})}
 return secure(await context.next(),{privateResponse:env.SITE_GATE_ENABLED!=='false'});
 }catch{return secure(unavailable())}}
