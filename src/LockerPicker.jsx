import React,{useId,useState} from 'react';
import {CheckCircle,MapPin,CaretRight} from '@phosphor-icons/react';
import {DeliveryMap} from './DeliveryMap';
import {LOCKER_FINDER_URL,searchLockers} from './locker-map.mjs';
import './locker-picker.css';
export function LockerPicker({value,onChange,locations=null}){
 const searchId=useId(),[query,setQuery]=useState('');
 const selected=locations?.find(item=>item.id===value.id);
 const results=locations===null?[]:searchLockers(locations,query);
 const edit=patch=>onChange({name:value.name||'',area:value.area||'',...patch});
 return <div className="locker-picker">
  <div className="locker-step"><span aria-hidden="true">1</span><div><h3>Find your collection spot.</h3><p>A little closer to home, work or wherever suits you.</p></div></div>
  {locations!==null&&<div className="locker-search"><label htmlFor={searchId}>Search by town, suburb or locker name</label><input id={searchId} type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Try a town or suburb"/><p role="status">{results.length} {results.length===1?'location':'locations'} found</p><ul className="locker-results">{results.map(item=><li key={item.id}><MapPin size={22} aria-hidden="true"/><div><strong>{item.name}</strong><p>{item.area}</p><small>{item.id}{item.hours?` · ${item.hours}`:''}</small></div><button className="button secondary" type="button" aria-pressed={selected?.id===item.id} aria-label={`${selected?.id===item.id?'Selected':'Use'} ${item.name}`} onClick={()=>onChange({id:item.id,name:item.name,area:item.area})}>{selected?.id===item.id?'Selected':'Use this locker'}</button></li>)}</ul>{!results.length&&<p>No matching lockers. Try another area or use the courier’s finder below.</p>}</div>}
  <a className="locker-official-link" href={LOCKER_FINDER_URL} target="_blank" rel="noopener noreferrer"><div><strong>Find a locker with The Courier Guy</strong><small>Opens their current locker finder in a new tab. Copy your chosen locker name and area below.</small></div><CaretRight size={22} aria-hidden="true"/></a>
  <DeliveryMap location={selected}/>
  <div className="locker-step"><span aria-hidden="true">2</span><div><h3>Keep your favourite here.</h3><p>Enter the name and area exactly as shown in the locker finder.</p></div></div>
  <div className="fields locker-manual-fields"><label>Locker name<input required maxLength={140} value={value.name||''} onChange={e=>edit({name:e.target.value})} placeholder="Your chosen locker name"/></label><label>Town or suburb<input required maxLength={140} value={value.area||''} onChange={e=>edit({area:e.target.value})} placeholder="Where the locker is located"/></label></div>
  {!!value.name?.trim()&&!!value.area?.trim()&&<div className="locker-preference" aria-label="Preferred locker summary"><CheckCircle size={26} aria-hidden="true"/><div><small>YOUR PREFERRED COLLECTION SPOT</small><strong>{value.name}</strong><span>{value.area}</span></div><p>Added to your order details. Availability and delivery cost still need confirmation.</p></div>}
 </div>;
}
