import {collectionDesigns} from '../src/designs/catalogue.mjs';
const positive=n=>Number.isSafeInteger(n)&&n>0;
export function emailItemQuantity(item){
 const unknown={quantity:positive(item.qty)?`${item.qty} ${item.qty===1?'unit':'units'} · magnet count not recorded`:'Quantity not recorded · magnet count not recorded',count:null};
 if(!positive(item.qty))return unknown;
 const selected=item.designIds!==undefined;
 let perSet;
 if(item.kind==='photo')perSet=1;
 else if(item.kind==='puzzle')perSet=positive(item.gridSize)?item.gridSize**2:null;
 else if(selected){
  if(!Array.isArray(item.designIds)||!item.designIds.length)return unknown;
  if(item.designQuantities!==undefined&&(!Array.isArray(item.designQuantities)||item.designQuantities.length!==item.designIds.length||!item.designQuantities.every(positive)))return unknown;
  perSet=item.designQuantities?.reduce((sum,n)=>sum+n,0)??item.designIds.length;
 }else perSet=item.faceCount;
 const count=perSet*item.qty;
 if(!positive(perSet)||!positive(count))return unknown;
 if(item.kind==='photo'||perSet===1&&!selected&&item.kind!=='puzzle')return {quantity:`${item.qty} ${item.qty===1?'copy':'copies'}`,count};
 const perDesign=selected?item.designIds.map((id,n)=>{const face=collectionDesigns(item.kind).find(d=>d.id===id),label=face?.values.title??face?.values.number??`Design ${n+1}`,copies=item.qty*(item.designQuantities?.[n]??1);return `${label}: ${copies} ${copies===1?'copy':'copies'}`;}).join('; '):'';
 return {quantity:`${item.qty} ${item.qty===1?'set':'sets'} · ${perSet} ${perSet===1?'magnet':'magnets'} per set${perDesign?' · '+perDesign:''}`,count};
}
