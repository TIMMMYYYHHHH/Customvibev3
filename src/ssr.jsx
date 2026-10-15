import React from 'react';import {renderToString} from 'react-dom/server';import {ContentProvider} from './content/ContentProvider';import {App} from './App';
export function render(path,content){return renderToString(<ContentProvider initialContent={content}><App initialPage={path.replace(/^\/|\/$/g,'')||'home'}/></ContentProvider>)}
