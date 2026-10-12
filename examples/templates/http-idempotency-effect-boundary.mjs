/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRuleOak } from '../../packages/core/src/index.js';

export async function runHttpTemplate(){
  const root=await mkdtemp(join(tmpdir(),'ruleoak-template-http-')); const remote=new Map(); const id='order-42';
  try {
    const ruleoak=await createRuleOak({workspace:root,fsyncEvidence:false,policy:{policyVersion:2,defaultAction:'deny',rules:[{id:'allow-idempotent-order',effect:'allow',priority:100,actions:['http.create'],resources:['https://api.example.invalid/orders/*']}]}});
    const createOrder=ruleoak.guardFunction({name:'http.create',category:'web',operation:'create',resource:()=>`https://api.example.invalid/orders/${id}`,effectKind:'http',idempotent:true,mapArguments:()=>({url:`https://api.example.invalid/orders/${id}`,idempotent:true}),httpPostconditionProbe:async()=>remote.has(id)?{confirmed:true,reason:'idempotency-key lookup found the created order',remote_id:id}:{confirmed:false,effect_applied:false,no_effect_proven:true,reason:'idempotency-key lookup proves no order exists'},execute:async()=>{remote.set(id,{id}); throw new Error('simulated network response loss');}});
    let metadata; try {await createOrder();}catch(error){metadata=error.ruleoak;}
    return {remoteHasOrder:remote.has(id),metadata};
  } finally {await rm(root,{recursive:true,force:true});}
}
if(import.meta.url===new URL(`file://${process.argv[1]}`).href) console.log(JSON.stringify(await runHttpTemplate(),null,2));
