import React,{useEffect,useRef,useState} from 'react';
import {clusterLockers,validMapPoint} from './locker-map.mjs';
import 'leaflet/dist/leaflet.css';
// Leaflet loads only after the customer chooses Search or Show map. No location permission.
export default function NearbyLockerMap({locations,center,selectedId,onChoose,onArea,sampleMap=false}){
 const container=useRef(),mapRef=useRef(),layerRef=useRef(),latest=useRef({locations,selectedId,onChoose,onArea}),[active,setActive]=useState(null),[error,setError]=useState(''),[moved,setMoved]=useState(false),[ready,setReady]=useState(false);
 latest.current={locations,selectedId,onChoose,onArea};
 useEffect(()=>{
  let mounted=true,cleanup=()=>{};
  import('leaflet').then(module=>{
   if(!mounted)return;const L=module.default;
   const map=L.map(container.current,{center:[-29,25],zoom:5,minZoom:5,maxZoom:17,scrollWheelZoom:false,maxBounds:[[-36,15],[-21,34]],maxBoundsViscosity:1});mapRef.current=map;
   map.attributionControl.setPrefix(false);
   const attribution='Powered by <a href="https://www.geoapify.com/" target="_blank" rel="noopener noreferrer">Geoapify</a> | &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>';
   let stopped=false,queue=[],nextStart=0,timers=new Set(),controllers=new Set();
   const enqueue=task=>{queue.push(task);pump();};let pumping=false;
   function pump(){if(pumping||stopped||!queue.length)return;pumping=true;const timer=setTimeout(()=>{timers.delete(timer);pumping=false;if(stopped)return;nextStart=Date.now()+350;queue.shift()?.();pump();},Math.max(0,nextStart-Date.now()));timers.add(timer);}
   const tiles=sampleMap?L.tileLayer('/tests/fixtures/map-tile.svg',{attribution:'Fictional local preview map',maxZoom:17}):new (L.GridLayer.extend({
    createTile(coords,done){const tile=document.createElement('img');tile.alt='';tile.setAttribute('role','presentation');tile.width=256;tile.height=256;tile._cvActive=true;
     const load=attempt=>enqueue(async()=>{if(!tile._cvActive||stopped)return;const control=new AbortController();controllers.add(control);
      try{const response=await fetch(`/api/map/tiles/${coords.z}/${coords.x}/${coords.y}.png`,{signal:control.signal});
       if(response.status===429&&attempt<3){const timer=setTimeout(()=>{timers.delete(timer);load(attempt+1);},1500+attempt*1000);timers.add(timer);return;}
       if(!response.ok)throw Error('Map unavailable');const blob=await response.blob();if(!tile._cvActive||stopped)return;tile._cvUrl=URL.createObjectURL(blob);tile.onload=()=>done(null,tile);tile.onerror=()=>done(Error('Tile unavailable'),tile);tile.src=tile._cvUrl;
      }catch(e){if(e.name!=='AbortError'&&mounted&&!stopped){setError('Some map detail could not load. Retry the map, or use the locker list below.');done(e,tile);}}
      finally{controllers.delete(control);}
     });load(0);return tile;
    }
   }))({attribution,tileSize:256,keepBuffer:1,updateWhenIdle:true});
   tiles.on('tileunload',event=>{event.tile._cvActive=false;if(event.tile._cvUrl)URL.revokeObjectURL(event.tile._cvUrl);});tiles.addTo(map);layerRef.current=tiles;
   const markers=L.layerGroup().addTo(map);let pointLayer;
   function draw(){markers.clearLayers();const state=latest.current,bounds=map.getBounds().pad(.15);const visible=state.locations.filter(item=>validMapPoint(item)&&bounds.contains([item.lat,item.lon]));
    for(const group of clusterLockers(visible,map.getZoom())){
     const multiple=group.items.length>1,item=group.items[0],selected=group.items.some(p=>p.id===state.selectedId);
     const icon=L.divIcon({className:`cv-map-marker${multiple?' cv-map-cluster':''}${selected?' selected':''}`,html:multiple?String(group.items.length):'<span aria-hidden="true"></span>',iconSize:multiple?[42,42]:[30,30],iconAnchor:multiple?[21,21]:[15,15]});
     const activate=()=>{if(multiple){map.fitBounds(group.items.map(p=>[p.lat,p.lon]),{padding:[35,35],maxZoom:16});}else setActive(item);};
     const marker=L.marker([group.lat,group.lon],{icon,keyboard:true,title:multiple?`${group.items.length} lockers. Zoom in.`:item.name,alt:multiple?`${group.items.length} lockers`:item.name}).addTo(markers).on('click',activate);
     const element=marker.getElement();element.setAttribute('aria-label',multiple?`${group.items.length} lockers. Zoom in.`:item.name);
     element.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();event.stopImmediatePropagation();activate();}});
    }
   }
   map.on('moveend',()=>{draw();setMoved(true);});draw();
   map._cvCenter=point=>{if(!validMapPoint(point))return;if(pointLayer)map.removeLayer(pointLayer);pointLayer=L.circleMarker([point.lat,point.lon],{radius:8,color:'#fff',weight:3,fillColor:'#28707a',fillOpacity:1}).addTo(map);pointLayer.bindTooltip('Your searched area');map.setView([point.lat,point.lon],11);setMoved(false);};
   map._cvDraw=draw;setReady(true);
   const resize=new ResizeObserver(()=>map.invalidateSize());resize.observe(container.current);
   cleanup=()=>{stopped=true;queue=[];timers.forEach(clearTimeout);controllers.forEach(c=>c.abort());resize.disconnect();map.remove();mapRef.current=null;};
  }).catch(()=>{if(mounted)setError('The map could not load. Use the locker list below.');});
  return()=>{mounted=false;cleanup();};
 },[sampleMap]);
 useEffect(()=>{if(ready&&center){mapRef.current?._cvCenter(center);setActive(null);}},[center,ready]);
 useEffect(()=>{mapRef.current?._cvDraw?.();},[locations,selectedId]);
 return <div className="nearby-map-wrap"><div ref={container} className="nearby-map" role="region" aria-label="Nearby locker map. Zoom with plus and minus; use arrow keys to move. Locker choices are also listed below."/>
 <div className="nearby-map-actions">{moved&&<button type="button" className="button secondary" onClick={()=>{const point=mapRef.current.getCenter();latest.current.onArea({lat:point.lat,lon:point.lng,label:'This map area'});setMoved(false);}}>Search this area</button>}<span>Teal dot: searched area · Berry pins: lockers</span></div>
 {active&&<div className="map-locker-detail"><div><strong>{active.name}</strong><p>{active.address||active.area}</p>{active.hours&&<small>{active.hours}</small>}</div><button type="button" className="button" onClick={()=>onChoose(active)}>{selectedId===active.id?'Selected':'Use this locker'}</button><button type="button" className="text-button" onClick={()=>setActive(null)}>Close details</button></div>}
 {error&&<p role="status" className="locker-map-help">{error} <button type="button" className="text-button" onClick={()=>{setError('');layerRef.current?.redraw();}}>Retry map</button></p>}
 </div>;
}
