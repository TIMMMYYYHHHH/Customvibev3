import React, {useId, useRef, useState} from 'react';

// Keep selection separate from Save stage. Keyboard navigation never saves an order.
export default function StageSelect({id, label, value, options, onChange, disabled=false}) {
 const generated=useId(), controlId=id||generated, listId=controlId+'-options';
 const [open,setOpen]=useState(false),[active,setActive]=useState(0);
 const typeahead=useRef({text:'',time:0});
 const selected=Math.max(0,options.findIndex(option=>option.value===value));
 const expanded=open&&!disabled;
 function show(){setActive(selected);setOpen(true)}
 function choose(index){if(disabled)return;onChange(options[index].value);setOpen(false)}
 function keyDown(event){
  if(disabled)return;
  const key=event.key;
  if(['ArrowDown','ArrowUp','Home','End'].includes(key)){
   event.preventDefault();setOpen(true);
   setActive(key==='Home'?0:key==='End'?options.length-1:!expanded?selected:Math.max(0,Math.min(options.length-1,active+(key==='ArrowDown'?1:-1))));
  }else if(key==='Enter'||key===' '){event.preventDefault();expanded?choose(active):show()}
  else if(key==='Escape'){event.preventDefault();setOpen(false)}
  else if(key==='Tab'){setOpen(false)}
  else if(key.length===1&&!event.ctrlKey&&!event.metaKey&&!event.altKey){
   const now=Date.now();typeahead.current={text:(now-typeahead.current.time<700?typeahead.current.text:'')+key.toLowerCase(),time:now};
   const index=options.findIndex(option=>option.label.toLowerCase().startsWith(typeahead.current.text));
   if(index>=0){event.preventDefault();setActive(index);setOpen(true)}
  }
 }
 return <div className="cv-stage-select" onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget))setOpen(false)}}>
  <label id={controlId+'-label'} htmlFor={controlId}>{label}</label>
  <button id={controlId} className="cv-stage-trigger" type="button" role="combobox" aria-labelledby={controlId+'-label'} aria-haspopup="listbox" aria-expanded={expanded} aria-controls={expanded?listId:undefined} aria-activedescendant={expanded?`${listId}-${active}`:undefined} disabled={disabled} onKeyDown={keyDown} onClick={()=>expanded?setOpen(false):show()}>
   <span>{options[selected].label}</span><svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16"><path d="m3 6 5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
  </button>
  {expanded&&<ul id={listId} role="listbox" aria-labelledby={controlId+'-label'} className="cv-stage-options">{options.map((option,index)=><li id={`${listId}-${index}`} key={option.value} role="option" aria-selected={option.value===value} className={index===active?'is-active':''} onMouseDown={event=>event.preventDefault()} onMouseMove={()=>setActive(index)} onClick={()=>choose(index)}>{option.label}{option.value===value&&<span aria-hidden="true">✓</span>}</li>)}</ul>}
 </div>;
}
