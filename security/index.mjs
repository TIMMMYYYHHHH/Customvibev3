import {mapService,refreshLockerSnapshot} from './maps.mjs';
import {proofService} from './proofs.mjs';
import {readSelect} from './read.mjs';
import {reportUnavailable} from '../server/availability.mjs';
import {orderService,cleanOrders} from './orders.mjs';
import {artworkService,cleanArtwork} from './artwork.mjs';
import {submissionState} from './submissions.mjs';
// Service binding only. No workers.dev address, preview URL or public route.
export default {async fetch(request,env){let phase='security_request';try{if(request.method!=='POST')return new Response(null,{status:405});if(new URL(request.url).pathname.startsWith('/maps/')){phase='security_maps';return await mapService(request,env);}if(new URL(request.url).pathname.startsWith('/proofs/')){phase='security_proofs';return await proofService(request,env);}if(new URL(request.url).pathname.startsWith('/orders/')){phase='security_orders';return await orderService(request,env);}if(new URL(request.url).pathname.startsWith('/artwork/')){phase='security_artwork';return await artworkService(request,env);}if(new URL(request.url).pathname.startsWith('/submissions/'))return await submissionState(request,env);const {scope,key,jti,exp}=await request.json();if(!['site','admin'].includes(scope))return new Response(null,{status:400});const path=new URL(request.url).pathname;phase=path==='/status'?'security_status':path==='/reserve'?'security_reserve':path==='/revoke'?'security_revoke':'security_request';const now=Math.floor(Date.now()/1000);const kv=scope==='admin'?env.ADMIN_LOCKOUT:env.SITE_LOCKOUT;if(!env.DB||!kv)return new Response(null,{status:503});
 if(path==='/reserve'){
  if(!/^[a-f0-9]{64}$/.test(key))return new Response(null,{status:400});const id=scope+':'+key;
  if(await kv.get(id))return Response.json({allowed:false});
  const rows=await env.DB.batch([id,scope+':global'].map(k=>env.DB.prepare('INSERT INTO attempts (id,count,until) VALUES (?,1,?) ON CONFLICT(id) DO UPDATE SET count=CASE WHEN until<=? THEN 1 ELSE count+1 END, until=CASE WHEN until<=? THEN ? ELSE until END RETURNING count').bind(k,now+900,now,now,now+900)));
  const allowed=rows[0].results[0].count<=5&&rows[1].results[0].count<=500;
  if(!allowed)await kv.put(id,'locked',{expirationTtl:900});return Response.json({allowed});
 }
 if(!/^[a-f0-9]{64}$/.test(jti))return new Response(null,{status:400});
 if(path==='/status'){const row=await readSelect(env.DB,'SELECT exp FROM revoked WHERE id=? AND exp>?',[scope+':'+jti,now],'first','customvibe_auth_status_retry');return Response.json({revoked:!!row})}
 if(path==='/revoke'&&Number.isSafeInteger(exp)&&exp>now&&exp<=now+28800){await env.DB.prepare('INSERT OR REPLACE INTO revoked (id,exp) VALUES (?,?)').bind(scope+':'+jti,exp).run();return Response.json({ok:true})}
 return new Response(null,{status:404});
 }catch(error){reportUnavailable(phase,error);return Response.json({error:'Temporarily unavailable. Keep this tab open and retry shortly.'},{status:503})}},async scheduled(event,env){try{await refreshLockerSnapshot(env);await env.DB.prepare('DELETE FROM map_usage WHERE expires<?').bind(Date.now()).run();}catch(error){reportUnavailable('scheduled_maps',error)}if(event.cron==='*/5 * * * *')return;await cleanOrders(env);await cleanArtwork(env);const now=Math.floor(Date.now()/1000);await env.DB.batch([env.DB.prepare('DELETE FROM attempts WHERE until<?').bind(now-900),env.DB.prepare('DELETE FROM revoked WHERE exp<?').bind(now),env.DB.prepare('DELETE FROM submissions WHERE expires<?').bind(now)])}};
