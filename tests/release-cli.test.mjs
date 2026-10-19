// Exercise the real CLI entrypoint with an isolated provider/process shim.
// The child receives synthetic credentials only; fetch never reaches a network.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,mkdir,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const cli=fileURLToPath(new URL('../scripts/release-manifest.mjs',import.meta.url));
const sha='a'.repeat(40),id='12345678-1234-1234-1234-123456789abc';
const marker='PRIVATE_SENTINEL_MUST_NOT_PERSIST';
const hash=v=>createHash('sha256').update(v).digest('hex');
const preload=`
const cp=require('node:child_process'),fs=require('node:fs');
const sha='a'.repeat(40),id='12345678-1234-1234-1234-123456789abc';
cp.execFileSync=(program,args)=>{
 if(program==='git')return args[0]==='status'?'':args[0]==='diff'?'docs/readme.md':sha;
 if(program==='gh'){if(process.env.FAIL_CONTEXT==='true')throw Error('${marker}');return JSON.stringify({object:{sha}});}
 if(program==='npx'){fs.appendFileSync('provider-calls.log',args.join(' ')+'\\n');const error=Error('Synthetic provider stderr: ${marker}');error.stdout='${marker}';error.stderr='${marker}';throw error;}
 if(program===process.execPath){fs.appendFileSync('guard-calls.log',args.join(' ')+'\\n');if(process.env.FAIL_GUARDS==='true'&&args.at(-1)==='after')throw Error('${marker}');return '';}
 throw Error('Unexpected process');
};
require('node:module').syncBuiltinESMExports();
global.fetch=async url=>{if(!String(url).startsWith('https://api.cloudflare.com/client/v4/accounts/4f57d4e924674cb87b33d4c884745cf6/'))throw Error('Unexpected request');return {ok:true,json:async()=>String(url).includes('/pages/')?{success:true,result:{canonical_deployment:{id,latest_stage:{status:'success'},deployment_trigger:{metadata:{commit_hash:sha}}}}}:{success:true,result:{deployments:[{created_on:'2026-10-19T00:00:00Z',versions:[{version_id:id,percentage:100}]}]}}};};
`;
async function fixture(t){
 const dir=await mkdtemp(join(tmpdir(),'customvibe-release-cli-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 await mkdir(join(dir,'dist/release'),{recursive:true});
 for(const side of ['client','admin']){await mkdir(join(dir,'dist',side));await writeFile(join(dir,'dist',side,'index.html'),'fixture');}
 await writeFile(join(dir,'preload.cjs'),preload);
 for(const family of ['security','content']){await mkdir(join(dir,'migrations',family),{recursive:true});await writeFile(join(dir,'migrations',family,'0001.sql'),'-- fixture only');await writeFile(join(dir,family==='security'?'wrangler.security.jsonc':'wrangler.catalogue.jsonc'),JSON.stringify({d1_databases:[{database_name:family,database_id:id}]}));}
 const digest=hash(JSON.stringify([['index.html',hash('fixture')]]));
 const record={schemaVersion:1,repository:'TIMMMYYYHHHH/Customvibev3',state:'planned',sourceSha:sha,baseSha:sha,required:['pages','admin'],completed:{},reasons:[],before:Object.fromEntries(['pages','admin','security','catalogue'].map(c=>[c,id])),build:{pages:{sha256:digest},admin:{sha256:digest}},components:{pages:{sourceDigest:'c'.repeat(64)},admin:{sourceDigest:'c'.repeat(64)}},workflow:{url:'https://github.com/TIMMMYYYHHHH/Customvibev3/actions/runs/123'}};
 const path=join(dir,'dist/release/release-manifest.json');await writeFile(path,JSON.stringify(record));
 const env={PATH:process.env.PATH,TMPDIR:tmpdir(),GITHUB_REPOSITORY:record.repository,GITHUB_REF:'refs/heads/main',GITHUB_SHA:sha,GITHUB_EVENT_NAME:'push',GITHUB_RUN_ID:'123',CLOUDFLARE_ACCOUNT_ID:'4f57d4e924674cb87b33d4c884745cf6',CLOUDFLARE_API_TOKEN:'synthetic-fixture-token',WRANGLER_SEND_METRICS:'false'};
 return {dir,record,path,async run(args,extra={}){let result;try{result={status:0,stdout:execFileSync(process.execPath,['--require',join(dir,'preload.cjs'),cli,...args],{cwd:dir,env:{...env,...extra},encoding:'utf8',stdio:['ignore','pipe','pipe']})};}catch(e){result={status:e.status,stdout:String(e.stdout||''),stderr:String(e.stderr||'')};}const text=await readFile(path,'utf8');return {...result,text,record:JSON.parse(text),calls:await readFile(join(dir,'guard-calls.log'),'utf8').catch(()=> '')};}};
}
for(const component of ['pages','admin'])test(`lost ${component} upload acknowledgement still checks protection and retains partial evidence`,async t=>{
 const f=await fixture(t);const result=await f.run(['publish',component]);assert.equal(result.status,1);assert.equal(result.record.state,'partial');assert.equal(result.record.attempts.length,1);assert.equal(result.record.attempts[0].outcome,'unconfirmed');assert.equal(result.record.before[component],id);assert.equal(result.record.completed[component],undefined);
 const script=component==='pages'?'scripts/check-deployment.mjs':'scripts/check-admin-deployment.mjs';assert.equal(result.calls.split('\n').filter(line=>line.startsWith(script)).length,2);
 if(component==='pages')assert.match(result.calls,/check-deployment.mjs after/);
 assert.equal(result.record.attempts[0].protection.status,'passed');assert.ok(!result.text.includes(marker));
});
test('planning child-process stderr never reaches uploaded manifest or terminal output',async t=>{
 const f=await fixture(t);const result=await f.run(['plan'],{RELEASE_EVIDENCE_JSON:JSON.stringify({...f.record,state:'verified'})});assert.equal(result.status,1);assert.equal(result.record.state,'blocked');assert.ok(!result.text.includes(marker));assert.ok(!(result.stdout+result.stderr).includes(marker));assert.match(result.record.reasons.join('\n'),/PLAN_SCHEMA_FAILED/);
});
test('failed post-attempt guard preserves primary upload failure and its unconfirmed attempt',async t=>{
 const f=await fixture(t);const result=await f.run(['publish','pages'],{FAIL_GUARDS:'true'});assert.equal(result.status,1);assert.equal(result.record.state,'partial');assert.equal(result.record.attempts[0].outcome,'unconfirmed');assert.equal(result.record.attempts[0].protection.status,'failed');assert.match(result.record.reasons.join('\n'),/PUBLICATION_FAILED/);assert.match(result.record.reasons.join('\n'),/POST_ATTEMPT_GUARD_FAILED/);assert.ok(!result.text.includes(marker));
});
test('final observation checks every protection even when context fails, without completing a failed release',async t=>{
 const f=await fixture(t);await f.run(['publish','pages']);await writeFile(join(f.dir,'guard-calls.log'),'');
 const result=await f.run(['finish'],{FAIL_CONTEXT:'true',RELEASE_PUBLICATION_SUCCEEDED:'false'});assert.equal(result.status,1);assert.equal(result.record.state,'partial');assert.equal(result.record.attempts[0].outcome,'unconfirmed');
 for(const script of ['check-deployment','check-admin-deployment','check-security-deployment','check-catalogue-deployment'])assert.match(result.calls,new RegExp(script+'[.]mjs'));
 assert.equal(result.record.finalProtection.status,'passed');assert.match(result.record.reasons.join('\n'),/PUBLICATION_FAILED/);assert.ok(!result.text.includes(marker));
});
test('one failing final protection observation does not suppress checks of the other components',async t=>{
 const f=await fixture(t);await f.run(['publish','pages']);await writeFile(join(f.dir,'guard-calls.log'),'');
 const result=await f.run(['finish'],{FAIL_CONTEXT:'true',FAIL_GUARDS:'true',RELEASE_PUBLICATION_SUCCEEDED:'false'});assert.equal(result.status,1);assert.equal(result.record.state,'partial');assert.equal(result.record.finalProtection.status,'failed');assert.equal(result.record.finalProtection.checks.length,4);assert.equal(result.record.finalProtection.checks.filter(c=>c.status==='passed').length,3);assert.equal(result.record.guards.publication,'incomplete');assert.match(result.record.reasons.join('\n'),/PUBLICATION_FAILED/);assert.match(result.record.reasons.join('\n'),/FINAL_GUARD_FAILED/);assert.ok(!result.text.includes(marker));
});
