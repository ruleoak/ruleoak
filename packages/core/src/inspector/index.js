/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import { createHash } from 'node:crypto';
import { validateCapabilityManifest } from '@ruleoak/protocol';
import { canonicalStringify } from '../decision/receipt.js';
import { buildCapabilityIdentity, buildCapabilityEvidence, capabilitySurfaceFingerprint } from './capability-intelligence.js';

const READ_WORDS = /(^|[._-])(read|get|list|search|query|inspect|describe|fetch|view)([._-]|$)/i;
const WRITE_WORDS = /(^|[._-])(write|create|update|set|send|post|put|patch|commit|push|publish|upload)([._-]|$)/i;
const HIGH_WORDS = /(^|[._-])(delete|remove|destroy|drop|merge|deploy|release|execute|run|shell|sudo|secret|credential|permission|workflow)([._-]|$)/i;
const DESTRUCTIVE_WORDS = /(^|[._-])(delete|remove|destroy|drop|wipe|purge)([._-]|$)/i;
function object(v){return v&&typeof v==='object'&&!Array.isArray(v)?v:{}}
function stableDigest(v){return `sha256:${createHash('sha256').update(canonicalStringify(v)).digest('hex')}`}
function normalizeSchema(schema){return schema&&typeof schema==='object'?JSON.parse(JSON.stringify(schema)):{};}
function provenanceFor(input,options){
  const remote=Boolean(options.remote||input.remote);
  const transport=options.transport||input.transport||'manifest';
  const sourceKind=options.sourceKind||input.source_kind||(remote?'remote-service':transport==='stdio'?'local-process':'local-manifest');
  const mutability=options.mutability||input.mutability||(remote?'remote-can-change-without-local-update':sourceKind==='local-manifest'?'local-file-controlled-by-user':'local-process-version-dependent');
  return {source_kind:sourceKind,mutability,source_digest:options.sourceDigest||input.source_digest||null,declared_version:options.version||input.version||null,protocol_version:options.protocolVersion||input.protocol_version||null};
}
export function classifyToolCapability(tool={}){
  const name=String(tool.name||tool.id||'unknown');const annotations=object(tool.annotations);const description=typeof tool.description==='string'?tool.description:'';let state='unknown',stateBasis='unknown',consequence='unknown',consequenceBasis='unknown';
  if(annotations.readOnlyHint===true){state='read_only';stateBasis='declared:readOnlyHint=true';}
  else if(annotations.readOnlyHint===false){state='state_changing';stateBasis='declared:readOnlyHint=false';}
  else if(READ_WORDS.test(name)){state='read_only';stateBasis='inferred:tool-name';}
  if(state==='unknown'&&(WRITE_WORDS.test(name)||HIGH_WORDS.test(name))){state='state_changing';stateBasis='inferred:tool-name';}
  const secret=/secret|credential|token|password|permission|oauth|private[_ -]?key/i.test(`${name} ${description}`)||Boolean(JSON.stringify(tool.inputSchema||tool.input_schema||{}).match(/secret|credential|token|password|private[_ -]?key/i));
  if(annotations.destructiveHint===true){consequence='destructive';consequenceBasis='declared:destructiveHint=true';}
  else if(DESTRUCTIVE_WORDS.test(name)){consequence='destructive';consequenceBasis='inferred:tool-name';}
  else if(secret){consequence='high_consequence';consequenceBasis='inferred:secret-or-identity-access';}
  else if(HIGH_WORDS.test(name)||state==='state_changing'){consequence='high_consequence';consequenceBasis='inferred:state-or-name';}
  else if(state==='read_only'){consequence='read_only';consequenceBasis='derived:read-only';}
  return {state,consequence,secret_or_identity_related:Boolean(secret),classification_basis:{state:stateBasis,consequence:consequenceBasis,secret_or_identity_related:secret?'inferred:name-description-or-schema':'not-observed'}};
}
export function buildCapabilityManifest(input={},options={}){
  const tools=Array.isArray(input.tools)?input.tools:Array.isArray(input.result?.tools)?input.result.tools:[];
  const provenance=provenanceFor(input,options);
  const identityBase={name:options.name||input.name||'unknown-integration',version:options.version||input.version||null,source:options.source||input.source||null,transport:options.transport||input.transport||'manifest',protocol_version:options.protocolVersion||input.protocol_version||null,remote:Boolean(options.remote||input.remote)};
  const integrationIdentity=buildCapabilityIdentity({name:identityBase.name,source:identityBase.source,transport:identityBase.transport,action_name:'__integration__',package_id:options.packageId||input.package_id},{identityKey:options.identityKey});
  const identity={...identityBase,integration_id:integrationIdentity.integration_id,identity_basis:integrationIdentity.identity_basis};
  const observedAt=options.observedAt??input.observed_at??new Date().toISOString();
  const normalized=tools.map(tool=>{
    const c=classifyToolCapability(tool);const schema=normalizeSchema(tool.inputSchema||tool.input_schema);const name=String(tool.name||tool.id||'unknown');
    const capabilityIdentity=buildCapabilityIdentity({name:identity.name,source:identity.source,transport:identity.transport,action_name:name,package_id:options.packageId||input.package_id},{identityKey:options.identityKey});
    const evidence=buildCapabilityEvidence({classification_basis:c.classification_basis,provenance},{observedAt,evidenceClass:options.evidenceClass,operatorAnnotation:options.operatorAnnotation===true,historical:options.historical===true});
    const description=typeof tool.description==='string'?tool.description:'';const annotations=object(tool.annotations);
    return{name,description,description_digest:stableDigest(description),state:c.state,consequence:c.consequence,secret_or_identity_related:c.secret_or_identity_related,schema_digest:stableDigest(schema),annotations,annotations_digest:stableDigest(annotations),classification_basis:c.classification_basis,capability_id:capabilityIdentity.capability_id,capability_identity:capabilityIdentity,evidence};
  }).sort((a,b)=>a.name.localeCompare(b.name));
  const summary={total:normalized.length,read_only:normalized.filter(t=>t.state==='read_only').length,state_changing:normalized.filter(t=>t.state==='state_changing').length,destructive:normalized.filter(t=>t.consequence==='destructive').length,high_consequence:normalized.filter(t=>['destructive','high_consequence'].includes(t.consequence)).length,unknown:normalized.filter(t=>t.state==='unknown').length,declared_classification:normalized.filter(t=>String(t.classification_basis?.state).startsWith('declared:')||String(t.classification_basis?.consequence).startsWith('declared:')).length};
  const trust_notes=[];if(identity.remote)trust_notes.push('Remote capability behavior can change without a local RuleOak or package update.');if(summary.unknown)trust_notes.push(`${summary.unknown} tool(s) could not be classified deterministically.`);if(summary.declared_classification<summary.total)trust_notes.push('Some classifications are inferred from tool names or schemas rather than declared annotations.');if(identity.identity_basis==='name-transport')trust_notes.push('Stable integration identity uses the integration name and transport because no explicit identity key, package identifier, or safe remote source anchor was available.');
  const manifest={manifest_version:'1.2',identity,provenance,tools:normalized,summary,trust_notes,fingerprint:null};manifest.fingerprint=capabilitySurfaceFingerprint(manifest);
  const validation=validateCapabilityManifest(manifest);if(!validation.valid)throw new Error(`invalid capability manifest: ${validation.errors.join('; ')}`);return manifest;
}
function toolKey(tool){return tool?.capability_id||tool?.capability_identity?.capability_id||tool?.name;}
export function diffCapabilityManifests(previous,current){
  const p=new Map((previous?.tools||[]).map(t=>[toolKey(t),t]));const c=new Map((current?.tools||[]).map(t=>[toolKey(t),t]));const added=[],removed=[],changed=[];
  for(const [key,tool] of c){if(!p.has(key))added.push(tool);else{const old=p.get(key);const fields=[];for(const f of ['name','state','consequence','secret_or_identity_related','schema_digest','description_digest','annotations_digest'])if(old[f]!==tool[f])fields.push(f);if(canonicalStringify(old.classification_basis||{})!==canonicalStringify(tool.classification_basis||{}))fields.push('classification_basis');if(fields.length)changed.push({name:tool.name,capability_id:tool.capability_id||null,fields,before:old,after:tool});}}
  for(const [key,tool] of p)if(!c.has(key))removed.push(tool);
  const identityChanges=[];for(const f of ['version','source','transport','protocol_version','remote','integration_id','identity_basis'])if((previous?.identity||{})[f]!== (current?.identity||{})[f])identityChanges.push(f);
  const provenanceChanges=[];for(const f of ['source_kind','mutability','source_digest','declared_version','protocol_version'])if((previous?.provenance||{})[f]!== (current?.provenance||{})[f])provenanceChanges.push(f);
  const broadened=[...added.filter(t=>t.state==='state_changing'||['destructive','high_consequence'].includes(t.consequence)),...changed.filter(x=>(x.after.state==='state_changing'&&x.before.state!=='state_changing')||(['destructive','high_consequence'].includes(x.after.consequence)&&!['destructive','high_consequence'].includes(x.before.consequence))).map(x=>x.after)];
  const consequentialSchemaChanges=changed.filter(x=>x.fields.includes('schema_digest')&&(x.after.state==='state_changing'||['destructive','high_consequence'].includes(x.after.consequence))).map(x=>x.after);
  const semanticDefinitionChanges=changed.filter(x=>x.fields.includes('description_digest')||x.fields.includes('annotations_digest')).map(x=>x.after);
  const newlyConsequential=[...new Map([...broadened,...consequentialSchemaChanges].map(t=>[toolKey(t),t])).values()].sort((a,b)=>a.name.localeCompare(b.name));
  const surfaceIdentityChanges=identityChanges.filter(f=>['integration_id','transport','protocol_version','remote'].includes(f));
  const capabilitySurfaceChanged=Boolean(added.length||removed.length||changed.length||surfaceIdentityChanges.length);
  const metadataChanged=Boolean(identityChanges.filter(f=>!surfaceIdentityChanges.includes(f)).length||provenanceChanges.length);
  const policyReviewReasons=[];if(newlyConsequential.length)policyReviewReasons.push('new or materially changed consequential capabilities require explicit policy review');if(semanticDefinitionChanges.length)policyReviewReasons.push('tool description or annotation semantics changed and require explicit review');if(surfaceIdentityChanges.length)policyReviewReasons.push(`integration execution identity changed: ${surfaceIdentityChanges.join(', ')}`);
  const requiresPolicyReview=policyReviewReasons.length>0;
  return {changed:capabilitySurfaceChanged||metadataChanged,capability_surface_changed:capabilitySurfaceChanged,metadata_changed:metadataChanged,added,removed,modified:changed,identity_changes:identityChanges,provenance_changes:provenanceChanges,authority_surface_broadened:broadened,newly_consequential:newlyConsequential,semantic_definition_changes:semanticDefinitionChanges,requires_policy_review:requiresPolicyReview,approval_baseline_invalidated:requiresPolicyReview,policy_review_reasons:policyReviewReasons,recommended_policy_updates:recommendCapabilityPolicy({tools:[...new Map([...newlyConsequential,...semanticDefinitionChanges].map(t=>[toolKey(t),t])).values()]})};
}
export function recommendCapabilityPolicy(manifest){return(manifest?.tools||[]).map(tool=>({tool:tool.name,effect:tool.consequence==='destructive'||tool.secret_or_identity_related===true?'deny':tool.state==='read_only'?'allow':'needs_approval',reason:tool.consequence==='destructive'?'destructive capability':tool.secret_or_identity_related===true?'secret or identity-related capability':tool.state==='read_only'?'read-only capability':'state-changing or uncertain capability'}));}
