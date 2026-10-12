/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRuleOak } from '../../packages/core/src/index.js';

export async function runFilesystemTemplate(){
  const root=await mkdtemp(join(tmpdir(),'ruleoak-template-fs-')); const target=join(root,'result.txt'); const content='committed once\n';
  try {
    const ruleoak=await createRuleOak({workspace:root,fsyncEvidence:false,effectRoots:[root],policy:{policyVersion:2,defaultAction:'deny',rules:[{id:'allow-template-write',effect:'allow',priority:100,actions:['filesystem.write'],resources:[`${root}/**`]}]}});
    const writeOnce=ruleoak.guardFunction({name:'filesystem.write',category:'file',operation:'write',resource:()=>target,effectKind:'filesystem',effectRoots:[root],mapArguments:()=>({path:target,content}),execute:async()=>{await writeFile(target,content); throw new Error('simulated response loss after write');},resultMode:'envelope'});
    let metadata; try { await writeOnce(); } catch(error){ metadata=error.ruleoak; }
    return {content:await readFile(target,'utf8'),metadata};
  } finally { await rm(root,{recursive:true,force:true}); }
}
if(import.meta.url===new URL(`file://${process.argv[1]}`).href){const r=await runFilesystemTemplate();console.log(JSON.stringify(r,null,2));}
