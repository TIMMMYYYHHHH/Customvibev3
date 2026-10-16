import React,{useEffect,useRef} from 'react';
import {emailPreviewDocument} from './email-preview.mjs';
export default function EmailPreview({mail,busy,onSend,onClose,returnFocus}){
 const dialog=useRef(null);
 useEffect(()=>{const element=dialog.current,previous=document.activeElement;element.showModal();return()=>{element.close();(returnFocus?.current||previous)?.focus();}},[]);
 return <dialog ref={dialog} className="cv-email-dialog" aria-labelledby="email-preview-title" onCancel={event=>{event.preventDefault();if(!busy)onClose();}}>
  <header><h2 id="email-preview-title">Email preview</h2><button className="cv-btn quiet" disabled={busy} onClick={onClose} autoFocus>Close preview</button></header>
  <div className="cv-email-envelope"><dl><dt>To</dt><dd>{mail.to}</dd><dt>Subject</dt><dd>{mail.subject}</dd></dl><p>The design and message used for this update. Your customer’s email app may display fonts and colours differently.</p></div>
  <iframe title="Customer email design" sandbox="" referrerPolicy="no-referrer" srcDoc={emailPreviewDocument(mail)}/>
  <details className="cv-email-plain"><summary>Show plain text</summary><pre>{mail.text}</pre></details>
  <footer><button className="cv-btn" disabled={busy} onClick={onSend}>{busy?'Sending…':'Send update'}</button><button className="cv-btn quiet" disabled={busy} onClick={onClose}>Cancel</button></footer>
 </dialog>;
}
