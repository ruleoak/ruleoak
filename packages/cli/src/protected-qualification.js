/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import {createHash,randomBytes} from 'node:crypto';
import {openSync,readSync,closeSync,fstatSync,chmodSync,mkdirSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {canonicalFamilyJson} from '@ruleoak/protocol/family';
import {candidateTreeDigest,scanCandidateTree,readBoundedCandidateFile} from './candidate-ingestion.js';
export const PROTECTED_QUALIFICATION_PATH='.ruleoak/qualification.json';
const sha=b=>'sha256:'+createHash('sha256').update(b).digest('hex');
const hashJson=v=>sha(canonicalFamilyJson(v));
const ownKeys=(x,ks)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).sort().join('|')===[...ks].sort().join('|');
const id=x=>typeof x==='string'&&/^[a-zA-Z][a-zA-Z0-9._:-]{0,127}$/.test(x);
const strings=x=>Array.isArray(x)&&x.length>0&&x.length<=100&&x.every(v=>typeof v==='string')&&new Set(x).size===x.length;
const localPath=p=>typeof p==='string'&&p.length<=1024&&!p.startsWith('/')&&!/[\\:\x00-\x1f]/.test(p)&&p.split('/').every(x=>x&&x!=='.'&&x!=='..');
const COMPLETION_WRAPPER=`import {writeSync} from 'node:fs'; const token=process.env.RULEOAK_ORACLE_COMPLETION_TOKEN; delete process.env.RULEOAK_ORACLE_COMPLETION_TOKEN; process.once('beforeExit',()=>writeSync(3,token));`;
const classes={static:'STATIC',unit:'UNIT',integration:'INTEGRATION',property:'PROPERTY',build:'BUILD'};
function runnerIdentity() {
 const fd=openSync(process.execPath,'r'),hash=createHash('sha256'),chunk=Buffer.alloc(65536);
 try {const st=fstatSync(fd);if(!st.isFile()||st.size>512*1024*1024)throw Error('runner executable limit');let n;while((n=readSync(fd,chunk,0,chunk.length,null))>0)hash.update(chunk.subarray(0,n));return {id:'node',version:process.version,executable_sha256:'sha256:'+hash.digest('hex')};}
 finally {closeSync(fd);}
}
/** Only baseline-owned policy may select checks or bind capabilities. Absence means missing evidence. */
export function loadProtectedQualification(baseTree,candidateTree,manifest,affected) {
 const errors=[],warnings=[],row=baseTree.get(PROTECTED_QUALIFICATION_PATH),candidate=candidateTree.get(PROTECTED_QUALIFICATION_PATH);
 if(!row){if(candidate)errors.push('CANDIDATE_OWNED_QUALIFICATION_POLICY');else warnings.push('NO_BASELINE_PROTECTED_ORACLES');return {valid:!errors.length,errors,warnings,oracles:[],protected_files:[],policy_sha256:null};}
 if(!candidate||candidate.hash!==row.hash||candidate.mode!==row.mode)errors.push('PROTECTED_QUALIFICATION_POLICY_CHANGED');
 let policy;try{const bytes=readBoundedCandidateFile(row.abs,256*1024);if(sha(bytes)!==row.hash)throw Error('BASELINE_POLICY_CHANGED_DURING_READ');policy=JSON.parse(bytes);canonicalFamilyJson(policy);}catch(error){return {valid:false,errors:['INVALID_BASELINE_POLICY: '+error.message],warnings,oracles:[],protected_files:[],policy_sha256:row.hash};}
 if(!ownKeys(policy,['qualification_version','oracles'])||policy.qualification_version!=='1.0'||!Array.isArray(policy.oracles)||!policy.oracles.length||policy.oracles.length>32)return {valid:false,errors:['INVALID_BASELINE_POLICY_SHAPE'],warnings,oracles:[],protected_files:[],policy_sha256:row.hash};
 const knownCaps=new Set((manifest.capabilities||[]).map(c=>c.id)),reqs=new Map((manifest.evidence_requirements||[]).map(r=>[r.id,r])),seen=new Set(),protectedFiles=new Set([PROTECTED_QUALIFICATION_PATH]),oracles=[];
 for(const o of policy.oracles) {
  if(!ownKeys(o,['id','runner','script','args','protected_files','evidence_type','capability_ids','evidence_requirement_ids'])||!id(o.id)||seen.has(o.id)||o.runner!=='node'||!localPath(o.script)||!strings(o.protected_files)||!o.protected_files.every(localPath)||!o.protected_files.includes(o.script)||!Array.isArray(o.args)||o.args.length>32||o.args.some(a=>typeof a!=='string'||a.length>4096||a.includes('\0'))||!classes[o.evidence_type]||!strings(o.capability_ids)||!o.capability_ids.every(c=>knownCaps.has(c))||!strings(o.evidence_requirement_ids)) {errors.push('INVALID_PROTECTED_ORACLE');continue;}
  seen.add(o.id);
  const exactBindings=o.evidence_requirement_ids.every(r=>reqs.has(r)&&reqs.get(r).evidence_types.includes(o.evidence_type)&&reqs.get(r).capability_ids.every(c=>o.capability_ids.includes(c)))&&o.capability_ids.every(c=>o.evidence_requirement_ids.some(r=>reqs.get(r)?.capability_ids.includes(c)));
  if(!exactBindings){errors.push(o.id+': INVALID_EXACT_REQUIREMENT_BINDINGS');continue;}
  for(const p of o.protected_files)protectedFiles.add(p);
  if(o.capability_ids.some(c=>affected.includes(c)))oracles.push({...o,evidence_class:classes[o.evidence_type]});
 }
 const files=[];
 for(const p of protectedFiles){const a=baseTree.get(p),b=candidateTree.get(p);if(!a)errors.push('PROTECTED_FILE_MISSING_FROM_BASELINE: '+p);else{files.push({path:p,sha256:a.hash,mode:a.mode});if(!b||a.hash!==b.hash||a.mode!==b.mode)errors.push('PROTECTED_FILE_CHANGED_OR_REMOVED: '+p);}}
 return {valid:!errors.length,errors,warnings,oracles,protected_files:files,policy_sha256:row.hash};
}
/** Review a bounded immutable source snapshot; tests do not run in the user's candidate directory. */
export function snapshotQualificationCandidate(tree) {
 const root=mkdtempSync(join(tmpdir(),'ruleoak-qualification-'));
 try {for(const [path,row] of tree){const bytes=readBoundedCandidateFile(row.abs);if(sha(bytes)!==row.hash)throw Error('CANDIDATE_CHANGED_DURING_SNAPSHOT');const dest=join(root,path);mkdirSync(dirname(dest),{recursive:true});writeFileSync(dest,bytes,{flag:'wx',mode:row.mode});chmodSync(dest,row.mode);}
  return {root,cleanup:()=>rmSync(root,{recursive:true,force:true})};
 }catch(e){rmSync(root,{recursive:true,force:true});throw e;}
}
export function runProtectedQualification(baseRoot,candidateTree,policy,manifest,options={}) {
 const candidateDigest=candidateTreeDigest(candidateTree),baselineDigest=options.baselineDigest,results=[];
 if(!policy.valid)throw Error('protected qualification policy rejected');
 if(!policy.oracles.length)return {results,bindings:{candidate_sha256:candidateDigest,baseline_sha256:baselineDigest,policy_sha256:policy.policy_sha256},mutation_detected:false};
 const snapshot=snapshotQualificationCandidate(candidateTree),runner={...runnerIdentity(),completion_wrapper_sha256:sha(COMPLETION_WRAPPER)};let mutated=false;
 try {
  for(const oracle of policy.oracles) {
   const files=policy.protected_files.filter(f=>oracle.protected_files.includes(f.path));
   const binding={candidate_sha256:candidateDigest,source_zip_sha256:options.sourceZipSha256||null,baseline_sha256:baselineDigest,intent_manifest_sha256:hashJson(manifest),policy_sha256:policy.policy_sha256,oracle_id:oracle.id,oracle_sha256:hashJson({oracle,files}),protected_files:files,runner,capability_ids:oracle.capability_ids,evidence_requirement_ids:oracle.evidence_requirement_ids};
   let result,completed=false,started=Date.now();const command=[process.execPath,resolve(snapshot.root,oracle.script),...oracle.args];
   if(options.toolRunner){const injected=options.toolRunner(snapshot.root,{id:oracle.id,command:command[0],args:command.slice(1),evidence_type:oracle.evidence_type,evidence_class:oracle.evidence_class,source:'baseline-protected-oracle'})||{};result={status:Number.isInteger(injected.exit_code)?injected.exit_code:1,stdout:injected.output||'',stderr:'',signal:null};}
   else {
    // Remove Node injection flags; this is process isolation for source ownership, not an OS security sandbox.
    const env={...process.env,RULEOAK_EXTERNAL_IMPLEMENTATION:'1',RULEOAK_CANDIDATE_ROOT:snapshot.root,RULEOAK_ORACLE_ID:oracle.id};delete env.NODE_OPTIONS;delete env.NODE_PATH;
    const completionToken=randomBytes(24).toString('hex');env.RULEOAK_ORACLE_COMPLETION_TOKEN=completionToken;
    result=spawnSync(command[0],['--import','data:text/javascript,'+encodeURIComponent(COMPLETION_WRAPPER),command[1],...oracle.args],{cwd:snapshot.root,env,stdio:['ignore','pipe','pipe','pipe'],encoding:'utf8',timeout:Math.min(Math.max(Number(options.toolTimeoutMs)||120000,1),120000),maxBuffer:4*1024*1024});
    completed=result.output?.[3]===completionToken;
   }
   let after;try{after=scanCandidateTree(snapshot.root,{ignore:options.ignore});}catch{mutated=true;}
   if(after&&candidateTreeDigest(after)!==candidateDigest)mutated=true;
   // Baseline is independently rebound after the tool returns; no test may rewrite its own oracle ownership.
   try{if(candidateTreeDigest(scanCandidateTree(baseRoot,{ignore:options.ignore}))!==baselineDigest)mutated=true;}catch{mutated=true;}
   const exit=Number.isInteger(result.status)?result.status:1,output=String(result.stdout||'')+String(result.stderr||'');
   const status=mutated?'FAIL':exit!==0?'FAIL':options.toolRunner||!completed?'UNKNOWN':'PASS';
   results.push({id:oracle.id,evidence_type:oracle.evidence_type,evidence_class:oracle.evidence_class,source:'baseline-protected-oracle',command:[runner.id,oracle.script,...oracle.args],exit_code:exit,signal:result.signal||null,duration_ms:Date.now()-started,output:output.slice(0,24*1024),output_sha256:sha(output),status,qualification_binding:binding,binding_sha256:hashJson(binding),independent:!options.toolRunner&&!mutated&&completed,diagnostic:mutated?'SOURCE_CHANGED_DURING_QUALIFICATION':options.toolRunner?'INJECTED_RUNNER_NOT_QUALIFICATION':!completed?'PROTECTED_ORACLE_DID_NOT_COMPLETE':null});
   if(mutated)break;
  }
  if(mutated)for(const result of results){result.independent=false;result.status='FAIL';result.diagnostic='SOURCE_CHANGED_DURING_QUALIFICATION';}
  return {results,bindings:{candidate_sha256:candidateDigest,baseline_sha256:baselineDigest,policy_sha256:policy.policy_sha256,runner},mutation_detected:mutated};
 }finally{snapshot.cleanup();}
}
