// Original files remain byte-identical. Only the photograph inside each product
// rim is projected into the scene; the scene supplies the single physical edge.
const products = {
 sunglasses: [128,127,998,970], together: [113,120,1023,988],
 beach: [114,128,1029,998], wedding: [164,157,923,929],
};
export const scenes = {
 desktop: {width:1920,height:1080, placements:[
  ['sunglasses',[[618,530],[903,577],[854,837],[567,792]]],
  ['together',[[1040,472],[1286,499],[1262,736],[1010,705]]],
  ['beach',[[1359,514],[1615,549],[1590,795],[1330,760]]],
  ['wedding',[[1120,758],[1374,792],[1346,1025],[1092,990]]],
 ], fingers:'M 500 450 H 670 V 506 L 638 523 C 631 536 620 546 608 553 L 500 590 Z M 500 620 L 578 628 C 592 634 599 649 596 668 C 594 682 587 692 577 703 L 500 740 Z M 813 865 L 815 815 C 815 796 821 782 835 777 C 848 772 863 779 873 790 L 910 830 V 920 H 805 Z'},
 mobile: {width:1024,height:1280, placements:[
  ['sunglasses',[[196,456],[477,510],[417,771],[133,718]]],
  ['together',[[496,175],[777,209],[747,480],[462,438]]],
  ['beach',[[600,505],[904,551],[859,847],[556,794]]],
  ['wedding',[[538,845],[818,887],[777,1150],[494,1106]]],
 ], fingers:'M 100 390 H 255 V 435 C 246 447 232 453 217 456 L 175 470 L 100 490 Z M 50 530 L 115 542 C 140 547 162 564 166 580 C 170 599 157 616 136 628 L 50 670 Z M 325 870 C 343 831 364 800 384 782 C 396 772 414 768 427 777 C 441 789 437 807 423 823 L 400 870 L 355 910 Z'},
};
// Homography maps all four corners, unlike an affine transform that can align
// only three and caused the previous doubled edges.
export function projectiveMatrix([p0,p1,p2,p3]){
 const [x0,y0]=p0,[x1,y1]=p1,[x2,y2]=p2,[x3,y3]=p3;
 const dx1=x1-x2,dx2=x3-x2,dx3=x0-x1+x2-x3;
 const dy1=y1-y2,dy2=y3-y2,dy3=y0-y1+y2-y3;
 const den=dx1*dy2-dx2*dy1;
 const g=(dx3*dy2-dx2*dy3)/den,h=(dx1*dy3-dx3*dy1)/den;
 return [(x1-x0+g*x1)/1000,(y1-y0+g*y1)/1000,0,g/1000,
 (x3-x0+h*x3)/1000,(y3-y0+h*y3)/1000,0,h/1000,
 0,0,1,0,x0,y0,0,1];
}
export function projectPoint(m,[x,y]){
 const d=m[3]*x+m[7]*y+1;
 return [(m[0]*x+m[4]*y+m[12])/d,(m[1]*x+m[5]*y+m[13])/d];
}
function affine(source,target){
 const [[x0,y0],[x1,y1],[x2,y2]]=source;
 const det=(x1-x0)*(y2-y0)-(x2-x0)*(y1-y0);
 const solve=axis=>{
  const d1=target[1][axis]-target[0][axis],d2=target[2][axis]-target[0][axis];
  const a=(d1*(y2-y0)-d2*(y1-y0))/det;
  const b=((x1-x0)*d2-(x2-x0)*d1)/det;
  return [a,b,target[0][axis]-a*x0-b*y0];
 };
 const [a,c,e]=solve(0),[b,d,f]=solve(1);return [a,b,c,d,e,f];
}
// A small native-SVG mesh avoids foreignObject/3D rasterisation artefacts on
// small screens while retaining four-corner perspective. Images remain original.
export function renderScene(name){
 const {width,height,placements,fingers}=scenes[name];
 const url=`/coming-soon/scene-${name}-v3.webp`;
 let defs='',photos='';
 for(const [key,quad] of placements){
  const [x,y,w,h]=products[key],id=`${name}-${key}`,m=projectiveMatrix(quad);
  defs+=`<symbol id="source-${id}" viewBox="${x} ${y} ${w} ${h}" preserveAspectRatio="none"><image data-original-photo="${key}" href="/coming-soon/original-${key}.webp" width="1254" height="1254"/></symbol><clipPath id="outline-${id}"><polygon points="${quad.map(p=>p.join(',')).join(' ')}"/></clipPath>`;
  let mesh='';
  for(let row=0;row<4;row++)for(let col=0;col<4;col++){
   const sx=col*250,sy=row*250;
   const triangles=[[[sx,sy],[sx+250,sy],[sx,sy+250]],[[sx+250,sy],[sx+250,sy+250],[sx,sy+250]]];
   triangles.forEach((triangle,index)=>{
    const tile=`${id}-${row}-${col}-${index}`;
    const centroid=[triangle.reduce((n,p)=>n+p[0],0)/3,triangle.reduce((n,p)=>n+p[1],0)/3];
    const expanded=triangle.map(p=>p.map((v,i)=>centroid[i]+(v-centroid[i])*1.004));
    defs+=`<clipPath id="tile-${tile}"><polygon points="${expanded.map(p=>p.join(',')).join(' ')}"/></clipPath>`;
    const matrix=affine(triangle,triangle.map(p=>projectPoint(m,p)));
    mesh+=`<g transform="matrix(${matrix.join(' ')})"><use href="#source-${id}" width="1000" height="1000" clip-path="url(#tile-${tile})"/></g>`;
   });
  }
  photos+=`<g clip-path="url(#outline-${id})">${mesh}</g>`;
 }
 return `<svg class="scene scene-${name}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs>${defs}<mask id="photo-visibility-${name}" maskUnits="userSpaceOnUse" x="0" y="0" width="${width}" height="${height}"><rect width="${width}" height="${height}" fill="white"/><path d="${fingers}" fill="black"/></mask></defs><image href="${url}" width="${width}" height="${height}"/><g mask="url(#photo-visibility-${name})">${photos}</g></svg>`;
}
