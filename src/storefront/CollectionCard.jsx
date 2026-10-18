import React from 'react';
import {collectionPreviewStyle} from '../designs/artwork.mjs';
import {isTemplateProduct} from '../designs/products.mjs';
import CollectionPackPreview from './CollectionPackPreview';
import {ProductStatus} from './ProductDetails';
import './collection-cards.css';

export default function CollectionCard({item,Puzzle,onExplore}) {
  const template=isTemplateProduct(item);
  const href=item.id==='information'?'/studio/handy':item.href||(template?'/studio':null);
  const preview=item.id==='puzzle'&&!item.image?<Puzzle/>:<CollectionPackPreview kind={item.id} style={collectionPreviewStyle(item.id)}/>;
  return <article data-collection={item.id}>
    <header className="catalog-card-heading"><h3>{item.name}</h3><ProductStatus product={item}/></header>
    {href?<a className="catalog-art" href={href} aria-label={(template?'Open studio for ':'Create ')+item.name}>{preview}</a>:<button className="catalog-art" onClick={()=>onExplore(item)} aria-label={'Explore '+item.name}>{preview}</button>}
    <div className="catalog-card-copy">
      <p>{item.description}</p>
      <div className="catalog-card-actions">
        {href?<a className="catalog-explore" href={href}>{item.id==='information'?'Add your details':template?'Open the studio':item.id==='puzzle'?'Create a 3 × 3 or 5 × 5 puzzle':'Use your own photos'}</a>:<button className="catalog-explore" onClick={()=>onExplore(item)}>Explore collection</button>}
        <a className="catalog-details" href={'/products/'+item.id}>{template?'See idea':'Details'}</a>
      </div>
    </div>
  </article>;
}
