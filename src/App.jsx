import {SeasonProvider} from './seasons/runtime.jsx';
import ProofReview from './ProofReview';
import {isTemplateProduct,isSelectableCollection,selectedPrintManifest,selectionQuantities,productMagnetCount,collectionItemName,mergeCollectionItem} from './designs/products.mjs';
import React,{useEffect,useLayoutEffect,useState,useRef,useReducer} from 'react';
import {Bag,Plus,Minus,X,Check,Trash,ArrowLeft} from '@phosphor-icons/react';
import './fonts.css';

import {Editor,StudioProgress} from './Editor';
import {CollectionReview} from './CollectionReview';
import {renderPhoto,releasePhotos} from './artwork';
import {createStudio,studioReducer,createDesignItems,mergeStudioItems} from './studio-state.mjs';
import {money,summarize} from './commerce.mjs';
import {SubmissionProvider,useSubmissionSnapshot} from './FormService';
import {Checkout} from './Checkout';
import {SiteHeader,SiteFooter,HelpPage} from './SiteChrome';
import TierNudge from './TierNudge';
import Storefront from './storefront/Storefront';
import {useContent} from './content/ContentProvider';
import SEO from './SEO.jsx';
import ProductPage from './ProductPage';
import PolicyPage from './PolicyPage';
import ContactPage from './ContactPage';
import Contact from './storefront/Contact';
import {policies} from './policies.mjs';
import {canPurchase} from './content/model.mjs';


import {currentPage,navigate,pagePath} from './routing.mjs';
const routes=['proof','home','collections','studio','puzzle','basket','checkout','help',...Object.keys(policies)];

