import React from 'react';import {createRoot} from 'react-dom/client';
import {App} from '../src/App.jsx';import {ContentProvider} from '../src/content/ContentProvider.jsx';
import {installNavigation} from '../src/routing.mjs';import {installPreviewRouting} from '../src/seasons/preview-routing.mjs';
import '../src/shop-base.css';import '../src/shop.css';import '../src/studio.css';import '../src/consistency.css';import '../src/mobile.css';
window.__CV_ADMIN_PREVIEW__=true;installPreviewRouting();installNavigation();
// Use current saved catalogue, never a standalone copy or an outdated fallback on load failure.
try{const r=await fetch('/preview-content.json',{cache:'no-store'});if(!r.ok)throw Error();const initialContent=await r.json();createRoot(document.getElementById('root')).render(<ContentProvider initialContent={initialContent}><App/></ContentProvider>)}catch{document.getElementById('root').textContent='Could not load the current website. Reload the preview to try again.'}
