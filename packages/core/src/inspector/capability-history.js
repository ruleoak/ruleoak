/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync } from 'node:fs';
import { atomicWriteFileSync, readBoundedFileSync } from '../io/durable-file.js';
import { validateCapabilityManifest, validateCapabilityObservation } from '@ruleoak/protocol';
import { canonicalStringify } from '../decision/receipt.js';
import { buildCapabilityEvidence, validateCapabilityIntelligenceIntegrity } from './capability-intelligence.js';
import { withFileLock } from '../io/file-lock.js';
import { dirname } from 'node:path';

export const CAPABILITY_HISTORY_LIMITS=Object.freeze({maxBytes:8*1024*1024,maxLineBytes:64*1024,maxObservations:50000});
const DRIFT_ORDER=['metadata_change','schema_change','capability_expansion','capability_contraction','consequence_escalation','consequence_reduction','provenance_change','transport_change','classification_basis_change'];
const STATE_RANK={read_only:0,unknown:1,state_changing:2};
const CONSEQUENCE_RANK={read_only:0,unknown:1,high_consequence:2,destructive:3};
function digest(v){return `sha256:${createHash('sha256').update(canonicalStringify(v)).digest('hex')}`;}
function clone(v){return JSON.parse(JSON.stringify(v));}
function iso(v){const d=new Date(v);if(!Number.isFinite(d.getTime()))throw new Error('observedAt must be a valid ISO date-time');return d.toISOString();}
function toolId(t){return t?.capability_id||t?.capability_identity?.capability_id||null;}
function same(a,b){return canonicalStringify(a??{})===canonicalStringify(b??{});}
function cleanCategories(values){const set=new Set(values);return DRIFT_ORDER.filter(v=>set.has(v));}
export function capabilityObservationDigestPayload(observation={}){
  const {observation_id: _ignored,...payload}=clone(observation);
  return payload;
}
export function verifyCapabilityObservationDigest(observation={}){return typeof observation?.observation_id==='string'&&observation.observation_id===digest(capabilityObservationDigestPayload(observation));}
function publicSafeBasisObject(value){
  if(!value||typeof value!=='object'||Array.isArray(value))return false;
  return Object.keys(value).every(k=>['state','consequence','secret_or_identity_related'].includes(k)&&typeof value[k]==='string'&&value[k].length<=256);
}
export function isPublicationSafeCapabilityObservation(observation={}){
  if(!publicSafeBasisObject(observation?.snapshot?.classification_basis||{}))return false;
  if(!publicSafeBasisObject(observation?.snapshot?.evidence?.classification_basis||{}))return false;
  const source=observation?.snapshot?.evidence?.source||{};
  return !Object.keys(source).some(k=>/url|path|endpoint|prompt|content|credential|token|secret/i.test(k));
}
function evidenceMetadataChanged(a,b){
  const ae=a?.evidence||{},be=b?.evidence||{},as=ae.source||{},bs=be.source||{};
  const ac=(ae.evidence_classes||[]).filter(x=>x!=='historical_observation'),bc=(be.evidence_classes||[]).filter(x=>x!=='historical_observation');
  return as.declared_version!==bs.declared_version||as.protocol_version!==bs.protocol_version||!same(ac,bc);
}
function provenanceChanged(a,b){
  const as=a?.evidence?.source||{},bs=b?.evidence?.source||{};
  return as.source_kind!==bs.source_kind||as.source_digest!==bs.source_digest||a?.evidence?.mutability!==b?.evidence?.mutability;
}
function escalation(a,b){return (STATE_RANK[b?.state]??1)>(STATE_RANK[a?.state]??1)||(CONSEQUENCE_RANK[b?.consequence]??1)>(CONSEQUENCE_RANK[a?.consequence]??1);}
function reduction(a,b){return (STATE_RANK[b?.state]??1)<(STATE_RANK[a?.state]??1)||(CONSEQUENCE_RANK[b?.consequence]??1)<(CONSEQUENCE_RANK[a?.consequence]??1);}

