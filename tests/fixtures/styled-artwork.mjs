import {preparePrivateArtwork} from '../../src/order-artwork.mjs';
import {validateOrder} from '../../server/submission-model.mjs';
import {defaultContent} from '../../src/content/model.mjs';
import {artworkStyles,artworkUrl} from '../../src/designs/artwork.mjs';
try{
 const basket=artworkStyles.map((s,i)=>({id:`11111111-1111-4111-8111-11111111111${i}`,kind:'words',style:s.id,qty:1,printVersion:1,designIds:['words-1'],designQuantities:[2]}));
 const {items,uploads}=await preparePrivateArtwork(basket,[],()=>{throw Error('No photo expected')},defaultContent);
 const order=validateOrder({id:'22222222-2222-4222-8222-222222222222',createdAt:Math.floor(Date.now()/1000),contact:{name:'Fixture',email:'fixture@example.com',phone:'0123456789'},locker:{name:'Locker',area:'Durban'},consent:true,items},defaultContent,true);
 if(uploads.length!==5||order.magnetQty!==10||order.subtotalCents!==40000)throw Error('Selected artwork or pricing mismatch');
 for(const [i,bytes] of uploads.entries()){
  const fig=document.createElement('figure'),img=new Image();img.src=URL.createObjectURL(new Blob([bytes],{type:'image/jpeg'}));await img.decode();if(img.width!==1200||img.height!==1200)throw Error('Wrong print size');
  const source=new Image();source.src=artworkUrl('words-1',artworkStyles[i].id);await source.decode();
  const pixels=image=>{const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=1200;const ctx=canvas.getContext('2d');ctx.imageSmoothingQuality='high';ctx.drawImage(image,0,0,1200,1200);return ctx.getImageData(0,0,1200,1200).data;};
  const a=pixels(source),b=pixels(img);let error=0;for(let j=0;j<a.length;j+=4)error+=Math.abs(a[j]-b[j])+Math.abs(a[j+1]-b[j+1])+Math.abs(a[j+2]-b[j+2]);error/=1200*1200*3;if(error>4)throw Error('Print does not match original artwork');
  if(items[i].style!==artworkStyles[i].id)throw Error('Lost style');fig.append(img);const caption=document.createElement('figcaption');caption.textContent=artworkStyles[i].name+' · 2 copies · original artwork only';fig.append(caption);document.querySelector('main').append(fig);
 }
 document.querySelector('#result').textContent='PASS: five styles, five original-artwork print masters, ten magnets, R400. No preview overlays.';
}catch(e){document.querySelector('#result').textContent='FAIL: '+e.message;}
