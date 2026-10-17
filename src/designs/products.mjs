import {collectionDesigns,packIds} from './catalogue.mjs';
export const practicalIds=['business','qr','wifi','information'];
export const isTemplateProduct=p=>!!p&&practicalIds.includes(p.id);
export const isSelectableCollection=p=>!!p&&['alphabet','counting'].includes(p.id)&&!!printManifest(p);
export const productMagnetCount=(p,item)=>item?.designIds!==undefined?selectedPrintManifest(p,item.designIds).designs.length:isTemplateProduct(p)?1:p?.count||1;
export function printManifest(p){
 if(!p||p.pricingMode!=='per-magnet'||p.printVersion!==1)return null;
 const designs=collectionDesigns(p.id);
 return designs.length&&designs.length===p.count?{version:1,designs}:null;
}
export const hasPrintContract=p=>!!p&&p.printVersion===1&&(isTemplateProduct(p)&&p.count===1||!!printManifest(p));
const packs=[['alphabet','The alphabet club','26 uppercase letters, A–Z'],['counting','Count on a little fun','10 numbers with matching dots, 1–10'],['words','My first words','Apple, tree, sun and cat'],['colours','The colour club','Green, blue, pink and orange'],['reminders','Little reminders','You’ve got this; One thing at a time; Good things ahead; Make room for joy'],['thanks','Little thank-yous','Thank you; My favourite human; You are loved; Best day ever']];
export const collectionProducts=[...packs.map(([id,name,contents])=>({id,name,contents,count:collectionDesigns(id).length,group:['alphabet','counting','words','colours'].includes(id)?'Learning & play':id==='thanks'?'Gifts & occasions':'Everyday favourites'})),...[['business','Business magnets','Business & work','Your business, always handy.'],['qr','Scan to connect','Business & work','One little square. So much to share.'],['wifi','Wi-Fi made easy','Home & handy','A warm welcome, without spelling the password.'],['information','Good to keep handy','Home & handy','The details you reach for, right where you need them.']].map(([id,name,group,description])=>({id,name,group,description,count:1,contents:'One personalised 7.5 cm square magnet'}))].map(p=>({description:'Little squares for your everyday.',details:'',tags:'',image:'',featured:false,priceCents:null,status:'coming-soon',...p,pricingMode:'per-magnet',printVersion:1}));
export function upgradeCollections(products){return [...products.map(p=>{const built=collectionProducts.find(c=>c.id===p.id);return built?{...p,pricingMode:built.pricingMode,printVersion:built.printVersion,count:built.count,contents:built.contents}:p}),...collectionProducts.filter(c=>!products.some(p=>p.id===c.id))];}

export function selectedPrintManifest(product,designIds){
 const manifest=printManifest(product);
 if(designIds===undefined)return manifest;
 if(!isSelectableCollection(product)||!Array.isArray(designIds)||!designIds.length||designIds.length>manifest.designs.length||new Set(designIds).size!==designIds.length)throw Error('Choose valid letters or numbers.');
 const designs=designIds.map(id=>manifest.designs.find(d=>d.id===id));
 if(designs.some(d=>!d))throw Error('Choose valid letters or numbers.');
 return {...manifest,designs};
}
export function selectionLabel(product,designIds){return designIds===undefined?'':selectedPrintManifest(product,designIds).designs.map(d=>d.values.title??d.values.number).join(', ');}
export function collectionItemName(product,item){const label=selectionLabel(product,item?.designIds);return product.name+(label?' · '+label:'');}
export function mergeCollectionItem(basket,incoming,editingId){
 const same=i=>i.kind===incoming.kind&&JSON.stringify(i.designIds)===JSON.stringify(incoming.designIds);
 const remaining=basket.filter(i=>i.id!==editingId),matches=remaining.filter(same);
 if(!matches.length)return editingId?basket.map(i=>i.id===editingId?incoming:i):[...basket,incoming];
 const qty=incoming.qty+matches.reduce((total,i)=>total+i.qty,0);
 if(!Number.isSafeInteger(qty))throw Error('Choose a smaller quantity.');
 return remaining.filter(i=>!same(i)||i.id===matches[0].id).map(i=>i.id===matches[0].id?{...incoming,id:i.id,qty}:i);
}
