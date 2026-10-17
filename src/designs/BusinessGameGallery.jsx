import React from 'react';
import {businessExamples,gameArtworkUrl} from './business-games.mjs';
import {collectionDesigns} from './catalogue.mjs';
import './magnet-satin.css';
import './business-games.css';
const Face=({url,label})=><span className="satin-magnet"><span className="satin-art"><img src={url} alt={label} loading="lazy"/></span></span>;
export function BusinessGallery(){return <div className="design-gallery business-gallery" aria-label="Nine business magnet ideas">{businessExamples.map(example=><figure key={example.id}><Face url={example.url} label={example.label}/></figure>)}</div>;}
export function GameGallery({all=false}){
 const designs=collectionDesigns('noughts-crosses');
 return <div className={`design-gallery game-gallery ${all?'all-designs':''}`} aria-label={all?'Full set: five X and five O magnets':'Noughts and crosses magnet preview'}>{(all?designs:designs.slice(0,9)).map(d=><figure key={d.id}><Face url={gameArtworkUrl(d.values.title)} label={`${d.values.title} magnet`}/></figure>)}</div>;
}
