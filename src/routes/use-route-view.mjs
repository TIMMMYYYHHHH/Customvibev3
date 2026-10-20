import {useEffect,useState,useCallback} from 'react';
export function useRouteView(key,registry,gate){
 const [attempt,setAttempt]=useState(0),[resolved,setResolved]=useState(null);
 const blocked=!!(gate?.pending||gate?.error),eager=key&&!blocked?registry.peek(key):null;
 const current=resolved?.key===key&&resolved.registry===registry&&resolved.attempt===attempt?resolved:null;
 const Component=blocked?null:eager||current?.Component||null;
 const status=gate?.error?'error':!key||Component?'ready':'loading';
 useEffect(()=>{
  if(!key||eager||blocked)return;
  let active=true;
  Promise.resolve().then(()=>registry.load(key)).then(Component=>{if(active)setResolved({key,registry,attempt,Component})},error=>{if(active)setResolved({key,registry,attempt,error})});
  return()=>{active=false};
 },[key,registry,attempt,eager,blocked]);
 const retry=useCallback(()=>setAttempt(value=>value+1),[]);
 return {Component,status:!blocked&&current?.error&&!Component?'error':status,error:gate?.error||current?.error||null,retry};
}
