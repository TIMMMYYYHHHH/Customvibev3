import test from 'node:test';import assert from 'node:assert/strict';
import {recipientBinding} from '../server/mail-recipient.mjs';
test('recipient binding matches domain case and envelope field order but preserves local case and message identity',async()=>{
 const a=await recipientBinding('message-1',{to:['Name@EXAMPLE.COM'],cc:[],bcc:[],subject:'private'}),b=await recipientBinding('message-1',{bcc:[],cc:[],to:['Name@example.com']});assert.deepEqual(a,b);assert.equal(a.recipientCount,1);assert.match(a.recipientDigest,/^[a-f0-9]{64}$/);assert.notEqual(a.recipientDigest,(await recipientBinding('message-1',{to:['name@example.com']})).recipientDigest);assert.notEqual(a.recipientDigest,(await recipientBinding('message-2',{to:['Name@example.com']})).recipientDigest);assert.doesNotMatch(JSON.stringify(a),/Name|EXAMPLE|private/);
 const bytes=new TextEncoder().encode(JSON.stringify(['cv-recipient-v1','message-1','Name@example.com']));const expected=Buffer.from(await crypto.subtle.digest('SHA-256',bytes)).toString('hex');assert.equal(a.recipientDigest,expected);
});
test('ambiguous or malformed outgoing envelopes cannot establish a binding',async()=>{
 for(const envelope of [{to:[]},{to:['a@example.com','b@example.com']},{to:'a@example.com'},{to:['a@example.com'],cc:['b@example.com']},{to:['a@example.com'],bcc:['b@example.com']},...[' A@example.com','A@example.com\n','Display <a@example.com>','a@@example.com','a@example','a@-example.com','a@example..com','a@exam_ple.com','a@例.com'].map(x=>({to:[x]}))])assert.equal(await recipientBinding('message-1',envelope),null);
 assert.equal(await recipientBinding('bad id',{to:['a@example.com']}),null);
});
import {readFileSync} from 'node:fs';import vm from 'node:vm';
test('shared digest executes unchanged in a Worker-like context with only standard Web Crypto globals',async()=>{
 const code=readFileSync('server/mail-receipt.mjs','utf8').replaceAll('export ','')+'\n'+readFileSync('server/mail-recipient.mjs','utf8').replace(/^import .*;\n/,'').replaceAll('export ','');const isolated=vm.runInNewContext(code+'\nrecipientBinding',{crypto,TextEncoder});const worker=await isolated('message-1',{to:['Name@EXAMPLE.COM']});assert.equal(JSON.stringify(worker),JSON.stringify(await recipientBinding('message-1',{to:['Name@example.com']})));assert.equal(await isolated('message-1',{to:['Name@example.com'],bcc:['hidden@example.com']}),null);
});
