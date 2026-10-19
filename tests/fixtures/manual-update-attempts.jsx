import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import OrderDetail from '../../admin/OrderDetail';
import '../../src/fonts.css';
import '../../admin/admin-shell.css';
import '../../admin/orders.css';
import '../../admin/workroom.css';
const id='11111111-1111-4111-8111-111111111111';
function Fixture(){const [order,setOrder]=useState(null);const reload=async()=>setOrder(await(await fetch('/api/orders/'+id)).json());useEffect(()=>{reload()},[]);return order?<div className="cv-admin admin-workroom"><main id="admin-main" className="cv-orders"><OrderDetail order={order} onChange={reload}/></main></div>:<p>Loading synthetic order…</p>}
createRoot(document.getElementById('root')).render(<Fixture/>);
