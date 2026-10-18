import {handyTemplate,validateHandyValues} from './handy.mjs';
import {printJpeg} from './jpeg.mjs';
const images=new Map();
function loadImage(src){if(!images.has(src))images.set(src,new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>{images.delete(src);reject(Error('The artwork could not load. Please try again.'))};image.src=src;}));return images.get(src);}
export async function renderHandy(values,{size=1200}={}){
 const clean=validateHandyValues(values),design=handyTemplate(clean.handyTemplate);
 const [{loadHandyFont},image]=await Promise.all([import('./handy-font.mjs'),loadImage(design.image)]);
 await loadHandyFont();
 const canvas=document.createElement('canvas');canvas.width=canvas.height=size;
 const ctx=canvas.getContext('2d');ctx.scale(size/1254,size/1254);ctx.drawImage(image,0,0,1254,1254);
 ctx.fillStyle=design.color;ctx.textBaseline='middle';ctx.textAlign='left';ctx.fontKerning='none';
 design.fields.forEach((field,i)=>{
  const text=clean.entries[i];ctx.font=`400 ${field.size}px "CustomVibe Handwriting"`;
  if(ctx.measureText(text).width>field.width)throw Error(`${field.label}: please use shorter wording so it fits.`);
  ctx.fillText(text,field.x,field.y);
 });
 return {url:'data:image/jpeg;base64,'+printJpeg(canvas.toDataURL('image/jpeg',.95).split(',')[1])};
}
