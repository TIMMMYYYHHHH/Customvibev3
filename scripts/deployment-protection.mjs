// Shared by publishing and credential maintenance. No secret values are read.
export function validateProtection(config,name){
 const sending=config?.env_vars?.SUBMISSIONS_ENABLED?.value;
 if(!['production','preview'].includes(name)||config?.fail_open!==false||config.env_vars?.SITE_GATE_ENABLED?.value!=='true'||!(name==='production'?['true','false']:['false']).includes(sending))throw new Error('Destination protection verification failed. Keep both environments gated and fail closed, with preview sending off.');
}
