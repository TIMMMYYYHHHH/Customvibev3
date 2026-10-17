// Calendar rules use date-only UTC arithmetic, then explicit South African wall times.
const pad=n=>String(n).padStart(2,'0');
const day=(y,m,d)=>`${y}-${pad(m)}-${pad(d)}`;
const integer=(n,min,max)=>Number.isInteger(n)&&n>=min&&n<=max;
const time=v=>typeof v==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(v);
export const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
export const WEEKDAYS=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
export const ORDINALS=[[1,'First'],[2,'Second'],[3,'Third'],[4,'Fourth'],[-1,'Last']];
export function validDateRule(r){return !!r&&['date','weekday','easter'].includes(r.kind)&&integer(r.year,2026,2100)&&integer(r.startDays,-365,0)&&integer(r.endDays,0,365)&&time(r.startTime)&&time(r.endTime)&&(r.kind==='easter'||integer(r.month,1,12)&&(r.kind==='weekday'?ORDINALS.some(([n])=>n===r.ordinal)&&integer(r.weekday,0,6):integer(r.day,1,new Date(Date.UTC(2028,r.month,0)).getUTCDate())))}
function easter(y){const a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),v=h+l-7*m+114;return day(y,Math.floor(v/31),v%31+1)}
export function ruleDates(r,year=r?.year){
 if(!validDateRule(r)||!integer(year,2026,2100))return null;
 let anchor;
 if(r.kind==='easter')anchor=easter(year);
 else if(r.kind==='date'){anchor=day(year,r.month,r.day);if(new Date(anchor+'T00:00:00Z').toISOString().slice(0,10)!==anchor)return null}
 else{const last=new Date(Date.UTC(year,r.month,0)),first=new Date(Date.UTC(year,r.month-1,1));const n=r.ordinal===-1?last.getUTCDate()-(last.getUTCDay()-r.weekday+7)%7:1+(r.weekday-first.getUTCDay()+7)%7+7*(r.ordinal-1);anchor=day(year,r.month,n)}
 const shift=(n,t)=>new Date(Date.parse(anchor+'T00:00:00Z')+n*86400000).toISOString().slice(0,10)+'T'+t;
 const start=shift(r.startDays,r.startTime),end=shift(r.endDays,r.endTime);
 if(start>=end||start<'2026-01-01T00:00'||end>'2100-12-31T23:59')return null;
 return {start,end,occasionDate:anchor};
}
export function ruleLabel(r){if(!validDateRule(r))return 'Complete the date rule';if(r.kind==='easter')return 'Easter Sunday';if(r.kind==='date')return `${r.day} ${MONTHS[r.month-1]}`;return `${ORDINALS.find(([n])=>n===r.ordinal)[1]} ${WEEKDAYS[r.weekday]} in ${MONTHS[r.month-1]}`}
export function occasionRule(id,year){
 const base={year,startDays:-14,endDays:1,startTime:'08:00',endTime:'00:00'};
 if(id==='easter')return {...base,kind:'easter',endDays:2};
 if(id==='mothers'||id==='fathers')return {...base,kind:'weekday',month:id==='mothers'?5:6,ordinal:id==='mothers'?2:3,weekday:0};
 const known={christmas:[12,25,-24,2],halloween:[10,31,-14,1],valentine:[2,14,-13,1],heritage:[9,24,-14,1],spring:[9,1,0,14],summer:[12,1,0,45]}[id];
 return known?{...base,kind:'date',month:known[0],day:known[1],startDays:known[2],endDays:known[3]}:null;
}
export function nextOccasionDates(id,now){const year=Number(now.slice(0,4));for(let y=Math.max(2026,year-1);y<=Math.min(2100,year+1);y++){const r=occasionRule(id,y),dates=r&&ruleDates(r);if(dates&&dates.end>now)return {...dates,dateRule:r}}return null}
