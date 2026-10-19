import {makePhoto,renderPhoto,loadImage} from '../../src/artwork.js';
import {createDesignItems} from '../../src/studio-state.mjs';
import {preparePrivateArtwork} from '../../src/order-artwork.mjs';
import {defaultContent} from '../../src/content/model.mjs';
import {renderBusiness} from '../../src/designs/business-render.mjs';
import {renderHandy} from '../../src/designs/handy-render.mjs';
import {renderDesign} from '../../src/designs/render.mjs';
import {selectedPrintManifest} from '../../src/designs/products.mjs';
import {printJpeg} from '../../src/designs/jpeg.mjs';
if(!['localhost','127.0.0.1','[::1]'].includes(location.hostname))throw Error('Local only');
const assert=(condition,message)=>{if(!condition)throw Error(message)};
const bytes=url=>Uint8Array.from(atob(printJpeg(url.split(',')[1])),c=>c.charCodeAt(0));
const sha=async data=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data)),b=>b.toString(16).padStart(2,'0')).join('');
const base64=data=>{let binary='';for(const b of data)binary+=String.fromCharCode(b);return btoa(binary)};
const post=async(path,data)=>{const r=await fetch('/__acceptance/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const body=await r.json();assert(r.ok,JSON.stringify(body));return body};
const content=structuredClone(defaultContent);content.products.forEach(p=>p.status='available');
let photos,basket;
// Coordinate-encoded synthetic pixels provide an independent orientation oracle.
async function source(){
 const canvas=document.createElement('canvas');canvas.width=1800;canvas.height=1200;
 const ctx=canvas.getContext('2d'),image=ctx.createImageData(1800,1200);
 for(let y=0;y<1200;y++)for(let x=0;x<1800;x++){const n=(y*1800+x)*4;image.data.set([20+Math.floor(x/1800*200),20+Math.floor(y/1200*200),90,255],n)}
 ctx.putImageData(image,0,0);const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));return URL.createObjectURL(blob);
}
async function sample(url){const image=await loadImage(url),canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);return {width:canvas.width,height:canvas.height,pixel:(x,y)=>Array.from(ctx.getImageData(Math.floor(x*canvas.width),Math.floor(y*canvas.height),1,1).data).slice(0,3)}}
function near(actual,x,y,message){const expected=[20+Math.floor(x/1800*200),20+Math.floor(y/1200*200),90];assert(actual.every((c,i)=>Math.abs(c-expected[i])<=5),message+': '+actual+' expected '+expected)}
async function expectedExports(){
 const photo=await renderPhoto(photos[0],{size:1200}),puzzle=await renderPhoto(photos[1],{puzzle:true,gridSize:3,size:1200});
 const images=[photo.url,basket[1].preview,...puzzle.tiles];
 for(const item of basket.slice(2,4)){const product=content.products.find(p=>p.id===item.kind);for(const d of selectedPrintManifest(product,item.designIds).designs)images.push((await renderDesign({...d,style:item.style})).url)}
 images.push((await renderBusiness(basket[4].values)).url,(await renderHandy(basket[5].values)).url);
 const decoded=await sample(photo.url);assert(decoded.width===1200&&decoded.height===1200,'Photo print dimensions');
 // Clockwise source: 1200x1800. Zoom/focus gives sx=72,sy=588,sw=sh=960.
 for(const [x,y] of [[.1,.1],[.9,.1],[.1,.9],[.9,.9]])near(decoded.pixel(x,y),588+y*960,1200-(72+x*960),'Rotated selected crop');
 // Unrotated puzzle: zoom/focus gives sx=640,sy=40,sw=sh=1000.
 for(let i=0;i<9;i++){const tile=await sample(puzzle.tiles[i]);assert(tile.width===1200&&tile.height===1200,'Tile print dimensions');near(tile.pixel(.5,.5),640+(i%3+.5)*1000/3,40+(Math.floor(i/3)+.5)*1000/3,'Row-major tile '+i)}
 return images;
}
async function prepare(){
 const src=await source();await loadImage(src);
 photos=[{...makePhoto(src,'Synthetic rotated crop',1800,1200),rotation:90,zoom:1.25,x:.3,y:.7,qty:2},{...makePhoto(src,'Synthetic puzzle',1800,1200),format:'puzzle',gridSize:3,qty:2,zoom:1.2,x:.1,y:.2}];
 const stale=await createDesignItems(photos,renderPhoto);photos[1]={...photos[1],x:.8};
 const current=await createDesignItems(photos,renderPhoto);assert(stale[1].preview!==current[1].preview,'Studio item creation must regenerate a changed puzzle preview');
 basket=[...current,{id:crypto.randomUUID(),kind:'alphabet',qty:2,printVersion:1,style:'watercolour',designIds:['alphabet-1','alphabet-26'],designQuantities:[2,1]},{id:crypto.randomUUID(),kind:'counting',qty:1,printVersion:1,style:'gouache',designIds:['counting-2','counting-10'],designQuantities:[3,2]},{id:crypto.randomUUID(),kind:'business',qty:3,printVersion:1,designMode:'self',values:{businessTemplate:'02-salon',edition:1,entries:['SYNTHETIC'],qr:{mode:'url',url:'https://example.invalid/synthetic-review'}}},{id:crypto.randomUUID(),kind:'information',qty:2,printVersion:1,designMode:'self',values:{handyTemplate:'07-family-week',edition:1,entries:['Swimming','Library','Soccer','Music','Family time']}}];
 const expected=await expectedExports(),prepared=await preparePrivateArtwork(basket,photos,renderPhoto,content);
 assert(prepared.uploads.length===17,'Selected masters and photo/puzzle file count');
 const exports=await Promise.all(expected.map(url=>sha(bytes(url))));
 for(let i=0;i<exports.length;i++)assert(exports[i]===prepared.items.flatMap(i=>i.files)[i].sha256,'Export/upload manifest hash '+i);
 const result=await post('create',{items:prepared.items,uploads:prepared.uploads.map(base64)});assert(result.magnetQty===36,'Exact quantity total');
 for(const [i,url] of expected.entries()){const figure=document.createElement('figure'),image=new Image();image.src=url;image.width=150;const caption=document.createElement('figcaption');caption.textContent=result.files[i].name;figure.append(image,caption);document.querySelector('main').append(figure)}
 window.acceptance={exports,result,stalePreviewRegenerated:true,orientation:true,rowMajorTiles:true,replace:async()=>{
  const replacement=await renderPhoto({...photos[0],x:.8},{size:1200}),data=bytes(replacement.url),hash=await sha(data);assert(hash!==exports[0],'Replacement bytes changed');
  return post('replace',{upload:base64(data),size:data.length,sha256:hash});
 }};
 document.querySelector('#result').textContent=JSON.stringify({status:'prepared',...result,exports},null,2);
}
 document.querySelector('#prepare').onclick=()=>prepare().catch(error=>{window.acceptanceError=error.message;document.querySelector('#result').textContent='FAIL: '+error.message});
