import React,{useState} from 'react';
import {useContent} from '../content/ContentProvider';
import {money,photoPrice} from '../commerce.mjs';
import {printManifest,selectionLabel} from './products.mjs';
import DesignGallery from './DesignGallery';
import './collection-picker.css';
export default function CollectionPicker({product,onAdd,initialItem}){
 const {content}=useContent(),designs=printManifest(product).designs;
 const [mode,setMode]=useState(initialItem?.designIds?'choose':'all');
 const [selected,setSelected]=useState(()=>Object.fromEntries((initialItem?.designIds||[]).map((id,i)=>[id,initialItem.designQuantities?.[i]??1])));
 const [error,setError]=useState('');
 const ids=designs.filter(d=>mode==='all'||selected[d.id]>0).map(d=>d.id),quantities=ids.map(id=>mode==='all'?1:selected[id]),count=quantities.reduce((n,q)=>n+q,0);
 const noun=product.id==='alphabet'?'letters':'numbers';
 function changeQuantity(id,value){
  const next={...selected,[id]:value},total=Object.values(next).reduce((n,q)=>n+q,0)*(initialItem?.qty||1);
  if(!Number.isSafeInteger(value)||value<0||!Number.isSafeInteger(total)||!Number.isSafeInteger(photoPrice(total,content.pricing))){setError('Choose a smaller whole number.');return;}
  setError('');setSelected(next);
 }
 function toggle(id){changeQuantity(id,selected[id]>0?0:1);}
 return <div className="collection-picker">
  <div className="collection-choice" role="group" aria-label="Collection options">
   <button type="button" aria-pressed={mode==='all'} onClick={()=>setMode('all')}>Full set <span>{product.id==='alphabet'?'A–Z · 26 letters':'1–10 · 10 numbers'}</span></button>
   <button type="button" aria-pressed={mode==='choose'} onClick={()=>setMode('choose')}>Choose your own <span>Pick the {noun} you want</span></button>
  </div>
  <div className="collection-picker-layout"><div className="collection-picker-art">
   <p>{mode==='all'?`One of every ${product.id==='alphabet'?'letter from A to Z':'number from 1 to 10'}.`:`Choose your ${noun}, then set how many of each you need.`}</p>
   <DesignGallery kind={product.id} all selectedIds={mode==='choose'?ids:undefined} onToggle={mode==='choose'?toggle:undefined} quantities={mode==='choose'?selected:undefined} onQuantity={mode==='choose'?changeQuantity:undefined}/>
  </div><div className="collection-picker-summary" aria-live="polite">
   <h3>{mode==='all'?'Your full set':'Your selection'}</h3>
   <p className="collection-picked-labels">{count?selectionLabel(product,ids,quantities):`Choose at least one ${product.id==='alphabet'?'letter':'number'} to get started.`}</p>
   <p className="collection-picked-count">{count} {count===1?'magnet':'magnets'}{initialItem?.qty>1?` per set · ${initialItem.qty} sets in your basket`:''}</p>
   <p className="collection-picked-price">{money(photoPrice(count,content.pricing))}</p>
   <p className="collection-picker-price-note">{initialItem?.qty>1?'Price for one set. ':''}Your whole basket shares our quantity discounts.</p>
   {error&&<p role="alert">{error}</p>}
   <button className="button action" disabled={!count||product.status!=='available'} onClick={()=>onAdd(product.id,mode==='choose'?ids:undefined,mode==='choose'?quantities:undefined)}>{initialItem?'Save selection':mode==='all'?'Add full set to basket':'Add selection to basket'}</button>
   <a href="/basket" className="collection-picker-basket">View basket</a>
  </div></div>
 </div>;
}
