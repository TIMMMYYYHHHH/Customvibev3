import React,{createContext,useContext,useEffect,useState} from 'react';
import {defaultContent,validateContent} from './model.mjs';
const Context=createContext(null);
export function ContentProvider({children,onSave,initialContent=defaultContent}){
 const [content,setContent]=useState(initialContent),[ready,setReady]=useState(false),[loadError,setLoadError]=useState('');
 async function reload(){
  try{const response=await fetch(window.__CV_ADMIN_PREVIEW__?'/preview-content.json':'/content.json',{cache:'no-store'});if(!response.ok)throw new Error('Could not load saved content.');const next=validateContent(await response.json());setContent(next);setLoadError('');return next;}
  catch(e){setLoadError(e.message);throw e}finally{setReady(true)}
 }
 useEffect(()=>{reload().catch(()=>{});const refresh=()=>{if(document.visibilityState==='visible')reload().catch(()=>{})};document.addEventListener('visibilitychange',refresh);return()=>document.removeEventListener('visibilitychange',refresh)},[]);
 async function save(next){if(!onSave)throw new Error('Editing is unavailable.');const result=await onSave(next);setContent(result);return result;}
 return <Context.Provider value={{content,ready,loadError,save,reload}}>{children}</Context.Provider>;
}
export const useContent=()=>useContext(Context);
