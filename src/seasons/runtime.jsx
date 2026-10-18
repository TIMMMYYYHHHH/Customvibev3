import React,{createContext,useContext,useEffect,useLayoutEffect,useState} from 'react';
import {resolveAt,nowSAST,millis,occasion} from './model.mjs';
import {INSTALLED_THEMES} from './registry.mjs';
import {iconDefinition} from './occasion-summary.mjs';
import './visitor.css';
import {ChristmasHero,ChristmasDecorations} from './christmas/Christmas.jsx';
import {ChristmasControlIcon} from './christmas/ChristmasControlIcon.jsx';
import {flushSync} from 'react-dom';
import {fadeChristmasChange} from './christmas/transition.mjs';
import './christmas/transition.css';
// Occasion components remain dormant until an authorized preview or eligible public campaign.
export const THEME_COMPONENTS=Object.freeze({christmas:{Hero:ChristmasHero,Decorations:ChristmasDecorations,ControlIcon:ChristmasControlIcon}});
const Context=createContext({campaign:null,visible:false});
const preferenceKey='cv-season-preferences-v1';
export function SeasonProvider({children}){
 const [appearance,setAppearance]=useState({campaign:null}),[preferences,setPreferences]=useState({}),[reduced,setReduced]=useState(false);
 const preview=typeof window!=='undefined'&&window.__CV_ADMIN_PREVIEW__===true;
 useEffect(()=>{try{setPreferences(JSON.parse(localStorage.getItem(preferenceKey))||{})}catch{}const media=matchMedia('(prefers-reduced-motion: reduce)');const update=()=>setReduced(media.matches);update();media.addEventListener('change',update);return()=>media.removeEventListener('change',update)},[]);
 useEffect(()=>{
  let alive=true;const refresh=async()=>{try{const r=await fetch('/season.json',{cache:'no-store'});if(!r.ok)throw Error();const value=await r.json();if(alive)setAppearance(value)}catch{if(alive)setAppearance({campaign:null})}};
  if(!preview){if(!Object.keys(INSTALLED_THEMES).length)return;refresh();const timer=setInterval(refresh,60000);const wake=()=>{if(document.visibilityState==='visible')refresh()};document.addEventListener('visibilitychange',wake);return()=>{alive=false;clearInterval(timer);document.removeEventListener('visibilitychange',wake)}}
  if(parent===window){fetch('/api/seasons',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error();return r.json()}).then(state=>{const requested=new URLSearchParams(location.search).get('at'),at=Number.isFinite(millis(requested))?requested:nowSAST(),campaign=resolveAt(state,at).campaign;if(alive)setAppearance({campaign,definition:campaign?occasion(campaign.occasion,state):null})}).catch(()=>{if(alive)setAppearance({campaign:null})})}
  const receive=e=>{if(e.origin!==location.origin||e.source!==parent)return;if(e.data?.type==='cv-season-preview')setAppearance(e.data);if(e.data?.type==='cv-season-reset')setPreferences({})};addEventListener('message',receive);parent.postMessage({type:'cv-season-ready'},location.origin);return()=>{alive=false;removeEventListener('message',receive)};
 },[preview]);
 const raw=appearance.campaign,campaign=raw&&Object.hasOwn(INSTALLED_THEMES,raw.occasion)&&Object.hasOwn(THEME_COMPONENTS,raw.occasion)?raw:null;
 const key=campaign?.key||campaign?.id,visible=!!campaign&&!preferences.alwaysOriginal&&!preferences.disabled?.[key];
 const save=next=>{
  const commit=()=>{setPreferences(next);if(!preview)try{localStorage.setItem(preferenceKey,JSON.stringify(next))}catch{}};
  const nextVisible=!!campaign&&!next.alwaysOriginal&&!next.disabled?.[key];
  if(campaign?.occasion==='christmas'&&nextVisible!==visible){
   fadeChristmasChange(()=>flushSync(commit),{motion:!!campaign.motion&&!reduced&&!preferences.motionOff&&!next.motionOff});
  }else commit();
 };
 // A draft may preview copy on the shared original without installing or enabling a theme.
 const copy=visible?campaign.copy:preview&&appearance.previewMode==='draft'&&!campaign?raw?.copy:null;
 const value={campaign,copy,definition:appearance.definition,visible,preferences,save,key,motionAllowed:!!campaign?.motion&&!reduced&&!preferences.motionOff,motion:visible&&campaign.motion&&!reduced&&!preferences.motionOff};
 useLayoutEffect(()=>{if(!visible)return;document.documentElement.dataset.season=campaign.occasion;document.documentElement.dataset.seasonMotion=String(value.motion);return()=>{delete document.documentElement.dataset.season;delete document.documentElement.dataset.seasonMotion}},[visible,campaign?.occasion,value.motion]);
 const Decoration=visible?THEME_COMPONENTS[campaign.occasion]?.Decorations:null;
 return <Context.Provider value={value}>{children}{Decoration&&campaign.decorations&&<Decoration season={value}/>}</Context.Provider>;
}
export const useSeason=()=>useContext(Context);
export function SeasonText({field,children}){const {copy}=useSeason(),text=copy?.[field];return typeof text==='string'&&text.trim()?text.split('\n').map((line,i)=><React.Fragment key={i}>{i>0&&<br/>}{line}</React.Fragment>):children}
export function SeasonSlot({name,children}){const season=useSeason(),Component=season.visible?THEME_COMPONENTS[season.campaign.occasion]?.[name]:null;return Component?<Component season={season} original={children}/>:children}
export function SeasonControl(){const s=useSeason(),[open,setOpen]=useState(false);if(!s.campaign)return null;const o=s.definition,icon=iconDefinition({customOccasions:[o],occasionSettings:{[o.id]:o}},o.id),ControlIcon=THEME_COMPONENTS[s.campaign.occasion]?.ControlIcon;return <div className="season-control"><button className={`season-toggle${s.campaign.occasion==='christmas'?' cv-christmas-slider':''}`} aria-label={s.campaign.occasion==='christmas'?'Christmas theme':undefined} role={s.campaign.occasion==='christmas'?'switch':undefined} aria-checked={s.campaign.occasion==='christmas'?s.visible:undefined} aria-pressed={s.campaign.occasion==='christmas'?undefined:s.visible} onClick={()=>s.save({...s.preferences,alwaysOriginal:false,disabled:{...s.preferences.disabled,[s.key]:s.visible}})}>{ControlIcon?<ControlIcon season={s}/>:icon.image?<img src={icon.image} alt=""/>:<span aria-hidden="true">{icon.symbol}</span>}{s.campaign.occasion!=='christmas'&&<>{o.name} {s.visible?'on':'off'}</>}</button>{s.campaign.occasion!=='christmas'&&<button className="season-settings" aria-label="Seasonal display preferences" aria-expanded={open} onClick={()=>setOpen(!open)}>Settings</button>}{s.campaign.occasion!=='christmas'&&open&&<div className="season-options" onKeyDown={e=>{if(e.key==='Escape')setOpen(false)}}><label><input type="checkbox" checked={!!s.preferences.alwaysOriginal} onChange={e=>s.save({...s.preferences,alwaysOriginal:e.target.checked})}/>Always use the original look</label><label><input type="checkbox" checked={!!s.preferences.motionOff} onChange={e=>s.save({...s.preferences,motionOff:e.target.checked})}/>Pause seasonal motion</label><button onClick={()=>setOpen(false)}>Done</button></div>}</div>}
