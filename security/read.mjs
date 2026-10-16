// Retry only explicit SELECTs. Never wrap an entire request or a write operation.
export async function readSelect(db,sql,params=[],method='first',event='customvibe_database_read_retry'){
 if(!/^SELECT\s/i.test(sql)||sql.includes(';')||!['first','all'].includes(method))throw Error('Read-only query required');
 const read=()=>db.prepare(sql).bind(...params)[method]();
 try{return await read()}catch(error){
  const message=typeof error?.message==='string'?error.message:'';
  if(!/D1_ERROR|Network connection lost/i.test(message)||/no such (?:table|column)|syntax|SQLITE|constraint|type error|quota|exceeded|limit|overloaded|too many/i.test(message))throw error;
  console.warn({event});
  await new Promise(resolve=>setTimeout(resolve,150));
  return read();
 }
}
