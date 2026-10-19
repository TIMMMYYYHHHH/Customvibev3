import BusinessStudio from './designs/BusinessStudio';
import HandyStudio from './designs/HandyStudio';
import {saveHandyItem} from './designs/handy.mjs';
import {SeasonProvider} from './seasons/runtime.jsx';
import ProofReview from './ProofReview';
import {isTemplateProduct,isGameProduct,isSelectableCollection,selectedPrintManifest,selectionQuantities,productMagnetCount,collectionItemName,mergeCollectionItem} from './designs/products.mjs';
import React,{useEffect,useLayoutEffect,useState,useRef,useReducer} from 'react';
import {Bag,Plus,Minus,X,Check,Trash,ArrowLeft} from '@phosphor-icons/react';
import './fonts.css';

import {Editor,StudioProgress} from './Editor';
import {CollectionReview} from './CollectionReview';
import {renderPhoto,releasePhotos,releaseUnusedImages} from './artwork';
import {createStudio,studioReducer,createDesignItems} from './studio-state.mjs';
import {removeBasketItem,restoreBasketItem,basketImageSources,mergeBasketDesigns} from './basket-undo.mjs';
import {money,summarize} from './commerce.mjs';
import {SubmissionProvider,useSubmissionSnapshot,useDraftProtection} from './FormService';
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
const BASKET_UNDO_MS=10000;
const removalSources=removal=>basketImageSources([removal.item],removal.photos.map(entry=>entry.photo));
const routes=['studio/business','studio/handy','proof','home','collections','studio','puzzle','basket','checkout','help',...Object.keys(policies)];

