import React,{useId} from 'react';
import {ORDER_NOTES_LIMIT} from './order-notes.mjs';
export default function OrderNotes({value='',onChange,disabled=false}){
 const id=useId();
 return <div className="order-notes"><label htmlFor={id}>Notes or instructions for us <span>(optional)</span></label><p id={id+'-help'}>Anything we should know about your magnets? If a note is for one image, describe it so we can identify it. These notes go to our team and won’t be printed on your magnets.</p><textarea id={id} value={value} disabled={disabled} onChange={e=>onChange(e.target.value)} maxLength={ORDER_NOTES_LIMIT} rows={3} aria-describedby={id+'-help '+id+'-count'} placeholder="For example: please double-check the crop on the family beach photo."/><small id={id+'-count'}>{value.length} / {ORDER_NOTES_LIMIT} characters</small></div>;
}
