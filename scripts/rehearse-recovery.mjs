import {writeFile,mkdir} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {rehearseRecovery} from '../tests/fixtures/recovery-rehearsal.mjs';
const result=await rehearseRecovery(),out=resolve(process.argv[2]||'local-evidence/recovery/results.json');await mkdir(dirname(out),{recursive:true});await writeFile(out,JSON.stringify(result,null,2));console.log(JSON.stringify({checks:Object.keys(result.checks).length,timings:result.timings,fixture:result.fixture,dec04:result.dec04,providerRestorePerformed:false},null,2));
