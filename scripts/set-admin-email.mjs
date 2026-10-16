#!/usr/bin/env node
// Hidden local input only. Credentials go directly to the verified business Worker.
import {DESTINATION_ACCOUNT,verifyTarget} from './cloudflare-target.mjs';
if(!process.stdin.isTTY){console.error('Run in an interactive local Terminal.');process.exit(1)}
function hidden(prompt){return new Promise(resolve=>{process.stderr.write(prompt);process.stdin.setRawMode(true);process.stdin.resume();let value='';const read=chunk=>{for(const c of chunk.toString()){if(c==='\u0003'){process.stdin.setRawMode(false);process.exit(130)}if(c==='\r'||c==='\n'){process.stdin.off('data',read);process.stdin.setRawMode(false);process.stdin.pause();process.stderr.write('\n');resolve(value.trim());return}if(c==='\u007f')value=value.slice(0,-1);else if(c>=' ')value+=c}};process.stdin.on('data',read)})}
const env={CLOUDFLARE_ACCOUNT_ID:DESTINATION_ACCOUNT};let values={};
try{
 console.log('CustomVibe customer emails. Business admin Worker only. No values are saved locally or printed.');
 env.CLOUDFLARE_API_TOKEN=await hidden('Business Cloudflare deployment token (hidden): ');
 if(!/^[A-Za-z0-9_-]{20,256}$/.test(env.CLOUDFLARE_API_TOKEN))throw Error('Token format not recognised.');
 const destination=await verifyTarget({scope:'admin',project:'customvibe-admin',env});
 values.RESEND_API_KEY=await hidden('Existing CustomVibe Resend sending key (hidden): ');
 if(!/^re_[A-Za-z0-9_-]{15,256}$/.test(values.RESEND_API_KEY))throw Error('Resend key format not recognised.');
 await destination.installSecrets(values);
 console.log('READY. Admin email key installed. Updates use the customer address stored on each order. Site gate, preview sending and payments were not changed.');
}catch(error){console.error(error.message);process.exitCode=1}
finally{env.CLOUDFLARE_API_TOKEN='';for(const name of Object.keys(values))values[name]=''}
