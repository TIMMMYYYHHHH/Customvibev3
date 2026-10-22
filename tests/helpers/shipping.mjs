import {summarize} from '../../src/commerce.mjs';
import {defaultContent} from '../../src/content/model.mjs';
import {deliveryPrice,orderTotal,SHIPPING_POLICY_VERSION} from '../../src/shipping.mjs';
// Supply current checkout terms for tests whose subject is another order feature.
// Shipping-contract tests provide literal terms directly, including stale/missing ones.
export function withShippingAgreement(payload,catalogue=defaultContent){
 let subtotal;try{subtotal=summarize(payload.items,catalogue).knownCents}catch{return payload}
 if(!Number.isSafeInteger(subtotal)||subtotal<=0)return payload;
 return {...payload,shippingPolicyVersion:SHIPPING_POLICY_VERSION,deliveryCents:deliveryPrice(subtotal),totalCents:orderTotal(subtotal)};
}
