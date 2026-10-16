const enc=new TextEncoder();
const hex=b=>Array.from(new Uint8Array(b),x=>x.toString(16).padStart(2,'0')).join('');
const unhex=s=>{if(typeof s!=='string'||!/^(?:[a-f0-9]{2})+$/i.test(s))throw new Error('Invalid configuration');return Uint8Array.from(s.match(/../g),v=>parseInt(v,16))};
const b64=b=>btoa(String.fromCharCode(...new Uint8Array(b))).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
const unb64=s=>Uint8Array.from(atob(s.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));
export const random=()=>hex(crypto.getRandomValues(new Uint8Array(32)));
const key=s=>crypto.subtle.importKey('raw',enc.encode(s),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);
export async function hashPassword(password,salt){const k=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveBits']);return hex(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:unhex(salt),iterations:100000},k,256))}
// WebCrypto HMAC verification performs the comparison without a data-dependent JS loop.
export async function constantEqual(a,b){if(typeof a!=='string'||typeof b!=='string'||a.length!==b.length)return false;const k=await key(random());const sig=await crypto.subtle.sign('HMAC',k,enc.encode(a));return crypto.subtle.verify('HMAC',k,sig,enc.encode(b))}
export async function signToken(claims,secret){const payload=b64(enc.encode(JSON.stringify(claims)));return payload+'.'+b64(await crypto.subtle.sign('HMAC',await key(secret),enc.encode(payload)))}
export async function verifyToken(token,secret,scope){try{if(!token||token.length>2048)return null;const parts=token.split('.');if(parts.length!==2)return null;const [body,sig]=parts;if(!await crypto.subtle.verify('HMAC',await key(secret),unb64(sig),enc.encode(body)))return null;const c=JSON.parse(new TextDecoder().decode(unb64(body)));if(c.scope!==scope||!Number.isSafeInteger(c.exp)||c.exp<=Math.floor(Date.now()/1000)||!/^[a-f0-9]{64}$/.test(c.jti)||!/^[a-f0-9]{64}$/.test(c.csrf))return null;return c}catch{return null}}
export function cookie(request,name){const values=(request.headers.get('cookie')||'').split(';').map(x=>x.trim()).filter(x=>x.startsWith(name+'='));return values.length===1?values[0].slice(name.length+1):''}
export function sameOrigin(request){return request.headers.get('origin')===new URL(request.url).origin&&request.headers.get('sec-fetch-site')!=='cross-site'}
export async function boundedBody(request,limit){const reader=request.body?.getReader();if(!reader)return '';let size=0,parts=[];while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();throw new Error('Request too large')}parts.push(value)}const out=new Uint8Array(size);let at=0;for(const p of parts){out.set(p,at);at+=p.length}return new TextDecoder('utf-8',{fatal:true}).decode(out)}
export function secure(response,{admin=false,privateResponse=true,nonce,forms=false}={}){const h=new Headers(response.headers);h.set('X-Content-Type-Options','nosniff');h.set('X-Frame-Options','DENY');h.set('Referrer-Policy','strict-origin-when-cross-origin');h.set('Permissions-Policy','camera=(), microphone=(), geolocation=(), payment=()');h.set('Strict-Transport-Security','max-age=31536000');h.set('Content-Security-Policy',`default-src 'self'; script-src 'self'${forms?' https://challenges.cloudflare.com':''}${nonce?` 'nonce-${nonce}'`:''}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'${forms?' https://challenges.cloudflare.com':''}; frame-src https://www.openstreetmap.org${forms?' https://challenges.cloudflare.com':''}; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'; upgrade-insecure-requests`);if(privateResponse){h.set('Cache-Control','private, no-store');h.set('X-Robots-Tag','noindex, nofollow, noarchive');h.set('Vary','Cookie')}if(admin)h.set('X-Robots-Tag','noindex, nofollow, noarchive');return new Response(response.body,{status:response.status,headers:h})}
export const unavailable=()=>new Response('Temporarily unavailable. Please try again later.',{status:503});
async function authCall(env,path,body){if(!env.AUTH)throw new Error('Missing auth binding');const r=await env.AUTH.fetch('https://auth.internal'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!r.ok)throw new Error('Auth unavailable');return r.json()}
function adminReturn(value){return typeof value==='string'&&/^\/(?:orders(?:\?order=[a-f0-9-]{36})?|artwork(?:\?request=[a-f0-9-]{36})?|content)$/.test(value)?value:'/'}
function loginPage(scope,csrf,status=401,message='',next='/'){const title=scope==='admin'?'CustomVibe admin':'A little joy is on its way.';return new Response(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${title}</title>${scope==='admin'?'<link rel="icon" type="image/png" href="/favicon.png"><link rel="apple-touch-icon" href="/icon-180.png"><link rel="stylesheet" href="/admin-brand/fonts.css">':''}<style>body{margin:0;background:#fffdf8;color:#35233f;font:18px ${scope==='admin'?"'DM Sans Variable',sans-serif":'system-ui'};display:grid;min-height:100svh;place-items:center}main{max-width:420px;padding:32px}h1{font-size:2.7rem;line-height:1.1}${scope==='admin'?"h1,main>p:first-child{font-family:'Fredoka Variable',sans-serif;font-weight:700;letter-spacing:-.025em}main>p:first-child{font-size:28px;color:#8c2754}":''}label,input,button{display:block;box-sizing:border-box;width:100%}input{padding:14px;border:2px solid #35233f;border-radius:12px;margin:10px 0 20px;font:inherit}button{background:#8c2754;color:white;border:0;border-radius:12px;padding:15px;font:inherit;cursor:pointer}:focus-visible{outline:3px solid #8c2754;outline-offset:4px}.error{color:#8c2754}</style><main><p>CustomVibe</p><h1>${title}</h1><p>${scope==='admin'?'Sign in to manage your store.':'Enter your access password for a look around.'}</p>${message?`<p class="error" role="alert">${message}</p>`:''}<form method="post" action="/auth/login"><input type="hidden" name="csrf" value="${csrf}"><input type="hidden" name="next" value="${adminReturn(next)}"><label for="password">Password</label><input id="password" name="password" type="password" autocomplete="current-password" required maxlength="256"><button>Continue</button></form></main></html>`,{status,headers:{'Content-Type':'text/html; charset=utf-8'}})}
const cookieValue=(name,value,ttl)=>`${name}=${value}; Path=/; Max-Age=${ttl}; HttpOnly; Secure; SameSite=Lax`;
export async function gate(request,env,scope){const url=new URL(request.url),admin=scope==='admin',enabled=admin||env.SITE_GATE_ENABLED!=='false';const name=admin?'__Host-cv-admin':'__Host-cv-site',pre=name+'-csrf';
 if(url.pathname==='/robots.txt')return {response:new Response(enabled?'User-agent: *\nDisallow: /\n':'User-agent: *\nAllow: /\nDisallow: /basket\nDisallow: /checkout\nDisallow: /auth/\nSitemap: https://customvibe.co.za/sitemap.xml\n',{headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}})};
 if(!enabled&&!url.pathname.startsWith('/auth/'))return {response:null,session:null};
 const hash=env[admin?'ADMIN_PASSWORD_HASH':'SITE_PASSWORD_HASH'],salt=env[admin?'ADMIN_PASSWORD_SALT':'SITE_PASSWORD_SALT'],secret=env[admin?'ADMIN_SESSION_SECRET':'SESSION_SECRET'];
 if(![hash,salt,secret].every(v=>typeof v==='string'&&/^[a-f0-9]{64}$/i.test(v))||!env.AUTH)return {response:unavailable()};
 try{
 let session=await verifyToken(cookie(request,name),secret,scope);
 if(session&&(await authCall(env,'/status',{jti:session.jti,scope})).revoked)session=null;
 if(url.pathname==='/auth/logout'){
  if(request.method!=='POST'||!session||!sameOrigin(request))return {response:new Response('Forbidden',{status:403})};
  const form=new URLSearchParams(await boundedBody(request,4096));if(!await constantEqual(form.get('csrf')||'',session.csrf))return {response:new Response('Forbidden',{status:403})};
  await authCall(env,'/revoke',{scope,jti:session.jti,exp:session.exp});return {response:new Response(null,{status:303,headers:{Location:'/','Set-Cookie':cookieValue(name,'',0)}})};
 }
 if(session&&url.pathname!=='/auth/login')return {response:null,session};
 if(url.pathname.startsWith('/auth/')&&url.pathname!=='/auth/login')return {response:new Response('Not found',{status:404})};
 if(request.method==='POST'&&url.pathname==='/auth/login'){
  if(!sameOrigin(request)||!request.headers.get('content-type')?.startsWith('application/x-www-form-urlencoded'))return {response:new Response('Forbidden',{status:403})};
  const form=new URLSearchParams(await boundedBody(request,4096)),csrf=form.get('csrf')||'',preToken=await verifyToken(cookie(request,pre),secret,scope+'-login');
  if(!preToken||!await constantEqual(csrf,preToken.csrf))return {response:new Response('Forbidden',{status:403})};
  const ip=request.headers.get('CF-Connecting-IP');if(!ip)return {response:unavailable()};
  const id=hex(await crypto.subtle.sign('HMAC',await key(secret),enc.encode(scope+':'+ip)));
  const permit=await authCall(env,'/reserve',{scope,key:id});
  if(!permit.allowed)return {response:new Response('Too many attempts. Please try again in 15 minutes.',{status:429,headers:{'Retry-After':'900'}})};
  const password=form.get('password')||'';
  if(password.length<1||password.length>256||!await constantEqual(await hashPassword(password,salt),hash))return {response:loginPage(scope,csrf,401,'The password was not accepted.',admin?form.get('next'):'/')};
  const ttl=admin?1800:28800;const token=await signToken({scope,jti:random(),csrf:random(),exp:Math.floor(Date.now()/1000)+ttl},secret);
  return {response:new Response(null,{status:303,headers:{Location:admin?adminReturn(form.get('next')):'/', 'Set-Cookie':cookieValue(name,token,ttl)}})};
 }
 if(request.method!=='GET'&&request.method!=='HEAD')return {response:new Response('Unauthorized',{status:401})};
 if(url.pathname.startsWith('/api/'))return {response:Response.json({error:'Unauthorized'},{status:401})};
 // Background requests must not overwrite the cookie belonging to an open form.
 const destination=request.headers.get('sec-fetch-dest');
 if(destination&&destination!=='document')return {response:new Response('Unauthorized',{status:401})};
 // Reuse the signed, unexpired challenge across tabs without extending its lifetime.
 const existing=await verifyToken(cookie(request,pre),secret,scope+'-login');
 if(existing)return {response:loginPage(scope,existing.csrf,401,'',admin?url.pathname+url.search:'/')};
 const csrf=random(),token=await signToken({scope:scope+'-login',jti:random(),csrf,exp:Math.floor(Date.now()/1000)+900},secret);const response=loginPage(scope,csrf,401,'',admin?url.pathname+url.search:'/');response.headers.set('Set-Cookie',cookieValue(pre,token,900));return {response};
 }catch{return {response:unavailable()}}}
