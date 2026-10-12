/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import {createHash} from 'node:crypto';
import {canonicalFamilyJson, validateEvidenceEnvelope, validateFamilyRegistry, validateCompatibilityRecord, VERIFICATION_DIMENSIONS} from '@ruleoak/protocol/family';
export const familyJsonSha256 = value => createHash('sha256').update(canonicalFamilyJson(value)).digest('hex');
const equal = (a,b) => canonicalFamilyJson(a) === canonicalFamilyJson(b);
const snapshot = value => JSON.parse(canonicalFamilyJson(value));
const freeze = value => { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
const accepted = (fn,...args) => {
  try {
    if (typeof fn !== 'function') return false;
    const value=fn(...args);
    // Async callbacks are unsupported; consume rejection to avoid an unhandled process failure.
    if (value instanceof Promise) { value.catch(()=>{}); return false; }
    return value === true;
  } catch { return false; }
};
const fresh = (start,end,now) => typeof now === 'string' && Number.isFinite(Date.parse(now)) && Date.parse(start)<=Date.parse(now) && Date.parse(now)<Date.parse(end);

/** Seals content integrity only; this is NOT a digital signature or verifier approval. */
export function sealEvidenceEnvelope(unsigned) {
  const e=snapshot(unsigned);
  delete e.envelopeSha256;
  e.payloadSha256=familyJsonSha256(e.payload);
  const sealed={...e,envelopeSha256:familyJsonSha256(e)};
  const result=validateEvidenceEnvelope(sealed);
  if (!result.valid) throw new TypeError(result.errors.join('; '));
  return sealed;
}
/** All trust inputs are supplied locally by the consumer, never imported from the envelope. */
export function assessEvidenceEnvelope(input, options={}) {
  const dimensions=Object.fromEntries(VERIFICATION_DIMENSIONS.map(d=>[d,'not_established']));
  const result={valid:false,integrity:'not_established',dimensions,errors:[],authorityTransferred:false};
  const shape=validateEvidenceEnvelope(input);
  if (!shape.valid) { result.errors=shape.errors; return result; }
  const e=freeze(snapshot(input)), {envelopeSha256,...body}=e;
  if (familyJsonSha256(body)!==envelopeSha256 || familyJsonSha256(e.payload)!==e.payloadSha256) result.errors.push('content_digest_mismatch');
  else result.integrity='matched';
  if (!fresh(e.createdAt,e.expiresAt,options.now)) result.errors.push('not_current');
  if (!Array.isArray(options.revokedEnvelopeIds)) result.errors.push('revocation_state_required');
  else if (options.revokedEnvelopeIds.includes(e.id)) result.errors.push('revoked');
  if (!fresh(options.revocationCheckedAt,options.revocationValidUntil,options.now)) result.errors.push('revocation_state_not_current');
  try {
    if (!equal(e.subject,options.expectedSubject) || e.scope !== options.expectedScope) result.errors.push('subject_or_scope_mismatch');
  } catch { result.errors.push('expected_subject_required'); }
  if (!accepted(options.acceptProducer,e.producer)) result.errors.push('producer_not_trusted');
  const schemaKey=e.payloadSchema.id+'@'+e.payloadSchema.version;
  const validator=options.payloadValidators instanceof Map ? options.payloadValidators.get(schemaKey) : undefined;
  if (!accepted(validator,e.payload)) result.errors.push('unsupported_or_invalid_payload');
  if (result.errors.length) return result;
  result.valid=true;
  for (const claim of e.claims) {
    // The callback must authenticate evidence bytes, subject, scope and verifier. A status label is insufficient.
    if (claim.assertion !== 'unknown' && accepted(options.verifyClaim,claim,e)) dimensions[claim.dimension]=claim.assertion;
  }
  return result;
}
/** An externally pinned registry digest and exact reference are mandatory. Never resolves by semver. */
export function resolveFamilyRelease(input, reference, expectedRegistrySha256) {
  const check=validateFamilyRegistry(input);
  if (!check.valid) throw new TypeError(check.errors.join('; '));
  const registry=snapshot(input);
  if (familyJsonSha256(registry)!==expectedRegistrySha256) throw new Error('registry_digest_mismatch');
  const found=registry.releases.find(r=>equal(r.ref,reference));
  if (!found) throw new Error('exact_release_not_found');
  return freeze(found);
}
/** Checks every observed package digest and rejects missing, extra and substituted packages. */
export function verifyFamilyPackageSet(release, observed) {
  try { return Array.isArray(observed) && equal([...release.packages].sort((a,b)=>a.name.localeCompare(b.name)), [...observed].sort((a,b)=>a.name.localeCompare(b.name))); }
  catch { return false; }
}
export function assessFamilyQualification(release, options={}) {
  if (!release || !validateFamilyRegistry({schemaVersion:'1.0',releases:[{...release,dependencies:[]}]}).valid) return false;
  return release.availability === 'available' && ['source_tests','native_runtime'].includes(options.kind)
    && release.qualification.some(q=>q.kind===options.kind && q.platform===options.platform && q.sourceSha256===release.ref.sourceSha256
      && fresh(q.checkedAt,q.expiresAt,options.now) && accepted(options.verifyEvidence,freeze(snapshot(q))));
}
export function assessFamilyCompatibility(input, options={}) {
  if (!validateCompatibilityRecord(input).valid) return false;
  const c=freeze(snapshot(input));
  try { return c.outcome==='pass' && equal(c.consumer,options.consumer) && equal(c.dependency,options.dependency)
    && c.adapterVersion===options.adapterVersion && c.platform===options.platform && c.suiteSha256===options.suiteSha256
    && fresh(c.checkedAt,c.expiresAt,options.now) && accepted(options.verifyEvidence,c); }
  catch { return false; }
}

/** Resolve a dependency closure without silently selecting between same-version revisions. */
export function resolveFamilyDependencySet(registry, reference, expectedRegistrySha256) {
  const root=resolveFamilyRelease(registry,reference,expectedRegistrySha256);
  const selected=new Map(), active=new Set();
  function visit(release) {
    if (active.has(release.ref.product)) throw new Error('dependency_cycle');
    const previous=selected.get(release.ref.product);
    if (previous) {
      if (!equal(previous.ref,release.ref)) throw new Error('conflicting_exact_dependencies');
      return;
    }
    active.add(release.ref.product);
    for (const dependency of release.dependencies) visit(resolveFamilyRelease(registry,dependency,expectedRegistrySha256));
    active.delete(release.ref.product); selected.set(release.ref.product,release);
  }
  visit(root); return freeze([...selected.values()]);
}
