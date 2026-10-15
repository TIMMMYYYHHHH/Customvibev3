import {artworkManifest} from './submission-model.mjs';
export function orderRecord(order,privateArtwork){
 let index=0;const manifest=privateArtwork?artworkManifest(order):[];
 return {contact:order.contact,locker:order.locker,items:order.items.map(item=>({kind:item.kind,name:item.name,qty:item.qty,lineCents:item.lineCents,...(item.gridSize?{gridSize:item.gridSize}:{}),files:privateArtwork?item.files.map(()=>{const f=manifest[index];return {index:index++,name:f.name,size:f.size,proof:f.proof}}):[]})),magnetQty:order.magnetQty,subtotalCents:order.subtotalCents,paymentStatus:'unpaid'};
}
