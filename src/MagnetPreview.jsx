import React,{useId} from 'react';

// A narrow printed wrap, not a separate frame. All lighting stays outside the
// artwork pipeline, so crops and print exports contain only the original photo.
// Smooth, one-way lighting avoids subpixel dark/light bands that alias when
// a small preview is rotated or scaled by the storefront.
function WrappedEdge(){
 const id=useId();
 return <svg className="magnet-wrapped-edge" viewBox="0 0 1000 1000" aria-hidden="true" focusable="false">
  <defs>
   <linearGradient id={`${id}-top`} x1="0" y1="0" x2="0" y2="1">
    <stop stopColor="#fff" stopOpacity=".55"/>
    <stop offset="1" stopColor="#fff" stopOpacity="0"/>
   </linearGradient>
   <linearGradient id={`${id}-left`}>
    <stop stopColor="#fff" stopOpacity=".32"/>
    <stop offset="1" stopColor="#fff" stopOpacity="0"/>
   </linearGradient>
   <linearGradient id={`${id}-right`}>
    <stop stopColor="#221e25" stopOpacity="0"/>
    <stop offset="1" stopColor="#221e25" stopOpacity=".35"/>
   </linearGradient>
   <linearGradient id={`${id}-bottom`} x1="0" y1="0" x2="0" y2="1">
    <stop stopColor="#211c25" stopOpacity="0"/>
    <stop offset="1" stopColor="#211c25" stopOpacity=".5"/>
   </linearGradient>
  </defs>
  <path d="M0 0H1000L986 15Q500 10 14 15Z" fill={`url(#${id}-top)`}/>
  <path d="M0 0L12 15Q8 500 12 985L0 1000Z" fill={`url(#${id}-left)`}/>
  <path d="M1000 0L990 15Q994 500 990 985L1000 1000Z" fill={`url(#${id}-right)`}/>
  <path d="M0 1000L12 987Q500 992 988 987L1000 1000Z" fill={`url(#${id}-bottom)`}/>
 </svg>;
}

export function MagnetPiece({children}){
 return <span className="magnet-preview-piece">{children}<WrappedEdge/></span>;
}

export function MagnetPreview({urls,columns=1,label}){
 return <div className="magnet-preview-grid" style={{gridTemplateColumns:`repeat(${columns},minmax(0,1fr))`}} role={label?'img':undefined} aria-label={label} aria-hidden={label?undefined:true}>{urls.map((url,i)=><MagnetPiece key={i}><img src={url} alt="" draggable={false}/></MagnetPiece>)}</div>;
}