export function classifyCapabilityDrift(previousTool,currentTool,context={}){
  const out=[];
  if(!previousTool&&currentTool)out.push('capability_expansion');
  if(previousTool&&!currentTool)out.push('capability_contraction');
  if(previousTool&&currentTool){
    if(previousTool.schema_digest!==currentTool.schema_digest)out.push('schema_change');
    if(escalation(previousTool,currentTool))out.push('consequence_escalation');
    if(reduction(previousTool,currentTool))out.push('consequence_reduction');
    if(provenanceChanged(previousTool,currentTool))out.push('provenance_change');
    if(!same(previousTool.classification_basis,currentTool.classification_basis))out.push('classification_basis_change');
    if(evidenceMetadataChanged(previousTool,currentTool)&&!out.includes('provenance_change'))out.push('metadata_change');
  }
  if(context.previousTransport&&context.currentTransport&&context.previousTransport!==context.currentTransport)out.push('transport_change');
  return cleanCategories(out);
}

function safeBasis(basis={}){
  const out={};
  for(const key of ['state','consequence','secret_or_identity_related']){
    if(basis?.[key]===undefined)continue;
    const value=String(basis[key]).normalize('NFKC').trim();
    out[key]=value.slice(0,256);
  }
  return out;
}
function historicalEvidence(tool,observedAt){
  const ev=tool?.evidence||{};const source=ev.source||{};const basis=safeBasis(tool?.classification_basis||ev.classification_basis||{});
  return buildCapabilityEvidence({classification_basis:basis,source_kind:source.source_kind,source_digest:source.source_digest,declared_version:source.declared_version,protocol_version:source.protocol_version,mutability:ev.mutability,historical:true},{observedAt,historical:true});
}
function snapshotFor(tool,transport,lifecycle,observedAt){
  const evidence=historicalEvidence(tool,observedAt);
  if(lifecycle==='removed')return {state:'removed',consequence:'removed',secret_or_identity_related:Boolean(tool?.secret_or_identity_related),schema_digest:null,classification_basis:{},transport:String(transport||tool?.capability_identity?.transport||'manifest'),evidence};
  return {state:tool.state,consequence:tool.consequence,secret_or_identity_related:Boolean(tool.secret_or_identity_related),schema_digest:tool.schema_digest||null,classification_basis:safeBasis(tool.classification_basis||{}),transport:String(transport||tool?.capability_identity?.transport||'manifest'),evidence};
}

export function buildCapabilityObservation({manifest,tool,lifecycleState,driftCategories=[],previousObservationId=null,observedAt,identityOverride={}}){
  const mv=validateCapabilityManifest(manifest);if(!mv.valid)throw new Error(`invalid capability manifest: ${mv.errors.join('; ')}`);const integrity=validateCapabilityIntelligenceIntegrity(manifest);if(!integrity.ok)throw new Error(`capability manifest integrity failed: ${integrity.errors.join('; ')}`);
  if(!toolId(tool))throw new Error('tool capability_id is required');
  const observationTime=iso(observedAt??tool.evidence?.observed_at??new Date().toISOString());
  const payload={observation_version:'1.0',integration_id:identityOverride.integration_id||manifest.identity.integration_id,capability_id:toolId(tool),integration_name:String(identityOverride.integration_name||manifest.identity.name),action_name:String(tool.name),observed_at:observationTime,lifecycle_state:lifecycleState,drift_categories:cleanCategories(driftCategories),previous_observation_id:previousObservationId||null,snapshot:snapshotFor(tool,identityOverride.transport||manifest.identity.transport,lifecycleState,observationTime)};
  const observation={...payload,observation_id:digest(payload)};
  const v=validateCapabilityObservation(observation);if(!v.valid)throw new Error(`invalid capability observation: ${v.errors.join('; ')}`);
  return observation;
}

function latestByCapability(history){const map=new Map();for(const o of history)map.set(o.capability_id,o);return map;}
function everSeenBefore(history,id){return history.some(o=>o.capability_id===id&&o.lifecycle_state!=='removed');}
function previousToolFromObservation(obs){if(!obs||obs.lifecycle_state==='removed')return null;return {name:obs.action_name,capability_id:obs.capability_id,state:obs.snapshot.state,consequence:obs.snapshot.consequence,secret_or_identity_related:obs.snapshot.secret_or_identity_related,schema_digest:obs.snapshot.schema_digest,classification_basis:obs.snapshot.classification_basis,evidence:obs.snapshot.evidence,capability_identity:{capability_id:obs.capability_id,integration_id:obs.integration_id,transport:obs.snapshot.transport}};}

