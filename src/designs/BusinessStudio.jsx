import React,{useEffect,useLayoutEffect,useState,useRef} from 'react';
import {businessTemplate,defaultBusinessValues,businessFieldError,validateBusinessValues} from './business.mjs';
import {renderBusiness} from './business-render.mjs';
import BusinessGallery from './BusinessGallery';
import {MagnetPreview} from '../MagnetPreview';
import {useContent} from '../content/ContentProvider';
import {canPurchase} from '../content/model.mjs';
import {orderCapacity} from '../commerce.mjs';
import './handy.css';
export default function BusinessStudio({selected,onSelect,drafts,setDrafts,editing,onEditing,onSave,basket,go}){
 const {content}=useContent(),product=content.products.find(p=>p.id==='business');
 const design=businessTemplate(editing?.values?.businessTemplate||selected);
 useEffect(()=>{if(design)window.scrollTo({top:0,behavior:'instant'});},[design?.id]);
 const values=design?(editing?.values||drafts[design.id]||defaultBusinessValues(design.id)):null;
 const studioRoot=useRef(null),focusRequest=useRef(null);
 useLayoutEffect(()=>{
  const request=focusRequest.current;if(!request)return;
  const root=studioRoot.current;
  const target=request==='workbench'?root?.querySelector('[data-studio-workbench]'):request==='heading'?root?.querySelector('h1'):[...root.querySelectorAll('[data-design-id]')].find(button=>button.dataset.designId===request);
  focusRequest.current=null;
  if(!document.querySelector('dialog[open],[role="dialog"][aria-modal="true"]'))target?.focus({preventScroll:true});
 },[design?.id,editing?.id]);
 function choose(id){focusRequest.current='workbench';onSelect(id);}
 const mounted=useRef(true);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false}},[]);
 const [preview,setPreview]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const fieldErrors=design?.fields.map((f,i)=>businessFieldError(f,values.entries[i]))||[];
 const invalid=fieldErrors.some(Boolean),signature=JSON.stringify(values);
 useEffect(()=>{let active=true;setPreview('');setError('');if(values&&!invalid)renderBusiness(values,{size:800,incomplete:true}).then(result=>{if(active)setPreview(result.url)}).catch(e=>{if(active)setError(e.message)});return()=>{active=false}},[signature,invalid]);
 function update(next){if(editing)onEditing({...editing,values:next});else setDrafts(previous=>({...previous,[design.id]:next}));}
 function changeQR(patch){update({...values,qr:{...values.qr,...patch}});}
 function change(index,text){const next={...values,entries:values.entries.map((value,i)=>i===index?text:value)};if(editing)onEditing({...editing,values:next});else setDrafts(previous=>({...previous,[design.id]:next}));}
 async function save(event){event.preventDefault();if(busy||invalid||!preview)return;setBusy(true);setError('');try{
  const clean=validateBusinessValues(values);if(!canPurchase(product))throw Error('This design is not available to order right now.');
  const item={id:editing?.id||crypto.randomUUID(),kind:'business',qty:editing?.qty||1,printVersion:1,designMode:'self',values:clean};
  const next=[...basket.filter(i=>i.id!==item.id),item],capacity=orderCapacity(next,content);if(!capacity.allowed)throw Error(capacity.issues.join(' '));
  const artwork=await renderBusiness(clean);if(!mounted.current)return;onSave({...item,preview:artwork.url});
 }catch(e){setError(e.message)}finally{setBusy(false)}}
 function back(){focusRequest.current=editing?'heading':design.id;onEditing(null);onSelect('');}
 return <main className="handy-studio section" ref={studioRoot}>
 <header className="handy-heading"><p className="eyebrow">YOUR BUSINESS. ALWAYS HANDY.</p><h1 tabIndex={-1}>Business magnets.</h1><p>Choose a design and add the details that make it yours. Each magnet is 7.5 × 7.5 cm.</p></header>
 {!design?<><BusinessGallery onChoose={choose}/><p className="handy-help">Pick any individual design. Add copies or mix different designs in your basket.</p></>:<>
 <button className="button secondary handy-back" onClick={back} disabled={busy}>{editing?'Cancel editing':'Choose another design'}</button>
 <div className="handy-workbench"><figure className="handy-live-preview" aria-busy={!preview&&!invalid&&!error}>
 <MagnetPreview urls={[preview||design.image]} label={design.name+' preview'}/><figcaption>7.5 × 7.5 cm · Square magnet</figcaption>
 {invalid&&<p role="status">Shorten the marked details to update your preview.</p>}
 </figure><form className="handy-fields" onSubmit={save}><h2 tabIndex={-1} data-studio-workbench>{design.name}</h2><p>Add your business details below. Your wording and QR code will be printed exactly as shown.</p>
 <fieldset disabled={busy}><legend className="sr-only">Your printed details</legend>{design.fields.map((field,i)=><div className="handy-field" key={field.label}><label htmlFor={'handy-field-'+i}>{field.label}</label><input id={'handy-field-'+i} value={values.entries[i]} placeholder={field.sample} required={!field.optional} maxLength={field.limit} autoComplete="off" aria-invalid={!!fieldErrors[i]} aria-describedby={'handy-hint-'+i} onChange={event=>change(i,event.target.value)}/><small id={'handy-hint-'+i}>{fieldErrors[i]||`Up to ${field.limit} characters${field.optional?' · Optional':''}`}</small></div>)}</fieldset>
 {design.qr&&<fieldset disabled={busy} className="business-qr"><legend>Your QR code</legend>
 {design.wifi&&<div className="handy-field"><label htmlFor="qr-mode">When someone scans</label><select id="qr-mode" value={values.qr.mode} onChange={e=>update({...values,qr:e.target.value==='url'?{mode:'url',url:''}:{mode:'wifi',network:'',password:'',security:'WPA'}})}><option value="wifi">Join Wi-Fi</option><option value="url">Open a link</option></select></div>}
 {values.qr.mode==='url'?<div className="handy-field"><label htmlFor="qr-url">{design.wifi?'Guest portal link':design.id==='02-salon'?'Booking link':design.id==='03-cafe'?'Menu link':'Review page link'}</label><input id="qr-url" type="url" required value={values.qr.url} maxLength={240} placeholder="https://your-business.co.za" autoComplete="off" onChange={e=>changeQR({url:e.target.value})}/><small>Use the full link. The printed code opens this exact address.</small></div>:<>
 <div className="handy-field"><label htmlFor="qr-network">Wi-Fi network name</label><input id="qr-network" required value={values.qr.network} maxLength={32} autoComplete="off" placeholder="Guest Wi-Fi" onChange={e=>changeQR({network:e.target.value})}/></div>
 <div className="handy-field"><label htmlFor="qr-security">Network security</label><select id="qr-security" value={values.qr.security} onChange={e=>changeQR({security:e.target.value,password:e.target.value==='nopass'?'':values.qr.password})}><option value="WPA">Password protected</option><option value="nopass">Open network</option></select></div>
 {values.qr.security!=='nopass'&&<div className="handy-field"><label htmlFor="qr-password">Guest Wi-Fi password</label><input id="qr-password" type="password" required minLength={8} autoComplete="new-password" value={values.qr.password} maxLength={63} onChange={e=>changeQR({password:e.target.value})}/><small>Use your guest network password. Anyone with this magnet can join that network.</small></div>}
 </>}
 <p className="handy-help">Test the code with your phone before ordering. Changing a link or password later requires a new printed code.</p>
 </fieldset>}
 <p className="handy-help">Check the spelling and numbers in your preview. Optional fields can stay blank.</p>
 {error&&<p role="alert" className="error">{error}</p>}
 <button className="button" disabled={busy||invalid||!preview||!canPurchase(product)} type="submit">{busy?'Preparing your magnet…':editing?'Save changes':'Add magnet to basket'}</button>
 {editing&&<p>{editing.qty} {editing.qty===1?'copy':'copies'} in your basket will use these details.</p>}
 </form></div></>}
 {basket.length>0&&<button className="handy-view-basket text-button" onClick={()=>go('basket')} disabled={busy}>View basket</button>}
 </main>;
}
