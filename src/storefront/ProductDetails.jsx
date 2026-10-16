import React,{useEffect,useId,useRef} from 'react';
import CollectionPackPreview from './CollectionPackPreview';
import {canPurchase} from '../content/model.mjs';
import {money} from '../commerce.mjs';
export function ProductStatus({product}){return <span className={`product-status ${product.status}`}>{product.status==='available'?(product.href?'Create now':'Available'):'Coming soon'}</span>}
export default function ProductDetails({product,onClose,onAddPack}){
 const ref=useRef(),title=useId(),available=canPurchase(product);
 useEffect(()=>{const el=ref.current,trigger=document.activeElement;el.showModal();const old=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{el.close();document.body.style.overflow=old;queueMicrotask(()=>{if(trigger?.isConnected)trigger.focus({preventScroll:true})})}},[]);
 return <dialog ref={ref} className="product-dialog shared-product-dialog" aria-labelledby={title} onCancel={onClose} onClick={e=>{if(e.target===e.currentTarget)onClose()}}><button className="close-dialog" onClick={onClose} autoFocus>Close</button><CollectionPackPreview kind={product.id}/><div className="product-details-copy"><p className="overline">{product.group}</p><h2 id={title}>{product.name}</h2><ProductStatus product={product}/><p>{product.details||product.description}</p><p className="product-contents">{product.contents||`${product.count} square magnets`}</p><p className="price-note">{available?`${money(product.priceCents)} per collection`:'Price and availability to be confirmed.'}</p>{available?<button className="action" onClick={()=>{onAddPack(product.id);onClose()}}>Add to basket</button>:<a className="action" href="/studio" onClick={onClose}>Make photo magnets</a>}<button className="text-link keep-exploring" onClick={onClose}>Keep exploring</button></div></dialog>;
}
