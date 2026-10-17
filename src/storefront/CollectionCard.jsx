import React from 'react';
import {isTemplateProduct} from '../designs/products.mjs';
import CollectionPackPreview from './CollectionPackPreview';
import {ProductStatus} from './ProductDetails';
import './collection-cards.css';

// Marketing previews only. Basket and print artwork retain the customer's style.
const previewStyles={alphabet:'watercolour',counting:'gouache',words:'paper',colours:'clay',reminders:'pencil',thanks:'watercolour'};

export default function CollectionCard({item,Puzzle,onExplore}) {
  const template=isTemplateProduct(item);
  const href=item.href||(template?'/studio':null);
  const preview=item.id==='puzzle'&&!item.image?<Puzzle/>:<CollectionPackPreview kind={item.id} style={previewStyles[item.id]}/>;
  return <article data-collection={item.id}>
    <ProductStatus product={item}/>
    {href?<a className="catalog-art" href={href} aria-label={(template?'Open studio for ':'Create ')+item.name}>{preview}</a>:<button className="catalog-art" onClick={()=>onExplore(item)} aria-label={'Explore '+item.name}>{preview}</button>}
    <div className="catalog-card-copy">
      <p className="overline">{item.group}</p><h3>{item.name}</h3><p>{item.description}</p>
      <div className="catalog-card-actions">
        {href?<a className="text-link" href={href}>{template?'Open the studio':item.id==='puzzle'?'Create a 3 × 3 or 5 × 5 puzzle':'Use your own photos'}</a>:<button className="text-link" onClick={()=>onExplore(item)}>Explore collection</button>}
        <a className="catalog-details" href={'/products/'+item.id}>{template?'See idea':'Details'}</a>
      </div>
    </div>
  </article>;
}
