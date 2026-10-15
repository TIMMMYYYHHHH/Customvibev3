import Artwork from './Artwork';
import AdminShell from './AdminShell';
import Orders from './Orders';
import {saveAdminContent} from './save.mjs';
import React from 'react';import {createRoot} from 'react-dom/client';import Admin from '../src/content/Admin';import {ContentProvider} from '../src/content/ContentProvider';import '@fontsource-variable/fredoka';import '@fontsource-variable/dm-sans';
async function logout(){const r=await fetch('/api/session',{cache:'no-store'});if(!r.ok){location.href='/';return}const {csrf}=await r.json();const result=await fetch('/auth/logout',{method:'POST',redirect:'manual',body:new URLSearchParams({csrf})});if(result.ok||result.status===303||result.type==='opaqueredirect'){sessionStorage.removeItem('customvibe-admin-draft');location.href='/'}else alert('Could not sign out. Please try again.');}
const section=location.pathname==='/content'?'content':location.pathname==='/artwork'?'artwork':'orders';
createRoot(document.getElementById('root')).render(<AdminShell section={section} logout={logout}>{section==='content'?<ContentProvider onSave={saveAdminContent}><Admin/></ContentProvider>:section==='artwork'?<Artwork/>:<Orders/>}</AdminShell>);
