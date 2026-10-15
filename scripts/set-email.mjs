#!/usr/bin/env node
// Interactive only. Values go to the verified Cloudflare account, never to disk or terminal output.
import {requireDestination,verifyTarget,PAGES_PROJECT} from './cloudflare-target.mjs';
try{requireDestination()}catch(error){console.error(error.message);process.exit(1)}
const mode=process.argv[2];
if(!process.stdin.isTTY||!['email','turnstile','w3forms'].includes(mode)){console.error('Run in your local terminal: node scripts/set-email.mjs email OR node scripts/set-email.mjs turnstile OR node scripts/set-email.mjs w3forms');process.exit(1);}
let destination;
try{destination=await verifyTarget({scope:'site',project:PAGES_PROJECT})}catch(error){console.error(error.message);process.exit(1)}
function hidden(prompt){return new Promise(resolve=>{process.stderr.write(prompt);process.stdin.setRawMode(true);process.stdin.resume();let value='';const read=chunk=>{for(const c of chunk.toString()){if(c==='\u0003'){process.stdin.setRawMode(false);process.exit(130)}if(c==='\r'||c==='\n'){process.stdin.off('data',read);process.stdin.setRawMode(false);process.stdin.pause();process.stderr.write('\n');resolve(value.trim());return}if(c==='\u007f')value=value.slice(0,-1);else if(c>=' ')value+=c}};process.stdin.on('data',read);});}
const names=mode==='email'?['RESEND_API_KEY']:mode==='w3forms'?['W3FORMS_ACCESS_KEY']:['TURNSTILE_SITE_KEY','TURNSTILE_SECRET_KEY'];
for(const name of names){let value=await hidden(`${name} (hidden): `);if(!/^[A-Za-z0-9_-]{15,256}$/.test(value)||(name==='RESEND_API_KEY'&&!value.startsWith('re_'))||(name==='W3FORMS_ACCESS_KEY'&&!value.startsWith('w3f_'))||(name.startsWith('TURNSTILE_')&&!value.startsWith('0x'))){console.error('Value format not recognised. Use the real production key from the provider dashboard. No value was shown or saved.');process.exit(1)}
 try{await destination.installSecrets({[name]:value})}catch(error){console.error(error.message);process.exit(1)}finally{value=''}console.log(`Installed ${name}.`);
}
console.log('Keys installed. Sending settings are unchanged. Keep the site password gate ON and preview sending OFF.');
