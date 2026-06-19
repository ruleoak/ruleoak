#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createTrustRoot, generateEd25519KeyPair, validateTrustRoot } from "../src/integrity/signing.js";
import { signPolicyPackDirectory, verifyAllPolicyPackSignatures } from "../src/integrity/policy-pack-integrity.js";

const rootDir = join(fileURLToPath(new URL("..", import.meta.url)));
const trustRootPath = join(rootDir, "configs", "trust", "ruleoak-local-trust-root.json");
const policyPacksDir = join(rootDir, "policy-packs");

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function printResult(result, { json = false } = {}) {
  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  console.log(`RuleOak integrity check: ${result.valid ? "PASS" : "FAIL"}`);
  console.log(`Trust root keys: ${result.trustRoot.keyCount}`);
  console.log(`Policy pack signatures: ${result.policyPacks.summary.valid}/${result.policyPacks.summary.total} valid`);
  for (const pack of result.policyPacks.results) {
    const status = pack.valid ? "ok" : "failed";
    console.log(`- ${pack.policyPackId}@${pack.policyPackVersion}: ${status} ${pack.keyId ? `(key ${pack.keyId})` : ""}`);
    for (const error of pack.errors || []) console.log(`  error: ${error}`);
  }
}

function usage() {
  console.log(`Usage:
  node scripts/integrity-check.js verify [--json]
  node scripts/integrity-check.js sign-policy-packs --private-key <path> --key-id <key-id>
  node scripts/integrity-check.js init-trust-root --out <path>

Notes:
  - verify is offline and read-only.
  - sign-policy-packs requires a private key path and is intended for maintainers.
  - init-trust-root creates a demo trust root/key pair for local experiments; do not use demo keys in production.`);
}

const args = process.argv.slice(2);
const command = args[0] || "verify";
const json = args.includes("--json");

if (command === "verify") {
  if (!existsSync(trustRootPath)) throw new Error(`Trust root not found: ${trustRootPath}`);
  const trustRoot = readJson(trustRootPath);
  const trustValidation = validateTrustRoot(trustRoot);
  const policyPacks = verifyAllPolicyPackSignatures(policyPacksDir, trustRoot);
  const result = {
    schemaVersion: "ruleoak.integrity.v1",
    checkedAt: new Date(0).toISOString(),
    valid: trustValidation.valid && policyPacks.summary.invalid === 0,
    trustRoot: trustValidation,
    policyPacks
  };
  printResult(result, { json });
  if (!result.valid) process.exit(1);
} else if (command === "sign-policy-packs") {
  const privateKeyIndex = args.indexOf("--private-key");
  const keyIdIndex = args.indexOf("--key-id");
  if (privateKeyIndex < 0 || keyIdIndex < 0) {
    usage();
    process.exit(1);
  }
  const privateKeyPem = readFileSync(args[privateKeyIndex + 1], "utf8");
  const keyId = args[keyIdIndex + 1];
  const signed = [];
  for (const entry of (await import("node:fs")).readdirSync(policyPacksDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const directory = join(policyPacksDir, entry.name);
    if (!existsSync(join(directory, "pack.json"))) continue;
    const signature = signPolicyPackDirectory(directory, { privateKeyPem, keyId });
    signed.push(signature.target.policyPackId);
  }
  console.log(`Signed ${signed.length} policy packs: ${signed.join(", ")}`);
} else if (command === "init-trust-root") {
  const outIndex = args.indexOf("--out");
  const outDir = outIndex >= 0 ? args[outIndex + 1] : join(rootDir, "out", "integrity-demo-trust-root");
  mkdirSync(outDir, { recursive: true });
  const keys = generateEd25519KeyPair();
  const keyId = "ruleoak-local-demo-key";
  const trustRoot = createTrustRoot({ rootId: "ruleoak-local-demo-trust-root", keys: [{ keyId, publicKeyPem: keys.publicKeyPem }] });
  writeFileSync(join(outDir, "trust-root.json"), `${JSON.stringify(trustRoot, null, 2)}\n`);
  writeFileSync(join(outDir, "private-key.pem"), keys.privateKeyPem);
  console.log(`Wrote demo trust root and private key to ${outDir}. Demo keys are for local experiments only.`);
} else {
  usage();
  process.exit(1);
}
