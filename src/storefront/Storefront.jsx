import {MAGNET_FACE_CM} from '../print-dimensions.mjs';
import Wordmark from '../Wordmark.jsx';
import {SeasonSlot,SeasonText} from '../seasons/runtime.jsx';
import React,{useState,useEffect,useRef,useContext} from 'react';

import '../fonts.css';

import {demoPhoto,renderPhoto} from '../artwork';
import {MagnetPreview} from '../MagnetPreview';
import CollectionCard from './CollectionCard';
import './storefront.css';
import ReferenceThread,{BrandDoodle} from './ReferenceThread';
import Reviews from './Reviews';
import Contact from './Contact';
import SmoothThread from './SmoothThread';
import MobileThread from './MobileThread';
import MagnetCollections from './MagnetCollections';
import ProductDetails from './ProductDetails';
import {useContent} from '../content/ContentProvider';
import {defaultContent} from '../content/model.mjs';
import {money,photoPrice} from '../commerce.mjs';
import {FAQList} from '../HelpContent';
import {ImageSquare, Crop, Magnet} from '@phosphor-icons/react';

const ShopContext=React.createContext({});
const ROOT='/assets/';
const photos=[
 ['05-sunglasses-square.webp','Sunglasses','A couple wearing sunglasses on a glossy square photo magnet'],
 ['02-wedding-square.webp','Wedding','A wedding portrait on a glossy square photo magnet'],
 ['03-beach-square.webp','Beach','A couple at the beach on a glossy square photo magnet'],
 ['04-pink-group-square.webp','Together','Three people in pink and white on a glossy square photo magnet'],
 ['01-restaurant-square.webp','Date night','A couple at a restaurant on a glossy square photo magnet']
];
const asset=i=>ROOT+'cutouts/'+photos[i][0];
// Trim only transparent canvas in the layout, keeping every supplied pixel intact.
const magnetBounds=[[116,109,1022],[149,142,964],[97,101,1059],[100,107,1054],[104,104,1049]];
function displayImage(i,src,placement){
 if(src!==defaultContent.images[`hero${i}`])return {src};
 const base=ROOT+'cutouts/display/'+photos[i][0].replace('.webp','');
 // sizes includes the crop scale. Hero widths match mobile.css and shop.css.
 // Mobile: three magnets across a 560px maximum with 24px total gaps.
 // Desktop: 17.5% of the viewport-height-limited hero (at most 1600px).
 // The story reserves enough resolution for its largest seasonal layout.
 const scale=1254/magnetBounds[i][2];
 const sizes=placement==='thumbnail'?'64px':placement==='hero'
  ?`(max-width: 900px) min(${(536/3)*scale}px, calc((100vw - 64px) * ${scale/3})), min(${280*scale}px, ${17.5*scale}vw, calc((100svh - 150px) * ${.315*scale}))`
  :`${370*scale}px`;
 return {src:`${base}-320.webp`,srcSet:`${base}-320.webp 320w, ${base}-640.webp 640w, ${asset(i)} 1254w`,sizes};
}
function MagnetPhoto({i,priority=false}){const {content}=useContent();const src=content.images[`hero${i}`];const custom=src!==defaultContent.images[`hero${i}`];const [x,y,size]=custom?[0,0,1254]:magnetBounds[i];const display=displayImage(i,src,priority?'hero':'story');return <div className="magnet-face"><img src={display.src} srcSet={display.srcSet} sizes={display.sizes} alt={custom?'A favourite moment on a square photo magnet':photos[i][2]} loading={priority?'eager':'lazy'} style={{...(custom?{height:'100%',objectFit:'cover'}:{}),width:`${1254/size*100}%`,left:`${-x/size*100}%`,top:`${-y/size*100}%`}}/></div>}
function BuilderLink({children='Make your magnets',puzzle=false,className=''}){return <a className={'action '+className} href={'/'+(puzzle?'puzzle':'studio')}>{children}</a>}
function Tray(){const {content}=useContent();return <figure className="tray"><img loading="lazy" src={content.images.tray} alt="Styled composition using your five magnet photos in and around a mint tray"/></figure>}
function Puzzle({n=3}){const {content}=useContent();const [tiles,setTiles]=useState([]);useEffect(()=>{let alive=true;demoPhoto(content.images.puzzle).then(p=>renderPhoto(p,{puzzle:true,gridSize:n,size:160})).then(r=>{if(alive)setTiles(r.tiles)}).catch(()=>{});return()=>{alive=false}},[n,content.images.puzzle]);return <div className="puzzle-visual"><MagnetPreview urls={tiles} columns={n} label={`${n} by ${n} grid of ${n*n} square magnets forming one coastal picture`}/></div>}
function Collections(){
 const {content}=useContent();const {onAddPack}=useContext(ShopContext);
 const [pack,setPack]=useState(null);
 const featured=content.products.filter(p=>p.featured&&p.status!=='hidden');
 return <section className="collections content" id="collections"><div className="section-heading"><div><p className="overline">A LITTLE YOU. A LITTLE PLAY.</p><h2>Magnet collections</h2></div><p>Learning, little reminders, gifts and more.</p></div><div className="catalog-grid collection-cards">{featured.map(item=><CollectionCard key={item.id} item={item} Puzzle={Puzzle} onExplore={item=>setPack(item.id)}/>)}</div><div className="more-collections"><a className="action secondary" href="/collections">View more designs</a><p>First words, colours, thoughtful gifts and everyday favourites.</p></div>{pack&&<ProductDetails product={content.products.find(p=>p.id===pack)} onClose={()=>setPack(null)} onAddPack={onAddPack}/>}</section>;
}
function HappyBundles(){const {content}=useContent();return <section className="chaos-pricing content" id="photo-pricing" aria-labelledby="chaos-pricing-title"><div className="section-heading"><h2 id="chaos-pricing-title">A few favourites.<br/>Or the whole story.</h2><p>A different photo on every magnet.<br/>One little collection that’s completely you.</p></div><div className="chaos-price-grid">{[[1,'1–5','Just a few'],[6,'6–9','A little collection'],[10,'10+','The whole story']].map(([n,band,name])=><article key={n}><p className="overline">{band} MAGNETS</p><h3>{name}</h3><strong>{money(photoPrice(n,content.pricing)/n)}<small>each</small></strong><BuilderLink className={n===6?'featured-price':'outline-price'}>Start creating</BuilderLink></article>)}</div><p className="price-delivery">Your whole basket sets one rate for every photo magnet, puzzle piece and built-in collection magnet. Delivery is additional.</p></section>}
function Questions(){return <section className="questions content" id="questions"><div><p className="overline">BEFORE YOU MAKE IT YOURS</p><h2>A few good questions.</h2><a className="text-link" href="/help">All questions & answers</a></div><FAQList featured/></section>}
function Story(){
 const {content}=useContent();
 const [active,setActive]=useState(1);
 const [inView,setInView]=useState(false);
 const gallery=useRef(null);
 useEffect(()=>{
  const observer=new IntersectionObserver(([entry])=>setInView(entry.isIntersecting),{threshold:.3});
  if(gallery.current)observer.observe(gallery.current);
  return()=>observer.disconnect();
 },[]);
 useEffect(()=>{
  if(!inView)return;
  const timer=setInterval(()=>{if(!document.hidden)setActive(i=>(i+1)%photos.length)},5000);
  return()=>clearInterval(timer);
 },[inView]);
 const choose=i=>setActive(i);
 return <section id="the-story" className="story content">
  <div className="story-image" ref={gallery}>
      <><div className="story-photo"><MagnetPhoto i={active}/><BrandDoodle className="photo-accent story-accent mint"/><span className="photo-scribble">{['good times','the big day','beach days','my people','date night'][active]}</span></div><span className="story-scribble">Tiny<br/>moments.<br/>Big joy.</span></>
   <div className="photo-options" aria-label="Choose a real magnet example">{photos.map((p,i)=>{const display=displayImage(i,content.images[`hero${i}`],'thumbnail');return <button aria-label={'View '+p[1]+' magnet'} aria-pressed={active===i} onClick={()=>choose(i)} key={p[0]}><img src={display.src} srcSet={display.srcSet} sizes={display.sizes} alt="" loading="lazy"/></button>})}</div>
  </div>
  <div className="story-copy"><p className="overline">REAL MAGNETS. REAL MEMORIES.</p><h2>A fridge full of your favourite weirdos.</h2><p>The wedding. That day at the beach. Dinner with your favourite person. Bring the photos you love out of your camera roll and into your everyday.</p><p><strong>Handmade in Durban.</strong> We print your chosen photos, make your magnets and check each one by hand before it leaves us.</p><BuilderLink>Choose your favourites</BuilderLink></div>
 </section>;
}

