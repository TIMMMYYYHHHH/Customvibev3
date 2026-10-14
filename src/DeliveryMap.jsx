import React,{useState} from 'react';
export function DeliveryMap({location}){
 const [failed,setFailed]=useState(false);
 const lat=location?.lat??-29.815,lon=location?.lon??31.025;
 const bbox=location?[lon-.025,lat-.017,lon+.025,lat+.017]:[30.92,-29.94,31.16,-29.68];
 const params=new URLSearchParams({bbox:bbox.join(','),layer:'mapnik',...(location?{marker:`${lat},${lon}`}:{})});
 const href=`https://www.openstreetmap.org/${location?`?mlat=${lat}&mlon=${lon}`:''}#map=${location?14:11}/${lat}/${lon}`;
 return <section className="delivery-map" aria-label="Collection area map"><div className="delivery-map-heading"><div><h3>{location?location.name:'Around Durban'}</h3><p>{location?'Collection area':'Choose an area to see it on the map.'}</p></div><a href={href} target="_blank" rel="noreferrer">View larger map</a></div><iframe key={location?.id||'overview'} title={location?`Map of ${location.name}`:'Map of the Durban collection areas'} src={`https://www.openstreetmap.org/export/embed.html?${params}`} loading="lazy" referrerPolicy="no-referrer" onLoad={()=>setFailed(false)} onError={()=>setFailed(true)}/>{failed&&<p className="map-error" role="status">The map couldn’t load. You can still select an area or open the larger map.</p>}</section>;
}
