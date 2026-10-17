import {MagnetPiece} from '../MagnetPreview';
import React,{useEffect,useState} from 'react';
import {collectionDesigns} from './catalogue.mjs';
import {renderDesign} from './render.mjs';
import './design-studio.css';
export const samples={
 business:{title:'Bloom & Stem',details:'FLOWERS & LITTLE JOYS\nMade with love in Durban\nhello@example.com',colour:'mint'},
 qr:{title:'Something good starts here.',url:'https://customvibe.co.za',details:'Our little world. One quick scan.',colour:'lilac'},
 wifi:{title:'Stay a little. Connect a little.',network:'The Little Cottage',password:'WelcomeHome',security:'WPA',colour:'peach'},
 information:{title:'Our little house reminders',details:'BIN DAY · TUESDAY\nRECYCLING · FRIDAY\nPLANT CARE · SUNDAY',colour:'lilac'}
};
export default function DesignGallery({kind,all=false}){
 const [images,setImages]=useState([]),[error,setError]=useState('');
 useEffect(()=>{let active=true;const masters=collectionDesigns(kind),designs=masters.length?(all?masters:masters.slice(0,4)):[{id:kind,template:kind,version:1,values:samples[kind]}];Promise.all(designs.map(async d=>({id:d.id,...await renderDesign(d)}))).then(v=>{if(active)setImages(v)}).catch(()=>{if(active)setError('Artwork preview is unavailable. Please reload.');});return()=>{active=false}},[kind,all]);
 return <div className={`design-gallery ${all?'all-designs':''}`} aria-label={all?'Every included magnet':'Magnet artwork preview'}>{images.map((image,i)=><figure key={image.id}><MagnetPiece><img src={image.url} alt={`${kind} magnet ${i+1}`}/></MagnetPiece>{all&&<figcaption>{i+1}</figcaption>}</figure>)}{!images.length&&<p>{error||'Preparing artwork…'}</p>}</div>;
}