function ThreadChapter({from,to,children,className=''}){return <div className={'thread-chapter '+className} data-thread-from={from} data-thread-to={to}><ReferenceThread from={from} to={to}/>{children}</div>}
function HappyChaos(){const {content}=useContent();return <div className="thread-flow"><SmoothThread/><MobileThread/><ThreadChapter from={0} to={500} className="chapter-hero"><SeasonSlot name="Hero"><section className="chaos-hero"><div className="chaos-title"><p className="overline"><SeasonText field="eyebrow">YOUR CAMERA ROLL CALLED. IT WANTS OUT.</SeasonText></p><h1><SeasonText field="headline">Find your tribe<br/>at <em><Wordmark/>.</em></SeasonText></h1><p><SeasonText field="body">All your favourite humans.<br/>In tiny, ridiculously lovable squares.</SeasonText></p><BuilderLink><SeasonText field="button">Make your magnets</SeasonText></BuilderLink><small>6 magnets · {money(photoPrice(6,content.pricing))} · {MAGNET_FACE_CM} cm squares</small></div>{[0,3,2,4,1].map((i,k)=><div className={'scattered scatter-'+k} key={i}><MagnetPhoto i={i} priority/>{k!==4&&<BrandDoodle className={'photo-accent hero-accent '+(k===0?'berry':'mint')}/>}<span>{['good times','my people','out of office','date night','the big day'][k]}</span></div>)}</section></SeasonSlot></ThreadChapter><ThreadChapter from={500} to={812} className="chapter-collections"><Collections/></ThreadChapter><ThreadChapter from={812} to={1025} className="chapter-story"><Story/></ThreadChapter><ThreadChapter from={1025} to={1255} className="chapter-making"><section className="make-it content" id="how-it-works"><Tray/><div><p className="overline">FROM CAMERA ROLL TO KITCHEN ROLL CALL</p><h2>Pick. Crop. Stick.</h2><p>Turn your everyday moments into something special. Quick, easy and made to make you smile every time you see it.</p><ol className="making-steps">{[[ImageSquare,'Pick','your photos'],[Crop,'Crop','your squares'],[Magnet,'Stick','the good vibes']].map(([Icon,title,desc],i)=><li key={title}><span><Icon size={29} weight="bold" aria-hidden="true"/></span><strong>{i+1}. {title}</strong><small>{desc}</small></li>)}</ol><BuilderLink>Let’s make yours</BuilderLink></div></section></ThreadChapter><ThreadChapter from={1255} to={1515} className="chapter-pricing"><HappyBundles/></ThreadChapter><Reviews/><ThreadChapter from={1515} to={1774} className="chapter-footer"><Questions/></ThreadChapter><Contact/></div>}

export default function Storefront({page,onAddPack,basketCount}){return <ShopContext.Provider value={{onAddPack,basketCount}}><div className="storefront"><main className="concept happy-chaos thread-brand">{page==='collections'?<MagnetCollections Puzzle={Puzzle} onAddPack={onAddPack}/>:<HappyChaos/>}</main></div></ShopContext.Provider>}
