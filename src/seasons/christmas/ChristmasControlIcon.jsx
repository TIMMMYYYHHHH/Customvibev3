import React,{useId,useLayoutEffect,useRef,useState} from 'react';
import './control.css';
import {restingFace,faceAt,eyePath} from './santa-motion.mjs';

// One continuous character: eyes, gaze and hat are articulated over one texture.
const REST_ON='translateY(0px) rotate(0deg) scale(1,1)';
const REST_OFF='translateY(2px) rotate(-6deg) scale(1,1)';

// This control remains available when the visitor turns Christmas off.
export function ChristmasControlIcon({season}){
 const previous=useRef(season.visible);
 const character=useRef(null),motion=useRef(null);
 const [action,setAction]=useState(null);
 const rigId=useId().replace(/:/g,'');
 const face=useRef(restingFace(season.visible)),faceRequest=useRef(null);
 const leftEye=useRef(null),rightEye=useRef(null),leftGlint=useRef(null),rightGlint=useRef(null);
 const head=useRef(null),gaze=useRef(null),hat=useRef(null);
 const paintFace=value=>{
  face.current=value;
  leftEye.current.setAttribute('d',eyePath(440,value.left));
  rightEye.current.setAttribute('d',eyePath(740,value.right));
  leftGlint.current.setAttribute('opacity',value.left);
  rightGlint.current.setAttribute('opacity',value.right);
  head.current.style.transform=`perspective(180px) rotateY(${value.turn*28}deg)`;
  gaze.current.setAttribute('transform',`translate(${value.turn*55} 0)`);
  hat.current.setAttribute('transform',`translate(590 430) skewX(${value.hat}) translate(-590 -430)`);
 };
 useLayoutEffect(()=>{
  const wasVisible=previous.current;
  previous.current=season.visible;
  if(!season.motionAllowed){
   motion.current?.cancel();
   motion.current=null;
   cancelAnimationFrame(faceRequest.current);
   paintFace(restingFace(season.visible));
   setAction(null);
   return;
  }
  if(wasVisible===season.visible){paintFace(face.current);return;}
  const element=character.current;
  // An interrupted journey starts at the current rendered position, not frame zero.
  const from=motion.current?.playState==='running'
   ?getComputedStyle(element).transform
   :(wasVisible?REST_ON:REST_OFF);
  motion.current?.cancel();
  const on=season.visible;
  cancelAnimationFrame(faceRequest.current);
  const faceFrom={...face.current},started=performance.now();
  const moveFace=now=>{
   const progress=Math.min(1,(now-started)/1500);
   paintFace(faceAt(on,progress,faceFrom));
   if(progress<1)faceRequest.current=requestAnimationFrame(moveFace);
  };
  faceRequest.current=requestAnimationFrame(moveFace);
  const frames=on?[
   {offset:0,transform:from},
   {offset:.42,transform:'translateY(-2px) rotate(7deg) scale(1,1)'},
   {offset:.6,transform:'translateY(3px) rotate(0deg) scale(1.1,.86)'},
   {offset:.76,transform:'translateY(2px) rotate(-3deg) scale(1.12,1.12)'},
   {offset:.9,transform:'translateY(1px) rotate(1deg) scale(.98,.98)'},
   {offset:1,transform:REST_ON},
  ]:[
   {offset:0,transform:from},
   {offset:.42,transform:'translateY(-1px) rotate(-9deg) scale(1,1)'},
   {offset:.6,transform:'translateY(3px) rotate(-6deg) scale(1.04,.96)'},
   {offset:.82,transform:'translateY(1px) rotate(-5deg) scale(1,1)'},
   {offset:1,transform:REST_OFF},
  ];
  const animation=element.animate(frames,{duration:1500,easing:'ease-in-out'});
  motion.current=animation;
  setAction(on?'on':'off');
  animation.onfinish=()=>{
   if(motion.current!==animation)return;
   motion.current=null;
   setAction(null);
  };
 },[season.visible,season.motionAllowed]);
 useLayoutEffect(()=>()=>{motion.current?.cancel();cancelAnimationFrame(faceRequest.current);},[]);
 return <span className="cv-christmas-toggle-icon" aria-hidden="true" data-state={season.visible?'on':'off'} data-motion={season.motionAllowed?'on':'off'} data-action={action||undefined}>
  <span className="cv-christmas-switch-scene">
   <span className="cv-christmas-switch-forest"><i/><i/><i/></span>
   <span className="cv-christmas-switch-moon"/>
   <span className="cv-christmas-switch-stars"><i/><i/><i/></span>
   <span className="cv-christmas-switch-snow"><i/><i/><i/></span>
   <span className="cv-christmas-switch-bank"/>
  </span>
  <span className="cv-christmas-hat-thumb">
   <span className="cv-christmas-hat-character" ref={character}>
    <svg className="cv-christmas-santa-character" ref={head} viewBox="0 0 1254 1254" focusable="false">
     <defs>
      <clipPath id={`${rigId}-hat`}><rect width="1254" height="430"/></clipPath>
      <clipPath id={`${rigId}-head`}><rect y="429" width="1254" height="825"/></clipPath>
      <radialGradient id={`${rigId}-nose`} cx="32%" cy="25%" r="80%"><stop stopColor="#ffd3af"/><stop offset=".6" stopColor="#efa282"/><stop offset="1" stopColor="#cb7765"/></radialGradient>
     </defs>
     <image href="/assets/seasons/christmas/santa-rig-base.webp" width="1254" height="1254" clipPath={`url(#${rigId}-head)`}/>
     <g ref={hat}><g clipPath={`url(#${rigId}-hat)`}><image href="/assets/seasons/christmas/santa-rig-base.webp" width="1254" height="1254"/></g></g>
     <g ref={gaze}>
      <g fill="#281919" stroke="#42251e" strokeWidth="8" strokeLinejoin="round">
       <path ref={leftEye} d={eyePath(440,face.current.left)}/>
       <path ref={rightEye} d={eyePath(740,face.current.right)}/>
      </g>
      <circle ref={leftGlint} cx="431" cy="661" r="9" fill="#fff9ef" opacity={face.current.left}/>
      <circle ref={rightGlint} cx="731" cy="661" r="9" fill="#fff9ef" opacity={face.current.right}/>
      <ellipse cx="590" cy="740" rx="65" ry="58" fill={`url(#${rigId}-nose)`}/>
     </g>
    </svg>
   </span>
  </span>
  <span className="cv-christmas-switch-spark" key={`spark-${action||'rest'}`}><i/><i/><i/></span>
 </span>;
}
