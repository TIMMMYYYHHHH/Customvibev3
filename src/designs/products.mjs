import {artworkStyleName} from './artwork.mjs';
import {collectionDesigns,packIds} from './catalogue.mjs';
export const practicalIds=['business','qr','wifi','information'];
export const isGameProduct=p=>p?.id==='noughts-crosses';
export const isTemplateProduct=p=>!!p&&practicalIds.includes(p.id);
export const isSelectableCollection=p=>!!p&&packIds.includes(p.id)&&!!printManifest(p);
export const productMagnetCount=(p,item)=>item?.designIds!==undefined?selectionQuantities(p,item.designIds,item.designQuantities).reduce((n,q)=>n+q,0):isTemplateProduct(p)?1:p?.count||1;
export function printManifest(p){
 if(!p||p.pricingMode!=='per-magnet'||p.printVersion!==1)return null;
 const designs=collectionDesigns(p.id);
 return designs.length&&designs.length===p.count?{version:1,designs}:null;
}
export const hasPrintContract=p=>!!p&&p.printVersion===1&&(isTemplateProduct(p)&&p.count===1||!!printManifest(p));
const packs=[['alphabet','The alphabet club','26 uppercase letters, A–Z'],['counting','Count on a little fun','10 numbers with matching dots, 1–10'],['words','My first words','Apple, tree, sun and cat'],['colours','The colour club','Green, blue, pink and orange'],['reminders','Little reminders','You’ve got this; One thing at a time; Good things ahead; Make room for joy'],['thanks','Little thank-yous','Thank you; My favourite human; You are loved; Best day ever']];
export const collectionProducts=[...packs.map(([id,name,contents])=>({id,name,contents,count:collectionDesigns(id).length,group:['alphabet','counting','words','colours'].includes(id)?'Learning & play':id==='thanks'?'Gifts & occasions':'Everyday favourites'})),...[['business','Business magnets','Business & work','Your business, always handy.'],['qr','Scan to connect','Business & work','One little square. So much to share.'],['wifi','Wi-Fi made easy','Home & handy','A warm welcome, without spelling the password.'],['information','Good to keep handy','Home & handy','The details you reach for, right where you need them.']].map(([id,name,group,description])=>({id,name,group,description,count:1,contents:'One personalised 7.5 cm square magnet'}))].map(p=>({description:'Little squares for your everyday.',details:'',tags:'',image:'',featured:false,priceCents:null,status:'coming-soon',...p,pricingMode:'per-magnet',printVersion:1}));
collectionProducts.push({id:'noughts-crosses',name:'Noughts & crosses',group:'Learning & play',description:'Your next move, on the fridge.',details:'Five coral X magnets and five mint O magnets. Play together on a magnetic surface. No board included.',contents:'Full set only · 5 X magnets + 5 O magnets · 7.5 × 7.5 cm each',count:10,status:'available',priceCents:null,pricingMode:'per-magnet',printVersion:1,image:'',featured:false,tags:'game noughts crosses tic tac toe family play'});
export function upgradeCollections(products){return [...products.map(p=>{const built=collectionProducts.find(c=>c.id===p.id);return built?{...p,...(packIds.includes(p.id)?{artworkEdition:1,...(p.artworkEdition!==1?{status:'available'}:{})}:{}),pricingMode:built.pricingMode,printVersion:built.printVersion,count:built.count,contents:packIds.includes(p.id)?`${built.count} designs in five artwork styles`:built.contents}:p}),...collectionProducts.filter(c=>!products.some(p=>p.id===c.id)).map(c=>packIds.includes(c.id)?{...c,status:'available',artworkEdition:1}:c)];}

export function selectedPrintManifest(product,designIds){
 const manifest=printManifest(product);
 if(designIds===undefined)return manifest;
 if(!isSelectableCollection(product)||!Array.isArray(designIds)||!designIds.length||designIds.length>manifest.designs.length||new Set(designIds).size!==designIds.length)throw Error('Choose valid designs.');
 const designs=designIds.map(id=>manifest.designs.find(d=>d.id===id));
 if(designs.some(d=>!d))throw Error('Choose valid designs.');
 return {...manifest,designs};
}
export function selectionQuantities(product,designIds,quantities){
 const manifest=selectedPrintManifest(product,designIds);
 if(quantities===undefined)return manifest.designs.map(()=>1);
 if(designIds===undefined||!Array.isArray(quantities)||quantities.length!==manifest.designs.length||quantities.some(q=>!Number.isSafeInteger(q)||q<1)||!Number.isSafeInteger(quantities.reduce((n,q)=>n+q,0)))throw Error('Choose a valid quantity for every design.');
 return quantities;
}
export function selectionLabel(product,designIds,quantities){
 if(designIds===undefined)return '';
 const counts=selectionQuantities(product,designIds,quantities);
 return selectedPrintManifest(product,designIds).designs.map((d,i)=>(d.values.title??d.values.number)+(counts[i]>1?` × ${counts[i]}`:'')).join(', ');
}
export function collectionItemName(product,item){const label=selectionLabel(product,item?.designIds,item?.designQuantities);return product.name+(item?.style?' · '+artworkStyleName(item.style):'')+(label?' · '+label:'');}
export function mergeCollectionItem(basket,incoming,editingId){
 const same=i=>i.kind===incoming.kind&&i.style===incoming.style&&JSON.stringify(i.designIds)===JSON.stringify(incoming.designIds)&&JSON.stringify(i.designQuantities||i.designIds?.map(()=>1))===JSON.stringify(incoming.designQuantities||incoming.designIds?.map(()=>1));
 const remaining=basket.filter(i=>i.id!==editingId),matches=remaining.filter(same);
 if(!matches.length)return editingId?basket.map(i=>i.id===editingId?incoming:i):[...basket,incoming];
 const qty=incoming.qty+matches.reduce((total,i)=>total+i.qty,0);
 if(!Number.isSafeInteger(qty))throw Error('Choose a smaller quantity.');
 return remaining.filter(i=>!same(i)||i.id===matches[0].id).map(i=>i.id===matches[0].id?{...incoming,id:i.id,qty}:i);
}
