#!/usr/bin/env node
// Run locally in a terminal. Credentials go directly to the verified account, never to a file or stdout.
import {requireDestination,verifyTarget} from './cloudflare-target.mjs';
try{requireDestination()}catch(error){console.error(error.message);process.exit(1)}
import {hashPassword,random} from '../server/auth.mjs';
const scope=process.argv[2],project=process.argv[3];
if(!['site','admin'].includes(scope)||!project||!process.stdin.isTTY){console.error('Usage: node scripts/set-password.mjs site <Pages project> OR admin <Worker name>, in an interactive terminal.');process.exit(1)}
let destination;
try{destination=await verifyTarget({scope,project})}catch(error){console.error(error.message);process.exit(1)}
function hidden(prompt){return new Promise(resolve=>{process.stderr.write(prompt);process.stdin.setRawMode(true);process.stdin.resume();let value='';const read=chunk=>{for(const c of chunk.toString()){if(c==='\u0003'){process.stdin.setRawMode(false);process.exit(130)}if(c==='\r'||c==='\n'){process.stdin.off('data',read);process.stdin.setRawMode(false);process.stdin.pause();process.stderr.write('\n');resolve(value);return}if(c==='\u007f')value=value.slice(0,-1);else if(c>=' ')value+=c}};process.stdin.on('data',read)})}
let password=await hidden('New password (hidden): ');let confirm=await hidden('Confirm password (hidden): ');
if(password!==confirm||password.length<16||password.length>256){console.error('Passwords must match and contain 16 to 256 characters.');process.exit(1)}
const salt=random(),hash=await hashPassword(password,salt);password='';confirm='';const secret=random();
const values=Object.fromEntries(scope==='site'?[['SITE_PASSWORD_HASH',hash],['SITE_PASSWORD_SALT',salt],['SESSION_SECRET',secret]]:[['ADMIN_PASSWORD_HASH',hash],['ADMIN_PASSWORD_SALT',salt],['ADMIN_SESSION_SECRET',secret]]);
try{await destination.installSecrets(values)}catch(error){console.error(error.message);process.exit(1)}
for(const name of Object.keys(values)){values[name]='';console.log(`Set ${name}.`)}
console.log('Credentials installed. Redeploy Pages for its new secrets to take effect. Existing sessions are invalidated.');