export function observeCapabilityManifest(history=[],manifest,options={}){
  const mv=validateCapabilityManifest(manifest);if(!mv.valid)throw new Error(`invalid capability manifest: ${mv.errors.join('; ')}`);const integrity=validateCapabilityIntelligenceIntegrity(manifest);if(!integrity.ok)throw new Error(`capability manifest integrity failed: ${integrity.errors.join('; ')}`);
  const observedAt=iso(options.observedAt??manifest.tools?.[0]?.evidence?.observed_at??new Date().toISOString());
  const prior=Array.isArray(history)?history:[];for(const o of prior){const v=validateCapabilityObservation(o);if(!v.valid)throw new Error(`invalid prior capability observation: ${v.errors.join('; ')}`);}
  const latest=latestByCapability(prior);const current=new Map((manifest.tools||[]).map(t=>[toolId(t),t]));const observations=[];
  const previousTransport=options.previousManifest?.identity?.transport||null;
  const lineageIntegrationIds=new Set([manifest.identity.integration_id,options.previousManifest?.identity?.integration_id].filter(Boolean));
  for(const tool of manifest.tools||[]){
    const id=toolId(tool),prevObs=latest.get(id)||null,prevTool=previousToolFromObservation(prevObs);
    let lifecycle='first_seen';
    if(prevObs?.lifecycle_state==='removed'||(!prevObs&&everSeenBefore(prior,id)))lifecycle='reintroduced';
    else if(prevObs)lifecycle='present';
    const drift=classifyCapabilityDrift(prevTool,tool,{previousTransport,currentTransport:manifest.identity.transport});
    if(lifecycle==='reintroduced'&&!drift.includes('capability_expansion'))drift.push('capability_expansion');
    observations.push(buildCapabilityObservation({manifest,tool,lifecycleState:lifecycle,driftCategories:drift,previousObservationId:prevObs?.observation_id||null,observedAt}));
  }
  for(const [id,prevObs] of latest){
    if(!lineageIntegrationIds.has(prevObs.integration_id))continue;
    if(current.has(id)||prevObs.lifecycle_state==='removed')continue;
    const prevTool=previousToolFromObservation(prevObs);if(!prevTool)continue;
    const drift=classifyCapabilityDrift(prevTool,null,{previousTransport,currentTransport:manifest.identity.transport});
    observations.push(buildCapabilityObservation({manifest,tool:prevTool,lifecycleState:'removed',driftCategories:drift,previousObservationId:prevObs.observation_id,observedAt,identityOverride:{integration_id:prevObs.integration_id,integration_name:prevObs.integration_name,transport:prevObs.snapshot.transport}}));
  }
  observations.sort((a,b)=>a.capability_id.localeCompare(b.capability_id));
  return observations;
}

export function queryCapabilityHistory(history=[],query={}){
  if(query.lifecycleState&&!['first_seen','present','removed','reintroduced'].includes(query.lifecycleState))throw new Error('lifecycleState is invalid');
  if(query.driftCategory&&!DRIFT_ORDER.includes(query.driftCategory))throw new Error('driftCategory is invalid');
  let out=[...history];
  if(query.integrationId)out=out.filter(o=>o.integration_id===query.integrationId);
  if(query.capabilityId)out=out.filter(o=>o.capability_id===query.capabilityId);
  if(query.lifecycleState)out=out.filter(o=>o.lifecycle_state===query.lifecycleState);
  if(query.driftCategory)out=out.filter(o=>o.drift_categories.includes(query.driftCategory));
  if(query.since){const t=Date.parse(query.since);if(!Number.isFinite(t))throw new Error('since must be a valid date-time');out=out.filter(o=>Date.parse(o.observed_at)>=t);}
  if(query.until){const t=Date.parse(query.until);if(!Number.isFinite(t))throw new Error('until must be a valid date-time');out=out.filter(o=>Date.parse(o.observed_at)<=t);}
  return out.sort((a,b)=>a.observed_at.localeCompare(b.observed_at)||a.observation_id.localeCompare(b.observation_id)).map(clone);
}

function validateObservationChain(observations){
  const latest=new Map();
  for(let i=0;i<observations.length;i++){
    const o=observations[i],prior=latest.get(o.capability_id)||null;
    if(!prior){
      if(o.lifecycle_state!=='first_seen')throw new Error(`capability history line ${i+1} must start with first_seen`);
      if(o.previous_observation_id!==null)throw new Error(`capability history line ${i+1} first_seen must not have previous_observation_id`);
    }else{
      if(o.previous_observation_id!==prior.observation_id)throw new Error(`capability history line ${i+1} previous_observation_id does not match latest capability observation`);
      if(Date.parse(o.observed_at)<=Date.parse(prior.observed_at))throw new Error(`capability history line ${i+1} is not later than prior capability observation`);
      if(prior.lifecycle_state==='removed'&&o.lifecycle_state!=='reintroduced')throw new Error(`capability history line ${i+1} after removed must be reintroduced`);
      if(prior.lifecycle_state!=='removed'&&!['present','removed'].includes(o.lifecycle_state))throw new Error(`capability history line ${i+1} lifecycle transition is invalid`);
    }
    latest.set(o.capability_id,o);
  }
}

