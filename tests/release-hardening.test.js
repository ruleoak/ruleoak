import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const requiredDocs = [
  "docs/compatibility-matrix.md",
  "docs/hardening/release-validation.md",
  "docs/hardening/security-boundary-corpus.md",
  "docs/hardening/connector-safety-corpus.md",
  "docs/hardening/mcp-proxy-safety.md"
];
for (const path of requiredDocs) assert.ok(existsSync(path), `${path} should exist`);

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
assert.match(pkg.version, /^(?:2\.1\.0|2\.(?:[6-9]|10)\.0|3\.\d+\.0)$/);
assert.ok(pkg.scripts["validate:release"], "validate:release script should exist");
assert.ok(pkg.scripts["compatibility:matrix"], "compatibility:matrix script should exist");

const output = execFileSync("npm", ["run", "compatibility:matrix"], { encoding: "utf8" });
assert.ok(output.includes("ruleoak.governance.v1"));
assert.ok(existsSync("reports/compatibility/matrix.json"));
const matrix = JSON.parse(readFileSync("reports/compatibility/matrix.json", "utf8"));
assert.equal(matrix.latestCore, pkg.version);
assert.equal(matrix.governanceProtocol.name, "ruleoak.governance.v1");
assert.ok(matrix.releases.some((release) => release.version === pkg.version.replace(/\.0$/, "")));
console.log("release-hardening tests passed");
