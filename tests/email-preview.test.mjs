import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import {orderUpdateEmail} from '../server/order-update-email.mjs';
test('designed preview uses the send template, inlines its images and isolates customer HTML',async()=>{
 const built=await build({entryPoints:['admin/EmailPreview.jsx'],bundle:true,write:false,format:'cjs',platform:'node',external:['react'],logLevel:'silent'});
 const module={exports:{}};new Function('require','module','exports',built.outputFiles[0].text)(createRequire(import.meta.url),module,module.exports);
 const mail=orderUpdateEmail({reference:'CV-000004',status:'shipped',version:7,snapshot:{contact:{name:'<img src=x onerror=alert(1)>',email:'customer@example.com'},magnetQty:3}});
 const html=renderToStaticMarkup(React.createElement(module.exports.default,{mail,busy:false,onSend:()=>{},onClose:()=>{}}));
 assert.match(html,/<dialog/);assert.match(html,/customer@example.com/);assert.match(html,/CV-000004/);
 assert.match(html,/<iframe[^>]*sandbox=""/);assert.match(html,/srcDoc="/);assert.match(html,/data:image\/png;base64,/);
 assert.match(html,/default-src &#x27;none&#x27;/);assert.doesNotMatch(html,/allow-scripts|allow-same-origin/);
 assert.match(html,/Show plain text/);assert.match(html,/Send update/);
});
