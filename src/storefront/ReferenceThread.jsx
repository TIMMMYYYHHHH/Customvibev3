import React from 'react';

// Decorative marks retain their own square viewBox rather than stretching
// with the layout. The continuous desktop thread is measured separately.
const mobilePaths = {
  0:'M45 0 C15 80 10 110 20 150 S40 250 10 290 S0 400 10 450 S25 520 10 560 S0 710 45 740 S230 720 360 800 C380 840 385 900 385 1000',
  500:'M385 0 C385 220 385 330 385 500 S385 820 385 920 C385 970 300 1000 230 1000',
  812:'M230 0 C120 0 10 20 10 80 C10 200 10 420 10 530 C10 590 110 592 200 592 C300 592 385 580 385 635 C385 750 385 850 385 1000',
  1025:'M385 0 C385 100 365 180 380 230 S380 430 385 500 S385 850 385 1000',
  1255:'M385 0 C385 250 385 500 385 750 S385 900 385 1000',
  1515:'M385 0 C385 180 385 300 385 500 S385 880 330 920 S220 930 170 955 S175 990 185 970 S240 955 315 995'
};
export function BrandDoodle({kind='rays',className='',style={}}) {
  return <svg className={'brand-doodle '+className} style={style} viewBox="0 0 48 48" fill="none" aria-hidden="true" focusable="false">
    {kind==='heart' ? <path d="M24 40 C20 35 6 25 6 15 C6 4 20 3 24 14 C28 3 42 4 42 15 C42 25 28 35 24 40 Z" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/> : <g stroke="currentColor" strokeWidth="5" strokeLinecap="round"><path d="M12 26 L5 22"/><path d="M23 17 L19 8"/><path d="M35 21 L40 13"/></g>}
  </svg>;
}

export default function ReferenceThread({from,to}) {
  const place=(x,y)=>({left:`${x/887*100}%`,top:`${(y-from)/(to-from)*100}%`});
  return <>
    {[[268,379],[468,915]].filter(([,y])=>y>=from&&y<to).map(([x,y])=><BrandDoodle key={y} kind="heart" className="thread-heart berry" style={{...place(x,y),'--turn':'-12deg'}}/>)}
    <svg className="reference-thread-mobile" viewBox="0 0 390 1000" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d={mobilePaths[from]} fill="none" stroke="#bd2256" strokeWidth="5" strokeLinecap="round" vectorEffect="non-scaling-stroke"/></svg>
  </>;
}
