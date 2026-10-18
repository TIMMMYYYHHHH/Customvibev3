import React from 'react';
import {handyDetails} from './handy.mjs';
export default function HandyDetails({values,submitted=false}){
 if(!values?.handyTemplate)return null;
 return <details className="handy-details"><summary>{submitted?'Submitted details':'Your printed details'}</summary><dl>{handyDetails(values).map(field=><React.Fragment key={field.label}><dt>{field.label}</dt><dd>{field.value||'Left blank'}</dd></React.Fragment>)}</dl></details>;
}
