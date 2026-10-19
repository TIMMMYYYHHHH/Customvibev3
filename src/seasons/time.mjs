// Pure SAST timestamp helpers shared by auth and seasonal scheduling.
export const millis=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)&&localTime(Date.parse(value+':00+02:00'))===value?Date.parse(value+':00+02:00'):NaN;
export const localTime=ms=>Number.isFinite(ms)?new Date(ms+7200000).toISOString().slice(0,16):'';
