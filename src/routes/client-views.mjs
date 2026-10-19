const importers={
 editor:()=>import('../Editor.jsx').then(module=>module.Editor),
 handy:()=>import('../designs/HandyStudio.jsx').then(module=>module.default),
 business:()=>import('../designs/BusinessStudio.jsx').then(module=>module.default),
 basket:()=>import('../CollectionReview.jsx').then(module=>module.CollectionReview),
 checkout:()=>import('../Checkout.jsx').then(module=>module.Checkout),
};
export function createClientRouteViews(loaders=importers){
 const components=new Map(),pending=new Map();
 return {
  peek:key=>components.get(key)||null,
  load(key){
   if(!Object.hasOwn(loaders,key))return Promise.reject(Error('Unknown page resource.'));
   if(components.has(key))return Promise.resolve(components.get(key));
   if(!pending.has(key)){
    const request=Promise.resolve().then(()=>loaders[key]()).then(Component=>{components.set(key,Component);return Component}).finally(()=>pending.delete(key));
    pending.set(key,request);
   }
   return pending.get(key);
  },
 };
}
export const clientRouteViews=createClientRouteViews();
