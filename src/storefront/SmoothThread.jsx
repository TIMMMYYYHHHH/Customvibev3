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
export default function SmoothThread(){
 const ref=useRef(null),[layout,setLayout]=useState(null);
 useLayoutEffect(()=>{
  const flow=ref.current.parentElement;
  const chapters=[...flow.querySelectorAll('[data-thread-from]')];
  const measure=()=>{
   const origin=flow.getBoundingClientRect();
   const sections=chapters.map(node=>{const box=node.getBoundingClientRect();return {from:Number(node.dataset.threadFrom),to:Number(node.dataset.threadTo),top:box.top-origin.top,height:box.height,left:box.left-origin.left,width:box.width}});
   const box=selector=>{const node=flow.querySelector(selector);if(!node)return null;const range=document.createRange();range.selectNodeContents(node);const r=selector==='.price-delivery'?range.getBoundingClientRect():node.getBoundingClientRect();return {left:r.left-origin.left,right:r.right-origin.left,top:r.top-origin.top,bottom:r.bottom-origin.top,width:r.width,height:r.height}};
   setLayout({width:origin.width,height:origin.height,sections,pricing:box('#photo-pricing'),priceNote:box('.price-delivery'),reviews:box('#reviews'),reviewIntro:box('.reviews-intro'),reviewContent:box('.reviews-content'),questions:box('#questions'),faqCopy:box('#questions>div:first-child'),faqList:box('#questions .shared-faqs'),contact:box('#contact'),contactIntro:box('.contact-intro'),contactForm:box('.contact-form'),storyHeading:box('.story-copy h2'),storyPhoto:box('.story-photo .magnet-face')});
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
  const {pricing,priceNote,reviews,reviewIntro,reviewContent,questions,faqCopy,faqList,contact,contactIntro,contactForm,storyHeading:h,storyPhoto:p}=layout;
  if(pricing&&priceNote&&reviews&&reviewIntro&&reviewContent&&questions&&faqCopy&&faqList&&contact&&contactIntro&&contactForm&&layout.width>800){
   const [x,y]=map(paths[1].at(-1));
   const w=layout.width;
   const reviewGap=(reviewIntro.right+reviewContent.left)/2;
   const reviewBottom=Math.max(reviewIntro.bottom,reviewContent.bottom);
   const faqBottom=Math.max(faqCopy.bottom,faqList.bottom);
   const contactBottom=Math.max(contactIntro.bottom,contactForm.bottom);
   const faqGap=(faqCopy.right+faqList.left)/2;
   const contactGap=(contactIntro.right+contactForm.left)/2;
   const loop=(cx,cy,rx=85,ry=65)=>[[cx+rx,cy],[cx,cy+ry],[cx-rx,cy],[cx,cy-ry],[cx+rx,cy]];
   // Like the photo chapters above, the thread passes behind solid objects,
   // emerges in the open composition, then doubles back in generous loops.
   // The text itself is never masked or crossed.
   lower=spline([
    [x,y],[x,priceNote.top-85],[priceNote.left-65,priceNote.top-65],
    [priceNote.left-45,priceNote.bottom+20],[reviewGap-20,reviewContent.top-35],
    [reviewGap,reviewContent.top+85],[reviewContent.left+180,reviewContent.top+155],[reviewContent.right-120,reviewContent.top+160],
    [reviewContent.left+110,reviewIntro.bottom+30],[reviewGap,reviewIntro.bottom+45],
    ...loop(w*.25,reviewIntro.bottom+90),[faqGap,questions.top+15],
    [faqList.left+110,faqList.top+80],[faqList.right-120,faqList.top+130],
    [faqList.left+140,faqCopy.bottom+45],[faqGap,faqCopy.bottom+65],
    ...loop(w*.20,Math.max(faqCopy.bottom+85,faqBottom+5),65,80),
    [contactGap,contact.top+25],[contactForm.left+150,contactForm.top+85],
    [contactForm.right-120,contactForm.top+160],[contactForm.left+110,contactIntro.bottom+35],
    [contactGap,contactIntro.bottom+50],...loop(w*.34,contactBottom+15,75,50),
    [w*.48,contactBottom+65],[w*.65,contactBottom+50],[w*.76,contactBottom+30]
   ]);

  }
  if(reviews&&questions&&contact&&contactForm&&layout.width<=800){
   const w=layout.width;
   const swoop=(top,start=.9,end=.3)=>`M${w*start} ${top} C${w*(start+(end-start)/3)} ${top+38} ${w*(start+2*(end-start)/3)} ${top-8} ${w*end} ${top+24}`;
   lower=[swoop(reviews.top-4),swoop(questions.top-18,.2,.8),swoop(contact.top-18,.8,.3),swoop(contactForm.bottom+15,.15,.9)].join(' ');
  }
  if(h&&p){
   const left=h.right+16,right=p.left-14,gap=right-left;
   if(gap>32){
    const y=h.top+h.height*.55;
    story=`M${p.left+100} ${y-55} C${left} ${y-70} ${left} ${y+35} ${p.left+100} ${y+40}`;
   }
  }
 }
 return <><svg ref={ref} className="smooth-thread" width={layout?.width||0} height={layout?.height||0} aria-hidden="true" focusable="false">
  {layout&&[...paths.map(points=>spline(points.map(map))),story].filter(Boolean).map((d,i)=><path key={i} d={d} fill="none" stroke="#bd2256" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>)}
 </svg><svg className="lower-thread" width={layout?.width||0} height={layout?.height||0} aria-hidden="true" focusable="false"><path d={lower} fill="none" stroke="#bd2256" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/></svg></>;
}
