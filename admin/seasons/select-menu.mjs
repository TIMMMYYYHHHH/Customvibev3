// Accessible custom menus keep the chevron inset and retain existing form events.
let serial=0,closeCurrent=()=>{};
export function enhanceSelects(root){
 closeCurrent();
 root.querySelectorAll('select:not([data-enhanced])').forEach(select=>{
  select.dataset.enhanced='true'; select.hidden=true;
  const wrapper=document.createElement('span');wrapper.className='demo-select';
  const button=document.createElement('button');button.type='button';button.className='demo-select-trigger';button.id=(select.id||'choice-'+(++serial))+'-trigger';
  const label=select.getAttribute('aria-label')||select.labels?.[0]?.textContent.trim()||'Choose an option';
  button.setAttribute('role','combobox');button.setAttribute('aria-label',label);button.setAttribute('aria-haspopup','listbox');button.setAttribute('aria-expanded','false');button.disabled=select.disabled;
  const value=document.createElement('span'),chevron=document.createElement('span');chevron.className='select-chevron';chevron.setAttribute('aria-hidden','true');button.append(value,chevron);
  const list=document.createElement('ul');list.className='demo-select-options';list.id=button.id+'-options';list.setAttribute('role','listbox');list.setAttribute('aria-label',label);list.hidden=true;
  wrapper.append(button,list);select.after(wrapper);
  for(const l of select.labels||[])if(l.htmlFor)l.htmlFor=button.id;
  const options=[...select.options];let active=select.selectedIndex,search='',lastKey=0;
  const nodes=options.map((o,i)=>{const item=document.createElement('li');item.id=list.id+'-'+i;item.setAttribute('role','option');item.setAttribute('aria-disabled',String(o.disabled));item.textContent=o.textContent;item.addEventListener('pointerdown',e=>e.preventDefault());item.addEventListener('pointermove',()=>{if(!o.disabled){active=i;highlight()}});item.addEventListener('click',()=>choose(i));list.append(item);return item});
  function sync(){value.textContent=select.selectedOptions[0]?.textContent||'Choose';nodes.forEach((node,i)=>node.setAttribute('aria-selected',String(i===select.selectedIndex)))}
  function highlight(){nodes.forEach((node,i)=>node.classList.toggle('is-active',i===active));button.setAttribute('aria-activedescendant',nodes[active]?.id||'');nodes[active]?.scrollIntoView({block:'nearest'})}
  function close(){list.hidden=true;button.setAttribute('aria-expanded','false');button.removeAttribute('aria-activedescendant');document.removeEventListener('pointerdown',outside);window.removeEventListener('resize',close)}
  function outside(e){if(!wrapper.contains(e.target))close()}
  function open(){closeCurrent();closeCurrent=close;active=select.selectedIndex;list.hidden=false;button.setAttribute('aria-expanded','true');button.setAttribute('aria-controls',list.id);const r=button.getBoundingClientRect();wrapper.classList.toggle('opens-up',innerHeight-r.bottom<220&&r.top>220);highlight();document.addEventListener('pointerdown',outside);window.addEventListener('resize',close)}
  function choose(i){if(options[i]?.disabled)return;select.selectedIndex=i;sync();close();button.focus();select.dispatchEvent(new Event('change',{bubbles:true}));}
  button.addEventListener('click',()=>list.hidden?open():close());
  wrapper.addEventListener('focusout',e=>{if(!wrapper.contains(e.relatedTarget))close()});
  button.addEventListener('keydown',e=>{
   if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();const wasClosed=list.hidden;if(wasClosed)open();const enabled=options.map((o,i)=>o.disabled?-1:i).filter(i=>i>=0);const index=enabled.indexOf(active);active=e.key==='Home'?enabled[0]:e.key==='End'?enabled.at(-1):wasClosed?active:enabled[Math.max(0,Math.min(enabled.length-1,index+(e.key==='ArrowDown'?1:-1)))];highlight()}
   else if(e.key==='Enter'||e.key===' '){e.preventDefault();list.hidden?open():choose(active)}
   else if(e.key==='Escape'){e.preventDefault();close()}
   else if(e.key==='Tab')close();
   else if(e.key.length===1&&!e.ctrlKey&&!e.metaKey&&!e.altKey){e.preventDefault();const now=Date.now();search=(now-lastKey<700?search:'')+e.key.toLowerCase();lastKey=now;const i=options.findIndex(o=>!o.disabled&&o.textContent.toLowerCase().startsWith(search));if(i>=0){if(list.hidden)open();active=i;highlight()}}
  });
  select.addEventListener('change',sync);sync();
 });
}
