#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { verifyEvidenceBundle, verifyAuditEventChain } from "../src/protocol/index.js";

const file = process.argv[2];
if (!file) {
  console.error("usage: node scripts/protocol-replay.js <evidence-bundle.json|audit-log.json>");
  process.exit(2);
}
const payload = JSON.parse(readFileSync(file, "utf8"));
const result = Array.isArray(payload) ? verifyAuditEventChain(payload) : verifyEvidenceBundle(payload);
console.log(JSON.stringify(result, null, 2));
if (!result.valid) process.exit(1);
