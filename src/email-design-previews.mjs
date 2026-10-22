import {ORDER_LIMITS} from './artwork-policy.mjs';
import {printJpeg} from './designs/jpeg.mjs';
export const EMAIL_PREVIEW_LIMITS=Object.freeze({items:12,encodedImage:5000,encodedTotal:60000,minEdge:64,maxEdge:160});
const encoder=new TextEncoder();
// Run once before freezing the submission attempt. Reserve both possible signed
// upload tokens plus the maximum Turnstile value, including UTF-8 JSON overhead.
export function fitEmailDesignPreviews(attempt){
 if(attempt.emailPreviewVersion!==1)return attempt;
 let count=0,total=0;
 const items=attempt.items.map(item=>{
  const {emailPreview,...rest}=item;
  if(typeof emailPreview==='string'&&emailPreview.length<=EMAIL_PREVIEW_LIMITS.encodedImage&&count<EMAIL_PREVIEW_LIMITS.items&&total+emailPreview.length<=EMAIL_PREVIEW_LIMITS.encodedTotal){count++;total+=emailPreview.length;return {...rest,emailPreview};}
  return rest;
 });
 const fitted={...attempt,items};
 const size=()=>encoder.encode(JSON.stringify({payload:fitted,turnstile:'x'.repeat(2048),grant:'x'.repeat(1024),resume:'x'.repeat(1024),website:''})).length;
 for(let n=items.length-1;n>=0&&size()>ORDER_LIMITS.requestBytes;n--)delete items[n].emailPreview;
 return fitted;
}
function openPreparedImage(src){return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('Preview unavailable'));image.src=src;});}
// Only already prepared, metadata-free chosen artwork enters this function.
// Images are decoded sequentially and never placed in a persistent image cache.
export async function createEmailDesignPreview(images){
 if(!images.length||typeof document==='undefined')return undefined;
 const canvas=document.createElement('canvas');canvas.width=canvas.height=EMAIL_PREVIEW_LIMITS.maxEdge;
 const context=canvas.getContext('2d');if(!context)return undefined;
 context.fillStyle='#fffdf8';context.fillRect(0,0,canvas.width,canvas.height);
 const columns=Math.ceil(Math.sqrt(images.length)),rows=Math.ceil(images.length/columns),cell=canvas.width/columns,top=(canvas.height-rows*cell)/2;
 try{
  for(let n=0;n<images.length;n++){
   const image=await openPreparedImage(images[n]);
   context.drawImage(image,n%columns*cell,top+Math.floor(n/columns)*cell,cell,cell);image.onload=image.onerror=null;image.removeAttribute('src');
  }
  for(const quality of [.7,.5,.3,.15]){
   const encoded=printJpeg(canvas.toDataURL('image/jpeg',quality).split(',')[1]);
   if(encoded.length<=EMAIL_PREVIEW_LIMITS.encodedImage)return encoded;
  }
  return undefined;
 }catch{return undefined;}finally{canvas.width=canvas.height=0;}
}
