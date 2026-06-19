#!/usr/bin/env node
import assert from "node:assert/strict";
import { runProtocolConformanceKit, PROTOCOL_CONFORMANCE_KIT } from "../src/protocol/index.js";

const result = runProtocolConformanceKit({ kitRoot: "protocol-conformance-kit" });
assert.equal(result.valid, true, result.errors.join("; "));
assert.equal(result.protocol, "ruleoak.governance.v1");
assert.equal(PROTOCOL_CONFORMANCE_KIT.latestPublicCoreRelease, "v2.1.0");
assert.ok(result.goldenRecordCount >= 6);
assert.ok(result.checks.includes("canonical-record-hash"));
console.log("protocol conformance kit test passed");
