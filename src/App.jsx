import React,{useEffect,useLayoutEffect,useState,useRef,useReducer} from 'react';
import {Bag,Plus,Minus,X,Check,Trash,ArrowLeft} from '@phosphor-icons/react';
import '@fontsource-variable/fredoka';
import '@fontsource-variable/dm-sans';
import {Editor,StudioProgress} from './Editor';
import {CollectionReview} from './CollectionReview';
import {renderPhoto} from './artwork';
import {createStudio,studioReducer,createDesignItems,mergeStudioItems} from './studio-state.mjs';
import {money,summarize} from './commerce.mjs';
import {Checkout} from './Checkout';
import {SiteHeader,SiteFooter,HelpPage} from './SiteChrome';
import TierNudge from './TierNudge';
import Storefront from './storefront/Storefront';
import {useContent} from './content/ContentProvider';
import {canPurchase} from './content/model.mjs';
import Admin from './content/Admin';

const routes=['home','collections','studio','puzzle','basket','checkout','help',...(import.meta.env.DEV?['admin']:[])];
const currentPage=()=>{const route=location.hash.replace('#/','').split('/')[0];return ['happy-chaos','colour-pop','keepsake-edit',''].includes(route)?'home':route;};
export function App(){
 const {content}=useContent();const PACKS=Object.fromEntries(content.products.map(p=>[p.id,p]));
 const [routeVersion,setRouteVersion]=useState(0);
 const [page,setPage]=useState(currentPage),[basket,setBasket]=useState([]),[toast,setToast]=useState('');
 const [studio,dispatchStudio]=useReducer(studioReducer,undefined,createStudio);
 const photos=studio.photos;const setPhotos=value=>dispatchStudio({type:'photos',value});
 useEffect(()=>{
  if(page==='puzzle')dispatchStudio({type:'settings',patch:{defaultFormat:'puzzle'}});
  if(page==='puzzle'){history.replaceState(null,'','#/studio');setPage('studio');}
 },[page]);
 const [checkoutDraft,setCheckoutDraft]=useState({query:'',locker:null,step:1,contact:{name:'',email:''},confirmed:false});
 const [collectionBusy,setCollectionBusy]=useState(false),[collectionError,setCollectionError]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{
  if(!['basket','checkout'].includes(page)){setCollectionBusy(false);setCollectionError('');return;}
  let active=true;setCollectionBusy(true);setCollectionError('');
  createDesignItems(photos,renderPhoto).then(items=>{if(active)setBasket(b=>mergeStudioItems(b,items));}).catch(e=>{if(active)setCollectionError(e.message);}).finally(()=>{if(active)setCollectionBusy(false);});
  return()=>{active=false;};
 },[page,photos,retry]);
 const displayBasket=basket.map(i=>['photo','puzzle'].includes(i.kind)?i:{...i,name:PACKS[i.kind]?.name||i.name,preview:PACKS[i.kind]?.image||i.preview});
 const timer=useRef();const sum=summarize([...basket.filter(i=>!['photo','puzzle'].includes(i.kind)),...photos.map(p=>({...p,kind:p.format==='puzzle'?'puzzle':'photo',gridSize:p.gridSize||3}))],content);const storefront=['home','collections'].includes(page);
 function go(next){if(next!=='checkout')setCheckoutDraft(d=>({...d,confirmed:false}));location.hash='/'+next;setPage(next);window.scrollTo(0,0);}
 // Section links update history without the browser's native hash jump.
 function navigateSection(route){
  const hash='#/'+route;
  if(location.hash!==hash)history.pushState(null,'',hash);
  setPage(currentPage());setRouteVersion(v=>v+1);
 }
 useEffect(()=>{const update=()=>{setPage(currentPage());setRouteVersion(v=>v+1);};addEventListener('hashchange',update);return()=>{removeEventListener('hashchange',update);clearTimeout(timer.current);}},[]);
 useLayoutEffect(()=>{
  const section=location.hash.slice(2).split('/')[1];
  const frame=requestAnimationFrame(()=>{
   const target=section&&document.getElementById(section);
   if(target){
    const headerHeight=document.querySelector('.unified-header')?.getBoundingClientRect().height||0;
    window.scrollTo({top:window.scrollY+target.getBoundingClientRect().top-headerHeight-20,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
   }
   else window.scrollTo({top:0,behavior:'instant'});
  });
  return()=>cancelAnimationFrame(frame);
 },[page,routeVersion]);
 function notify(message){setToast(message);clearTimeout(timer.current);timer.current=setTimeout(()=>setToast(''),4500);}
 function changeQuantity(item,delta){setBasket(b=>b.map(x=>x.id===item.id?{...x,qty:x.qty+delta}:x));if(['photo','puzzle'].includes(item.kind))setPhotos(ps=>ps.map(p=>p.id===(item.sourceId||item.id)?{...p,qty:item.qty+delta}:p));}
 function removeItem(item){setBasket(b=>b.filter(x=>x.id!==item.id));if(['photo','puzzle'].includes(item.kind))setPhotos(ps=>ps.filter(p=>p.id!==(item.sourceId||item.id))); }
 function addPack(kind){const pack=PACKS[kind];if(!canPurchase(pack)){notify('This collection is not available yet.');return;}setBasket(b=>b.some(i=>i.kind===kind)?b.map(i=>i.kind===kind?{...i,qty:i.qty+1}:i):[...b,{id:crypto.randomUUID(),kind,name:pack.name,qty:1,preview:pack.image,count:pack.count}]);notify(`${pack.name} added to your basket.`);}
 return <><a className="global-skip" href="#main-content" onClick={e=>{e.preventDefault();document.getElementById('main-content')?.focus()}}>Skip to content</a>
 <SiteHeader page={page} count={sum.magnetQty} onSectionNavigate={navigateSection}/>
 <div className={storefront?'':'shop-shell'}>

 <div id="main-content" tabIndex={-1}>
 {['studio','puzzle','basket','checkout'].includes(page)&&<div className="purchase-progress"><StudioProgress step={page==='checkout'?'delivery':page==='basket'?'review':'make'} hasPhotos={photos.length>0||basket.some(i=>!['photo','puzzle'].includes(i.kind))} busy={collectionBusy} onStep={step=>go({make:'studio',review:'basket',delivery:'checkout'}[step])}/>{collectionBusy&&<p className="flow-loading" role="status">Preparing your collection…</p>}{collectionError&&<div className="error" role="alert">{collectionError}<button className="text-button" onClick={()=>setRetry(r=>r+1)}>Try again</button><button className="text-button" onClick={()=>go('studio')}>Back to the designer</button></div>}</div>}

 {storefront&&<Storefront page={page} onAddPack={addPack} basketCount={sum.magnetQty}/>}
 {['studio','puzzle'].includes(page)&&<Editor {...{studio,dispatchStudio,photos,setPhotos,basket,setBasket,go,notify}}/>}
 {(!collectionBusy||basket.length>0)&&!collectionError&&page==='basket'&&<CollectionReview basket={displayBasket} packs={PACKS} go={go} onQuantity={changeQuantity} onRemove={removeItem} onEdit={item=>{dispatchStudio({type:'settings',patch:{selected:item.sourceId||item.id}});go('studio');}}/>}
 {(!collectionBusy||basket.length>0)&&!collectionError&&page==='checkout'&&<Checkout basket={displayBasket} go={go} draft={checkoutDraft} setDraft={setCheckoutDraft}/>}
 {page==='help'&&<HelpPage/>}
 {page==='admin'&&import.meta.env.DEV&&<Admin/>}
 {!routes.includes(page)&&<main className="section empty-basket"><h1>Let’s find your way back.</h1><button className="button" onClick={()=>go('home')}>Back to CustomVibe</button></main>}
 </div>
 </div>
 <SiteFooter/>
 {toast&&<div className="app-toast" role="status"><Check size={20}/><span>{toast}</span><button aria-label="Dismiss notification" onClick={()=>setToast('')}><X size={18}/></button></div>}
 </>;
}
