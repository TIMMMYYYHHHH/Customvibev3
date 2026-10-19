import Wordmark from '../src/Wordmark.jsx';
import React from 'react';
import SessionRecovery from './SessionRecovery';
import './admin-shell.css';
import './workroom.css';
export function AdminChrome({section='orders',logout,connectionStatus=false}){return <><a className="admin-skip" href="#admin-main">Skip to main content</a><header className="cv-admin-header"><a className="cv-admin-brand" href="/orders"><Wordmark logo/><span>THE WORKROOM</span></a><nav aria-label="Admin navigation">{[['orders','Orders','/orders'],['content','Store content','/content'],['themes','Themes & seasons','/themes']].map(([id,label,url])=><a key={id} href={url} aria-current={section===id?'page':undefined}>{label}</a>)}</nav><button className="cv-btn quiet" onClick={logout}>Sign out</button></header><div className="cv-test-strip"><span className="cv-dot"/>Private store<span className="cv-store-policy">Payments unavailable · Artwork: 14 days · Order details: 6 months</span>{connectionStatus&&<span id="connection-status" role="status">Loading saved settings…</span>}</div><SessionRecovery/></>}
export default function AdminShell({children,section='orders',logout}){return <div className="cv-admin admin-workroom"><AdminChrome section={section} logout={logout}/><div id="admin-main" tabIndex={-1}>{children}</div></div>}
