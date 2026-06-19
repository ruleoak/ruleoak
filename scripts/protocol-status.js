#!/usr/bin/env node
import { getGovernanceProtocolStatus } from "../src/protocol/index.js";

const status = getGovernanceProtocolStatus();
console.log(`RuleOak Governance Protocol
============================
Protocol: ${status.schemaVersion}
Status: ${status.status}
Compatible Core line: ${status.compatibleCoreLine}
Schema-backed: ${status.schemaBacked ? "yes" : "no"}
Golden records: ${status.goldenRecords ? "yes" : "no"}
Python fixture conformance: ${status.crossLanguageFixtures ? "yes" : "no"}
Breaking-change path: ${status.breakingChangePath}
Stability contract: ${status.stabilityContract}`);
