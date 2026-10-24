import OrderPrivacy from './OrderPrivacy';
import OrderCosts from './OrderCosts';
import PrintSheet from './PrintSheet';
import HandyDetails from '../src/designs/HandyDetails';
import {adminFetch} from './session-recovery.mjs';
import OrderProof from './OrderProof';
import EmailPreview from './EmailPreview';
import React,{useState,useEffect,useRef} from 'react';
import StageFeedback from './StageFeedback';
import {createStageMover} from './stage-move.mjs';
import StageSelect from './StageSelect';
import {api} from './api.mjs';
import {statusLabels} from '../server/order-update-email.mjs';
import {downloadOrderArchive} from './order-archive.mjs';
import {queueArtworkPreview} from './preview-queue.mjs';
import {adminDate as date} from './time.mjs';
import {mailDeliveryDetail} from './mail-delivery.mjs';
function DeliveryDetail({delivery}){
 if(!delivery)return null;
 return <><span><b>{delivery.label}</b></span>{delivery.complaint&&<span>Complaint reported. Review before further contact.</span>}{delivery.source&&<span>{delivery.source==='webhook'?'Webhook checked':'Owner dashboard checked'} {date(delivery.checkedAt)}</span>}{delivery.occurredAt&&<span>Event time {date(delivery.occurredAt)}</span>}</>;
}
function ArtworkPreview({url,alt}){
 const [src,setSrc]=useState(''),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);
 useEffect(()=>{let active=true,objectUrl;const controller=new AbortController();setError('');setSrc('');
  queueArtworkPreview(async()=>{
   const r=await adminFetch(url,{cache:'no-store',signal:controller.signal});
   if(!r.ok)throw Error(r.status===401?'Sign in again to view this artwork.':r.status===410?'This artwork has expired.':r.status===429?'The download allowance is temporarily full.':'This preview could not load. Try again shortly.');
   if(!r.headers.get('content-type')?.startsWith('image/jpeg'))throw Error('This preview could not load. Try again shortly.');
   return r.blob();
  },controller.signal).then(blob=>{if(active){objectUrl=URL.createObjectURL(blob);setSrc(objectUrl)}}).catch(e=>{if(active&&e.name!=='AbortError')setError(e instanceof TypeError?'The connection was interrupted. Try again shortly.':e.message)});
  return()=>{active=false;controller.abort();if(objectUrl)URL.revokeObjectURL(objectUrl)};
 },[url,attempt]);
 return error?<div role="alert"><p className="cv-error">{error}</p><button className="cv-btn secondary" onClick={()=>setAttempt(n=>n+1)}>Retry preview</button></div>:src?<img src={src} alt={alt} onError={()=>setError('This preview could not be displayed. Try again shortly.')}/>:<p className="cv-muted">Loading preview…</p>;
}
// Read before and after preparation so a stale archive is never exposed as current.
export async function prepareOrderArchive(read,build,onOrderRead=()=>{}){
 const current=await read();if(current.privacy)onOrderRead(current);if(current.privacy||!current.snapshot)throw Error('Order privacy changed. Read its current status before downloading.');
 const bytes=await build(current),fresh=await read();if(fresh.privacy)onOrderRead(fresh);
 if(fresh.privacy||!fresh.snapshot||fresh.version!==current.version||(fresh.contactRevision??0)!==(current.contactRevision??0))throw Error('The order changed during download. Review the current revision and try again.');
 return bytes;
}
export default function OrderDetail({order:initialOrder,onChange}){
 const [order,setOrder]=useState(initialOrder),[fence,setFence]=useState(initialOrder.privacy?'erasure':null),[complete,setComplete]=useState(false),[epoch,setEpoch]=useState(0),[ordinaryBusy,setOrdinaryBusy]=useState(false);
 const fenced=useRef(!!initialOrder.privacy);
 useEffect(()=>{if(!fenced.current)read(initialOrder);},[initialOrder]);
 function read(fresh){setOrder(fresh);fenced.current=!!fresh.privacy;setFence(fresh.privacy?'erasure':null);}
 function lock(kind,operationId){fenced.current=true;setFence(kind);if(kind==='erasure')setOrder(current=>({id:current.id,reference:current.reference,version:current.version,privacy:{state:'erasing',operationId}}));}
 if(complete)return <div className="cv-privacy-safe"><h1>Erasure complete</h1><p role="status">The selected application records and linked artwork were erased. No email was sent.</p><p>External copies require separate handling.</p><a className="cv-back" href="/orders">Back to orders</a></div>;
 return <>{fence?<div className="cv-privacy-safe"><a className="cv-back" href="/orders">Back to orders</a><h1>{order.reference}</h1><p>{fence==='erasure'?'Erasure in progress or awaiting reconciliation.':'Checking saved contact details.'}</p></div>:<OrdinaryOrderDetail order={order} onChange={onChange} onOrderRead={read} privacyEpoch={epoch} onBusyChange={setOrdinaryBusy}/>}
 <OrderPrivacy order={order} locked={ordinaryBusy} onInvalidate={()=>setEpoch(n=>n+1)} onFence={lock} onRead={read} onComplete={()=>{fenced.current=true;setComplete(true);}}/>
 </>;
}
function OrdinaryOrderDetail({order:initialOrder,onChange,onOrderRead,privacyEpoch,onBusyChange}){
 const [order,setOrder]=useState(initialOrder),[moveState,setMoveState]=useState(null),[deliveryClock,setDeliveryClock]=useState(()=>Math.floor(Date.now()/1000));
 useEffect(()=>{
  const now=Math.floor(Date.now()/1000),deadlines=Array.isArray(order.mailDelivery)?order.mailDelivery.map(row=>row?.expiresAt).filter(value=>Number.isSafeInteger(value)&&value>now):[];
  if(!deadlines.length)return;
  const timer=setTimeout(()=>setDeliveryClock(Math.floor(Date.now()/1000)),Math.min(2147483647,Math.max(1,Math.min(...deadlines)*1000-Date.now())));
  return()=>clearTimeout(timer);
 },[order.mailDelivery,deliveryClock]);
 const mover=useRef(null),updateSection=useRef(null),previewButton=useRef(null);
 useEffect(()=>{if(location.hash==='#customer-update'){updateSection.current?.focus({preventScroll:true});updateSection.current?.scrollIntoView({block:'start'});}},[]);
 useEffect(()=>setOrder(initialOrder),[initialOrder]);
 useEffect(()=>setStage(initialOrder.status),[initialOrder.status]);
 useEffect(()=>setPreview(null),[privacyEpoch,initialOrder.version,initialOrder.contactRevision]);
 const [printOpen,setPrintOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[stage,setStage]=useState(order.status),[preview,setPreview]=useState(null),[images,setImages]=useState(true);
 if(!mover.current)mover.current=createStageMover(api,setMoveState,updated=>{setOrder(updated);setStage(updated.status);setPreview(null);onOrderRead(updated)});
 const stageLocked=['saving','error','conflict'].includes(moveState?.state);
 useEffect(()=>onBusyChange(busy||stageLocked),[busy,stageLocked,onBusyChange]);
 const root='/api/orders/'+order.id,expired=order.expires*1000<=Date.now(),artworkExpired=(order.artworkExpires??order.expires)*1000<=Date.now();
 async function act(fn){if(busy||stageLocked)return;setBusy(true);setError('');setMessage('');try{await fn()}catch(e){setError(e.message)}finally{setBusy(false)}}
 async function archive(){const bytes=await prepareOrderArchive(()=>api(root),current=>downloadOrderArchive(current,(index,file)=>adminFetch(`/api/artwork/${file.requestId||order.id}/${index}`,{cache:'no-store'})),onOrderRead);const url=URL.createObjectURL(new Blob([bytes],{type:'application/zip'}));const a=document.createElement('a');a.href=url;a.download=order.reference+'-artwork.zip';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);setMessage('Your artwork archive is ready. Print quantities are in the instructions file.');}
 const latestUpdate=order.updates.find(u=>u.version===order.version),retryable=order.status!=='fulfilled'&&latestUpdate?.state==='failed'&&!!latestUpdate.retryable;
 const attempted=order.updates.some(u=>u.version===order.version||order.status==='fulfilled'&&u.status==='fulfilled');
 const currentProof=order.proof?.revision?order.proof:null;
 const artworkItems=currentProof?currentProof.items:order.snapshot.items;
 const deliveryNow=Math.max(deliveryClock,Math.floor(Date.now()/1000));
 const deliveryFor=(purpose,attempt)=>mailDeliveryDetail(order.mailDelivery,purpose,attempt,deliveryNow);
 const initialEmails=[{purpose:'owner-notification',label:'Owner email',accepted:order.ownerSent},{purpose:'customer-receipt',label:'Customer order email',accepted:order.receiptSent}];
 const artworkUrl=file=>`/api/artwork/${file.requestId||order.id}/${file.index}`;
 return <div className="cv-detail"><div className="cv-detail-top"><div><a className="cv-back" href="/orders">Back to orders</a><h1>{order.reference}</h1><p>{order.snapshot.contact.name} · {order.snapshot.magnetQty} {order.snapshot.magnetQty===1?'magnet':'magnets'}</p></div><span className="cv-unpaid">Unpaid</span></div>
 {order.previousReference&&<p className="cv-previous-reference">Earlier email reference: {order.previousReference}</p>}
 <p className="cv-note">Payment status: unpaid. Online payments are not yet available.</p>
 {error&&<div role="alert" className="cv-error">{error} <a href={'/orders?order='+order.id}>Reload order or sign in</a></div>}{message&&<p role="status" className="cv-success">{message}</p>}
 <OrderCosts order={order}/>
 {!artworkExpired&&order.status!=='fulfilled'&&<OrderProof order={order}/>}
 <StageFeedback state={moveState} mover={mover.current}/><div className="cv-detail-layout"><section className="cv-artwork"><div className="cv-section-head"><div><h2>{currentProof?`Current artwork · Revision ${currentProof.revision}`:'Artwork & print quantities'}</h2><p>Available until {date(order.artworkExpires??order.expires)}.</p></div><div className="cv-artwork-actions"><button className="cv-btn secondary" disabled={busy||stageLocked||artworkExpired} onClick={()=>setPrintOpen(!printOpen)} aria-expanded={printOpen}>{printOpen?'Hide print sheet':'Prepare print sheet'}</button><button className="cv-btn" disabled={busy||stageLocked||artworkExpired} onClick={()=>act(archive)}>{busy?'Working…':'Download all'}</button></div></div>{printOpen&&<PrintSheet order={order} disabled={stageLocked||artworkExpired} onBusyChange={setBusy} onOrderRead={fresh=>{setOrder(fresh);setPreview(null);onOrderRead(fresh);}} onClose={()=>setPrintOpen(false)}/>}
 {artworkExpired?<div><p>Artwork expired. The files are no longer available.</p><p>Order details remain available until {date(order.expires)}.</p>{order.snapshot.items.map((item,n)=><p key={n}>{item.name} · {item.qty} {item.qty===1?'unit':'units'}</p>)}</div>:<><button className="cv-btn secondary" onClick={()=>setImages(!images)}>{images?'Hide previews':'Show artwork previews'}</button>{artworkItems.map((item,n)=><article className="cv-design" key={n}><div className="cv-design-heading"><div><small>DESIGN {String(n+1).padStart(2,'0')}</small><h3>{item.name}</h3></div><strong className="cv-print-qty">{item.kind==='puzzle'?`${item.qty} ${item.qty===1?'set':'sets'}`:item.designQuantities?`${item.qty} ${item.qty===1?'selected set':'selected sets'}`:currentProof?'Per-file quantities below':`Print ${item.qty} ${item.qty===1?'copy':'copies'}`}</strong></div>{item.kind==='puzzle'&&<p>{item.gridSize} × {item.gridSize} puzzle · {item.gridSize**2} pieces per set · Print {item.qty} {item.qty===1?'copy':'copies'} of each tile.</p>}
 <HandyDetails values={item.values} submitted/>{Number.isSafeInteger(item.lineCents)&&<p className="cv-muted">Submitted design subtotal: R {(item.lineCents/100).toFixed(2)}{['photo','puzzle'].includes(item.kind)?' · Share of submitted quantity pricing':''}</p>}{!item.files.length?<p>Final artwork is still needed.</p>:<div className={'cv-file-grid'+(images?' with-previews':'')}>{item.files.map((file,fileIndex)=><div className={'cv-file'+(file.proof?' is-proof':'')} key={fileIndex}>{images&&<ArtworkPreview url={artworkUrl(file)} alt={file.proof?'Puzzle layout proof':`Design ${n+1}, ${file.name}`}/>}<div><strong>{file.proof?'Preview only':file.name.includes('-photo')?'Photo print file':file.name.match(/row-\d-col-\d/)?.[0].replaceAll('-',' ')||'Artwork'}</strong><small>{file.proof?'Do not print as a tile':`Print ${(file.copies??item.qty*(item.designQuantities?.[fileIndex]??1))} ${(file.copies??item.qty*(item.designQuantities?.[fileIndex]??1))===1?'copy':'copies'}`}</small><a href={artworkUrl(file)} download={file.name}>Download image</a></div></div>)}</div>}</article>)}</>}
 </section><aside className="cv-order-sidebar"><section><h2>Progress</h2><StageSelect id="order-stage" label="Order stage" value={stage} disabled={busy||stageLocked||expired} onChange={setStage} options={Object.entries(statusLabels).map(([value,label])=>({value,label}))}/><button className="cv-btn" disabled={busy||stageLocked||expired||stage===order.status} onClick={()=>{setPreview(null);mover.current.move(order,stage)}}>{moveState?.state==='saving'?'Saving stage…':'Save stage'}</button><p className="cv-muted">Fulfilled means delivered or collected. Moving an order does not send an email.</p>{order.fulfilledAt&&<p>Fulfilled {date(order.fulfilledAt)}</p>}<p className="cv-muted">Order details retained until {date(order.expires)}.</p></section>
 <section id="customer-update" className="cv-customer-update" ref={updateSection} tabIndex={-1} aria-labelledby="customer-update-heading"><h2 id="customer-update-heading">Customer update</h2><dl className="cv-update-recipient"><dt>Recipient</dt><dd>{order.snapshot.contact.email}</dd><dt>Saved stage</dt><dd>{statusLabels[order.status]}</dd></dl><p>Review the message before you send it.</p>{stage!==order.status&&<p className="cv-muted">Save your stage change first if you want the email to use it.</p>}<button ref={previewButton} className="cv-btn secondary" disabled={busy||stageLocked||expired||attempted&&!retryable} onClick={()=>act(async()=>{const mail=await api(root+(retryable?'/preview-retry':'/preview'),retryable?{version:order.version}:undefined);const fresh=await api(root);onOrderRead(fresh);setOrder(fresh);if(fresh.privacy||fresh.version!==mail.version||(fresh.contactRevision??0)!==(mail.contactRevision??0))throw Error('The order or customer contact changed. Review a fresh preview.');setPreview(mail);})}>{retryable?'Preview retry':'Preview update'}</button>{retryable&&<p className="cv-muted">The provider rejected the last attempt. Check the email settings, then review a fresh preview before explicitly sending again.</p>}{attempted&&!retryable&&<p className="cv-muted">An update was already attempted for this stage change. Check its history before taking further action.</p>}<a className="cv-update-history" href="#order-activity">View send history</a>{preview&&<EmailPreview returnFocus={previewButton} mail={preview} busy={busy||stageLocked} onSend={()=>act(async()=>{try{await api(root+'/send',{version:preview.version,contactRevision:preview.contactRevision,retryAttempt:preview.retryAttempt,retryToken:preview.retryToken});setMessage('The email provider accepted the update.');}finally{setPreview(null);await onChange();}})} onClose={()=>setPreview(null)}/>}</section>
 <section><h2>Customer & delivery</h2>{order.snapshot.notes&&<div><h3>Customer notes</h3><p style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{order.snapshot.notes}</p></div>}<dl><dt>Name</dt><dd>{order.snapshot.contact.name}</dd><dt>Email</dt><dd>{order.snapshot.contact.email}</dd><dt>Phone</dt><dd>{order.snapshot.contact.phone}</dd><dt>Preferred locker</dt><dd>{order.snapshot.locker.name}, {order.snapshot.locker.area}{order.snapshot.locker.provider==='tcg-locker'&&order.snapshot.locker.id&&<><br/><small>TCG Locker code: {order.snapshot.locker.id}</small></>}</dd><dt>Magnet subtotal</dt><dd>R {(order.snapshot.subtotalCents/100).toFixed(2)}</dd><dt>PUDO locker delivery</dt><dd>{Number.isSafeInteger(order.snapshot.deliveryCents)&&order.snapshot.deliveryCents>=0?(order.snapshot.deliveryCents===0?'Free':`R ${(order.snapshot.deliveryCents/100).toFixed(2)}`):'To confirm'}</dd><dt>Order total</dt><dd>{Number.isSafeInteger(order.snapshot.totalCents)&&order.snapshot.totalCents>=0?`R ${(order.snapshot.totalCents/100).toFixed(2)}`:'To confirm'}</dd></dl><p className="cv-muted">A saved locker preference does not make a booking. Confirm availability and collection arrangements separately.</p></section>
 <section id="order-activity" tabIndex={-1} aria-labelledby="order-activity-heading"><h2 id="order-activity-heading">Activity & send history</h2><ul className="cv-history">{initialEmails.map(email=>{const delivery=email.accepted?deliveryFor(email.purpose):null;return <li key={email.purpose}><strong>{email.label}</strong><span>{email.accepted?'Provider accepted':'Acceptance not confirmed'}{delivery&&<> · {date(delivery.acceptedAt)}</>}</span><DeliveryDetail delivery={delivery}/></li>})}{order.updates.map(u=><li key={'u'+(u.attempt??u.version)}><strong>{statusLabels[u.status]} email</strong><span>{u.state==='accepted'?'Provider accepted':u.state==='pending'?'Pending or outcome unconfirmed':u.state==='uncertain'?'Uncertain; check provider':u.rejected||u.retryable?'Provider rejected; not accepted':'Failed; check provider'} · {date(u.updated)}</span><DeliveryDetail delivery={u.state==='accepted'?deliveryFor('manual-update',u.attempt):null}/></li>)}{order.history.map(h=><li key={'h'+h.version}><strong>{statusLabels[h.status]}</strong><span>{date(h.created)}</span></li>)}</ul></section></aside></div></div>;
}
