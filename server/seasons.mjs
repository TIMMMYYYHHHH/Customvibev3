import {seedState,OCCASIONS,visibleOccasions,hasTheme,isThemeReady,THEME_STAGES,validatePublish,millis,nowSAST,resolveAt,occasion} from '../src/seasons/model.mjs';
import {iconDefinition,ICON_PRESETS} from '../src/seasons/occasion-summary.mjs';
import {sameOrigin,constantEqual,boundedBody} from './auth.mjs';
const fail=message=>{throw new Error(message)};
const record=v=>v&&typeof v==='object'&&!Array.isArray(v);
const id=v=>typeof v==='string'&&/^[a-z][a-z0-9-]{0,79}$/.test(v)&&!['__proto__','constructor','prototype'].includes(v);
const text=(v,max=1000)=>typeof v==='string'&&v.length<=max;
const name=v=>text(v,60)&&v.trim()&&/^[\p{L}\p{N} .&!'’()\-]+$/u.test(v);
const bool=v=>typeof v==='boolean';
const date=v=>v===''||text(v,16)&&Number.isFinite(millis(v))&&Number(v.slice(0,4))>=2026&&Number(v.slice(0,4))<=2100;
const stages=THEME_STAGES.map(([k])=>k).concat('changes-needed');
export function validateSeasonState(input){
 if(!record(input)||input.version!==2||!Number.isSafeInteger(input.revision)||input.revision<0||JSON.stringify(input).length>1500000)fail('Invalid seasonal settings.');
 const s={version:2,revision:input.revision,customOccasions:[],occasionSettings:{},themeProgress:{},campaigns:[],drafts:{},mode:input.mode,override:null};
 if(!['schedule','off','manual'].includes(s.mode)||!Array.isArray(input.customOccasions)||input.customOccasions.length>30)fail('Invalid occasions.');
 const ids=new Set(OCCASIONS.map(o=>o.id));
 for(const o of input.customOccasions){if(!record(o)||!id(o.id)||ids.has(o.id)||!name(o.name))fail('Invalid custom occasion.');ids.add(o.id);s.customOccasions.push({id:o.id,name:o.name.trim(),icon:'gift',color:'#75478e',bg:'#faf8f4',ink:'#35233f',headline:''})}
 if(!record(input.occasionSettings)||!record(input.themeProgress)||!record(input.drafts))fail('Invalid settings.');
 for(const [key,o]of Object.entries(input.occasionSettings)){
  if(!ids.has(key)||!record(o)||o.name!==undefined&&!name(o.name)||o.removed!==undefined&&!bool(o.removed))fail('Invalid occasion settings.');
  const icon=o.customIcon;if(icon!=null&&(!record(icon)||!(ICON_PRESETS.some(x=>x.id===icon.preset)||text(icon.image,100000)&&iconDefinition(s,key,icon).image===icon.image)))fail('Invalid occasion icon.');
  s.occasionSettings[key]={...(o.name?{name:o.name.trim()}:{}),removed:!!o.removed,customIcon:icon?icon.preset?{preset:icon.preset}:{image:icon.image}:null};
 }
 const names=visibleOccasions(s).map(o=>o.name.toLowerCase());if(new Set(names).size!==names.length)fail('Occasion names must be unique.');
 for(const [key,value]of Object.entries(input.themeProgress)){if(!ids.has(key)||!stages.includes(value)||value==='ready'&&!hasTheme(s,key))fail('A theme must be installed before it can be Ready to use.');s.themeProgress[key]=value}
 const cleanCampaign=c=>{
  if(!record(c)||!id(c.id)||!ids.has(c.occasion)||!date(c.start)||!date(c.end)||!bool(c.enabled)||!bool(c.published)||!bool(c.datesReviewed)||!bool(c.decorations)||!bool(c.motion)||!['none','annual'].includes(c.repeat)||!record(c.copy))fail('Invalid campaign settings.');
  if(occasion(c.occasion,s).moving&&c.repeat==='annual')fail('Review moving occasions each year.');
  const copy={};for(const key of ['eyebrow','headline','body','button']){if(!text(c.copy[key],key==='button'?100:1000))fail('Wording is too long.');copy[key]=c.copy[key]}
  return {id:c.id,occasion:c.occasion,start:c.start,end:c.end,enabled:c.enabled,published:c.published,datesReviewed:c.datesReviewed,decorations:c.decorations,motion:c.motion,repeat:c.repeat,copy};
 };
 if(!Array.isArray(input.campaigns)||input.campaigns.length>120)fail('Too many campaigns.');s.campaigns=input.campaigns.map(cleanCampaign);
 const cids=new Set(s.campaigns.map(c=>c.id));if(cids.size!==s.campaigns.length||[...ids].some(key=>!s.campaigns.some(c=>c.occasion===key)))fail('Every occasion needs a unique campaign.');
 for(const c of s.campaigns){if(c.enabled&&!c.published)fail('Apply a schedule before enabling it.');const error=validatePublish(s,c);if(error)fail(error)}
 if(Object.keys(input.drafts).length>120)fail('Too many drafts.');
 for(const [key,c]of Object.entries(input.drafts)){if(!cids.has(key)||key!==c.id||s.campaigns.find(x=>x.id===key).occasion!==c.occasion)fail('Invalid draft.');s.drafts[key]=cleanCampaign(c)}
 if(s.mode==='manual'){
  const o=input.override,c=s.campaigns.find(c=>c.id===o?.id);if(!c||!isThemeReady(s,c.occasion)||!date(o.from)||!o.from||o.until!==null&&(!date(o.until)||!o.until||millis(o.until)<=millis(o.from)))fail('Manual activation requires an approved installed theme and valid dates.');
  s.override={id:c.id,from:o.from,until:o.until};
 }
 return s;
}
const schema='CREATE TABLE IF NOT EXISTS seasonal_settings (id INTEGER PRIMARY KEY CHECK(id=1), revision INTEGER NOT NULL, body TEXT NOT NULL)';
export async function readSeasons(db){
 if(!db)throw Error('Seasonal storage unavailable');
 const table=await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='seasonal_settings'").first();
 if(!table)return seedState();
 const row=await db.prepare('SELECT body FROM seasonal_settings WHERE id=1').first();
 if(!row)return seedState();const stored=JSON.parse(row.body);return {...validateSeasonState(stored),history:Array.isArray(stored.history)?stored.history.slice(0,250):[]};
}
export async function saveSeasons(db,input,action='Updated seasonal settings.'){
 const next=validateSeasonState(input),current=await readSeasons(db);if(next.revision!==current.revision)return null;
 next.revision++;next.history=[{id:crypto.randomUUID(),at:nowSAST(),actor:'Admin',action:String(action).slice(0,500)},...current.history].slice(0,250);
 const results=await db.batch([db.prepare(schema),db.prepare('INSERT OR IGNORE INTO seasonal_settings (id,revision,body) VALUES (1,0,?)').bind(JSON.stringify(seedState())),db.prepare('UPDATE seasonal_settings SET revision=?,body=? WHERE id=1 AND revision=?').bind(next.revision,JSON.stringify(next),input.revision)]);
 return results.at(-1).meta.changes===1?next:null;
}
export async function seasonsAPI(request,env,session){
 if(request.method==='GET')return Response.json(await readSeasons(env.CONTENT_DB));
 if(request.method!=='PUT')return new Response('Method not allowed',{status:405});
 if(!sameOrigin(request)||!await constantEqual(request.headers.get('X-CSRF-Token')||'',session.csrf))return new Response('Forbidden',{status:403});
 if(!request.headers.get('content-type')?.startsWith('application/json'))return new Response('Unsupported media type',{status:415});
 let input;try{input=JSON.parse(await boundedBody(request,1500000));validateSeasonState(input.state)}catch(e){return Response.json({error:e.message||'Invalid seasonal settings.'},{status:400})}
 const saved=await saveSeasons(env.CONTENT_DB,input.state,input.action);return saved?Response.json(saved):Response.json({error:'Another admin saved changes. Reload and review the latest settings before trying again.'},{status:409});
}
// Only an eligible current theme is public. Drafts, future wording and audit history stay private.
export function publicSeason(state){const result=resolveAt(state,nowSAST());return {campaign:result.campaign,definition:result.campaign?occasion(result.campaign.occasion,state):null,until:result.until||null}}
