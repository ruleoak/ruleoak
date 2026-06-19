import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { canonicalHash, signPayload, verifyPayloadSignature, INTEGRITY_SCHEMA_VERSION, LATEST_PUBLIC_CORE_RELEASE, EARLIER_PUBLIC_BASELINE, DEVELOPMENT_TRACK } from "./signing.js";
import { validatePolicyPackManifest } from "../policy-packs/policy-pack.js";

export const POLICY_PACK_SIGNATURE_FILE = "pack.signature.json";
export const POLICY_PACK_SIGNATURE_PURPOSE = "policy-pack-integrity";

export function policyPackManifestHash(manifest) {
  return canonicalHash(manifest);
}

export function createPolicyPackSignature(manifest, { privateKeyPem, keyId, signedAt } = {}) {
  const validation = validatePolicyPackManifest(manifest);
  if (!validation.valid) throw new Error(`Cannot sign invalid policy pack: ${validation.errors.join("; ")}`);
  const signature = signPayload(manifest, { privateKeyPem, keyId, signedAt, purpose: POLICY_PACK_SIGNATURE_PURPOSE });
  return {
    ...signature,
    target: {
      type: "RuleOakPolicyPackManifest",
      policyPackId: manifest.id,
      policyPackVersion: manifest.version,
      manifestHash: policyPackManifestHash(manifest)
    },
    latestPublicCoreRelease: LATEST_PUBLIC_CORE_RELEASE,
    earlierPublicBaseline: EARLIER_PUBLIC_BASELINE,
    developmentTrack: DEVELOPMENT_TRACK
  };
}

export function verifyPolicyPackSignature(manifest, signatureEnvelope, trustRoot) {
  const manifestValidation = validatePolicyPackManifest(manifest);
  const signatureValidation = verifyPayloadSignature(manifest, signatureEnvelope, trustRoot);
  const errors = [...manifestValidation.errors, ...signatureValidation.errors];
  if (signatureEnvelope?.purpose !== POLICY_PACK_SIGNATURE_PURPOSE) errors.push(`signature purpose must be ${POLICY_PACK_SIGNATURE_PURPOSE}`);
  if (signatureEnvelope?.target?.type !== "RuleOakPolicyPackManifest") errors.push("signature target.type must be RuleOakPolicyPackManifest");
  if (signatureEnvelope?.target?.policyPackId !== manifest.id) errors.push("signature target.policyPackId mismatch");
  if (signatureEnvelope?.target?.policyPackVersion !== manifest.version) errors.push("signature target.policyPackVersion mismatch");
  if (signatureEnvelope?.target?.manifestHash !== policyPackManifestHash(manifest)) errors.push("signature target.manifestHash mismatch");
  return {
    valid: errors.length === 0,
    errors,
    warnings: manifestValidation.warnings,
    policyPackId: manifest.id,
    policyPackVersion: manifest.version,
    manifestHash: policyPackManifestHash(manifest),
    keyId: signatureEnvelope?.keyId || null
  };
}

export function readPolicyPackDirectory(directory) {
  const manifestPath = join(directory, "pack.json");
  const signaturePath = join(directory, POLICY_PACK_SIGNATURE_FILE);
  if (!existsSync(manifestPath)) throw new Error(`Policy pack manifest not found: ${manifestPath}`);
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const signature = existsSync(signaturePath) ? JSON.parse(readFileSync(signaturePath, "utf8")) : null;
  return { manifest, signature, manifestPath, signaturePath };
}

export function signPolicyPackDirectory(directory, { privateKeyPem, keyId, signedAt, write = true } = {}) {
  const { manifest, signaturePath } = readPolicyPackDirectory(directory);
  const signature = createPolicyPackSignature(manifest, { privateKeyPem, keyId, signedAt });
  if (write) writeFileSync(signaturePath, `${JSON.stringify(signature, null, 2)}\n`);
  return signature;
}

export function verifyPolicyPackDirectory(directory, trustRoot) {
  const { manifest, signature } = readPolicyPackDirectory(directory);
  if (!signature) {
    return { valid: false, errors: [`missing ${POLICY_PACK_SIGNATURE_FILE}`], warnings: [], policyPackId: manifest.id || null, policyPackVersion: manifest.version || null, manifestHash: policyPackManifestHash(manifest), keyId: null };
  }
  return verifyPolicyPackSignature(manifest, signature, trustRoot);
}

export function verifyAllPolicyPackSignatures(policyPacksDir, trustRoot) {
  const results = [];
  for (const entry of readdirSync(policyPacksDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const directory = join(policyPacksDir, entry.name);
    if (!existsSync(join(directory, "pack.json"))) continue;
    results.push(verifyPolicyPackDirectory(directory, trustRoot));
  }
  return {
    schemaVersion: INTEGRITY_SCHEMA_VERSION,
    checkedAt: new Date(0).toISOString(),
    latestPublicCoreRelease: LATEST_PUBLIC_CORE_RELEASE,
    summary: {
      total: results.length,
      valid: results.filter((result) => result.valid).length,
      invalid: results.filter((result) => !result.valid).length,
      warnings: results.reduce((count, result) => count + (result.warnings?.length || 0), 0)
    },
    results: results.sort((a, b) => String(a.policyPackId).localeCompare(String(b.policyPackId)))
  };
}
