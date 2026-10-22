import {emailItemQuantity} from './email-item-quantity.mjs';
import {EMAIL_PREVIEW_LIMITS as limits} from '../src/email-design-previews.mjs';
import {validateJpeg} from './jpeg.mjs';
import {escapeHTML} from './email-layout.mjs';
export function validateEmailDesignPreviews(payload){
 const present=payload.items.some(item=>item?.emailPreview!==undefined);
 if(payload.emailPreviewVersion===undefined){if(present)throw Error('Invalid email preview');return;}
 if(payload.emailPreviewVersion!==1)throw Error('Invalid email preview');
 let count=0,total=0;
 for(const item of payload.items){
  if(item?.emailPreview===undefined)continue;
  if(item.designMode==='assisted'||!item.files?.length||typeof item.emailPreview!=='string'||++count>limits.items||(total+=item.emailPreview.length)>limits.encodedTotal)throw Error('Invalid email preview');
  validateJpeg(item.emailPreview,true,limits.encodedImage,{min:limits.minEdge,max:limits.maxEdge});
 }
}

export function emailDesignPreviews(order){
 if(order.emailPreviewVersion!==1)return {html:'',text:'',attachments:[]};
 const shown=order.items.map((item,index)=>({item,index})).filter(({item})=>item.emailPreview);
 const notice=shown.length?`Low-resolution previews, not print files. ${shown.length} of ${order.items.length} order items shown. Full quantities are listed above.`:'No design previews are included in this email. Your full order details and quantities are listed above.';
 const attachments=shown.map(({item,index})=>({filename:`design-preview-${index+1}.jpg`,content:item.emailPreview,content_type:'image/jpeg',content_id:`cv-design-${index+1}`}));
 const labels=shown.map(({item,index})=>`${index+1}. ${item.name}: ${emailItemQuantity(item).quantity}`);
 const html=`<h2 style="font:600 24px/1.2 'Trebuchet MS',Arial,sans-serif;margin:28px 0 8px">Design previews</h2><p class="email-muted" style="color:#665f69;font-size:14px;line-height:1.6">${escapeHTML(notice)}</p>${shown.map(({item,index},n)=>`<table role="presentation" style="width:100%;border-collapse:collapse;margin:18px 0"><tr><td style="width:112px;vertical-align:top;padding:0 16px 0 0"><img src="cid:cv-design-${index+1}" width="96" height="96" alt="${escapeHTML('Preview of '+item.name)}" style="display:block;width:96px;height:96px;max-width:100%;object-fit:contain"></td><td style="vertical-align:top;overflow-wrap:anywhere;word-break:break-word"><strong>${escapeHTML(labels[n])}</strong><br><span class="email-muted" style="color:#665f69;font-size:14px">Design preview only</span></td></tr></table>`).join('')}`;
 return {html,text:'\n\nDesign previews\n'+notice+(labels.length?'\n'+labels.join('\n'):''),attachments};
}
