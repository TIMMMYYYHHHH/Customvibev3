import {designContract} from './designs/state.mjs';
import {selectedPrintManifest,isTemplateProduct} from './designs/products.mjs';
import {renderDesign} from './designs/render.mjs';
import {ARTWORK_LIMITS as limits} from './artwork-policy.mjs';
import {orderCapacity} from './commerce.mjs';
// Build only in memory. Only the customer's chosen crop is sent, with no original metadata.
import {printJpeg} from './designs/jpeg.mjs';
export async function prepareOrderItems(basket,photos,render,privateArtwork=false,content){
 const capacity=orderCapacity(basket,content);if(!capacity.allowed)throw new Error(capacity.issues.join(' '));
 const items=[],uploads=[];let length=0,count=0;
 for(const item of basket){
  const files=[];let images=[];const product=content?.products.find(p=>p.id===item.kind),contract=product?designContract({...item,hasReference:!!item.reference},product):{};
  if(['photo','puzzle'].includes(item.kind)){
   const photo=photos.find(p=>p.id===item.sourceId);if(!photo)throw new Error('A photo is missing. Return to the designer before sending.');
   const artwork=await render(photo,{puzzle:item.kind==='puzzle',gridSize:item.gridSize||3,size:1200});
   images=item.kind==='puzzle'?[item.preview,...artwork.tiles]:[artwork.url];
  }else if(contract.designMode==='assisted')images=item.reference?[item.reference]:[];
  else if(isTemplateProduct(product))images=[item.preview];
  else if(selectedPrintManifest(product,item.designIds))images=await Promise.all(selectedPrintManifest(product,item.designIds).designs.map(async d=>(await renderDesign({...d,style:item.style})).url));
   for(const image of images){if(!image.startsWith('data:image/jpeg;base64,'))throw new Error('A design could not be prepared. Please try another JPG or PNG.');const base64=printJpeg(image.slice('data:image/jpeg;base64,'.length));if(privateArtwork){const bytes=Uint8Array.from(atob(base64),c=>c.charCodeAt(0));length+=bytes.length;count++;if(bytes.length>limits.fileBytes||length>limits.requestBytes||count>limits.files)throw new Error('This order exceeds the artwork limit: 4 MB per file, 32 MB in total and 60 files. Keep your designs and contact us for help.');const sha256=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');files.push({size:bytes.length,sha256});uploads.push(bytes);continue;}length+=base64.length;count++;if(length>2000000||count>60||base64.length>1400000)throw new Error('These designs are too large for one email. Please reduce the number of designs in this order.');files.push(base64);}
  items.push({...contract,kind:item.kind,qty:item.qty,...(item.kind==='puzzle'?{gridSize:item.gridSize}:{}),files});
 }
 return privateArtwork?{items,uploads}:items;
}

export const preparePrivateArtwork=(basket,photos,render,content)=>prepareOrderItems(basket,photos,render,true,content);
