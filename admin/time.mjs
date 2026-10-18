const zone='Africa/Johannesburg';
export const adminDate=seconds=>new Date(seconds*1000).toLocaleString('en-ZA',{timeZone:zone,dateStyle:'medium',timeStyle:'short',hour12:false});
export const adminDay=seconds=>new Date(seconds*1000).toLocaleDateString('en-ZA',{timeZone:zone,day:'numeric',month:'short'});
