/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRuleOak } from '../../packages/core/src/index.js';
export async function runCustomTemplate(){
  const root=await mkdtemp(join(tmpdir(),'ruleoak-template-custom-'));
  try{
    const ruleoak=await createRuleOak({workspace:root,fsyncEvidence:false,policy:{policyVersion:2,defaultAction:'deny',rules:[{id:'allow-demo-custom',effect:'allow',priority:100,actions:['custom.external_mutation'],resources:['urn:demo:*']}]}});
    const mutate=ruleoak.guardFunction({name:'custom.external_mutation',category:'custom',operation:'execute',resource:()=> 'urn:demo:42',execute:async()=>({accepted:true}),resultMode:'envelope'});
    const result=await mutate(); return result.ruleoak;
  } finally {await rm(root,{recursive:true,force:true});}
}
if(import.meta.url===new URL(`file://${process.argv[1]}`).href) console.log(JSON.stringify(await runCustomTemplate(),null,2));
