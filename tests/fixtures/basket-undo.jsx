// Local synthetic data only. Unexpected requests, email and provider calls fail closed.
import React,{StrictMode} from 'react';import {createRoot} from 'react-dom/client';
import {App} from '../../src/App';import {ContentProvider} from '../../src/content/ContentProvider';import {defaultContent} from '../../src/content/model.mjs';import {installNavigation} from '../../src/routing.mjs';
import '../../src/shop-base.css';import '../../src/shop.css';import '../../src/studio.css';import '../../src/consistency.css';import '../../src/mobile.css';
if(!['localhost','127.0.0.1','[::1]'].includes(location.hostname))throw Error('Local fixture only');
const fixture=window.undoFixture={revoked:[],created:[],sends:[],sendMode:'success',shareOriginals:false};
const create=URL.createObjectURL.bind(URL),revoke=URL.revokeObjectURL.bind(URL);
URL.createObjectURL=blob=>{if(fixture.shareOriginals&&fixture.sharedSource)return fixture.sharedSource;const source=create(blob);fixture.created.push(source);if(fixture.shareOriginals)fixture.sharedSource=source;return source;};
URL.revokeObjectURL=source=>{fixture.revoked.push(source);revoke(source);};
window.turnstile={render:(element,options)=>{queueMicrotask(()=>options.callback('synthetic-token'));return 1;},remove:()=>{}};
const content=structuredClone(defaultContent);content.products.forEach(product=>{if(product.status!=='hidden')product.status='available';});
window.fetch=async(input,options={})=>{
 const url=new URL(typeof input==='string'?input:input.url,location.origin);
 if(url.origin!==location.origin)throw Error('External request blocked');
 if(url.pathname==='/content.json')return Response.json(content);
 if(url.pathname==='/api/forms')return Response.json({available:true,csrf:'synthetic',siteKey:'synthetic'});
 if(url.pathname==='/api/order-request'){
  const body=JSON.parse(options.body);fixture.sends.push(body);
  return fixture.sendMode==='success'?Response.json({ok:true,reference:'LOCAL-ONLY',receiptSent:true}):Response.json({error:'Synthetic uncertain order. Keep this tab open.',manualReview:fixture.sendMode==='manual'},{status:503});
 }
 throw Error('Unexpected request blocked: '+url.pathname);
};
installNavigation();createRoot(document.getElementById('root')).render(<StrictMode><ContentProvider initialContent={content}><App initialPage="studio"/></ContentProvider></StrictMode>);
