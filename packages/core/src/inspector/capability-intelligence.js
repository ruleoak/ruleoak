/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import { createHash } from 'node:crypto';
import { validateCapabilityIdentity, validateCapabilityEvidence, validateCapabilityManifest } from '@ruleoak/protocol';
import { canonicalStringify } from '../decision/receipt.js';

const SAFE_TRANSPORT=/^[a-z0-9][a-z0-9._-]{0,63}$/i;
const EVIDENCE_CLASSES=new Set(['registry_metadata','declared_manifest','runtime_discovery','local_package_evidence','inferred_classification','operator_annotation','historical_observation']);

function digest(value){return `sha256:${createHash('sha256').update(canonicalStringify(value)).digest('hex')}`;}
function cleanText(value,fallback='unknown'){const out=String(value??'').normalize('NFKC').trim();return out||fallback;}
function cleanTransport(value){const out=cleanText(value,'manifest').toLowerCase();return SAFE_TRANSPORT.test(out)?out:'custom';}
function safeUrlAnchor(value){
  if(typeof value!=='string'||!value.trim())return null;
  try{const u=new URL(value);if(!['http:','https:'].includes(u.protocol))return null;u.username='';u.password='';u.search='';u.hash='';return `${u.protocol}//${u.host}${u.pathname.replace(/\/+$/,'')||'/'}`;}
  catch{return null;}
}
function identityAnchor(input={},options={}){
  const explicit=options.identityKey??input.identity_key??input.integration_id_key;
  if(explicit!==undefined&&explicit!==null&&String(explicit).trim())return{basis:'explicit',anchor:cleanText(explicit)};
  const packageId=options.packageId??input.package_id??input.package?.identifier;
  if(packageId!==undefined&&packageId!==null&&String(packageId).trim())return{basis:'package-identifier',anchor:cleanText(packageId)};
  const url=safeUrlAnchor(options.source??input.source);
  if(url)return{basis:'source-anchor',anchor:url};
  return{basis:'name-transport',anchor:null};
}

export function buildCapabilityIdentity(input={},options={}){
  const integrationName=cleanText(options.integrationName??input.integration_name??input.name,'unknown-integration');
  const actionName=cleanText(options.actionName??input.action_name??input.action??input.tool_name??input.tool?.name,'unknown');
  const transport=cleanTransport(options.transport??input.transport??'manifest');
  const chosen=identityAnchor(input,options);
  const integrationKey=chosen.anchor?{anchor:chosen.anchor,transport}:{name:integrationName.toLowerCase(),transport};
  const integrationId=digest({kind:'ruleoak-capability-integration',key:integrationKey});
  const identity={
    identity_version:'1.0',
    integration_id:integrationId,
    capability_id:digest({kind:'ruleoak-capability',integration_id:integrationId,action_name:actionName.normalize('NFKC')}),
    integration_name:integrationName,
    action_name:actionName,
    transport,
    identity_basis:chosen.basis
  };
  const validation=validateCapabilityIdentity(identity);if(!validation.valid)throw new Error(`invalid capability identity: ${validation.errors.join('; ')}`);
  return identity;
}

function sourceEvidenceClass(sourceKind){
  const kind=String(sourceKind||'').toLowerCase();
  if(kind.includes('registry'))return'registry_metadata';
  if(kind==='local-manifest'||kind.includes('declared'))return'declared_manifest';
  if(kind.includes('package'))return'local_package_evidence';
  return'runtime_discovery';
}
function containsInference(basis={}){return Object.values(basis||{}).some(v=>/^(inferred|derived):/i.test(String(v||'')));}
function uniqueEvidenceClasses(values){return [...new Set(values.filter(v=>EVIDENCE_CLASSES.has(v)))];}

export function buildCapabilityEvidence(input={},options={}){
  const provenance=options.provenance||input.provenance||{};
  const basis=options.classificationBasis||input.classification_basis||{};
  const sourceKind=cleanText(options.sourceKind??provenance.source_kind??input.source_kind,'unknown-source');
  const classes=[options.evidenceClass||input.evidence_class||sourceEvidenceClass(sourceKind)];
  if(containsInference(basis))classes.push('inferred_classification');
  if(options.operatorAnnotation===true||input.operator_annotation===true)classes.push('operator_annotation');
  if(options.historical===true||input.historical===true)classes.push('historical_observation');
  const evidenceClasses=uniqueEvidenceClasses(classes);
  const observedRaw=options.observedAt??input.observed_at??null;
  const observedAt=observedRaw===null?null:new Date(observedRaw).toISOString();
  const source={
    source_kind:sourceKind,
    source_digest:options.sourceDigest??provenance.source_digest??input.source_digest??null,
    declared_version:options.declaredVersion??provenance.declared_version??input.declared_version??null,
    protocol_version:options.protocolVersion??provenance.protocol_version??input.protocol_version??null
  };
  const unsigned={
    evidence_version:'1.0',
    evidence_classes:evidenceClasses,
    observed_at:observedAt,
    source,
    mutability:cleanText(options.mutability??provenance.mutability??input.mutability,'unknown'),
    classification_basis:JSON.parse(JSON.stringify(basis||{}))
  };
  const evidence={...unsigned,evidence_id:digest(unsigned)};
  const validation=validateCapabilityEvidence(evidence);if(!validation.valid)throw new Error(`invalid capability evidence: ${validation.errors.join('; ')}`);
  return evidence;
}


