import test from 'node:test';
import assert from 'node:assert/strict';
import {seedState,instances,scheduledInstances,cloneCampaign,validatePublish} from '../src/seasons/model.mjs';
import {validateSeasonState} from '../server/seasons.mjs';
const rule={kind:'weekday',month:6,ordinal:3,weekday:0,year:2027,startDays:-14,endDays:1,startTime:'08:00',endTime:'00:00'};
const father=()=>({...seedState().campaigns.find(c=>c.occasion==='fathers'),start:'2027-06-06T08:00',end:'2027-06-21T00:00',dateRule:{...rule},repeat:'annual',datesReviewed:true});
test('moving rules calculate each year instead of copying last year dates',()=>{
 assert.deepEqual(instances(father(),2027,2029).map(c=>[c.start,c.end]),[['2027-06-06T08:00','2027-06-21T00:00'],['2028-06-04T08:00','2028-06-19T00:00'],['2029-06-03T08:00','2029-06-18T00:00']]);
 assert.equal(cloneCampaign(father(),2028).start,'2028-06-04T08:00');
});
test('date rules survive validation without changing content or enabling schedules',()=>{
 const s=seedState();s.campaigns[5]=father();s.campaigns[5].copy.headline='Keep this';s.occasionSettings.halloween={removed:true};
 const clean=validateSeasonState(s);assert.deepEqual(clean.campaigns[5].dateRule,rule);assert.equal(clean.campaigns[5].copy.headline,'Keep this');assert.equal(clean.occasionSettings.halloween.removed,true);assert.deepEqual(scheduledInstances(clean,2027,2029),[]);
});
test('invalid rules and stale calculated dates cannot be saved even with schedule off',()=>{
 for(const update of [{ordinal:5},{weekday:7},{month:13},{year:2025},{startDays:-366},{startDays:1},{endDays:366},{endDays:-1},{endTime:'24:00'},{kind:'unknown'}]){const s=seedState();s.campaigns[5]=father();s.campaigns[5].dateRule={...rule,...update};assert.throws(()=>validateSeasonState(s));}
 const s=seedState();s.campaigns[5]=father();s.campaigns[5].start='2027-06-07T08:00';assert.throws(()=>validateSeasonState(s));
});
test('future relative occurrences participate in overlap validation',()=>{
 const s=seedState(),c=father();c.published=c.enabled=true;s.campaigns[5]=c;
 Object.assign(s.campaigns[0],{start:'2028-06-05T09:00',end:'2028-06-06T09:00',enabled:true,published:true});
 assert.match(validatePublish(s,c),/Overlaps/);
});
import {ruleDates,nextOccasionDates,validDateRule} from '../src/seasons/date-rules.mjs';
test('last weekday, Easter and cross-year offsets use actual calendar dates',()=>{
 assert.equal(ruleDates({...rule,month:2,ordinal:-1,year:2028,startDays:0,endDays:1}).occasionDate,'2028-02-27');
 assert.equal(ruleDates({...rule,kind:'easter',year:2027}).occasionDate,'2027-03-28');
 assert.equal(ruleDates({...rule,kind:'easter',year:2028}).occasionDate,'2028-04-16');
 const jan={...rule,kind:'date',month:1,day:1,year:2027};
 assert.deepEqual(ruleDates(jan),{start:'2026-12-18T08:00',end:'2027-01-02T00:00',occasionDate:'2027-01-01'});
 assert.equal(ruleDates({...rule,kind:'date',month:2,day:29,year:2027}),null);
 assert.equal(ruleDates({...rule,kind:'date',month:2,day:29,year:2028}).occasionDate,'2028-02-29');
 const c={...father(),dateRule:jan,...ruleDates(jan)};assert.deepEqual(instances(c,2026,2028).map(x=>x.start),['2026-12-18T08:00','2027-12-18T08:00']);
});
test('prefilling chooses next dates and leaves unknown anniversary alone',()=>{
 assert.equal(nextOccasionDates('fathers','2026-10-17T12:00').start,'2027-06-06T08:00');
 assert.equal(nextOccasionDates('christmas','2026-10-17T12:00').start,'2026-12-01T08:00');
 assert.equal(nextOccasionDates('summer','2027-01-02T12:00').start,'2026-12-01T08:00');
 assert.equal(nextOccasionDates('birthday','2026-10-17T12:00'),null);
});
import {prepareLocalDatePlanning} from './fixtures/occasion-date-planning.mjs';
test('local planning fills only missing dates and preserves owner edits and recurrence',()=>{
 const s=seedState();s.occasionSettings={spring:{removed:true},christmas:{customIcon:{preset:'star'},name:'Christmas'}};s.campaigns[0].copy.headline='My wording';s.campaigns[0].repeat='annual';s.campaigns[1].start='2026-10-20T09:00';s.campaigns[1].end='2026-11-02T00:00';s.campaigns[1].enabled=true;s.drafts[s.campaigns[0].id]=structuredClone(s.campaigns[0]);const before=structuredClone(s);
 const result=prepareLocalDatePlanning(s,'2026-10-17T12:00');assert.deepEqual(s,before);assert.deepEqual(result.occasionSettings,s.occasionSettings);assert.equal(result.campaigns[0].copy.headline,'My wording');assert.equal(result.campaigns[0].repeat,'annual');assert.equal(result.campaigns[1].start,'2026-10-20T09:00');assert.equal(result.campaigns[8].start,'');assert.equal(result.campaigns[9].start,'');assert.equal(result.drafts[s.campaigns[0].id].start,'2026-12-01T08:00');assert.ok(result.campaigns.every(c=>!c.enabled));assert.equal(result.campaigns[5].dateRule.kind,'weekday');
});

test('offset bounds match before/after controls and annual lookup coverage',()=>{for(const update of [{startDays:-366},{startDays:1},{endDays:366},{endDays:-1}])assert.equal(validDateRule({...rule,...update}),false);assert.equal(validDateRule({...rule,startDays:-365,endDays:365}),true)});
