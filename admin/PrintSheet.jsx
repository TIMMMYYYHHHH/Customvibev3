import React,{useEffect,useMemo,useRef,useState} from 'react';
import {api} from './api.mjs';
import {adminFetch} from './session-recovery.mjs';
import {createPrintJob,getPrintCalibration} from './print-layout.mjs';
import {readPrintArtwork,assertCurrentPrintOrder} from './print-artwork.mjs';

const logoUrl='/coming-soon/puzzle-logo-v2.png';
const defaults=()=>getPrintCalibration();
const failMessage=error=>error instanceof TypeError?'The connection was interrupted. Retry preparation when connected.':error.message;
function calibrationValues(values){return {...values,...Object.fromEntries(['sheetXMm','sheetYMm','columnSpacingMm','rowSpacingMm','imageMm'].map(key=>[key,values[key]===''?NaN:Number(values[key])])),slotOffsets:values.slotOffsets.map(slot=>({xMm:slot.xMm===''?NaN:Number(slot.xMm),yMm:slot.yMm===''?NaN:Number(slot.yMm)}))};}
function NumberField({label,value,onChange,min=-30,max=30}){
 return <label>{label}<input type="number" min={min} max={max} step="0.1" value={value} onChange={event=>onChange(event.target.value)}/></label>;
}
function SheetPreview({page,urls,showGuides}){
 return <svg className="cv-print-paper" viewBox="0 0 210 297" role="img" aria-label={`A4 page ${page.pageIndex+1}, ${page.placements.length} magnet positions`}>
  <rect width="210" height="297" fill="white"/>
  {page.placements.map(placement=><g key={placement.slotIndex}>
   <image href={urls.get(placement.file.name)} x={placement.xMm} y={placement.yMm} width={placement.imageMm} height={placement.imageMm} preserveAspectRatio="xMidYMid meet"/>
   {showGuides&&<polygon points={placement.outer.polygon.map(point=>`${point.xMm},${point.yMm}`).join(' ')} fill="none" stroke="#291438" strokeWidth="0.15"/>}
   {placement.branding.map((brand,n)=><g key={n} transform={`translate(${brand.xMm} ${brand.yMm}) rotate(${brand.rotation})`}>
    <image href={logoUrl} x={brand.logoXMm} y={brand.logoYMm} width={brand.logoMm} height={brand.logoHeightMm}/>
    <text x={brand.textXMm} y={brand.textYMm} fontFamily="Helvetica,Arial,sans-serif" fontSize={brand.fontSizePt*25.4/72} fill="#ae2e5b">{brand.text}</text>
   </g>)}
  </g>)}
 </svg>;
}
export default function PrintSheet({order,disabled=false,onClose,onBusyChange,onOrderRead}){
 const [prepared,setPrepared]=useState(null),[values,setValues]=useState(defaults),[pageIndex,setPageIndex]=useState(0),[slotIndex,setSlotIndex]=useState(0),[error,setError]=useState(''),[status,setStatus]=useState(''),[busy,setBusy]=useState(false),[clock,setClock]=useState(Date.now);
 const active=useRef(true),operation=useRef(0),controller=useRef(null),resources=useRef([]),busyRef=useRef(false),title=useRef(null),callbacks=useRef({onBusyChange,onOrderRead});callbacks.current={onBusyChange,onOrderRead};
 function clearResources(){for(const url of resources.current)URL.revokeObjectURL(url);resources.current=[];}
 function working(value){busyRef.current=value;setBusy(value);callbacks.current.onBusyChange?.(value);}
 async function prepare(){
  if(busyRef.current||disabled)return;
  const run=++operation.current;controller.current?.abort();const abort=new AbortController();controller.current=abort;
  clearResources();setPrepared(null);setError('');setStatus('Loading current artwork…');working(true);
  try{
   const fresh=await api('/api/orders/'+order.id),job=createPrintJob(fresh);
   const artwork=await readPrintArtwork(job,(file,options)=>adminFetch(`/api/artwork/${file.requestId}/${file.index}`,{cache:'no-store',signal:options.signal}),{signal:abort.signal});
   assertCurrentPrintOrder(job,await api('/api/orders/'+order.id));
   if(!active.current||run!==operation.current||abort.signal.aborted)return;
   const urls=new Map();for(const [name,bytes] of artwork){const url=URL.createObjectURL(new Blob([bytes],{type:'image/jpeg'}));resources.current.push(url);urls.set(name,url);}
   callbacks.current.onOrderRead?.(fresh);setPrepared({order:fresh,artwork,urls});setPageIndex(0);setStatus('Current artwork is ready. Check the sheet before downloading.');
  }catch(e){if(active.current&&run===operation.current&&!abort.signal.aborted){setError(failMessage(e));setStatus('');}}
  finally{if(active.current&&run===operation.current)working(false);}
 }
 useEffect(()=>{
  active.current=true;title.current?.focus({preventScroll:true});prepare();
  return()=>{active.current=false;operation.current++;controller.current?.abort();clearResources();callbacks.current.onBusyChange?.(false);};
 },[order.id]);
 useEffect(()=>{if(!prepared)return;const remaining=(prepared.order.artworkExpires??prepared.order.expires)*1000-Date.now();if(remaining<=0)return;const timer=setTimeout(()=>setClock(Date.now()),Math.min(remaining+1,2147483647));return()=>clearTimeout(timer);},[prepared,clock]);
 const plan=useMemo(()=>{
  if(!prepared)return {};
  try{return {job:createPrintJob(prepared.order,{calibration:calibrationValues(values),now:clock})};}catch(e){return {error:e.message};}
 },[prepared,values,clock]);
 const job=plan.job,page=job?.pages[Math.min(pageIndex,job.pages.length-1)],expired=prepared&&(prepared.order.artworkExpires??prepared.order.expires)*1000<=Date.now();
 const changed=prepared&&(prepared.order.id!==order.id||prepared.order.version!==order.version||(prepared.order.proof?.revision??0)!==(order.proof?.revision??0)||(prepared.order.proof?.digest??null)!==(order.proof?.digest??null));
 const blocked=disabled||busy||!job||expired||changed;
 function field(key,value){setValues(current=>({...current,[key]:value}));setError('');setStatus('Placement changed. Check the preview before downloading.');}
 function slotField(key,value){setValues(current=>({...current,slotOffsets:current.slotOffsets.map((slot,n)=>n===slotIndex?{...slot,[key]:value}:slot)}));setError('');}
 async function download(){
  if(blocked||busyRef.current)return;
  const run=++operation.current;working(true);setError('');setStatus('Checking the current revision and preparing your PDF…');
  try{
   assertCurrentPrintOrder(job,await api('/api/orders/'+order.id));
   const logo=await fetch(logoUrl,{cache:'no-store'});
   if(!logo.ok||!logo.headers.get('content-type')?.startsWith('image/png'))throw Error('The print logo could not load. Retry when connected.');
   const logoBytes=new Uint8Array(await logo.arrayBuffer());
   const {exportPrintPdf}=await import('./print-pdf.mjs');
   const bytes=await exportPrintPdf(job,prepared.artwork,{logoBytes});
   assertCurrentPrintOrder(job,await api('/api/orders/'+order.id));
   if(!active.current||run!==operation.current)return;
   const url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));resources.current.push(url);
   const anchor=document.createElement('a');anchor.href=url;anchor.download=`${order.reference.replace(/[^a-zA-Z0-9-]/g,'')}-print-sheets.pdf`;anchor.click();
   setStatus('PDF downloaded. Print A4 portrait at Actual size / 100%, with Fit or Shrink disabled.');
  }catch(e){if(active.current&&run===operation.current){setError(failMessage(e));setStatus('');}}
  finally{if(active.current&&run===operation.current)working(false);}
 }
 return <section className="cv-print-sheet" aria-labelledby="print-sheet-heading" aria-busy={busy}>
  <div className="cv-print-heading"><div><h3 id="print-sheet-heading" ref={title} tabIndex={-1}>Prepare print sheet</h3><p>A4 · Six positions · 63.5 × 63.5 mm finished faces</p></div><button type="button" className="cv-btn secondary" onClick={onClose}>Close print sheet</button></div>
  <p>Saved artwork and exact quantities, with @customvibe on the folded backs. Preparing a sheet does not change the order or send email.</p>
  {status&&<p role="status" className="cv-muted">{status}</p>}{error&&<p role="alert" className="cv-error">{error}</p>}
  {changed&&<p role="alert" className="cv-error">The order changed. Prepare again to use its current artwork.</p>}
  {plan.error&&<p role="alert" className="cv-error">{plan.error}</p>}
  <div className="cv-print-actions"><button type="button" className="cv-btn secondary" disabled={busy||disabled} onClick={prepare}>Prepare again</button><button type="button" className="cv-btn" disabled={blocked} onClick={download}>{busy?'Working…':'Download print PDF'}</button></div>
  {prepared&&<div className="cv-print-layout"><div className="cv-print-controls">
   {job&&<p><strong>{job.totalCopies} {job.totalCopies===1?'magnet':'magnets'} · {job.pages.length} {job.pages.length===1?'page':'pages'}</strong><br/>{job.reference}{job.revision?` · Artwork revision ${job.revision}`:''}<br/>{job.pages.length*6-job.totalCopies} unused positions</p>}
   <fieldset disabled={busy}><legend>Sheet placement in mm</legend><div className="cv-print-fields"><NumberField label="Move sheet right / left" value={values.sheetXMm} onChange={value=>field('sheetXMm',value)}/><NumberField label="Move sheet down / up" value={values.sheetYMm} onChange={value=>field('sheetYMm',value)}/><NumberField label="Column spacing adjustment" value={values.columnSpacingMm} onChange={value=>field('columnSpacingMm',value)}/><NumberField label="Row spacing adjustment" value={values.rowSpacingMm} onChange={value=>field('rowSpacingMm',value)}/></div></fieldset>
   <details><summary>Adjust one position or image extent</summary><fieldset disabled={busy}><legend>Advanced placement</legend><label>Position<select value={slotIndex} onChange={e=>setSlotIndex(Number(e.target.value))}>{Array.from({length:6},(_,n)=><option value={n} key={n}>Row {Math.floor(n/2)+1}, {n%2?'right':'left'}</option>)}</select></label><div className="cv-print-fields"><NumberField label="Position right / left" value={values.slotOffsets[slotIndex].xMm} onChange={value=>slotField('xMm',value)}/><NumberField label="Position down / up" value={values.slotOffsets[slotIndex].yMm} onChange={value=>slotField('yMm',value)}/><NumberField label="Printed image size (mm)" min={63.5} max={70} value={values.imageMm} onChange={value=>field('imageMm',value)}/></div><p>The face stays 63.5 mm. Increasing image size puts image edges beyond that face for wrapping. The full saved image keeps its shape; check important edge details before printing.</p></fieldset></details>
   <label className="cv-print-check"><input type="checkbox" checked={values.showGuides} disabled={busy} onChange={e=>field('showGuides',e.target.checked)}/>Show outer fold-template outlines</label>
   <button type="button" className="cv-btn secondary" disabled={busy} onClick={()=>{setValues(defaults());setError('');setStatus('Placement reset to the template defaults.');}}>Reset placement</button>
   <p className="cv-muted">Adjustments stay in this open tab. No Canva step is needed. First use: print one plain-paper sheet at 100% before using magnet stock.</p>
  </div><div className="cv-print-preview">{page?<><label>Preview page<select value={page.pageIndex} onChange={e=>setPageIndex(Number(e.target.value))}>{job.pages.map((p,n)=><option key={n} value={n}>Page {n+1} of {job.pages.length}</option>)}</select></label><SheetPreview page={page} urls={prepared.urls} showGuides={values.showGuides}/><p className="cv-muted">Screen preview is scaled to fit. PDF pages are A4 at their specified dimensions.</p></>:<p>Correct the placement values to restore the preview.</p>}</div></div>}
 </section>;
}
