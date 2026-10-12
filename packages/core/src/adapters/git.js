/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import { execFileSync } from 'node:child_process';
import { existsSync, realpathSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';
import { consumeExecutionLease } from '../execution/lease.js';
import { buildEffectReceipt } from '../execution/effect-receipt.js';
import { adapterDescriptor, annotateAdapterContract, validateEffectReceiptAgainstAdapter } from './conformance.js';

const EXECUTABLE_OPERATIONS=new Set(['status','branch.create','commit','push']);

function runGit(args,{cwd,timeoutMs=15000,env}={}){
  try {
    const stdout=execFileSync('git',args,{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:timeoutMs,maxBuffer:2*1024*1024,env:{...process.env,...env}});
    return {ok:true,stdout:String(stdout||''),stderr:'',exit_code:0};
  } catch(error){
    return {ok:false,stdout:String(error?.stdout||''),stderr:String(error?.stderr||error?.message||''),exit_code:Number.isInteger(error?.status)?error.status:null,error};
  }
}
function requireGitOk(result,label){if(!result.ok){const error=new Error(`${label}: ${result.stderr.trim()||'git command failed'}`);error.git=result;throw error;}return result;}
function repositoryPath(input){const path=resolve(String(input||'.'));if(!existsSync(path))throw new Error(`git repository does not exist: ${path}`);const top=runGit(['-C',path,'rev-parse','--show-toplevel']);requireGitOk(top,'not a Git repository');return realpathSync(top.stdout.trim());}
function branchName(value){const name=String(value||'').trim();if(!name)throw new Error('git branch is required');requireGitOk(runGit(['check-ref-format','--branch',name]),'invalid Git branch');return name;}
function head(repo){const r=runGit(['-C',repo,'rev-parse','HEAD']);return r.ok?r.stdout.trim():null;}
function currentBranch(repo){const r=runGit(['-C',repo,'branch','--show-current']);return r.ok?r.stdout.trim():'';}
function remoteUrl(repo,remote){const r=runGit(['-C',repo,'remote','get-url',remote]);requireGitOk(r,`unknown Git remote ${remote}`);return r.stdout.trim();}
function localRemote(url,repo){if(String(url).startsWith('file://'))return true;if(/^[a-z][a-z0-9+.-]*:\/\//i.test(String(url)))return false;if(/^[^/\\]+@[^:]+:/i.test(String(url)))return false;const candidate=isAbsolute(url)?url:resolve(repo,url);return existsSync(candidate);}
function requireCall(call){if(!call||typeof call!=='object'||call?.context?.adapter_contract?.adapter_id!=='git-action')throw new Error('executeGitAction requires a normalized git-action call');const operation=String(call?.arguments?.operation||'');if(!EXECUTABLE_OPERATIONS.has(operation))throw new Error(`unsupported executable Git operation: ${operation||'unknown'}`);return operation;}
function receiptFor(lease,outcome,options){const descriptor=adapterDescriptor('git-action');const receipt=buildEffectReceipt(lease,outcome,{adapter:'git-action',startedAt:outcome.started_at,completedAt:outcome.completed_at,secret:options.effectSecret,descriptor});const validation=validateEffectReceiptAgainstAdapter(receipt,descriptor);if(!validation.ok)throw new Error(`Git EffectReceipt violates adapter contract: ${validation.errors.join('; ')}`);return receipt;}

export function adaptGitAction(operation,repository,options={}){
  const op=String(operation||'status');
  const map={status:'read',read:'read','branch.create':'create',commit:'write',push:'send',merge:'update'};
  return annotateAdapterContract({call_id:options.callId||`git_${Date.now()}`,timestamp:options.timestamp||new Date().toISOString(),actor:{type:options.actor?.type||'agent',name:options.actor?.name||'unknown-agent',session_id:options.actor?.session_id||options.sessionId||'default-session',...(options.actor?.id?{id:options.actor.id}:{})},tool:{name:`git.${op}`,category:'custom',operation:map[op]||'execute'},target:{resource:`git://${String(repository||'.').replace(/^\/+/, '')}${options.branch?`#${options.branch}`:''}`,scope:op==='push'?'external':'local',sensitivity:options.sensitivity||'internal'},arguments:{operation:op,repository:String(repository||'.'),branch:options.branch||null,remote:options.remote||null,message:options.message||null},context:{adapter:'git-action'}},'git-action');
}

export async function executeGitAction(call,options={}){
  const operation=requireCall(call);
  if(!options.lease)throw new Error('Git execution requires an ExecutionLease');
  if(!options.leaseSecret)throw new Error('Git execution requires leaseSecret');
  if(!options.leaseStoreDir)throw new Error('Git execution requires leaseStoreDir');
  const repo=repositoryPath(call.arguments.repository);
  const policy=options.policy||{};
  const branch=operation==='branch.create'||operation==='push'?branchName(call.arguments.branch||currentBranch(repo)):call.arguments.branch;
  if(operation==='branch.create'){
    const exists=runGit(['-C',repo,'show-ref','--verify','--quiet',`refs/heads/${branch}`]).ok;
    if(exists)throw new Error(`Git branch already exists: ${branch}`);
  }
  if(operation==='commit'){
    if(!String(call.arguments.message||'').trim())throw new Error('git commit requires a non-empty message');
    const staged=runGit(['-C',repo,'diff','--cached','--quiet']);
    if(staged.ok)throw new Error('git commit requires staged changes');
  }
  let remote='origin',url=null,isLocal=false;
  if(operation==='push'){
    remote=String(call.arguments.remote||'origin');url=remoteUrl(repo,remote);isLocal=localRemote(url,repo);
    if(isLocal&&!options.allowLocalPush)throw new Error('local Git push requires allowLocalPush=true');
    if(!isLocal&&!options.allowNetworkPush)throw new Error('network Git push is disabled; set allowNetworkPush=true explicitly');
  }
  const startedAt=new Date(options.now||new Date()).toISOString();
  const before={head:head(repo),branch:currentBranch(repo)};
  const consumption=consumeExecutionLease(options.lease,call,policy,{secret:options.leaseSecret,now:options.now,storeDir:options.leaseStoreDir,revocationRegistry:options.revocationRegistry,usage:options.usage||{},obligationContext:options.obligationContext||{}});
  if(!consumption.ok)return {ok:false,executed:false,call,consumption,effectReceipt:null,errors:consumption.errors};
  options.ledger?.leaseConsumed?.(options.lease,consumption.marker);
  options.ledger?.append?.('execution.started',{lease_id:options.lease.lease_id,adapter:'git-action',operation,repository:repo});
  let commandResult;
  if(operation==='status')commandResult=runGit(['-C',repo,'status','--porcelain=v1','--branch'],{timeoutMs:options.timeoutMs});
  else if(operation==='branch.create')commandResult=runGit(['-C',repo,'branch',branch],{timeoutMs:options.timeoutMs});
  else if(operation==='commit')commandResult=runGit(['-C',repo,'-c','user.name=RuleOak Test Executor','-c','user.email=ruleoak@example.invalid','commit','-m',String(call.arguments.message)],{timeoutMs:options.timeoutMs});
  else commandResult=runGit(['-C',repo,'push',remote,`${branch}:${branch}`],{timeoutMs:options.timeoutMs});
  const after={head:head(repo),branch:currentBranch(repo)};
  let observed={exit_code:commandResult.exit_code,before,after};
  let quality=commandResult.ok?'complete_for_adapter':'process_return_observed';
  if(operation==='status')observed={...observed,status:commandResult.stdout};
  if(operation==='branch.create')observed={...observed,branch,branch_exists:runGit(['-C',repo,'show-ref','--verify','--quiet',`refs/heads/${branch}`]).ok};
  if(operation==='commit')observed={...observed,commit:after.head,head_changed:before.head!==after.head};
  if(operation==='push'){
    observed={...observed,remote,remote_kind:isLocal?'local':'network'};
    if(isLocal){const verify=runGit(['-C',repo,'ls-remote',remote,`refs/heads/${branch}`]);observed.remote_ref=verify.ok?verify.stdout.trim().split(/\s+/)[0]||null:null;observed.local_ref=head(repo);observed.remote_matches_local=Boolean(observed.remote_ref&&observed.remote_ref===observed.local_ref);}
    else quality='remote_response_observed';
  }
  const completedAt=new Date(options.completedAt||new Date()).toISOString();
  const effectReceipt=receiptFor(options.lease,{status:commandResult.ok?'success':'failure',observation_quality:quality,requested:{operation,repository:repo,branch:branch||null,remote:operation==='push'?remote:null},observed,error:commandResult.ok?null:{message:commandResult.stderr.trim()||'git command failed',exit_code:commandResult.exit_code},started_at:startedAt,completed_at:completedAt},options);
  options.ledger?.effectRecorded?.(effectReceipt);
  return {ok:commandResult.ok,executed:true,call,consumption,effectReceipt,command:{stdout:commandResult.stdout,stderr:commandResult.stderr,exit_code:commandResult.exit_code},errors:commandResult.ok?[]:[commandResult.stderr.trim()||'git command failed']};
}

export const gitAdapter=Object.freeze({descriptor:adapterDescriptor('git-action'),normalize:(input,options={})=>adaptGitAction(input?.operation,input?.repository,{...options,...input}),execute:executeGitAction});
