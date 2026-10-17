// Scene geometry changes presentation only. These source image files are copied
// byte-for-byte from the original product cutouts, never image-generated.
const products = {
 sunglasses: [114,112,1024,1005],
 together: [101,109,1045,1013],
 beach: [101,101,1048,1035],
 wedding: [152,146,948,954],
};
const scenes = {
 desktop: {width:1920,height:1080, placements:[
  ['sunglasses',[615,527],[908,574],[563,797]],
  ['together',[1036,468],[1291,496],[1006,709]],
  ['beach',[1357,512],[1618,547],[1328,762]],
  ['wedding',[1117,754],[1379,788],[1088,996]],
 ], fingers:'M 517 646 C 548 625 572 625 587 644 C 602 659 597 680 582 697 L 554 724 L 505 690 Z M 817 848 L 815 803 C 814 782 828 769 843 771 C 868 772 880 790 884 815 L 895 890 L 818 895 Z M 603 524 L 622 495 C 637 492 647 507 636 528 L 621 542 Z'},
 mobile: {width:1024,height:1280, placements:[
  ['sunglasses',[193,451],[482,507],[129,722]],
  ['together',[493,171],[782,206],[458,442]],
  ['beach',[598,502],[906,549],[554,796]],
  ['wedding',[535,841],[823,884],[489,1110]],
 ], fingers:'M 65 562 C 89 545 110 545 126 552 C 151 560 169 577 162 598 C 157 617 139 628 116 637 L 66 619 Z M 341 828 C 349 806 366 785 386 777 C 406 768 426 776 432 792 C 439 809 423 832 405 845 L 376 879 Z M 171 454 L 190 425 L 234 424 C 244 429 241 444 230 457 Z'},
};
export function renderScene(name){
 const {width,height,placements,fingers}=scenes[name];
 const url=`/coming-soon/scene-${name}-v3.webp`;
 const photos=placements.map(([key,tl,tr,bl])=>{
  const [x,y,w,h]=products[key];
  const matrix=[(tr[0]-tl[0])/1000,(tr[1]-tl[1])/1000,(bl[0]-tl[0])/1000,(bl[1]-tl[1])/1000,...tl];
  return `<g transform="matrix(${matrix.join(' ')})"><svg width="1000" height="1000" viewBox="${x} ${y} ${w} ${h}" preserveAspectRatio="none" overflow="hidden"><image data-original-photo="${key}" href="/coming-soon/original-${key}.webp" width="1254" height="1254"/></svg></g>`;
 }).join('');
 return `<svg class="scene scene-${name}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><clipPath id="fingers-${name}"><path d="${fingers}"/></clipPath></defs><image href="${url}" width="${width}" height="${height}"/>${photos}<image href="${url}" width="${width}" height="${height}" clip-path="url(#fingers-${name})"/></svg>`;
}
