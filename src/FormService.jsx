import React,{createContext,useContext,useEffect,useRef,useState,useSyncExternalStore} from 'react';
import {createSubmissionState} from './submission-state.mjs';
const SubmissionContext=createContext(null);
const DraftContext=createContext(null);
export function SubmissionProvider({children}){
 const [states]=useState(()=>({order:createSubmissionState(),contact:createSubmissionState()}));
 const [drafts]=useState(()=>new Map());
 useEffect(()=>{const warn=e=>{
  const pending=Object.values(states).some(state=>state.getSnapshot().pending&&!state.getSnapshot().result);
  const unsent=[...drafts.values()].some(({kind,dirty})=>dirty&&!states[kind].getSnapshot().result);
  if(pending||unsent){e.preventDefault();e.returnValue='';}
 };window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[states,drafts]);
 return <SubmissionContext.Provider value={states}><DraftContext.Provider value={drafts}>{children}</DraftContext.Provider></SubmissionContext.Provider>;
}
// Only a dirty flag is registered. Customer data remains in the owning component's memory.
export function useDraftProtection(kind,dirty){
 const drafts=useContext(DraftContext),key=useRef(Symbol());
 useEffect(()=>{const id=key.current;drafts.set(id,{kind,dirty});return()=>drafts.delete(id);},[drafts,kind,dirty]);
}
export function useSubmissionSnapshot(kind){const state=useContext(SubmissionContext)[kind];return useSyncExternalStore(state.subscribe,state.getSnapshot,state.getSnapshot);}
let turnstileLoader;
function loadTurnstile(){
 if(window.turnstile)return Promise.resolve(window.turnstile);
 if(!turnstileLoader)turnstileLoader=new Promise((resolve,reject)=>{
  const script=document.createElement('script');let finished=false;
  const fail=()=>{if(finished)return;finished=true;clearTimeout(timeout);turnstileLoader=null;script.remove();reject(new Error('The security check could not load. Keep this tab open and retry below.'));};
  const timeout=setTimeout(fail,15000);
  script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.async=true;
  script.onload=()=>{if(finished)return;if(!window.turnstile?.render){fail();return;}finished=true;clearTimeout(timeout);resolve(window.turnstile);};
  script.onerror=fail;document.head.append(script);
 });
 return turnstileLoader;
}
export function useFormService(kind){
 const state=useContext(SubmissionContext)[kind];
 const {pending,busy,result,error,attempt,manualReview}=useSyncExternalStore(state.subscribe,state.getSnapshot,state.getSnapshot);
 const [config,setConfig]=useState(null),[token,setToken]=useState(''),[cycle,setCycle]=useState(0);
 const [securityError,setSecurityError]=useState(''),[needsSignIn,setNeedsSignIn]=useState(false),[configLoading,setConfigLoading]=useState(true),[configVersion,setConfigVersion]=useState(0);
 const setError=React.useCallback(error=>state.update({error}),[state]);
 function refreshSecurity(){setToken('');setConfig(null);setSecurityError('');setNeedsSignIn(false);setConfigLoading(true);setConfigVersion(version=>version+1);}
 function retrySecurityCheck(){if(!state.getSnapshot().busy&&!state.getSnapshot().result&&!window.__CV_ADMIN_PREVIEW__)refreshSecurity();}
 useEffect(()=>{
  if(window.__CV_ADMIN_PREVIEW__){setConfig({available:false,preview:true});setConfigLoading(false);return;}
  let active=true;const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);
  fetch('/api/forms?kind='+kind,{signal:controller.signal,cache:'no-store'}).then(async response=>{
   const json=response.headers.get('content-type')?.includes('application/json');
   if(response.status===401||response.status===403||(response.ok&&!json)){
    if(active){setNeedsSignIn(true);setSecurityError('Your website sign-in may have expired. Keep this tab open so your work stays here.');}return;
   }
   if(!response.ok||!json)throw new Error('Configuration unavailable');
   const next=await response.json();
   if(!next||typeof next.available!=='boolean'||(next.available&&(!next.siteKey||!next.csrf)))throw new Error('Invalid configuration');
   if(active)setConfig(next);
  }).catch(()=>{if(active)setSecurityError('The secure form could not connect. Keep this tab open and retry below.');})
   .finally(()=>{clearTimeout(timeout);if(active)setConfigLoading(false);});
  return()=>{active=false;clearTimeout(timeout);controller.abort();};
 },[kind,configVersion]);
 async function submit(build){
  if(window.__CV_ADMIN_PREVIEW__||state.getSnapshot().busy||state.getSnapshot().result||state.getSnapshot().manualReview||!config?.available||!token)return;
  state.update({busy:true,error:''});let sent=false;
  try{
   if(!state.getSnapshot().attempt){const {uploads,...payload}=await build();state.update({uploads,resume:null,attempt:{...payload,...(kind==='order'?{referenceVersion:config.orderRecords?2:1}:{}),id:crypto.randomUUID(),createdAt:Math.floor(Date.now()/1000)},pending:true});}
   let grant;
   if(kind==='order'&&config.artworkStorage){
    const check=async response=>{if(response.status===401||response.status===403)refreshSecurity();const body=await response.json();if(!response.ok||!body.ok){if(response.status===400)state.rejected(400,body.error||'Check your order details.');throw new Error(body.error||'Artwork upload could not finish. Keep this tab open and retry.')}return body};
    const init=await check(await fetch('/api/artwork/init',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':config.csrf},body:JSON.stringify({payload:state.getSnapshot().attempt,turnstile:token,resume:state.getSnapshot().resume,website:''}),signal:AbortSignal.timeout(60000)}));grant=init.grant;state.update({resume:init.resume});
    const uploads=state.getSnapshot().uploads||[];
    for(let index=0;index<uploads.length;index++)await check(await fetch('/api/artwork/upload',{method:'POST',headers:{'Content-Type':'image/jpeg','X-CSRF-Token':config.csrf,'X-Artwork-Grant':grant,'X-Artwork-Index':String(index)},body:uploads[index],signal:AbortSignal.timeout(60000)}));
   }
   sent=true;
   const response=await fetch(kind==='order'?'/api/order-request':'/api/contact',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':config.csrf},body:JSON.stringify({payload:state.getSnapshot().attempt,turnstile:token,grant,website:''}),signal:AbortSignal.timeout(60000)});
   if(response.status===401||response.status===403)refreshSecurity();
   const body=await response.json();
   if(!response.ok||!body.ok){if(body.manualReview)state.update({manualReview:true});state.rejected(response.status,body.error||'Sending could not be confirmed. Try again here without changing your details.');return;}
   state.update({result:body,uploads:null});
  }catch(e){state.update({uncertain:state.getSnapshot().uncertain||sent,error:e.name==='TimeoutError'?'Sending could not be confirmed. Keep this tab open and try again here without changing your details.':e.message||'Sending could not be confirmed. Please retry.'});}
  finally{setToken('');setCycle(n=>n+1);state.update({busy:false});}
 }

 function resetCompleted(){if(!state.resetCompleted())return false;setToken('');setCycle(n=>n+1);return true;}
 return {resetCompleted,config,token,setToken,error,setError,securityError,setSecurityError,needsSignIn,configLoading,retrySecurityCheck,busy,result,cycle,pending,attempt,manualReview,submit};
}
export function FormSecurity({service,kind}){
 const container=useRef();const {config,cycle,setToken,setSecurityError}=service;
 useEffect(()=>{
  if(!config?.available||!container.current)return;
  let active=true,widget,api;
  loadTurnstile().then(loaded=>{
   if(!active||!container.current)return;api=loaded;
   widget=api.render(container.current,{sitekey:config.siteKey,action:kind,theme:'light',appearance:'interaction-only',execution:'render',
    callback:token=>{if(active){setToken(token);setSecurityError('');}},
    'expired-callback':()=>{if(active){setToken('');setSecurityError('The security check expired. Retry it below to continue.');}},
    'error-callback':()=>{if(active){setToken('');setSecurityError('The security check could not finish. Keep this tab open and retry below.');}}
   });
  }).catch(error=>{if(active){setToken('');setSecurityError(error.message);}});
  return()=>{active=false;if(widget!==undefined)api.remove(widget);};
 },[config,kind,cycle,setToken,setSecurityError]);
 return <div className="form-security">
  {service.configLoading&&<p role="status">Preparing the secure form…</p>}
  {config?.preview&&<p role="status">Website preview. Sending is unavailable here.</p>}
  {config&&!config.available&&!config.preview&&<p role="status">This form is getting ready. Email <a href="mailto:hello@customvibe.co.za">hello@customvibe.co.za</a> for help.</p>}
  <div ref={container}/>
  {service.securityError&&<p className="error" role="alert">{service.securityError}</p>}
  {service.needsSignIn&&<p><a href="/auth/login" target="_blank" rel="noopener noreferrer">Sign in in a new tab</a>, then return here and retry the security check. Your details stay in this tab.</p>}
  {!config?.preview&&!service.result&&(service.securityError||config?.available===false)&&<button className="button secondary" type="button" disabled={service.busy||service.configLoading} onClick={service.retrySecurityCheck}>Retry security check</button>}
  {service.error&&<p className="error" role="alert">{service.error}</p>}
 </div>;
}
