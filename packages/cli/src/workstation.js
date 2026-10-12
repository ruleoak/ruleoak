/*
 * Copyright © 2026 RuleOak Pte. Ltd.
 * SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readBoundedFileSync } from './io/durable-file.js';
import { resolve } from 'node:path';
import { verifyEvidence, verifyAuthorityGraphDigest, verifyEvidenceGraphDigest } from '@ruleoak/core';
import { validateAuthorityGraph, validateEvidenceGraph, validateEvidenceBundleManifest } from '@ruleoak/protocol';

function canonicalStringify(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function sha256(value) {
  const buffer = Buffer.isBuffer(value) ? value : Buffer.from(String(value ?? ''), 'utf8');
  return `sha256:${createHash('sha256').update(buffer).digest('hex')}`;
}

function hmac(value, secret) {
  return `hmac-sha256:${createHmac('sha256', String(secret)).update(canonicalStringify(value)).digest('hex')}`;
}

function equalText(a, b) {
  const left = Buffer.from(String(a || ''), 'utf8');
  const right = Buffer.from(String(b || ''), 'utf8');
  return left.length === right.length && timingSafeEqual(left, right);
}

function parseJsonLines(buffer) {
  return String(buffer || '')
    .split(/\r?\n/)
    .filter(line => line.trim())
    .map(line => JSON.parse(line));
}

export function buildEvidenceCheckpoint(options = {}) {
  const evidence = Buffer.isBuffer(options.evidence) ? options.evidence : Buffer.from(String(options.evidence || ''), 'utf8');
  const policy = Buffer.isBuffer(options.policy) ? options.policy : Buffer.from(String(options.policy || ''), 'utf8');
  const events = evidence.length ? parseJsonLines(evidence) : [];
  const chain = verifyEvidence(events);
  const createdAt = options.createdAt || new Date().toISOString();
  const checkpoint = {
    checkpoint_version: '1.0',
    checkpoint_id: `chk_${randomUUID()}`,
    created_at: createdAt,
    issuer: options.issuer || 'ruleoak-cli',
    evidence: {
      path: options.evidencePath || '.ruleoak/evidence.jsonl',
      sha256: sha256(evidence),
      event_count: events.length,
      last_event_id: events.at(-1)?.event_id || null,
      last_hash: events.at(-1)?.hash || 'GENESIS',
      chain_ok: chain.ok,
      chain_errors: chain.errors
    },
    policy: {
      path: options.policyPath || '.ruleoak/policy.json',
      sha256: sha256(policy)
    }
  };
  if (options.secret) {
    checkpoint.signature = {
      algorithm: 'hmac-sha256',
      key_hint: options.keyHint || 'RULEOAK_CHECKPOINT_SECRET',
      value: hmac(checkpoint, options.secret)
    };
  }
  return checkpoint;
}

export function verifyEvidenceCheckpoint(checkpoint, options = {}) {
  const errors = [];
  const evidence = Buffer.isBuffer(options.evidence) ? options.evidence : Buffer.from(String(options.evidence || ''), 'utf8');
  const policy = Buffer.isBuffer(options.policy) ? options.policy : Buffer.from(String(options.policy || ''), 'utf8');
  let events = [];
  try { events = evidence.length ? parseJsonLines(evidence) : []; }
  catch (error) { errors.push(`evidence JSONL could not be parsed: ${error.message}`); }
  const chain = verifyEvidence(events);
  if (!chain.ok) errors.push(...chain.errors.map(error => `evidence chain: ${error}`));
  if (checkpoint?.evidence?.sha256 !== sha256(evidence)) errors.push('evidence file digest mismatch');
  if (checkpoint?.policy?.sha256 !== sha256(policy)) errors.push('policy file digest mismatch');
  if (checkpoint?.evidence?.event_count !== events.length) errors.push('evidence event count mismatch');
  if ((checkpoint?.evidence?.last_hash || 'GENESIS') !== (events.at(-1)?.hash || 'GENESIS')) errors.push('evidence last hash mismatch');
  if (checkpoint?.signature) {
    if (!options.secret) errors.push('checkpoint is signed but no verification secret was supplied');
    else {
      const { signature, ...unsigned } = checkpoint;
      const expected = hmac(unsigned, options.secret);
      if (!equalText(signature.value, expected)) errors.push('checkpoint signature mismatch');
    }
  } else if (options.requireSignature) errors.push('checkpoint is unsigned');
  return {
    ok: errors.length === 0,
    errors,
    signed: Boolean(checkpoint?.signature),
    checkpoint_id: checkpoint?.checkpoint_id || null,
    event_count: events.length,
    chain
  };
}

export function evidenceBundleSemanticPayload(metadata = {}) {
  const { bundle_id, signature, ...semantic } = metadata || {};
  return semantic;
}

export function buildEvidenceBundleMetadata(files, options = {}) {
  if (!options.profile) {
    const createdAt = options.createdAt || new Date().toISOString();
    const metadata = {
      bundle_version: '2.0',
      created_at: createdAt,
      source: 'ruleoak audit bundle',
      project_relative_root: '.',
      files: files.map(file => ({ path: file.name, size: Buffer.byteLength(file.data), sha256: sha256(file.data) })),
      checkpoint: options.checkpoint || null
    };
    if (options.secret) metadata.signature = { algorithm: 'hmac-sha256', key_hint: options.keyHint || 'RULEOAK_CHECKPOINT_SECRET', value: hmac(metadata, options.secret) };
    return metadata;
  }
  const sortedFiles = [...files].sort((a,b)=>a.name.localeCompare(b.name));
  const createdAtRaw = options.createdAt || options.source?.last_event_at || '1970-01-01T00:00:00.000Z';
  const createdAt = new Date(createdAtRaw).toISOString();
  const metadata = {
    bundle_version: '3.0',
    bundle_id: 'sha256:' + '0'.repeat(64),
    created_at: createdAt,
    privacy_profile: options.profile,
    source: options.source,
    graphs: options.graphs,
    adapters: [...(options.adapters || [])].sort((a,b)=>a.adapter_id.localeCompare(b.adapter_id)),
    files: sortedFiles.map(file => ({ path: file.name, size: Buffer.byteLength(file.data), sha256: sha256(file.data), role: file.role || 'other' })),
    verification: options.verification,
    privacy: options.privacy
  };
  metadata.bundle_id = sha256(canonicalStringify(evidenceBundleSemanticPayload(metadata)));
  const validation = validateEvidenceBundleManifest(metadata);
  if (!validation.valid) throw new Error(`invalid Evidence Bundle v3 manifest: ${validation.errors.join('; ')}`);
  if (options.secret) metadata.signature = { algorithm:'hmac-sha256', key_hint:options.keyHint||'RULEOAK_CHECKPOINT_SECRET', value:hmac(metadata,options.secret) };
  return metadata;
}

export function parseStoredZip(buffer) {
  if(!Buffer.isBuffer(buffer))throw new Error('ZIP input must be a Buffer');
  if(buffer.length>536870912)throw new Error('ZIP exceeds 512 MiB verification limit');
  const entries = new Map();
  let offset = 0;
  while (offset + 4 <= buffer.length) {
    const signature = buffer.readUInt32LE(offset);
    if (signature === 0x02014b50 || signature === 0x06054b50) break;
    if (signature !== 0x04034b50) throw new Error(`unsupported ZIP structure at offset ${offset}`);
    if (offset + 30 > buffer.length) throw new Error('truncated ZIP local header');
    const flags = buffer.readUInt16LE(offset + 6);
    const method = buffer.readUInt16LE(offset + 8);
    const compressedSize = buffer.readUInt32LE(offset + 18);
    const uncompressedSize = buffer.readUInt32LE(offset + 22);
    const nameLength = buffer.readUInt16LE(offset + 26);
    const extraLength = buffer.readUInt16LE(offset + 28);
    if (flags & 0x08) throw new Error('ZIP data descriptors are not supported');
    if (method !== 0) throw new Error(`unsupported ZIP compression method: ${method}`);
    const nameStart = offset + 30;
    const dataStart = nameStart + nameLength + extraLength;
    const dataEnd = dataStart + compressedSize;
    if (dataEnd > buffer.length) throw new Error('truncated ZIP entry');
    const name = buffer.subarray(nameStart, nameStart + nameLength).toString('utf8');
    if(!name||name.length>1024||name.startsWith('/')||name.includes('\\')||name.split('/').some(x=>x===''||x==='.'||x==='..'))throw new Error(`unsafe ZIP entry name: ${name}`);
    if(entries.size>=10000)throw new Error('ZIP exceeds 10000 entry verification limit');
    const data = buffer.subarray(dataStart, dataEnd);
    if (data.length !== uncompressedSize) throw new Error(`ZIP size mismatch for ${name}`);
    if (entries.has(name)) throw new Error(`duplicate ZIP entry: ${name}`);
    entries.set(name, Buffer.from(data));
    offset = dataEnd;
  }
  return entries;
}

export function verifyEvidenceBundleBuffer(buffer, options = {}) {
  const errors = [];
  let entries;
  try { entries = parseStoredZip(buffer); }
  catch (error) { return { ok: false, errors: [error.message], entries: 0, signed: false }; }
  const metadataBuffer = entries.get('metadata.json');
  if (!metadataBuffer) return { ok: false, errors: ['metadata.json is missing'], entries: entries.size, signed: false };
  let metadata;
  try { metadata = JSON.parse(metadataBuffer.toString('utf8')); }
  catch (error) { return { ok: false, errors: [`metadata.json is invalid: ${error.message}`], entries: entries.size, signed: false }; }

  if (metadata.bundle_version === '2.0') {
    for (const item of metadata.files || []) {
      const data = entries.get(item.path);
      if (!data) { errors.push(`bundle file missing: ${item.path}`); continue; }
      if (data.length !== item.size) errors.push(`bundle file size mismatch: ${item.path}`);
      if (sha256(data) !== item.sha256) errors.push(`bundle file digest mismatch: ${item.path}`);
    }
    const declared = new Set((metadata.files || []).map(item => item.path));
    for (const name of entries.keys()) if (name !== 'metadata.json' && !declared.has(name)) errors.push(`undeclared bundle file: ${name}`);
    if (metadata.signature) {
      if (!options.secret) errors.push('bundle is signed but no verification secret was supplied');
      else { const { signature, ...unsigned } = metadata; if (!equalText(signature.value, hmac(unsigned, options.secret))) errors.push('bundle signature mismatch'); }
    } else if (options.requireSignature) errors.push('bundle is unsigned');
    const checkpoint = metadata.checkpoint;
    if (checkpoint) {
      const evidence = entries.get(checkpoint.evidence?.path || '.ruleoak/evidence.jsonl') || Buffer.alloc(0);
      const policy = entries.get(checkpoint.policy?.path || '.ruleoak/policy.json') || Buffer.alloc(0);
      const verification = verifyEvidenceCheckpoint(checkpoint, { evidence, policy, secret: options.secret, requireSignature: options.requireSignature });
      errors.push(...verification.errors.map(error => `checkpoint: ${error}`));
    }
    return { ok: errors.length === 0, errors, entries: entries.size, signed: Boolean(metadata.signature), metadata, fileCount: (metadata.files || []).length, legacy: true };
  }

  const mv=validateEvidenceBundleManifest(metadata);errors.push(...mv.errors.map(e=>`manifest: ${e}`));
  if(metadata.bundle_version==='3.0'){
    const expectedId=sha256(canonicalStringify(evidenceBundleSemanticPayload(metadata)));
    if(metadata.bundle_id!==expectedId)errors.push('bundle_id semantic digest mismatch');
    const declared=new Set((metadata.files||[]).map(item=>item.path));
    for(const item of metadata.files||[]){const data=entries.get(item.path);if(!data){errors.push(`bundle file missing: ${item.path}`);continue;}if(data.length!==item.size)errors.push(`bundle file size mismatch: ${item.path}`);if(sha256(data)!==item.sha256)errors.push(`bundle file digest mismatch: ${item.path}`);}
    for(const name of entries.keys())if(name!=='metadata.json'&&!declared.has(name))errors.push(`undeclared bundle file: ${name}`);

    let authorityGraph=null,evidenceGraph=null,graphVerification='verified_at_export_only';
    if(metadata.verification?.graphs==='reverify_from_bundle'){
      const authorityBuffer=entries.get('graphs/authority-graph.json');const evidenceGraphBuffer=entries.get('graphs/evidence-graph.json');
      if(!authorityBuffer)errors.push('graphs/authority-graph.json is missing');else try{authorityGraph=JSON.parse(authorityBuffer.toString('utf8'));const v=validateAuthorityGraph(authorityGraph);errors.push(...v.errors.map(e=>`authority graph: ${e}`));if(v.valid&&!verifyAuthorityGraphDigest(authorityGraph))errors.push('authority graph semantic digest mismatch');if(authorityGraph?.graph_id!==metadata.graphs?.authority_graph_id)errors.push('authority graph id does not match manifest');}catch(error){errors.push(`authority graph JSON is invalid: ${error.message}`);}
      if(!evidenceGraphBuffer)errors.push('graphs/evidence-graph.json is missing');else try{evidenceGraph=JSON.parse(evidenceGraphBuffer.toString('utf8'));const v=validateEvidenceGraph(evidenceGraph);errors.push(...v.errors.map(e=>`evidence graph: ${e}`));if(v.valid&&!verifyEvidenceGraphDigest(evidenceGraph))errors.push('evidence graph semantic digest mismatch');if(evidenceGraph?.graph_id!==metadata.graphs?.evidence_graph_id)errors.push('evidence graph id does not match manifest');if(evidenceGraph?.source?.authority_graph_id!==metadata.graphs?.authority_graph_id)errors.push('evidence graph authority source does not match manifest');if(v.valid&&verifyEvidenceGraphDigest(evidenceGraph))graphVerification='reverified_from_bundle';}catch(error){errors.push(`evidence graph JSON is invalid: ${error.message}`);}
    }else{
      const summaryBuffer=entries.get('graphs/summary.json');
      if(!summaryBuffer)errors.push('graphs/summary.json is missing for graph-minimized profile');
      else try{const summary=JSON.parse(summaryBuffer.toString('utf8'));if(summary?.summary_version!=='1.0')errors.push('graph summary version is invalid');if(summary?.authority_graph_id!==metadata.graphs?.authority_graph_id)errors.push('graph summary authority_graph_id mismatch');if(summary?.evidence_graph_id!==metadata.graphs?.evidence_graph_id)errors.push('graph summary evidence_graph_id mismatch');const summaryAdapters=Array.isArray(summary?.adapters)?summary.adapters:[];if(JSON.stringify(summaryAdapters)!==JSON.stringify(metadata.adapters||[]))errors.push('graph summary adapters do not match manifest');for(const k of ['authority_nodes','authority_edges','evidence_nodes','evidence_edges','unresolved_evidence'])if(!Number.isInteger(summary?.[k])||summary[k]<0)errors.push(`graph summary ${k} is invalid`);}catch(error){errors.push(`graph summary JSON is invalid: ${error.message}`);}
      if(entries.has('graphs/authority-graph.json')||entries.has('graphs/evidence-graph.json'))errors.push('graph-minimized profile must not contain full graph JSON');
    }

    const rawEvidence=entries.get('.ruleoak/evidence.jsonl');let sourceChainVerification='verified_at_export_only';
    if(metadata.source?.raw_evidence_included){
      if(!rawEvidence)errors.push('raw evidence is declared included but .ruleoak/evidence.jsonl is missing');
      else{let events=[];try{events=parseJsonLines(rawEvidence);}catch(error){errors.push(`raw evidence JSONL is invalid: ${error.message}`);}const chain=verifyEvidence(events);errors.push(...chain.errors.map(e=>`evidence chain: ${e}`));if(sha256(rawEvidence)!==metadata.source.evidence_sha256)errors.push('source evidence digest mismatch');if(events.length!==metadata.source.event_count)errors.push('source evidence event count mismatch');if((events.at(-1)?.hash||'GENESIS')!==metadata.source.final_hash)errors.push('source evidence final hash mismatch');if((events[0]?.timestamp||null)!==metadata.source.first_event_at)errors.push('source evidence first_event_at mismatch');if((events.at(-1)?.timestamp||null)!==metadata.source.last_event_at)errors.push('source evidence last_event_at mismatch');if(chain.ok)sourceChainVerification='reverified_from_bundle';}
    }else if(rawEvidence)errors.push('raw evidence is present but manifest says it is excluded');

    const minimal=entries.get('evidence/minimal.jsonl');let minimalRecords=[];if(!minimal)errors.push('evidence/minimal.jsonl is missing');else{for(const[index,line]of minimal.toString('utf8').split(/\r?\n/).filter(Boolean).entries())try{const record=JSON.parse(line);validateIncidentRecord(record,index+1,errors);minimalRecords.push(record);}catch(error){errors.push(`minimal evidence line ${index+1}: invalid JSON: ${error.message}`);}}
    if(minimalRecords.length!==metadata.source?.event_count)errors.push('minimal evidence record count does not match source event_count');
    if(minimalRecords.length){if(minimalRecords[0]?.timestamp!==metadata.source?.first_event_at)errors.push('minimal evidence first timestamp mismatch');if(minimalRecords.at(-1)?.timestamp!==metadata.source?.last_event_at)errors.push('minimal evidence last timestamp mismatch');}
    if(evidenceGraph){const graphAdapterIds=[...(evidenceGraph.nodes||[])].filter(n=>n?.kind==='adapter').map(n=>n.ref_id).sort();const manifestAdapterIds=(metadata.adapters||[]).map(a=>a.adapter_id).sort();if(JSON.stringify(graphAdapterIds)!==JSON.stringify(manifestAdapterIds))errors.push('manifest adapter identities do not match Evidence Graph');}
    if(rawEvidence){let rawEvents=[];try{rawEvents=parseJsonLines(rawEvidence);}catch{}const versions=new Map();for(const event of rawEvents){const effect=event?.effect_receipt;if(effect?.adapter)versions.set(String(effect.adapter),effect.adapter_contract_version?String(effect.adapter_contract_version):null);}for(const a of metadata.adapters||[])if(versions.has(a.adapter_id)&&versions.get(a.adapter_id)!==(a.adapter_contract_version??null))errors.push(`manifest adapter contract version mismatch: ${a.adapter_id}`);}

    const profile=metadata.privacy_profile;const forbiddenByProfile={minimal:['.ruleoak/evidence.jsonl','.ruleoak/policy.json','.ruleoak/workspace.json'],operational:['.ruleoak/policy.json','.ruleoak/workspace.json']};for(const f of forbiddenByProfile[profile]||[])if(entries.has(f))errors.push(`${profile} profile must not contain ${f}`);
    if(profile==='minimal'){for(const name of entries.keys())if(name.startsWith('.ruleoak/'))errors.push(`minimal profile must not contain local control-state path: ${name}`);}
    if(profile==='operational'){for(const name of entries.keys())if(/^\.ruleoak\/(pending|approvals|sessions|learning|policy-suggestions|policy-rule-history)\//.test(name))errors.push(`operational profile must not contain approval/session/learning state: ${name}`);}
    const actualPrivacy={includes_raw_evidence:entries.has('.ruleoak/evidence.jsonl'),includes_policy:entries.has('.ruleoak/policy.json'),includes_workspace_state:entries.has('.ruleoak/workspace.json'),includes_approval_state:[...entries.keys()].some(n=>/^\.ruleoak\/(pending|approvals)\//.test(n)),includes_session_state:[...entries.keys()].some(n=>/^\.ruleoak\/sessions\//.test(n))};for(const[k,v]of Object.entries(actualPrivacy))if(metadata.privacy?.[k]!==v)errors.push(`privacy.${k} does not match bundle contents`);
    if(metadata.verification?.source_chain!==(actualPrivacy.includes_raw_evidence?'reverify_from_bundle':'verified_at_export_only'))errors.push('verification.source_chain does not match raw-evidence inclusion');
    if(metadata.verification?.graphs!==(profile==='minimal'?'verified_at_export_only':'reverify_from_bundle'))errors.push('verification.graphs does not match privacy profile');

    if(metadata.signature){if(!options.secret)errors.push('bundle is signed but no verification secret was supplied');else{const{signature,...unsigned}=metadata;if(!equalText(signature.value,hmac(unsigned,options.secret)))errors.push('bundle signature mismatch');}}else if(options.requireSignature)errors.push('bundle is unsigned');
    return{ok:errors.length===0,errors,entries:entries.size,signed:Boolean(metadata.signature),metadata,fileCount:(metadata.files||[]).length,legacy:false,sourceChainVerification,graphVerification};
  }
  errors.push(`unsupported bundle version: ${metadata.bundle_version || 'missing'}`);
  return{ok:false,errors,entries:entries.size,signed:Boolean(metadata.signature),metadata,fileCount:(metadata.files||[]).length};
}

export function verifyEvidenceBundleFile(filePath, options = {}) {
  const absolute = resolve(filePath);
  if (!existsSync(absolute)) throw new Error(`evidence bundle not found: ${absolute}`);
  return { path: absolute, ...verifyEvidenceBundleBuffer(readBoundedFileSync(absolute,{maxBytes:512*1024*1024,encoding:null,label:'evidence bundle'}), options) };
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function approvalCard(record, baseDir, pending) {
  const id = escapeHtml(record.approval_id || 'unknown');
  const summary = escapeHtml(record.summary || record.action?.type || 'Unknown action');
  const risk = escapeHtml(record.risk || 'unknown');
  const reason = escapeHtml(record.reason || 'No reason recorded');
  const requested = escapeHtml(record.requested_at || record.decided_at || '');
  const commandBase = `ruleoak approve --pending --id ${record.approval_id} --dir ${baseDir}`;
  const actions = pending ? `
    <div class="actions">
      ${['allow_once', 'deny_once', 'allow_session', 'always_ask', 'always_allow', 'always_block'].map(decision => {
        const command = `${commandBase} --decision ${decision}`;
        return `<button type="button" data-copy="${escapeHtml(command)}">Copy ${escapeHtml(decision)}</button>`;
      }).join('')}
    </div>` : `<p><strong>Decision:</strong> ${escapeHtml(record.decision || record.final_decision?.action || 'decided')}</p>`;
  return `<article class="card ${pending ? 'pending' : 'decided'}">
    <div class="row"><h2>${summary}</h2><span class="risk">${risk}</span></div>
    <p><strong>Approval:</strong> <code>${id}</code></p>
    <p><strong>Reason:</strong> ${reason}</p>
    <p><strong>Time:</strong> ${requested}</p>${actions}
  </article>`;
}

export function renderApprovalInboxHtml(options = {}) {
  const pending = options.pending || [];
  const decided = options.decided || [];
  const baseDir = options.baseDir || '.';
  const generatedAt = options.generatedAt || new Date().toISOString();
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>RuleOak Approval Inbox</title>
<style>
:root{color-scheme:light dark;font-family:ui-sans-serif,system-ui,sans-serif}body{margin:0;background:#0b1020;color:#eef2ff}.wrap{max-width:980px;margin:auto;padding:24px}.summary{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:20px 0}.metric,.card{background:#141b31;border:1px solid #2d385b;border-radius:14px;padding:18px}.metric strong{font-size:2rem;display:block}.card{margin:14px 0}.row{display:flex;gap:16px;align-items:flex-start;justify-content:space-between}.risk{background:#4c2b17;border-radius:999px;padding:5px 10px;text-transform:uppercase;font-size:.75rem}code{overflow-wrap:anywhere}.actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}button{border:0;border-radius:9px;padding:9px 12px;background:#d9e4ff;color:#10172a;cursor:pointer}button:hover{filter:brightness(.92)}.empty{opacity:.7}.note{color:#b8c3df}@media(max-width:640px){.summary{grid-template-columns:1fr}.row{display:block}.risk{display:inline-block;margin-top:8px}}
</style></head><body><main class="wrap">
<h1>RuleOak Approval Inbox</h1>
<p class="note">Read-only local view generated ${escapeHtml(generatedAt)}. Decisions remain explicit CLI commands to avoid exposing a state-changing web endpoint.</p>
<section class="summary"><div class="metric"><strong>${pending.length}</strong>Pending</div><div class="metric"><strong>${decided.length}</strong>Decided</div></section>
<section><h2>Pending approvals</h2>${pending.length ? pending.map(item => approvalCard(item, baseDir, true)).join('') : '<p class="empty">No pending approvals</p>'}</section>
<section><h2>Recent decisions</h2>${decided.length ? decided.slice(-20).reverse().map(item => approvalCard(item, baseDir, false)).join('') : '<p class="empty">No decided approvals</p>'}</section>
</main><script>document.addEventListener('click',async event=>{const button=event.target.closest('[data-copy]');if(!button)return;try{await navigator.clipboard.writeText(button.dataset.copy);const old=button.textContent;button.textContent='Copied';setTimeout(()=>button.textContent=old,1200)}catch{window.prompt('Copy command',button.dataset.copy)}})</script></body></html>`;
}

export function buildGuidedPolicyRule(options = {}) {
  const effectAliases = { block: 'deny', approval_required: 'needs_approval', approve: 'needs_approval' };
  const effect = effectAliases[options.effect] || options.effect || 'needs_approval';
  if (!['allow', 'deny', 'needs_approval', 'dry_run_only'].includes(effect)) throw new Error('effect must be allow, deny, needs_approval, or dry_run_only');
  const actions = (options.actions || []).filter(Boolean);
  if (!actions.length) throw new Error('at least one --action pattern is required');
  const resources = Array.isArray(options.resources) && options.resources.length ? options.resources.filter(Boolean) : ['*'];
  const id = options.id || `${effect.replaceAll('_', '-')}-${actions[0].replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'action'}`;
  const rule = {
    id,
    description: options.description || `Guided ${effect} rule for ${actions.join(', ')}`,
    effect,
    priority: Number.isInteger(options.priority) ? options.priority : effect === 'deny' ? 100 : effect === 'needs_approval' ? 50 : 20,
    actions,
    resources
  };
  if (options.riskAtLeast) rule.riskAtLeast = options.riskAtLeast;
  if (options.riskAtMost) rule.riskAtMost = options.riskAtMost;
  if (options.allowCritical) rule.allowCritical = true;
  const conditions = {};
  for (const [key, value] of Object.entries(options.conditions || {})) if (Array.isArray(value) && value.length) conditions[key] = value;
  if (Object.keys(conditions).length) rule.conditions = conditions;
  return rule;
}

export function previewGuidedPolicyRule(policy, rule) {
  const existing = Array.isArray(policy.rules) ? policy.rules : [];
  const replaced = existing.find(item => item.id === rule.id) || null;
  const nextPolicy = { ...policy, policyVersion: 2, rules: [...existing.filter(item => item.id !== rule.id), rule] };
  const lines = [
    'RuleOak guided policy rule preview',
    '',
    `Rule: ${rule.id}`,
    `Effect: ${rule.effect}`,
    `Priority: ${rule.priority}`,
    `Actions: ${rule.actions.join(', ')}`,
    `Resources: ${rule.resources.join(', ')}`,
    ...(rule.riskAtLeast ? [`Risk at least: ${rule.riskAtLeast}`] : []),
    ...(rule.riskAtMost ? [`Risk at most: ${rule.riskAtMost}`] : []),
    ...(rule.allowCritical ? ['Critical override: explicitly enabled'] : []),
    '',
    replaced ? `This replaces existing rule ${rule.id}` : `This appends rule ${rule.id}`,
    'No file is changed until --yes is supplied'
  ];
  return { currentPolicy: policy, nextPolicy, rule, replaced, previewText: lines.join('\n') };
}

const INCIDENT_ALLOWED_FIELDS=new Set(['source_index','timestamp','event_type','action','decision','risk','matched_rule','decision_id','lease_id','effect_id','effect_status','observation_quality','observed']);
const INCIDENT_OBSERVED_FIELDS=new Set(['attempted','succeeded','failed','outside_scope_observed','exit_code','response_received','upstream_http_status','head_changed','branch_exists','remote_matches_local']);
function safeLabel(value,fallback='unknown'){const text=String(value||'');return /^[A-Za-z0-9_.:-]{1,128}$/.test(text)?text:fallback;}
function safeOpaqueId(value){const text=String(value||'');return /^[A-Za-z0-9_.:-]{1,160}$/.test(text)?text:null;}
function selectedObserved(value={}){const out={};for(const key of INCIDENT_OBSERVED_FIELDS)if(typeof value?.[key]==='number'||typeof value?.[key]==='boolean')out[key]=value[key];return out;}
export function sanitizeEvidenceEventForIncident(event={}){
  const effect=event.effect_receipt||{};const out={source_index:Number(event.index)||0,timestamp:String(event.timestamp||''),event_type:safeLabel(event.event_type||event.action?.type||'event'),action:safeLabel(event.action?.type||'unknown','custom'),decision:safeLabel(event.decision?.action||'unknown'),risk:safeLabel(event.decision?.risk||'unknown'),matched_rule:safeLabel(event.decision?.matchedRule||event.decision?.matched_rule||'none','custom-rule')};
  for(const [key,value]of [['decision_id',event.decision_id||event.decision?.receipt?.decision_id],['lease_id',effect.lease_id],['effect_id',effect.effect_id]]){const safe=safeOpaqueId(value);if(safe)out[key]=safe;}
  if(effect.effect_id){out.effect_status=safeLabel(effect.status||'unknown');out.observation_quality=safeLabel(effect.observation_quality||'unavailable');const observed=selectedObserved(effect.observed);if(Object.keys(observed).length)out.observed=observed;}
  return out;
}
export function buildPrivacyIncidentMetadata(events,incidentBuffer,options={}){
  const sourceEvidence=Buffer.isBuffer(options.sourceEvidence)?options.sourceEvidence:Buffer.from(String(options.sourceEvidence||''),'utf8');const createdAt=options.createdAt||new Date().toISOString();const metadata={incident_bundle_version:'1.0',privacy_profile:'minimal-v1',created_at:createdAt,source:{evidence_sha256:sha256(sourceEvidence),event_count:events.length,last_hash:events.at(-1)?.hash||'GENESIS',chain_ok:true},files:[{path:'incident.jsonl',size:incidentBuffer.length,sha256:sha256(incidentBuffer)}],privacy_contract:{allowed_fields:[...INCIDENT_ALLOWED_FIELDS].sort(),allowed_observed_fields:[...INCIDENT_OBSERVED_FIELDS].sort(),omitted:['raw target','arguments','context','decision reason','error text','policy contents','workspace state','approvals','sessions','prompts','source content','headers and bodies','credentials','local paths']}};if(options.secret)metadata.signature={algorithm:'hmac-sha256',key_hint:options.keyHint||'RULEOAK_CHECKPOINT_SECRET',value:hmac(metadata,options.secret)};return metadata;
}
function validateIncidentRecord(record,index,errors){for(const key of Object.keys(record||{}))if(!INCIDENT_ALLOWED_FIELDS.has(key))errors.push(`incident line ${index}: disallowed field ${key}`);for(const key of Object.keys(record?.observed||{}))if(!INCIDENT_OBSERVED_FIELDS.has(key))errors.push(`incident line ${index}: disallowed observed field ${key}`);}
export function verifyPrivacyIncidentBundleBuffer(buffer,options={}){
  const errors=[];let entries;try{entries=parseStoredZip(buffer);}catch(error){return{ok:false,errors:[error.message],entries:0,signed:false};}const mb=entries.get('metadata.json'),ib=entries.get('incident.jsonl');if(!mb)errors.push('metadata.json is missing');if(!ib)errors.push('incident.jsonl is missing');let metadata=null;if(mb)try{metadata=JSON.parse(mb.toString('utf8'));}catch(error){errors.push(`metadata.json is invalid: ${error.message}`);}if(metadata?.incident_bundle_version!=='1.0')errors.push(`unsupported incident bundle version: ${metadata?.incident_bundle_version||'missing'}`);if(metadata?.privacy_profile!=='minimal-v1')errors.push(`unsupported privacy profile: ${metadata?.privacy_profile||'missing'}`);const declared=new Set((metadata?.files||[]).map(x=>x.path));for(const name of entries.keys())if(name!=='metadata.json'&&!declared.has(name))errors.push(`undeclared incident bundle file: ${name}`);if(ib){const item=(metadata?.files||[]).find(x=>x.path==='incident.jsonl');if(!item)errors.push('incident.jsonl is not declared');else{if(ib.length!==item.size)errors.push('incident.jsonl size mismatch');if(sha256(ib)!==item.sha256)errors.push('incident.jsonl digest mismatch');}const lines=ib.toString('utf8').split(/\r?\n/).filter(Boolean);for(const[index,line]of lines.entries())try{validateIncidentRecord(JSON.parse(line),index+1,errors);}catch(error){errors.push(`incident line ${index+1}: invalid JSON: ${error.message}`);}}
  if(metadata?.signature){if(!options.secret)errors.push('incident bundle is signed but no verification secret was supplied');else{const{signature,...unsigned}=metadata;const expected=hmac(unsigned,options.secret);if(!equalText(signature.value,expected))errors.push('incident bundle signature mismatch');}}else if(options.requireSignature)errors.push('incident bundle is unsigned');return{ok:errors.length===0,errors,entries:entries.size,signed:Boolean(metadata?.signature),metadata,recordCount:ib?ib.toString('utf8').split(/\r?\n/).filter(Boolean).length:0};
}
export function verifyPrivacyIncidentBundleFile(filePath,options={}){const absolute=resolve(filePath);if(!existsSync(absolute))throw new Error(`incident bundle not found: ${absolute}`);return{path:absolute,...verifyPrivacyIncidentBundleBuffer(readBoundedFileSync(absolute,{maxBytes:512*1024*1024,encoding:null,label:'incident bundle'}),options)};}
