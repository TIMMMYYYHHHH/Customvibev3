import './designs/handy.css';
import {saveHandyItem} from './designs/handy.mjs';
import {SeasonProvider} from './seasons/runtime.jsx';
import ProofReview from './ProofReview';
import {isTemplateProduct,isGameProduct,isSelectableCollection,selectedPrintManifest,selectionQuantities,productMagnetCount,collectionItemName,mergeCollectionItem} from './designs/products.mjs';
import React,{useEffect,useLayoutEffect,useState,useRef,useReducer,useSyncExternalStore} from 'react';
import {Bag,Plus,Minus,X,Check,Trash,ArrowLeft} from '@phosphor-icons/react';
import './fonts.css';

import {StudioProgress} from './StudioProgress';
import './designs/magnet-satin.css';
import './designs/business-games.css';
import {clientRouteViews} from './routes/client-views.mjs';
import {useRouteView} from './routes/use-route-view.mjs';
import RouteStatus from './routes/RouteStatus.jsx';
import {renderPhoto,releasePhotos,releaseUnusedImages} from './artwork';
import {createStudio,studioReducer,createDesignItems} from './studio-state.mjs';
import {removeBasketItem,restoreBasketItem,basketImageSources,mergeBasketDesigns} from './basket-undo.mjs';
import {money,summarize} from './commerce.mjs';
import {SubmissionProvider,useSubmissionSnapshot,useDraftProtection} from './FormService';
import {SiteHeader,SiteFooter,HelpPage} from './SiteChrome';
import TierNudge from './TierNudge';
import Storefront from './storefront/Storefront';
import {useContent} from './content/ContentProvider';
import SEO from './SEO.jsx';
import ProductPage from './ProductPage';
import PolicyPage from './PolicyPage';
import ContactPage from './ContactPage';
import Contact,{NativeContactDraftContext} from './storefront/Contact';
import {policies} from './policies.mjs';
import {canPurchase} from './content/model.mjs';


import {currentPage,navigate,pagePath} from './routing.mjs';
const BASKET_UNDO_MS=10000;
const removalSources=removal=>basketImageSources([removal.item],removal.photos.map(entry=>entry.photo));
const routes=['studio/business','studio/handy','proof','home','collections','studio','puzzle','basket','checkout','help',...Object.keys(policies)];
const idleStartup={status:'idle',module:null,error:null},noStartup=()=>idleStartup,noSubscription=()=>()=>{};

