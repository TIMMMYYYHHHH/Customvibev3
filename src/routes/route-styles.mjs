import {validateRouteStyles} from '../../shared/route-styles.mjs';
const hasSheet=link=>{try{return !!link.sheet}catch{return false}};
export function createRouteStyles({document:doc,catalogue,timers=globalThis,timeout=15000}){
 const records=new Map();
 const paths=key=>key!=='checkout'?[]:validateRouteStyles(typeof catalogue==='function'?catalogue():catalogue).checkout;
 function loadURL(href){
  const prior=records.get(href);if(prior&&(!prior.ready||prior.link.isConnected&&hasSheet(prior.link)))return prior.promise;
  const existing=[...doc.head.querySelectorAll('link[data-cv-route-style]')].find(link=>link.getAttribute('href')===href);
  const link=existing||doc.createElement('link');
  const record={link,ready:false,promise:null};
  record.promise=new Promise((resolve,reject)=>{
   let finished=false,timer;const cleanup=()=>{timers.clearTimeout(timer);link.removeEventListener('load',loaded);link.removeEventListener('error',failed)};
   const loaded=()=>{if(finished)return;if(!hasSheet(link))return failed();finished=true;cleanup();record.ready=true;resolve()};
   const failed=()=>{if(finished)return;finished=true;cleanup();link.remove();records.delete(href);reject(Error('This page stylesheet could not load.'))};
   link.addEventListener('load',loaded);link.addEventListener('error',failed);
   timer=timers.setTimeout(failed,timeout);
   if(!existing){link.setAttribute('rel','stylesheet');link.setAttribute('href',href);link.setAttribute('data-cv-route-style','checkout');doc.head.insertBefore(link,doc.head.querySelector('link[rel="stylesheet"]:not([data-cv-route-style])'))}
   if(hasSheet(link))loaded();
  });
  records.set(href,record);return record.promise;
 }
 return {
  ready(key){try{return paths(key).every(href=>{const r=records.get(href);return !!r?.ready&&r.link.isConnected&&hasSheet(r.link)})}catch{return false}},
  load(key){try{return Promise.all(paths(key).map(loadURL)).then(()=>{})}catch(error){return Promise.reject(error)}},
 };
}
const noStyles={ready:()=>true,load:()=>Promise.resolve()};
export const browserRouteStyles=import.meta.env?.DEV?noStyles:createRouteStyles({document:globalThis.document,catalogue:()=>JSON.parse(globalThis.document?.querySelector('meta[name="cv-route-styles"]')?.content||'null')});
