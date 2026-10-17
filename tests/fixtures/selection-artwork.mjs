import {preparePrivateArtwork} from '../../src/order-artwork.mjs';
import {validateOrder} from '../../server/submission-model.mjs';
import {defaultContent} from '../../src/content/model.mjs';
const content=structuredClone(defaultContent);content.products.forEach(p=>p.status='available');
try{
 const basket=[{id:'11111111-1111-4111-8111-111111111111',kind:'alphabet',qty:2,printVersion:1,designIds:['alphabet-1','alphabet-26'],designQuantities:[2,1]},{id:'33333333-3333-4333-8333-333333333333',kind:'counting',qty:1,printVersion:1,designIds:['counting-2','counting-10']}];
 const {items,uploads}=await preparePrivateArtwork(basket,[],()=>{throw Error('No photo expected')},content);
 const order=validateOrder({id:'22222222-2222-4222-8222-222222222222',createdAt:Math.floor(Date.now()/1000),contact:{name:'Fixture',email:'fixture@example.com',phone:'0123456789'},locker:{name:'Locker',area:'Durban'},consent:true,items},content,true);
 if(uploads.length!==4||order.magnetQty!==8||order.subtotalCents!==33300)throw Error('Selected artwork or pricing mismatch');
 for(const [i,bytes] of uploads.entries()){const fig=document.createElement('figure'),img=new Image();img.src=URL.createObjectURL(new Blob([bytes],{type:'image/jpeg'}));await img.decode();if(img.width!==1200||img.height!==1200)throw Error('Wrong print size');fig.append(img);const caption=document.createElement('figcaption');caption.textContent=['A: 4 copies','Z: 2 copies','2: 1 copy','10: 1 copy'][i];fig.append(caption);document.querySelector('main').append(fig);}
 document.querySelector('#result').textContent='PASS: only A, Z, 2 and 10 exported; 4 print files, 8 magnets, R333.';
}catch(e){document.querySelector('#result').textContent='FAIL: '+e.message;}
