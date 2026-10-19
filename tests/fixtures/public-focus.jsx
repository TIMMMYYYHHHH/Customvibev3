// Disconnected local fixture. No submissions or provider calls are allowed.
import React,{StrictMode} from 'react';import {createRoot} from 'react-dom/client';
import {installPreviewRouting} from '../../src/seasons/preview-routing.mjs';
import {App} from '../../src/App';import {ContentProvider} from '../../src/content/ContentProvider';import {defaultContent} from '../../src/content/model.mjs';import {installNavigation} from '../../src/routing.mjs';
import '../../src/shop-base.css';import '../../src/shop.css';import '../../src/studio.css';import '../../src/consistency.css';import '../../src/mobile.css';
if(!['localhost','127.0.0.1','[::1]'].includes(location.hostname))throw Error('Local fixture only');
const preview=new URLSearchParams(location.search).has('preview');
window.focusFixture={requests:[],configError:false,widgets:[],sends:[]};
window.turnstile={render:(element,options)=>{window.focusFixture.widgets.push(options);queueMicrotask(()=>options.callback('synthetic-token'));return window.focusFixture.widgets.length;},remove:()=>{}};
const content=structuredClone(defaultContent);content.products.forEach(product=>{if(product.status!=='hidden')product.status='available';});
window.fetch=async(input,options={})=>{
 const url=new URL(typeof input==='string'?input:input.url,location.origin);window.focusFixture.requests.push({path:url.pathname,method:options.method||'GET'});
 if(url.origin!==location.origin)throw Error('External request blocked');
 if(url.pathname==='/api/order-request'){window.focusFixture.sends.push(JSON.parse(options.body));return Response.json({error:'Synthetic uncertain outcome'},{status:503});}
 if(url.pathname==='/api/season')return Response.json({});
 if(url.pathname==='/content.json')return Response.json(content);
 if(url.pathname==='/api/forms')return window.focusFixture.configError?Response.json({error:'Synthetic unavailable config'},{status:503}):Response.json({available:true,csrf:'synthetic',siteKey:'synthetic'});
 throw Error('Unexpected request blocked: '+url.pathname);
};
if(preview){window.__CV_ADMIN_PREVIEW__=true;history.replaceState(null,'','/preview?page=/studio');installPreviewRouting();}else history.replaceState(null,'','/studio');
installNavigation();createRoot(document.getElementById('root')).render(<StrictMode><ContentProvider initialContent={content}><App initialPage="studio"/></ContentProvider></StrictMode>);
