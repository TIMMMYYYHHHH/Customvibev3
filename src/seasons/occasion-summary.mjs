import {ruleLabel} from './date-rules.mjs';
import {visibleOccasions,occasion,instances,resolveAt,millis,yearOf,validRange,hasTheme,formatDate,isThemeReady,readinessIssue,scheduledInstances,statusOf,setThemeProgress,themeProgress} from './model.mjs';

export function timeRemaining(end,at){
 const minutes=Math.ceil((millis(end)-millis(at))/60000);
 if(minutes<60)return minutes<=1?'less than a minute':`${minutes} minutes`;
 const hours=Math.ceil(minutes/60);
 return minutes<1440?`${hours} ${hours===1?'hour':'hours'}`:`${Math.ceil(minutes/1440)} ${Math.ceil(minutes/1440)===1?'day':'days'}`;
}
// Display applied campaign settings. Saved, unapplied edits stay in the editor.
export function occasionSummary(state,id,at){
 const definition=occasion(id,state),now=millis(at),year=yearOf(at),resolved=resolveAt(state,at);
 const campaigns=state.campaigns.filter(c=>c.occasion===id);
 const horizon=Math.max(year+8,...campaigns.map(c=>yearOf(c.start)));
 const candidates=campaigns.flatMap(c=>instances(c,year-1,horizon)).filter(c=>millis(c.end)>now).sort((a,b)=>millis(a.start)-millis(b.start));
 const eligible=c=>c.published&&c.enabled&&(!definition.moving||c.dateRule||c.datesReviewed);
 const active=resolved.campaign?.occasion===id;
 const current=active?resolved.campaign:null;
 const next=candidates.find(eligible);
 const campaign=current||next||candidates[0]||[...campaigns].sort((a,b)=>millis(b.end)-millis(a.end))[0];
 const manual=active&&resolved.reason==='Manual override';
 const needsReview=definition.moving&&!campaign?.dateRule&&!campaign?.datesReviewed;
 const start=manual?state.override.from:campaign?.start,end=manual?state.override.until:campaign?.end;
 const repeat=(definition.moving&&!campaign?.dateRule?'One time only · Review dates each year':campaign?.repeat==='annual'?'Every year':'One time only')+(campaign?.dateRule?' · '+ruleLabel(campaign.dateRule):'');
 const created=hasTheme(state,id),visibleActive=active&&created;
 let status='Not scheduled',detail='Will not go live until you enable a schedule.',kind='off';
 if(visibleActive){status=state.clock?.simulated?'Active in preview':'Live now';kind='live';detail=manual?'Turned on manually'+(end?' · Ends in '+timeRemaining(end,at):' · Until switched off'):'Ends in '+timeRemaining(end,at)}
 else if(!campaign||!validRange(campaign)){detail='Choose dates and enable a schedule when ready.'}
 else if(!campaign.published||!campaign.enabled){detail=needsReview?'Choose and confirm dates before enabling a schedule.':'Will not go live until you enable a schedule.'}
 else if(needsReview){detail='Confirm the dates before this can go live.'}
 else if(!next&&!active){detail='The previous schedule has ended.'}
 else if(!isThemeReady(state,id)){status='Not ready';kind='attention';detail=readinessIssue(state,id)}
 else if(state.mode==='off'){status='Paused';kind='paused';detail='Automatic starts are paused. Resume the schedule to continue.'}
 else if(resolved.reason.startsWith('Schedule conflict')){status='Needs attention';kind='attention';detail='Schedules overlap. The original website will stay on.'}
 else if(resolved.reason==='Manual override'&&(!resolved.until||millis(resolved.until)>millis(campaign.start))){status='Paused';kind='paused';detail='Another theme is on manually. Automatic activation is waiting.'}
 else {status='Will go live';kind='upcoming';detail=formatDate(start)+' · In '+timeRemaining(start,at)}
 return {definition,campaign,active:visibleActive,manual,start,end,repeat,status,detail,kind,showDates:['live','upcoming','paused'].includes(kind),needsReview,more:campaigns.filter(c=>c.id!==campaign?.id),rank:visibleActive?0:kind==='upcoming'?1:2,sortTime:millis(campaign?.start)||Infinity};
}
export function sortedOccasionSummaries(state,at){return visibleOccasions(state).map(o=>occasionSummary(state,o.id,at)).sort((a,b)=>a.rank-b.rank||a.sortTime-b.sortTime||a.definition.name.localeCompare(b.definition.name))}