export class FileCapabilityHistoryStore {
  constructor(filePath,limits={}){this.filePath=filePath;this.limits={...CAPABILITY_HISTORY_LIMITS,...limits};}
  _loadUnlocked(){
    if(!existsSync(this.filePath))return[];
    const text=readBoundedFileSync(this.filePath,{maxBytes:this.limits.maxBytes,label:'capability history'});if(!text.trim())return[];
    const lines=text.split(/\r?\n/).filter(Boolean);if(lines.length>this.limits.maxObservations)throw new Error(`capability history exceeds maxObservations (${this.limits.maxObservations})`);
    const out=[];const ids=new Set();
    for(let i=0;i<lines.length;i++){
      if(Buffer.byteLength(lines[i],'utf8')>this.limits.maxLineBytes)throw new Error(`capability history line ${i+1} exceeds maxLineBytes (${this.limits.maxLineBytes})`);
      let value;try{value=JSON.parse(lines[i]);}catch{throw new Error(`corrupt capability history JSON at line ${i+1}`);}
      const v=validateCapabilityObservation(value);if(!v.valid)throw new Error(`invalid capability history observation at line ${i+1}: ${v.errors.join('; ')}`);
      if(!verifyCapabilityObservationDigest(value))throw new Error(`capability history observation digest mismatch at line ${i+1}`);
      if(!isPublicationSafeCapabilityObservation(value))throw new Error(`capability history observation at line ${i+1} is not publication-safe normalized metadata`);
      if(ids.has(value.observation_id))throw new Error(`duplicate capability observation_id in history at line ${i+1}`);ids.add(value.observation_id);out.push(value);
    }
    validateObservationChain(out);return out;
  }
  load(){if(!existsSync(this.filePath))return[];return withFileLock(this.filePath,()=>this._loadUnlocked());}
  append(observations=[]){mkdirSync(dirname(this.filePath),{recursive:true,mode:0o700});return withFileLock(this.filePath,()=>{
    const existing=this._loadUnlocked();const ids=new Set(existing.map(o=>o.observation_id));const pending=[];const latestTime=new Map();
    for(const o of existing)latestTime.set(o.capability_id,Date.parse(o.observed_at));
    for(const o of observations){
      const v=validateCapabilityObservation(o);if(!v.valid)throw new Error(`invalid capability observation: ${v.errors.join('; ')}`);if(!verifyCapabilityObservationDigest(o))throw new Error('capability observation digest mismatch');if(!isPublicationSafeCapabilityObservation(o))throw new Error('capability observation is not publication-safe normalized metadata');if(ids.has(o.observation_id))continue;
      const t=Date.parse(o.observed_at),prior=latestTime.get(o.capability_id);if(prior!==undefined&&t<=prior)throw new Error(`capability observation for ${o.capability_id} is not later than existing history`);
      const line=JSON.stringify(o);if(Buffer.byteLength(line,'utf8')>this.limits.maxLineBytes)throw new Error(`capability observation exceeds maxLineBytes (${this.limits.maxLineBytes})`);
      ids.add(o.observation_id);latestTime.set(o.capability_id,t);pending.push(o);
    }
    if(existing.length+pending.length>this.limits.maxObservations)throw new Error(`capability history exceeds maxObservations (${this.limits.maxObservations})`);
    if(!pending.length)return{appended:0,duplicates:observations.length,total:existing.length};
    validateObservationChain([...existing,...pending]);
    const combined=[...existing,...pending];const text=combined.map(o=>JSON.stringify(o)).join('\n')+'\n';atomicWriteFileSync(this.filePath,text,{mode:0o600,maxBytes:this.limits.maxBytes,label:'capability history'});return{appended:pending.length,duplicates:observations.length-pending.length,total:combined.length};
  });}
  observe(manifest,options={}){const history=this.load();const observations=observeCapabilityManifest(history,manifest,options);const result=this.append(observations);return{...result,observations};}
  query(query={}){return queryCapabilityHistory(this.load(),query);}
}
