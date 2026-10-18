// Snapshot the actual storefront. No second page, copied catalogue or interactive clone.
const active=new WeakMap();
export function fadeChristmasChange(update,{doc=document,motion=true}={}){
 active.get(doc)?.skipTransition?.();
 if(!motion||typeof doc.startViewTransition!=='function'){
  update();
  return Promise.resolve();
 }
 const root=doc.documentElement;
 root.dataset.christmasTransition='true';
 let transition;
 try{transition=doc.startViewTransition(update)}catch{
  delete root.dataset.christmasTransition;
  update();
  return Promise.resolve();
 }
 active.set(doc,transition);
 // Cancellation (including a hidden tab) must never prevent the preference update.
 transition.ready.catch(()=>{});
 return transition.finished.catch(()=>{}).finally(()=>{
  if(active.get(doc)===transition){active.delete(doc);delete root.dataset.christmasTransition}
 });
}
