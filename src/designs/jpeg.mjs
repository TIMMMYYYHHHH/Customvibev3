export function printJpeg(data){
 const binary=atob(data),parts=[binary.slice(0,2)];let at=2;
 while(at<binary.length){const marker=binary.charCodeAt(at+1);if(marker===218){parts.push(binary.slice(at));return btoa(parts.join(''));}const length=(binary.charCodeAt(at+2)<<8)|binary.charCodeAt(at+3);if(binary.charCodeAt(at)!==255||length<2||at+2+length>binary.length)throw new Error('A design could not be prepared.');
  // Browser canvas may append an ICC profile. Strip application metadata from print files.
  if(!(marker>=225&&marker<=239)&&marker!==254)parts.push(binary.slice(at,at+2+length));at+=2+length;
 }
 throw new Error('A design could not be prepared.');
}
