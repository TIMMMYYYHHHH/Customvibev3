import React,{useEffect,useRef} from 'react';
export default function ProofConfirmation({confirmation,onCancel,onConfirm}){
 const dialog=useRef(null);
 useEffect(()=>{const el=dialog.current,previous=document.activeElement;el.showModal();return()=>{el.close();previous?.focus()}},[]);
 return <dialog ref={dialog} className="cv-proof-confirm" aria-labelledby="proof-confirm-title" aria-describedby="proof-confirm-description" onCancel={e=>{e.preventDefault();onCancel()}}><h2 id="proof-confirm-title">{confirmation.title}</h2><p id="proof-confirm-description">{confirmation.body}</p><div className="cv-confirm-actions"><button type="button" className="cv-btn quiet" onClick={onCancel} autoFocus>Cancel</button><button type="button" className="cv-btn" onClick={onConfirm}>{confirmation.label}</button></div></dialog>;
}
