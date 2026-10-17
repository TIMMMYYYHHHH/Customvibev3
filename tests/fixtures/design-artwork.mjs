// No page font CSS: print artwork must load its own bundled font bytes.
import jsQR from 'jsqr';
import {collectionDesigns,packIds} from '../../src/designs/catalogue.mjs';
import {renderDesign} from '../../src/designs/render.mjs';
import {qrPayload,validateTemplate} from '../../src/designs/templates.mjs';
import {validateJpeg} from '../../server/jpeg.mjs';
const extras=[{id:'business',title:'Adéle & Co',details:'Small business. Big heart.\nCall 012 345 6789'},{id:'information',title:'Good to keep handy',details:'Remember your keys\nWater the plants on Friday\nCall home when you arrive'},{id:'qr',title:'Our latest menu',url:'https://example.com/menu',details:'Scan to explore'},{id:'wifi',title:'Make yourself at home',network:'Guest;Room:1',password:' pass;word ',security:'WPA'}].map(({id,...values})=>({id,template:id,version:1,values}));
try{
 const designs=[...packIds.flatMap(collectionDesigns),...extras];let decoded=0;
 for(const d of designs){
  const {url}=await renderDesign(d);validateJpeg(url.split(',')[1]);const fig=document.createElement('figure'),img=new Image();img.src=url;await img.decode();if(img.width!==1200||img.height!==1200)throw new Error('Wrong print size');fig.append(img);const caption=document.createElement('figcaption');caption.textContent=d.id;fig.append(caption);document.querySelector('main').append(fig);
  if(['qr','wifi'].includes(d.template)){const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=1200;const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);if(jsQR(ctx.getImageData(0,0,1200,1200).data,1200,1200)?.data!==qrPayload(d.template,validateTemplate(d.template,d.values)))throw new Error('QR decode failed');decoded++;}
 }
 document.querySelector('#result').textContent=`PASS: ${designs.length} complete 1200 × 1200 baseline JPEG masters; ${decoded} exported QR codes decoded exactly.`;
}catch(e){document.querySelector('#result').textContent=`FAIL: ${e.message}`;}
