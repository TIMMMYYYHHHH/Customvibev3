import {palette as p,flower,sprig,sparkle,heart,rainbow,house,wifi,checker,bouquet,ellipse} from './illustrations.mjs';
import {colours,qrMatrix,qrPayload} from './templates.mjs';
function background(c,colour){c.fillStyle=colour;c.fillRect(0,0,1200,1200);}
function panel(c,x,y,w,h,colour,r=0){c.fillStyle=colour;c.beginPath();c.roundRect(x,y,w,h,r);c.fill();}
function qr(c,template,v,top=330){
 const m=qrMatrix(qrPayload(template,v)),scale=Math.floor(630/(m.size+8)),side=(m.size+8)*scale,start=Math.round((1200-side)/2);
 // Four untouched white modules around every edge, including the final JPEG export.
 c.fillStyle='#fff';c.fillRect(start,top,side,side);c.fillStyle='#000';
 for(let y=0;y<m.size;y++)for(let x=0;x<m.size;x++)if(m.data[y*m.size+x])c.fillRect(start+(x+4)*scale,top+(y+4)*scale,scale,scale);
}
export async function composePractical(c,template,v,logo,drawText){
 const tint=colours[v.colour]||colours.cream;
 if(template==='business'){
  background(c,tint);panel(c,55,55,1090,1060,p.cream,360);checker(c,1120,p.green);
  if(logo){const image=new Image();image.src=logo;await image.decode();const ratio=Math.min(420/image.width,250/image.height);c.drawImage(image,600-image.width*ratio/2,115,image.width*ratio,image.height*ratio);}
  else{sprig(c,500,265,.5,-.6);sprig(c,700,265,.5,.6);flower(c,600,230,112,p.berry);}
  drawText(c,v.title,600,510,870,300,158,60,true);
  c.strokeStyle=p.green;c.lineWidth=3;c.beginPath();c.moveTo(425,720);c.lineTo(775,720);c.stroke();
  drawText(c,v.details,600,900,900,300,66,38);
 }else if(template==='qr'){
  background(c,p.ink);ellipse(c,1240,300,200,200,tint);ellipse(c,-130,1180,200,200,tint);
  flower(c,1060,910,90,p.coral);sparkle(c,150,325,65,p.gold);sparkle(c,1060,445,32,p.lilac);
  drawText(c,v.title,600,170,870,220,120,50,true,false,p.cream);
  panel(c,260,300,680,680,'#fff',35);qr(c,template,v,325);
  drawText(c,v.details||'Scan to connect',600,1070,880,135,55,38,false,false,p.cream);
 }else if(template==='wifi'){
  background(c,tint);panel(c,0,0,1200,310,p.ink);wifi(c,1060,152,.6,p.cream);
  drawText(c,v.title,510,155,820,225,108,50,true,false,p.cream);
  panel(c,245,325,710,650,p.cream,40);qr(c,template,v,335);
  house(c,120,840,.52);sprig(c,1080,830,.7,-.3);flower(c,1070,645,65,p.berry);
  const caption=`"${v.network}"\n${v.security==='nopass'?'Open network':'"'+v.password+'"'}`;
  drawText(c,caption,600,1060,1020,180,56,38,false,true);
 }else if(template==='information'){
  background(c,tint);panel(c,80,110,1040,990,p.cream,30);
  // A pinboard note, with its text comfortably inside the printable safe area.
  panel(c,450,65,300,110,p.coral,8);house(c,980,100,.43);
  if(logo){const image=new Image();image.src=logo;await image.decode();const ratio=Math.min(320/image.width,150/image.height);c.drawImage(image,600-image.width*ratio/2,160,image.width*ratio,image.height*ratio);}
  drawText(c,v.title,600,logo?435:315,880,logo?240:250,logo?106:126,60,true);
  const ruleY=logo?580:485;c.strokeStyle=p.lilac;c.lineWidth=4;c.beginPath();c.moveTo(185,ruleY);c.lineTo(1015,ruleY);c.stroke();
  drawText(c,v.details,600,logo?810:745,870,logo?380:410,76,38);
  flower(c,1060,1055,95,p.berry);sprig(c,130,1045,.5,-.5);
 }
}
export function composeGift(c,template,v,drawText){
 const index=template==='thanks'?['Thank you','My favourite human','You are loved','Best day ever'].indexOf(v.title):['You’ve got this','One thing at a time','Good things ahead','Make room for joy'].indexOf(v.title);
 const tint=colours[v.colour]||colours.cream;background(c,tint);
 if(index===0){panel(c,65,65,1070,1070,p.cream,490);bouquet(c,600,360,.95);}
 else if(index===1){rainbow(c,600,490,280);sparkle(c,235,250,48);sparkle(c,965,400,38,p.berry);}
 else if(index===2){heart(c,525,350,260,p.berry,-.18);heart(c,760,420,145,p.coral,.22);sparkle(c,245,390,48,p.green);sparkle(c,900,230,50,p.gold);}
 else{ellipse(c,600,360,190,190,p.gold);for(let i=0;i<12;i++){const a=i*Math.PI/6;c.strokeStyle=p.coral;c.lineWidth=25;c.lineCap='round';c.beginPath();c.moveTo(600+Math.cos(a)*235,360+Math.sin(a)*235);c.lineTo(600+Math.cos(a)*285,360+Math.sin(a)*285);c.stroke();}ellipse(c,540,350,12,18,p.ink);ellipse(c,660,350,12,18,p.ink);c.strokeStyle=p.ink;c.lineWidth=10;c.beginPath();c.arc(600,390,40,0,Math.PI);c.stroke();}
 drawText(c,v.title,600,860,920,360,170,100,true);
 if(index!==0){c.strokeStyle=p.ink;c.lineWidth=3;c.strokeRect(45,45,1110,1110);}
}
