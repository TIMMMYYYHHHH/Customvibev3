import {useEffect,useState,useCallback} from 'react';
export function useRouteView(key,registry){
 const [attempt,setAttempt]=useState(0),[resolved,setResolved]=useState(null);
 const eager=key?registry.peek(key):null;
 const current=resolved?.key===key&&resolved.registry===registry&&resolved.attempt===attempt?resolved:null;
 const Component=eager||current?.Component||null;
 const status=!key||Component?'ready':current?.error?'error':'loading';
 useEffect(()=>{
  if(!key||eager)return;
  let active=true;
  Promise.resolve().then(()=>registry.load(key)).then(Component=>{if(active)setResolved({key,registry,attempt,Component})},error=>{if(active)setResolved({key,registry,attempt,error})});
  return()=>{active=false};
 },[key,registry,attempt,eager]);
 const retry=useCallback(()=>setAttempt(value=>value+1),[]);
 return {Component,status,error:current?.error||null,retry};
}
