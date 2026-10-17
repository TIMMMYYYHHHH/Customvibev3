import {artworkUrl} from './artwork.mjs';
import {composePractical,composeGift} from './compositions.mjs';
import {printJpeg} from './jpeg.mjs';
import {colours,validateTemplate,templateIds} from './templates.mjs';
const ink='#291438';
export function fitLines(ctx,text,{width,height,maxSize=100,minSize=38,family='"CustomVibe Print Body", sans-serif',weight=600,literal=false}){
 for(let size=maxSize;size>=minSize;size-=2){
  ctx.font=`${weight} ${size}px ${family}`;const lines=[];
  for(const paragraph of text.split('\n')){
   if(literal){lines.push(paragraph);continue;}
   let line='';for(const word of paragraph.split(/\s+/)){const next=line?`${line} ${word}`:word;if(ctx.measureText(next).width>width&&line){lines.push(line);line=word;}else line=next;}lines.push(line);
  }
  if(lines.length*size*1.25<=height&&lines.every(line=>ctx.measureText(line).width<=width))return {lines,size};
 }
 throw new Error('This wording does not fit clearly. Shorten it or add spaces, then try again.');
}
function text(ctx,value,x,y,width,height,maxSize=100,minSize=38,heading=false,literal=false,colour=ink){
 const {lines,size}=fitLines(ctx,value,{width,height,maxSize,minSize,family:heading?'"CustomVibe Print Heading", sans-serif':'"CustomVibe Print Body", sans-serif',weight:heading?600:500,literal});
 ctx.fillStyle=colour;ctx.textAlign='center';ctx.textBaseline='middle';lines.forEach((line,i)=>ctx.fillText(line,x,y+(i-(lines.length-1)/2)*size*1.25));
}
function picture(ctx,name){
 ctx.save();ctx.translate(600,470);ctx.fillStyle=ink;ctx.strokeStyle=ink;ctx.lineWidth=20;ctx.lineCap='round';
 if(name==='sun'){ctx.fillStyle='#E99427';ctx.beginPath();ctx.arc(0,0,150,0,Math.PI*2);ctx.fill();for(let i=0;i<12;i++){ctx.rotate(Math.PI/6);ctx.beginPath();ctx.moveTo(200,0);ctx.lineTo(255,0);ctx.stroke();}}
 if(name==='apple'){ctx.fillStyle='#BD365D';for(const x of [-85,85]){ctx.beginPath();ctx.ellipse(x,20,140,175,0,0,Math.PI*2);ctx.fill();}ctx.beginPath();ctx.moveTo(0,-125);ctx.lineTo(20,-230);ctx.stroke();ctx.fillStyle='#39795F';ctx.beginPath();ctx.ellipse(85,-190,80,35,-.45,0,Math.PI*2);ctx.fill();}
 if(name==='tree'){ctx.fillStyle='#80533D';ctx.fillRect(-35,-20,70,250);ctx.fillStyle='#39795F';for(const [x,y] of [[-100,-30],[100,-30],[0,-140]]){ctx.beginPath();ctx.arc(x,y,130,0,Math.PI*2);ctx.fill();}}
 if(name==='cat'){ctx.fillStyle='#E99427';ctx.beginPath();ctx.moveTo(-190,80);ctx.lineTo(-200,-190);ctx.lineTo(-80,-110);ctx.quadraticCurveTo(0,-140,80,-110);ctx.lineTo(200,-190);ctx.lineTo(190,80);ctx.quadraticCurveTo(0,270,-190,80);ctx.fill();ctx.fillStyle=ink;for(const x of [-75,75]){ctx.beginPath();ctx.arc(x,10,16,0,Math.PI*2);ctx.fill();}ctx.beginPath();ctx.moveTo(-22,70);ctx.lineTo(22,70);ctx.lineTo(0,95);ctx.closePath();ctx.fill();for(const side of [-1,1])for(const y of [75,120]){ctx.beginPath();ctx.moveTo(side*110,y);ctx.lineTo(side*260,y-25);ctx.stroke();}}
 ctx.restore();
}
export async function renderDesign(design,{size=1200,logo}={}){
 if(design.version!==1)throw new Error('This design version is not available.');
 if(design.style){
  const image=new Image();image.src=artworkUrl(design.id,design.style);await image.decode();
  const canvas=document.createElement('canvas');canvas.width=size;canvas.height=size;const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,size,size);ctx.imageSmoothingQuality='high';ctx.drawImage(image,0,0,size,size);
  const url='data:image/jpeg;base64,'+printJpeg(canvas.toDataURL('image/jpeg',.94).split(',')[1]);const bytes=Uint8Array.from(atob(url.split(',')[1]),c=>c.charCodeAt(0));
  const sha256=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');return {url,sha256};
 }
 const {loadArtworkFonts}=await import('./fonts.mjs');await loadArtworkFonts();
 const canvas=document.createElement('canvas');canvas.width=size;canvas.height=size;const ctx=canvas.getContext('2d');ctx.scale(size/1200,size/1200);
 const {template}=design,v=templateIds.includes(template)?validateTemplate(template,design.values):design.values;
 ctx.fillStyle=colours[v.colour]||colours.cream;ctx.fillRect(0,0,1200,1200);
 if(template==='alphabet')text(ctx,v.title,600,600,1000,1000,800,600,true);
 else if(template==='counting'){
  text(ctx,String(v.number),600,410,1000,650,570,400,true);ctx.fillStyle=ink;
  for(let i=0;i<v.number;i++){const row=Math.floor(i/5),n=Math.min(5,v.number-row*5);ctx.beginPath();ctx.arc(600+((i%5)-(n-1)/2)*140,820+row*150,43,0,Math.PI*2);ctx.fill();}
 }else if(template==='words'){picture(ctx,v.title);text(ctx,v.title,600,920,980,200,170,100,true);}
 else if(template==='colours'){ctx.fillStyle={green:'#287F54',blue:'#367CB7',pink:'#D54A86',orange:'#E66A25'}[v.title];ctx.beginPath();ctx.arc(600,460,275,0,Math.PI*2);ctx.fill();text(ctx,v.title,600,930,980,200,160,100,true);}
 else if(['reminders','thanks'].includes(template))composeGift(ctx,template,v,text);
 else if(templateIds.includes(template))await composePractical(ctx,template,v,logo,text);
 else throw new Error('This design is not supported.');
 const url='data:image/jpeg;base64,'+printJpeg(canvas.toDataURL('image/jpeg',.94).split(',')[1]),bytes=Uint8Array.from(atob(url.split(',')[1]),c=>c.charCodeAt(0));
 const sha256=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
 return {url,sha256};
}
