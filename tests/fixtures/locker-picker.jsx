// Local visual fixture only. Fictional locations, no API, checkout or send actions.
import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import {LockerPicker} from '../../src/LockerPicker';
import '../../src/fonts.css';import '../../src/shop-base.css';import '../../src/shop.css';import '../../src/studio.css';import '../../src/consistency.css';import '../../src/mobile.css';import '../../src/button-system.css';
const sampleLocations=[
 {id:'SAMPLE-001',name:'Sample: Garden Square locker',area:'Durban North',lat:-29.8,lon:31.04,address:'Fictional sample address, Garden Square, Durban North',postcode:'4051',hours:'Monday 08:00–18:00; Tuesday 08:00–18:00; Wednesday 08:00–18:00; Thursday 08:00–18:00; Friday 08:00–18:00; Saturday 09:00–13:00'},
 {id:'SAMPLE-002',name:'Sample: Village Centre locker',area:'Umhlanga',lat:-29.73,lon:31.08,hours:'Sample hours: 08:00 to 18:00'},
 {id:'SAMPLE-003',name:'Sample: City Corner locker',area:'Durban Central',lat:-29.86,lon:31.02,hours:'Sample hours: 08:00 to 18:00'}
];
function Preview(){const [value,setValue]=useState({name:'',area:''});return <div className="shop-shell"><div style={{padding:'16px 24px',background:'#35233f',color:'#fff',fontSize:14,lineHeight:1.6}}>LOCAL DESIGN PREVIEW · Fictional sample lockers. Not real collection locations. No order or delivery booking is possible here.</div><main className="section" style={{maxWidth:860,margin:'0 auto',paddingTop:36,paddingBottom:64}}><p className="eyebrow">CustomVibe · Future locker selection</p><h1 style={{fontSize:'clamp(32px,6vw,48px)'}}>Your collection spot.</h1><p>Preview of the search and selection layout for authorised courier data. The live site keeps manual entry until that connection is ready.</p><LockerPicker value={value} onChange={setValue} locations={sampleLocations}/></main></div>}
createRoot(document.getElementById('root')).render(<Preview/>);
