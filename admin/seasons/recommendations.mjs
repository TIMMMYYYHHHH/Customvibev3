// Advisory display only. These helpers never receive or modify saved seasonal state.
import {millis,localTime,yearOf} from '../../src/seasons/model.mjs';
const day=(year,month,date)=>`${year}-${String(month).padStart(2,'0')}-${String(date).padStart(2,'0')}`;
const shift=(date,days)=>localTime(millis(date+'T00:00')+days*86400000).slice(0,10);
const sunday=(year,month,n)=>day(year,month,1+(7-new Date(Date.UTC(year,month-1,1)).getUTCDay())%7+7*(n-1));
// Gregorian Easter (Meeus/Jones/Butcher), within the admin's 2026–2100 year range.
function easter(year){const a=year%19,b=Math.floor(year/100),c=year%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),v=h+l-7*m+114;return day(year,Math.floor(v/31),v%31+1)}
function forYear(id,y){
 let occasionDate,start,end;
 if(id==='christmas'){occasionDate=day(y,12,25);start=day(y,12,1);end=day(y,12,27)}
 else if(id==='halloween'){occasionDate=day(y,10,31);start=day(y,10,17);end=day(y,11,1)}
 else if(id==='valentine'){occasionDate=day(y,2,14);start=day(y,2,1);end=day(y,2,15)}
 else if(['easter','mothers','fathers'].includes(id)){occasionDate=id==='easter'?easter(y):sunday(y,id==='mothers'?5:6,id==='mothers'?2:3);start=shift(occasionDate,-14);end=shift(occasionDate,id==='easter'?2:1)}
 else if(id==='heritage'){occasionDate=day(y,9,24);start=day(y,9,10);end=day(y,9,25)}
 else if(id==='spring'){occasionDate=day(y,9,1);start=day(y,9,1);end=day(y,9,15)}
 else if(id==='summer'){occasionDate=null;start=day(y,12,1);end=day(y+1,1,15)}
 else return null;
 return {year:y,occasionDate,start:start+'T08:00',end:end+'T00:00'};
}
export function recommendedDates(id,now,savedStart=''){
 if(Number.isFinite(millis(savedStart)))return forYear(id,yearOf(savedStart));
 const y=yearOf(now),previous=forYear(id,y-1);
 if(previous&&millis(previous.end)>millis(now))return previous;
 const current=forYear(id,y);return current&&millis(current.end)<=millis(now)?forYear(id,y+1):current;
}
