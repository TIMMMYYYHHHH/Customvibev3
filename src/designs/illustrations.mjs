// Original, scalable illustrations. These are drawn into the final print artwork too.
export const palette={ink:'#291438',cream:'#FFF6E6',berry:'#B93459',green:'#306A53',coral:'#EE8C69',lilac:'#C6A7E2',gold:'#E8AD45'};
export function ellipse(c,x,y,rx,ry,fill,angle=0){c.fillStyle=fill;c.beginPath();c.ellipse(x,y,rx,ry,angle,0,Math.PI*2);c.fill();}
export function flower(c,x,y,r,fill=palette.coral,centre=palette.gold){
 for(let i=0;i<8;i++){const a=i*Math.PI/4;ellipse(c,x+Math.cos(a)*r*.62,y+Math.sin(a)*r*.62,r*.43,r*.28,fill,a);}ellipse(c,x,y,r*.29,r*.29,centre);
}
export function sprig(c,x,y,scale=1,angle=0){
 c.save();c.translate(x,y);c.rotate(angle);c.scale(scale,scale);c.strokeStyle=palette.green;c.lineWidth=10;c.lineCap='round';c.beginPath();c.moveTo(0,130);c.quadraticCurveTo(-15,0,50,-150);c.stroke();
 for(let i=0;i<4;i++){const yy=80-i*55,xx=(i-1)*9;ellipse(c,xx-32,yy,50,19,palette.green,.55);ellipse(c,xx+40,yy-30,50,19,palette.green,-.65);}c.restore();
}
export function sparkle(c,x,y,r,fill=palette.gold){c.fillStyle=fill;c.beginPath();c.moveTo(x,y-r);c.quadraticCurveTo(x+r*.18,y-r*.18,x+r,y);c.quadraticCurveTo(x+r*.18,y+r*.18,x,y+r);c.quadraticCurveTo(x-r*.18,y+r*.18,x-r,y);c.quadraticCurveTo(x-r*.18,y-r*.18,x,y-r);c.fill();}
export function heart(c,x,y,size,fill=palette.berry,angle=0){c.save();c.translate(x,y);c.rotate(angle);c.scale(size/200,size/200);c.fillStyle=fill;c.beginPath();c.moveTo(0,100);c.bezierCurveTo(-230,-40,-100,-190,0,-75);c.bezierCurveTo(100,-190,230,-40,0,100);c.fill();c.restore();}
export function rainbow(c,x,y,r){c.save();c.lineWidth=45;c.lineCap='round';[palette.berry,palette.coral,palette.gold,palette.green].forEach((fill,i)=>{c.strokeStyle=fill;c.beginPath();c.arc(x,y,r-i*54,Math.PI,Math.PI*2);c.stroke();});c.restore();}
export function house(c,x,y,scale=1){
 c.save();c.translate(x,y);c.scale(scale,scale);c.fillStyle=palette.cream;c.fillRect(-110,-30,220,190);c.fillStyle=palette.berry;c.beginPath();c.moveTo(-155,-25);c.lineTo(0,-160);c.lineTo(155,-25);c.closePath();c.fill();c.fillStyle=palette.green;c.fillRect(-30,40,60,120);c.fillRect(-78,10,36,40);c.fillRect(42,10,36,40);ellipse(c,12,108,5,5,palette.gold);c.restore();
}
export function wifi(c,x,y,scale=1,fill=palette.ink){c.save();c.translate(x,y);c.scale(scale,scale);c.strokeStyle=fill;c.lineWidth=13;c.lineCap='round';for(const r of [53,95,137]){c.beginPath();c.arc(0,60,r,-Math.PI*.76,-Math.PI*.24);c.stroke();}ellipse(c,0,42,12,12,fill);c.restore();}
export function checker(c,y,fill){c.fillStyle=fill;for(let row=0;row<2;row++)for(let i=0;i<24;i++)if((i+row)%2===0)c.fillRect(i*50,y+row*50,50,50);}
export function bouquet(c,x,y,scale=1){c.save();c.translate(x,y);c.scale(scale,scale);sprig(c,-70,40,.9,-.5);sprig(c,75,45,.8,.5);c.strokeStyle=palette.green;c.lineWidth=12;c.beginPath();c.moveTo(0,140);c.lineTo(0,-90);c.moveTo(-10,150);c.lineTo(-105,-30);c.moveTo(15,150);c.lineTo(110,-40);c.stroke();flower(c,0,-125,100);flower(c,-120,-45,72,palette.berry);flower(c,120,-55,82,palette.lilac);c.fillStyle=palette.coral;c.beginPath();c.moveTo(-90,95);c.lineTo(90,95);c.lineTo(65,230);c.quadraticCurveTo(0,260,-65,230);c.closePath();c.fill();c.strokeStyle=palette.cream;c.lineWidth=9;for(const xx of [-35,0,35]){c.beginPath();c.moveTo(xx,125);c.lineTo(xx*.65,215);c.stroke();}c.restore();}
