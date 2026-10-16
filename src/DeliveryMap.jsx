import React,{useState} from 'react';
import {MapTrifold} from '@phosphor-icons/react';
import {mapLinks} from './locker-map.mjs';
export function DeliveryMap({location}){
 const [enabled,setEnabled]=useState(false);
 const links=mapLinks(location);
 return <section className="locker-map" aria-label="Area map">
  <div className="locker-map-heading"><div><p className="eyebrow">A LITTLE CLOSER TO YOU</p><h3>{links.hasPin?'Your locker on the map':'Explore the area'}</h3></div><MapTrifold size={28} aria-hidden="true"/></div>
  {enabled?<iframe key={links.embed} title={links.hasPin?`Map of ${location.name}`:'Map of South Africa, without locker locations'} src={links.embed} referrerPolicy="strict-origin-when-cross-origin"/>:<div className="locker-map-cover"><MapTrifold size={48} weight="duotone" aria-hidden="true"/><h4>A handy look around.</h4><p>{links.hasPin?'See where your preferred locker is located.':'Browse the area. Find actual locker locations in the courier’s finder.'}</p><button className="button" type="button" onClick={()=>setEnabled(true)}>Show area map</button><small>Loads OpenStreetMap. Your order details stay here.</small></div>}
  <div className="locker-map-footer"><span>{links.hasPin?'Location only. Availability still needs confirmation.':'Area map only. Locker pins are not shown.'}</span><a href={links.full} target="_blank" rel="noopener noreferrer">Open larger map</a>{enabled&&<button type="button" className="text-button" onClick={()=>setEnabled(false)}>Hide map</button>}</div>
  {enabled&&<p className="locker-map-help">Map not loading? You can still enter your locker below or open the courier’s finder.</p>}
 </section>;
}
