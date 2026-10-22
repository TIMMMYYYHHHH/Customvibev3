import React from 'react';
import {deliveryPrice,orderTotal} from './shipping.mjs';
import {money,photoPrice} from './commerce.mjs';
import {useContent} from './content/ContentProvider';
export function CollectionPrice({sum}){
 const {content}=useContent();const photoCents=photoPrice(sum.pricedQty,content.pricing),packCents=sum.knownCents-photoCents,deliveryCents=sum.unpriced?null:deliveryPrice(sum.knownCents);
 return <><dl>{sum.pricedQty>0&&<div><dt><span>{sum.pricedQty} {sum.pricedQty===1?'magnet':'magnets'}</span>{sum.puzzleQty>0&&<small className="price-composition">{sum.photoQty>0?`${sum.photoQty} photo magnets + `:''}{sum.puzzleQty} puzzle pieces</small>}</dt><dd>{money(photoCents)}</dd></div>}{packCents>0&&<div><dt>Magnet collections</dt><dd>{money(packCents)}</dd></div>}{sum.unpriced&&<div><dt>Unavailable collections</dt><dd>Review basket</dd></div>}<div><dt>Magnet subtotal</dt><dd>{money(sum.knownCents)}</dd></div><div><dt>PUDO locker delivery</dt><dd>{deliveryCents===null?'Review basket':deliveryCents===0?'Free':money(deliveryCents)}</dd></div></dl><div className="total"><span>{sum.unpriced?'Priced items':'Total'}</span><strong>{sum.unpriced?money(sum.knownCents):money(orderTotal(sum.knownCents))}</strong></div><p className="small-copy">{sum.unpriced?'Delivery and total are available once all items have a price.':'Locker availability and production timing still need confirmation. No payment has been taken.'}</p></>;
}
