import React from 'react';
import {policies} from './policies.mjs';
const sectionId=title=>title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/-$/,'');
export default function PolicyPage({page}){
 const policy=policies[page];
 return <main className="section policy-page">
  <p className="eyebrow">GOOD TO KNOW</p><h1>{policy.title}</h1>
  {page==='privacy'&&<nav className="policy-links" aria-label="Privacy topics"><a href="#cookies-and-your-choices">Cookies & your choices</a><a href="#optional-maps">Optional maps</a><a href="#website-measurement">Website measurement</a><a href="#your-rights">Privacy requests</a></nav>}
  {policy.sections.map(([title,text,links=[]])=><section key={title} id={sectionId(title)}><h2>{title}</h2>{text.split('\n').map((paragraph,i)=><p key={i}>{paragraph}</p>)}{links.length>0&&<ul className="policy-links">{links.map(([label,href])=><li key={href}><a href={href}>{label}</a></li>)}</ul>}</section>)}
  <a className="text-button" href="/">Back to CustomVibe</a>
 </main>;
}
