import React,{useLayoutEffect,useRef,useState} from 'react';

// A single, continuous spline is built in rendered page coordinates. Computing
// tangents AFTER mapping the sections removes corners caused by uneven heights.
const paths=[
 [[70,40],[75,80],[150,85],[225,88],[250,130],[240,180],[245,215],[282,250],[230,270],[230,223],[280,265],[340,320],[440,340],[560,335],[620,315],[638,278],[598,275],[598,315],[652,340],[680,390],[650,445],[590,480],[530,510],[510,543],[548,558],[556,516],[518,520],[493,562],[493,600],[550,630],[650,635],[720,635],[805,650],[850,690],[856,750],[820,790],[715,815],[635,810],[540,800],[440,808],[300,800],[185,778],[100,780],[35,800],[17,825],[28,842],[55,850]],
 [[660,850],[705,890],[730,935],[727,972],[704,1004],[681,968],[718,955],[752,989],[766,1014],[742,1028],[660,1030],[535,1009],[440,1000],[380,1005],[349,1020],[329,1057],[376,1065],[384,1027],[348,1014],[315,1045],[270,1090],[244,1150],[250,1205],[285,1234],[350,1253],[400,1275],[432,1299],[421,1332],[386,1321],[391,1287],[429,1298],[440,1320],[448,1370],[440,1410]]
];
// Uniform cubic B-splines have continuous curvature. Unlike interpolating
// splines, they round the control polygon instead of pinching through every point.
function spline(points){
 const pts=[points[0],points[0],...points,points.at(-1),points.at(-1)];
 const mix=(a,b,c)=>[(a[0]+4*b[0]+c[0])/6,(a[1]+4*b[1]+c[1])/6];
 let d=`M${points[0].join(' ')}`;
 for(let i=0;i<pts.length-3;i++){
  const [a,b,c,e]=pts.slice(i,i+4);
  const c1=[(2*b[0]+c[0])/3,(2*b[1]+c[1])/3];
  const c2=[(b[0]+2*c[0])/3,(b[1]+2*c[1])/3];
  d+=` C${c1.join(' ')} ${c2.join(' ')} ${mix(b,c,e).join(' ')}`;
 }
 return d;
}
// Sample the existing gestures, then smooth the whole route together so
// changes between the FAQ and contact waves have continuous curvature.
function smoothRoute(points,curves){
 const route=[...points];
 for(const [x1,y1,x2,y2,x3,y3] of curves){
  const [x0,y0]=route.at(-1);
  for(const t of [1/3,2/3,1]){
   const u=1-t;
   route.push([u*u*u*x0+3*u*u*t*x1+3*u*t*t*x2+t*t*t*x3,
    u*u*u*y0+3*u*u*t*y1+3*u*t*t*y2+t*t*t*y3]);
  }
 }
 return spline(route);
}
export default function SmoothThread(){
 const ref=useRef(null),[layout,setLayout]=useState(null);
 useLayoutEffect(()=>{
  const flow=ref.current.parentElement;
  const chapters=[...flow.querySelectorAll('[data-thread-from]')];
  const measure=()=>{
   const origin=flow.getBoundingClientRect();
   const sections=chapters.map(node=>{const box=node.getBoundingClientRect();return {from:Number(node.dataset.threadFrom),to:Number(node.dataset.threadTo),top:box.top-origin.top,height:box.height,left:box.left-origin.left,width:box.width}});
   const box=(selector,firstLine=false)=>{const node=flow.querySelector(selector);if(!node)return null;const range=document.createRange();range.selectNodeContents(node);const r=firstLine?(range.getClientRects()[0]||node.getBoundingClientRect()):selector==='.price-delivery'?range.getBoundingClientRect():node.getBoundingClientRect();return {left:r.left-origin.left,right:r.right-origin.left,top:r.top-origin.top,bottom:r.bottom-origin.top,width:r.width,height:r.height}};
   setLayout({width:origin.width,height:origin.height,sections,pricing:box('#photo-pricing'),priceNote:box('.price-delivery'),reviews:box('#reviews'),reviewIntro:box('.reviews-intro'),reviewContent:box('.reviews-content'),questions:box('#questions'),faqCopy:box('#questions>div:first-child'),faqList:box('#questions .shared-faqs'),contact:box('#contact'),contactIntro:box('.contact-intro'),contactForm:box('.contact-form'),storyHeading:box('.story-copy h2'),storyLine:box('.story-copy h2',true),storyPhoto:box('.story-photo .magnet-face')});
  };
  const observer=new ResizeObserver(measure);observer.observe(flow);chapters.forEach(node=>observer.observe(node));flow.querySelectorAll('#reviews,#questions,#contact,.contact-intro,.contact-form,.story-copy h2,.story-photo').forEach(node=>observer.observe(node));measure();
  return()=>observer.disconnect();
 },[]);
 const map=([x,y])=>{
  const section=layout.sections.find(s=>y>=s.from&&y<=s.to)||layout.sections[layout.sections.length-1];
  return [section.left+x/887*section.width,section.top+(y-section.from)/(section.to-section.from)*section.height];
 };
 // Route the lower thread around measured text rather than fixed page points.
 let lower='',story='';
 if(layout){
  const {pricing,priceNote,reviews,reviewIntro,reviewContent,questions,faqCopy,faqList,contact,contactIntro,contactForm,storyHeading:h,storyLine:line,storyPhoto:p}=layout;
  if(pricing&&priceNote&&reviews&&reviewIntro&&reviewContent&&questions&&faqCopy&&faqList&&contact&&contactIntro&&contactForm&&layout.width>800&&reviewContent.left>reviewIntro.right&&faqList.left>faqCopy.right&&contactForm.left>contactIntro.right){
   const [x,y]=map(paths[1].at(-1));
   const w=layout.width;
   const reviewGap=(reviewIntro.right+reviewContent.left)/2;
   const reviewBottom=Math.max(reviewIntro.bottom,reviewContent.bottom);
   const faqBottom=Math.max(faqCopy.bottom,faqList.bottom);
   const contactBottom=Math.max(contactIntro.bottom,contactForm.bottom);
   const faqGap=(faqCopy.right+faqList.left)/2;
   // Match the owner's attached Wide swoop reference. The FAQ strand exits
   // the first card, sweeps left below the heading, then enters contact.
   const reviewY=reviewBottom+25;
   lower=smoothRoute([
    [x,y],[x,priceNote.top-85],[priceNote.left-65,priceNote.top-65],
    [priceNote.left-45,priceNote.bottom+20],[reviewGap-20,reviewContent.top-35],
    [reviewGap,reviewContent.top+85],[reviewContent.left+180,reviewContent.top+155],
    [reviewContent.right-120,reviewContent.top+160],[reviewContent.left+110,reviewBottom-30]
   ],[
    [reviewGap,reviewY,w*.34,reviewY-20,w*.23,reviewY],
    [w*.09,reviewY+35,w*.28,reviewY+65,faqGap,reviewY+65],
    [faqGap+65,reviewY+65,faqList.left+45,faqList.top+30,faqList.left+80,faqList.top+35]
   ]);
   // Separate the hidden join inside the first opaque card so smoothing
   // cannot pull the visible reference curve back between the FAQ rows.
   const bendY=Math.max(faqCopy.bottom+105,faqBottom-10);
   lower+=` M${faqList.left+8} ${faqList.top+40}`+
    ` C${faqList.left+35} ${faqList.top+125} ${w*.15} ${bendY-110} ${w*.15} ${bendY}`+
    ` C${w*.15} ${bendY+105} ${contactForm.left-110} ${contactForm.top-55} ${contactForm.left+25} ${contactForm.top+15}`;
   // A single shallow U starts beneath the handwritten contact sign-off.
   lower+=` M${contactIntro.left+contactIntro.width*.43} ${contactIntro.bottom-10}`+
    ` C${contactIntro.left+contactIntro.width*.67} ${contactBottom+80} ${contactForm.right-350} ${contactBottom+85} ${contactForm.right-100} ${contactBottom}`;

  }
  if(reviews&&questions&&contact&&contactForm&&!lower){
   const w=layout.width;
   lower=[
    `M${w*.9} ${reviews.top-4} C${w*.7} ${reviews.top+34} ${w*.46} ${reviews.top-16} ${w*.3} ${reviews.top+20}`,
    `M${w*.18} ${questions.top-12} C${w*.28} ${questions.top+34} ${w*.55} ${questions.top+28} ${w*.8} ${questions.top-10}`,
    `M${w*.82} ${contact.top-12} C${w*.58} ${contact.top+34} ${w*.34} ${contact.top-22} ${w*.2} ${contact.top+10}`,
    `M${w*.15} ${contactForm.bottom+20} C${w*.32} ${contactForm.bottom-3} ${w*.52} ${contactForm.bottom+65} ${w*.88} ${contactForm.bottom+20}`
   ].join(' ');
  }
  if(h&&p){
   const left=h.right+16,right=p.left-14,gap=right-left;
   if(gap>0){
    const y=h.top+h.height*.55;
    const edge=p.left+100;
    // Keep the original arrival at the words. The short strand continues
    // into the magnet with no upper branch at the join.
    if(line){
     const startX=line.right+14,startY=line.bottom-14;
     const span=edge-startX;
     if(span>80){
      // One continuous-curvature spline keeps the small dip and removes the
      // change in curvature where the former two-piece connector joined.
      story=spline([
       [startX,startY],[startX+span*.2,startY+35],
       [startX+span*.4,startY+22],[startX+span*.53,startY+15],
       [startX+span*.76,y+32],[edge,y+40]
      ]);
     }
    }
   }
  }
 }
 return <><svg ref={ref} className="smooth-thread" width={layout?.width||0} height={layout?.height||0} aria-hidden="true" focusable="false">
  {layout&&[...paths.map(points=>spline(points.map(map))),story].filter(Boolean).map((d,i)=><path key={i} d={d} fill="none" stroke="#bd2256" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>)}
 </svg><svg className="lower-thread" width={layout?.width||0} height={layout?.height||0} aria-hidden="true" focusable="false"><path d={lower} fill="none" stroke="#bd2256" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/></svg></>;
}
