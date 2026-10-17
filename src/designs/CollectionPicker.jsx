import React,{useState} from 'react';
import {useContent} from '../content/ContentProvider';
import {money,photoPrice} from '../commerce.mjs';
import {printManifest,selectionLabel} from './products.mjs';
import {artworkStyles,artworkStyleName,defaultArtworkStyle} from './artwork.mjs';
import {ArtworkFace} from './ArtworkGallery';
import DesignGallery from './DesignGallery';
import './collection-picker.css';
export default function CollectionPicker({product,onAdd,initialItem}){
 const {content}=useContent(),designs=printManifest(product).designs;
 const [style,setStyle]=useState(initialItem?.style||defaultArtworkStyle);
 const [mode,setMode]=useState(initialItem?.designIds?'choose':'all');
 const [selected,setSelected]=useState(()=>Object.fromEntries((initialItem?.designIds||[]).map((id,i)=>[id,initialItem.designQuantities?.[i]??1])));
 const [error,setError]=useState('');
 const ids=designs.filter(d=>mode==='all'||selected[d.id]>0).map(d=>d.id),quantities=ids.map(id=>mode==='all'?1:selected[id]),count=quantities.reduce((n,q)=>n+q,0);
 const noun=product.id==='alphabet'?'letters':product.id==='counting'?'numbers':'designs';
 function changeQuantity(id,value){
  const next={...selected,[id]:value},total=Object.values(next).reduce((n,q)=>n+q,0)*(initialItem?.qty||1);
  if(!Number.isSafeInteger(value)||value<0||!Number.isSafeInteger(total)||!Number.isSafeInteger(photoPrice(total,content.pricing))){setError('Choose a smaller whole number.');return;}
  setError('');setSelected(next);
 }
 function toggle(id){changeQuantity(id,selected[id]>0?0:1);}
 return <div className="collection-picker">
  <fieldset className="artwork-styles"><legend>Choose your style</legend><p>Same collection. Five ways to make it yours.</p><div className="artwork-style-options">{artworkStyles.map(s=><label key={s.id}><input type="radio" name={`artwork-style-${product.id}`} value={s.id} checked={style===s.id} onChange={()=>setStyle(s.id)}/><span className="artwork-style-card"><ArtworkFace id={designs[0].id} style={s.id}/><strong>{s.name}</strong><small>{style===s.id?'Selected':'Choose style'}</small></span></label>)}</div></fieldset>
  <div className="collection-choice" role="group" aria-label="Collection options">
   <button type="button" aria-pressed={mode==='all'} onClick={()=>setMode('all')}>Full set <span>{product.id==='alphabet'?'A–Z · 26 letters':product.id==='counting'?'1–10 · 10 numbers':`${designs.length} designs`}</span></button>
   <button type="button" aria-pressed={mode==='choose'} onClick={()=>setMode('choose')}>Choose your own <span>Pick the {noun} you want</span></button>
  </div>
  <div className="collection-picker-layout"><div className="collection-picker-art">
   <p>{mode==='all'?`One of every design in ${artworkStyleName(style)}.`:`Choose your ${noun}, then set how many of each you need.`}</p>
   <DesignGallery style={style} kind={product.id} all selectedIds={mode==='choose'?ids:undefined} onToggle={mode==='choose'?toggle:undefined} quantities={mode==='choose'?selected:undefined} onQuantity={mode==='choose'?changeQuantity:undefined}/>
  </div><div className="collection-picker-summary" aria-live="polite">
   <p className="collection-style-name">{artworkStyleName(style)}</p><h3>{mode==='all'?'Your full set':'Your selection'}</h3>
   <p className="collection-picked-labels">{count?selectionLabel(product,ids,quantities):`Choose at least one ${product.id==='alphabet'?'letter':product.id==='counting'?'number':'design'} to get started.`}</p>
   <p className="collection-picked-count">{count} {count===1?'magnet':'magnets'}{initialItem?.qty>1?` per set · ${initialItem.qty} sets in your basket`:''}</p>
   <p className="collection-picked-price">{money(photoPrice(count,content.pricing))}</p>
   <p className="collection-picker-price-note">{initialItem?.qty>1?'Price for one set. ':''}Your whole basket shares our quantity discounts.</p>
   {error&&<p role="alert">{error}</p>}
   <button className="button action" disabled={!count||product.status!=='available'} onClick={()=>onAdd(product.id,mode==='choose'?ids:undefined,mode==='choose'?quantities:undefined,style)}>{initialItem?'Save selection':mode==='all'?'Add full set to basket':'Add selection to basket'}</button>
   <a href="/basket" className="collection-picker-basket">View basket</a>
  </div></div>
 </div>;
}
