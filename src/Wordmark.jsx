import React from 'react';
import './wordmark.css';
export default function Wordmark({logo=false}){return <span className={logo?'cv-brand-lockup':'cv-wordmark'}>{logo&&<img className="cv-puzzle-logo" src="/coming-soon/puzzle-logo-v2.png" width="72" height="48" alt=""/>}{logo?<Wordmark/>:<><span className="cv-brand-custom">Custom</span><span className="cv-brand-vibe">Vibe</span></>}</span>;}
