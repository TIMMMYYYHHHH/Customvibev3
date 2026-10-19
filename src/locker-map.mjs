export const LOCKER_FINDER_URL='https://locations.thecourierguy.co.za/';
export function mapLinks(location){
 const hasPin=typeof location?.lat==='number'&&typeof location?.lon==='number'&&Number.isFinite(location.lat)&&Number.isFinite(location.lon)&&location.lat>=-35&&location.lat<=-22&&location.lon>=16&&location.lon<=33;
 const lat=hasPin?location.lat:-29,lon=hasPin?location.lon:25;
 const params=new URLSearchParams({bbox:(hasPin?[lon-.025,lat-.017,lon+.025,lat+.017]:[16,-35,33,-22]).join(','),layer:'mapnik',...(hasPin?{marker:`${lat},${lon}`}:{})});
 return {hasPin,embed:`https://www.openstreetmap.org/export/embed.html?${params}`,full:`https://www.openstreetmap.org/${hasPin?`?mlat=${lat}&mlon=${lon}`:''}#map=${hasPin?14:5}/${lat}/${lon}`};
}
export function searchLockers(locations,query){
 const words=query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
 return locations.filter(item=>words.every(word=>[item.name,item.area,item.id,item.address,item.postcode].join(' ').toLocaleLowerCase().includes(word)));
}

export const validMapPoint=p=>Number.isFinite(p?.lat)&&Number.isFinite(p?.lon)&&p.lat>=-35&&p.lat<=-22&&p.lon>=16&&p.lon<=33;
export function distanceKm(a,b){
 const radians=Math.PI/180,dLat=(b.lat-a.lat)*radians,dLon=(b.lon-a.lon)*radians;
 const value=Math.sin(dLat/2)**2+Math.cos(a.lat*radians)*Math.cos(b.lat*radians)*Math.sin(dLon/2)**2;
 return 6371*2*Math.atan2(Math.sqrt(value),Math.sqrt(Math.max(0,1-value)));
}
export function nearbyLockers(locations,center,radiusKm=25){
 if(!validMapPoint(center))return [];
 return locations.filter(validMapPoint).map(item=>({...item,distanceKm:distanceKm(center,item)})).filter(item=>item.distanceKm<=radiusKm).sort((a,b)=>a.distanceKm-b.distanceKm||a.id.localeCompare(b.id));
}
export function clusterLockers(locations,zoom){
 const groups=new Map(),size=60,scale=256*2**zoom;
 for(const item of locations.filter(validMapPoint)){
  const sin=Math.sin(item.lat*Math.PI/180),x=(item.lon+180)/360*scale,y=(.5-Math.log((1+sin)/(1-sin))/(4*Math.PI))*scale;
  const key=zoom>=15?item.id:`${Math.floor(x/size)}:${Math.floor(y/size)}`;
  if(!groups.has(key))groups.set(key,{id:key,items:[],lat:0,lon:0});const group=groups.get(key);group.items.push(item);group.lat+=item.lat;group.lon+=item.lon;
 }
 return [...groups.values()].map(g=>({...g,lat:g.lat/g.items.length,lon:g.lon/g.items.length}));
}
