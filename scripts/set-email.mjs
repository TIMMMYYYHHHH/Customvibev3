#!/usr/bin/env node
// Interactive only. Values go to Cloudflare through stdin, never to disk or terminal output.
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const mode=process.argv[2];
if(!process.stdin.isTTY||!['email','turnstile'].includes(mode)){console.error('Run in your local terminal: node scripts/set-email.mjs email OR node scripts/set-email.mjs turnstile');process.exit(1);}
function hidden(prompt){return new Promise(resolve=>{process.stderr.write(prompt);process.stdin.setRawMode(true);process.stdin.resume();let value='';const read=chunk=>{for(const c of chunk.toString()){if(c==='\u0003'){process.stdin.setRawMode(false);process.exit(130)}if(c==='\r'||c==='\n'){process.stdin.off('data',read);process.stdin.setRawMode(false);process.stdin.pause();process.stderr.write('\n');resolve(value.trim());return}if(c==='\u007f')value=value.slice(0,-1);else if(c>=' ')value+=c}};process.stdin.on('data',read);});}
const names=mode==='email'?['RESEND_API_KEY']:['TURNSTILE_SITE_KEY','TURNSTILE_SECRET_KEY'];
for(const name of names){let value=await hidden(`${name} (hidden): `);if(!/^[A-Za-z0-9_-]{15,256}$/.test(value)||(name==='RESEND_API_KEY'&&!value.startsWith('re_'))||(name.startsWith('TURNSTILE_')&&!value.startsWith('0x'))){console.error('Value format not recognised. Use the real production key from the provider dashboard. No value was shown or saved.');process.exit(1)}
 const r=spawnSync(process.execPath,[fileURLToPath(new URL('../node_modules/wrangler/bin/wrangler.js',import.meta.url)),'pages','secret','put',name,'--project-name','customvibe-public'],{input:value,encoding:'utf8',stdio:['pipe','pipe','pipe']});value='';if(r.status!==0){console.error(`Could not install ${name}. No secret output shown. Check Wrangler login, then run this script again.`);process.exit(1)}console.log(`Installed ${name}.`);
}
console.log('Keys installed. Tell the assistant setup is complete so sending can be enabled and tested on the free tier. Keep the site password gate ON.');
