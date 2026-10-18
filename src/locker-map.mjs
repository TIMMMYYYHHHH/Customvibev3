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
