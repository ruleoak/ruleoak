import { createHash, createPrivateKey, createPublicKey, generateKeyPairSync, sign as cryptoSign, verify as cryptoVerify } from "node:crypto";
import { stableJson } from "../protocol/stable-json.js";

export const INTEGRITY_SCHEMA_VERSION = "ruleoak.integrity.v1";
export const SIGNATURE_ALGORITHM = "ed25519";
export const HASH_ALGORITHM = "sha256";
export const DEVELOPMENT_TRACK = "RuleOak Core v2.1.0 release";
export const LATEST_PUBLIC_CORE_RELEASE = "v2.1.0";
export const EARLIER_PUBLIC_BASELINE = "v1.0.1";

const OMIT_KEYS = new Set(["integrity", "signature", "signatures", "signatureEnvelope", "bundleSignature", "auditChainSignature"]);

export function stripIntegrityFields(value) {
  if (Array.isArray(value)) return value.map(stripIntegrityFields);
  if (value && typeof value === "object") {
    const out = {};
    for (const key of Object.keys(value)) {
      if (OMIT_KEYS.has(key)) continue;
      out[key] = stripIntegrityFields(value[key]);
    }
    return out;
  }
  return value;
}

export function canonicalIntegrityPayload(value) {
  return stableJson(stripIntegrityFields(value));
}

export function canonicalHash(value) {
  return createHash(HASH_ALGORITHM).update(canonicalIntegrityPayload(value)).digest("hex");
}

export function generateEd25519KeyPair() {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519", {
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" }
  });
  return { publicKeyPem: publicKey, privateKeyPem: privateKey };
}

export function signPayload(value, { privateKeyPem, keyId = "ruleoak-dev-signing-key", signedAt = new Date().toISOString(), purpose = "integrity" } = {}) {
  if (!privateKeyPem) throw new Error("privateKeyPem is required to sign payload");
  const payload = canonicalIntegrityPayload(value);
  const payloadHash = createHash(HASH_ALGORITHM).update(payload).digest("hex");
  const signature = cryptoSign(null, Buffer.from(payload, "utf8"), createPrivateKey(privateKeyPem)).toString("base64");
  return {
    schemaVersion: INTEGRITY_SCHEMA_VERSION,
    purpose,
    algorithm: SIGNATURE_ALGORITHM,
    hashAlgorithm: HASH_ALGORITHM,
    keyId,
    signedAt: new Date(signedAt).toISOString(),
    payloadHash,
    signature
  };
}

export function verifyPayloadSignature(value, signatureEnvelope, trustRoot) {
  const errors = [];
  if (!signatureEnvelope || typeof signatureEnvelope !== "object") {
    return { valid: false, errors: ["signature envelope is required"], payloadHash: canonicalHash(value), keyId: null };
  }
  if (signatureEnvelope.schemaVersion !== INTEGRITY_SCHEMA_VERSION) errors.push(`schemaVersion must be ${INTEGRITY_SCHEMA_VERSION}`);
  if (signatureEnvelope.algorithm !== SIGNATURE_ALGORITHM) errors.push(`algorithm must be ${SIGNATURE_ALGORITHM}`);
  if (signatureEnvelope.hashAlgorithm !== HASH_ALGORITHM) errors.push(`hashAlgorithm must be ${HASH_ALGORITHM}`);
  if (!signatureEnvelope.keyId) errors.push("keyId is required");
  if (!signatureEnvelope.signature) errors.push("signature is required");
  const payload = canonicalIntegrityPayload(value);
  const payloadHash = createHash(HASH_ALGORITHM).update(payload).digest("hex");
  if (signatureEnvelope.payloadHash !== payloadHash) errors.push("payloadHash does not match canonical payload");
  const key = findTrustRootKey(trustRoot, signatureEnvelope.keyId);
  if (!key) errors.push(`trusted public key not found for keyId ${signatureEnvelope.keyId || "<missing>"}`);
  if (!errors.length) {
    try {
      const ok = cryptoVerify(null, Buffer.from(payload, "utf8"), createPublicKey(key.publicKeyPem), Buffer.from(signatureEnvelope.signature, "base64"));
      if (!ok) errors.push("signature verification failed");
    } catch (error) {
      errors.push(`signature verification failed: ${error.message}`);
    }
  }
  return { valid: errors.length === 0, errors, payloadHash, keyId: signatureEnvelope.keyId || null };
}

export function createTrustRoot({ rootId = "ruleoak-local-trust-root", keys = [], createdAt = new Date().toISOString(), metadata = {} } = {}) {
  return {
    schemaVersion: INTEGRITY_SCHEMA_VERSION,
    trustRootType: "RuleOakTrustRoot",
    rootId,
    createdAt: new Date(createdAt).toISOString(),
    latestPublicCoreRelease: LATEST_PUBLIC_CORE_RELEASE,
    earlierPublicBaseline: EARLIER_PUBLIC_BASELINE,
    developmentTrack: DEVELOPMENT_TRACK,
    keys: keys.map((key) => ({
      keyId: key.keyId,
      algorithm: key.algorithm || SIGNATURE_ALGORITHM,
      publicKeyPem: key.publicKeyPem,
      status: key.status || "trusted",
      purpose: key.purpose || "policy-pack-and-evidence-integrity",
      notBefore: key.notBefore || null,
      notAfter: key.notAfter || null
    })),
    metadata
  };
}

export function validateTrustRoot(trustRoot) {
  const errors = [];
  if (!trustRoot || typeof trustRoot !== "object") errors.push("trust root must be an object");
  if (trustRoot?.schemaVersion !== INTEGRITY_SCHEMA_VERSION) errors.push(`schemaVersion must be ${INTEGRITY_SCHEMA_VERSION}`);
  if (trustRoot?.trustRootType !== "RuleOakTrustRoot") errors.push("trustRootType must be RuleOakTrustRoot");
  if (!Array.isArray(trustRoot?.keys) || !trustRoot.keys.length) errors.push("trust root must include at least one key");
  for (const key of trustRoot?.keys || []) {
    if (!key.keyId) errors.push("trust root key missing keyId");
    if (key.algorithm !== SIGNATURE_ALGORITHM) errors.push(`trust root key ${key.keyId || "<missing>"} algorithm must be ${SIGNATURE_ALGORITHM}`);
    if (!key.publicKeyPem) errors.push(`trust root key ${key.keyId || "<missing>"} missing publicKeyPem`);
  }
  return { valid: errors.length === 0, errors, keyCount: trustRoot?.keys?.length || 0 };
}

export function findTrustRootKey(trustRoot, keyId) {
  const validation = validateTrustRoot(trustRoot);
  if (!validation.valid) return null;
  const now = Date.now();
  return trustRoot.keys.find((key) => {
    if (key.keyId !== keyId) return false;
    if (key.status && key.status !== "trusted") return false;
    if (key.notBefore && Date.parse(key.notBefore) > now) return false;
    if (key.notAfter && Date.parse(key.notAfter) < now) return false;
    return true;
  }) || null;
}
