import React,{useEffect,useId,useState} from 'react';
import {CheckCircle,MapPin,CaretRight} from '@phosphor-icons/react';
import {DeliveryMap} from './DeliveryMap';
import {LOCKER_FINDER_URL,searchLockers} from './locker-map.mjs';
import './locker-picker.css';
export function LockerPicker({value,onChange,locations=null,live=false}){
 const searchId=useId(),[query,setQuery]=useState(''),[directory,setDirectory]=useState(null),[loading,setLoading]=useState(false),[error,setError]=useState(''),[retry,setRetry]=useState(0),[shown,setShown]=useState(20);
 useEffect(()=>{
  if(!live||locations!==null||window.__CV_ADMIN_PREVIEW__)return;
  const controller=new AbortController();setLoading(true);setError('');
  fetch('/api/lockers',{cache:'no-store',signal:controller.signal}).then(async response=>{const data=await response.json();if(!response.ok)throw Error(data.error||'Locker search is temporarily unavailable.');if(!Array.isArray(data.locations))throw Error('Locker search is temporarily unavailable.');return data.locations;}).then(data=>{if(!controller.signal.aborted)setDirectory(data);}).catch(e=>{if(!controller.signal.aborted)setError(e.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
  return()=>controller.abort();
 },[live,locations,retry]);
 const available=locations??directory;
 const selected=available?.find(item=>item.id===value.id);
 const results=available===null?[]:searchLockers(available,query);
 const choose=item=>onChange({id:item.id,name:item.name,area:item.area});
 const edit=patch=>onChange({name:value.name||'',area:value.area||'',...patch});
 return <div className="locker-picker">
  <div className="locker-step"><span aria-hidden="true">1</span><div><h3>Find your collection spot.</h3><p>A little closer to home, work or wherever suits you.</p></div></div>
  {loading&&<p role="status">Loading the courier’s locker directory…</p>}
  {error&&<p role="status">{error} <button type="button" className="text-button" onClick={()=>setRetry(n=>n+1)}>Retry locker search</button></p>}
  {available!==null&&<div className="locker-search"><label htmlFor={searchId}>Search by town, postcode or locker name</label><input id={searchId} type="search" value={query} onChange={e=>{setQuery(e.target.value);setShown(20)}} placeholder="Try a town or suburb"/><p role="status">{results.length} {results.length===1?'location':'locations'} found</p><ul className="locker-results">{results.slice(0,shown).map(item=><li key={item.id}><MapPin size={22} aria-hidden="true"/><div><strong>{item.name}</strong><p>{item.address||item.area}</p><small>{item.id}{item.hours?` · ${item.hours}`:''}</small></div><button className="button secondary" type="button" aria-pressed={selected?.id===item.id} aria-label={`${selected?.id===item.id?'Selected':'Use'} ${item.name}`} onClick={()=>choose(item)}>{selected?.id===item.id?'Selected':'Use this locker'}</button></li>)}</ul>{results.length>shown&&<button className="text-button" type="button" onClick={()=>setShown(n=>n+20)}>Show more lockers</button>}{!results.length&&<p>No matching lockers. Try another area or use the courier’s finder below.</p>}</div>}
  <a className="locker-official-link" href={LOCKER_FINDER_URL} target="_blank" rel="noopener noreferrer"><div><strong>Find a locker with The Courier Guy</strong><small>Opens their current locker finder in a new tab. Copy your chosen locker name and area below.</small></div><CaretRight size={22} aria-hidden="true"/></a>
  <DeliveryMap location={selected}/>
  <div className="locker-step"><span aria-hidden="true">2</span><div><h3>{selected?'Your selected locker.':'Keep your favourite here.'}</h3><p>{selected?`Locker ${selected.id}. Editing these details changes this to a manual preference.`:'Select a result above, or enter a preference exactly as shown in the courier’s finder.'}</p></div></div>
  <div className="fields locker-manual-fields"><label>Locker name<input required maxLength={140} value={value.name||''} onChange={e=>edit({name:e.target.value})} placeholder="Your chosen locker name"/></label><label>Town or suburb<input required maxLength={140} value={value.area||''} onChange={e=>edit({area:e.target.value})} placeholder="Where the locker is located"/></label></div>
  {!!value.name?.trim()&&!!value.area?.trim()&&<div className="locker-preference" aria-label="Preferred locker summary"><CheckCircle size={26} aria-hidden="true"/><div><small>YOUR PREFERRED COLLECTION SPOT</small><strong>{value.name}</strong><span>{value.area}</span></div><p>{selected?'Selected from the courier directory. This does not reserve locker space.':'Manual preference added to your order details.'} Availability and delivery cost still need confirmation.</p></div>}
 </div>;
}
