import {boundedBody,cookie,verifyToken,constantEqual,sameOrigin} from './auth.mjs';
import {validMapPoint} from '../src/locker-map.mjs';
const fail=(status,error)=>Response.json({error},{status,headers:{'Cache-Control':'private, no-store',...(status===429?{'Retry-After':'2'}:{})}});
export async function mapAPI(request,env,{network=fetch,cache=globalThis.caches?.default}={}){
 const url=new URL(request.url),isSearch=url.pathname==='/api/map/search',tile=url.pathname.match(/^\/api\/map\/tiles\/(\d{1,2})\/(\d{1,6})\/(\d{1,6})\.png$/);
 if(url.hostname!=='customvibe.co.za'||request.headers.get('sec-fetch-site')==='cross-site')return fail(403,'Forbidden');
 if(env.MAP_LOOKUP_ENABLED!=='true'||!env.GEOAPIFY_API_KEY||!env.AUTH)return fail(503,'The map is temporarily unavailable. Use the locker list or enter a preference below.');
 const session=await verifyToken(cookie(request,'__Host-cv-form'),env.SESSION_SECRET,'form');if(!session)return fail(401,'Refresh the page to use the map.');
 let upstream,key;
 try{
  if(isSearch){
   if(request.method!=='POST'||!sameOrigin(request)||!await constantEqual(request.headers.get('X-CSRF-Token')||'',session.csrf))return fail(403,'Refresh the page before searching.');
   const {query}=JSON.parse(await boundedBody(request,500));
   if(typeof query!=='string'||query.trim().length<2||query.length>100||/[\u0000-\u001f\u007f@]/.test(query))return fail(400,'Enter a South African town, suburb or postcode.');
   const text=query.trim().replace(/\s+/g,' '),hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text.toLowerCase()))),x=>x.toString(16).padStart(2,'0')).join('');
   key='https://customvibe.co.za/internal-cache/geocoding-v1/'+hash;
   upstream=new URL('https://api.geoapify.com/v1/geocode/search');upstream.search=new URLSearchParams({text,filter:'countrycode:za',format:'json',limit:'5',lang:'en',apiKey:env.GEOAPIFY_API_KEY});
  }else if(tile&&request.method==='GET'){
   const [z,x,y]=tile.slice(1).map(Number),n=2**z;
   if(z<5||z>17||x>=n||y>=n)return fail(400,'Invalid map area.');
   // Only map tiles intersecting the South African viewing envelope.
   const west=x/n*360-180,east=(x+1)/n*360-180,lat=t=>Math.atan(Math.sinh(Math.PI*(1-2*t/n)))*180/Math.PI;
   if(east<15||west>34||lat(y)<-36||lat(y+1)>-21)return fail(400,'Map area is outside South Africa.');
   key=`https://customvibe.co.za/internal-cache/map-tiles-v1/${z}/${x}/${y}`;
   upstream=new URL(`https://maps.geoapify.com/v1/tile/osm-carto/${z}/${x}/${y}.png`);upstream.searchParams.set('apiKey',env.GEOAPIFY_API_KEY);
  }else return fail(405,'Method not allowed');
  const cached=await cache?.match(key);if(cached)return new Response(cached.body,{headers:{'Content-Type':cached.headers.get('Content-Type'),'Cache-Control':'private, no-store'}});
  const permit=await env.AUTH.fetch('https://auth.internal/maps/reserve',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({session:session.jti})});
  if(!permit.ok)return fail(503,'Map search is temporarily unavailable. Please use the locker list.');
  if(!(await permit.json()).allowed)return fail(429,'Map requests are busy or today’s map allowance has been reached. Retry shortly, or use the locker list below.');
  const response=await network(upstream.toString(),{redirect:'manual',signal:AbortSignal.timeout(10000)});if(!response.ok)return fail(503,'The map provider is temporarily unavailable. Please use the locker list.');
  let output;
  if(isSearch){const data=JSON.parse(await boundedBody(response,100000));const locations=(Array.isArray(data.results)?data.results:[]).filter(p=>validMapPoint(p)&&p.country_code==='za'&&typeof p.formatted==='string').slice(0,5).map(p=>({lat:p.lat,lon:p.lon,label:p.formatted.replace(/[\u0000-\u001f\u007f]/g,' ').slice(0,250)}));output=Response.json({locations});}
  else{
   if(!response.headers.get('Content-Type')?.startsWith('image/png'))return fail(503,'Map unavailable.');
   const reader=response.body.getReader(),parts=[];let length=0;
   while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>1000000){await reader.cancel();return fail(503,'Map unavailable.');}parts.push(value);}
   output=new Response(new Blob(parts),{headers:{'Content-Type':'image/png'}});
  }
  const store=output.clone();store.headers.set('Cache-Control','public, max-age=86400');await cache?.put(key,store);
  output.headers.set('Cache-Control','private, no-store');return output;
 }catch{return fail(503,'The map is temporarily unavailable. Use the locker list or enter a preference below.');}
}
