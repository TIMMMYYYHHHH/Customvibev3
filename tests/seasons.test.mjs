import test from 'node:test';import assert from 'node:assert/strict';
import {seedState,hasTheme,themeProgress,resolveAt,saveOccasion,validatePublish} from '../src/seasons/model.mjs';
import {validateSeasonState} from '../server/seasons.mjs';
test('production starts with no dates, no themes and every schedule off',()=>{const s=seedState();assert.equal(s.campaigns.length,10);assert.equal(s.revision,0);for(const c of s.campaigns){assert.equal(c.start,'');assert.equal(c.end,'');assert.equal(c.enabled,false);assert.equal(c.published,false);assert.equal(themeProgress(s,c.occasion),'not-started');assert.equal(hasTheme(s,c.occasion),false)}assert.equal(resolveAt(s,'2026-12-10T12:00').campaign,null);assert.deepEqual(s.history,[])});
test('empty dates can be saved only with schedule off and new occasions have no sample dates',()=>{const s=seedState();assert.equal(validatePublish(s,s.campaigns[0]),'');s.campaigns[0].enabled=true;assert.notEqual(validatePublish(s,s.campaigns[0]),'');saveOccasion(s,null,'Winter');assert.equal(s.campaigns.at(-1).start,'')});
test('server strips client clock, history and theme claims and rejects unsafe or broken state',()=>{const s=seedState();const valid=validateSeasonState({...s,clock:{simulated:true,at:'2026-12-10T12:00'},installedThemes:['christmas'],history:[{action:'forged'}]});assert.equal(valid.clock,undefined);assert.equal(valid.installedThemes,undefined);assert.equal(valid.history,undefined);assert.throws(()=>validateSeasonState({...s,mode:'manual',override:{id:s.campaigns[0].id,from:'2026-10-17T12:00',until:null}}));assert.throws(()=>validateSeasonState({...s,occasionSettings:{christmas:{name:'<script>'}}}));const bad=structuredClone(s);bad.campaigns[0].start='2026-02-30T12:00';assert.throws(()=>validateSeasonState(bad));const ready=structuredClone(s);ready.themeProgress={christmas:'ready'};assert.throws(()=>validateSeasonState(ready));});
test('date validation rejects calendar rollover and conflicts; moving dates cannot recur annually',()=>{const s=seedState(),c=s.campaigns[0];c.start='2026-12-01T08:00';c.end='2026-12-27T00:00';c.enabled=c.published=true;assert.doesNotThrow(()=>validateSeasonState(s));const h=s.campaigns[1];h.start=c.start;h.end=c.end;h.enabled=h.published=true;assert.throws(()=>validateSeasonState(s),/Overlaps/);h.enabled=false;s.campaigns[2].repeat='annual';assert.throws(()=>validateSeasonState(s),/moving/)});

test('draft preview retains wording without installing or activating a theme',async()=>{
 const {previewCampaign}=await import('../src/seasons/model.mjs');
 const s=seedState(),draft={...s.campaigns[0],copy:{eyebrow:'For our people',headline:'Memories\nworth keeping',body:'A personal little gift',button:'Create a gift'}};
 assert.deepEqual(previewCampaign(s,draft,{draft:true})?.copy,draft.copy);
 assert.equal(previewCampaign(s,draft),null);
 assert.equal(resolveAt(s,'2026-12-10T12:00').campaign,null);
 assert.equal(hasTheme(s,'christmas'),false);
 s.occasionSettings.christmas={removed:true};
 assert.equal(previewCampaign(s,draft,{draft:true}),null);
});
