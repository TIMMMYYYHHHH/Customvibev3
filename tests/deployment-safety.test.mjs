import test from 'node:test';
import assert from 'node:assert/strict';
import {validateConfig,validateProject,validateDeployment} from '../scripts/check-deployment.mjs';
const services=()=>[{binding:'AUTH',service:'customvibe-security'},{binding:'CATALOGUE',service:'customvibe-catalogue'}];
const config=()=>({name:'customvibe-business',pages_build_output_dir:'dist/client',vars:{SITE_GATE_ENABLED:'true',SUBMISSIONS_ENABLED:'false'},services:services(),env:{production:{vars:{SITE_GATE_ENABLED:'true',SUBMISSIONS_ENABLED:'true'},services:services()},preview:{vars:{SITE_GATE_ENABLED:'true',SUBMISSIONS_ENABLED:'false'},services:services()}}});
const privateKeys=['SITE_PASSWORD_HASH','SITE_PASSWORD_SALT','SESSION_SECRET','RESEND_API_KEY','W3FORMS_ACCESS_KEY','TURNSTILE_SECRET_KEY','TURNSTILE_SITE_KEY'];
const project=()=>({name:'customvibe-business',production_branch:'main',deployment_configs:Object.fromEntries(['production','preview'].map(name=>[name,{fail_open:false,env_vars:{SITE_GATE_ENABLED:{value:'true'},SUBMISSIONS_ENABLED:{value:name==='production'?'true':'false'},...Object.fromEntries(privateKeys.map(k=>[k,{type:'secret_text'}]))},services:Object.fromEntries(services().map(v=>[v.binding,{service:v.service}]))}]))});
test('accepts production gated sending with explicit disabled preview and local defaults',()=>{validateConfig(config());validateProject(project(),{expectedProductionSending:'true'})});
test('accepts sending-disabled production for safe rollback and transition',()=>{const c=config();c.env.production.vars.SUBMISSIONS_ENABLED='false';validateConfig(c);const p=project();p.deployment_configs.production.env_vars.SUBMISSIONS_ENABLED.value='false';validateProject(p);validateProject(p,{expectedProductionSending:'false'})});
test('rejects source account, wrong output, local sending and unsafe environment overrides',()=>{
 for(const patch of [{account_id:'source'},{pages_build_output_dir:'dist'},{vars:{SITE_GATE_ENABLED:'true',SUBMISSIONS_ENABLED:'true'}}])assert.throws(()=>validateConfig({...config(),...patch}));
 for(const name of ['production','preview'])for(const field of ['SITE_GATE_ENABLED','SUBMISSIONS_ENABLED'])for(const value of [undefined,'false','true','invalid']){
  if(field==='SITE_GATE_ENABLED'&&value==='true'||field==='SUBMISSIONS_ENABLED'&&(value==='false'||name==='production'&&value==='true'))continue;
  const c=config();c.env[name].vars[field]=value;assert.throws(()=>validateConfig(c));
 }
 const c=config();delete c.env.preview;assert.throws(()=>validateConfig(c));
});
test('rejects wrong or missing internal service bindings in each configured environment',()=>{for(const name of ['local','production','preview']){const c=config();(name==='local'?c:c.env[name]).services[0].service='other';assert.throws(()=>validateConfig(c))}const p=project();delete p.deployment_configs.preview.services.AUTH;assert.throws(()=>validateProject(p))});
test('requires private site credentials in both live environments',()=>{for(const name of ['production','preview'])for(const key of privateKeys.slice(0,3)){const p=project();delete p.deployment_configs[name].env_vars[key];assert.throws(()=>validateProject(p))}});
test('requires private provider credentials before enabling production sending',()=>{for(const key of privateKeys.slice(3)){const p=project();delete p.deployment_configs.production.env_vars[key];assert.throws(()=>validateProject(p));p.deployment_configs.production.env_vars.SUBMISSIONS_ENABLED.value='false';assert.throws(()=>validateProject(p,{requireSendingCredentials:true}));validateProject(p)}});
test('rejects fail-open, preview sending, invalid flags and ungated live environments',()=>{for(const name of ['production','preview'])for(const patch of [{fail_open:true},{gate:'false'},{gate:undefined},{sending:'invalid'},{sending:undefined},...(name==='preview'?[{sending:'true'}]:[])]){const p=project(),c=p.deployment_configs[name];if('fail_open' in patch)c.fail_open=patch.fail_open;if('gate' in patch)c.env_vars.SITE_GATE_ENABLED.value=patch.gate;if('sending' in patch)c.env_vars.SUBMISSIONS_ENABLED.value=patch.sending;assert.throws(()=>validateProject(p))}});
test('post-publish check rejects mismatched production sending',()=>{const p=project();assert.throws(()=>validateProject(p,{expectedProductionSending:'false'}));p.deployment_configs.production.env_vars.SUBMISSIONS_ENABLED.value='false';assert.throws(()=>validateProject(p,{expectedProductionSending:'true'}))});
test('requires Direct Upload project on main',()=>{assert.throws(()=>validateProject({...project(),source:{type:'github'}}));assert.throws(()=>validateProject({...project(),production_branch:'other'}))});

test('deployed production snapshot must be gated, successful and match sending and commit',()=>{
 const deployment=()=>({environment:'production',latest_stage:{status:'success'},...project().deployment_configs.production,deployment_trigger:{metadata:{commit_hash:'expected-commit'}}});
 validateDeployment(deployment(),'true','expected-commit');
 for(const mutate of [d=>d.environment='preview',d=>d.latest_stage.status='failure',d=>d.env_vars.SITE_GATE_ENABLED.value='false',d=>d.env_vars.SUBMISSIONS_ENABLED.value='false',d=>d.deployment_trigger.metadata.commit_hash='old-commit']){const d=deployment();mutate(d);assert.throws(()=>validateDeployment(d,'true','expected-commit'))}
});

test('disabling sending can recover from missing provider keys in currently enabled production',()=>{
 const p=project();delete p.deployment_configs.production.env_vars.RESEND_API_KEY;
 validateProject(p,{requireSendingCredentials:false});
 assert.throws(()=>validateProject(p,{requireSendingCredentials:true}));
 p.deployment_configs.preview.env_vars.SUBMISSIONS_ENABLED.value='true';
 assert.throws(()=>validateProject(p,{requireSendingCredentials:false}));
});

test('preview and local environments cannot enable private order capture',()=>{for(const name of ['local','preview'])for(const flag of ['ORDER_RECORDS_ENABLED','ARTWORK_STORAGE_ENABLED']){const c=config();(name==='local'?c:c.env[name]).vars[flag]='true';assert.throws(()=>validateConfig(c));}});
