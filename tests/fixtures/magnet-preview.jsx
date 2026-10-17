// Read-only local fixture: sending is disabled and every network request is blocked.
import React from 'react';
import {createRoot} from 'react-dom/client';
import Storefront from '../../src/storefront/Storefront';
import {MagnetPiece} from '../../src/MagnetPreview';
import {ContentProvider} from '../../src/content/ContentProvider';
import {SubmissionProvider} from '../../src/FormService';
import {defaultContent} from '../../src/content/model.mjs';
import '../../src/shop-base.css';
import '../../src/shop.css';
import '../../src/studio.css';
import '../../src/consistency.css';
import '../../src/mobile.css';
if(!['localhost','127.0.0.1','[::1]'].includes(location.hostname))throw new Error('Local fixture only');
window.fetch=async input=>{
 const url=new URL(typeof input==='string'?input:input.url,location.origin);
 if(url.origin===location.origin&&url.pathname==='/content.json')return Response.json(defaultContent);
 if(url.origin===location.origin&&url.pathname==='/api/forms')return Response.json({available:false});
 throw new Error('Requests outside local content are blocked');
};
const page=new URLSearchParams(location.search).get('page')||'collections';
createRoot(document.getElementById('root')).render(<ContentProvider><SubmissionProvider><Storefront page={page}/><div id="edge-samples" style={{display:'flex',gap:40,padding:40,background:'#eee'}}>{[0,3,-3].map(angle=><div key={angle} style={{width:220,transform:`rotate(${angle}deg)`}}><MagnetPiece><div style={{position:'absolute',inset:0,background:'#e35830'}}/></MagnetPiece></div>)}</div></SubmissionProvider></ContentProvider>);
