import React from 'react';
export default function RouteStatus({error,onRetry,onBack,backLabel}){
 return <main className="section"><h1>{error?'Page unavailable.':'Opening your page.'}</h1>{error?<><p role="alert">This page could not load. Your work is still held in this tab.</p><button type="button" className="button" onClick={onRetry}>Try loading again</button><button type="button" className="text-button" onClick={onBack}>{backLabel}</button></>:<p role="status">Opening this page…</p>}</main>;
}
