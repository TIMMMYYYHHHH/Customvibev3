import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import {ContentProvider} from '../../src/content/ContentProvider';
import {defaultContent} from '../../src/content/model.mjs';
import CollectionPicker from '../../src/designs/CollectionPicker';
import '../../src/shop-base.css';
import '../../src/shop.css';
import '../../src/studio.css';
import '../../src/consistency.css';
import '../../src/mobile.css';
import '../../src/button-system.css';

if(!['localhost','127.0.0.1','[::1]'].includes(location.hostname))throw Error('Local only');
const content=structuredClone(defaultContent);
content.products.forEach(p=>p.status='available');
window.fetch=async input=>{
 const url=new URL(typeof input==='string'?input:input.url,location.origin);
 if(url.origin===location.origin&&url.pathname==='/content.json')return Response.json(content);
 throw Error('Local fixture blocks all network submissions');
};
const params=new URLSearchParams(location.search),product=content.products.find(p=>p.id===(params.get('product')||'alphabet'));
const initialItem=params.has('edit')?{kind:'alphabet',qty:3,style:'clay',designIds:['alphabet-1','alphabet-26'],designQuantities:[2,1]}:undefined;
function Fixture(){
 const [saved,setSaved]=useState(null);
 const picker=<CollectionPicker product={product} initialItem={initialItem} onAdd={(kind,designIds,designQuantities,style)=>setSaved({kind,designIds,designQuantities,style})}/>;
 return <ContentProvider initialContent={content}><div className="storefront shop-shell">{params.has('dialog')?<dialog open className="shared-product-dialog collection-select-dialog"><div className="collection-dialog-heading"><h2>{product.name}</h2><p>Local layout fixture</p></div>{picker}</dialog>:<main className="section collection-select-page"><h1>{product.name}</h1>{picker}</main>}<output hidden aria-label="Saved selection">{saved&&JSON.stringify(saved)}</output></div></ContentProvider>;
}
createRoot(document.getElementById('root')).render(<Fixture/>);
