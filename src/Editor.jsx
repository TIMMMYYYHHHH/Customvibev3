import OrderNotes from './OrderNotes';
import {useContent} from './content/ContentProvider';
import React,{useState,useEffect,useRef} from 'react';
import {UploadSimple,Plus,Minus,ArrowCounterClockwise,ArrowClockwise,Trash,SquaresFour,GridNine,ArrowsOutCardinal,Heart} from '@phosphor-icons/react';
import {readPhoto,renderPhoto} from './artwork';
import TierNudge from './TierNudge';
import {MagnetPreview} from './MagnetPreview';
import {clamp,photoPrice,money,orderCapacity} from './commerce.mjs';
import {CropQuality,OrderCapacity} from './OrderGuidance';

export function CropView({photo,onChange,puzzle=false,gridSize=3,onRendered,onError}){
 const canvas=useRef(null),rendered=useRef(null),drag=useRef(null);
 const [surface,setSurface]=useState(null);
 useEffect(()=>{let active=true;if(!photo)return;onRendered?.(null);renderPhoto(photo,{puzzle,gridSize,size:puzzle?220:640}).then(result=>{if(!active||!canvas.current)return;rendered.current=result;const c=canvas.current;c.width=result.canvas.width;c.height=result.canvas.height;c.getContext('2d').drawImage(result.canvas,0,0);setSurface({urls:puzzle?result.tiles:[result.url],columns:puzzle?gridSize:1});onRendered?.(result);}).catch(e=>{if(active)onError?.(e.message);});return()=>{active=false;};},[photo?.id,photo?.src,photo?.x,photo?.y,photo?.zoom,photo?.rotation,puzzle,gridSize]);
 function move(e){if(!drag.current||!rendered.current)return;const r=rendered.current,c=canvas.current.getBoundingClientRect();const dx=e.clientX-drag.current.px,dy=e.clientY-drag.current.py;const ox=c.width*(r.sourceWidth/r.crop.sw-1),oy=c.height*(r.sourceHeight/r.crop.sh-1);onChange({x:clamp(drag.current.x-(ox?dx/ox:0),0,1),y:clamp(drag.current.y-(oy?dy/oy:0),0,1)});}
 return <div className="magnet-crop-preview">{surface&&<MagnetPreview urls={surface.urls} columns={surface.columns}/>}<canvas ref={canvas} className={`crop-canvas ${puzzle?'puzzle-canvas':''} ${surface?'magnet-interaction-layer':''}`} tabIndex={0} aria-label="Photo crop preview. Use arrow keys to reposition your image." onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);drag.current={px:e.clientX,py:e.clientY,x:photo.x,y:photo.y};}} onPointerMove={move} onPointerUp={()=>drag.current=null} onPointerCancel={()=>drag.current=null} onKeyDown={e=>{const d={ArrowLeft:{x:clamp(photo.x+.03,0,1)},ArrowRight:{x:clamp(photo.x-.03,0,1)},ArrowUp:{y:clamp(photo.y+.03,0,1)},ArrowDown:{y:clamp(photo.y-.03,0,1)}}[e.key];if(d){e.preventDefault();onChange(d);}}}/></div>;
}

export function StudioProgress({step,hasPhotos,busy,onStep}){
 return <nav className="studio-progress" aria-label="Design progress"><ol>{[['make','Make'],['review','Basket'],['delivery','Checkout']].map(([id,label],i)=><li key={id} className={step===id?'current':''}><button aria-current={step===id?'step':undefined} disabled={busy||(i>0&&!hasPhotos)} onClick={()=>onStep(id)}><span>{i+1}</span>{label}</button></li>)}</ol></nav>;
}

