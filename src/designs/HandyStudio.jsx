import React,{useEffect,useState,useRef} from 'react';
import {handyTemplate,defaultHandyValues,handyFieldError,validateHandyValues} from './handy.mjs';
import {renderHandy} from './handy-render.mjs';
import HandyGallery from './HandyGallery';
import {MagnetPreview} from '../MagnetPreview';
import {useContent} from '../content/ContentProvider';
import {canPurchase} from '../content/model.mjs';
import {orderCapacity} from '../commerce.mjs';
import './handy.css';
export default function HandyStudio({selected,onSelect,drafts,setDrafts,editing,onEditing,onSave,basket,go}){
 const {content}=useContent(),product=content.products.find(p=>p.id==='information');
 const design=handyTemplate(editing?.values?.handyTemplate||selected);
 useEffect(()=>{if(design)window.scrollTo({top:0,behavior:'instant'});},[design?.id]);
 const values=design?(editing?.values||drafts[design.id]||defaultHandyValues(design.id)):null;
 const mounted=useRef(true);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false}},[]);
 const [preview,setPreview]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const fieldErrors=design?.fields.map((f,i)=>handyFieldError(f,values.entries[i]))||[];
 const invalid=fieldErrors.some(Boolean),signature=JSON.stringify(values);
 useEffect(()=>{let active=true;setPreview('');setError('');if(values&&!invalid)renderHandy(values,{size:800}).then(result=>{if(active)setPreview(result.url)}).catch(e=>{if(active)setError(e.message)});return()=>{active=false}},[signature,invalid]);
 function change(index,text){const next={...values,entries:values.entries.map((value,i)=>i===index?text:value)};if(editing)onEditing({...editing,values:next});else setDrafts(previous=>({...previous,[design.id]:next}));}
 async function save(event){event.preventDefault();if(busy||invalid||!preview)return;setBusy(true);setError('');try{
  const clean=validateHandyValues(values);if(!canPurchase(product))throw Error('This design is not available to order right now.');
  const item={id:editing?.id||crypto.randomUUID(),kind:'information',qty:editing?.qty||1,printVersion:1,designMode:'self',values:clean};
  const next=[...basket.filter(i=>i.id!==item.id),item],capacity=orderCapacity(next,content);if(!capacity.allowed)throw Error(capacity.issues.join(' '));
  const artwork=await renderHandy(clean);if(!mounted.current)return;onSave({...item,preview:artwork.url});
 }catch(e){setError(e.message)}finally{setBusy(false)}}
 function back(){onEditing(null);onSelect('');}
 return <main className="handy-studio section">
 <header className="handy-heading"><p className="eyebrow">LITTLE DETAILS. RIGHT AT HOME.</p><h1>Handy at home.</h1><p>Choose a design and add the details that make it yours. Each magnet is 7.5 × 7.5 cm.</p></header>
 {!design?<><HandyGallery onChoose={onSelect}/><p className="handy-help">Pick any individual design. Add copies or mix different designs in your basket.</p></>:<>
 <button className="button secondary handy-back" onClick={back} disabled={busy}>{editing?'Cancel editing':'Choose another design'}</button>
 <div className="handy-workbench"><figure className="handy-live-preview" aria-busy={!preview&&!invalid&&!error}>
 <MagnetPreview urls={[preview||design.image]} label={design.name+' preview'}/><figcaption>7.5 × 7.5 cm · Square magnet</figcaption>
 {invalid&&<p role="status">Shorten the marked details to update your preview.</p>}
 </figure><form className="handy-fields" onSubmit={save}><h2>{design.name}</h2><p>The headings stay as they are. Your details are printed in the handwriting shown here.</p>
 <fieldset disabled={busy}><legend className="sr-only">Your printed details</legend>{design.fields.map((field,i)=><div className="handy-field" key={field.label}><label htmlFor={'handy-field-'+i}>{field.label}</label><input id={'handy-field-'+i} value={values.entries[i]} placeholder={field.placeholder} maxLength={field.limit} autoComplete="off" aria-invalid={!!fieldErrors[i]} aria-describedby={'handy-hint-'+i} onChange={event=>change(i,event.target.value)}/><small id={'handy-hint-'+i}>{fieldErrors[i]||`Up to ${field.limit} characters · Optional`}</small></div>)}</fieldset>
 <p className="handy-help">Check the spelling and numbers in your preview. Empty fields will stay blank.</p>
 {error&&<p role="alert" className="error">{error}</p>}
 <button className="button" disabled={busy||invalid||!preview||!canPurchase(product)} type="submit">{busy?'Preparing your magnet…':editing?'Save changes':'Add magnet to basket'}</button>
 {editing&&<p>{editing.qty} {editing.qty===1?'copy':'copies'} in your basket will use these details.</p>}
 </form></div></>}
 {basket.length>0&&<button className="handy-view-basket text-button" onClick={()=>go('basket')} disabled={busy}>View basket</button>}
 </main>;
}
