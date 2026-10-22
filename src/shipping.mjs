export const SHIPPING_POLICY_VERSION=1;
export const DELIVERY_CENTS=6900;
export const FREE_DELIVERY_SUBTOTAL_CENTS=100000;
function validSubtotal(subtotalCents){
 if(!Number.isSafeInteger(subtotalCents)||subtotalCents<0)throw new Error('Choose a valid magnet subtotal.');
 return subtotalCents;
}
export function deliveryPrice(subtotalCents){
 return validSubtotal(subtotalCents)>=FREE_DELIVERY_SUBTOTAL_CENTS?0:DELIVERY_CENTS;
}
export function orderTotal(subtotalCents){
 const total=validSubtotal(subtotalCents)+deliveryPrice(subtotalCents);
 if(!Number.isSafeInteger(total))throw new Error('Choose a smaller order total.');
 return total;
}
