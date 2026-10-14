import React from 'react';
import {createRoot} from 'react-dom/client';
import {ContentProvider} from './content/ContentProvider';
import {App} from './App.jsx';
import './shop-base.css';
import './shop.css';
import './studio.css';
import './consistency.css';
createRoot(document.getElementById('root')).render(<React.StrictMode><ContentProvider><App/></ContentProvider></React.StrictMode>);
