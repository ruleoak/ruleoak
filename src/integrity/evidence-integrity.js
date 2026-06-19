import { recordHash } from "../protocol/record-factory.js";
import { verifyAuditEventChain } from "../protocol/audit-log.js";
import { verifyEvidenceBundle } from "../protocol/evidence-bundle.js";
import { canonicalHash, signPayload, verifyPayloadSignature, INTEGRITY_SCHEMA_VERSION, LATEST_PUBLIC_CORE_RELEASE } from "./signing.js";

export const EVIDENCE_BUNDLE_SIGNATURE_PURPOSE = "evidence-bundle-integrity";
export const AUDIT_CHAIN_SIGNATURE_PURPOSE = "audit-chain-integrity";

export function signEvidenceBundle(bundle, { privateKeyPem, keyId, signedAt } = {}) {
  const verification = verifyEvidenceBundle(bundle);
  if (!verification.valid) throw new Error(`Cannot sign invalid evidence bundle: ${verification.errors.join("; ")}`);
  const signature = signPayload(bundle, { privateKeyPem, keyId, signedAt, purpose: EVIDENCE_BUNDLE_SIGNATURE_PURPOSE });
  return {
    ...bundle,
    integrity: {
      ...signature,
      target: {
        type: "RuleOakEvidenceBundle",
        bundleId: bundle.bundleId,
        bundleHash: bundle.bundleHash,
        canonicalPayloadHash: canonicalHash(bundle)
      },
      latestPublicCoreRelease: LATEST_PUBLIC_CORE_RELEASE
    }
  };
}

export function verifySignedEvidenceBundle(bundle, trustRoot) {
  const { integrity: _integrity, ...unsignedBundle } = bundle || {};
  const evidenceVerification = verifyEvidenceBundle(unsignedBundle);
  const signatureEnvelope = bundle?.integrity || null;
  const signatureVerification = verifyPayloadSignature(bundle, signatureEnvelope, trustRoot);
  const errors = [...evidenceVerification.errors, ...signatureVerification.errors];
  if (signatureEnvelope?.purpose !== EVIDENCE_BUNDLE_SIGNATURE_PURPOSE) errors.push(`integrity purpose must be ${EVIDENCE_BUNDLE_SIGNATURE_PURPOSE}`);
  if (signatureEnvelope?.target?.type !== "RuleOakEvidenceBundle") errors.push("integrity target.type must be RuleOakEvidenceBundle");
  if (signatureEnvelope?.target?.bundleId !== unsignedBundle?.bundleId) errors.push("integrity target.bundleId mismatch");
  if (signatureEnvelope?.target?.bundleHash !== unsignedBundle?.bundleHash) errors.push("integrity target.bundleHash mismatch");
  if (signatureEnvelope?.target?.canonicalPayloadHash !== canonicalHash(bundle)) errors.push("integrity target.canonicalPayloadHash mismatch");
  return {
    valid: errors.length === 0,
    errors,
    bundleId: unsignedBundle?.bundleId || null,
    bundleHash: unsignedBundle?.bundleHash || null,
    canonicalPayloadHash: canonicalHash(bundle || {}),
    keyId: signatureEnvelope?.keyId || null,
    recordCount: bundle?.records?.length || 0
  };
}

function auditChainPayload(events = []) {
  return {
    schemaVersion: INTEGRITY_SCHEMA_VERSION,
    auditChainType: "RuleOakAuditChain",
    eventCount: events.length,
    firstEventId: events[0]?.eventId || null,
    lastEventId: events[events.length - 1]?.eventId || null,
    lastHash: events[events.length - 1]?.eventHash || null,
    eventHashes: events.map((event) => ({ eventId: event.eventId || null, sequence: event.sequence, eventHash: event.eventHash || recordHash(event) }))
  };
}

export function signAuditEventChain(events = [], { privateKeyPem, keyId, signedAt } = {}) {
  const chainVerification = verifyAuditEventChain(events);
  if (!chainVerification.valid) throw new Error(`Cannot sign invalid audit event chain: ${chainVerification.errors.join("; ")}`);
  const payload = auditChainPayload(events);
  return {
    ...signPayload(payload, { privateKeyPem, keyId, signedAt, purpose: AUDIT_CHAIN_SIGNATURE_PURPOSE }),
    target: {
      type: "RuleOakAuditChain",
      eventCount: events.length,
      lastHash: chainVerification.lastHash,
      canonicalPayloadHash: canonicalHash(payload)
    },
    latestPublicCoreRelease: LATEST_PUBLIC_CORE_RELEASE
  };
}

export function verifyAuditEventChainSignature(events = [], signatureEnvelope, trustRoot) {
  const chainVerification = verifyAuditEventChain(events);
  const payload = auditChainPayload(events);
  const signatureVerification = verifyPayloadSignature(payload, signatureEnvelope, trustRoot);
  const errors = [...chainVerification.errors, ...signatureVerification.errors];
  if (signatureEnvelope?.purpose !== AUDIT_CHAIN_SIGNATURE_PURPOSE) errors.push(`signature purpose must be ${AUDIT_CHAIN_SIGNATURE_PURPOSE}`);
  if (signatureEnvelope?.target?.type !== "RuleOakAuditChain") errors.push("signature target.type must be RuleOakAuditChain");
  if (signatureEnvelope?.target?.eventCount !== events.length) errors.push("signature target.eventCount mismatch");
  if (signatureEnvelope?.target?.lastHash !== chainVerification.lastHash) errors.push("signature target.lastHash mismatch");
  if (signatureEnvelope?.target?.canonicalPayloadHash !== canonicalHash(payload)) errors.push("signature target.canonicalPayloadHash mismatch");
  return {
    valid: errors.length === 0,
    errors,
    eventCount: events.length,
    lastHash: chainVerification.lastHash,
    canonicalPayloadHash: canonicalHash(payload),
    keyId: signatureEnvelope?.keyId || null
  };
}
