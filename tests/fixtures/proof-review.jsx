import React from 'react';import {createRoot} from 'react-dom/client';import ProofReview from '../../src/ProofReview';import '../../src/shop-base.css';import '../../src/shop.css';
if(!['localhost','127.0.0.1','[::1]'].includes(location.hostname))throw Error('Local only');
createRoot(document.getElementById('root')).render(<ProofReview/>);
