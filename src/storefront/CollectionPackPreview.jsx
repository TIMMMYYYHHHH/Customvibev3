import React from 'react';
import {useContent} from '../content/ContentProvider';
import {defaultContent} from '../content/model.mjs';
import {MagnetPiece} from '../MagnetPreview';

// Display each existing artwork face through its own viewport. Source assets
// stay intact; the shared surface supplies the live gloss and shadow per tile.
const packs={
 alphabet:{image:'cutouts/alphabet-pack-glossy.webp',label:'Square alphabet magnet concepts A to F',faces:[[73,237,322],[460,237,322],[850,237,322],[73,630,322],[460,630,322],[850,630,322]]},
 counting:{image:'cutouts/counting-pack-glossy.webp',label:'Square counting magnet concepts 1 to 5 with matching dots',faces:[[75,236,321],[464,236,321],[850,236,321],[251,666,335],[662,666,335]]},
 words:{image:'collections/first-words.webp',label:'First words magnet concepts: apple, tree, sun and cat',faces:[[139,163,444,426],[668,163,441,426],[139,666,444,426],[668,666,441,426]]},
 colours:{image:'collections/colour-club.webp',label:'Colour magnet concepts: green, blue, pink and orange',faces:[[153,150,422],[689,150,421],[153,689,422],[689,689,421]]},
 reminders:{image:'collections/little-reminders.webp',label:'Four little reminder magnet concepts',faces:[[100,124,485,460],[671,124,484,460],[100,668,485,458],[671,668,484,458]]},
 thanks:{image:'collections/little-thank-yous.webp',label:'Four thank-you and gift magnet concepts',faces:[[100,122,485,460],[670,122,485,460],[100,670,485,458],[670,670,485,458]]},
 photos:{image:'cutouts/05-sunglasses-square.webp',label:'Photo magnet of a couple wearing sunglasses',faces:[[126,119,1001]]}
};
export default function CollectionPackPreview({kind}){
 const {content}=useContent();const item=content.products.find(p=>p.id===kind);
 const original=defaultContent.products.find(p=>p.id===kind);
 if(kind==='puzzle')return <div className="collection-pack-stage"><img loading="lazy" src={content.images.puzzle} alt="Coastal photo for a square magnet puzzle"/></div>;
 if(!packs[kind]||item?.image!==original?.image)return <div className="collection-pack-stage custom-pack-image"><img src={item?.image} alt={item?.name||'Magnet collection'}/></div>;
 const pack=packs[kind];
 const layout=pack.faces.length===4?'four':pack.faces.length===1?'single':'';
 return <div className="collection-pack-stage"><div className={`collection-pack-preview ${kind} ${layout}`} role="img" aria-label={pack.label}>{pack.faces.map(([x,y,width,height=width],i)=><MagnetPiece key={i}><svg className="collection-pack-face" viewBox={`${x} ${y} ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true" focusable="false"><image href={`/assets/${pack.image}`} width="1254" height="1254"/></svg></MagnetPiece>)}</div></div>;
}
