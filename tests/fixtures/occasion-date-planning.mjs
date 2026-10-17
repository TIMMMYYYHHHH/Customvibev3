// Explicit local-review preparation. Never imported by production code or seeds.
import {nextOccasionDates} from '../../src/seasons/date-rules.mjs';
import {occasion} from '../../src/seasons/model.mjs';
export function prepareLocalDatePlanning(input,now){
 const state=structuredClone(input);
 for(const c of [...state.campaigns,...Object.values(state.drafts)]){
  c.enabled=false;
  if(occasion(c.occasion,state).removed||c.start||c.end)continue;
  const dates=nextOccasionDates(c.occasion,now);if(!dates)continue;
  c.start=dates.start;c.end=dates.end;
  if(occasion(c.occasion,state).moving){c.dateRule=dates.dateRule;c.datesReviewed=true}
 }
 return state;
}
