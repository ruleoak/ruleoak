/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import { existsSync, readdirSync, mkdirSync } from 'node:fs';
import { atomicWriteFileSync, readBoundedFileSync } from '../io/durable-file.js';
import { resolve, dirname } from 'node:path';
import { buildAuthorityEnvelope, previewAuthorityEnvelope, delegateAuthorityGrant, verifyAuthorityGrant, DelegationBudgetRegistry, RevocationRegistry, RuleOakAuthorityLedger, verifyEvidence } from '@ruleoak/core';

function json(path, fallback = null, options = {}) {
  if (!existsSync(path)) return fallback;
  try { return JSON.parse(readBoundedFileSync(path,{maxBytes:options.maxBytes||2*1024*1024,label:options.label||'flight state JSON'})); }
  catch (error) { if(options.strict)throw new Error(`${options.label||'flight state JSON'} is unreadable: ${error.message}`);options.warnings?.push(`${options.label||path} is unreadable: ${error.message}`);return fallback; }
}
function jsonFiles(dir, options = {}) {
  if (!existsSync(dir)) return [];
  const names=readdirSync(dir).filter(name => name.endsWith('.json')).sort();if(names.length>(options.maxFiles||10_000))throw new Error(`${options.label||'flight state directory'} exceeds maxFiles (${options.maxFiles||10_000})`);
  return names.map(name => json(resolve(dir, name),null,{...options,label:`${options.label||'flight state'} ${name}`})).filter(Boolean);
}
function safeId(value) { return String(value).replace(/[^A-Za-z0-9_.-]/g, '_'); }

export function flightPaths(base) {
  const root = resolve(base, '.ruleoak');
  return {
    root,
    evidence: resolve(root, 'evidence.jsonl'),
    policy: resolve(root, 'policy.json'),
    pending: resolve(root, 'pending'),
    approvals: resolve(root, 'approvals'),
    authority: resolve(root, 'authority'),
    grants: resolve(root, 'authority/grants'),
    envelopes: resolve(root, 'authority/envelopes'),
    leases: resolve(root, 'authority/leases'),
    revocations: resolve(root, 'authority/revocations.jsonl'),
    delegationBudgets: resolve(root, 'authority/delegation-budgets.jsonl'),
    inspector: resolve(root, 'inspector')
  };
}

export function readFlightState(base, options = {}) {
  const p = flightPaths(base);
  const warnings=[];
  const evidenceText=existsSync(p.evidence)?readBoundedFileSync(p.evidence,{maxBytes:options.maxEvidenceBytes||64*1024*1024,label:'flight evidence'}):'';
  const evidenceLines=evidenceText.split(/\r?\n/).filter(Boolean);if(evidenceLines.length>(options.maxEvidenceEvents||200_000))throw new Error(`flight evidence exceeds maxEvents (${options.maxEvidenceEvents||200_000})`);
  const events = evidenceLines.map((line, index) => {
        try { return JSON.parse(line); }
        catch (error) {
          if (options.strictEvidence) throw new Error(`invalid evidence JSONL line ${index + 1}: ${error.message}`);
          return null;
        }
      }).filter(Boolean);
  const eventLimit = options.eventLimit === null ? null : (Number.isInteger(options.eventLimit) ? Math.max(1, options.eventLimit) : 200);
  return {
    workspace: resolve(base),
    policy: json(p.policy, {}, {warnings,label:'policy'}),
    warnings,
    events: eventLimit === null ? events : events.slice(-eventLimit),
    evidence: { count: events.length, verification: verifyEvidence(events) },
    pending: jsonFiles(p.pending,{warnings,label:'pending approval'}),
    approvals: jsonFiles(p.approvals,{warnings,label:'approval'}),
    authority: {
      grants: jsonFiles(p.grants,{warnings,label:'authority grant'}),
      envelopes: jsonFiles(p.envelopes,{warnings,label:'authority envelope'}),
      leases: jsonFiles(p.leases,{warnings,label:'execution lease'}),
      revocations: new RevocationRegistry({ filePath: p.revocations }).list()
    },
    capability_manifests: jsonFiles(p.inspector,{warnings,label:'capability manifest'})
  };
}

export function revokeWorkspaceAuthority(base, type, id, options = {}) {
  const p = flightPaths(base);
  mkdirSync(dirname(p.revocations), { recursive: true, mode: 0o700 });
  return new RevocationRegistry({ filePath: p.revocations }).revoke(type, id, options);
}

