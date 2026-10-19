import test from 'node:test';import assert from 'node:assert/strict';
import {createServer} from 'vite';import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import {defaultContent} from '../src/content/model.mjs';
// Render actual components, using Vite only for the project's JSX/CSS transforms.
const vite=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});
const {ContentProvider}=await vite.ssrLoadModule('/src/content/ContentProvider.jsx');
const {SubmissionProvider}=await vite.ssrLoadModule('/src/FormService.jsx');
const {SiteHeader,SiteFooter}=await vite.ssrLoadModule('/src/SiteChrome.jsx');
const {AdminChrome}=await vite.ssrLoadModule('/admin/AdminShell.jsx');
const {StudioProgress}=await vite.ssrLoadModule('/src/Editor.jsx');
const {default:Contact}=await vite.ssrLoadModule('/src/storefront/Contact.jsx');
const {default:Admin}=await vite.ssrLoadModule('/src/content/Admin.jsx');
const wrap=child=>renderToStaticMarkup(React.createElement(ContentProvider,{initialContent:defaultContent},React.createElement(SubmissionProvider,null,child)));
test('public navigation and progress name the basket and checkout consistently',()=>{
 const header=wrap(React.createElement(SiteHeader,{page:'home'}));assert.match(header,/>Contact us<\/a>/);assert.match(header,/href="\/contact"/);
 const progress=wrap(React.createElement(StudioProgress,{step:'review',hasPhotos:true,onStep:()=>{}}));assert.match(progress,/>Basket<\/button>/);assert.match(progress,/>Checkout<\/button>/);assert.doesNotMatch(progress,/>Review<\/button>/);
});
test('contact form has a privacy link without provider copy, photos warning or reference',()=>{
 const contact=wrap(React.createElement(Contact,{standalone:true}));assert.match(contact,/href="\/privacy"/);assert.doesNotMatch(contact,/W3Forms|keep photos|payment details|Message reference/);assert.match(contact,/aria-label="Contact us"/);
});
test('public footer, admin and Themes chrome render the notice entry point',()=>{
 const surfaces=[
  ['public footer',wrap(React.createElement(SiteFooter))],
  ['admin workroom',renderToStaticMarkup(React.createElement(AdminChrome,{section:'orders',logout:()=>{}}))],
  ['Themes workroom',renderToStaticMarkup(React.createElement(AdminChrome,{section:'themes',logout:()=>{},connectionStatus:true}))]
 ];
 for(const [surface,html] of surfaces)assert.match(html,/<a\b[^>]*href="\/third-party-notices\.txt"[^>]*>Third-party notices<\/a>/,surface+' must expose the readable notices link');
});
test('contact display and Admin View website link retain their exact destinations',()=>{
 assert.match(wrap(React.createElement(Contact,{standalone:true})),/<a href="mailto:hello@customvibe\.co\.za">hello@customvibe\.co\.za<\/a>/);
 const previous=Object.getOwnPropertyDescriptor(globalThis,'sessionStorage');
 try{Object.defineProperty(globalThis,'sessionStorage',{configurable:true,value:{getItem(){return null}}});
  assert.match(wrap(React.createElement(Admin)),/<a class="button secondary" href="https:\/\/customvibe\.co\.za\/">View website<\/a>/);
 }finally{if(previous)Object.defineProperty(globalThis,'sessionStorage',previous);else delete globalThis.sessionStorage}
});
test.after(async()=>{await vite.close()});