export function App(props){return <SeasonProvider><SubmissionProvider><AppContent {...props}/></SubmissionProvider></SeasonProvider>}
function AppContent({initialPage}){
 const orderState=useSubmissionSnapshot('order'),orderLocked=orderState.pending;
 const {content}=useContent();const PACKS=Object.fromEntries(content.products.map(p=>[p.id,p]));
 const [routeVersion,setRouteVersion]=useState(0);
 const routeFocus=useRef(null),lastRoute=useRef(null);
 const routeIdentity=()=>window.__CV_ADMIN_PREVIEW__?new URLSearchParams(location.search).get('page')||'/':location.pathname+location.hash;
 useEffect(()=>{lastRoute.current=routeIdentity();},[]);
 function requestRouteFocus(){
  const next=routeIdentity();
  if(lastRoute.current!==next){routeFocus.current={source:document.activeElement};lastRoute.current=next;}
 }
 const [editingPack,setEditingPack]=useState(null);
 const [businessSelected,setBusinessSelected]=useState(''),[businessDrafts,setBusinessDrafts]=useState({}),[editingBusiness,setEditingBusiness]=useState(null);
 const [handySelected,setHandySelected]=useState(''),[handyDrafts,setHandyDrafts]=useState({}),[editingHandy,setEditingHandy]=useState(null);
 const [page,setPage]=useState(()=>initialPage||currentPage()),[basket,setBasket]=useState([]),[toast,setToast]=useState('');
 const [removal,setRemoval]=useState(null);
 const undoBuffer=useRef(null),undoTimer=useRef(),undoButton=useRef(null),restoredFocus=useRef(null),liveBasket=useRef();
 const [studio,dispatchStudio]=useReducer(studioReducer,undefined,createStudio);
 const photos=studio.photos;const setPhotos=value=>dispatchStudio({type:'photos',value});
 const undoLocked=orderLocked||orderState.busy||!!orderState.result;
 liveBasket.current={basket,photos,locked:undoLocked};
 useEffect(()=>{
  if(page==='puzzle')dispatchStudio({type:'settings',patch:{defaultFormat:'puzzle'}});
  if(page==='puzzle'){history.replaceState(null,'','/studio');setPage('studio');}
 },[page]);
 const [checkoutDraft,setCheckoutDraft]=useState({query:'',locker:null,step:1,contact:{name:'',email:''},confirmed:false});
 const draftHasDetails=values=>!!values&&(values.entries?.some(value=>String(value).trim())||['url','network','password'].some(key=>values.qr?.[key]?.trim()));
 useDraftProtection('order',!!removal||photos.length>0||basket.length>0||Object.values(businessDrafts).some(draftHasDetails)||Object.values(handyDrafts).some(draftHasDetails)||draftHasDetails(editingBusiness?.values)||draftHasDetails(editingHandy?.values)||['id','name','area'].some(key=>!!checkoutDraft.locker?.[key]?.trim())||!!checkoutDraft.query?.trim()||!!checkoutDraft.notes?.trim()||Object.values(checkoutDraft.contact||{}).some(value=>String(value).trim()));
 const [collectionBusy,setCollectionBusy]=useState(false),[collectionError,setCollectionError]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{
  if(!['basket','checkout'].includes(page)){setCollectionBusy(false);setCollectionError('');return;}
  let active=true;setCollectionBusy(true);setCollectionError('');
  createDesignItems(photos,renderPhoto).then(items=>{if(active)setBasket(b=>mergeBasketDesigns(b,items));}).catch(e=>{if(active)setCollectionError(e.message);}).finally(()=>{if(active)setCollectionBusy(false);});
  return()=>{active=false;};
 },[page,photos,retry]);
 const displayBasket=basket.map(i=>['photo','puzzle'].includes(i.kind)?i:{...i,name:PACKS[i.kind]?collectionItemName(PACKS[i.kind],i):i.name,preview:i.preview||PACKS[i.kind]?.image});
 const timer=useRef();const sum=summarize([...basket.filter(i=>!['photo','puzzle'].includes(i.kind)),...photos.map(p=>({...p,kind:p.format==='puzzle'?'puzzle':'photo',gridSize:p.gridSize||3}))],content);const storefront=['home','collections'].includes(page);
 useEffect(()=>{if(orderLocked&&['studio','studio/business','studio/handy','puzzle','basket'].includes(page)){navigate('/checkout');setPage('checkout');}},[orderLocked,page]);
 function go(next){if(orderLocked&&['studio','studio/business','studio/handy','puzzle','basket'].includes(next))next='checkout';if(next!=='checkout')setCheckoutDraft(d=>({...d,confirmed:false}));navigate(pagePath(next));setPage(next);window.scrollTo(0,0);}
 // Section links update history without the browser's native hash jump.
 function navigateSection(route){
  const hash=route.startsWith('home/')?'/#'+route.slice(5):pagePath(route);
  if(location.pathname+location.hash!==hash)history.pushState(null,'',hash);
  requestRouteFocus();setPage(currentPage());setRouteVersion(v=>v+1);
 }
 useEffect(()=>{const update=()=>{requestRouteFocus();setPage(currentPage());setRouteVersion(v=>v+1);};addEventListener('popstate',update);addEventListener('hashchange',update);return()=>{removeEventListener('popstate',update);removeEventListener('hashchange',update);clearTimeout(timer.current);}},[]);
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
 useLayoutEffect(()=>{
  if(!routeFocus.current||collectionBusy)return;
  const frame=requestAnimationFrame(()=>{
   const request=routeFocus.current;if(!request)return;
   const section=(window.__CV_ADMIN_PREVIEW__?new URLSearchParams(location.search).get('page')?.split('#')[1]:location.hash.slice(1))||'';
   const target=section&&document.getElementById(section),main=document.getElementById('main-content');
   const heading=target?(target.matches('h1,h2,h3,summary')?target:target.querySelector('h1,h2,h3,summary')||target):(main?.querySelector('[data-studio-workbench]')||main?.querySelector('h1'));
   if(!heading)return;
   routeFocus.current=null;
   // A dialog or a control focused since navigation owns focus, including recovery and Undo.
   const active=document.activeElement;
   if(active?.closest('.form-security')||document.querySelector('dialog[open],[role="dialog"][aria-modal="true"]')||(active!==document.body&&active!==request.source&&active?.isConnected))return;
   if(!heading.hasAttribute('tabindex'))heading.setAttribute('tabindex','-1');
   heading.focus({preventScroll:true});
  });
  return()=>cancelAnimationFrame(frame);
 },[page,routeVersion,collectionBusy,collectionError]);
 function startNewRequest(){replaceUndo(null);setBusinessDrafts({});setBusinessSelected('');setEditingBusiness(null);setHandyDrafts({});setHandySelected('');setEditingHandy(null);releasePhotos(photos);setBasket([]);dispatchStudio({type:'reset'});setCheckoutDraft({query:'',locker:null,step:1,contact:{name:'',email:'',phone:''},confirmed:false});setCollectionError('');setToast('');navigate('/studio');setPage('studio');window.scrollTo(0,0);}
 function notify(message){setToast(message);clearTimeout(timer.current);timer.current=setTimeout(()=>setToast(''),4500);}
 function changeQuantity(item,delta){setBasket(b=>b.map(x=>x.id===item.id?{...x,qty:x.qty+delta}:x));if(['photo','puzzle'].includes(item.kind))setPhotos(ps=>ps.map(p=>p.id===(item.sourceId||item.id)?{...p,qty:item.qty+delta}:p));}
 function replaceUndo(next){
  clearTimeout(undoTimer.current);
  const previous=undoBuffer.current;undoBuffer.current=next;setRemoval(next);
  if(previous)releaseUnusedImages(removalSources(previous),[...basketImageSources(liveBasket.current.basket,liveBasket.current.photos),...(next?removalSources(next):[])]);
 }
 function removeItem(item,trigger){
  const current=liveBasket.current;if(current.locked)return;
  const next=removeBasketItem(current.basket,current.photos,item.id);if(!next.removal)return;
  liveBasket.current={...current,basket:next.basket,photos:next.photos};
  replaceUndo({...next.removal,focusUndo:trigger===document.activeElement});
  setBasket(next.basket);if(next.photos!==current.photos)setPhotos(next.photos);
  clearTimeout(timer.current);setToast('');
  undoTimer.current=setTimeout(()=>replaceUndo(null),BASKET_UNDO_MS);
 }
 function undoRemoval(){
  const current=liveBasket.current,saved=undoBuffer.current;if(current.locked||!saved)return;
  const next=restoreBasketItem(current.basket,current.photos,saved);
  liveBasket.current={...current,...next};restoredFocus.current=page==='basket'?saved.item.id:null;
  replaceUndo(null);setBasket(next.basket);if(next.photos!==current.photos)setPhotos(next.photos);
  notify('Restored to your basket.');
 }
 useLayoutEffect(()=>{if(removal?.focusUndo&&!undoLocked)undoButton.current?.focus({preventScroll:true});},[removal,undoLocked]);
 useLayoutEffect(()=>{
  if(!restoredFocus.current)return;
  const card=[...document.querySelectorAll('[data-basket-item]')].find(node=>node.dataset.basketItem===restoredFocus.current);
  if(card){card.querySelector('[data-basket-remove]')?.focus({preventScroll:true});restoredFocus.current=null;}
 },[basket,page]);
 useEffect(()=>{if(undoLocked)replaceUndo(null);},[undoLocked]);
 useEffect(()=>()=>{
  clearTimeout(undoTimer.current);
  if(undoBuffer.current)releaseUnusedImages(removalSources(undoBuffer.current),basketImageSources(liveBasket.current.basket,liveBasket.current.photos));
  undoBuffer.current=null;
 },[]);
 function addPack(kind,chosenIds,chosenQuantities,style='watercolour'){
  if(orderLocked){notify('Your current order is saved. Return to checkout to view its status.');return;}
  const pack=PACKS[kind];if(!canPurchase(pack)){notify('This collection is not available yet.');return;}
  if(isTemplateProduct(pack)){go(kind==='business'?'studio/business':kind==='information'?'studio/handy':'studio');return;}
  const manifest=selectedPrintManifest(pack,chosenIds),quantities=manifest?selectionQuantities(pack,chosenIds,chosenQuantities):[];
  const designIds=chosenIds&&(chosenIds.length!==pack.count||quantities.some(q=>q!==1))?manifest.designs.map(d=>d.id):undefined;
  const selection={...(!isGameProduct(pack)?{style}:{}),...(designIds?{designIds,...(quantities.some(q=>q!==1)?{designQuantities:quantities}:{})}:{})};
  selection.count=productMagnetCount(pack,selection);
  const editing=editingPack?.kind===kind?editingPack:null;
  const incoming={id:editing?.id||crypto.randomUUID(),kind,name:collectionItemName(pack,selection),qty:editing?.qty||1,preview:pack.image,printVersion:pack.printVersion,...selection};
  setBasket(b=>mergeCollectionItem(b,incoming,editing?.id));
  if(editing){setEditingPack(null);go('basket');notify('Your selection is updated.');return;}

  notify(`${pack.name} added to your basket.`);
 }
 useEffect(()=>{if(!page.startsWith('products/'))setEditingPack(null);if(page!=='studio/handy')setEditingHandy(null);if(page!=='studio/business')setEditingBusiness(null);},[page]);

 const designProduct=page.startsWith('design/')?content.products.find(p=>p.id===page.slice(7)&&isTemplateProduct(p)):null;
 useEffect(()=>{if(designProduct){history.replaceState(null,'','/studio');setPage('studio');}},[designProduct]);
 const detailProduct=page.startsWith('products/')?content.products.find(p=>p.id===page.slice(9)&&p.status!=='hidden'):null;
 return <><SEO page={page} content={content}/><a className="global-skip" href="#main-content" onClick={e=>{e.preventDefault();document.getElementById('main-content')?.focus()}}>Skip to content</a>
 <SiteHeader page={page} count={sum.magnetQty} onSectionNavigate={navigateSection}/>
 <div className={storefront||page==='contact'?'':'shop-shell'}>

 <div id="main-content" tabIndex={-1}>
 {['studio','studio/business','studio/handy','puzzle','basket','checkout'].includes(page)&&<div className="purchase-progress"><StudioProgress step={page==='checkout'?'delivery':page==='basket'?'review':'make'} hasPhotos={photos.length>0||basket.some(i=>!['photo','puzzle'].includes(i.kind))} busy={collectionBusy} onStep={step=>go({make:'studio',review:'basket',delivery:'checkout'}[step])}/>{collectionBusy&&<p className="flow-loading" role="status">Preparing your collection…</p>}{collectionError&&<div className="error" role="alert">{collectionError}<button className="text-button" onClick={()=>setRetry(r=>r+1)}>Try again</button><button className="text-button" onClick={()=>go('studio')}>Back to the designer</button></div>}</div>}

 {storefront&&<Storefront page={page} onAddPack={addPack} basketCount={sum.magnetQty}/>}
 {!orderLocked&&['studio','studio/business','studio/handy'].includes(page)&&<nav className="studio-sections" aria-label="Studio designs"><a href="/studio" aria-current={page==='studio'?'page':undefined}>Photos & puzzles</a><a href="/studio/handy" aria-current={page==='studio/handy'?'page':undefined}>Handy at home</a><a href="/studio/business" aria-current={page==='studio/business'?'page':undefined}>Business magnets</a></nav>}
 {!orderLocked&&page==='studio/handy'&&<HandyStudio selected={handySelected} onSelect={setHandySelected} drafts={handyDrafts} setDrafts={setHandyDrafts} editing={editingHandy} onEditing={setEditingHandy} basket={basket} go={go} onSave={item=>{setBasket(saveHandyItem(basket,item,editingHandy?.id));setEditingHandy(null);setHandySelected('');go('basket');notify('Your magnet is saved in your basket.')}}/>}
 {!orderLocked&&page==='studio/business'&&<BusinessStudio selected={businessSelected} onSelect={setBusinessSelected} drafts={businessDrafts} setDrafts={setBusinessDrafts} editing={editingBusiness} onEditing={setEditingBusiness} basket={basket} go={go} onSave={item=>{setBasket(saveHandyItem(basket,item,editingBusiness?.id));setEditingBusiness(null);setBusinessSelected('');go('basket');notify('Your magnet is saved in your basket.')}}/>}
 {!orderLocked&&(['studio','puzzle'].includes(page)||designProduct)&&<Editor {...{studio,dispatchStudio,photos,setPhotos,basket,setBasket,go,notify}} notes={checkoutDraft.notes||''} onNotesChange={notes=>setCheckoutDraft(d=>({...d,notes}))}/>}
 {(!collectionBusy||basket.length>0)&&!collectionError&&!orderLocked&&page==='basket'&&<CollectionReview photos={photos} basket={displayBasket} packs={PACKS} go={go} onQuantity={changeQuantity} onRemove={removeItem} onEdit={item=>{if(isSelectableCollection(PACKS[item.kind])){setEditingPack(item);go('products/'+item.kind);return;}if(item.values?.businessTemplate){setEditingBusiness({...item,values:structuredClone(item.values)});go('studio/business');return;}if(item.values?.handyTemplate){setEditingHandy({...item,values:{...item.values,entries:[...item.values.entries]}});go('studio/handy');return;}if(item.designMode){go('studio');return;}dispatchStudio({type:'settings',patch:{selected:item.sourceId||item.id}});go('studio');}}/>}
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
 {(removal&&!undoLocked||toast)&&<div className="app-toast" role="status"><Check size={20}/><span>{removal&&!undoLocked?'Removed from your basket. Undo within 10 seconds.':toast}</span>{removal&&!undoLocked&&<button ref={undoButton} type="button" onClick={undoRemoval}>Undo</button>}<button aria-label="Dismiss notification" onClick={()=>{replaceUndo(null);setToast('');}}><X size={18}/></button></div>}
 </>;
}
