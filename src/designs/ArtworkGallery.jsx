import React from 'react';
import {collectionDesigns} from './catalogue.mjs';
import {artworkUrl,defaultArtworkStyle} from './artwork.mjs';
import './magnet-satin.css';
export function ArtworkFace({id,style=defaultArtworkStyle,label=''}){return <span className="satin-magnet"><span className="satin-art"><img src={artworkUrl(id,style)} alt={label} loading="lazy"/></span></span>;}
export default function ArtworkGallery({kind,style=defaultArtworkStyle,all=false,designIds,selectedIds=[],onToggle,quantities={},onQuantity}){
 const masters=collectionDesigns(kind).filter(d=>!designIds||designIds.includes(d.id)),designs=all?masters:masters.slice(0,9);
 return <div className={`design-gallery artwork-gallery ${all?'all-designs':''}`} aria-label="Magnet artwork preview">{designs.map(d=>{const label=String(d.values.title??d.values.number),selected=selectedIds.includes(d.id);return <figure key={d.id}>{onToggle?<button type="button" className="design-pick" aria-label={`Select ${label}`} aria-pressed={selected} onClick={()=>onToggle(d.id)}><ArtworkFace id={d.id} style={style}/><span className="artwork-select-label">{selected?'Selected':'Select'}</span></button>:<ArtworkFace id={d.id} style={style} label={label}/>} {all&&<figcaption>{label}</figcaption>}{onQuantity&&<div className="design-quantity"><button type="button" aria-label={`Fewer ${label}`} disabled={!quantities[d.id]} onClick={()=>onQuantity(d.id,quantities[d.id]-1)}>−</button><input type="number" min="0" step="1" inputMode="numeric" aria-label={`Quantity of ${label}`} value={quantities[d.id]||0} onChange={e=>onQuantity(d.id,Number(e.target.value))}/><button type="button" aria-label={`More ${label}`} onClick={()=>onQuantity(d.id,(quantities[d.id]||0)+1)}>+</button></div>}</figure>})}</div>;
}
