// This controller never retries a failed/deadline request without an explicit action.
export function createStartupResource({load,timers=globalThis,timeout=15000}){
 let snapshot={status:'idle',module:null,error:null},request;const listeners=new Set();
 const publish=next=>{snapshot=next;for(const listener of listeners)listener()};
 function begin(){
  publish({status:'loading',module:null,error:null});
  request=new Promise((resolve,reject)=>{
   let settled=false;
   const finish=(error,module)=>{if(settled)return;settled=true;timers.clearTimeout(timer);publish({status:error?'error':'ready',module:module||null,error:error||null});error?reject(error):resolve(module)};
   const timer=timers.setTimeout(()=>finish(Error('This page took too long to load.')),timeout);
   Promise.resolve().then(load).then(module=>finish(null,module),error=>finish(error));
  });
  request.catch(()=>{});return request;
 }
 return {subscribe:listener=>{listeners.add(listener);return()=>listeners.delete(listener)},getSnapshot:()=>snapshot,start:()=>request||begin(),retry:()=>snapshot.status==='error'?begin():request||begin()};
}

export function startStudioHandoff({document:doc=globalThis.document,registry,getPage,navigate,mount,timers=globalThis,timeout=15000}){
 const root=doc.getElementById('root'),input=root.querySelector('input[type=file][aria-label="Upload photos"]');
 let mounted=false,pendingFiles=null,statusNode,fileVersion=0;
 const resource=createStartupResource({timers,timeout,load:()=>registry.load('editor').then(()=>import('../Editor.jsx'))});
 const contactElements=Object.fromEntries(['name','email','message'].map(key=>[key,root.querySelector('#contact-'+key)]));
 const notes=root.querySelector('.studio-notes textarea');
 const fileChange=event=>{if(event.target===input){pendingFiles=Array.from(input.files||[]);fileVersion++;event.stopImmediatePropagation()}};
 const chooser=event=>{const button=event.target.closest?.('.one-studio .studio-add,.one-studio .studio-stage-empty .button');if(button&&root.contains(button)){event.preventDefault();event.stopImmediatePropagation();input.click()}};
 const over=event=>{if(event.target.closest?.('.one-studio .studio-stage'))event.preventDefault()};
 const drop=event=>{if(event.target.closest?.('.one-studio .studio-stage')){event.preventDefault();const files=Array.from(event.dataTransfer?.files||[]);if(!files.length)return;event.stopImmediatePropagation();pendingFiles=files;fileVersion++}};
 doc.addEventListener('change',fileChange,true);doc.addEventListener('click',chooser,true);doc.addEventListener('dragover',over,true);doc.addEventListener('drop',drop,true);
 const releaseControls=()=>{doc.removeEventListener('change',fileChange,true);doc.removeEventListener('click',chooser,true);doc.removeEventListener('dragover',over,true);doc.removeEventListener('drop',drop,true)};
 function snapshot(hydrate){
  const contact={current:Object.fromEntries(Object.entries(contactElements).map(([key,node])=>[key,node?.value||''])),read(){if(Object.values(contactElements).every(node=>node?.isConnected))this.current=Object.fromEntries(Object.entries(contactElements).map(([key,node])=>[key,node.value]));return this.current}};
  const active=doc.activeElement,preserveViewport=hydrate&&(active!==doc.body||globalThis.scrollY!==0);
  return {resource,contact,hydrate,preserveViewport,readNotes:()=>notes?.value||'',readFiles:()=>pendingFiles===null?Array.from(input.files||[]):pendingFiles,fileVersion:()=>fileVersion,onAttached(){releaseControls();pendingFiles=[];input.value='';}};
 }
 function finish(hydrate){
  if(mounted)return;mounted=true;stop();globalThis.removeEventListener('popstate',changed);globalThis.removeEventListener('hashchange',changed);statusNode?.remove();
  mount({hydrate,startup:snapshot(hydrate)});
 }
 function changed(){if(!mounted&&getPage()!=='studio')finish(false)}
 function showError(){
  if(statusNode)return;statusNode=doc.createElement('section');statusNode.setAttribute('aria-label','Page loading');
  const text=doc.createElement('p');text.setAttribute('role','alert');text.textContent='This page could not load. Your work is still held in this tab.';
  const retry=doc.createElement('button');retry.type='button';retry.className='button';retry.textContent='Try loading again';retry.addEventListener('click',()=>{retry.disabled=true;resource.retry().catch(()=>{});});
  const back=doc.createElement('button');back.type='button';back.className='text-button';back.textContent='Back to CustomVibe';back.addEventListener('click',()=>navigate('/'));
  statusNode.append(text,retry,back);root.before(statusNode);
 }
 const stop=resource.subscribe(()=>{
  const state=resource.getSnapshot();if(state.status==='ready')finish(getPage()==='studio');
  else if(state.status==='error'){showError();statusNode.querySelector('button').disabled=false;}
 });
 globalThis.addEventListener('popstate',changed);globalThis.addEventListener('hashchange',changed);
 resource.start().catch(()=>{});return resource;
}
