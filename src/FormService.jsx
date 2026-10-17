import React,{createContext,useContext,useEffect,useRef,useState,useSyncExternalStore} from 'react';
import {createSubmissionState} from './submission-state.mjs';
const SubmissionContext=createContext(null);
export function SubmissionProvider({children}){
 const [states]=useState(()=>({order:createSubmissionState(),contact:createSubmissionState()}));
 useEffect(()=>{const warn=e=>{if(Object.values(states).some(s=>s.getSnapshot().pending&&!s.getSnapshot().result)){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[states]);
 return <SubmissionContext.Provider value={states}>{children}</SubmissionContext.Provider>;
}
export function useSubmissionSnapshot(kind){const state=useContext(SubmissionContext)[kind];return useSyncExternalStore(state.subscribe,state.getSnapshot,state.getSnapshot);}
let turnstileLoader;
function loadTurnstile(){
 if(window.turnstile)return Promise.resolve(window.turnstile);
 if(!turnstileLoader)turnstileLoader=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.async=true;script.onload=()=>resolve(window.turnstile);script.onerror=()=>{turnstileLoader=null;script.remove();reject(new Error('Security check unavailable. Reload to try again.'))};document.head.append(script);});
 return turnstileLoader;
}
export function useFormService(kind){
 const state=useContext(SubmissionContext)[kind];
 const {pending,busy,result,error,attempt,manualReview}=useSyncExternalStore(state.subscribe,state.getSnapshot,state.getSnapshot);
 const [config,setConfig]=useState(null),[token,setToken]=useState(''),[cycle,setCycle]=useState(0);
 const cancelled=useRef(false),setError=React.useCallback(error=>state.update({error}),[state]);
 useEffect(()=>{cancelled.current=false;const controller=new AbortController();fetch('/api/forms?kind='+kind,{signal:controller.signal,cache:'no-store'}).then(async r=>{if(!r.ok)throw new Error('Reload the page and sign in again before sending.');return r.headers.get('content-type')?.includes('application/json')?r.json():{available:false}}).then(c=>{if(!cancelled.current)setConfig(c)}).catch(e=>{if(e.name!=='AbortError'&&!cancelled.current)setError(e.message)});return()=>{cancelled.current=true;controller.abort();};},[]);
 async function submit(build){
  if(state.getSnapshot().busy||state.getSnapshot().result||state.getSnapshot().manualReview||!config?.available||!token)return;
  state.update({busy:true,error:''});let sent=false;
  try{
   if(!state.getSnapshot().attempt){const {uploads,...payload}=await build();state.update({uploads,resume:null,attempt:{...payload,...(kind==='order'?{referenceVersion:config.orderRecords?2:1}:{}),id:crypto.randomUUID(),createdAt:Math.floor(Date.now()/1000)},pending:true});}
   let grant;
   if(kind==='order'&&config.artworkStorage){
    const check=async response=>{const body=await response.json();if(!response.ok||!body.ok){if(response.status===403){const fresh=await fetch('/api/forms?kind=order',{cache:'no-store'});if(fresh.ok)setConfig(await fresh.json());}if(response.status===400)state.rejected(400,body.error||'Check your order details.');throw new Error(body.error||'Artwork upload could not finish. Keep this tab open and retry.')}return body};
    const init=await check(await fetch('/api/artwork/init',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':config.csrf},body:JSON.stringify({payload:state.getSnapshot().attempt,turnstile:token,resume:state.getSnapshot().resume,website:''}),signal:AbortSignal.timeout(60000)}));grant=init.grant;state.update({resume:init.resume});
    const uploads=state.getSnapshot().uploads||[];
    for(let index=0;index<uploads.length;index++)await check(await fetch('/api/artwork/upload',{method:'POST',headers:{'Content-Type':'image/jpeg','X-CSRF-Token':config.csrf,'X-Artwork-Grant':grant,'X-Artwork-Index':String(index)},body:uploads[index],signal:AbortSignal.timeout(60000)}));
   }
   sent=true;
   const response=await fetch(kind==='order'?'/api/order-request':'/api/contact',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':config.csrf},body:JSON.stringify({payload:state.getSnapshot().attempt,turnstile:token,grant,website:''}),signal:AbortSignal.timeout(60000)});
   const body=await response.json();
   if(response.status===403){const fresh=await fetch('/api/forms?kind='+kind,{cache:'no-store'});if(fresh.ok&&fresh.headers.get('content-type')?.includes('application/json'))setConfig(await fresh.json());}
   if(!response.ok||!body.ok){if(body.manualReview)state.update({manualReview:true});state.rejected(response.status,body.error||'Sending could not be confirmed. Try again here without changing your details.');return;}
   state.update({result:body,uploads:null});
  }catch(e){state.update({uncertain:state.getSnapshot().uncertain||sent,error:e.name==='TimeoutError'?'Sending could not be confirmed. Keep this tab open and try again here without changing your details.':e.message||'Sending could not be confirmed. Please retry.'});}
  finally{setToken('');setCycle(n=>n+1);state.update({busy:false});}
 }

 function resetCompleted(){if(!state.resetCompleted())return false;setToken('');setCycle(n=>n+1);return true;}
 return {resetCompleted,config,token,setToken,error,setError,busy,result,cycle,pending,attempt,manualReview,submit};
}
export function FormSecurity({service,kind}){
 const container=useRef(),widget=useRef();const {config,cycle,setToken,setError}=service;
 useEffect(()=>{if(!config?.available||!container.current)return;let active=true;loadTurnstile().then(api=>{if(active&&container.current)widget.current=api.render(container.current,{sitekey:config.siteKey,action:kind,theme:'light',appearance:'interaction-only',execution:'render',callback:setToken,'expired-callback':()=>setToken(''),'error-callback':()=>{setToken('');setError('The security check could not finish. Please reload and try again.')}})}).catch(e=>{if(active)setError(e.message)});return()=>{active=false;if(widget.current!==undefined&&window.turnstile){window.turnstile.remove(widget.current);widget.current=undefined;}};},[config,kind,cycle,setToken,setError]);
 return <div className="form-security">{!config&&!service.error&&<p role="status">Preparing the secure form…</p>}{config&&!config.available&&<p role="status">This form is getting ready. Email <a href="mailto:hello@customvibe.co.za">hello@customvibe.co.za</a> for help.</p>}<div ref={container}/>{service.error&&<p className="error" role="alert">{service.error}</p>}</div>;
}
