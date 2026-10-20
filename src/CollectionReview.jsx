import HandyDetails from './designs/HandyDetails';
import {isSelectableCollection,productMagnetCount} from './designs/products.mjs';
import CollectionPackPreview from './storefront/CollectionPackPreview';
import {canPurchase} from './content/model.mjs';
import {useContent} from './content/ContentProvider';
import React from 'react';
import {Bag,Minus,Plus,Trash,ArrowLeft,PencilSimple} from '@phosphor-icons/react';
import TierNudge from './TierNudge';
import {summarize,orderCapacity} from './commerce.mjs';
import {CropQuality,OrderCapacity} from './OrderGuidance';
import {CollectionPrice} from './CollectionPrice';
import {MagnetPreview} from './MagnetPreview';
export function CollectionReview({basket,photos=[],packs,go,onEdit,onQuantity,onRemove}){
 const {content}=useContent();const sum=summarize(basket,content);
 return <main className="basket-page section collection-review-page">
  <div className="section-heading"><div><p className="eyebrow">A LITTLE LOOK BEFORE YOU ORDER</p><h1>Your basket.</h1><p>All your magnets and puzzles, together.</p></div><button className="text-button" onClick={()=>go('studio')}><ArrowLeft size={18}/>Back to the designer</button></div>
  {!basket.length?<div className="empty-basket"><Bag size={44}/><h2>A little room for your favourites.</h2><p>Add photos in the designer to start your basket.</p><button className="button" onClick={()=>go('studio')}>Open the designer</button></div>:<div className="basket-layout collection-layout">
   <div className="collection-cards">{basket.map((item,index)=>{
    const editable=['photo','puzzle'].includes(item.kind)||!!item.designMode||isSelectableCollection(packs[item.kind]);
    const title=item.kind==='photo'?packs.photos.name:item.kind==='puzzle'?`${packs.puzzle.name} · ${item.gridSize} × ${item.gridSize}`:item.name;
    const label=`${title} ${index+1}`;
    return <article className="collection-card" key={item.id} data-basket-item={item.id} aria-label={label}>
     <div className="collection-card-image">{item.designMode==='assisted'?<div>{item.reference&&<img src={item.reference} alt="Your design reference"/>}<p>Awaiting design</p></div>:!isSelectableCollection(packs[item.kind])&&editable&&item.preview?<div className="collection-magnet-preview"><MagnetPreview urls={item.kind==='puzzle'?item.tiles:[item.preview]} columns={item.kind==='puzzle'?item.gridSize:1} label={label}/></div>:<CollectionPackPreview kind={item.kind} designIds={item.designIds} style={item.style}/>}</div>
     <div className="collection-card-body"><h2>{title}</h2><HandyDetails values={item.values}/>{item.designMode&&<p>{item.designMode==='assisted'?'Design it for me · awaiting design':'Personalised template'}</p>}{item.kind==='puzzle'&&<p>{item.gridSize**2} magnets per puzzle</p>}{isSelectableCollection(packs[item.kind])&&<p>{item.designIds?`${productMagnetCount(packs[item.kind],item)} magnets per selected set`:`Full set · ${packs[item.kind].count} magnets`}</p>}{!editable&&<><p>{packs[item.kind]?.contents}</p>{!canPurchase(packs[item.kind])&&<p className="availability-error">No longer available. Remove this collection to continue.</p>}</>}
      {['photo','puzzle'].includes(item.kind)&&<CropQuality compact photo={photos.find(p=>p.id===item.sourceId)}/>}
      <div className="collection-card-actions"><div className="stepper"><button aria-label={`Decrease ${label}`} disabled={item.qty===1} onClick={()=>onQuantity(item,-1)}><Minus/></button><output aria-label={`Quantity of ${label}`}>{item.qty}</output><button aria-label={`Increase ${label}`} disabled={!orderCapacity(basket.map(i=>i.id===item.id?{...i,qty:i.qty+1}:i),content).allowed} onClick={()=>onQuantity(item,1)}><Plus/></button></div><div className="collection-icon-actions">{editable&&<button className="collection-icon" aria-label={`Edit ${label}`} title="Edit design" onClick={()=>onEdit(item)}><PencilSimple size={20}/></button>}<button className="collection-icon" aria-label={`Delete ${label}`} title="Delete design" data-basket-remove onClick={event=>onRemove(item,event.currentTarget)}><Trash size={20}/></button></div></div>
     </div>
    </article>;
   })}</div>
   <aside className="basket-summary"><h2>Your basket total</h2><p>{sum.magnetQty} {sum.magnetQty===1?'magnet':'magnets'} in your basket</p><CollectionPrice sum={sum}/><TierNudge quantity={sum.pricedQty} onAdd={()=>go('studio')}/><OrderCapacity items={basket} content={content}/><button className="button" disabled={sum.unpriced||!orderCapacity(basket,content).allowed} onClick={()=>go('checkout')}>Continue to checkout</button></aside>
  </div>}
 </main>;
}
