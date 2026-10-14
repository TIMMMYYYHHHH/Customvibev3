#!/usr/bin/env node
// Run locally in a terminal. Values go directly to Wrangler stdin, never to a file or stdout.
import {spawnSync} from 'node:child_process';
import {hashPassword,random} from '../server/auth.mjs';
const scope=process.argv[2],project=process.argv[3];
if(!['site','admin'].includes(scope)||!project||!process.stdin.isTTY){console.error('Usage: node scripts/set-password.mjs site <Pages project> OR admin <Worker name>, in an interactive terminal.');process.exit(1)}
function hidden(prompt){return new Promise(resolve=>{process.stderr.write(prompt);process.stdin.setRawMode(true);process.stdin.resume();let value='';const read=chunk=>{for(const c of chunk.toString()){if(c==='\u0003'){process.stdin.setRawMode(false);process.exit(130)}if(c==='\r'||c==='\n'){process.stdin.off('data',read);process.stdin.setRawMode(false);process.stdin.pause();process.stderr.write('\n');resolve(value);return}if(c==='\u007f')value=value.slice(0,-1);else if(c>=' ')value+=c}};process.stdin.on('data',read)})}
let password=await hidden('New password (hidden): ');let confirm=await hidden('Confirm password (hidden): ');
if(password!==confirm||password.length<16||password.length>256){console.error('Passwords must match and contain 16 to 256 characters.');process.exit(1)}
const salt=random(),hash=await hashPassword(password,salt);password='';confirm='';const secret=random();
for(const [name,value] of (scope==='site'?[['SITE_PASSWORD_HASH',hash],['SITE_PASSWORD_SALT',salt],['SESSION_SECRET',secret]]:[['ADMIN_PASSWORD_HASH',hash],['ADMIN_PASSWORD_SALT',salt],['ADMIN_SESSION_SECRET',secret]])){
 const args=['wrangler',...(scope==='site'?['pages','secret','put',name,'--project-name',project]:['secret','put',name,'--name',project])];const r=spawnSync('npx',args,{input:value,encoding:'utf8',stdio:['pipe','pipe','pipe']});if(r.status!==0){console.error(`Setting ${name} failed. No secret output shown. Check Wrangler login, then rerun this script.`);process.exit(1)}console.log(`Set ${name}.`)
}
console.log('Credentials installed. Redeploy Pages for its new secrets to take effect. Existing sessions are invalidated.');
