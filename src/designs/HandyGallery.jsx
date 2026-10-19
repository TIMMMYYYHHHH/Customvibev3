import React from 'react';
import {handyDesigns} from './handy.mjs';
import {MagnetPiece} from '../MagnetPreview';
import './handy.css';
// These 400 px previews are exports of renderHandy(defaultHandyValues(id)).
// Loading the collection never downloads the nine full-resolution print masters.
export function HandySample({design}){
 return <MagnetPiece><img src={'/assets/handy/v1/previews/'+design.id+'.jpg'} alt={design.name} loading="lazy" draggable={false}/></MagnetPiece>;
}
export default function HandyGallery({onChoose}){
 return <div className={'handy-gallery'+(onChoose?' handy-chooser':'')} aria-label="Nine Handy at home designs">{handyDesigns.map(design=>onChoose?<button type="button" key={design.id} data-design-id={design.id} aria-label={design.name+": add your details"} onClick={()=>onChoose(design.id)}><HandySample design={design}/><span>{design.name}</span><small>Add your details</small></button>:<HandySample key={design.id} design={design}/>)}</div>;
}
