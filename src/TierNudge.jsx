import {useContent} from './content/ContentProvider';
import React from 'react';
import {nextPhotoTier,money} from './commerce.mjs';
export default function TierNudge({quantity,onAdd,designer=false}){
 const {content}=useContent();const tier=nextPhotoTier(quantity,content.pricing);
 if(!tier)return quantity>=10?<p className="best-rate">You’ve unlocked our best rate: {money(content.pricing.ten/10)} per magnet.</p>:null;
 return <div className="tier-nudge"><p className="tier-label">A LITTLE MORE TO LOVE</p><h3>{tier.extra===0?'Your sixth magnet costs nothing extra.':`Add ${tier.remaining} more ${tier.remaining===1?'magnet':'magnets'} for the ${tier.target}-magnet price.`}</h3><p>{tier.target} magnets for <strong>{money(tier.total)}</strong>{tier.extra>0?<>. That’s {money(tier.extra)} more in total.</>:`. Keep your total at ${money(tier.total)}.`}</p><div className="tier-progress" role="progressbar" aria-label={`Progress to ${tier.target} magnets`} aria-valuenow={quantity} aria-valuemin={0} aria-valuemax={tier.target}><span style={{width:`${quantity/tier.target*100}%`}}/></div><small>Save {money(tier.saving)} compared with {tier.target} single magnets.</small><button type="button" onClick={onAdd}>{designer?'Add another photo':'Add photos in the designer'}</button>{designer&&<small>Or increase the copies of a favourite.</small>}</div>;
}
