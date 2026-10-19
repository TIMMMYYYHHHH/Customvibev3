import React from 'react';
import {businessDesigns} from './business.mjs';
import {businessExamples} from './business-games.mjs';
import {MagnetPiece} from '../MagnetPreview';
import './handy.css';
export default function BusinessGallery({onChoose}){return <div className="handy-gallery handy-chooser" aria-label="Nine business magnet designs">{businessDesigns.map((d,i)=><button type="button" key={d.id} data-design-id={d.id} onClick={()=>onChoose(d.id)} aria-label={d.name+': add your details'}><MagnetPiece><img src={businessExamples[i].url} alt={d.name} loading="lazy"/></MagnetPiece><span>{d.name}</span><small>Add your details{d.qr?' & QR code':''}</small></button>)}</div>;}
