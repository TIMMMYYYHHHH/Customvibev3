// Only fixed categories are logged. Never log errors, bodies, headers or URLs.
export function reportUnavailable(step,error,status){
 const message=typeof error?.message==='string'?error.message:'';
 const reason=Number.isInteger(status)?'upstream_http':
  /network connection lost/i.test(message)?'network_connection_lost':
  /cannot perform i\/o on behalf of a different request/i.test(message)?'request_context':
  /exceeded|quota|too many/i.test(message)?'service_limit':
  /timed? ?out|timeout/i.test(message)?'timeout':
  /D1.*transient/i.test(message)?'database_transient':
  /D1.*reset/i.test(message)?'database_reset':
  /D1.*internal error/i.test(message)?'database_internal':
  /no such (?:table|column)|syntax error/i.test(message)?'database_schema':
  /D1_ERROR|SQLITE/i.test(message)?'database':
  /KV_/i.test(message)?'kv':'unknown';
 console.error({event:'customvibe_unavailable',step,reason,...(Number.isInteger(status)?{status}:{})});
}
