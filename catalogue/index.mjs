import {readSeasons,publicSeason} from '../server/seasons.mjs';
import {readContent,publicContent} from '../server/content.mjs';
import fallback from '../data/site-content.json' with {type:'json'};
// Read-only service. Never attach a public route or workers.dev address.
export default {async fetch(request,env){if(request.method!=='GET'||!['/content.json','/season.json'].includes(new URL(request.url).pathname))return new Response(null,{status:404});try{if(new URL(request.url).pathname==='/season.json')return Response.json(publicSeason(await readSeasons(env.CONTENT_DB)),{headers:{'Cache-Control':'no-store'}});return Response.json(publicContent(await readContent(env.CONTENT_DB,fallback)),{headers:{'Cache-Control':'no-store'}})}catch{return new Response('Temporarily unavailable',{status:503})}}};
