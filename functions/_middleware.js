import {mapAPI} from '../server/map-api.mjs';
import {proofAPI} from '../server/proof-api.mjs';
import {gate,secure,unavailable,random} from '../server/auth.mjs';
import {renderDocument,sitemap} from '../server/render.mjs';
import {submissions} from '../server/submissions.mjs';
import {lockerAPI} from '../server/lockers.mjs';
export async function onRequest(context){const {request,env}=context;try{const url=new URL(request.url);if(url.protocol!=='https:'||url.hostname==='www.customvibe.co.za'){url.protocol='https:';if(url.hostname==='www.customvibe.co.za')url.hostname='customvibe.co.za';return secure(Response.redirect(url.toString(),308))}
 const auth=await gate(request,env,'site');if(auth.response){const response=secure(auth.response,{privateResponse:url.pathname!=='/robots.txt'});if(url.pathname==='/proof')response.headers.set('Referrer-Policy','no-referrer');return response;}
 if(auth.publicAsset)return secure(await context.next(),{privateResponse:false});
 if(url.pathname.startsWith('/api/map/'))return secure(await mapAPI(request,env));
 if(url.pathname==='/api/lockers')return secure(await lockerAPI(request,env));
 if(url.pathname.startsWith('/api/proof')){const response=secure(await proofAPI(request,env));response.headers.set('Referrer-Policy','no-referrer');return response;}
 if(['/api/forms','/api/contact','/api/order-request','/api/artwork/init','/api/artwork/upload'].includes(url.pathname))return secure(await submissions(request,env));
 if(/^\/(?:api|admin|internal)(?:\/|$)/.test(url.pathname)||/(?:^|\/)(?:\.git|\.env|\.dev.vars|node_modules|src|server|backup)(?:[/.]|$)/i.test(url.pathname)||/\.(?:map|bak|sql|log)$/.test(url.pathname))return secure(new Response('Not found',{status:404}));
 if(!['GET','HEAD'].includes(request.method))return secure(new Response('Method not allowed',{status:405}));
 const privateResponse=url.pathname==='/proof'||env.SITE_GATE_ENABLED!=='false';
 const aliases={'/index.html':'/','/design':'/studio','/design.html':'/studio','/quote':'/checkout','/quote.html':'/checkout','/directions.html':'/','/happy-chaos':'/','/colour-pop':'/','/keepsake-edit':'/'};
 const target=aliases[url.pathname]||(/\.html$/.test(url.pathname)?url.pathname.replace(/\/index\.html$|\.html$/,'')||'/':null);
 if(target){url.pathname=target;return secure(Response.redirect(url.toString(),301),{privateResponse})}

 const catalogue=async()=>{if(!env.CATALOGUE)throw new Error('Missing binding');const r=await env.CATALOGUE.fetch('https://catalogue.internal/content.json');if(!r.ok)throw new Error('Unavailable');return r.json()};
 if(url.pathname==='/season.json'){const r=await env.CATALOGUE.fetch('https://catalogue.internal/season.json');if(!r.ok)throw Error('Seasonal settings unavailable');return secure(Response.json(await r.json(),{headers:{'Cache-Control':'no-store'}}),{privateResponse})}
 if(url.pathname==='/content.json')return secure(Response.json(await catalogue(),{headers:{'Cache-Control':'no-store'}}),{privateResponse});
 if(url.pathname==='/sitemap.xml')return secure(new Response(sitemap(await catalogue()),{headers:{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'no-store'}}),{privateResponse});
 // Native app routes and metadata use the live catalogue, including newly created products.
 if(!url.pathname.split('/').at(-1).includes('.')){const nonce=random(),content=await catalogue();const template=await env.ASSETS.fetch(new Request(url.origin+'/'));if(!template.ok)throw new Error('Missing template');const {html,status}=renderDocument(await template.text(),url.pathname,content,nonce);const response=secure(new Response(request.method==='HEAD'?null:html,{status,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}}),{privateResponse,nonce,forms:true});if(url.pathname==='/proof')response.headers.set('Referrer-Policy','no-referrer');return response}
 return secure(await context.next(),{privateResponse});
 }catch{return secure(unavailable())}}
