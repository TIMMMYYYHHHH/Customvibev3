import test from 'node:test';import assert from 'node:assert/strict';
import {createServer} from 'vite';import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import {defaultContent} from '../src/content/model.mjs';
// Render actual components, using Vite only for the project's JSX/CSS transforms.
const vite=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});
const {ContentProvider}=await vite.ssrLoadModule('/src/content/ContentProvider.jsx');
const {SubmissionProvider}=await vite.ssrLoadModule('/src/FormService.jsx');
const {SiteHeader}=await vite.ssrLoadModule('/src/SiteChrome.jsx');
const {StudioProgress}=await vite.ssrLoadModule('/src/Editor.jsx');
const {default:Contact}=await vite.ssrLoadModule('/src/storefront/Contact.jsx');
const wrap=child=>renderToStaticMarkup(React.createElement(ContentProvider,{initialContent:defaultContent},React.createElement(SubmissionProvider,null,child)));
test('public navigation and progress name the basket and checkout consistently',()=>{
 const header=wrap(React.createElement(SiteHeader,{page:'home'}));assert.match(header,/>Contact us<\/a>/);assert.match(header,/href="\/contact"/);
 const progress=wrap(React.createElement(StudioProgress,{step:'review',hasPhotos:true,onStep:()=>{}}));assert.match(progress,/>Basket<\/button>/);assert.match(progress,/>Checkout<\/button>/);assert.doesNotMatch(progress,/>Review<\/button>/);
});
test('contact form has a privacy link without provider copy, photos warning or reference',()=>{
 const contact=wrap(React.createElement(Contact,{standalone:true}));assert.match(contact,/href="\/privacy"/);assert.doesNotMatch(contact,/W3Forms|keep photos|payment details|Message reference/);assert.match(contact,/aria-label="Contact us"/);
});
test.after(async()=>{await vite.close()});
