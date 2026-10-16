import React,{useLayoutEffect,useRef,useState} from 'react';

// Mobile gets its own composition. Follow actual content gaps, never stretch a
// desktop path along the height of a chapter or run a border down the screen.
const joins=[
 ['.chaos-hero','.collections .section-heading'],
 ['.more-collections','.story-copy'],
 ['.story-image','.make-it>div'],
 ['.make-it>div','.chaos-pricing .section-heading'],
 ['.price-delivery','.reviews-intro'],
 ['.reviews-content','#questions>div:first-child'],
 ['#questions .shared-faqs','.contact-intro']
];
export default function MobileThread(){
 const ref=useRef(null),[drawing,setDrawing]=useState(null);
 useLayoutEffect(()=>{
  const flow=ref.current.parentElement,media=matchMedia('(max-width: 900px)');
  let frame=0;
  const measure=()=>{
   if(!media.matches){setDrawing(null);return;}
   const root=flow.getBoundingClientRect(),w=root.width;
   const lines=joins.flatMap(([a,b],i)=>{
    const from=flow.querySelector(a)?.getBoundingClientRect(),to=flow.querySelector(b)?.getBoundingClientRect();
    if(!from||!to)return [];
    const y1=from.bottom-root.top+12,y2=to.top-root.top-18;
    if(y2-y1<28)return [];
    const left=i%2===0,x1=w*(left?.72:.28),x2=w*(left?.28:.72),mid=(y1+y2)/2;
    return [`M${x1} ${y1} C${x1} ${mid+22} ${x2} ${mid-22} ${x2} ${y2}`];
   });
   setDrawing({width:w,height:root.height,lines});
  };
  const schedule=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(measure)};
  const observer=new ResizeObserver(schedule);observer.observe(flow);
  joins.flat().forEach(selector=>{const node=flow.querySelector(selector);if(node)observer.observe(node)});
  media.addEventListener('change',schedule);schedule();
  return()=>{observer.disconnect();media.removeEventListener('change',schedule);cancelAnimationFrame(frame)};
 },[]);
 return <svg ref={ref} className="mobile-thread" width={drawing?.width||0} height={drawing?.height||0} aria-hidden="true" focusable="false">{drawing?.lines.map((d,i)=><path key={i} d={d} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>)}</svg>;
}
