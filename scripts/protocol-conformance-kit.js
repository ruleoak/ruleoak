#!/usr/bin/env node
import { runProtocolConformanceKit } from "../src/protocol/index.js";

const kitIndex = process.argv.indexOf("--kit");
const kitRoot = kitIndex >= 0 ? process.argv[kitIndex + 1] : "protocol-conformance-kit";
const json = process.argv.includes("--json");
const result = runProtocolConformanceKit({ kitRoot });
if (json) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(`RuleOak Protocol Conformance Kit: ${result.valid ? "PASS" : "FAIL"}`);
  console.log(`protocol: ${result.protocol}`);
  console.log(`kit version: ${result.kitVersion}`);
  console.log(`latest public Core release: ${result.latestPublicCoreRelease}`);
  console.log(`golden records: ${result.goldenRecordCount}`);
  if (result.errors.length) {
    console.error(result.errors.map((error) => `- ${error}`).join("\n"));
  }
}
if (!result.valid) process.exit(1);
