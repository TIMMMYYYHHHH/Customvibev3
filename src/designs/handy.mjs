import {handyDesigns} from './handy-catalogue.mjs';
import {advances,unitsPerEm} from './handy-font-metrics.mjs';
export {handyDesigns};
export const handyTemplate=id=>handyDesigns.find(d=>d.id===id);
export const defaultHandyValues=id=>({handyTemplate:id,edition:1,entries:handyTemplate(id).fields.map(f=>f.value||'')});
export function handyFieldError(field,text){
 if(typeof text!=='string'||[...text].length>field.limit||/[\u0000-\u001f\u007f]/u.test(text))return `${field.label}: use one line, up to ${field.limit} characters.`;
 let width=0;
 for(const character of text){const advance=advances[character.codePointAt(0)];if(advance===undefined)return `${field.label}: this character is not available in the handwriting. Please use letters, numbers and everyday punctuation.`;width+=advance/unitsPerEm*field.size;}
 if(width>field.width-4)return `${field.label}: please use shorter wording so it fits at a readable size.`;
 return '';
}
export function validateHandyValues(input){
 const design=handyTemplate(input?.handyTemplate);
 if(!design||input.edition!==1)throw Error('Choose a current Handy at home design.');
 if(!Array.isArray(input.entries)||input.entries.length!==design.fields.length)throw Error('Please check the details for this design.');
 const entries=design.fields.map((f,i)=>{const error=handyFieldError(f,input.entries[i]);if(error)throw Error(error);return input.entries[i]});
 return {handyTemplate:design.id,edition:1,entries};
}
export function handyDetails(values){
 if(!values?.handyTemplate)return [];
 const clean=validateHandyValues(values),design=handyTemplate(clean.handyTemplate);
 return design.fields.map((field,i)=>({label:field.label,value:clean.entries[i]}));
}
// Different personalisations always remain separate basket lines, even for the same template.
export function saveHandyItem(basket,item,editingId){
 const current=basket.find(i=>i.id===item.id);
 if(editingId&&(!current||editingId!==item.id))throw Error('This magnet is no longer in your basket. Please add a new design.');
 return current?basket.map(i=>i.id===item.id?{...item,qty:i.qty}:i):[...basket,item];
}
