/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRuleOak, RETRY_DISPOSITIONS, EFFECT_VERIFICATION_STATES } from '../src/index.js';
function make(){const root=mkdtempSync(join(tmpdir(),'ruleoak-effect-runtime-'));const ws=join(root,'.ruleoak');mkdirSync(ws,{recursive:true});writeFileSync(join(ws,'policy.json'),JSON.stringify({policyVersion:2,defaultAction:'deny',rules:[{id:'write',effect:'allow',actions:['filesystem.write'],resources:['*'],priority:100}]}));return{root,ws};}
{
 const {root,ws}=make(),path=join(root,'done.txt');const ruleoak=await createRuleOak({workspace:ws});
 const write=ruleoak.guardFunction({name:'filesystem.write',category:'file',operation:'write',resource:()=>path,mapArguments:([content])=>({path,content}),execute:async content=>{writeFileSync(path,content);return{ok:true};}});
 await write('once');assert.equal(readFileSync(path,'utf8'),'once');assert.equal(ruleoak.lastExecution.effect_state,EFFECT_VERIFICATION_STATES.CONFIRMED_SUCCESS);assert.equal(ruleoak.lastExecution.retry_disposition,RETRY_DISPOSITIONS.DO_NOT_RETRY);assert.ok(ruleoak.lastExecution.lease_id);assert.ok(ruleoak.lastExecution.effect_id);
}
{
 const {root,ws}=make(),path=join(root,'lost.txt');const ruleoak=await createRuleOak({workspace:ws});let calls=0;
 const write=ruleoak.guardFunction({name:'filesystem.write',category:'file',operation:'write',resource:()=>path,mapArguments:([content])=>({path,content}),execute:async content=>{calls++;writeFileSync(path,content);throw new Error('response lost after write');}});
 await assert.rejects(()=>write('committed'),e=>e.ruleoak?.effect_state===EFFECT_VERIFICATION_STATES.CONFIRMED_SUCCESS&&e.ruleoak?.retry_disposition===RETRY_DISPOSITIONS.DO_NOT_RETRY);assert.equal(calls,1);assert.equal(readFileSync(path,'utf8'),'committed');
}
{
 const {root,ws}=make(),path=join(root,'never.txt');const ruleoak=await createRuleOak({workspace:ws});
 const write=ruleoak.guardFunction({name:'filesystem.write',category:'file',operation:'write',resource:()=>path,idempotent:true,mapArguments:([content])=>({path,content,idempotent:true}),execute:async()=>{throw new Error('pre-dispatch failure');}});
 await assert.rejects(()=>write('x'),e=>e.ruleoak?.effect_state===EFFECT_VERIFICATION_STATES.CONFIRMED_FAILURE&&e.ruleoak?.retry_disposition===RETRY_DISPOSITIONS.SAFE_TO_RETRY_WITH_NEW_AUTHORITY&&e.ruleoak?.fresh_authority_required===true);
}
console.log('runtime effect boundary tests passed');