export function Editor({studio,dispatchStudio,photos,setPhotos,basket=[],setBasket,go,notes='',onNotesChange}){
 const {content}=useContent();
 const {selected}=studio;
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[rendered,setRendered]=useState(null);
 const input=useRef();
 const photo=photos.find(p=>p.id===selected)||photos[0],mode=photo?.format||'photo',puzzle=mode==='puzzle',gridSize=photo?.gridSize||3;
 const qty=photos.filter(p=>p.format!=='puzzle').reduce((sum,p)=>sum+p.qty,0);
 const puzzleCount=photos.filter(p=>p.format==='puzzle').reduce((sum,p)=>sum+p.qty,0);
 const magnetCount=photos.reduce((sum,p)=>sum+p.qty*(p.format==='puzzle'?(p.gridSize||3)**2:1),0);
 const orderItems=[...basket.filter(i=>!['photo','puzzle'].includes(i.kind)),...photos.map(p=>({...p,kind:p.format==='puzzle'?'puzzle':'photo'}))];
 const canIncrease=photo&&orderCapacity(orderItems.map(i=>i.id===photo.id?{...i,qty:i.qty+1}:i),content).allowed;
 const settings=patch=>dispatchStudio({type:'settings',patch});
 const update=patch=>{if(photo)dispatchStudio({type:'update-photo',id:photo.id,patch});};
 async function upload(files){
  if(!files?.length)return;setBusy(true);setError('');
  const good=[],errors=[];
  for(const file of Array.from(files)){
   const candidate={kind:studio.defaultFormat==='puzzle'?'puzzle':'photo',gridSize:3,qty:1};
   const capacity=orderCapacity([...orderItems,...good.map(p=>({...p,kind:p.format==='puzzle'?'puzzle':'photo'})),candidate],content);
   if(!capacity.allowed){errors.push('Some photos were not added. '+capacity.issues.join(' '));break;}
   try{good.push({...await readPhoto(file),format:studio.defaultFormat||'photo'});}catch(e){errors.push(e.message);}
  }
  if(good.length){setPhotos(ps=>[...ps,...good]);settings({selected:good[0].id});}
  setError(errors.join(' '));setBusy(false);if(input.current)input.current.value='';
 }
 function remove(){setPhotos(ps=>ps.filter(p=>p.id!==photo.id));setBasket(b=>b.filter(i=>(i.sourceId||i.id)!==photo.id));}
 const formatControls=<fieldset className="studio-format" disabled={!photo}><legend>Make this photo as</legend><div className="studio-choice-row">{[['photo','Photo magnets','A different photo on each magnet',SquaresFour],['puzzle','Picture puzzle','One photo, split into square tiles',GridNine]].map(([value,label,description,Icon])=><button key={value} type="button" aria-pressed={mode===value} onClick={()=>{update({format:value});}}><Icon size={26} weight={mode===value?'fill':'regular'}/><span><strong>{label}</strong><small>{description}</small></span></button>)}</div></fieldset>;
 return <main className={`one-studio ${photo?'has-photo':''}`}>
  <header className="studio-heading"><div><p className="eyebrow">PHOTO MAGNETS OR PICTURE PUZZLES</p><h1>One little <em>studio.</em></h1><p>Same photos. More ways to make it yours.</p></div><div className="studio-heading-note"><span>Little moments.<br/>Big joy.</span><Heart size={32} weight="light"/></div></header>
  <input ref={input} type="file" accept="image/jpeg,image/png" multiple hidden onChange={e=>upload(e.target.files)} aria-label="Upload photos"/>
  {error&&<div className="error" role="alert">{error}</div>}
  <div className="studio-workbench" inert={busy?true:undefined} aria-busy={busy}>
   <aside className="studio-library"><div className="studio-library-title"><h2>Your photos</h2><span>{photos.length} {photos.length===1?'photo':'photos'}</span></div><button className="studio-add" disabled={busy} onClick={()=>input.current.click()}><Plus size={18}/>Add photos</button><small className="studio-upload-guidance">JPG or PNG, up to 20 MB each.<br/>Up to 40 megapixels and 12,000 pixels per side.<br/><a href="#order-limits">See artwork limits</a>.</small><div className="studio-thumbnails">{photos.map(p=><button key={p.id} aria-label={`Edit ${p.name}`} aria-pressed={p.id===photo?.id} onClick={()=>{settings({selected:p.id});}}><img src={p.src} alt={p.name}/><span className="studio-photo-format">{p.format==='puzzle'?`${p.gridSize||3} × ${p.gridSize||3} puzzle`:'Photo magnet'}</span></button>)}</div><p>{photo?'Choose a photo to set its format.':'Add your photos to get started.'}</p><button className="text-button studio-remove" onClick={remove} disabled={busy||!photo}><Trash size={15}/>Remove selected</button></aside>
   <section className="studio-canvas" aria-label="Photo preview"><div className={`studio-stage ${!photo?'studio-stage-empty':''}`} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();if(!busy)upload(e.dataTransfer.files);}}>{photo?<CropView photo={photo} onChange={update} puzzle={puzzle} gridSize={gridSize} onRendered={setRendered} onError={setError}/>:<div className="studio-empty-canvas"><UploadSimple size={38}/><h2>A little room for<br/>your favourites.</h2><p>Click Add photos or drop them here.<br/>Make each one a magnet or a picture puzzle.</p><button className="text-button" onClick={()=>input.current.click()} disabled={busy}>Add photos</button></div>}</div>{photo&&<><p><ArrowsOutCardinal size={18}/>Drag to position your photo</p><small>{puzzle?`This photo becomes ${gridSize**2} square magnets, 7.5 cm each.`:'Your photo becomes one 7.5 × 7.5 cm magnet.'}</small></>}</section>
   <aside className="studio-inspector"><h2>Make it yours</h2><p>{photo?'Choose a format for this photo. Your other photos keep their own settings.':'Add a photo, then make it yours right here.'}</p>{formatControls}
    {photo&&(puzzle?<fieldset className="studio-grid-size"><legend>Choose your puzzle size</legend><div className="studio-choice-row">{[3,5].map(n=><button key={n} aria-pressed={gridSize===n} onClick={()=>{update({gridSize:n});}}><table className="studio-grid-symbol" aria-hidden="true"><tbody>{Array.from({length:n},(_,row)=><tr key={row}>{Array.from({length:n},(_,col)=><td key={col}/>)}</tr>)}</tbody></table><strong>{n} × {n}</strong><small>{n*n} square magnets</small></button>)}</div></fieldset>:<div className="studio-copies"><strong>Copies of this photo</strong><div className="stepper"><button aria-label="Fewer copies" disabled={photo?.qty===1} onClick={()=>update({qty:photo.qty-1})}><Minus/></button><output>{photo?.qty}</output><button aria-label="More copies" disabled={!canIncrease} onClick={()=>update({qty:photo.qty+1})}><Plus/></button></div><small>Each photo can have its own number of copies.</small></div>)}
    <fieldset className="studio-adjust" disabled={!photo}><div className="studio-adjust-heading"><h3>Adjust your photo</h3><button className="text-button studio-reset" onClick={()=>update({zoom:1,x:.5,y:.5,rotation:0})}>Reset crop</button></div><div className="studio-zoom"><label htmlFor="studio-zoom">Zoom</label><button aria-label="Zoom out" onClick={()=>update({zoom:clamp(photo.zoom-.1,1,3)})}><Minus size={17}/></button><input id="studio-zoom" type="range" min="1" max="3" step=".01" value={photo?.zoom||1} onChange={e=>update({zoom:Number(e.target.value)})}/><button aria-label="Zoom in" onClick={()=>update({zoom:clamp(photo.zoom+.1,1,3)})}><Plus size={17}/></button></div><div className="studio-rotate"><button onClick={()=>update({rotation:(photo.rotation+270)%360,x:.5,y:.5})}><ArrowCounterClockwise size={18}/>Rotate left</button><button onClick={()=>update({rotation:(photo.rotation+90)%360,x:.5,y:.5})}><ArrowClockwise size={18}/>Rotate right</button></div></fieldset>
    {photo&&<CropQuality photo={photo}/>}
    {magnetCount>0&&<div className="studio-discount"><TierNudge quantity={magnetCount} designer onAdd={()=>input.current.click()}/></div>}
   </aside>
  </div>
  <OrderNotes value={notes} onChange={onNotesChange} disabled={busy}/>
  <OrderCapacity items={orderItems} content={content}/>
  <div className="studio-review-bar"><div className="studio-review-summary"><SquaresFour size={34} weight="fill"/><div><strong>{magnetCount?`${magnetCount} ${magnetCount===1?'magnet':'magnets'} in your basket`:'Your basket starts here'}</strong><small>{qty} photo {qty===1?'magnet':'magnets'}{puzzleCount?` · ${puzzleCount} ${puzzleCount===1?'puzzle':'puzzles'}`:''}</small></div></div><div className="studio-price"><span className="studio-mobile-count">{magnetCount} {magnetCount===1?'magnet':'magnets'}</span><strong>{magnetCount?money(photoPrice(magnetCount,content.pricing)):'No photos yet'}</strong><small>Delivery additional</small></div><button className="button" disabled={busy||!photo||!rendered} onClick={()=>go('basket')}>View basket</button></div>

 </main>;
}
