import {validArtworkStyle} from './artwork.mjs';
import {validateTemplate} from './templates.mjs';
import {isTemplateProduct,printManifest,selectionQuantities} from './products.mjs';
const uuid=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/;
export function designContract(item,product){
 if(item.style!==undefined&&(!validArtworkStyle(item.style)||!printManifest(product)))throw new Error('Choose a valid artwork style.');
 if(item.designIds!==undefined||item.designQuantities!==undefined)selectionQuantities(product,item.designIds,item.designQuantities);
 if(!isTemplateProduct(product)&&product.pricingMode!=='per-magnet')return {};
 if(!uuid.test(item.id||'')||item.printVersion!==product.printVersion)throw new Error('This design changed. Please add it again.');
 if(!isTemplateProduct(product))return {id:item.id,printVersion:printManifest(product).version,...(item.style?{style:item.style}:{}),...(item.designIds!==undefined?{designIds:[...item.designIds],...(item.designQuantities!==undefined?{designQuantities:[...item.designQuantities]}:{})}:{})};
 if(!['self','assisted'].includes(item.designMode))throw new Error('Choose how to create this design.');
 const base={id:item.id,printVersion:1,designMode:item.designMode};
 if(item.designMode==='self')return {...base,values:validateTemplate(product.id,item.values)};
 if(typeof item.brief!=='string'||!item.brief.trim()||item.brief.length>2000||/[\x00-\x08\x0b-\x1f\x7f]/.test(item.brief))throw new Error('Tell us what you would like, in up to 2,000 characters.');
 return {...base,brief:item.brief.trim(),hasReference:!!item.hasReference};
}
