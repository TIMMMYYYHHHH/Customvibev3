import {businessTemplate,validateBusinessValues,businessMatrix} from './business.mjs';
import {printJpeg} from './jpeg.mjs';
const images=new Map();
function loadImage(src){if(!images.has(src))images.set(src,new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>{images.delete(src);reject(Error('The artwork could not load. Please try again.'))};image.src=src;}));return images.get(src);}
export async function renderBusiness(values,{size=1200,incomplete=false}={}){
 const clean=validateBusinessValues(values,{incomplete}),design=businessTemplate(clean.businessTemplate);
 const [{loadArtworkFonts},image]=await Promise.all([import('./fonts.mjs'),loadImage(design.image)]);await loadArtworkFonts();
 await Promise.all(design.fields.map((f,i)=>document.fonts.load(`${f.weight} ${f.size}px "CustomVibe Print Body"`,clean.entries[i]||'Business')));
 const canvas=document.createElement('canvas');canvas.width=canvas.height=size;
 const ctx=canvas.getContext('2d');ctx.scale(size/1254,size/1254);ctx.drawImage(image,0,0,1254,1254);ctx.textBaseline='middle';ctx.fontKerning='none';
 design.fields.forEach((f,i)=>{const text=clean.entries[i]?(f.prefix||'')+clean.entries[i]:'';ctx.fillStyle=f.color;ctx.textAlign=f.align||'center';ctx.font=`${f.weight} ${f.size}px "CustomVibe Print Body"`;if(ctx.measureText(text).width>f.width)throw Error(`${f.label}: please use shorter wording so it fits at a readable size.`);ctx.fillText(text,f.x,f.y);});
 if(design.qr){const q=clean.qr,ready=q.mode==='url'?q.url:q.network&&(q.security==='nopass'||q.password.length>=8);if(ready){const matrix=businessMatrix(clean);ctx.resetTransform();const [x,y,edge]=design.qr.map(n=>n*size/1254),unit=Math.floor(edge/(matrix.size+8)),side=unit*(matrix.size+8),left=Math.round(x+(edge-side)/2),top=Math.round(y+(edge-side)/2);ctx.fillStyle='#fff';ctx.fillRect(Math.floor(x),Math.floor(y),Math.ceil(edge),Math.ceil(edge));ctx.fillStyle='#000';for(let r=0;r<matrix.size;r++)for(let c=0;c<matrix.size;c++)if(matrix.get(r,c))ctx.fillRect(left+(c+4)*unit,top+(r+4)*unit,unit,unit);}}
 return {url:'data:image/jpeg;base64,'+printJpeg(canvas.toDataURL('image/jpeg',.95).split(',')[1])};
}
