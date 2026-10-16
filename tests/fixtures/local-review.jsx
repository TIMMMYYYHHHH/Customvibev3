// Developer-only fixture, never a production build entry. No real email or uploads.
import React from 'react';import {createRoot} from 'react-dom/client';import {App} from '../../src/App';import {ContentProvider} from '../../src/content/ContentProvider';import {defaultContent} from '../../src/content/model.mjs';import {installNavigation} from '../../src/routing.mjs';import {requestReference} from '../../src/request-reference.mjs';
import '../../src/shop-base.css';import '../../src/shop.css';import '../../src/studio.css';import '../../src/consistency.css';
import '../../src/mobile.css';
if(!['localhost','127.0.0.1','[::1]'].includes(location.hostname))throw new Error('Local review only');
const requests=new Map();let attempts=0,previousId=null;
window.turnstile={render:(el,options)=>{queueMicrotask(()=>options.callback('synthetic-local-check'));return 1},remove:()=>{}};
window.fetch=async(input,options={})=>{const url=new URL(typeof input==='string'?input:input.url,location.origin);if(url.origin!==location.origin)throw new Error('External sending is blocked in local review');
 if(url.pathname==='/content.json')return Response.json(defaultContent);
 if(url.pathname==='/api/forms')return Response.json({available:true,csrf:'synthetic-local',siteKey:'synthetic-local'});
 if(url.pathname==='/api/contact')return Response.json({ok:true,reference:'internal-contact-trace',status:'message-sent'});
 if(url.pathname==='/api/order-request'){const {payload}=JSON.parse(options.body);attempts++;const same=previousId===payload.id;previousId=payload.id;document.querySelector('#review-result').textContent=`${attempts} attempts · ${same?'same request identity':'new request identity'} · ${requests.size} accepted`;
 if(document.querySelector('#review-fail').checked)return Response.json({error:'Simulated timeout. Keep this tab open and retry the same request.'},{status:503});
 if(!requests.has(payload.id))requests.set(payload.id,{ok:true,reference:requestReference(payload),receiptSent:true,status:'unpaid-request'});document.querySelector('#review-result').textContent=`${attempts} attempts · ${same?'same request identity':'new request identity'} · ${requests.size} accepted`;return Response.json(requests.get(payload.id));}
 throw new Error('Unexpected request blocked in local review');
};
installNavigation();createRoot(document.getElementById('root')).render(<ContentProvider><App initialPage="home"/></ContentProvider>);
