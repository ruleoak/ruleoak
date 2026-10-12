/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import { createHash } from 'node:crypto';
import { validateCapabilityManifest } from '@ruleoak/protocol';
import { diffCapabilityManifests } from './index.js';
import { sanitizePublicCapabilityIdentity, sanitizePublicCapabilityEvidence, validateCapabilityIntelligenceIntegrity } from './capability-intelligence.js';
import { isPublicationSafeCapabilityObservation, verifyCapabilityObservationDigest } from './capability-history.js';

const EVIDENCE_LABELS=Object.freeze({
  registry_metadata:'Registry metadata',declared_manifest:'Declared',runtime_discovery:'Inspected',local_package_evidence:'Inspected',
  inferred_classification:'Inferred',operator_annotation:'Operator annotation',historical_observation:'Historical'
});
function clone(v){return JSON.parse(JSON.stringify(v));}
function safeToken(value,max=128){if(value===null||value===undefined)return null;const v=String(value).normalize('NFKC').trim();return /^[A-Za-z0-9][A-Za-z0-9._:+/-]*$/.test(v)&&v.length<=max?v:null;}
function safeDigest(value){return /^sha256:[a-f0-9]{64}$/.test(String(value||''))?String(value):null;}
function safeClassificationBasis(value={}){const out={};if(!value||typeof value!=='object'||Array.isArray(value))return out;for(const key of ['state','consequence','secret_or_identity_related']){const v=value[key];if(typeof v!=='string')continue;const clean=String(v).normalize('NFKC').trim();if(clean&&clean.length<=256&&/^[A-Za-z0-9][A-Za-z0-9._:=+/-]*$/.test(clean))out[key]=clean;}return out;}
function sanitizePublicEvidenceForIndex(evidence={}){const e=sanitizePublicCapabilityEvidence(evidence),source=e.source||{};return{...e,source:{source_kind:safeToken(source.source_kind)||'unknown-source',source_digest:safeDigest(source.source_digest),declared_version:safeToken(source.declared_version),protocol_version:safeToken(source.protocol_version)},mutability:safeToken(e.mutability,256)||'unknown',classification_basis:safeClassificationBasis(e.classification_basis)};}
function safeSummary(summary={}){const out={};for(const key of ['total','read_only','state_changing','destructive','high_consequence','unknown','declared_classification']){const n=Number(summary?.[key]);if(Number.isInteger(n)&&n>=0)out[key]=n;}return out;}
function safeRemoteSource(value){
  if(typeof value!=='string')return null;
  try{const u=new URL(value);if(!['http:','https:'].includes(u.protocol))return null;u.username='';u.password='';u.search='';u.hash='';return u.toString();}
  catch{return null;}
}
export function capabilityIndexSlug(value='integration'){
  const slug=String(value).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80);
  return slug||'integration';
}
export function stablePublicIntegrationSlug(manifest={}){
  const id=String(manifest?.identity?.integration_id||'');
  if(/^sha256:[a-f0-9]{64}$/.test(id))return `sha256-${id.slice(7)}`;
  return `legacy-${capabilityIndexSlug(manifest?.identity?.name||'integration')}-${String(manifest?.fingerprint||'').replace(/^sha256:/,'').slice(0,16)||'unknown'}`;
}
export function evidenceSourceLabels(evidence={}){
  const labels=[];
  for(const cls of evidence?.evidence_classes||[]){const label=EVIDENCE_LABELS[cls];if(label&&!labels.includes(label))labels.push(label);}
  return labels;
}
export function capabilityInspectionStatus(manifest={}){
  const classes=new Set((manifest.tools||[]).flatMap(t=>t?.evidence?.evidence_classes||[]));
  if(classes.has('runtime_discovery')||classes.has('local_package_evidence'))return'inspected';
  if(classes.has('declared_manifest'))return'declared_only';
  if(classes.has('registry_metadata'))return'registry_only';
  return'uninspected';
}
export function sanitizePublicCapabilityManifest(manifest={}){
  const identity=manifest.identity||{},provenance=manifest.provenance||{};
  const out={
    manifest_version:manifest.manifest_version,
    identity:{
      name:String(identity.name||'unknown-integration').slice(0,256),version:identity.version===null||identity.version===undefined?null:String(identity.version).slice(0,128),
      source:safeRemoteSource(identity.source),transport:identity.transport||null,protocol_version:identity.protocol_version||null,remote:Boolean(identity.remote),
      integration_id:identity.integration_id||null,identity_basis:identity.identity_basis||null
    },
    provenance:{source_kind:provenance.source_kind||null,mutability:provenance.mutability||null,source_digest:provenance.source_digest||null,declared_version:provenance.declared_version||null,protocol_version:provenance.protocol_version||null},
    tools:(manifest.tools||[]).map(t=>({
      name:String(t.name||'unknown').slice(0,256),capability_id:t.capability_id||t.capability_identity?.capability_id||null,
      capability_identity:t.capability_identity?sanitizePublicCapabilityIdentity(t.capability_identity):null,
      evidence:t.evidence?sanitizePublicEvidenceForIndex(t.evidence):null,
      evidence_labels:t.evidence?evidenceSourceLabels(t.evidence):[],state:t.state,consequence:t.consequence,
      secret_or_identity_related:Boolean(t.secret_or_identity_related),schema_digest:safeDigest(t.schema_digest),classification_basis:safeClassificationBasis(t.classification_basis||{})
    })).sort((a,b)=>String(a.capability_id||a.name).localeCompare(String(b.capability_id||b.name))),
    summary:safeSummary(manifest.summary||{}),trust_notes:[],fingerprint:safeDigest(manifest.fingerprint)
  };
  out.inspection_status=capabilityInspectionStatus(out);
  return out;
}
function sanitizePublicObservation(observation={}){
  if(!verifyCapabilityObservationDigest(observation))throw new Error('public capability history observation digest mismatch');
  if(!isPublicationSafeCapabilityObservation(observation))throw new Error('public capability history observation is not publication-safe');
  const o=clone(observation),e=o.snapshot?.evidence;
  return{observation_version:o.observation_version,observation_id:o.observation_id,integration_id:o.integration_id,capability_id:o.capability_id,
    integration_name:String(o.integration_name||'unknown-integration').slice(0,256),action_name:String(o.action_name||'unknown').slice(0,256),observed_at:o.observed_at,
    lifecycle_state:o.lifecycle_state,drift_categories:[...(o.drift_categories||[])],previous_observation_id:o.previous_observation_id||null,
    snapshot:{state:o.snapshot.state,consequence:o.snapshot.consequence,secret_or_identity_related:Boolean(o.snapshot.secret_or_identity_related),schema_digest:o.snapshot.schema_digest||null,
      classification_basis:safeClassificationBasis(o.snapshot.classification_basis||{}),transport:safeToken(o.snapshot.transport,64)||'manifest',evidence:sanitizePublicEvidenceForIndex(e),evidence_labels:evidenceSourceLabels(e)}};
}
function canonicalBaseUrl(value){
  const raw=String(value||'https://ruleoak.com/inspector-index');let u;
  try{u=new URL(raw);}catch{throw new Error('public capability index baseUrl must be an absolute http(s) URL');}
  if(!['http:','https:'].includes(u.protocol)||u.username||u.password||u.search||u.hash)throw new Error('public capability index baseUrl must be a credential-free http(s) URL without query or fragment');
  return u.toString().replace(/\/$/,'');
}
function snapshotKey(snapshot){const fp=String(snapshot.manifest.fingerprint||'').replace(/^sha256:/,'')||'unknown';const version=capabilityIndexSlug(snapshot.manifest.identity.version||'unknown');return `version-${version}--${fp}`;}
function safeTimestamp(value,label='timestamp'){if(value===null||value===undefined||value==='')return null;const t=Date.parse(String(value));if(!Number.isFinite(t))throw new Error(`public capability index ${label} must be a valid ISO date-time or null`);return new Date(t).toISOString();}
function diffEventId(group,before,after){const payload=[group.integration_id||group.slug,before.manifest.fingerprint,after.manifest.fingerprint,after.observed_at||'undated'].join('\n');return `diff_${createHash('sha256').update(payload).digest('hex')}`;}
function observationTimeline(history=[]){return[...history].sort((a,b)=>String(a.observed_at).localeCompare(String(b.observed_at))||a.observation_id.localeCompare(b.observation_id));}
function eventFromObservation(o){return{event_id:o.observation_id,kind:'capability_observation',integration_id:o.integration_id,capability_id:o.capability_id,name:o.integration_name,action_name:o.action_name,observed_at:o.observed_at,lifecycle_state:o.lifecycle_state,drift_categories:[...o.drift_categories],state:o.snapshot.state,consequence:o.snapshot.consequence,evidence_labels:[...o.snapshot.evidence_labels]};}


