import test from 'node:test';
import assert from 'node:assert/strict';
import {seedState,hasTheme,resolveAt,previewCampaign} from '../src/seasons/model.mjs';
import {validateSeasonState} from '../server/seasons.mjs';

test('Christmas installation is isolated and cannot activate without readiness and a schedule',()=>{
 const s=seedState(),c=s.campaigns.find(c=>c.occasion==='christmas');
 assert.equal(hasTheme(s,'christmas'),true);
 for(const other of s.campaigns.filter(x=>x!==c))assert.equal(hasTheme(s,other.occasion),false);
 Object.assign(c,{start:'2026-12-01T08:00',end:'2026-12-27T00:00',enabled:true,published:true});
 assert.equal(resolveAt(s,'2026-12-10T12:00').campaign,null);
 s.themeProgress.christmas='review';
 assert.equal(resolveAt(s,'2026-12-10T12:00').campaign,null);
 s.themeProgress.christmas='ready';
 assert.equal(resolveAt(s,'2026-12-01T07:59').campaign,null);
 assert.equal(resolveAt(s,'2026-12-01T08:00').campaign.occasion,'christmas');
 assert.equal(resolveAt(s,'2026-12-27T00:00').campaign,null);
 c.enabled=false;
 assert.equal(resolveAt(s,'2026-12-10T12:00').campaign,null);
});
test('Christmas draft preserves saved copy and never becomes the selected-date website',()=>{
 const s=seedState(),c=s.campaigns.find(c=>c.occasion==='christmas');
 c.copy.headline='Saved wording';
 s.drafts[c.id]={...c,copy:{...c.copy,headline:'Reference draft'}};
 assert.equal(previewCampaign(s,s.drafts[c.id],{draft:true}).copy.headline,'Reference draft');
 assert.equal(validateSeasonState(s).campaigns.find(x=>x.id===c.id).copy.headline,'Saved wording');
 assert.equal(resolveAt(s,'2026-12-10T12:00').campaign,null);
 assert.throws(()=>validateSeasonState({...s,mode:'manual',override:{id:c.id,from:'2026-12-01T08:00',until:null}}));
});
