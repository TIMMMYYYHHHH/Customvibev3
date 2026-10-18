// A continuous facial rig, never a sequence of replacement pictures.
export const restingFace=on=>({left:on?1:0,right:0,turn:on?0:-.12,hat:on?0:-3});
export function faceAt(on,progress,from){
 const frames=on?[
  [0,from],[.18,{left:1,right:1,turn:1,hat:-8}],
  [.55,{left:1,right:1,turn:1,hat:-5}],
  [.72,{left:1,right:1,turn:.15,hat:6}],
  [.88,{left:1,right:0,turn:0,hat:-3}],[1,restingFace(true)],
 ]:[
  [0,from],[.18,{left:1,right:1,turn:-1,hat:8}],
  [.57,{left:1,right:1,turn:-1,hat:4}],
  [.82,{left:.3,right:.3,turn:-.25,hat:-1}],[1,restingFace(false)],
 ];
 const t=Math.min(1,Math.max(0,progress));
 const i=frames.findIndex(([at])=>at>=t);
 if(i===0)return {...from};
 const [a,start]=frames[i-1], [b,end]=frames[i];
 const u=(t-a)/(b-a),ease=u*u*(3-2*u);
 return Object.fromEntries(Object.keys(end).map(key=>[key,start[key]+(end[key]-start[key])*ease]));
}
export function eyePath(cx,open){
 const y=675,r=36,upper=21-73*open,lower=21+31*open;
 return `M ${cx-r} ${y} C ${cx-r/2} ${y+upper} ${cx+r/2} ${y+upper} ${cx+r} ${y} C ${cx+r/2} ${y+lower} ${cx-r/2} ${y+lower} ${cx-r} ${y} Z`;
}