export function capabilityEvidenceDigestPayload(evidence={}){
  const {evidence_id:_ignored,...payload}=JSON.parse(JSON.stringify(evidence||{}));
  return payload;
}
export function verifyCapabilityEvidenceDigest(evidence={}){
  return typeof evidence?.evidence_id==='string'&&evidence.evidence_id===digest(capabilityEvidenceDigestPayload(evidence));
}
export function verifyCapabilityIdentityCapabilityDigest(identity={}){
  if(typeof identity?.integration_id!=='string'||typeof identity?.action_name!=='string'||typeof identity?.capability_id!=='string')return false;
  return identity.capability_id===digest({kind:'ruleoak-capability',integration_id:identity.integration_id,action_name:String(identity.action_name).normalize('NFKC')});
}
export function validateCapabilityIntelligenceIntegrity(manifest={}){
  const errors=[];
  const validation=validateCapabilityManifest(manifest);if(!validation.valid)errors.push(...validation.errors);
  if(manifest?.manifest_version==='1.2'){
    const expectedFingerprint=capabilitySurfaceFingerprint(manifest);if(manifest.fingerprint!==expectedFingerprint)errors.push('capability manifest fingerprint mismatch');
    for(const [index,tool] of (manifest.tools||[]).entries()){
      if(!verifyCapabilityIdentityCapabilityDigest(tool.capability_identity||{}))errors.push(`tools[${index}].capability_identity capability_id digest mismatch`);
      if(!verifyCapabilityEvidenceDigest(tool.evidence||{}))errors.push(`tools[${index}].evidence evidence_id digest mismatch`);
    }
  }
  const valid=errors.length===0;return {ok:valid,valid,isValid:valid,errorMessage:errors.join('; '),errors};
}

export function sanitizePublicCapabilityIdentity(identity={}){
  return {identity_version:identity.identity_version||'1.0',integration_id:identity.integration_id||null,capability_id:identity.capability_id||null,integration_name:identity.integration_name||'unknown-integration',action_name:identity.action_name||'unknown',transport:identity.transport||'manifest',identity_basis:identity.identity_basis||'name-transport'};
}
export function sanitizePublicCapabilityEvidence(evidence={}){
  const source=evidence.source||{};
  return {evidence_version:evidence.evidence_version||'1.0',evidence_id:evidence.evidence_id||null,evidence_classes:Array.isArray(evidence.evidence_classes)?[...evidence.evidence_classes]:[],observed_at:evidence.observed_at||null,source:{source_kind:source.source_kind||'unknown-source',source_digest:source.source_digest||null,declared_version:source.declared_version||null,protocol_version:source.protocol_version||null},mutability:evidence.mutability||'unknown',classification_basis:JSON.parse(JSON.stringify(evidence.classification_basis||{}))};
}

export function capabilitySurfaceFingerprintPayload(manifest={}){
  const identity=manifest.identity||{};
  return {
    manifest_semantics:'capability-surface-v1',
    integration_id:identity.integration_id||null,
    transport:identity.transport||null,
    protocol_version:identity.protocol_version||null,
    tools:(manifest.tools||[]).map(t=>({capability_id:t.capability_id||t.capability_identity?.capability_id||null,name:t.name,state:t.state,consequence:t.consequence,secret_or_identity_related:Boolean(t.secret_or_identity_related),schema_digest:t.schema_digest||null,classification_basis:t.classification_basis||{}})).sort((a,b)=>String(a.capability_id||a.name).localeCompare(String(b.capability_id||b.name)))
  };
}
export function capabilitySurfaceFingerprint(manifest={}){return digest(capabilitySurfaceFingerprintPayload(manifest));}

export function migrateCapabilityManifestToV12(manifest={},options={}){
  if(manifest?.manifest_version==='1.2'){const cloned=JSON.parse(JSON.stringify(manifest));const validation=validateCapabilityManifest(cloned);if(!validation.valid)throw new Error(`invalid Capability Manifest v1.2: ${validation.errors.join('; ')}`);const integrity=validateCapabilityIntelligenceIntegrity(cloned);if(!integrity.ok)throw new Error(`Capability Manifest v1.2 integrity failed: ${integrity.errors.join('; ')}`);return cloned;}
  const identity=manifest.identity||{};const provenance=manifest.provenance||{};
  const integrationOptions={integrationName:identity.name||'unknown-integration',transport:identity.transport||'manifest',source:identity.source||null,identityKey:options.identityKey};
  const observedAt=options.observedAt??manifest.observed_at??null;
  const tools=(manifest.tools||[]).map(tool=>{
    const capabilityIdentity=buildCapabilityIdentity({name:identity.name,transport:identity.transport,source:identity.source,action_name:tool.name},integrationOptions);
    const evidence=buildCapabilityEvidence({classification_basis:tool.classification_basis||{},provenance},{observedAt});
    return {...JSON.parse(JSON.stringify(tool)),capability_id:capabilityIdentity.capability_id,capability_identity:capabilityIdentity,evidence};
  }).sort((a,b)=>String(a.name).localeCompare(String(b.name)));
  const integrationIdentity=buildCapabilityIdentity({name:identity.name,transport:identity.transport,source:identity.source,action_name:'__integration__'},integrationOptions);
  const next={...JSON.parse(JSON.stringify(manifest)),manifest_version:'1.2',identity:{...identity,integration_id:integrationIdentity.integration_id,identity_basis:integrationIdentity.identity_basis},tools};
  next.fingerprint=capabilitySurfaceFingerprint(next);
  const validation=validateCapabilityManifest(next);if(!validation.valid)throw new Error(`migrated Capability Manifest v1.2 is invalid: ${validation.errors.join('; ')}`);
  return next;
}