export function App(props){return <SeasonProvider><SubmissionProvider><AppContent {...props}/></SubmissionProvider></SeasonProvider>}
function AppContent({initialPage}){
 const orderState=useSubmissionSnapshot('order'),orderLocked=orderState.pending;
 const {content}=useContent();const PACKS=Object.fromEntries(content.products.map(p=>[p.id,p]));
 const [routeVersion,setRouteVersion]=useState(0);
 const [editingPack,setEditingPack]=useState(null);
 const [page,setPage]=useState(()=>initialPage||currentPage()),[basket,setBasket]=useState([]),[toast,setToast]=useState('');
 const [studio,dispatchStudio]=useReducer(studioReducer,undefined,createStudio);
 const photos=studio.photos;const setPhotos=value=>dispatchStudio({type:'photos',value});
 useEffect(()=>{
  if(page==='puzzle')dispatchStudio({type:'settings',patch:{defaultFormat:'puzzle'}});
  if(page==='puzzle'){history.replaceState(null,'','/studio');setPage('studio');}
 },[page]);
 const [checkoutDraft,setCheckoutDraft]=useState({query:'',locker:null,step:1,contact:{name:'',email:''},confirmed:false});
 const [collectionBusy,setCollectionBusy]=useState(false),[collectionError,setCollectionError]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{
  if(!['basket','checkout'].includes(page)){setCollectionBusy(false);setCollectionError('');return;}
  let active=true;setCollectionBusy(true);setCollectionError('');
  createDesignItems(photos,renderPhoto).then(items=>{if(active)setBasket(b=>mergeStudioItems(b,items));}).catch(e=>{if(active)setCollectionError(e.message);}).finally(()=>{if(active)setCollectionBusy(false);});
  return()=>{active=false;};
 },[page,photos,retry]);
 const displayBasket=basket.map(i=>['photo','puzzle'].includes(i.kind)?i:{...i,name:PACKS[i.kind]?collectionItemName(PACKS[i.kind],i):i.name,preview:i.preview||PACKS[i.kind]?.image});
 const timer=useRef();const sum=summarize([...basket.filter(i=>!['photo','puzzle'].includes(i.kind)),...photos.map(p=>({...p,kind:p.format==='puzzle'?'puzzle':'photo',gridSize:p.gridSize||3}))],content);const storefront=['home','collections'].includes(page);
 useEffect(()=>{if(orderLocked&&['studio','puzzle','basket'].includes(page)){navigate('/checkout');setPage('checkout');}},[orderLocked,page]);
 function go(next){if(orderLocked&&['studio','puzzle','basket'].includes(next))next='checkout';if(next!=='checkout')setCheckoutDraft(d=>({...d,confirmed:false}));navigate(pagePath(next));setPage(next);window.scrollTo(0,0);}
 // Section links update history without the browser's native hash jump.
 function navigateSection(route){
  const hash=route.startsWith('home/')?'/#'+route.slice(5):pagePath(route);
  if(location.pathname+location.hash!==hash)history.pushState(null,'',hash);
  setPage(currentPage());setRouteVersion(v=>v+1);
 }
 useEffect(()=>{const update=()=>{setPage(currentPage());setRouteVersion(v=>v+1);};addEventListener('popstate',update);addEventListener('hashchange',update);return()=>{removeEventListener('popstate',update);removeEventListener('hashchange',update);clearTimeout(timer.current);}},[]);
 useLayoutEffect(()=>{
  const section=(window.__CV_ADMIN_PREVIEW__?new URLSearchParams(location.search).get('page')?.split('#')[1]:location.hash.slice(1))||'';
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
 function startNewRequest(){releasePhotos(photos);setBasket([]);dispatchStudio({type:'reset'});setCheckoutDraft({query:'',locker:null,step:1,contact:{name:'',email:'',phone:''},confirmed:false});setCollectionError('');setToast('');navigate('/studio');setPage('studio');window.scrollTo(0,0);}
 function notify(message){setToast(message);clearTimeout(timer.current);timer.current=setTimeout(()=>setToast(''),4500);}
 function changeQuantity(item,delta){setBasket(b=>b.map(x=>x.id===item.id?{...x,qty:x.qty+delta}:x));if(['photo','puzzle'].includes(item.kind))setPhotos(ps=>ps.map(p=>p.id===(item.sourceId||item.id)?{...p,qty:item.qty+delta}:p));}
 function removeItem(item){setBasket(b=>b.filter(x=>x.id!==item.id));if(['photo','puzzle'].includes(item.kind))setPhotos(ps=>ps.filter(p=>p.id!==(item.sourceId||item.id))); }
 function addPack(kind,chosenIds,chosenQuantities){
  if(orderLocked){notify('Your current order is saved. Return to checkout to view its status.');return;}
  const pack=PACKS[kind];if(!canPurchase(pack)){notify('This collection is not available yet.');return;}
  if(isTemplateProduct(pack)){go('studio');return;}
  const manifest=selectedPrintManifest(pack,chosenIds),quantities=manifest?selectionQuantities(pack,chosenIds,chosenQuantities):[];
  const designIds=chosenIds&&(chosenIds.length!==pack.count||quantities.some(q=>q!==1))?manifest.designs.map(d=>d.id):undefined;
  const selection={...(designIds?{designIds,...(quantities.some(q=>q!==1)?{designQuantities:quantities}:{})}:{})};
  selection.count=productMagnetCount(pack,selection);
  const editing=editingPack?.kind===kind?editingPack:null;
  const incoming={id:editing?.id||crypto.randomUUID(),kind,name:collectionItemName(pack,selection),qty:editing?.qty||1,preview:pack.image,printVersion:pack.printVersion,...selection};
  setBasket(b=>mergeCollectionItem(b,incoming,editing?.id));
  if(editing){setEditingPack(null);go('basket');notify('Your selection is updated.');return;}

  notify(`${pack.name} added to your basket.`);
 }
 useEffect(()=>{if(!page.startsWith('products/'))setEditingPack(null);},[page]);

 const designProduct=page.startsWith('design/')?content.products.find(p=>p.id===page.slice(7)&&isTemplateProduct(p)):null;
 useEffect(()=>{if(designProduct){history.replaceState(null,'','/studio');setPage('studio');}},[designProduct]);
 const detailProduct=page.startsWith('products/')?content.products.find(p=>p.id===page.slice(9)&&p.status!=='hidden'):null;
 return <><SEO page={page} content={content}/><a className="global-skip" href="#main-content" onClick={e=>{e.preventDefault();document.getElementById('main-content')?.focus()}}>Skip to content</a>
 <SiteHeader page={page} count={sum.magnetQty} onSectionNavigate={navigateSection}/>
 <div className={storefront||page==='contact'?'':'shop-shell'}>

 <div id="main-content" tabIndex={-1}>
 {['studio','puzzle','basket','checkout'].includes(page)&&<div className="purchase-progress"><StudioProgress step={page==='checkout'?'delivery':page==='basket'?'review':'make'} hasPhotos={photos.length>0||basket.some(i=>!['photo','puzzle'].includes(i.kind))} busy={collectionBusy} onStep={step=>go({make:'studio',review:'basket',delivery:'checkout'}[step])}/>{collectionBusy&&<p className="flow-loading" role="status">Preparing your collection…</p>}{collectionError&&<div className="error" role="alert">{collectionError}<button className="text-button" onClick={()=>setRetry(r=>r+1)}>Try again</button><button className="text-button" onClick={()=>go('studio')}>Back to the designer</button></div>}</div>}

 {storefront&&<Storefront page={page} onAddPack={addPack} basketCount={sum.magnetQty}/>}
 {!orderLocked&&(['studio','puzzle'].includes(page)||designProduct)&&<Editor {...{studio,dispatchStudio,photos,setPhotos,basket,setBasket,go,notify}} notes={checkoutDraft.notes||''} onNotesChange={notes=>setCheckoutDraft(d=>({...d,notes}))}/>}
 {(!collectionBusy||basket.length>0)&&!collectionError&&!orderLocked&&page==='basket'&&<CollectionReview photos={photos} basket={displayBasket} packs={PACKS} go={go} onQuantity={changeQuantity} onRemove={removeItem} onEdit={item=>{if(isSelectableCollection(PACKS[item.kind])){setEditingPack(item);go('products/'+item.kind);return;}if(item.designMode){go('studio');return;}dispatchStudio({type:'settings',patch:{selected:item.sourceId||item.id}});go('studio');}}/>}
 {(!collectionBusy||basket.length>0)&&!collectionError&&page==='checkout'&&<Checkout photos={photos} basket={displayBasket} go={go} draft={checkoutDraft} setDraft={setCheckoutDraft} onStartNew={startNewRequest}/>}

 {page==='proof'&&<ProofReview/>}
 {page==='help'&&<HelpPage/>}
 {page==='contact'&&<ContactPage/>}
 {page!=='contact'&&policies[page]&&<PolicyPage page={page}/>}
 {detailProduct&&<ProductPage product={detailProduct} onAddPack={addPack} editingItem={editingPack?.kind===detailProduct.id?editingPack:null}/>}

 {!routes.includes(page)&&!detailProduct&&!designProduct&&<main className="section empty-basket"><h1>Let’s find your way back.</h1><button className="button" onClick={()=>go('home')}>Back to CustomVibe</button></main>}
 </div>
 </div>
 {page!=='contact'&&page!=='home'&&page!=='proof'&&<div className="storefront"><div className="concept happy-chaos thread-brand"><Contact/></div></div>}
 <SiteFooter/>
 {toast&&<div className="app-toast" role="status"><Check size={20}/><span>{toast}</span><button aria-label="Dismiss notification" onClick={()=>setToast('')}><X size={18}/></button></div>}
 </>;
}
