import React from 'react';
import {money,photoPrice} from './commerce.mjs';
import {useContent} from './content/ContentProvider';
export function CollectionPrice({sum}){
 const {content}=useContent();const photoCents=photoPrice(sum.pricedQty,content.pricing),packCents=sum.knownCents-photoCents;
 return <><dl>{sum.pricedQty>0&&<div><dt><span>{sum.pricedQty} {sum.pricedQty===1?'magnet':'magnets'}</span>{sum.puzzleQty>0&&<small className="price-composition">{sum.photoQty>0?`${sum.photoQty} photo magnets + `:''}{sum.puzzleQty} puzzle pieces</small>}</dt><dd>{money(photoCents)}</dd></div>}{packCents>0&&<div><dt>Magnet collections</dt><dd>{money(packCents)}</dd></div>}{sum.unpriced&&<div><dt>Unavailable collections</dt><dd>Review basket</dd></div>}<div><dt>Delivery</dt><dd>To be confirmed</dd></div></dl><div className="total"><span>{sum.unpriced?'Priced items':'Subtotal'}</span><strong>{sum.knownCents?money(sum.knownCents):'To confirm'}</strong></div><p className="small-copy">Delivery cost will be confirmed with you.</p></>;
}
