import React,{createContext,useContext,useEffect,useState} from 'react';
import {defaultContent,validateContent} from './model.mjs';
const Context=createContext(null);
export function ContentProvider({children}){
 const [content,setContent]=useState(defaultContent),[ready,setReady]=useState(false),[loadError,setLoadError]=useState('');
 async function reload(){
  try{const response=await fetch('/content.json',{cache:'no-store'});if(!response.ok)throw new Error('Could not load saved content.');const next=validateContent(await response.json());setContent(next);setLoadError('');return next;}
  catch(e){setLoadError(e.message);throw e}finally{setReady(true)}
 }
 useEffect(()=>{reload().catch(()=>{});const refresh=()=>{if(document.visibilityState==='visible')reload().catch(()=>{})};document.addEventListener('visibilitychange',refresh);return()=>document.removeEventListener('visibilitychange',refresh)},[]);
 async function save(next){validateContent(next);const response=await fetch('/api/content',{method:'PUT',headers:{'Content-Type':'application/json','X-CustomVibe-Admin':'1'},body:JSON.stringify(next)});let result;try{result=await response.json()}catch{throw new Error('Saving is available in the local prototype. Open its Admin area to edit content.')}if(!response.ok)throw new Error(result.error||'Could not save. Please try again.');setContent(result);return result;}
 return <Context.Provider value={{content,ready,loadError,save,reload}}>{children}</Context.Provider>;
}
export const useContent=()=>useContext(Context);
