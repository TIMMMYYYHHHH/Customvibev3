import {boundedBody,sameOrigin,constantEqual} from '../server/auth.mjs';
const fail=(status,error)=>Response.json({error},{status});
const fields=(value,keys)=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).every(key=>keys.includes(key));
const call=(env,path,body)=>env.AUTH.fetch('https://auth.internal/finance/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
export async function financeAPI(request,env,session){
 if(!session)return fail(401,'Unauthorized.');
 const url=new URL(request.url),match=url.pathname.match(/^\/api\/finance\/(settings|month|orders\/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})(\/confirm)?)$/);
 if(!match)return fail(404,'Not found.');
 const route=match[1],id=match[2],confirm=!!match[3],isMonth=route==='month',isSettings=route==='settings';
 const queryKeys=isMonth?['month','before','revision','validUntil']:[],body={};
 for(const [key,value] of url.searchParams){
  if(!queryKeys.includes(key)||Object.hasOwn(body,key))return fail(400,'Invalid query.');
  if(key==='month')body[key]=value;
  else if(key==='validUntil'&&value==='null')body[key]=null;
  else{if(!/^(?:0|[1-9]\d*)$/.test(value)||!Number.isSafeInteger(Number(value))||Number(value)<(key==='revision'?0:1))return fail(400,'Invalid report page.');body[key]=Number(value);}
 }
 if(request.method==='GET'&&!confirm)return call(env,isMonth?'month':isSettings?'settings-read':'order-read',id?{id}:body);
 if(request.method!=='POST'||isMonth)return fail(405,'Method not allowed.');
 if(!sameOrigin(request)||!await constantEqual(request.headers.get('X-CSRF-Token')||'',session.csrf))return fail(403,'Forbidden.');
 if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type')||''))return fail(415,'Use JSON.');
 const keys=isSettings?['version','entries']:confirm?['version','orderVersion']:['version','orderVersion','lines'];
 let input;try{input=JSON.parse(await boundedBody(request,65536));if(!fields(input,keys))throw Error('Invalid fields');const array=isSettings?input.entries:confirm?null:input.lines;if(array!==null&&(!Array.isArray(array)||array.length>100))throw Error('Invalid lines');}catch{return fail(400,'Invalid or oversized finance input.');}
 return call(env,isSettings?'settings-save':confirm?'order-confirm':'order-save',{...Object.fromEntries(keys.filter(key=>Object.hasOwn(input,key)).map(key=>[key,input[key]])),...(id?{id}:{})});
}
