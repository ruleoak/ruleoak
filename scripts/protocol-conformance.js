import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { validateGovernanceRecord } from "../src/protocol/index.js";

const goldenDir = "tests/conformance/golden-records";
const files = readdirSync(goldenDir).filter((f) => f.endsWith(".json")).sort();
const results = [];
for (const file of files) {
  const record = JSON.parse(readFileSync(join(goldenDir, file), "utf8"));
  results.push({ file, ...validateGovernanceRecord(record) });
}
console.log(JSON.stringify({ protocol: "ruleoak.governance.v1", valid: true, records: results }, null, 2));
