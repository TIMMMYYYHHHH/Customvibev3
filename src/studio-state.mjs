export const createStudio=()=>({photos:[],selected:null,defaultFormat:'photo',step:'make'});
export function studioReducer(state,action){
 if(action.type==='settings')return {...state,...action.patch};
 if(action.type==='update-photo')return {...state,photos:state.photos.map(p=>p.id===action.id?{...p,...action.patch}:p)};
 if(action.type==='photos'){
  const photos=typeof action.value==='function'?action.value(state.photos):action.value;
  return {...state,photos,selected:photos.some(p=>p.id===state.selected)?state.selected:photos[0]?.id||null,step:'make'};
 }
 return state;
}
// Every design has one stable identity, even when its format changes.
export async function createDesignItems(photos,render){
 return Promise.all(photos.map(async photo=>{
  const puzzle=photo.format==='puzzle',gridSize=photo.gridSize||3;
  const result=await render(photo,{puzzle,gridSize});
  return {id:`design-${photo.id}`,sourceId:photo.id,kind:puzzle?'puzzle':'photo',name:puzzle?`${photo.name} · ${gridSize} × ${gridSize} puzzle`:photo.name,qty:photo.qty,gridSize:puzzle?gridSize:undefined,preview:result.url,tiles:puzzle?result.tiles:undefined};
 }));
}
export function mergeStudioItems(basket,items){
 return [...basket.filter(i=>!['photo','puzzle'].includes(i.kind)),...items];
}
