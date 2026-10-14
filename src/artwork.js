import {cropRect,puzzleRects} from './commerce.mjs';
const images=new Map();
export function loadImage(src){
 if(!images.has(src))images.set(src,new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>{images.delete(src);reject(new Error('This image could not be opened. Try a JPG or PNG.'));};img.src=src;}));
 return images.get(src);
}
export async function readPhoto(file){
 if(!['image/jpeg','image/png'].includes(file.type))throw new Error(`${file.name}: please choose a JPG or PNG.`);
 if(file.size>20*1024*1024)throw new Error(`${file.name}: use an image under 20 MB for this preview.`);
 const src=URL.createObjectURL(file);
 try{const img=await loadImage(src);return makePhoto(src,file.name,img.naturalWidth,img.naturalHeight);}catch(e){URL.revokeObjectURL(src);throw e;}
}
export const makePhoto=(src,name,w,h)=>({id:crypto.randomUUID(),src,name,w,h,zoom:1,x:.5,y:.5,rotation:0,qty:1});
export async function demoPhoto(src='/assets/sample-coast.png'){const img=await loadImage(src);return makePhoto(src,'A day on the coast',img.naturalWidth,img.naturalHeight);}
export async function renderPhoto(photo,{puzzle=false,gridSize=3,size=480}={}){
 const img=await loadImage(photo.src),rotate=photo.rotation||0;
 const source=document.createElement('canvas');source.width=rotate%180?img.naturalHeight:img.naturalWidth;source.height=rotate%180?img.naturalWidth:img.naturalHeight;
 const s=source.getContext('2d');s.translate(source.width/2,source.height/2);s.rotate(rotate*Math.PI/180);s.drawImage(img,-img.naturalWidth/2,-img.naturalHeight/2);
 const width=puzzle?size*gridSize:size,height=width;
 const r=cropRect(source.width,source.height,width,height,photo.zoom,photo.x,photo.y);
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;canvas.getContext('2d').drawImage(source,r.sx,r.sy,r.sw,r.sh,0,0,width,height);
 const tiles=puzzle?puzzleRects(r,gridSize).map(t=>{const tile=document.createElement('canvas');tile.width=size;tile.height=size;tile.getContext('2d').drawImage(source,t.sx,t.sy,t.sw,t.sh,0,0,size,size);return tile.toDataURL('image/jpeg',.92);}):[];
 if(puzzle){
  const gap=Math.round(size*.025),step=size+gap;
  canvas.width=size*gridSize+gap*(gridSize-1);canvas.height=canvas.width;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#fffdf8';ctx.fillRect(0,0,canvas.width,canvas.height);
  puzzleRects(r,gridSize).forEach((t,i)=>ctx.drawImage(source,t.sx,t.sy,t.sw,t.sh,(i%gridSize)*step,Math.floor(i/gridSize)*step,size,size));
 }
 return {canvas,url:canvas.toDataURL('image/jpeg',.92),tiles,sourceWidth:source.width,sourceHeight:source.height,crop:r};
}