export const ICON_PRESETS=[
 {id:'hat',name:'Christmas hat',symbol:'🎅'},
 {id:'pumpkin',name:'Pumpkin',symbol:'🎃'},{id:'egg',name:'Easter egg',symbol:'🥚'},
 {id:'heart',name:'Heart',symbol:'♥'},{id:'flower',name:'Flower',symbol:'🌷'},
 {id:'sun',name:'Sun',symbol:'☀'},{id:'gift',name:'Gift',symbol:'🎁'},
 {id:'snow',name:'Snowflake',symbol:'❄'},{id:'star',name:'Star',symbol:'★'},
 {id:'tree',name:'Christmas tree',symbol:'🎄'},{id:'sparkle',name:'Sparkle',symbol:'✦'},
 {id:'balloon',name:'Balloon',symbol:'🎈'}
];
export function iconDefinition(state,id,choice=occasion(id,state).customIcon){
 if(choice?.image&&/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(choice.image)&&choice.image.length<100000)return {name:'Uploaded icon',image:choice.image};
 return ICON_PRESETS.find(i=>i.id===(choice?.preset||occasion(id,state).icon))||ICON_PRESETS[6];
}
export function saveIcon(state,id,choice){
 if(choice&&!((choice.preset&&ICON_PRESETS.some(i=>i.id===choice.preset))||(choice.image&&iconDefinition(state,id,choice).image===choice.image)))throw Error('Choose a preset or a valid small image.');
 state.occasionSettings??={};state.occasionSettings[id]={...state.occasionSettings[id],customIcon:choice||null};
}

// Planning dates remain visible, but only approved themes belong in the activation list.
export function calendarAgenda(state,at){const year=yearOf(at),items=scheduledInstances(state,year-1,year+6).filter(c=>millis(c.end)>millis(at));return {ready:items.filter(c=>['Scheduled','Active'].includes(statusOf(c,state,at))),blocked:items.filter(c=>!['Scheduled','Active'].includes(statusOf(c,state,at)))}}

// Predict approval on a copy, leaving the saved approval and schedules untouched.
export function readyConfirmation(state,id,at){
 const proposed=structuredClone(state);setThemeProgress(proposed,id,'ready');
 const summary=occasionSummary(proposed,id,at);
 return {name:summary.definition.name,kind:summary.active?'immediate':summary.kind==='upcoming'?'scheduled':'off',start:summary.start,end:summary.end,reason:['live','upcoming'].includes(summary.kind)?'':summary.detail,previewAt:state.clock?.simulated?at:null};
}

export function manualActivationConfirmation(state,id,at){
 const target=state.campaigns.find(c=>c.id===id),current=resolveAt(state,at).campaign;
 const allowed=!!target&&isThemeReady(state,target.occasion);
 return {allowed,name:target?occasion(target.occasion,state).name:'Theme unavailable',reason:allowed?'':target?readinessIssue(state,target.occasion):'This campaign is no longer available.',replaces:current?occasion(current.occasion,state).name:'Original CustomVibe',replacesId:current?.id||null,until:null,previewAt:state.clock?.simulated?at:null};
}

// Schedule configuration and theme readiness are separate facts on every surface.
export function campaignLabels(state,c,at){
 const progress=themeProgress(state,c.occasion),created=hasTheme(state,c.occasion);
 const theme=!created?'Not created':({'not-started':'Not started','in-progress':'In progress',review:'Awaiting review',ready:'Ready to use','changes-needed':'In progress'}[progress]);
 const resolved=resolveAt(state,at),same=resolved.campaign?.id===c.id&&(!c.key||resolved.campaign.key===c.key),manual=same&&resolved.reason==='Manual override';
 const enabled=!!(c.published&&c.enabled&&!occasion(c.occasion,state).removed),schedule=same&&!manual?'Active':enabled?'Enabled':'Off';
 const year=yearOf(at),candidate=c.key?c:instances(c,year-1,year+8).find(x=>millis(x.end)>millis(at))||c;
 let detail='',kind='off';
 if(manual){kind='live';detail=(state.clock?.simulated?'On manually in preview':'On manually')+(resolved.until?' · Ends '+formatDate(resolved.until):' · Until switched off or schedule resumed')}
 else if(same){kind='live';detail=(state.clock?.simulated?'Active in preview · ':'')+'Ends in '+timeRemaining(resolved.until,at)}
 else if(!enabled){detail='Will stay off until a schedule is enabled.'}
 else if(!validRange(c)){kind='attention';detail='Blocked: choose valid start and end dates.'}
 else if(occasion(c.occasion,state).moving&&!c.dateRule&&!c.datesReviewed){kind='attention';detail='Blocked: confirm the dates.'}
 else if(millis(candidate.end)<=millis(at)){detail='Saved dates have ended. Choose new dates to use this schedule.'}
 else if(!isThemeReady(state,c.occasion)){kind='attention';detail='Blocked: '+(!created?'theme not created.':progress==='review'?'awaiting review.':progress==='changes-needed'?'changes needed.':'theme must be Ready to use.')}
 else if(state.mode==='off'){kind='paused';detail='Automatic starts are paused. Resume the schedule to continue.'}
 else if(resolved.reason.startsWith('Schedule conflict')){kind='attention';detail='Blocked: schedules overlap.'}
 else if(resolved.reason==='Manual override'&&(!resolved.until||millis(resolved.until)>millis(candidate.start))){kind='paused';detail='Waiting for the manual theme to finish.'}
 else{kind='upcoming';detail='Goes live '+formatDate(candidate.start)+' · In '+timeRemaining(candidate.start,at)}
 return {schedule,theme,detail,kind};
}
