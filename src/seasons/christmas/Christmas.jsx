import React,{Children,cloneElement,isValidElement} from 'react';
import './christmas.css';

// Recompose the shared hero, retaining its content, prices, image components and links.
export function ChristmasHero({original,season}){
 const children=Children.toArray(original.props.children);
 const title=children.find(child=>child.props?.className==='chaos-title');
 const photos=children.filter(child=>child.props?.className?.startsWith('scattered'));
 const copy=Children.map(title.props.children,child=>{
  if(child.type!=='h1'||!season.copy?.headline?.trim())return child;
  const lines=season.copy.headline.split('\n');
  return cloneElement(child,{},lines.map((line,i)=><React.Fragment key={i}>{i>0&&<br/>}<span className={i===lines.length-1&&lines.length>1?'cv-christmas-emphasis':undefined}>{line}</span></React.Fragment>));
 });
 return <section className="cv-christmas-hero">
  {cloneElement(title,{className:'cv-christmas-copy'},copy)}
  <div className="cv-christmas-tree">
   <img className="cv-christmas-tree-scene" src="/assets/seasons/christmas/santa-world/hero-tree.webp" alt="" aria-hidden="true" fetchPriority="high"/>
   {photos.map((photo,i)=><div className={'cv-christmas-photo cv-christmas-photo-'+i} key={photo.key}>{Children.toArray(photo.props.children).filter(child=>isValidElement(child)&&!child.props.className?.includes('photo-accent'))}</div>)}
  </div>

 </section>;
}
const flakes=Array.from({length:28},(_,i)=>({left:(i*37)%100,delay:-(i%13),duration:15+(i%7)*2,size:i%6===0?16:3+(i%3)}));
export function ChristmasDecorations({season}){
 return <>
  <div className="cv-christmas-snow" aria-hidden="true">{flakes.map((f,i)=><span key={i} style={{left:f.left+'%',top:((i*23)%100)+'%',fontSize:f.size+'px',animationDelay:f.delay+'s',animationDuration:f.duration+'s'}}>{i%6===0?'❄':'·'}</span>)}</div>
  {season.campaign.motion&&<button className="cv-christmas-motion" aria-pressed={!!season.preferences.motionOff} onClick={()=>season.save({...season.preferences,motionOff:!season.preferences.motionOff})}>{season.preferences.motionOff?'Resume snow':'Pause snow'}</button>}
 </>;
}
