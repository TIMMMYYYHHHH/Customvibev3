import React from 'react';
import {cropQuality,orderCapacity} from './commerce.mjs';
import {ARTWORK_LIMITS} from './artwork-policy.mjs';

export function CropQuality({photo,compact=false}){
 const quality=cropQuality(photo),puzzle=photo?.format==='puzzle';
 if(compact&&quality.level==='good')return null;
 const title={good:'Enough pixels for this size',soft:'This crop may print a little soft',low:'This crop may print blurry',unknown:'Check your photo quality'}[quality.level];
 return <div className={`crop-quality quality-${quality.level}`} role="status" aria-live="polite" aria-atomic="true">
  <strong>{title}</strong>
  <p>{quality.level==='unknown'?'We could not measure this photo. Check the original before ordering.':quality.level==='good'?'Resolution looks suitable. Still check that your original photo is sharp.':`Try less zoom or a higher-resolution original${puzzle?', or choose fewer puzzle tiles':''}. You can keep this crop if you are happy with it.`}</p>
  {!compact&&<small>{quality.pixels!==null&&<>{quality.pixels} × {quality.pixels} source pixels {puzzle?'per tile':'in this crop'} · {quality.ppi} ppi at 7.5 cm. </>}Aim for 300 ppi. This checks resolution, not blur or lighting.</small>}
 </div>;
}

export function OrderCapacity({items,content}){
 const capacity=orderCapacity(items,content);
 return <section id="order-limits" className="order-capacity" aria-label="Order limits">
  <strong>Room in this order</strong>
  <p>{capacity.magnets} magnets · {capacity.entries} entries · {capacity.files} / {ARTWORK_LIMITS.files} artwork files</p>
  {!capacity.allowed&&<div className="capacity-warning" role="alert">{capacity.issues.map(issue=><p key={issue}>{issue}</p>)}<p>Your designs stay here while you make changes.</p></div>}
  <details><summary>How the limits work</summary><p>Each photo design uses one artwork file. A 3 × 3 puzzle uses 10 files; a 5 × 5 uses 26, including its layout proof. Extra copies reuse those files. There is no fixed cap on magnet quantities or basket entries. Artwork file and size limits still apply.</p><p>Prepared artwork: up to {ARTWORK_LIMITS.fileBytes/1000000} MB per file and {ARTWORK_LIMITS.requestBytes/1000000} MB per order. We check the final file sizes before uploading. If your artwork needs more room, <a href="mailto:hello@customvibe.co.za">contact us</a> before preparing your photos.</p></details>
 </section>;
}