export function writeAuthorityArtifact(base, kind, id, value) {
  const p = flightPaths(base);
  const dir = kind === 'grant' ? p.grants : kind === 'lease' ? p.leases : p.envelopes;
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const path = resolve(dir, `${safeId(id)}.json`);
  atomicWriteFileSync(path, JSON.stringify(value, null, 2) + '\n', { mode: 0o600,maxBytes:2*1024*1024,label:'authority artifact' });
  return path;
}

function loadActiveParentGrant(base, grantId, options = {}) {
  const p = flightPaths(base);
  const grant = json(resolve(p.grants, `${safeId(grantId)}.json`),null,{strict:true,label:'authority grant'});
  if (!grant) throw new Error(`authority grant not found: ${grantId}`);
  const registry = new RevocationRegistry({ filePath: p.revocations });
  const verification = verifyAuthorityGrant(grant, {
    now: options.now,
    secret: options.secret,
    requireSignature: options.requireSignature !== false,
    revocationRegistry: registry
  });
  if (!verification.ok) throw new Error(`authority grant is not active: ${verification.errors.join('; ')}`);
  return { p, grant, revocationRegistry: registry };
}

export function delegateWorkspaceAuthorityGrant(base, spec = {}, options = {}) {
  if (!spec.parent_grant_id) throw new Error('parent_grant_id is required');
  if (!spec.subject) throw new Error('delegated subject is required');
  if (!options.secret) throw new Error('local authority signing secret is required');
  const now = options.now || new Date().toISOString();
  const { p, grant, revocationRegistry } = loadActiveParentGrant(base, spec.parent_grant_id, { now, secret: options.secret });
  const budgetRegistry = new DelegationBudgetRegistry({ filePath: p.delegationBudgets });
  const child = delegateAuthorityGrant(grant, {
    subject: spec.subject,
    capabilities: spec.capabilities,
    budget: spec.budget,
    obligations: spec.obligations,
    delegation: spec.delegation,
    not_before: spec.not_before,
    expires_at: spec.expires_at,
    task_id: spec.task_id,
    intent_id: spec.intent_id,
    session_id: spec.session_id
  }, options.secret, { now, revocationRegistry, budgetRegistry });
  const path = writeAuthorityArtifact(base, 'grant', child.grant_id, child);
  if (existsSync(p.evidence)) {
    const ledger = new RuleOakAuthorityLedger(p.evidence);
    ledger.grantCreated(child);
  }
  return { grant: child, path, budget_allocation: grant.delegation?.budget_mode === 'partition' ? budgetRegistry.list().find(item => item.child_grant_id === child.grant_id) || null : null };
}

export function previewWorkspaceAuthorityEnvelope(base, spec = {}, options = {}) {
  if (!spec.grant_id) throw new Error('grant_id is required');
  if (!options.secret) throw new Error('local authority signing secret is required');
  const now = options.now || new Date().toISOString();
  const { grant } = loadActiveParentGrant(base, spec.grant_id, { now, secret: options.secret });
  return previewAuthorityEnvelope(grant, spec, { authoritySecret: options.secret, now, issuedAt: now });
}

export function createWorkspaceAuthorityEnvelope(base, spec = {}, options = {}) {
  if (!spec.grant_id) throw new Error('grant_id is required');
  if (!options.secret) throw new Error('local authority signing secret is required');
  const now = options.now || new Date().toISOString();
  const { p, grant } = loadActiveParentGrant(base, spec.grant_id, { now, secret: options.secret });
  const envelope = buildAuthorityEnvelope(grant, {
    capabilities: spec.capabilities,
    constraints: spec.constraints,
    obligations: spec.obligations,
    not_before: spec.not_before || now,
    expires_at: spec.expires_at,
    intent_id: spec.intent_id,
    task_id: spec.task_id,
    session_id: spec.session_id,
    policy_digest: spec.policy_digest
  }, {
    authoritySecret: options.secret,
    envelopeSecret: options.secret,
    now,
    issuedAt: now
  });
  const path = writeAuthorityArtifact(base, 'envelope', envelope.envelope_id, envelope);
  if (existsSync(p.evidence)) {
    const ledger = new RuleOakAuthorityLedger(p.evidence);
    ledger.authorityEnvelopeCreated?.(envelope) ?? ledger.append?.('authority_envelope.created', { authority_envelope: envelope });
  }
  return { envelope, path };
}
