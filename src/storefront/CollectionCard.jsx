import React from 'react';
import {collectionPreviewStyle} from '../designs/artwork.mjs';
import {isTemplateProduct} from '../designs/products.mjs';
import CollectionPackPreview from './CollectionPackPreview';
import {ProductStatus} from './ProductDetails';
import './collection-cards.css';

export default function CollectionCard({item,Puzzle,onExplore}) {
  const template=isTemplateProduct(item);
  const productHref='/products/'+item.id;
  const explore=e=>{if(e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;e.preventDefault();onExplore(item)};
  const href=item.id==='business'?'/studio/business':item.id==='information'?'/studio/handy':item.href||(template?'/studio':null);
  const preview=item.id==='puzzle'&&!item.image?<Puzzle/>:<CollectionPackPreview kind={item.id} style={collectionPreviewStyle(item.id)}/>;
  return <article data-collection={item.id}>
    <header className="catalog-card-heading"><h3>{item.name}</h3><ProductStatus product={item}/></header>
    {href?<a className="catalog-art" href={href} aria-label={(template?'Open studio for ':'Create ')+item.name}>{preview}</a>:<a className="catalog-art" href={productHref} onClick={explore} aria-label={'Explore '+item.name}>{preview}</a>}
    <div className="catalog-card-copy">
      <p>{item.description}</p>
      <div className="catalog-card-actions">
        {href?<a className="catalog-explore" href={href}>{['information','business'].includes(item.id)?'Add your details':template?'Open the studio':item.id==='puzzle'?'Make a puzzle':'Make magnets'}</a>:<a className="catalog-explore" href={productHref} onClick={explore}>Explore collection</a>}
      </div>
    </div>
  </article>;
}
