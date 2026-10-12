/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { adaptGitAction, createRuleOak, EFFECT_VERIFICATION_STATES } from '../../packages/core/src/index.js';
export function gitAvailable(){return spawnSync('git',['--version'],{stdio:'ignore'}).status===0;}
export async function runGitTemplate(){
  if(!gitAvailable()) return {skipped:true,reason:'git unavailable'};
  const root=await mkdtemp(join(tmpdir(),'ruleoak-template-git-')); const message='RuleOak template commit';
  try{
    execFileSync('git',['init','-q'],{cwd:root}); execFileSync('git',['config','user.email','template@example.invalid'],{cwd:root}); execFileSync('git',['config','user.name','RuleOak Template'],{cwd:root});
    await writeFile(join(root,'README.txt'),'before\n'); execFileSync('git',['add','README.txt'],{cwd:root}); execFileSync('git',['commit','-qm','initial'],{cwd:root});
    const ruleoak=await createRuleOak({workspace:join(root,'.ruleoak'),fsyncEvidence:false,policy:{policyVersion:2,defaultAction:'deny',rules:[{id:'allow-local-commit',effect:'allow',priority:100,actions:['git.commit'],resources:['*']}]}});
    const commit=ruleoak.guardFunction({name:'git.commit',category:'git',operation:'commit',buildRequest:()=>adaptGitAction('commit',root,{message}),mapArguments:()=>({repo:root}),effectVerifier:async()=>{const subject=execFileSync('git',['log','-1','--pretty=%s'],{cwd:root,encoding:'utf8'}).trim();return subject===message?{state:EFFECT_VERIFICATION_STATES.CONFIRMED_SUCCESS,reason:'git HEAD subject matches the intended commit',evidence:{effect_applied:true,retry_safe:false,subject}}:{state:EFFECT_VERIFICATION_STATES.PARTIAL_OR_AMBIGUOUS,reason:'HEAD does not establish intended commit',evidence:{effect_applied:null,retry_safe:false,subject}};},execute:async()=>{await writeFile(join(root,'README.txt'),'after\n');execFileSync('git',['add','README.txt'],{cwd:root});execFileSync('git',['commit','-qm',message],{cwd:root});throw new Error('simulated response loss after git commit');}});
    let metadata;try{await commit();}catch(error){metadata=error.ruleoak;} return {metadata};
  }finally{await rm(root,{recursive:true,force:true});}
}
if(import.meta.url===new URL(`file://${process.argv[1]}`).href) console.log(JSON.stringify(await runGitTemplate(),null,2));
