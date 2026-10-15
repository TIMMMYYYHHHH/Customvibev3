import React, {useEffect, useRef, useState} from 'react';
import CollectionPackPreview from './CollectionPackPreview';
import ProductDetails,{ProductStatus} from './ProductDetails';
import {groups} from '../content/model.mjs';
import {useContent} from '../content/ContentProvider';

export default function MagnetCollections({Puzzle,onAddPack}) {
  const {content}=useContent();const collections=content.products.filter(p=>p.status!=='hidden');
  const [group,setGroup]=useState(groups[0]), [query,setQuery]=useState(''), [active,setActive]=useState(null);
  const matches=collections.filter(item=>(group===groups[0]||item.group===group)&&`${item.name} ${item.description} ${item.tags}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <div className="collection-page">
    <section className="catalog-intro content"><div><p className="overline">LITTLE SQUARES. SO MANY POSSIBILITIES.</p><h1>Find your kind<br/>of <em>fridge joy.</em></h1><p>First words and favourite colours. A little encouragement. A thoughtful gift. Explore magnet collections for all kinds of people.</p></div><div className="catalog-intro-art" aria-hidden="true"><CollectionPackPreview kind="photos"/></div></section>
    <section className="catalog-browser content" aria-labelledby="browse-title"><div className="catalog-tools"><h2 id="browse-title">Magnet collections</h2><label className="collection-search">Find a design<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Try apple, green or gifts"/></label></div>
      <div className="collection-filters" aria-label="Filter magnet collections">{groups.map(name=><button key={name} aria-pressed={group===name} onClick={()=>setGroup(name)}>{name}</button>)}</div>
      <p className="result-count" role="status">{matches.length} {matches.length===1?'collection':'collections'} to explore</p>
      <div className="catalog-grid">{matches.map(item=><article key={item.id}><ProductStatus product={item}/>
        {item.href?<a className="catalog-art" href={item.href} aria-label={'Create '+item.name}>{item.id==='puzzle'&&!item.image?<Puzzle/>:<CollectionPackPreview kind={item.id}/>}</a>:<button className="catalog-art" onClick={()=>setActive(item)} aria-label={'Explore '+item.name}><CollectionPackPreview kind={item.id}/></button>}
        <div className="catalog-card-copy"><p className="overline">{item.group}</p><h3>{item.name}</h3><p>{item.description}</p>{item.href?<a className="text-link" href={item.href}>{item.id==='puzzle'?'Create a 3 × 3 or 5 × 5 puzzle':'Use your own photos'}</a>:<button className="text-link" onClick={()=>setActive(item)}>Explore collection</button>}</div>
      <a className="text-button" href={'/products/'+item.id}>Product details</a></article>)}</div>
      {!matches.length&&<div className="collection-empty"><h3>No little squares found yet.</h3><p>Try another word, or explore the whole collection.</p><button className="action" onClick={()=>{setGroup(groups[0]);setQuery('')}}>Show all collections</button></div>}
    </section>
    <section className="catalog-personal content"><div><p className="overline">THE MOST PERSONAL COLLECTION OF ALL</p><h2>Nothing quite like<br/>your own people.</h2><p>Bring your favourite photos. We’ll help turn them into little squares of everyday joy.</p></div><a className="action" href="/studio">Make your photo magnets</a></section>
    {active&&<ProductDetails product={content.products.find(p=>p.id===active.id)||active} onClose={()=>setActive(null)} onAddPack={onAddPack}/>}
  </div>;
}
