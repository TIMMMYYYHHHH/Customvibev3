import {readContent,publicContent} from '../server/content.mjs';
import fallback from '../data/site-content.json' with {type:'json'};
// Read-only service. Never attach a public route or workers.dev address.
export default {async fetch(request,env){if(request.method!=='GET'||new URL(request.url).pathname!=='/content.json')return new Response(null,{status:404});try{return Response.json(publicContent(await readContent(env.CONTENT_DB,fallback)),{headers:{'Cache-Control':'no-store'}})}catch{return new Response('Temporarily unavailable',{status:503})}}};
