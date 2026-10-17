import data from './artwork-data.json' with {type:'json'};
export const artworkStyles=data.styles;
export const defaultArtworkStyle='watercolour';
export const validArtworkStyle=id=>artworkStyles.some(s=>s.id===id);
export const artworkStyleName=id=>artworkStyles.find(s=>s.id===id)?.name;
export const artworkFace=(id,style=defaultArtworkStyle)=>data.faces.find(f=>f.id===id&&f.style===style);
export const artworkUrl=(id,style)=>{const f=artworkFace(id,style);if(!f)throw Error('Choose a valid artwork style and design.');return '/assets/magnet-artwork/'+f.file;};
export const collectionLabels=id=>data.faces.filter(f=>f.collection===id&&f.style===defaultArtworkStyle).map(f=>f.label);

// New selections start in the advertised style. Editing always preserves the order.
const previewStyles={alphabet:'watercolour',counting:'gouache',words:'paper',colours:'clay',reminders:'pencil',thanks:'watercolour'};
export const collectionPreviewStyle=id=>previewStyles[id]||defaultArtworkStyle;
export const initialArtworkStyle=(id,item)=>item?(item.style||defaultArtworkStyle):collectionPreviewStyle(id);
