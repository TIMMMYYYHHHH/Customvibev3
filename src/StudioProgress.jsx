import React from 'react';
export function StudioProgress({step,hasPhotos,busy,onStep}){
 return <nav className="studio-progress" aria-label="Design progress"><ol>{[['make','Make'],['review','Basket'],['delivery','Checkout']].map(([id,label],i)=><li key={id} className={step===id?'current':''}><button aria-current={step===id?'step':undefined} disabled={busy||(i>0&&!hasPhotos)} onClick={()=>onStep(id)}><span>{i+1}</span>{label}</button></li>)}</ol></nav>;
}
