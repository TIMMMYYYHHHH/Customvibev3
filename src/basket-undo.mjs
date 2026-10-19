const isPhoto=item=>['photo','puzzle'].includes(item.kind);
const sourceId=item=>item.sourceId||item.id;

// The buffer keeps the existing immutable objects, including crop and QR values.
export function removeBasketItem(basket,photos,id){
 const index=basket.findIndex(item=>item.id===id);
 if(index<0)return {basket,photos,removal:null};
 const item=basket[index],remaining=basket.filter(entry=>entry.id!==id);
 const removedPhotos=isPhoto(item)&&!remaining.some(entry=>isPhoto(entry)&&sourceId(entry)===sourceId(item))
  ?photos.flatMap((photo,index)=>photo.id===sourceId(item)?[{photo,index}]:[]):[];
 return {basket:remaining,photos:removedPhotos.length?photos.filter(photo=>!removedPhotos.some(entry=>entry.photo===photo)):photos,removal:{item,index,photos:removedPhotos}};
}
export function restoreBasketItem(basket,photos,removal){
 if(!removal||basket.some(item=>item.id===removal.item.id))return {basket,photos};
 const restoredBasket=[...basket],restoredPhotos=[...photos];
 restoredBasket.splice(Math.min(removal.index,basket.length),0,removal.item);
 for(const entry of removal.photos)if(!restoredPhotos.some(photo=>photo.id===entry.photo.id))restoredPhotos.splice(Math.min(entry.index,restoredPhotos.length),0,entry.photo);
 return {basket:restoredBasket,photos:removal.photos.length?restoredPhotos:photos};
}
export function basketImageSources(basket,photos){
 return [...photos.map(photo=>photo.src),...basket.flatMap(item=>[item.src,item.reference,item.preview,...(item.tiles||[])])].filter(source=>typeof source==='string'&&source.startsWith('blob:'));
}
// Re-rendering a crop must not move an undone item past a neighbouring collection.
export function mergeBasketDesigns(basket,items){
 const pending=new Map(items.map(item=>[item.id,item]));
 const merged=basket.flatMap(item=>{
  if(!isPhoto(item))return [item];
  const replacement=pending.get(item.id);pending.delete(item.id);return replacement?[replacement]:[];
 });
 return [...merged,...pending.values()];
}