export function buildPublicCapabilityWatchContract({integrationId,integrationName,canonicalPath,latestFingerprint,inspectionStatus}){
  if(integrationId!==null&&!/^sha256:[a-f0-9]{64}$/.test(String(integrationId)))throw new Error('public watch contract integrationId must be a sha256 identity or null');
  if(latestFingerprint!==null&&!/^sha256:[a-f0-9]{64}$/.test(String(latestFingerprint)))throw new Error('public watch contract latestFingerprint must be a sha256 fingerprint or null');
  const path=String(canonicalPath||'');if(!/^integrations\/[a-z0-9-]+\/$/.test(path))throw new Error('public watch contract canonicalPath is invalid');
  if(!['inspected','declared_only','registry_only','uninspected'].includes(inspectionStatus))throw new Error('public watch contract inspectionStatus is invalid');
  return{watch_contract_version:'1.0',action:'watch_integration',integration_id:integrationId,integration_name:String(integrationName||'unknown-integration').slice(0,256),canonical_path:path,latest_fingerprint:latestFingerprint,inspection_status:inspectionStatus};
}

export function buildPublicCapabilityIndex(entries=[],options={}){
  const groups=new Map();
  for(const entry of entries){
    const original=entry?.manifest||entry;if(!original?.fingerprint)throw new Error('public capability index entry requires a capability manifest fingerprint');
    const validation=validateCapabilityManifest(original);if(!validation.valid)throw new Error(`public capability index entry is not a valid capability manifest: ${validation.errors.join('; ')}`);const integrity=validateCapabilityIntelligenceIntegrity(original);if(!integrity.ok)throw new Error(`public capability index entry failed capability integrity: ${integrity.errors.join('; ')}`);
    const manifest=sanitizePublicCapabilityManifest(original),key=manifest.identity.integration_id||`legacy:${manifest.identity.name}`;
    const snapshot={observed_at:safeTimestamp(entry?.observed_at??manifest.tools?.[0]?.evidence?.observed_at??null,'observed_at'),manifest};
    if(!groups.has(key))groups.set(key,{integration_id:manifest.identity.integration_id||null,slug:stablePublicIntegrationSlug(manifest),name:manifest.identity.name,snapshots:[],history:[]});
    groups.get(key).snapshots.push(snapshot);
  }
  for(const raw of options.historyObservations||[]){
    const o=sanitizePublicObservation(raw),key=o.integration_id;if(!groups.has(key))groups.set(key,{integration_id:key,slug:`sha256-${key.slice(7)}`,name:o.integration_name,snapshots:[],history:[]});
    if(!groups.get(key).history.some(existing=>existing.observation_id===o.observation_id))groups.get(key).history.push(o);
  }
  const integrations=[],drift=[];
  for(const group of [...groups.values()].sort((a,b)=>a.slug.localeCompare(b.slug))){
    group.snapshots.sort((a,b)=>String(a.observed_at||'').localeCompare(String(b.observed_at||''))||String(a.manifest.identity.version||'').localeCompare(String(b.manifest.identity.version||''))||String(a.manifest.fingerprint).localeCompare(String(b.manifest.fingerprint)));
    group.history=observationTimeline(group.history);
    const events=[];
    for(let i=1;i<group.snapshots.length;i++){
      const before=group.snapshots[i-1],after=group.snapshots[i],diff=diffCapabilityManifests(before.manifest,after.manifest);
      if(diff.capability_surface_changed??diff.changed){const e={event_id:diffEventId(group,before,after),kind:'manifest_diff',integration_id:group.integration_id,slug:group.slug,name:group.name,from_fingerprint:before.manifest.fingerprint,to_fingerprint:after.manifest.fingerprint,observed_at:after.observed_at||null,added:diff.added.map(t=>t.name),removed:diff.removed.map(t=>t.name),modified:diff.modified.map(x=>x.name),authority_surface_broadened:diff.authority_surface_broadened.map(t=>t.name)};events.push(e);drift.push(e);}
    }
    const observationEvents=group.history.filter(o=>o.drift_categories.length||['removed','reintroduced'].includes(o.lifecycle_state)).map(eventFromObservation);
    const latest=group.snapshots.at(-1)?.manifest||null;if(latest?.identity?.name)group.name=latest.identity.name;
    const latestByVersionKey=new Map();
    for(const snapshot of group.snapshots)latestByVersionKey.set(snapshotKey(snapshot),snapshot);
    const versions=[...latestByVersionKey.entries()].map(([key,snapshot])=>({key,observed_at:snapshot.observed_at,version:snapshot.manifest.identity.version||null,fingerprint:snapshot.manifest.fingerprint,inspection_status:snapshot.manifest.inspection_status,evidence_labels:[...new Set(snapshot.manifest.tools.flatMap(t=>t.evidence_labels||[]))],manifest:snapshot.manifest}));
    const canonical_path=`integrations/${group.slug}/`;
    const watch=buildPublicCapabilityWatchContract({integrationId:group.integration_id,integrationName:group.name,canonicalPath:canonical_path,latestFingerprint:latest?.fingerprint||null,inspectionStatus:latest?.inspection_status||'uninspected'});
    integrations.push({slug:group.slug,integration_id:group.integration_id,name:group.name,canonical_path,inspection_status:latest?.inspection_status||'uninspected',latest,snapshots:group.snapshots,versions,history:group.history,drift_events:events,history_events:observationEvents,watch});
  }
  const baseUrl=canonicalBaseUrl(options.baseUrl);
  return{index_version:'2.0',generated_at:safeTimestamp(options.generatedAt??null,'generated_at'),base_url:baseUrl,integrations,drift_events:drift};
}
