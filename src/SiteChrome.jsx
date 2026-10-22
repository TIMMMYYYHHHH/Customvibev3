import {MAGNET_FACE_CM} from './print-dimensions.mjs';
import Wordmark from './Wordmark.jsx';
import {SeasonControl} from './seasons/runtime.jsx';
import React,{useState,useEffect,useLayoutEffect,useRef} from 'react';
import {useContent} from './content/ContentProvider';
export {HelpPage} from './HelpContent';
import {Bag,List,X} from '@phosphor-icons/react';

export function SiteHeader({page,count=0,onSectionNavigate}){
 const {content}=useContent();
 const [open,setOpen]=useState(false);
 const header=useRef(null),menuButton=useRef(null);
 useEffect(()=>{if(open)header.current?.querySelector('nav a')?.focus();},[open]);
 useLayoutEffect(()=>{
  const measure=()=>document.documentElement.style.setProperty('--site-header-height',`${header.current.getBoundingClientRect().height}px`);
  measure();const observer=new ResizeObserver(measure);observer.observe(header.current);
  return()=>observer.disconnect();
 },[open]);
 useEffect(()=>{const close=()=>setOpen(false);addEventListener('popstate',close);return()=>removeEventListener('popstate',close)},[]);
 return <header className="unified-header" ref={header} onKeyDown={event=>{if(open&&event.key==='Escape'){event.preventDefault();setOpen(false);menuButton.current?.focus();}}}><div className="shipping-banner"><span>R69 PUDO locker delivery <span aria-hidden="true">·</span> Free on orders of R1,000 or more</span><a href="/shipping">Shipping details</a></div><div className="header-inner"><a className="site-wordmark" href="/" aria-label="CustomVibe home"><Wordmark logo/></a><nav id="site-navigation" className={open?'is-open':''} aria-label="Main navigation" onClick={()=>setOpen(false)}>{[['home/collections','Collections'],['home/the-story','Our story'],['home/how-it-works','How it works'],['home/photo-pricing','Pricing'],['home/questions','FAQs'],['contact','Contact us']].map(([route,label])=><a key={route} href={route.startsWith('home/')?'/#'+route.slice(5):'/'+route} onClick={e=>{if(e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;e.preventDefault();setOpen(false);onSectionNavigate(route);}}>{label}</a>)}</nav><SeasonControl/><a className="site-basket" href="/basket" aria-label={`Basket with ${count} ${count===1?'magnet':'magnets'}`} aria-current={page==='basket'?'page':undefined}><Bag size={22}/><span>Basket</span><b aria-hidden="true">{count}</b></a><a className="site-create" href="/studio">Create yours</a><button ref={menuButton} className="site-menu" aria-label={open?'Close navigation':'Open navigation'} aria-expanded={open} aria-controls="site-navigation" onClick={()=>setOpen(!open)}>{open?<X size={24}/>:<List size={24}/>}</button></div></header>;
}
export function SiteFooter(){const {content}=useContent();return <footer className="unified-footer"><div className="footer-map"><div className="footer-brand"><a className="site-wordmark" href="/" aria-label="CustomVibe home"><Wordmark logo/></a><p className="footer-slogan">Find your tribe at <span className="cv-brand-name"><Wordmark/>.</span></p><p>Your people. Your places. Your everyday.<br/>Made personal in little {MAGNET_FACE_CM} cm squares.</p><span className="footer-hand">Memories stick here.</span></div><nav aria-label="Explore CustomVibe"><h2>Find your favourites</h2><a href="/studio">Photo magnets</a><a href="/puzzle">Picture puzzles</a><a href="/collections">Magnet collections</a><a href="/basket">Your basket</a></nav><nav aria-label="CustomVibe help"><h2>Good to know</h2><a href="/privacy">Privacy policy</a><a href="/privacy#cookies-and-your-choices">Cookies & your choices</a><a href="/terms">Terms and conditions</a><a href="/returns">Returns and refunds</a><a href="/shipping">Shipping and delivery</a><a href="/contact">Contact us</a><a href="/#photo-pricing">Photo magnet pricing</a><a href="/help#delivery">PUDO delivery</a><a href="/help">Questions & answers</a><a href="/help#photos">Your photos & privacy</a></nav><nav aria-label="About CustomVibe"><h2>A little about us</h2><a href="/#the-story">Our little story</a><a href="/#reviews">Reviews</a><p>Handmade in Durban.<br/>Made for your kind of people.</p></nav></div><div className="footer-bottom"><span>© {new Date().getFullYear()} CustomVibe</span><span>From our tribe to yours.</span><a href="/help#photos">About your photos</a><a href="/third-party-notices.txt">Third-party notices</a></div></footer>}