export function App(props){return <NativeContactDraftContext.Provider value={props.startup?.contact||null}><SeasonProvider><SubmissionProvider><AppContent {...props}/></SubmissionProvider></SeasonProvider></NativeContactDraftContext.Provider>}
function AppContent({initialPage,routeViews=clientRouteViews,startup}){
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
 const startupState=useSyncExternalStore(startup?.resource.subscribe||noSubscription,startup?.resource.getSnapshot||noStartup,startup?.resource.getSnapshot||noStartup);
 const nativeFiles=useRef(null),firstReadyScroll=useRef(true),startupFocus=useRef(null);
 const [startupPending,setStartupPending]=useState(false),[startupBusy,setStartupBusy]=useState(false),[startupError,setStartupError]=useState('');
 const [startupRevision,setStartupRevision]=useState(0);
 const designProduct=page.startsWith('design/')?content.products.find(p=>p.id===page.slice(7)&&isTemplateProduct(p)):null;
 const viewKey=page==='checkout'?'checkout':orderLocked?null:page==='studio/handy'?'handy':page==='studio/business'?'business':['studio','puzzle'].includes(page)||designProduct?'editor':page==='basket'?'basket':null;
 const startupGate=startup&&viewKey==='editor'?{pending:startupState.status!=='ready'&&startupState.status!=='error',error:startupState.error}:null;
 const routeView=useRouteView(viewKey,routeViews,startupGate),View=routeView.Component;
 const undoLocked=orderLocked||orderState.busy||!!orderState.result;
 liveBasket.current={basket,photos,locked:undoLocked};
 useEffect(()=>{
  if(page==='puzzle')dispatchStudio({type:'settings',patch:{defaultFormat:'puzzle'}});
  if(page==='puzzle'){history.replaceState(null,'','/studio');setPage('studio');}
 },[page]);
 const [checkoutDraft,setCheckoutDraft]=useState({query:'',locker:null,step:1,contact:{name:'',email:''},confirmed:false});
 useLayoutEffect(()=>{
  if(!startup||nativeFiles.current)return;
  const files=startup.readFiles();nativeFiles.current={files,promise:null,adopted:false,version:startup.fileVersion()};
  const notes=startup.readNotes();if(notes)setCheckoutDraft(d=>({...d,notes}));
  const element=document.activeElement;
  if(files.length&&startup.hydrate&&element?.closest('.studio-workbench')){
   const guard={element,cancelled:false};const cancel=()=>{guard.cancelled=true};
   guard.install=()=>{document.addEventListener('pointerdown',cancel,true);document.addEventListener('keydown',cancel,true)};
   guard.remove=()=>{document.removeEventListener('pointerdown',cancel,true);document.removeEventListener('keydown',cancel,true)};
   startupFocus.current=guard;
  }
  if(files.length){setStartupPending(true);setStartupBusy(startupState.status!=='error');}
  if(!files.length)startup.onAttached();
 },[]);
 useLayoutEffect(()=>{const guard=startupFocus.current;if(guard){guard.install();return guard.remove;}},[]);
 useLayoutEffect(()=>{
  const guard=startupFocus.current;if(startupBusy||!nativeFiles.current?.adopted||!guard)return;
  if(!guard.cancelled&&guard.element.isConnected&&document.activeElement===document.body)guard.element.focus({preventScroll:true});
  guard.remove();startupFocus.current=null;
 },[startupBusy]);
 useLayoutEffect(()=>{
  const batch=nativeFiles.current;if(!batch?.files.length||batch.adopted)return;
  if(startupState.status!=='ready'){setStartupBusy(startupState.status!=='error');return;}
  setStartupBusy(true);
  if(!batch.promise)batch.promise=startupState.module.prepareUploadBatch(batch.files,{orderItems:[...liveBasket.current.basket.filter(i=>!['photo','puzzle'].includes(i.kind)),...liveBasket.current.photos.map(p=>({...p,kind:p.format==='puzzle'?'puzzle':'photo'}))],content,format:'photo'});
  let active=true;
  batch.promise.then(({good,errors})=>{
   if(!active||batch.adopted)return;
   if(startup.fileVersion()!==batch.version){
    releaseUnusedImages(good.map(photo=>photo.src),liveBasket.current.photos.map(photo=>photo.src));
    batch.files=startup.readFiles();batch.version=startup.fileVersion();batch.promise=null;
    if(batch.files.length){setStartupRevision(v=>v+1);return;}
    batch.adopted=true;setStartupPending(false);setStartupBusy(false);startup.onAttached();return;
   }
   batch.adopted=true;batch.files=[];batch.promise=null;
   if(good.length){setPhotos(ps=>[...ps,...good]);dispatchStudio({type:'settings',patch:{selected:good[0].id}});}
   setStartupError(errors.join(' '));setStartupPending(false);setStartupBusy(false);
   startup.onAttached();
   const input=document.querySelector('input[type=file][aria-label="Upload photos"]');if(input)input.value='';
  },error=>{if(active&&!batch.adopted){batch.adopted=true;setStartupError(error.message);setStartupPending(false);setStartupBusy(false);startup.onAttached();}});
  return()=>{active=false};
 },[startupState,startupRevision]);
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
  if(routeView.status!=='ready')return;
  if(firstReadyScroll.current){firstReadyScroll.current=false;if(startup?.hydrate&&startup.preserveViewport)return;}
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
 },[page,routeVersion,routeView.status]);
 useLayoutEffect(()=>{
  if(!routeFocus.current||collectionBusy||routeView.status!=='ready')return;
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
 },[page,routeVersion,collectionBusy,collectionError,routeView.status]);
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

 useEffect(()=>{if(designProduct){history.replaceState(null,'','/studio');setPage('studio');}},[designProduct]);
 const detailProduct=page.startsWith('products/')?content.products.find(p=>p.id===page.slice(9)&&p.status!=='hidden'):null;
 return <><SEO page={page} content={content}/><a className="global-skip" href="#main-content" onClick={e=>{e.preventDefault();document.getElementById('main-content')?.focus()}}>Skip to content</a>
 <SiteHeader page={page} count={sum.magnetQty} onSectionNavigate={navigateSection}/>
 {startupPending&&page!=='studio'&&(startupState.error?<div className="section"><p role="alert">Your selected photos are still held in this tab. The designer could not load.</p><button type="button" className="button" onClick={()=>startup.resource.retry().catch(()=>{})}>Try loading again</button><button type="button" className="text-button" onClick={()=>go('studio')}>Back to the designer</button></div>:<p role="status">Preparing your photos…</p>)}
 <div className={storefront||page==='contact'?'':'shop-shell'}>

 <div id="main-content" tabIndex={-1} aria-busy={routeView.status==='loading'||undefined}>
 {viewKey&&routeView.status!=='ready'&&<RouteStatus error={routeView.error} onRetry={startupGate?.error?()=>startup.resource.retry().catch(()=>{}):routeView.retry} backLabel={viewKey==='editor'||orderLocked?'Back to CustomVibe':'Back to the designer'} onBack={()=>go(viewKey==='editor'||orderLocked?'home':'studio')}/>}
 {['studio','studio/business','studio/handy','puzzle','basket','checkout'].includes(page)&&<div className="purchase-progress"><StudioProgress step={page==='checkout'?'delivery':page==='basket'?'review':'make'} hasPhotos={photos.length>0||basket.some(i=>!['photo','puzzle'].includes(i.kind))} busy={collectionBusy} onStep={step=>go({make:'studio',review:'basket',delivery:'checkout'}[step])}/>{collectionBusy&&<p className="flow-loading" role="status">Preparing your collection…</p>}{collectionError&&<div className="error" role="alert">{collectionError}<button className="text-button" onClick={()=>setRetry(r=>r+1)}>Try again</button><button className="text-button" onClick={()=>go('studio')}>Back to the designer</button></div>}</div>}

 {storefront&&<Storefront page={page} onAddPack={addPack} basketCount={sum.magnetQty}/>}
 {!orderLocked&&['studio','studio/business','studio/handy'].includes(page)&&<nav className="studio-sections" aria-label="Studio designs"><a href="/studio" aria-current={page==='studio'?'page':undefined}>Photos & puzzles</a><a href="/studio/handy" aria-current={page==='studio/handy'?'page':undefined}>Handy at home</a><a href="/studio/business" aria-current={page==='studio/business'?'page':undefined}>Business magnets</a></nav>}
 {View&&!orderLocked&&page==='studio/handy'&&<View selected={handySelected} onSelect={setHandySelected} drafts={handyDrafts} setDrafts={setHandyDrafts} editing={editingHandy} onEditing={setEditingHandy} basket={basket} go={go} onSave={item=>{setBasket(saveHandyItem(basket,item,editingHandy?.id));setEditingHandy(null);setHandySelected('');go('basket');notify('Your magnet is saved in your basket.')}}/>}
 {View&&!orderLocked&&page==='studio/business'&&<View selected={businessSelected} onSelect={setBusinessSelected} drafts={businessDrafts} setDrafts={setBusinessDrafts} editing={editingBusiness} onEditing={setEditingBusiness} basket={basket} go={go} onSave={item=>{setBasket(saveHandyItem(basket,item,editingBusiness?.id));setEditingBusiness(null);setBusinessSelected('');go('basket');notify('Your magnet is saved in your basket.')}}/>}
 {View&&!orderLocked&&(['studio','puzzle'].includes(page)||designProduct)&&<View {...{studio,dispatchStudio,photos,setPhotos,basket,setBasket,go,notify}} notes={checkoutDraft.notes||''} onNotesChange={notes=>setCheckoutDraft(d=>({...d,notes}))} startupBusy={startupBusy} startupError={startupError} onStartupErrorClear={()=>setStartupError('')}/>}
 {View&&!startupPending&&(!collectionBusy||basket.length>0)&&!collectionError&&!orderLocked&&page==='basket'&&<View photos={photos} basket={displayBasket} packs={PACKS} go={go} onQuantity={changeQuantity} onRemove={removeItem} onEdit={item=>{if(isSelectableCollection(PACKS[item.kind])){setEditingPack(item);go('products/'+item.kind);return;}if(item.values?.businessTemplate){setEditingBusiness({...item,values:structuredClone(item.values)});go('studio/business');return;}if(item.values?.handyTemplate){setEditingHandy({...item,values:{...item.values,entries:[...item.values.entries]}});go('studio/handy');return;}if(item.designMode){go('studio');return;}dispatchStudio({type:'settings',patch:{selected:item.sourceId||item.id}});go('studio');}}/>}
 {View&&!startupPending&&(!collectionBusy||basket.length>0)&&!collectionError&&page==='checkout'&&<View photos={photos} basket={displayBasket} go={go} draft={checkoutDraft} setDraft={setCheckoutDraft} onStartNew={startNewRequest}/>}

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
