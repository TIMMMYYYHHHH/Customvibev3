import {sameOrigin,constantEqual} from '../server/auth.mjs';
const fail=(status,code,error)=>Response.json({error,code},{status});
const fields=(v,keys)=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).every(k=>keys.includes(k));
const keys={items:['operationId','id','version','unit','wholeUnits','lowMilli'],receipts:['operationId','itemId','version','quantityMilli','packCents','packQuantity','updateDefault','settingsVersion'],stocktake:['operationId','itemId','version','countedMilli','reason'],use:['operationId','orderVersion','costVersion','usageVersion','lines'],reverse:['operationId','orderVersion','usageVersion','lines','reason']};
export async function stockAPI(request,env,session){
 if(!session)return fail(401,'UNAUTHORIZED','Sign in to continue.');
 const url=new URL(request.url),match=url.pathname.match(/^\/api\/stock\/(items|receipts|stocktake|history|orders\/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})(?:\/(use|reverse))?)$/);
 if(!match)return fail(404,'NOT_FOUND','Not found.');
 const route=match[1],id=match[2],action=match[3],body={};
 for(const [key,value] of url.searchParams){if(route!=='history'||!['before','revision'].includes(key)||Object.hasOwn(body,key)||!/^(?:0|[1-9]\d*)$/.test(value)||!Number.isSafeInteger(Number(value))||Number(value)<(key==='revision'?0:1))return fail(400,'INVALID','Invalid history page.');body[key]=Number(value)}
 const call=async(path,input)=>{if(!env.AUTH)return fail(503,'UNAVAILABLE','Stock is temporarily unavailable.');try{return await env.AUTH.fetch('https://auth.internal/stock/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)})}catch{return fail(503,'UNAVAILABLE','Stock is temporarily unavailable.')}};
 if(request.method==='GET'&&!action&&['items','history'].includes(route))return call(route==='items'?'items-read':'history',body);
 if(request.method==='GET'&&id&&!action)return call('order-read',{id});
 const kind=id?action:route;if(request.method!=='POST'||!keys[kind])return fail(405,'INVALID','Method not allowed.');
 if(!sameOrigin(request)||!await constantEqual(request.headers.get('X-CSRF-Token')||'',session.csrf))return fail(403,'FORBIDDEN','Refresh your session to continue.');
 if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get('Content-Type')||''))return fail(400,'INVALID','Use JSON.');
 let input;try{const reader=request.body?.getReader(),chunks=[];let size=0;if(reader){while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>65536){await reader.cancel();return fail(413,'TOO_LARGE','Stock request is too large.')}chunks.push(value)}}const buffer=new Uint8Array(size);let offset=0;for(const c of chunks){buffer.set(c,offset);offset+=c.length}input=JSON.parse(new TextDecoder().decode(buffer));if(!fields(input,keys[kind]))throw Error('Invalid fields')}catch{return fail(400,'INVALID','Invalid stock input.')}
 return call(id?'order-'+action:kind,{...input,...(id?{id}:{})});
}
